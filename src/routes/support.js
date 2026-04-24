const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const ctrl = require('../controllers/supportController');

router.use(authenticate);

router.get('/', ctrl.list);

router.get('/:id', param('id').isUUID(), validate, audit('SUPPORT_VIEWED'), ctrl.getOne);

router.post('/',
  audit('SUPPORT_CREATED'),
  body('title').notEmpty().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  validate,
  ctrl.create
);

router.put('/:id',
  audit('SUPPORT_UPDATED'),
  param('id').isUUID(),
  validate,
  ctrl.update
);

router.post('/:id/messages',
  audit('SUPPORT_COMMENT'),
  param('id').isUUID(),
  body('content').notEmpty().trim(),
  validate,
  ctrl.addMessage
);

module.exports = router;
