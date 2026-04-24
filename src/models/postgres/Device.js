const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Device = sequelize.define('Device', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  serial_no: { type: DataTypes.STRING, allowNull: false, unique: true },
  mac: { type: DataTypes.STRING, allowNull: false, unique: true },
  model: {
    type: DataTypes.ENUM('YH 3', 'YH 5', 'YH 7'),
    defaultValue: 'YH 5',
    allowNull: false,
  },
  firmware: { type: DataTypes.STRING, defaultValue: 'v1.0.0' },
  city: { type: DataTypes.STRING },
  customer_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'customers', key: 'id' } },
  dealer_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'dealers', key: 'id' } },
  status: {
    type: DataTypes.ENUM('online', 'offline', 'error', 'warning', 'maintenance'),
    defaultValue: 'offline',
  },
  last_seen_at: { type: DataTypes.DATE },
  target_temp: { type: DataTypes.FLOAT, defaultValue: 22 },
  notes: { type: DataTypes.TEXT },
}, {
  tableName: 'devices',
});

module.exports = Device;
