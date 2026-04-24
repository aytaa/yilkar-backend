require('dotenv').config();
const { sequelize } = require('./postgres');
require('../models/postgres/index');

async function migrate() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log('Migration complete');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
