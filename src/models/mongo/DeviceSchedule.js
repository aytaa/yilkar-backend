const { mongoose } = require('../../config/mongo');

const settingsSchema = new mongoose.Schema({
  temp:   { type: Number },
  level:  { type: Number },
  time:   { hour: { type: Number, required: true }, minute: { type: Number, required: true } },
  repeat: [{ type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }],
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  device_id:       { type: String, required: true, index: true },
  device_serial:   { type: String, required: true },
  type:            { type: String, enum: ['heat', 'cool', 'fan'], required: true },
  enabled:         { type: Boolean, default: true },
  settings:        { type: settingsSchema, required: true },
  created_by:      { type: String },
  created_by_name: { type: String },
}, { timestamps: true });

scheduleSchema.index({ device_id: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('DeviceSchedule', scheduleSchema);
