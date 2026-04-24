const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

async function connectMongo() {
  await mongoose.connect(env.MONGO_URI);
  logger.info('MongoDB connected');
}

module.exports = { mongoose, connectMongo };
