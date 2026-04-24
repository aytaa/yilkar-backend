const router = require('express').Router();
const { param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.use(authenticate);

router.get('/', ctrl.list);
router.put('/:id/read', param('id').isLength({ min: 1 }), validate, ctrl.markRead);
router.put('/read-all', ctrl.markAllRead);

module.exports = router;
