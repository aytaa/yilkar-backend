const { mongoose } = require('../../config/mongo');

const telemetrySchema = new mongoose.Schema({
  device_id: { type: String, required: true, index: true },
  mac: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  fan_level_selection: Number,
  can_command_switch: Number,
  can_command: Number,
  heating_level_selection: Number,
  set_temp: Number,
  hardware_code_serial: String,
  product_serial_no: Number,
  room_temp: Number,
  flame_temp: Number,
  blow_temp: Number,
  fan_speed: Number,
  error_codes: Number,
  heater_modes: Number,
  heating_period: Number,
  sys_voltage: Number,
  sys_work_time: Number,
  temp_set_point_sel_state: Number,
  sys_total_work_time: Number,
  glow_total_work_time: Number,
  pump_total_work_time: Number,
  fan_total_work_time: Number,
  error_count: Number,
  alt_calc_value: Number,
}, { timestamps: false });

telemetrySchema.index({ mac: 1, timestamp: -1 });

module.exports = mongoose.model('Telemetry', telemetrySchema);
