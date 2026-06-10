const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');

router.post('/login', adminController.login);
router.use(authMiddleware, adminMiddleware);
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.get('/analytics', adminController.analytics);
router.get('/activity', adminController.activity);
router.put('/user/:id/status', adminController.updateUserStatus);
router.delete('/user/:id', adminController.deleteUser);

module.exports = router;
