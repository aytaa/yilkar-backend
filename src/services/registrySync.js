const { registryRedis } = require('../config/redisRegistry');
const { AllowedDevice } = require('../models/postgres/index');
const logger = require('../utils/logger');

const ALLOWED_KEY = 'mqtt:allowed';

/**
 * Reconciles the MQTT whitelist between PostgreSQL (durable source of truth)
 * and Redis DB5 (fast cache the broker reads). Runs once at startup:
 *   1. Backfill PG from any Redis-only serials (migration safety — preserves
 *      a whitelist that existed before this table did).
 *   2. Seed Redis from PG so the cache reflects the source of truth, surviving
 *      a Redis flush/outage.
 */
async function syncWhitelist() {
  try {
    const redisSerials = await registryRedis.smembers(ALLOWED_KEY);

    for (const serial of redisSerials) {
      await AllowedDevice.findOrCreate({ where: { serial_no: serial } });
    }

    const rows = await AllowedDevice.findAll({ attributes: ['serial_no'] });
    const serials = rows.map((r) => r.serial_no);
    if (serials.length) await registryRedis.sadd(ALLOWED_KEY, ...serials);

    logger.info(`MQTT whitelist synced (PG=${serials.length}, redisSeed=${redisSerials.length})`);
  } catch (err) {
    logger.warn('MQTT whitelist sync failed', { err: err.message });
  }
}

module.exports = { syncWhitelist };
