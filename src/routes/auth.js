const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const ctrl = require('../controllers/authController');

router.post('/login',
  audit('LOGIN'),
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  ctrl.login
);

router.post('/refresh',
  body('refresh_token').notEmpty(),
  validate,
  ctrl.refresh
);

router.get('/me', authenticate, ctrl.me);

router.post('/device-token',
  authenticate,
  body('expo_push_token').notEmpty().isString(),
  validate,
  ctrl.registerToken
);

router.post('/logout', authenticate, audit('LOGOUT'), ctrl.logout);

module.exports = router;
