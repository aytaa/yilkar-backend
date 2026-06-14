const mqtt = require('mqtt');
const env = require('../config/env');
const { redis } = require('../config/redis');
const Telemetry = require('../models/mongo/Telemetry');
const Alarm = require('../models/mongo/Alarm');
const Notification = require('../models/mongo/Notification');
const { Device } = require('../models/postgres/index');
const logger = require('../utils/logger');

let client = null;

const TOPICS = {
  D2S_MONITORING: 'yilkar/d2s/monitoring/+',
  DEVICE_STATUS:  'yilkar/devices/+/status',
};

function buildCommandTopic(serialNo) {
  return `yilkar/s2d/main_settings/${serialNo}`;
}

function buildOtaTopic(serialNo) {
  return `yilkar/s2d/ota/${serialNo}`;
}

async function connect() {
  client = mqtt.connect(`mqtt://${env.MQTT_HOST}:${env.MQTT_PORT}`, {
    clientId:        env.MQTT_CLIENT_ID,
    username:        env.MQTT_USERNAME,
    password:        env.MQTT_PASSWORD,
    clean:           true,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    logger.info('MQTT connected');
    client.subscribe(TOPICS.D2S_MONITORING, { qos: 1 });
    client.subscribe(TOPICS.DEVICE_STATUS,  { qos: 1 });
  });

  client.on('message', async (topic, payload) => {
    try {
      if (topic.startsWith('yilkar/d2s/monitoring/')) {
        const serial = topic.split('/')[3];
        await handleTelemetry(serial, payload);
      } else if (topic.includes('/status')) {
        const serial = topic.split('/')[2];
        await handleStatus(serial, payload.toString());
      }
    } catch (err) {
      logger.error('MQTT message error:', err);
    }
  });

  client.on('error',     (err) => logger.error('MQTT client error:', err));
  client.on('reconnect', ()    => logger.info('MQTT reconnecting...'));
}

async function handleTelemetry(serialNo, payload) {
  let data;
  try { data = JSON.parse(payload.toString()); } catch { return; }

  const device = await Device.findOne({ where: { serial_no: serialNo } });
  if (!device) {
    logger.warn('Telemetry received for unknown device', { serial: serialNo });
    return;
  }

  await Telemetry.create({
    device_id:                  device.id,
    mac:                        device.mac,
    fan_level_selection:        data.FanLSel,
    can_command_switch:         data.CanComSwitch,
    can_command:                data.CANCommand,
    heating_level_selection:    data.HeatLSel,
    set_temp:                   data.SetTemp,
    hardware_code_serial:       data.HardCodeSer,
    product_serial_no:          data.ProSerNo,
    room_temp:                  data.RoomTemp,
    flame_temp:                 data.FlameTemp,
    blow_temp:                  data.BlowTemp,
    fan_speed:                  data.FanSpeed,
    error_codes:                data.ErrCodes,
    heater_modes:               data.HeatModes,
    heating_period:             data.HeatPeriod,
    sys_voltage:                data.SysVolt,
    sys_work_time:              data.SysWorkTime,
    temp_set_point_sel_state:   data.TempSetPointSelStat,
    sys_total_work_time:        data.SysTotWorkTime,
    glow_total_work_time:       data.GlowTotWorkTime,
    pump_total_work_time:       data.PumpTotWorkTime,
    fan_total_work_time:        data.FanTotWorkTime,
    error_count:                data.ErrCount,
    alt_calc_value:             data.AltCalcValue,
  });

  const state = {
    room_temp:   data.RoomTemp,
    set_temp:    data.SetTemp,
    flame_temp:  data.FlameTemp,
    blow_temp:   data.BlowTemp,
    fan_speed:   data.FanSpeed,
    error_codes: data.ErrCodes,
    heater_modes: data.HeatModes,
    can_command: data.CANCommand,
    status:      'online',
    last_seen:   new Date().toISOString(),
  };
  await redis.set(`device:state:${serialNo}`, JSON.stringify(state), 'EX', 120);

  await Device.update(
    { status: 'online', last_seen_at: new Date(), target_temp: data.SetTemp },
    { where: { serial_no: serialNo } }
  );

  // High-frequency live state for SSE consumers (separate channel so the
  // notification service, which only listens on yilkar:events, is unaffected).
  await redis.publish('yilkar:telemetry', JSON.stringify({
    type:          'device_state',
    device_id:     device.id,
    device_serial: serialNo,
    customer_id:   device.customer_id,
    dealer_id:     device.dealer_id,
    state,
    data, // full raw device payload (technic app needs every field)
    ts:            Date.now(),
  }));

  if (data.ErrCodes && data.ErrCodes !== 0) {
    await handleAlarm(device, data.ErrCodes);
  }
}

async function handleStatus(serialNo, payload) {
  let statusStr = payload;
  try {
    const parsed = JSON.parse(payload);
    if (parsed && parsed.status) statusStr = parsed.status;
  } catch { /* plain string */ }

  const isOnline = statusStr === 'online';
  await Device.update(
    { status: isOnline ? 'online' : 'offline', last_seen_at: new Date() },
    { where: { serial_no: serialNo } }
  );
  await redis.set(`device:online:${serialNo}`, isOnline ? '1' : '0', 'EX', 300);
  logger.info(`Device ${serialNo} is ${statusStr}`);

  const device = await Device.findOne({ where: { serial_no: serialNo }, attributes: ['id', 'customer_id', 'dealer_id'] });
  if (device) {
    await redis.publish('yilkar:events', JSON.stringify({
      type: isOnline ? 'device_online' : 'device_offline',
      device_id: device.id,
      device_serial: serialNo,
      customer_id: device.customer_id,
      dealer_id: device.dealer_id,
      ts: Date.now(),
    }));
  }
}

async function handleAlarm(device, errorCode) {
  const existing = await Alarm.findOne({ device_id: device.id, code: errorCode, resolved: false });
  if (existing) return;

  await Alarm.create({
    device_id:     device.id,
    device_serial: device.serial_no,
    mac:           device.mac,
    customer_id:   device.customer_id,
    code:          errorCode,
    description:   `Error code ${errorCode}`,
    severity:      errorCode > 100 ? 'critical' : 'warning',
  });

  await Notification.create({
    type:          'alarm',
    title:         `Alarm: ${device.serial_no}`,
    message:       `Device ${device.serial_no} reported error code ${errorCode}`,
    device_id:     device.id,
    device_serial: device.serial_no,
    severity:      errorCode > 100 ? 'critical' : 'warning',
  });

  await redis.publish('yilkar:events', JSON.stringify({
    type:          'alarm',
    device_id:     device.id,
    device_serial: device.serial_no,
    customer_id:   device.customer_id,
    dealer_id:     device.dealer_id,
    error_code:    errorCode,
    severity:      errorCode > 100 ? 'critical' : 'warning',
    ts:            Date.now(),
  }));
}

async function sendCommand(serialNo, command) {
  if (!client || !client.connected) throw new Error('MQTT client not connected');
  const topic   = buildCommandTopic(serialNo);
  const payload = JSON.stringify(command);
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function sendOtaCommand(serialNo, payload) {
  if (!client || !client.connected) throw new Error('MQTT client not connected');
  const topic = buildOtaTopic(serialNo);
  return new Promise((resolve, reject) => {
    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function getDeviceState(serialNo) {
  const raw = await redis.get(`device:state:${serialNo}`);
  return raw ? JSON.parse(raw) : null;
}

// Mark devices offline if no telemetry received for > 3 minutes
function startHeartbeatWatcher() {
  const TIMEOUT_MS = 3 * 60 * 1000;
  setInterval(async () => {
    try {
      const { Op } = require('sequelize');
      const staleTime = new Date(Date.now() - TIMEOUT_MS);
      const [count] = await Device.update(
        { status: 'offline' },
        { where: { status: 'online', last_seen_at: { [Op.lt]: staleTime } } }
      );
      if (count > 0) logger.info(`Heartbeat: ${count} device(s) marked offline`);
    } catch (err) {
      logger.error('Heartbeat watcher error:', err);
    }
  }, 60 * 1000);
}

module.exports = { connect, sendCommand, sendOtaCommand, getDeviceState, startHeartbeatWatcher };
