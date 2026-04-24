const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Dealer, Customer } = require('../models/postgres/index');
const { AppError } = require('../errors/codes');
const { success, paginated } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20, role, status, dealer_id, search } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (role) where.role = role;
    if (status) where.status = status;
    if (dealer_id) where.dealer_id = dealer_id;
    if (req.user.role === 'dealer') where.dealer_id = req.user.dealer_id;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: Dealer, as: 'dealer', attributes: ['id', 'name'] },
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
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
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Dealer, as: 'dealer', attributes: ['id', 'name'] },
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
      ],
    });
    if (!user) throw new AppError('USER_6001');
    return success(res, user);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const existing = await User.findOne({ where: { email: req.body.email } });
    if (existing) throw new AppError('USER_6002');

    const hash = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({ ...req.body, password: hash });

    const { password: _, ...data } = user.toJSON();
    return success(res, data, req.t('user.created'), 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) throw new AppError('USER_6001');

    if (req.body.email && req.body.email !== user.email) {
      const existing = await User.findOne({ where: { email: req.body.email } });
      if (existing) throw new AppError('USER_6002');
    }

    const { password: _, ...fields } = req.body;
    await user.update(fields);

    const { password: __, ...data } = user.toJSON();
    return success(res, data, req.t('user.updated'));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (req.params.id === req.user.id) throw new AppError('USER_6004');

    const user = await User.findByPk(req.params.id);
    if (!user) throw new AppError('USER_6001');

    await user.destroy();
    return success(res, null, req.t('user.deleted'));
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    const { current_password, new_password } = req.body;

    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) throw new AppError('USER_6003');

    const hash = await bcrypt.hash(new_password, 10);
    await user.update({ password: hash });

    return success(res, null, req.t('user.passwordChanged'));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove, changePassword };
