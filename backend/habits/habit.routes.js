const express = require('express');
const router = express.Router();
const habitController = require('./habit.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.get('/', habitController.getHabits);
router.post('/', habitController.createHabit);
router.put('/:id', habitController.updateHabit);
router.delete('/:id', habitController.deleteHabit);
router.post('/:id/toggle', habitController.toggleHabitProgress);

module.exports = router;
