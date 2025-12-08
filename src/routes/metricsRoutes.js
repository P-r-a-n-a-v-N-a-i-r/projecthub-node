import express from 'express';
import { getMetrics } from '../controllers/metricsController.js';

const router = express.Router();

// GET /api/metrics
router.get('/', getMetrics);

export default router;
