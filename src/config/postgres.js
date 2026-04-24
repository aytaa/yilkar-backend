const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('../utils/logger');

const sequelize = new Sequelize(env.PG_DB, env.PG_USER, env.PG_PASSWORD, {
  host: env.PG_HOST,
  port: env.PG_PORT,
  dialect: 'postgres',
  logging: (msg) => {
    if (env.NODE_ENV === 'development') logger.debug(msg);
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  define: { underscored: true, timestamps: true },
});

async function connectPostgres() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  logger.info('PostgreSQL connected');
}

module.exports = { sequelize, connectPostgres };
