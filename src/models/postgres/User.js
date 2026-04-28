const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgres');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('superadmin', 'admin', 'dealer', 'tech'),
    defaultValue: 'dealer',
    allowNull: false,
  },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  phone: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  dealer_id: { type: DataTypes.UUID, allowNull: true },
  customer_id: { type: DataTypes.UUID, allowNull: true },
  expo_push_token: { type: DataTypes.STRING },
  last_login_at: { type: DataTypes.DATE },
}, {
  tableName: 'users',
});

module.exports = User;
