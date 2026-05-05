const { Device } = require('../models/postgres/index');
const DeviceSchedule = require('../models/mongo/DeviceSchedule');
const AuditLog = require('../models/mongo/AuditLog');
const { redis } = require('../config/redis');
const { AppError } = require('../errors/codes');
const { success } = require('../utils/response');
const env = require('../config/env');
const logger = require('../utils/logger');

// heat → 1, cool/fan → 2  (firmware: 0=off, 1=heat, 2=fan/cool)
const CAN_COMMAND_MAP = { heat: 1, cool: 2, fan: 2 };

function buildMqttPayload(type, settings) {
  const payload = {
    CANCommand:    CAN_COMMAND_MAP[type],
    CanComSwitch:  1,
    SetTemp:       0,
    FanLSel:       0,
    HeatLSel:      0,
  };

  if (type === 'heat') {
    payload.SetTemp  = settings.temp  ?? 0;
    payload.HeatLSel = settings.level ?? 0;
  } else if (type === 'cool') {
    payload.SetTemp  = settings.temp  ?? 0;
    payload.FanLSel  = settings.level ?? 0;
  } else if (type === 'fan') {
    payload.FanLSel  = settings.level ?? 1;
  }

  return payload;
}

function redisKey(deviceId, type) {
  return `device:schedule:${deviceId}:${type}`;
}

async function getSchedules(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) throw new AppError('DEVICE_2001');

    const schedules = await DeviceSchedule.find({ device_id: device.id }).sort({ type: 1 });
    return success(res, schedules);
  } catch (err) {
    next(err);
  }
}

async function upsertSchedule(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) throw new AppError('DEVICE_2001');

    const { type, settings, enabled = true } = req.body;

    const mqttPayload = buildMqttPayload(type, settings);

    const schedule = await DeviceSchedule.findOneAndUpdate(
      { device_id: device.id, type },
      {
        device_id:       device.id,
        device_serial:   device.serial_no,
        type,
        enabled,
        settings,
        created_by:      req.user.id,
        created_by_name: req.user.name,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Redis: MQTT-ready, no TTL (cron reads this directly)
    const redisValue = {
      device_id: device.id,
      serial:    device.serial_no,
      type,
      enabled,
      time:      settings.time,
      repeat:    settings.repeat,
      payload:   mqttPayload,
    };
    await redis.set(redisKey(device.id, type), JSON.stringify(redisValue));

    return success(res, schedule, req.t('schedule.saved'));
  } catch (err) {
    next(err);
  }
}

async function deleteSchedule(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) throw new AppError('DEVICE_2001');

    const { type } = req.params;
    const deleted = await DeviceSchedule.findOneAndDelete({ device_id: device.id, type });
    if (!deleted) throw new AppError('SCHED_8001');

    await redis.del(redisKey(device.id, type));

    return success(res, null, req.t('schedule.deleted'));
  } catch (err) {
    next(err);
  }
}

// Called by the cron service after each scheduled MQTT publish
async function logScheduleCommand(req, res, next) {
  try {
    const internalKey = req.headers['x-internal-key'];
    if (!internalKey || internalKey !== env.INTERNAL_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { device_id, device_serial, type, mqtt_payload, ok, error } = req.body;

    await AuditLog.create({
      user_id:     null,
      user_name:   'cron-scheduler',
      user_role:   'system',
      user_email:  null,
      action:      'SCHEDULE_COMMAND_SENT',
      module:      'devices',
      method:      'MQTT',
      path:        `yilkar/s2d/main_settings/${device_serial}`,
      device_id:   device_id || null,
      target_id:   device_id || null,
      target_type: 'device',
      details:     { type, mqtt_payload, ok, error: error || null },
      status_code: ok ? 200 : 500,
      duration_ms: 0,
    });

    logger.info(`Schedule command logged: ${device_serial} type=${type} ok=${ok}`);
    return success(res, null, 'Logged');
  } catch (err) {
    next(err);
  }
}

module.exports = { getSchedules, upsertSchedule, deleteSchedule, logScheduleCommand };
