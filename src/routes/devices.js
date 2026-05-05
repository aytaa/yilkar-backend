const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const ctrl = require('../controllers/deviceController');
const scheduleCtrl = require('../controllers/scheduleController');

router.use(authenticate);

router.get('/', query('page').optional().isInt(), query('limit').optional().isInt(), validate, ctrl.list);

router.get('/:id', param('id').isUUID(), validate, audit('DEVICE_VIEWED'), ctrl.getOne);

router.post('/',
  authorize('superadmin', 'admin'),
  audit('DEVICE_CREATED'),
  body('serial_no').notEmpty(),
  body('mac').notEmpty(),
  body('model').isIn(['YH 3', 'YH 5', 'YH 7']),
  validate,
  ctrl.create
);

router.put('/:id',
  authorize('superadmin', 'admin'),
  audit('DEVICE_UPDATED'),
  param('id').isUUID(),
  validate,
  ctrl.update
);

router.delete('/:id',
  authorize('superadmin'),
  audit('DEVICE_DELETED'),
  param('id').isUUID(),
  validate,
  ctrl.remove
);

router.post('/:id/command',
  audit('COMMAND_SENT'),
  param('id').isUUID(),
  validate,
  ctrl.sendDeviceCommand
);

router.get('/:id/telemetry',
  param('id').isUUID(),
  validate,
  ctrl.getTelemetry
);

router.get('/:id/alarms',
  param('id').isUUID(),
  validate,
  ctrl.getAlarms
);

router.get('/:id/live',
  param('id').isUUID(),
  validate,
  ctrl.getLiveState
);

// ── Schedule routes ────────────────────────────────────────────────────────

router.get('/:id/schedules',
  param('id').isUUID(),
  validate,
  scheduleCtrl.getSchedules
);

router.post('/:id/schedules',
  audit('SCHEDULE_SAVED'),
  param('id').isUUID(),
  body('type').isIn(['heat', 'cool', 'fan']),
  body('settings').isObject(),
  body('settings.time.hour').isInt({ min: 0, max: 23 }),
  body('settings.time.minute').isInt({ min: 0, max: 59 }),
  body('settings.repeat').isArray(),
  validate,
  scheduleCtrl.upsertSchedule
);

router.delete('/:id/schedules/:type',
  audit('SCHEDULE_DELETED'),
  param('id').isUUID(),
  param('type').isIn(['heat', 'cool', 'fan']),
  validate,
  scheduleCtrl.deleteSchedule
);

// Internal endpoint — called by cron service to log executed schedule commands
router.post('/:id/schedules/command-log',
  scheduleCtrl.logScheduleCommand
);

module.exports = router;
