const fs = require('fs');
const env = require('../config/env');
const { AppError } = require('../errors/codes');
const { success } = require('../utils/response');
const ota = require('../services/otaService');
const { sendOtaCommand } = require('../services/mqttService');
const { Device } = require('../models/postgres/index');
const logger = require('../utils/logger');

/** Build the public download URL the device will pull from. */
function downloadUrl(model, version) {
  const base = (env.OTA_BASE_URL || '').replace(/\/$/, '');
  const q = new URLSearchParams({ model });
  if (env.OTA_KEY) q.set('key', env.OTA_KEY);
  return `${base}${env.API_PREFIX}/ota/download/${version}.bin?${q.toString()}`;
}

// ── Admin: upload new firmware ──────────────────────────────────────────────
// POST /ota/upload   (multipart/form-data: file, version, model, notes)
async function upload(req, res, next) {
  try {
    if (!req.file) throw new AppError('OTA_9001');
    const { version, model, notes } = req.body;
    if (!ota.normVersion(version)) throw new AppError('OTA_9002');
    if (!model) throw new AppError('COMMON_0006');

    const meta = ota.saveFirmware({
      model,
      version,
      buffer: req.file.buffer,
      notes: notes || '',
      uploadedBy: req.user ? req.user.id : null,
    });
    logger.info(`OTA firmware uploaded: ${meta.model} ${meta.version} (${meta.size}B md5=${meta.md5})`);
    return success(res, { ...meta, url: downloadUrl(meta.model, meta.version) }, 'ota.uploaded', 201);
  } catch (err) {
    if (err.code === 'OTA_BAD_VERSION') return next(new AppError('OTA_9002'));
    if (err.code === 'OTA_EMPTY') return next(new AppError('OTA_9001'));
    next(err);
  }
}

// ── Admin: list firmwares ───────────────────────────────────────────────────
// GET /ota/firmwares?model=YH%205
async function list(req, res, next) {
  try {
    const items = ota.listFirmwares(req.query.model || null)
      .map((m) => ({ ...m, url: downloadUrl(m.model, m.version) }));
    return success(res, items);
  } catch (err) { next(err); }
}

// ── Device/App: latest firmware metadata ────────────────────────────────────
// GET /ota/latest?model=YH%205
async function latest(req, res, next) {
  try {
    const { model } = req.query;
    if (!model) throw new AppError('COMMON_0006');
    const meta = ota.getLatest(model);
    if (!meta) throw new AppError('OTA_9003');
    return success(res, { ...meta, url: downloadUrl(meta.model, meta.version) });
  } catch (err) { next(err); }
}

// ── Device: download binary (streamed, Range-capable) ───────────────────────
// GET /ota/download/:file   e.g. /ota/download/v1.2.0.bin?model=YH%205&key=...
async function download(req, res, next) {
  try {
    if (env.OTA_KEY && req.query.key !== env.OTA_KEY) throw new AppError('AUTH_1004');
    const file = req.params.file || '';
    const version = file.replace(/\.bin$/i, '');
    const meta = ota.getFirmware(req.query.model, version);
    if (!meta) throw new AppError('OTA_9003');

    const stat = fs.statSync(meta.path);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Firmware-MD5', meta.md5);
    res.setHeader('X-Firmware-Version', meta.version);
    res.setHeader('Accept-Ranges', 'bytes');

    // HTTP Range support (firmware download resume)
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      if (m) {
        const start = parseInt(m[1], 10);
        const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
        if (start >= stat.size || end >= stat.size) {
          res.status(416).setHeader('Content-Range', `bytes */${stat.size}`);
          return res.end();
        }
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', end - start + 1);
        return fs.createReadStream(meta.path, { start, end }).pipe(res);
      }
    }
    res.setHeader('Content-Length', stat.size);
    return fs.createReadStream(meta.path).pipe(res);
  } catch (err) { next(err); }
}

// ── Admin: trigger OTA on a device over MQTT ────────────────────────────────
// POST /ota/trigger/:serial   (body: { version, model? })
async function trigger(req, res, next) {
  try {
    const { serial } = req.params;
    const device = await Device.findOne({ where: { serial_no: serial } });
    if (!device) throw new AppError('DEVICE_2001');

    const model = req.body.model || device.model;
    const version = req.body.version
      ? ota.normVersion(req.body.version)
      : (ota.getLatest(model) || {}).version;
    if (!version) throw new AppError('OTA_9003');

    const meta = ota.getFirmware(model, version);
    if (!meta) throw new AppError('OTA_9003');

    const command = {
      cmd: 'ota',
      version: meta.version,
      url: downloadUrl(meta.model, meta.version),
      md5: meta.md5,
      size: meta.size,
    };
    try {
      await sendOtaCommand(serial, command);
    } catch (e) {
      logger.error('OTA MQTT publish failed:', e);
      throw new AppError('DEVICE_2004');
    }
    logger.info(`OTA triggered for ${serial} -> ${meta.version}`);
    return success(res, { serial, command }, 'ota.triggered');
  } catch (err) { next(err); }
}

// ── Admin: delete a firmware ────────────────────────────────────────────────
// DELETE /ota/firmwares/:model/:version
async function remove(req, res, next) {
  try {
    const ok = ota.removeFirmware(req.params.model, req.params.version);
    if (!ok) throw new AppError('OTA_9003');
    return success(res, null, 'ota.deleted');
  } catch (err) { next(err); }
}

module.exports = { upload, list, latest, download, trigger, remove };
