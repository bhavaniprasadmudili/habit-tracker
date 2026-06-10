const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const analyticsController = require('./analytics.controller');

router.use(authMiddleware);
router.get('/daily', analyticsController.dailyAnalytics);
router.get('/weekly', analyticsController.weeklyAnalytics);
router.get('/monthly', analyticsController.monthlyAnalytics);
router.get('/categories', analyticsController.categoryAnalytics);

module.exports = router;
