const { Op } = require('sequelize');
const { Dealer, Customer, Device, User } = require('../models/postgres/index');
const { AppError } = require('../errors/codes');
const { success, paginated } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Dealer.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    const withCounts = await Promise.all(
      rows.map(async (dealer) => {
        const [customerCount, deviceCount] = await Promise.all([
          Customer.count({ where: { dealer_id: dealer.id } }),
          Device.count({ where: { dealer_id: dealer.id } }),
        ]);
        return { ...dealer.toJSON(), total_customers: customerCount, total_devices: deviceCount };
      })
    );

    return paginated(res, withCounts, count, page, limit);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const dealer = await Dealer.findByPk(req.params.id);
    if (!dealer) throw new AppError('DEALER_4001');

    const [customerCount, deviceCount] = await Promise.all([
      Customer.count({ where: { dealer_id: dealer.id } }),
      Device.count({ where: { dealer_id: dealer.id } }),
    ]);

    return success(res, { ...dealer.toJSON(), total_customers: customerCount, total_devices: deviceCount });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const dealer = await Dealer.create(req.body);
    return success(res, dealer, req.t('dealer.created'), 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const dealer = await Dealer.findByPk(req.params.id);
    if (!dealer) throw new AppError('DEALER_4001');
    await dealer.update(req.body);
    return success(res, dealer, req.t('dealer.updated'));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const dealer = await Dealer.findByPk(req.params.id);
    if (!dealer) throw new AppError('DEALER_4001');

    const customerCount = await Customer.count({ where: { dealer_id: dealer.id } });
    if (customerCount > 0) throw new AppError('DEALER_4003');

    await dealer.destroy();
    return success(res, null, req.t('dealer.deleted'));
  } catch (err) {
    next(err);
  }
}

async function getCustomers(req, res, next) {
  try {
    const dealer = await Dealer.findByPk(req.params.id);
    if (!dealer) throw new AppError('DEALER_4001');
    const customers = await Customer.findAll({ where: { dealer_id: dealer.id } });
    return success(res, customers);
  } catch (err) {
    next(err);
  }
}

async function getDevices(req, res, next) {
  try {
    const dealer = await Dealer.findByPk(req.params.id);
    if (!dealer) throw new AppError('DEALER_4001');
    const devices = await Device.findAll({
      where: { dealer_id: dealer.id },
      include: [{ model: Customer, as: 'customer', attributes: ['id', 'name'] }],
    });
    return success(res, devices);
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const dealer = await Dealer.findByPk(req.params.id);
    if (!dealer) throw new AppError('DEALER_4001');
    const users = await User.findAll({
      where: { dealer_id: dealer.id },
      attributes: { exclude: ['password'] },
    });
    return success(res, users);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove, getCustomers, getDevices, getUsers };
