const https = require('https');
const env = require('../config/env');
const logger = require('../utils/logger');

async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  const payload = JSON.stringify({ messages: [message] });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', (err) => {
      logger.error('Push notification error:', err);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { sendPushNotification };
