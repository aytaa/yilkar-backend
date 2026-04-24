const { verifyAccess } = require('../utils/jwt');
const { AppError } = require('../errors/codes');
const { User } = require('../models/postgres/index');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) throw new AppError('AUTH_1004');

    const token = header.split(' ')[1];
    const payload = verifyAccess(token);

    const user = await User.findByPk(payload.id, {
      attributes: ['id', 'name', 'email', 'role', 'status', 'dealer_id', 'customer_id'],
    });

    if (!user) throw new AppError('AUTH_1004');
    if (user.status !== 'active') throw new AppError('AUTH_1008');

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new AppError('AUTH_1002'));
    if (err.name === 'JsonWebTokenError') return next(new AppError('AUTH_1003'));
    next(err);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return next(new AppError('AUTH_1005'));
    next();
  };
}

module.exports = { authenticate, authorize };
