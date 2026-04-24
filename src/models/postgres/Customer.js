const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING, validate: { isEmail: true } },
  contact_person: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  dealer_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'dealers', key: 'id' } },
}, {
  tableName: 'customers',
});

module.exports = Customer;
