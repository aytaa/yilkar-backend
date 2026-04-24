const { Op } = require('sequelize');
const { Device, Customer, Dealer } = require('../models/postgres/index');
const Telemetry = require('../models/mongo/Telemetry');
const Alarm = require('../models/mongo/Alarm');
const { AppError } = require('../errors/codes');
const { success, paginated } = require('../utils/response');
const { sendCommand, getDeviceState } = require('../services/mqttService');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20, status, model, customer_id, dealer_id, search } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (model) where.model = model;
    if (customer_id) where.customer_id = customer_id;
    if (dealer_id) where.dealer_id = dealer_id;
    if (req.user.role === 'dealer') where.dealer_id = req.user.dealer_id;

    if (search) {
      where[Op.or] = [
        { serial_no: { [Op.iLike]: `%${search}%` } },
        { mac: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Device.findAndCountAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
        { model: Dealer, as: 'dealer', attributes: ['id', 'name'] },
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    return paginated(res, rows, count, page, limit);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'city'] },
        { model: Dealer, as: 'dealer', attributes: ['id', 'name'] },
      ],
    });
    if (!device) throw new AppError('DEVICE_2001');

    const liveState = await getDeviceState(device.serial_no);

    return success(res, { ...device.toJSON(), live: liveState });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const existing = await Device.findOne({ where: { serial_no: req.body.serial_no } });
    if (existing) throw new AppError('DEVICE_2002');

    const device = await Device.create(req.body);
    return success(res, device, req.t('device.created'), 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) throw new AppError('DEVICE_2001');
    await device.update(req.body);
    return success(res, device, req.t('device.updated'));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) throw new AppError('DEVICE_2001');
    await device.destroy();
    return success(res, null, req.t('device.deleted'));
  } catch (err) {
    next(err);
  }
}

async function sendDeviceCommand(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) throw new AppError('DEVICE_2001');
    if (device.status === 'offline') throw new AppError('DEVICE_2003');

    const { power, mode, set_temp, fan_level, heating_level } = req.body;

    const command = {};
    if (power !== undefined) {
      command.CANCommand = power ? 1 : 0;
      command.CanComSwitch = 1;
    }
    if (set_temp !== undefined) command.SetTemp = set_temp;
    if (fan_level !== undefined) command.FanLSel = fan_level;
    if (heating_level !== undefined) command.HeatLSel = heating_level;

    if (Object.keys(command).length === 0) throw new AppError('DEVICE_2005');

    try {
      await sendCommand(device.serial_no, command);
    } catch {
      throw new AppError('DEVICE_2004');
    }

    if (set_temp !== undefined) {
      await device.update({ target_temp: set_temp });
    }

    return success(res, { command }, req.t('device.commandSent'));
  } catch (err) {
    next(err);
  }
}

async function getTelemetry(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) throw new AppError('DEVICE_2001');

    const { from, to, limit = 100 } = req.query;
    const filter = { mac: device.mac };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const data = await Telemetry.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getAlarms(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) throw new AppError('DEVICE_2001');

    const { resolved, limit = 50 } = req.query;
    const filter = { device_id: device.id };
    if (resolved !== undefined) filter.resolved = resolved === 'true';

    const alarms = await Alarm.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return success(res, alarms);
  } catch (err) {
    next(err);
  }
}

async function getLiveState(req, res, next) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) throw new AppError('DEVICE_2001');
    const state = await getDeviceState(device.serial_no);
    return success(res, state);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove, sendDeviceCommand, getTelemetry, getAlarms, getLiveState };
