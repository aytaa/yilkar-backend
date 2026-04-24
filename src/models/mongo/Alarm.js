const { mongoose } = require('../../config/mongo');

const alarmSchema = new mongoose.Schema({
  device_id: { type: String, required: true, index: true },
  device_serial: String,
  mac: String,
  customer_id: String,
  customer_name: String,
  code: { type: Number, default: 0 },
  description: String,
  severity: { type: String, enum: ['critical', 'warning', 'info'], default: 'warning' },
  resolved: { type: Boolean, default: false, index: true },
  resolved_at: Date,
  resolved_by: String,
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

alarmSchema.index({ device_id: 1, timestamp: -1 });
alarmSchema.index({ resolved: 1, timestamp: -1 });

module.exports = mongoose.model('Alarm', alarmSchema);
