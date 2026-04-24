const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/mqttRegistryController');

router.use(authenticate);
router.use(authorize('admin', 'superadmin'));

router.get('/pending',            ctrl.listPending);
router.get('/allowed',            ctrl.listAllowed);
router.post('/accept/:serial',    ctrl.acceptDevice);
router.delete('/pending/:serial', ctrl.rejectDevice);
router.delete('/allowed/:serial', ctrl.revokeDevice);

module.exports = router;
