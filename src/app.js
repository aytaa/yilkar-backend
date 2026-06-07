require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const logger = require('./utils/logger');
const { connectPostgres } = require('./config/postgres');
const { connectMongo } = require('./config/mongo');
const { connectRedis } = require('./config/redis');
const { connectRegistryRedis } = require('./config/redisRegistry');
const { connect: connectMqtt, startHeartbeatWatcher } = require('./services/mqttService');
const { syncWhitelist } = require('./services/registrySync');
const { i18next, middleware: i18nMiddleware } = require('./config/i18n');
const { errorHandler } = require('./middleware/errorHandler');
const { runSeed } = require('./config/seed');

require('./models/postgres/index');

const app = express();

app.set('trust proxy', 1);

// Security
app.use(helmet());
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-App-Name'],
}));
app.use(compression());

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, errorCode: 'COMMON_0005', message: 'Too many requests' },
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
morgan.token('x-app-name', (req) => req.headers['x-app-name'] || '-');
// Redact the SSE ?token= query param so access tokens never land in logs
morgan.token('url-safe', (req) => (req.originalUrl || req.url || '').replace(/([?&]token=)[^&]+/i, '$1REDACTED'));
const logFormat = ':remote-addr - - [:date[clf]] ":method :url-safe HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :x-app-name';
app.use(morgan(logFormat, { stream: { write: (msg) => logger.info(msg.trim()) } }));

// i18n
app.use(i18nMiddleware.handle(i18next));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
const prefix = env.API_PREFIX;
app.use(`${prefix}/auth`, require('./routes/auth'));
app.use(`${prefix}/devices`, require('./routes/devices'));
app.use(`${prefix}/customers`, require('./routes/customers'));
app.use(`${prefix}/dealers`, require('./routes/dealers'));
app.use(`${prefix}/users`, require('./routes/users'));
app.use(`${prefix}/support`, require('./routes/support'));
app.use(`${prefix}/notifications`, require('./routes/notifications'));
app.use(`${prefix}/audit-logs`, require('./routes/auditLogs'));
app.use(`${prefix}/dashboard`, require('./routes/dashboard'));
app.use(`${prefix}/mqtt/registry`, require('./routes/mqttRegistry'));
app.use(`${prefix}/events`, require('./routes/events'));

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, errorCode: 'COMMON_0003', message: 'Not found' });
});

// Global error handler
app.use(errorHandler);

async function start() {
  try {
    await connectPostgres();
    await runSeed();
    await connectMongo();
    await connectRedis();
    await connectRegistryRedis();
    await syncWhitelist();
    await connectMqtt();
    startHeartbeatWatcher();

    app.listen(env.PORT, () => {
      logger.info(`Yilkar Backend running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`API: http://localhost:${env.PORT}${env.API_PREFIX}`);
    });
  } catch (err) {
    logger.error('Startup failed:', err);
    process.exit(1);
  }
}

start();
