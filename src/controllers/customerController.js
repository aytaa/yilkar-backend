const { Op } = require('sequelize');
const { Customer, Dealer, Device, User } = require('../models/postgres/index');
const { AppError } = require('../errors/codes');
const { success, paginated } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20, status, dealer_id, search } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (dealer_id) where.dealer_id = dealer_id;
    if (req.user.role === 'dealer') where.dealer_id = req.user.dealer_id;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,
      include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'name'] }],
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
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'name'] }],
    });
    if (!customer) throw new AppError('CUSTOMER_3001');

    const deviceCount = await Device.count({ where: { customer_id: customer.id } });
    return success(res, { ...customer.toJSON(), device_count: deviceCount });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const customer = await Customer.create(req.body);
    return success(res, customer, req.t('customer.created'), 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) throw new AppError('CUSTOMER_3001');
    await customer.update(req.body);
    return success(res, customer, req.t('customer.updated'));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) throw new AppError('CUSTOMER_3001');

    const deviceCount = await Device.count({ where: { customer_id: customer.id } });
    if (deviceCount > 0) throw new AppError('CUSTOMER_3003');

    await customer.destroy();
    return success(res, null, req.t('customer.deleted'));
  } catch (err) {
    next(err);
  }
}

async function getDevices(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) throw new AppError('CUSTOMER_3001');

    const devices = await Device.findAll({ where: { customer_id: customer.id } });
    return success(res, devices);
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) throw new AppError('CUSTOMER_3001');

    const users = await User.findAll({
      where: { customer_id: customer.id },
      attributes: { exclude: ['password'] },
    });
    return success(res, users);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove, getDevices, getUsers };
