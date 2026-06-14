const router = require('express').Router();
const {body, param} = require('express-validator');
const {validate} = require('../middleware/validate');
const {authenticate, authorize} = require('../middleware/auth');
const {audit} = require('../middleware/audit');
const ctrl = require('../controllers/dealerController');

router.use(authenticate, authorize('superadmin', 'admin'));

router.get('/', ctrl.list);

router.get('/:id', param('id').isUUID(), validate, ctrl.getOne);

router.post('/',
    audit('DEALER_CREATED'),
    body('name').notEmpty().trim(),
    body('email').optional().isEmail(),
    validate,
    ctrl.create
);

router.put('/:id',
    audit('DEALER_UPDATED'),
    param('id').isUUID(),
    validate,
    ctrl.update
);

router.delete('/:id',
    authorize('superadmin'),
    audit('DEALER_DELETED'),
    param('id').isUUID(),
    validate,
    ctrl.remove
);

router.get('/:id/customers', param('id').isUUID(), validate, ctrl.getCustomers);

router.get('/:id/devices', param('id').isUUID(), validate, ctrl.getDevices);

router.get('/:id/users', param('id').isUUID(), validate, ctrl.getUsers);

module.exports = router;
