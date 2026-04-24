const { error } = require('../utils/response');
const { AppError } = require('../errors/codes');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return error(res, err, req.t);
  }

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const appErr = new AppError('COMMON_0001');
    appErr.details = err.errors?.map((e) => ({ field: e.path, message: e.message }));
    return error(res, appErr, req.t);
  }

  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, path: req.originalUrl });

  const fallback = new AppError('COMMON_0002');
  return error(res, fallback, req.t);
}

module.exports = { errorHandler };
