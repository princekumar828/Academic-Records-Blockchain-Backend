const FabricGateway = require('../fabricGateway');
const logger = require('../utils/logger');

class CertificateController {
    // Issue certificate
    static async issueCertificate(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { certificateID, studentID, certType, pdfBase64, ipfsHash } = req.body;
            const userId = req.user.userId;

            // Validate required fields
            if (!certificateID || !studentID || !certType || !pdfBase64) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: certificateID, studentID, certType, pdfBase64'
                });
            }

            await gateway.connect(userId);

            // Chaincode signature: IssueCertificate(certificateID, studentID, certType, pdfBase64, ipfsHash string)
            await gateway.submitTransaction(
                'IssueCertificate',
                certificateID,
                studentID,
                certType,
                pdfBase64,
                ipfsHash || ''
            );

            logger.info(`Certificate issued: ${certificateID}`);

            res.status(201).json({
                success: true,
                message: 'Certificate issued successfully',
                data: certificateID
            });
        } catch (error) {
            logger.error(`Error issuing certificate: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get certificate
    static async getCertificate(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { certificateID } = req.params;
            // Use admin for anonymous access, or authenticated user if available
            const userId = req.user ? req.user.userId : 'admin';

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction('GetCertificate', certificateID);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error getting certificate: ${error.message}`);
            res.status(404).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Verify certificate
    static async verifyCertificate(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { certificateID, pdfHash } = req.body;
            // Use admin for anonymous verification, or authenticated user if available
            const userId = req.user ? req.user.userId : 'admin';

            await gateway.connect(userId);

            const result = await gateway.evaluateTransaction(
                'VerifyCertificate',
                certificateID,
                pdfHash
            );

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error verifying certificate: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Get student certificates
    static async getStudentCertificates(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { studentID } = req.params;
            const userId = req.user.userId;

            await gateway.connect(userId);

            // Call the correct chaincode function: GetCertificatesByStudent
            const result = await gateway.evaluateTransaction('GetCertificatesByStudent', studentID);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error(`Error getting student certificates: ${error.message}`);
            
            // If no certificates found, return empty array instead of error
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

    // Revoke certificate
    static async revokeCertificate(req, res) {
        const gateway = new FabricGateway();
        
        try {
            const { certificateID } = req.params;
            const { reason } = req.body;
            const userId = req.user.userId;

            await gateway.connect(userId);

            const result = await gateway.submitTransaction(
                'RevokeCertificate',
                certificateID,
                reason || ''
            );

            logger.info(`Certificate revoked: ${certificateID}`);

            res.status(200).json({
                success: true,
                message: 'Certificate revoked successfully',
                data: result
            });
        } catch (error) {
            logger.error(`Error revoking certificate: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        } finally {
            await gateway.disconnect();
        }
    }

    // Request certificate (Student)
    static async requestCertificate(req, res) {
        try {
            const { certificateType, purpose, additionalDetails } = req.body;
            const userId = req.user.userId;
            const username = req.user.username;
            const role = req.user.role;

            // Validate required fields
            if (!certificateType || !purpose) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: certificateType, purpose'
                });
            }

            // Only students can request certificates
            if (role !== 'student') {
                return res.status(403).json({
                    success: false,
                    message: 'Only students can request certificates'
                });
            }

            // Create certificate request object
            const certificateRequest = {
                requestId: `REQ-${Date.now()}`,
                studentId: username, // Roll number
                certificateType,
                purpose,
                additionalDetails: additionalDetails || '',
                requestDate: new Date().toISOString(),
                status: 'PENDING',
                userId
            };

            // Store in database/file (for now, we'll log it)
            // In production, store in a database
            const fs = require('fs');
            const path = require('path');
            const requestsFile = path.join(__dirname, '../../data/certificate-requests.json');

            // Read existing requests
            let requests = [];
            if (fs.existsSync(requestsFile)) {
                const data = fs.readFileSync(requestsFile, 'utf8');
                requests = JSON.parse(data);
            }

            // Add new request
            requests.push(certificateRequest);

            // Save back to file
            fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2));

            logger.info(`Certificate request created: ${certificateRequest.requestId} for student ${username}`);

            res.status(201).json({
                success: true,
                message: 'Certificate request submitted successfully',
                data: certificateRequest
            });
        } catch (error) {
            logger.error(`Error requesting certificate: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get certificate requests
    static async getCertificateRequests(req, res) {
        try {
            const role = req.user.role;
            const username = req.user.username;

            const fs = require('fs');
            const path = require('path');
            const requestsFile = path.join(__dirname, '../../data/certificate-requests.json');

            // Read requests
            let requests = [];
            if (fs.existsSync(requestsFile)) {
                const data = fs.readFileSync(requestsFile, 'utf8');
                requests = JSON.parse(data);
            }

            // Filter based on role
            if (role === 'student') {
                // Students can only see their own requests
                requests = requests.filter(req => req.studentId === username);
            }
            // Admin and faculty can see all requests

            res.status(200).json({
                success: true,
                data: requests
            });
        } catch (error) {
            logger.error(`Error getting certificate requests: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Update certificate request status
    static async updateCertificateRequestStatus(req, res) {
        try {
            const { requestId } = req.params;
            const { status, processedDate, processedBy, certificateId } = req.body;
            const role = req.user.role;

            // Only admin and faculty can update request status
            if (role !== 'admin' && role !== 'faculty') {
                return res.status(403).json({
                    success: false,
                    message: 'Only admin and faculty can update certificate requests'
                });
            }

            const fs = require('fs');
            const path = require('path');
            const requestsFile = path.join(__dirname, '../../data/certificate-requests.json');

            // Read requests
            let requests = [];
            if (fs.existsSync(requestsFile)) {
                const data = fs.readFileSync(requestsFile, 'utf8');
                requests = JSON.parse(data);
            }

            // Find and update the request
            const requestIndex = requests.findIndex(r => r.requestId === requestId);
            if (requestIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Certificate request not found'
                });
            }

            requests[requestIndex].status = status;
            requests[requestIndex].processedDate = processedDate || new Date().toISOString();
            requests[requestIndex].processedBy = processedBy || req.user.username;
            
            // Store the blockchain certificate ID if provided (when approved)
            if (certificateId) {
                requests[requestIndex].certificateId = certificateId;
            }

            // Save back to file
            fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2));

            logger.info(`Certificate request ${requestId} updated to ${status} by ${req.user.username}`);

            res.status(200).json({
                success: true,
                message: 'Certificate request updated successfully',
                data: requests[requestIndex]
            });
        } catch (error) {
            logger.error(`Error updating certificate request: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = CertificateController;
