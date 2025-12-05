const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

// GET /api/metrics
router.get('/', metricsController.getMetrics);

module.exports = router;
