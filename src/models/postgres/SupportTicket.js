const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const SupportTicket = sequelize.define('SupportTicket', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'closed'),
    defaultValue: 'open',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
  },
  customer_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'customers', key: 'id' } },
  device_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'devices', key: 'id' } },
  created_by: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  closed_at: { type: DataTypes.DATE },
}, {
  tableName: 'support_tickets',
});

module.exports = SupportTicket;
