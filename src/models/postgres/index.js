const User = require('./User');
const Dealer = require('./Dealer');
const Customer = require('./Customer');
const Device = require('./Device');
const SupportTicket = require('./SupportTicket');
const SupportMessage = require('./SupportMessage');
const AllowedDevice = require('./AllowedDevice');

// Associations
Dealer.hasMany(Customer, { foreignKey: 'dealer_id', as: 'customers' });
Customer.belongsTo(Dealer, { foreignKey: 'dealer_id', as: 'dealer' });

Dealer.hasMany(Device, { foreignKey: 'dealer_id', as: 'devices' });
Device.belongsTo(Dealer, { foreignKey: 'dealer_id', as: 'dealer' });

Customer.hasMany(Device, { foreignKey: 'customer_id', as: 'devices' });
Device.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

Dealer.hasMany(User, { foreignKey: 'dealer_id', as: 'users' });
User.belongsTo(Dealer, { foreignKey: 'dealer_id', as: 'dealer' });

Customer.hasMany(User, { foreignKey: 'customer_id', as: 'users' });
User.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

SupportTicket.hasMany(SupportMessage, { foreignKey: 'ticket_id', as: 'messages' });
SupportMessage.belongsTo(SupportTicket, { foreignKey: 'ticket_id', as: 'ticket' });

SupportTicket.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
SupportTicket.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });
SupportTicket.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

SupportMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

module.exports = { User, Dealer, Customer, Device, SupportTicket, SupportMessage, AllowedDevice };
