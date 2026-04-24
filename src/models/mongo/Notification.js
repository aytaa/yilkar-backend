const { mongoose } = require('../../config/mongo');

const notificationSchema = new mongoose.Schema({
  user_id: { type: String, index: true },
  type: {
    type: String,
    enum: ['alarm', 'info', 'warning', 'system', 'device'],
    default: 'info',
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['read', 'unread'], default: 'unread', index: true },
  device_id: String,
  device_serial: String,
  severity: { type: String, enum: ['critical', 'warning', 'info'], default: 'info' },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

module.exports = mongoose.model('Notification', notificationSchema);
