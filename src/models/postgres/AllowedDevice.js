const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

// Durable source of truth for the MQTT device whitelist. Redis DB5
// (mqtt:allowed) is a fast cache rebuilt from this table on startup, so the
// whitelist survives a Redis flush/outage.
const AllowedDevice = sequelize.define('AllowedDevice', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  serial_no: { type: DataTypes.STRING, allowNull: false, unique: true },
  accepted_by: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'mqtt_allowed_devices',
});

module.exports = AllowedDevice;
