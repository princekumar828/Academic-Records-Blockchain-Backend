const express = require('express');
const router = express.Router();
const RecordController = require('../controllers/recordController');
const { authenticateToken, requireRole, enforceDepartmentAccess } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Create academic record (Admin and Faculty with department check)
router.post('/', requireRole('admin', 'faculty'), enforceDepartmentAccess, RecordController.createAcademicRecord);

// Get academic record (All authenticated users)
router.get('/:recordID', RecordController.getAcademicRecord);

// Approve academic record (Admin only)
router.post('/:recordID/approve', requireRole('admin'), RecordController.approveAcademicRecord);

// Get student records (All authenticated users)
router.get('/student/:rollNumber', RecordController.getStudentRecords);

// Get records by semester (Admin and Faculty)
router.get('/semester/:semester', requireRole('admin', 'faculty'), RecordController.getRecordsBySemester);

// Query pending records (Admin and Faculty)
router.get('/pending/all', requireRole('admin', 'faculty'), RecordController.queryPendingRecords);

// Get records by department (Admin and Faculty)
router.get('/department/:department', requireRole('admin', 'faculty'), RecordController.getRecordsByDepartment);

module.exports = router;
