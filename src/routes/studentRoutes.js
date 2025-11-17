const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/studentController');
const { authenticateToken, requireRole, enforceDepartmentAccess } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Create student (Admin only)
router.post('/', requireRole('admin'), StudentController.createStudent);

// Get all students (Admin and Faculty)
router.get('/all', requireRole('admin', 'faculty'), StudentController.getAllStudents);

// Get student by roll number (All authenticated users)
router.get('/:rollNumber', StudentController.getStudent);

// Get student private details (Admin only)
router.get('/:rollNumber/private', requireRole('admin'), StudentController.getStudentPrivateDetails);

// Update student status (Admin only)
router.patch('/:rollNumber/status', requireRole('admin'), StudentController.updateStudentStatus);

// Update student department (Admin only)
router.patch('/:rollNumber/department', requireRole('admin'), StudentController.updateStudentDepartment);

// Update student contact info (Admin and Faculty with department check)
router.patch('/:rollNumber/contact', requireRole('admin', 'faculty'), enforceDepartmentAccess, StudentController.updateStudentContactInfo);

// Get students by department (Admin and Faculty)
router.get('/department/:department', requireRole('admin', 'faculty'), StudentController.getStudentsByDepartment);

// Get students by status (Admin and Faculty)
router.get('/status/:status', requireRole('admin', 'faculty'), StudentController.getStudentsByStatus);

// Get students by enrollment year (Admin and Faculty)
router.get('/year/:year', requireRole('admin', 'faculty'), StudentController.getStudentsByYear);

// Get student CGPA (All authenticated users)
router.get('/:rollNumber/cgpa', StudentController.getStudentCGPA);

module.exports = router;
