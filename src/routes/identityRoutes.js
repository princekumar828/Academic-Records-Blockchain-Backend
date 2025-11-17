const express = require('express');
const router = express.Router();
const IdentityController = require('../controllers/identityController');

// Enroll admin
router.post('/admin/enroll', IdentityController.enrollAdmin);

// Register user
router.post('/register', IdentityController.registerUser);

// Get user identity
router.get('/:userId', IdentityController.getUser);

// List all users
router.get('/', IdentityController.listUsers);

// Delete user
router.delete('/:userId', IdentityController.deleteUser);

module.exports = router;
