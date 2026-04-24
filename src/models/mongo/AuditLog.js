const { mongoose } = require('../../config/mongo');

const auditLogSchema = new mongoose.Schema({
  user_id: { type: String, index: true },
  user_name: String,
  user_role: String,
  user_email: String,
  action: { type: String, required: true, index: true },
  module: { type: String, index: true },
  method: String,
  path: String,
  ip: String,
  user_agent: String,
  status_code: Number,
  device_id: { type: String, index: true },
  target_id: String,
  target_type: String,
  details: mongoose.Schema.Types.Mixed,
  error_code: String,
  duration_ms: Number,
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

auditLogSchema.index({ user_id: 1, timestamp: -1 });
auditLogSchema.index({ device_id: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
