const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/statsController');
const { authenticateToken } = require('../middleware/auth');

// Get dashboard statistics (authenticated users)
router.get('/dashboard', authenticateToken, StatsController.getDashboardStats);

module.exports = router;
