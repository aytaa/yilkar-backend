require('dotenv').config();
const { sequelize } = require('./postgres');
require('../models/postgres/index');

const ENUM_PATCHES = [
  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_enum
       WHERE enumtypid = 'enum_users_role'::regtype
       AND enumlabel = 'tech'
     ) THEN
       ALTER TYPE "enum_users_role" ADD VALUE 'tech';
     END IF;
   END $$;`,
];

async function migrate() {
  await sequelize.authenticate();

  for (const sql of ENUM_PATCHES) {
    await sequelize.query(sql, { raw: true });
  }

  await sequelize.sync({ alter: true });
  console.log('Migration complete');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
