const FabricGateway = require('../fabricGateway');
const logger = require('../utils/logger');

class StatsController {
    /**
     * Get dashboard statistics
     * Returns counts for: total students, active students, pending records, certificates issued
     */
    static async getDashboardStats(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const userId = req.user.userId;
            await gateway.connect(userId);

            // Initialize stats
            let totalStudents = 0;
            let activeStudents = 0;
            let pendingRecordsCount = 0;
            let certificatesIssued = 0;

            // Get all students to count total and active
            try {
                const allStudentsResult = await gateway.evaluateTransaction('GetAllStudents');
                const students = allStudentsResult || [];
                
                totalStudents = students.length;
                activeStudents = students.filter(s => s.status === 'ACTIVE').length;

                // Count certificates for each student (optimized with error handling)
                const certPromises = students.map(async (student) => {
                    try {
                        const certs = await gateway.evaluateTransaction('GetCertificatesByStudent', student.rollNumber || student.studentId);
                        return Array.isArray(certs) ? certs.length : 0;
                    } catch (error) {
                        // Student has no certificates
                        return 0;
                    }
                });

                const certCounts = await Promise.all(certPromises);
                certificatesIssued = certCounts.reduce((sum, count) => sum + count, 0);
            } catch (error) {
                logger.warn(`Error fetching students: ${error.message}`);
                // Continue with 0 counts if students fetch fails
            }

            // Get pending records (DRAFT + SUBMITTED status)
            try {
                const pendingResult = await gateway.evaluateTransaction('QueryPendingRecords', '', '100');
                const pendingData = pendingResult || {};
                const pendingRecords = pendingData.records || [];
                pendingRecordsCount = pendingRecords.length;
            } catch (error) {
                logger.warn(`Error fetching pending records: ${error.message}`);
                // Continue with 0 if pending records fetch fails
            }

            const stats = {
                totalStudents,
                activeStudents,
                pendingRecords: pendingRecordsCount,
                certificatesIssued
            };

            logger.info(`Dashboard stats: ${JSON.stringify(stats)}`);

            res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error(`Error getting dashboard stats: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }
}

module.exports = StatsController;
