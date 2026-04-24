require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('./postgres');
const { User, Dealer, Customer, Device } = require('../models/postgres/index');
const env = require('./env');

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  const existing = await User.findOne({ where: { email: env.ADMIN_EMAIL } });
  if (existing) {
    console.log('Seed already applied, skipping');
    process.exit(0);
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
    email: 'merkez@yilkar.com.tr',
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

  console.log(`Seed complete. Admin: ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
