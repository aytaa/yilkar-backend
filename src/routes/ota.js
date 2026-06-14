const router = require('express').Router();
const multer = require('multer');
const { param, query, body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const ctrl = require('../controllers/otaController');

// Firmware binaries are small (~1-2 MB); keep in memory then flush to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16 MB hard cap
});

// ── Device-facing endpoints (no JWT; guarded by optional OTA_KEY) ───────────
router.get('/latest', query('model').notEmpty(), validate, ctrl.latest);
router.get('/download/:file', param('file').matches(/^v?\d+\.\d+\.\d+\.bin$/i), validate, ctrl.download);

// ── Admin endpoints (JWT required) ──────────────────────────────────────────
router.use(authenticate);

router.post('/upload',
  authorize('superadmin', 'admin'),
  audit('OTA_UPLOADED'),
  upload.single('file'),
  body('version').optional(),   // bos birakilirsa dosya adindan turetilir (v0.4.0.bin)
  body('model').notEmpty(),
  validate,
  ctrl.upload
);

router.get('/firmwares', authorize('superadmin', 'admin'), ctrl.list);

router.post('/trigger/:serial',
  authorize('superadmin', 'admin'),
  audit('OTA_TRIGGERED'),
  param('serial').notEmpty(),
  validate,
  ctrl.trigger
);

router.delete('/firmwares/:model/:version',
  authorize('superadmin'),
  audit('OTA_DELETED'),
  ctrl.remove
);

module.exports = router;
