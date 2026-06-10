const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const dashboardController = require('./dashboard.controller');

router.use(authMiddleware);
router.get('/', dashboardController.dashboard);

module.exports = router;
