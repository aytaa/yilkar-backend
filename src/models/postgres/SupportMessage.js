const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const SupportMessage = sequelize.define('SupportMessage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ticket_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'support_tickets', key: 'id' } },
  sender_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  sender_name: { type: DataTypes.STRING },
  sender_role: { type: DataTypes.STRING },
  content: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'support_messages',
});

module.exports = SupportMessage;
