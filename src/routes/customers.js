const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const ctrl = require('../controllers/customerController');

router.use(authenticate);

router.get('/', ctrl.list);

router.get('/:id', param('id').isUUID(), validate, ctrl.getOne);

router.post('/',
  authorize('superadmin', 'admin'),
  audit('CUSTOMER_CREATED'),
  body('name').notEmpty().trim(),
  validate,
  ctrl.create
);

router.put('/:id',
  authorize('superadmin', 'admin'),
  audit('CUSTOMER_UPDATED'),
  param('id').isUUID(),
  validate,
  ctrl.update
);

router.delete('/:id',
  authorize('superadmin'),
  audit('CUSTOMER_DELETED'),
  param('id').isUUID(),
  validate,
  ctrl.remove
);

router.get('/:id/devices', param('id').isUUID(), validate, ctrl.getDevices);

router.get('/:id/users', param('id').isUUID(), validate, ctrl.getUsers);

module.exports = router;
