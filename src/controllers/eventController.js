const { verifyAccess } = require('../utils/jwt');
const { AppError } = require('../errors/codes');
const { User } = require('../models/postgres/index');
const eventStream = require('../services/eventStream');
const logger = require('../utils/logger');

// SSE auth accepts the token from the Authorization header OR a ?token= query
// param, because the browser EventSource API cannot set custom headers.
async function authForSse(req) {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) token = header.split(' ')[1];
  else if (req.query.token) token = req.query.token;

  if (!token) throw new AppError('AUTH_1004');

  const payload = verifyAccess(token);
  const user = await User.findByPk(payload.id, {
    attributes: ['id', 'name', 'role', 'status', 'dealer_id', 'customer_id'],
  });
  if (!user) throw new AppError('AUTH_1004');
  if (user.status !== 'active') throw new AppError('AUTH_1008');
  return user;
}

async function streamEvents(req, res, next) {
  let user;
  try {
    user = await authForSse(req);
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new AppError('AUTH_1002'));
    if (err.name === 'JsonWebTokenError') return next(new AppError('AUTH_1003'));
    return next(err);
  }

  await eventStream.init();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // disable proxy buffering (nginx)
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

  const removeClient = eventStream.addClient(res, user);

  // Heartbeat keeps the connection alive through proxies/load balancers.
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* closed */ }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient();
  });
}

module.exports = { streamEvents };
