/**
 * OTA firmware store (filesystem based — no DB migration needed).
 *
 * Layout:
 *   storage/firmware/<model>/<version>.bin       → firmware binary
 *   storage/firmware/<model>/<version>.bin.json  → sidecar metadata
 *
 * "model" is sanitized (spaces → underscore) so "YH 5" → "YH_5".
 * "version" must be semver-ish: v1.2.0 / 1.2.0.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..', 'storage', 'firmware');

const VERSION_RE = /^v?\d+\.\d+\.\d+$/;

function ensureRoot() {
  fs.mkdirSync(ROOT, { recursive: true });
}

function sanitizeModel(model) {
  return String(model || '').trim().replace(/[^A-Za-z0-9._-]+/g, '_');
}

function normVersion(version) {
  const v = String(version || '').trim();
  if (!VERSION_RE.test(v)) return null;
  return v.startsWith('v') ? v : `v${v}`;
}

function md5Hex(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}

function paths(model, version) {
  const dir = path.join(ROOT, sanitizeModel(model));
  const bin = path.join(dir, `${version}.bin`);
  return { dir, bin, meta: `${bin}.json` };
}

/** Save a firmware buffer. Returns metadata. */
function saveFirmware({ model, version, buffer, notes = '', uploadedBy = null }) {
  ensureRoot();
  const v = normVersion(version);
  if (!v) throw Object.assign(new Error('invalid version'), { code: 'OTA_BAD_VERSION' });
  if (!buffer || !buffer.length) throw Object.assign(new Error('empty file'), { code: 'OTA_EMPTY' });

  const { dir, bin, meta } = paths(model, v);
  fs.mkdirSync(dir, { recursive: true });

  const md5 = md5Hex(buffer);
  fs.writeFileSync(bin, buffer);
  const metadata = {
    model: String(model).trim(),
    version: v,
    size: buffer.length,
    md5,
    notes,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    file: `${v}.bin`,
  };
  fs.writeFileSync(meta, JSON.stringify(metadata, null, 2));
  return metadata;
}

/** List all firmwares, optionally filtered by model. Newest first. */
function listFirmwares(model = null) {
  ensureRoot();
  const out = [];
  const models = model ? [sanitizeModel(model)] : fs.readdirSync(ROOT);
  for (const m of models) {
    const dir = path.join(ROOT, m);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.bin.json')) continue;
      try {
        out.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
      } catch { /* skip corrupt sidecar */ }
    }
  }
  out.sort((a, b) => cmpVersion(b.version, a.version));
  return out;
}

function getFirmware(model, version) {
  const v = normVersion(version);
  if (!v) return null;
  const { bin, meta } = paths(model, v);
  if (!fs.existsSync(bin) || !fs.existsSync(meta)) return null;
  const metadata = JSON.parse(fs.readFileSync(meta, 'utf8'));
  return { ...metadata, path: bin };
}

/** Latest firmware for a model (highest semver). */
function getLatest(model) {
  const list = listFirmwares(model);
  return list.length ? list[0] : null;
}

function removeFirmware(model, version) {
  const v = normVersion(version);
  if (!v) return false;
  const { bin, meta } = paths(model, v);
  let removed = false;
  if (fs.existsSync(bin)) { fs.unlinkSync(bin); removed = true; }
  if (fs.existsSync(meta)) { fs.unlinkSync(meta); }
  return removed;
}

/** semver compare: returns >0 if a>b. */
function cmpVersion(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

module.exports = {
  saveFirmware,
  listFirmwares,
  getFirmware,
  getLatest,
  removeFirmware,
  normVersion,
  sanitizeModel,
};
