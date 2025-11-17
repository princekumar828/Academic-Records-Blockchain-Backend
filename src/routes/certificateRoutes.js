const express = require('express');
const router = express.Router();
const CertificateController = require('../controllers/certificateController');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

// Request certificate (Student)
router.post('/request', authenticateToken, requireRole('student'), CertificateController.requestCertificate);

// Get certificate requests (Admin/Faculty to view all, Students to view their own)
router.get('/requests', authenticateToken, CertificateController.getCertificateRequests);

// Update certificate request status (Admin/Faculty only)
router.put('/requests/:requestId', authenticateToken, requireRole('admin', 'faculty'), CertificateController.updateCertificateRequestStatus);

// Issue certificate (Admin only)
router.post('/', authenticateToken, requireRole('admin'), CertificateController.issueCertificate);

// Get certificate (All authenticated users, or anonymous for verification)
router.get('/:certificateID', optionalAuth, CertificateController.getCertificate);

// Verify certificate (Public endpoint - no auth required for external verifiers)
router.post('/verify', optionalAuth, CertificateController.verifyCertificate);

// Get student certificates (Admin, Faculty, and the student themselves)
router.get('/student/:studentID', authenticateToken, CertificateController.getStudentCertificates);

// Revoke certificate (Admin only)
router.post('/:certificateID/revoke', authenticateToken, requireRole('admin'), CertificateController.revokeCertificate);

module.exports = router;
