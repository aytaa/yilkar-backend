const Redis  = require('ioredis');
const env    = require('./env');
const logger = require('../utils/logger');

// Dedicated client for Redis DB5 — device whitelist registry
const registryRedis = new Redis({
  host:     env.REDIS_HOST,
  port:     env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db:       5,
  lazyConnect: true,
  // Resilience: keep retrying transient outages instead of failing closed
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  retryStrategy: (times) => Math.min(times * 200, 5000),
});

registryRedis.on('connect', () => logger.info('Registry Redis (DB5) connected'));
registryRedis.on('error',   (err) => logger.warn('Registry Redis error:', err.message));

async function connectRegistryRedis() {
  await registryRedis.connect();
}

module.exports = { registryRedis, connectRegistryRedis };
