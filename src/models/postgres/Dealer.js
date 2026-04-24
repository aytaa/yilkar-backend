const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const Dealer = sequelize.define('Dealer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING, validate: { isEmail: true } },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  total_sales: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, {
  tableName: 'dealers',
});

module.exports = Dealer;
