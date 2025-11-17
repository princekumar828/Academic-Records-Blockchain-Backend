const FabricGateway = require('../fabricGateway');
const logger = require('../utils/logger');
const { createStudentUser } = require('../scripts/createStudentFromBlockchain');

class StudentController {
    // Create a new student
    static async createStudent(req, res) {
        const gateway = new FabricGateway();
        
        try {
            // Support both formats: legacy (firstName/lastName) and new (name)
            let { rollNumber, name, department, enrollmentYear, email, category, admissionCategory } = req.body;
            const { firstName, lastName, status, contactNumber, address } = req.body;
            
            // Construct name if firstName and lastName provided (legacy format)
            if (!name && firstName) {
                name = lastName ? `${firstName} ${lastName}` : firstName;
            }
            
            // Use admissionCategory, or fall back to status, or default to 'GENERAL'
            const finalCategory = admissionCategory || status || category || 'GENERAL';
            
            // Validate required fields
            if (!rollNumber || !name || !department || !enrollmentYear || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: rollNumber, name (or firstName), department, enrollmentYear, email'
                });
            }

            // Connect as admin or authorized user
            const userId = req.user.userId;
            await gateway.connect(userId);

            // Prepare transient data for private data collection
            // Support both formats: privateData object or direct fields
            const privateData = req.body.privateData || {};
            const transientData = {
                aadhaarHash: privateData.aadhaarHash || 'HASH-' + rollNumber, // Default if not provided
                phone: privateData.phone || contactNumber || '0000000000', // Use contactNumber if provided
                personalEmail: privateData.personalEmail || email // Use email as fallback
            };

            // Submit transaction to blockchain
            const result = await gateway.submitTransactionWithTransient(
                'CreateStudent',
                transientData,
                rollNumber,
                name,
                department,
                enrollmentYear.toString(),
                email,
                finalCategory
            );

            logger.info(`Student created in blockchain: ${rollNumber}`);

            // Automatically create authentication account for the student
            // Default password is roll number (student must change after first login)
            try {
                const authResult = await createStudentUser({
                    rollNumber,
                    email,
                    name,
                    department
                });

                if (authResult.success) {
                    logger.info(`Authentication account created for student: ${rollNumber}`);
                    logger.info(`Default password: ${rollNumber} (student must change after first login)`);
                }
            } catch (authError) {
                // Log error but don't fail the request - blockchain student is created
                logger.warn(`Failed to create authentication account for ${rollNumber}: ${authError.message}`);
                logger.warn(`Admin can manually create account using createStudentFromBlockchain.js script`);
            }

            res.status(201).json({
                success: true,
                message: 'Student created successfully. Default login password is the roll number.',
                data: result,
                authInfo: {
                    username: rollNumber,
                    defaultPassword: rollNumber,
                    note: 'Student must change password after first login'
                }
            });
        } catch (error) {
            logger.error(`Error creating student: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get student by roll number
    static async getStudent(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { rollNumber } = req.params;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction('GetStudent', rollNumber);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error getting student: ${error.message}`);
            res.status(404).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get student private details
    static async getStudentPrivateDetails(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { rollNumber } = req.params;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction('GetStudentPrivateDetails', rollNumber);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error getting student private details: ${error.message}`);
            res.status(403).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Update student status
    static async updateStudentStatus(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { rollNumber } = req.params;
            const { newStatus, reason } = req.body;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.submitTransaction(
                'UpdateStudentStatus',
                rollNumber,
                newStatus,
                reason || ''
            );

            logger.info(`Student status updated: ${rollNumber} -> ${newStatus}`);

            res.status(200).json({
                success: true,
                message: 'Student status updated successfully',
                data: result
            });
        } catch (error) {
            logger.error(`Error updating student status: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Update student department
    static async updateStudentDepartment(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { rollNumber } = req.params;
            const { newDepartment } = req.body;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.submitTransaction(
                'UpdateStudentDepartment',
                rollNumber,
                newDepartment
            );

            logger.info(`Student department updated: ${rollNumber} -> ${newDepartment}`);

            res.status(200).json({
                success: true,
                message: 'Student department updated successfully',
                data: result
            });
        } catch (error) {
            logger.error(`Error updating student department: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Update student contact info
    static async updateStudentContactInfo(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { rollNumber } = req.params;
            const { phone, personalEmail } = req.body;
            const userId = req.user.userId;

            await gateway.connect(userId);

            // Prepare transient data
            const transientData = {};
            if (phone) transientData.phone = phone;
            if (personalEmail) transientData.personalEmail = personalEmail;

            const result = await gateway.submitTransactionWithTransient(
                'UpdateStudentContactInfo',
                transientData,
                rollNumber
            );

            logger.info(`Student contact info updated: ${rollNumber}`);

            res.status(200).json({
                success: true,
                message: 'Student contact info updated successfully',
                data: result
            });
        } catch (error) {
            logger.error(`Error updating student contact info: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get students by department
    static async getStudentsByDepartment(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { department } = req.params;
            const { bookmark = '', pageSize = 50 } = req.query;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction(
                'QueryStudentsByDepartment',
                department,
                bookmark,
                pageSize.toString()
            );

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error getting students by department: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get students by status
    static async getStudentsByStatus(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { status } = req.params;
            const { bookmark = '', pageSize = 50 } = req.query;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction(
                'QueryStudentsByStatus',
                status,
                bookmark,
                pageSize.toString()
            );

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error getting students by status: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get student CGPA
    static async getStudentCGPA(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { rollNumber } = req.params;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction('GetStudentCGPA', rollNumber);

            res.status(200).json({
                success: true,
                data: { rollNumber, cgpa: result }
            });
        } catch (error) {
            logger.error(`Error getting student CGPA: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get students by enrollment year
    static async getStudentsByYear(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { year } = req.params;
            const { bookmark = '', pageSize = 50 } = req.query;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction(
                'QueryStudentsByYear',
                year,
                bookmark,
                pageSize.toString()
            );

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error getting students by year: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get all students
    static async getAllStudents(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction('GetAllStudents');

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error getting all students: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }
}

module.exports = StudentController;
