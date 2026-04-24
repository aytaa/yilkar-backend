require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3001,
  API_PREFIX: process.env.API_PREFIX || '/api/v1',

  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_prod',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  PG_HOST: process.env.PG_HOST || 'localhost',
  PG_PORT: parseInt(process.env.PG_PORT) || 5432,
  PG_DB: process.env.PG_DB || 'yilkar',
  PG_USER: process.env.PG_USER || 'yilkar',
  PG_PASSWORD: process.env.PG_PASSWORD || 'yilkar123',

  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/yilkar',

  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  MQTT_HOST: process.env.MQTT_HOST || 'localhost',
  MQTT_PORT: parseInt(process.env.MQTT_PORT) || 1883,
  MQTT_USERNAME: process.env.MQTT_USERNAME || 'yilkar-api',
  MQTT_PASSWORD: process.env.MQTT_PASSWORD || 'yilkar-api-secret',
  MQTT_CLIENT_ID: process.env.MQTT_CLIENT_ID || 'yilkar-backend',

  EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN || '',

  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@yilkarklima.app',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin1234!',
};
