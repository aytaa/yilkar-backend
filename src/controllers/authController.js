const bcrypt = require('bcryptjs');
const { User } = require('../models/postgres/index');
const { signAccess, signRefresh, verifyRefresh } = require('../utils/jwt');
const { AppError } = require('../errors/codes');
const { success } = require('../utils/response');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) throw new AppError('AUTH_1001');
    if (user.status !== 'active') throw new AppError('AUTH_1008');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError('AUTH_1001');

    if (req.body.expo_push_token) {
      await user.update({ expo_push_token: req.body.expo_push_token });
    }

    await user.update({ last_login_at: new Date() });

    const payload = { id: user.id, role: user.role, dealer_id: user.dealer_id };
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh({ id: user.id });

    return success(res, {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        dealer_id: user.dealer_id,
        customer_id: user.customer_id,
      },
    }, req.t('auth.loginSuccess'));
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) throw new AppError('AUTH_1003');

    let payload;
    try {
      payload = verifyRefresh(refresh_token);
    } catch {
      throw new AppError('AUTH_1006');
    }

    const user = await User.findByPk(payload.id);
    if (!user || user.status !== 'active') throw new AppError('AUTH_1004');

    const accessToken = signAccess({ id: user.id, role: user.role, dealer_id: user.dealer_id });
    return success(res, { access_token: accessToken }, req.t('auth.tokenRefreshed'));
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });
    return success(res, user);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    return success(res, null, req.t('auth.logoutSuccess'));
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refresh, me, logout };
