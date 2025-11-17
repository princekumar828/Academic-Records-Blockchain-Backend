const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/departmentController');
const RecordController = require('../controllers/recordController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Department profile routes
router.get('/profile/:departmentId', authenticateToken, requireRole('department', 'admin'), DepartmentController.getDepartmentProfile);
router.get('/all', authenticateToken, requireRole('admin'), DepartmentController.getAllDepartments);
router.post('/create', authenticateToken, requireRole('admin'), DepartmentController.createDepartment);

// Department courses routes
router.get('/:departmentId/courses', authenticateToken, requireRole('department', 'admin'), DepartmentController.getDepartmentCourses);
router.post('/courses/create', authenticateToken, requireRole('department', 'admin'), DepartmentController.createCourseOffering);

// Department students routes
router.get('/:departmentId/students', authenticateToken, requireRole('department', 'admin'), DepartmentController.getStudentsByDepartment);

// Department record management routes
router.post('/records', authenticateToken, requireRole('department', 'admin'), RecordController.createAcademicRecord);
router.get('/records/:departmentId', authenticateToken, requireRole('department', 'admin'), DepartmentController.getRecordsByDepartment);
router.patch('/records/:recordId/status', authenticateToken, requireRole('department', 'admin'), RecordController.approveAcademicRecord);
router.get('/records/single/:recordID', authenticateToken, RecordController.getAcademicRecord);

module.exports = router;
