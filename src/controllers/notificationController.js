const Notification = require('../models/mongo/Notification');
const { AppError } = require('../errors/codes');
const { success, paginated } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const skip = (page - 1) * limit;
    const filter = { user_id: { $in: [req.user.id, null] } };

    if (status) filter.status = status;
    if (type) filter.type = type;

    const [data, total] = await Promise.all([
      Notification.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)),
      Notification.countDocuments(filter),
    ]);

    return paginated(res, data, total, page, limit);
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) throw new AppError('NOTIF_7001');
    await Notification.findByIdAndUpdate(req.params.id, { status: 'read' });
    return success(res, null, req.t('notification.markedAsRead'));
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany(
      { user_id: { $in: [req.user.id, null] }, status: 'unread' },
      { status: 'read' }
    );
    return success(res, null, req.t('notification.allMarkedAsRead'));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markRead, markAllRead };
