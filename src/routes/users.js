const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const ctrl = require('../controllers/userController');

router.use(authenticate);

router.get('/', authorize('superadmin', 'admin'), ctrl.list);

router.get('/:id', param('id').isUUID(), validate, ctrl.getOne);

router.post('/',
  authorize('superadmin', 'admin'),
  audit('USER_CREATED'),
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['superadmin', 'admin', 'dealer']),
  validate,
  ctrl.create
);

router.put('/:id',
  authorize('superadmin', 'admin'),
  audit('USER_UPDATED'),
  param('id').isUUID(),
  validate,
  ctrl.update
);

router.delete('/:id',
  authorize('superadmin', 'admin'),
  audit('USER_DELETED'),
  param('id').isUUID(),
  validate,
  ctrl.remove
);

router.post('/me/change-password',
  audit('PASSWORD_CHANGED'),
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }),
  validate,
  ctrl.changePassword
);

module.exports = router;
