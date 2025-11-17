const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Authentication Routes
 */

// Public routes (no authentication required)
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/change-password', authenticateToken, authController.changePasswordEndpoint);

module.exports = router;
