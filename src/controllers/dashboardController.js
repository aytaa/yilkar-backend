const { Device, Customer, Dealer } = require('../models/postgres/index');
const Alarm = require('../models/mongo/Alarm');
const { success } = require('../utils/response');

async function stats(req, res, next) {
  try {
    const where = {};
    if (req.user.role === 'dealer') where.dealer_id = req.user.dealer_id;

    const [
      totalDevices,
      onlineDevices,
      offlineDevices,
      errorDevices,
      totalCustomers,
      totalDealers,
      todayAlarms,
    ] = await Promise.all([
      Device.count({ where }),
      Device.count({ where: { ...where, status: 'online' } }),
      Device.count({ where: { ...where, status: 'offline' } }),
      Device.count({ where: { ...where, status: 'error' } }),
      Customer.count({ where: req.user.role === 'dealer' ? { dealer_id: req.user.dealer_id } : {} }),
      req.user.role === 'superadmin' ? Dealer.count() : Promise.resolve(null),
      Alarm.countDocuments({
        resolved: false,
        timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    return success(res, {
      total_devices: totalDevices,
      online_devices: onlineDevices,
      offline_devices: offlineDevices,
      error_devices: errorDevices,
      total_customers: totalCustomers,
      total_dealers: totalDealers,
      today_alarms: todayAlarms,
      online_percent: totalDevices ? Math.round((onlineDevices / totalDevices) * 100) : 0,
    });
  } catch (err) {
    next(err);
  }
}

async function recentAlarms(req, res, next) {
  try {
    const alarms = await Alarm.find({ resolved: false })
      .sort({ timestamp: -1 })
      .limit(10);
    return success(res, alarms);
  } catch (err) {
    next(err);
  }
}

async function deviceActivity(req, res, next) {
  try {
    const { days = 30 } = req.query;
    const from = new Date();
    from.setDate(from.getDate() - parseInt(days));

    const Telemetry = require('../models/mongo/Telemetry');
    const pipeline = [
      { $match: { timestamp: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const data = await Telemetry.aggregate(pipeline);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = { stats, recentAlarms, deviceActivity };
