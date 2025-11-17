const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class FacultyController {
    /**
     * Get faculty profile by ID
     */
    static async getFacultyProfile(req, res) {
        try {
            const { facultyId } = req.params;
            const userId = req.user.userId;
            const role = req.user.role;

            // Faculty can only view their own profile unless admin
            if (role !== 'admin' && userId !== facultyId) {
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

            // Get faculty details from blockchain
            const result = await contract.evaluateTransaction('GetFaculty', facultyId);
            const faculty = JSON.parse(result.toString());

            await gateway.disconnect();

            logger.info(`Faculty profile retrieved for ${facultyId}`);

            res.status(200).json({
                success: true,
                data: faculty
            });

        } catch (error) {
            logger.error('Error getting faculty profile:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get all faculty (admin only)
     */
    static async getAllFaculty(req, res) {
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

            const result = await contract.evaluateTransaction('GetAllFaculty');
            const faculty = JSON.parse(result.toString());

            await gateway.disconnect();

            logger.info('All faculty retrieved');

            res.status(200).json({
                success: true,
                data: faculty
            });

        } catch (error) {
            logger.error('Error getting all faculty:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get courses assigned to faculty
     */
    static async getFacultyCourses(req, res) {
        try {
            const { facultyId } = req.params;
            const userId = req.user.userId;
            const role = req.user.role;

            // Faculty can only view their own courses unless admin
            if (role !== 'admin' && userId !== facultyId) {
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

            // TODO: Implement GetCoursesByFaculty in chaincode
            // For now, return empty array as the chaincode doesn't have this function yet
            const courses = [];

            await gateway.disconnect();

            logger.info(`Courses retrieved for faculty ${facultyId}: ${courses.length} courses`);

            res.status(200).json({
                success: true,
                data: courses,
                message: 'No courses assigned yet'
            });

        } catch (error) {
            logger.error('Error getting faculty courses:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get students enrolled in faculty's courses (by department)
     */
    static async getStudentsByFaculty(req, res) {
        try {
            const { facultyId } = req.params;
            const userId = req.user.userId;
            const role = req.user.role;

            // Faculty can only view their own students unless admin
            if (role !== 'admin' && role !== 'registrar' && userId !== facultyId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Get faculty's department from JWT token
            const facultyDepartment = req.user.department;
            if (!facultyDepartment) {
                return res.status(400).json({
                    success: false,
                    message: 'Faculty department not found in token'
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

            // Get students by faculty department from chaincode
            const result = await contract.evaluateTransaction('GetStudentsByFaculty', facultyId, facultyDepartment);
            const students = JSON.parse(result.toString());

            await gateway.disconnect();

            logger.info(`Students retrieved for faculty ${facultyId} in department ${facultyDepartment}: ${students.length} students`);

            res.status(200).json({
                success: true,
                data: students,
                message: `Found ${students.length} students in ${facultyDepartment} department`
            });

        } catch (error) {
            logger.error('Error getting students by faculty:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Update faculty profile
     */
    static async updateFacultyProfile(req, res) {
        try {
            const { facultyId } = req.params;
            const userId = req.user.userId;
            const role = req.user.role;
            const updateData = req.body;

            // Faculty can only update their own profile unless admin
            if (role !== 'admin' && userId !== facultyId) {
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

            // Update faculty in blockchain
            await contract.submitTransaction(
                'UpdateFaculty',
                facultyId,
                JSON.stringify(updateData)
            );

            await gateway.disconnect();

            logger.info(`Faculty profile updated for ${facultyId}`);

            res.status(200).json({
                success: true,
                message: 'Faculty profile updated successfully'
            });

        } catch (error) {
            logger.error('Error updating faculty profile:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get academic records created/submitted by faculty
     */
    static async getRecordsByFaculty(req, res) {
        try {
            const { facultyId } = req.params;
            const userId = req.user.userId;
            const role = req.user.role;

            // Faculty can only view their own records unless admin/registrar
            if (role !== 'admin' && role !== 'registrar' && userId !== facultyId) {
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

            // Query records by faculty - using GetAllAcademicRecords and filter
            // Since we don't have a specific GetRecordsByFaculty chaincode function
            const result = await contract.evaluateTransaction('GetAllAcademicRecords');
            const allRecords = JSON.parse(result.toString());

            // Filter records by submittedBy field
            const facultyRecords = allRecords.filter(record => 
                record.submittedBy === facultyId || 
                record.submittedBy === req.user.username
            );

            await gateway.disconnect();

            logger.info(`Records retrieved for faculty ${facultyId}: ${facultyRecords.length} records`);

            res.status(200).json({
                success: true,
                data: facultyRecords,
                message: `Found ${facultyRecords.length} records`
            });

        } catch (error) {
            logger.error('Error getting records by faculty:', error);
            
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

module.exports = FacultyController;
