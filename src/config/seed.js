const bcrypt = require('bcryptjs');
const { User, Dealer, Customer, Device } = require('../models/postgres/index');
const env = require('./env');
const logger = require('../utils/logger');

async function runSeed() {
  const existing = await User.findOne({ where: { email: env.ADMIN_EMAIL } });
  if (existing) {
    logger.info('Seed already applied, skipping');
    return;
  }

  const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  await User.create({
    name: 'Yilkar Admin',
    email: env.ADMIN_EMAIL,
    password: hash,
    role: 'superadmin',
    status: 'active',
  });

  const dealer = await Dealer.create({
    name: 'Yilkar Merkez',
    city: 'Kayseri',
    phone: '+90 352 600 0001',
    email: 'merkez@yilkarklima.app',
    status: 'active',
  });

  const customer = await Customer.create({
    name: 'Demo Müşteri',
    city: 'İstanbul',
    phone: '+90 212 555 0001',
    email: 'demo@demo.com',
    contact_person: 'Demo Kişi',
    dealer_id: dealer.id,
    status: 'active',
  });

  await Device.create({
    serial_no: 'YH5-00001',
    mac: 'AA:BB:CC:DD:EE:01',
    model: 'YH 5',
    firmware: 'v1.0.0',
    city: 'İstanbul',
    customer_id: customer.id,
    dealer_id: dealer.id,
    status: 'offline',
    target_temp: 22,
  });

  logger.info(`Seed complete. Admin: ${env.ADMIN_EMAIL}`);
}

module.exports = { runSeed };
