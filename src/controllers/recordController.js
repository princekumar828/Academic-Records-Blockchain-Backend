const FabricGateway = require('../fabricGateway');
const logger = require('../utils/logger');

class RecordController {
    // Create academic record
    static async createAcademicRecord(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { recordID, rollNumber, semester, year, department, courses } = req.body;
            const userId = req.user.userId;

            // Validate required fields
            if (!recordID || !rollNumber || !semester || !year || !department || !courses) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: recordID, rollNumber, semester, year, department, courses'
                });
            }

            await gateway.connect(userId);

            // Chaincode signature: CreateAcademicRecord(recordID, rollNumber, semester int, year, department, coursesJSON string)
            await gateway.submitTransaction(
                'CreateAcademicRecord',
                recordID,
                rollNumber,
                semester.toString(),
                year,
                department,
                JSON.stringify(courses)
            );

            logger.info(`Academic record created: ${recordID}`);

            res.status(201).json({
                success: true,
                message: 'Academic record created successfully',
                data: recordID
            });
        } catch (error) {
            logger.error(`Error creating academic record: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get academic record
    static async getAcademicRecord(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { recordID } = req.params;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction('GetAcademicRecord', recordID);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error getting academic record: ${error.message}`);
            res.status(404).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Approve academic record
    static async approveAcademicRecord(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { recordID } = req.params;
            // Always use 'admin' identity for approval operations
            // The chaincode checks the MSP identity, not the JWT role
            const userId = 'admin';

            await gateway.connect(userId);

            const result = await gateway.submitTransaction('ApproveAcademicRecord', recordID);

            logger.info(`Academic record approved: ${recordID}`);

            res.status(200).json({
                success: true,
                message: 'Academic record approved successfully',
                data: result
            });
        } catch (error) {
            logger.error(`Error approving academic record: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get student records
    static async getStudentRecords(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { rollNumber } = req.params;
            const userId = req.user.userId;

            await gateway.connect(userId);

            // Use GetStudentHistory from chaincode
            const result = await gateway.evaluateTransaction('GetStudentHistory', rollNumber);

            res.status(200).json({
                success: true,
                data: result || []
            });
        } catch (error) {
            logger.error(`Error getting student records: ${error.message}`);
            
            // Return empty array if student has no records
            if (error.message.includes('does not exist') || error.message.includes('not found')) {
                return res.status(200).json({
                    success: true,
                    data: []
                });
            }
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get records by semester
    static async getRecordsBySemester(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { semester } = req.params;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction('GetRecordsBySemester', semester);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error getting records by semester: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Query pending records
    static async queryPendingRecords(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const userId = req.user.userId;
            const { bookmark = '', pageSize = 100 } = req.query;

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction(
                'QueryPendingRecords',
                bookmark,
                pageSize.toString()
            );

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error querying pending records: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get records by department
    static async getRecordsByDepartment(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { department } = req.params;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction('GetRecordsByDepartment', department);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error getting records by department: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }
}

module.exports = RecordController;
