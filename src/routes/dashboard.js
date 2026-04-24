const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(authenticate);
router.get('/stats', ctrl.stats);
router.get('/recent-alarms', ctrl.recentAlarms);
router.get('/device-activity', ctrl.deviceActivity);

module.exports = router;
