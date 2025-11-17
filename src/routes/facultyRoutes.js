const express = require('express');
const router = express.Router();
const FacultyController = require('../controllers/facultyController');
const RecordController = require('../controllers/recordController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Faculty profile routes
router.get('/profile/:facultyId', authenticateToken, requireRole('faculty', 'admin'), FacultyController.getFacultyProfile);
router.patch('/profile/:facultyId', authenticateToken, requireRole('faculty', 'admin'), FacultyController.updateFacultyProfile);
router.get('/all', authenticateToken, requireRole('admin'), FacultyController.getAllFaculty);

// Faculty courses routes
router.get('/:facultyId/courses', authenticateToken, requireRole('faculty', 'admin'), FacultyController.getFacultyCourses);
router.get('/:facultyId/students', authenticateToken, requireRole('faculty', 'admin', 'registrar'), FacultyController.getStudentsByFaculty);

// Faculty record management routes
router.post('/records', authenticateToken, requireRole('faculty', 'admin'), RecordController.createAcademicRecord);
router.get('/records/:facultyId', authenticateToken, requireRole('faculty', 'admin', 'registrar'), FacultyController.getRecordsByFaculty);
router.patch('/records/:recordId/status', authenticateToken, requireRole('faculty', 'admin'), RecordController.approveAcademicRecord);
router.get('/records/single/:recordID', authenticateToken, RecordController.getAcademicRecord);

module.exports = router;
