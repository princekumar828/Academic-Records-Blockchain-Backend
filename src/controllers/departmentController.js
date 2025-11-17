const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { createUser } = require('../utils/userManager');

class DepartmentController {
    /**
     * Get department profile
     */
    static async getDepartmentProfile(req, res) {
        try {
            let { departmentId } = req.params;
            // Normalize department ID to uppercase
            departmentId = departmentId.toUpperCase();
            
            const userDept = req.user.department ? req.user.department.toUpperCase() : null;
            const role = req.user.role;

            // Department can only view their own profile unless admin
            if (role !== 'admin' && userDept !== departmentId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const walletPath = path.join(__dirname, '../../wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            const identity = await wallet.get('admin');
            if (!identity) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin identity not found in wallet'
                });
            }

            const ccpPath = path.join(__dirname, '../../../', 'organizations', 'peerOrganizations', 'nitwarangal.nitw.edu', 'connection-nitwarangal.json');
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: 'admin',
                discovery: { enabled: true, asLocalhost: true }
            });

            const network = await gateway.getNetwork('academic-records-channel');
            const contract = network.getContract('academic-records');

            const result = await contract.evaluateTransaction('GetDepartment', departmentId);
            const department = JSON.parse(result.toString());

            await gateway.disconnect();

            logger.info(`Department profile retrieved for ${departmentId}`);

            res.status(200).json({
                success: true,
                data: department
            });

        } catch (error) {
            logger.error('Error getting department profile:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get all departments (admin only)
     */
    static async getAllDepartments(req, res) {
        try {
            const role = req.user.role;

            if (role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Admin only.'
                });
            }

            const walletPath = path.join(__dirname, '../../wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            const identity = await wallet.get('admin');
            if (!identity) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin identity not found in wallet'
                });
            }

            const ccpPath = path.join(__dirname, '../../../', 'organizations', 'peerOrganizations', 'nitwarangal.nitw.edu', 'connection-nitwarangal.json');
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: 'admin',
                discovery: { enabled: true, asLocalhost: true }
            });

            const network = await gateway.getNetwork('academic-records-channel');
            const contract = network.getContract('academic-records');

            const result = await contract.evaluateTransaction('GetAllDepartments');
            const departments = JSON.parse(result.toString());

            await gateway.disconnect();

            logger.info('All departments retrieved');

            res.status(200).json({
                success: true,
                data: departments
            });

        } catch (error) {
            logger.error('Error getting all departments:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get courses offered by department
     */
    static async getDepartmentCourses(req, res) {
        try {
            let { departmentId } = req.params;
            // Normalize department ID to uppercase for case-insensitive matching
            departmentId = departmentId.toUpperCase();
            
            const userDept = req.user.department ? req.user.department.toUpperCase() : null;
            const role = req.user.role;

            // Department can only view their own courses unless admin
            if (role !== 'admin' && userDept !== departmentId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const walletPath = path.join(__dirname, '../../wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            const identity = await wallet.get('admin');
            if (!identity) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin identity not found in wallet'
                });
            }

            const ccpPath = path.join(__dirname, '../../../', 'organizations', 'peerOrganizations', 'nitwarangal.nitw.edu', 'connection-nitwarangal.json');
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: 'admin',
                discovery: { enabled: true, asLocalhost: true }
            });

            const network = await gateway.getNetwork('academic-records-channel');
            const contract = network.getContract('academic-records');

            const result = await contract.evaluateTransaction('GetCoursesByDepartment', departmentId);
            const courses = JSON.parse(result.toString());

            await gateway.disconnect();

            logger.info(`Courses retrieved for department ${departmentId}: ${courses.length} courses`);

            res.status(200).json({
                success: true,
                data: courses,
                message: `Found ${courses.length} courses`
            });

        } catch (error) {
            logger.error('Error getting department courses:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get students in department
     */
    static async getStudentsByDepartment(req, res) {
        try {
            let { departmentId } = req.params;
            // Normalize department ID to uppercase for case-insensitive matching
            departmentId = departmentId.toUpperCase();
            
            const userDept = req.user.department ? req.user.department.toUpperCase() : null;
            const role = req.user.role;

            // Department can only view their own students unless admin
            if (role !== 'admin' && userDept !== departmentId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const walletPath = path.join(__dirname, '../../wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            const identity = await wallet.get('admin');
            if (!identity) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin identity not found in wallet'
                });
            }

            const ccpPath = path.join(__dirname, '../../../', 'organizations', 'peerOrganizations', 'nitwarangal.nitw.edu', 'connection-nitwarangal.json');
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: 'admin',
                discovery: { enabled: true, asLocalhost: true }
            });

            const network = await gateway.getNetwork('academic-records-channel');
            const contract = network.getContract('academic-records');

            const result = await contract.evaluateTransaction('GetStudentsByDepartment', departmentId);
            const students = JSON.parse(result.toString());

            await gateway.disconnect();

            logger.info(`Students retrieved for department ${departmentId}: ${students.length} students`);

            res.status(200).json({
                success: true,
                data: students,
                message: `Found ${students.length} students in ${departmentId} department`
            });

        } catch (error) {
            logger.error('Error getting students by department:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Create new department (admin only)
     */
    static async createDepartment(req, res) {
        try {
            const role = req.user.role;

            if (role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Admin only.'
                });
            }

            let { departmentId, departmentName, hod, email, phone } = req.body;
            // Normalize department ID to uppercase
            departmentId = departmentId.toUpperCase();

            const walletPath = path.join(__dirname, '../../wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            const identity = await wallet.get('admin');
            if (!identity) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin identity not found in wallet'
                });
            }

            const ccpPath = path.join(__dirname, '../../../', 'organizations', 'peerOrganizations', 'nitwarangal.nitw.edu', 'connection-nitwarangal.json');
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: 'admin',
                discovery: { enabled: true, asLocalhost: true }
            });

            const network = await gateway.getNetwork('academic-records-channel');
            const contract = network.getContract('academic-records');

            // Step 1: Create department entity on blockchain
            await contract.submitTransaction(
                'CreateDepartment',
                departmentId,
                departmentName,
                hod,
                email,
                phone
            );

            await gateway.disconnect();

            logger.info(`Department ${departmentId} created successfully on blockchain`);

            // Step 2: Create department user account for login
            // Password will be department code + "123" to meet 6 char minimum
            try {
                const departmentPassword = departmentId.length >= 6 ? departmentId : `${departmentId}123`;
                
                const departmentUser = await createUser({
                    username: departmentId,
                    password: departmentPassword, // Password = department code (or code+123 if < 6 chars)
                    email: email,
                    role: 'department',
                    department: departmentId
                });

                logger.info(`Department user account created: ${departmentId} with password: ${departmentPassword}`);

                res.status(201).json({
                    success: true,
                    message: 'Department created successfully (blockchain + user account)',
                    data: {
                        departmentId,
                        departmentName,
                        credentials: {
                            username: departmentId,
                            password: departmentPassword,
                            note: 'Please change password after first login'
                        }
                    }
                });

            } catch (userError) {
                logger.warn(`Department created on blockchain but user account creation failed: ${userError.message}`);
                
                // Return success with warning if blockchain creation succeeded
                res.status(201).json({
                    success: true,
                    message: 'Department created on blockchain. User account creation failed.',
                    warning: userError.message,
                    data: {
                        departmentId,
                        departmentName,
                        note: 'Please create user account manually via /api/auth/register'
                    }
                });
            }

        } catch (error) {
            logger.error('Error creating department:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Create course offering
     */
    static async createCourseOffering(req, res) {
        try {
            const userDept = req.user.department ? req.user.department.toUpperCase() : null;
            const role = req.user.role;
            let { departmentId, courseCode, courseName, credits, semester, academicYear } = req.body;
            // Normalize department ID to uppercase
            departmentId = departmentId.toUpperCase();

            // Department can only create courses for themselves unless admin
            if (role !== 'admin' && userDept !== departmentId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const walletPath = path.join(__dirname, '../../wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            const identity = await wallet.get('admin');
            if (!identity) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin identity not found in wallet'
                });
            }

            const ccpPath = path.join(__dirname, '../../../', 'organizations', 'peerOrganizations', 'nitwarangal.nitw.edu', 'connection-nitwarangal.json');
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: 'admin',
                discovery: { enabled: true, asLocalhost: true }
            });

            const network = await gateway.getNetwork('academic-records-channel');
            const contract = network.getContract('academic-records');

            await contract.submitTransaction(
                'CreateCourseOffering',
                departmentId,
                courseCode,
                courseName,
                credits.toString(),
                semester.toString(),
                academicYear
            );

            await gateway.disconnect();

            logger.info(`Course ${courseCode} created for department ${departmentId}`);

            res.status(201).json({
                success: true,
                message: 'Course offering created successfully'
            });

        } catch (error) {
            logger.error('Error creating course offering:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get academic records created/submitted by department
     */
    static async getRecordsByDepartment(req, res) {
        try {
            let { departmentId } = req.params;
            // Normalize department ID to uppercase
            departmentId = departmentId.toUpperCase();
            
            const userDept = req.user.department ? req.user.department.toUpperCase() : null;
            const role = req.user.role;

            // Department can only view their own records unless admin
            if (role !== 'admin' && userDept !== departmentId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const walletPath = path.join(__dirname, '../../wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            const identity = await wallet.get('admin');
            if (!identity) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin identity not found in wallet'
                });
            }

            const ccpPath = path.join(__dirname, '../../../', 'organizations', 'peerOrganizations', 'nitwarangal.nitw.edu', 'connection-nitwarangal.json');
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: 'admin',
                discovery: { enabled: true, asLocalhost: true }
            });

            const network = await gateway.getNetwork('academic-records-channel');
            const contract = network.getContract('academic-records');

            // Query both pending and approved records
            const pendingResult = await contract.evaluateTransaction('QueryPendingRecords', '', '1000');
            const pendingData = JSON.parse(pendingResult.toString());
            
            // Query approved records
            const approvedResult = await contract.evaluateTransaction('QueryRecordsByStatus', 'APPROVED', '', '1000');
            const approvedData = JSON.parse(approvedResult.toString());
            
            // Combine and filter by department
            const allRecords = [
                ...(pendingData.records || []),
                ...(approvedData.records || [])
            ];
            
            const departmentRecords = allRecords.filter(record => 
                record.department === departmentId
            );

            await gateway.disconnect();

            logger.info(`Records retrieved for department ${departmentId}: ${departmentRecords.length} records`);

            res.status(200).json({
                success: true,
                data: departmentRecords,
                message: `Found ${departmentRecords.length} records`
            });

        } catch (error) {
            logger.error('Error getting records by department:', error);
            
            // Return empty array if no records found
            if (error.message.includes('does not exist') || error.message.includes('not found')) {
                return res.status(200).json({
                    success: true,
                    data: [],
                    message: 'No records found'
                });
            }
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = DepartmentController;
