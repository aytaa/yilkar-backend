/**
 * Server-Sent Events (SSE) fan-out for real-time UI updates.
 *
 * A SINGLE Redis subscriber listens on the event channels and pushes to every
 * connected SSE client (admin panel, mobile apps) — no per-connection Redis
 * connection, no MQTT credentials in the browser.
 *
 * Channels:
 *   yilkar:events     — device_online / device_offline / alarm
 *   yilkar:telemetry  — device_state (high-frequency live telemetry)
 *
 * Scope filtering (least privilege):
 *   superadmin, admin → all events
 *   dealer            → events whose dealer_id matches the user's dealer_id
 *   customer, tech    → events whose customer_id matches the user's customer_id
 */

const { redis } = require('../config/redis');
const logger = require('../utils/logger');

const CHANNELS = ['yilkar:events', 'yilkar:telemetry'];

// Set of { res, user }
const clients = new Set();
let subscriber = null;

function scopeAllows(user, event) {
  if (user.role === 'superadmin' || user.role === 'admin') return true;
  if (user.role === 'dealer') return user.dealer_id && event.dealer_id === user.dealer_id;
  // customer / tech and anything else: customer-scoped
  return user.customer_id && event.customer_id === user.customer_id;
}

function dispatch(event) {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    try {
      if (scopeAllows(client.user, event)) client.res.write(payload);
    } catch (err) {
      logger.warn('SSE write failed, dropping client', { err: err.message });
      clients.delete(client);
    }
  }
}

async function init() {
  if (subscriber) return;
  // Dedicated subscriber connection (a connection in subscribe mode cannot run
  // normal commands, so it must be separate from the main redis client).
  subscriber = redis.duplicate();
  subscriber.on('error', (err) => logger.warn('SSE subscriber Redis error', { err: err.message }));
  subscriber.on('message', (_channel, message) => {
    try {
      dispatch(JSON.parse(message));
    } catch (err) {
      logger.warn('SSE message parse failed', { err: err.message });
    }
  });
  await subscriber.subscribe(...CHANNELS);
  logger.info('SSE event stream subscribed', { channels: CHANNELS });
}

function addClient(res, user) {
  const client = { res, user };
  clients.add(client);
  logger.info('SSE client connected', { userId: user.id, role: user.role, total: clients.size });
  return () => {
    clients.delete(client);
    logger.info('SSE client disconnected', { userId: user.id, total: clients.size });
  };
}

module.exports = { init, addClient };
