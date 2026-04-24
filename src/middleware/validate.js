const { validationResult } = require('express-validator');
const { AppError } = require('../errors/codes');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new AppError('COMMON_0001');
    err.details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(err);
  }
  next();
}

module.exports = { validate };
