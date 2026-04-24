const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/auditController');

router.use(authenticate);
router.get('/', ctrl.list);

module.exports = router;
