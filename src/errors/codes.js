/**
 * Yilkar API Error Codes
 *
 * Format: MODULE_XXXX
 * COMMON   0xxx
 * AUTH     1xxx
 * DEVICE   2xxx
 * CUSTOMER 3xxx
 * DEALER   4xxx
 * SUPPORT  5xxx
 * USER     6xxx
 * NOTIF    7xxx
 */

const ERROR_CODES = {
  // ── COMMON ──────────────────────────────────────────────────────────────
  COMMON_0001: { code: 'COMMON_0001', status: 400, key: 'common.validationError' },
  COMMON_0002: { code: 'COMMON_0002', status: 500, key: 'common.internalError' },
  COMMON_0003: { code: 'COMMON_0003', status: 404, key: 'common.notFound' },
  COMMON_0004: { code: 'COMMON_0004', status: 500, key: 'common.databaseError' },
  COMMON_0005: { code: 'COMMON_0005', status: 429, key: 'common.tooManyRequests' },
  COMMON_0006: { code: 'COMMON_0006', status: 400, key: 'common.badRequest' },

  // ── AUTH ────────────────────────────────────────────────────────────────
  AUTH_1001: { code: 'AUTH_1001', status: 401, key: 'auth.invalidCredentials' },
  AUTH_1002: { code: 'AUTH_1002', status: 401, key: 'auth.tokenExpired' },
  AUTH_1003: { code: 'AUTH_1003', status: 401, key: 'auth.tokenInvalid' },
  AUTH_1004: { code: 'AUTH_1004', status: 401, key: 'auth.unauthorized' },
  AUTH_1005: { code: 'AUTH_1005', status: 403, key: 'auth.forbidden' },
  AUTH_1006: { code: 'AUTH_1006', status: 401, key: 'auth.refreshTokenExpired' },
  AUTH_1007: { code: 'AUTH_1007', status: 400, key: 'auth.passwordTooWeak' },
  AUTH_1008: { code: 'AUTH_1008', status: 403, key: 'auth.accountInactive' },

  // ── DEVICE ──────────────────────────────────────────────────────────────
  DEVICE_2001: { code: 'DEVICE_2001', status: 404, key: 'device.notFound' },
  DEVICE_2002: { code: 'DEVICE_2002', status: 409, key: 'device.alreadyExists' },
  DEVICE_2003: { code: 'DEVICE_2003', status: 422, key: 'device.offline' },
  DEVICE_2004: { code: 'DEVICE_2004', status: 502, key: 'device.commandFailed' },
  DEVICE_2005: { code: 'DEVICE_2005', status: 400, key: 'device.invalidCommand' },
  DEVICE_2006: { code: 'DEVICE_2006', status: 422, key: 'device.notAssigned' },

  // ── CUSTOMER ────────────────────────────────────────────────────────────
  CUSTOMER_3001: { code: 'CUSTOMER_3001', status: 404, key: 'customer.notFound' },
  CUSTOMER_3002: { code: 'CUSTOMER_3002', status: 409, key: 'customer.alreadyExists' },
  CUSTOMER_3003: { code: 'CUSTOMER_3003', status: 422, key: 'customer.hasDevices' },

  // ── DEALER ──────────────────────────────────────────────────────────────
  DEALER_4001: { code: 'DEALER_4001', status: 404, key: 'dealer.notFound' },
  DEALER_4002: { code: 'DEALER_4002', status: 409, key: 'dealer.alreadyExists' },
  DEALER_4003: { code: 'DEALER_4003', status: 422, key: 'dealer.hasCustomers' },

  // ── SUPPORT ─────────────────────────────────────────────────────────────
  SUPPORT_5001: { code: 'SUPPORT_5001', status: 404, key: 'support.ticketNotFound' },
  SUPPORT_5002: { code: 'SUPPORT_5002', status: 422, key: 'support.ticketClosed' },
  SUPPORT_5003: { code: 'SUPPORT_5003', status: 403, key: 'support.notOwner' },

  // ── USER ────────────────────────────────────────────────────────────────
  USER_6001: { code: 'USER_6001', status: 404, key: 'user.notFound' },
  USER_6002: { code: 'USER_6002', status: 409, key: 'user.emailExists' },
  USER_6003: { code: 'USER_6003', status: 400, key: 'user.wrongPassword' },
  USER_6004: { code: 'USER_6004', status: 422, key: 'user.cannotDeleteSelf' },

  // ── NOTIFICATION ────────────────────────────────────────────────────────
  NOTIF_7001: { code: 'NOTIF_7001', status: 404, key: 'notification.notFound' },
};

class AppError extends Error {
  constructor(errorCode, details = null) {
    const def = ERROR_CODES[errorCode];
    if (!def) throw new Error(`Unknown error code: ${errorCode}`);
    super(errorCode);
    this.errorCode = def.code;
    this.status = def.status;
    this.key = def.key;
    this.details = details;
  }
}

module.exports = { ERROR_CODES, AppError };
