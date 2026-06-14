const { registryRedis } = require('../config/redisRegistry');
const { AllowedDevice } = require('../models/postgres/index');
const { success } = require('../utils/response');

const ALLOWED_KEY = 'mqtt:allowed';
const PENDING_KEY = 'mqtt:pending';

// GET /mqtt/registry/pending
async function listPending(req, res) {
  const all  = await registryRedis.hgetall(PENDING_KEY);
  const list = all ? Object.values(all).map((v) => JSON.parse(v)) : [];
  list.sort((a, b) => b.lastAttempt - a.lastAttempt);
  return success(res, list);
}

// GET /mqtt/registry/allowed
async function listAllowed(req, res) {
  const serials = await registryRedis.smembers(ALLOWED_KEY);
  return success(res, serials);
}

// POST /mqtt/registry/accept/:serial
async function acceptDevice(req, res) {
  const serial = req.params.serial;
  await AllowedDevice.findOrCreate({
    where: { serial_no: serial },
    defaults: { accepted_by: req.user?.id || null },
  });
  await registryRedis.sadd(ALLOWED_KEY, serial);
  await registryRedis.hdel(PENDING_KEY, serial);
  return success(res, { serial }, 'Device accepted');
}

// DELETE /mqtt/registry/pending/:serial
async function rejectDevice(req, res) {
  const serial = req.params.serial;
  await registryRedis.hdel(PENDING_KEY, serial);
  return success(res, { serial }, 'Device rejected');
}

// DELETE /mqtt/registry/allowed/:serial
async function revokeDevice(req, res) {
  const serial = req.params.serial;
  await AllowedDevice.destroy({ where: { serial_no: serial } });
  await registryRedis.srem(ALLOWED_KEY, serial);
  return success(res, { serial }, 'Device revoked');
}

module.exports = { listPending, listAllowed, acceptDevice, rejectDevice, revokeDevice };
