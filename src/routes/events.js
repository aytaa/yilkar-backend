const express = require('express');
const { streamEvents } = require('../controllers/eventController');

const router = express.Router();

// GET /events/stream — Server-Sent Events live feed (auth via header or ?token=)
router.get('/stream', streamEvents);

module.exports = router;
