const AuditLog = require('../models/mongo/AuditLog');
const logger = require('../utils/logger');

const MODULE_MAP = {
  '/auth': 'auth',
  '/devices': 'devices',
  '/customers': 'customers',
  '/dealers': 'dealers',
  '/support': 'support',
  '/users': 'users',
  '/notifications': 'notifications',
  '/audit-logs': 'audit',
  '/dashboard': 'dashboard',
};

function getModule(path) {
  const segment = '/' + (path.split('/')[3] || '');
  return MODULE_MAP[segment] || 'unknown';
}

function audit(action = null) {
  return (req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      const duration = Date.now() - start;
      const user = req.user || null;
      const module = getModule(req.path);
      const logAction = action || `${req.method}_${module.toUpperCase()}`;

      AuditLog.create({
        user_id: user?.id || null,
        user_name: user?.name || null,
        user_role: user?.role || null,
        user_email: user?.email || null,
        action: logAction,
        module,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip || req.headers['x-forwarded-for'],
        user_agent: req.headers['user-agent'],
        status_code: res.statusCode,
        device_id: req.params?.deviceId || req.body?.device_id || null,
        target_id: req.params?.id || null,
        target_type: module,
        details: {
          body: sanitizeBody(req.body),
          query: req.query,
        },
        error_code: body?.errorCode || null,
        duration_ms: duration,
      }).catch((err) => logger.error('Audit log write error:', err));

      return originalJson(body);
    };

    next();
  };
}

function sanitizeBody(body) {
  if (!body) return null;
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.new_password;
  delete sanitized.current_password;
  return sanitized;
}

module.exports = { audit };
