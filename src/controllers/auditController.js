const AuditLog = require('../models/mongo/AuditLog');
const { success, paginated } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 50, user_id, device_id, module, action, from, to } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};

    if (user_id) filter.user_id = user_id;
    if (device_id) filter.device_id = device_id;
    if (module) filter.module = module;
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    if (req.user.role === 'dealer') {
      filter.user_id = req.user.id;
    }

    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    return paginated(res, data, total, page, limit);
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
