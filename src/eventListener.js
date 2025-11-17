const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

class EventListener {
    constructor(network, contract) {
        this.network = network;
        this.contract = contract;
        this.listeners = [];
        this.checkpointFile = path.join(__dirname, '../checkpoints/checkpoint.json');
        this.isListening = false;
    }

    async startListening() {
        if (this.isListening) {
            logger.warn('Event listener is already running');
            return;
        }

        try {
            // Ensure checkpoint directory exists
            const checkpointDir = path.dirname(this.checkpointFile);
            if (!fs.existsSync(checkpointDir)) {
                fs.mkdirSync(checkpointDir, { recursive: true });
            }

            logger.info('Starting chaincode event listeners...');

            // Listen for StudentCreated events
            await this.listenForEvent('StudentCreated', (event) => {
                this.handleStudentCreated(event);
            });

            // Listen for StudentUpdated events
            await this.listenForEvent('StudentUpdated', (event) => {
                this.handleStudentUpdated(event);
            });

            // Listen for RecordCreated events
            await this.listenForEvent('RecordCreated', (event) => {
                this.handleRecordCreated(event);
            });

            // Listen for RecordApproved events
            await this.listenForEvent('RecordApproved', (event) => {
                this.handleRecordApproved(event);
            });

            // Listen for CertificateIssued events
            await this.listenForEvent('CertificateIssued', (event) => {
                this.handleCertificateIssued(event);
            });

            // Listen for StudentStatusChanged events
            await this.listenForEvent('StudentStatusChanged', (event) => {
                this.handleStudentStatusChanged(event);
            });

            // Listen for StudentDepartmentChanged events
            await this.listenForEvent('StudentDepartmentChanged', (event) => {
                this.handleStudentDepartmentChanged(event);
            });

            // Listen for CertificateRevoked events
            await this.listenForEvent('CertificateRevoked', (event) => {
                this.handleCertificateRevoked(event);
            });

            this.isListening = true;
            logger.info('All event listeners started successfully');
        } catch (error) {
            logger.error(`Failed to start event listeners: ${error.message}`);
            throw error;
        }
    }

    async listenForEvent(eventName, callback) {
        try {
            const listener = await this.contract.addContractListener(
                async (event) => {
                    if (event.eventName === eventName) {
                        logger.info(`Received event: ${eventName}`);
                        
                        try {
                            const payload = JSON.parse(event.payload.toString());
                            callback({
                                eventName: eventName,
                                transactionId: event.transactionId,
                                blockNumber: event.blockNumber,
                                payload: payload,
                                timestamp: new Date().toISOString()
                            });

                            // Save checkpoint
                            this.saveCheckpoint(event.blockNumber, event.transactionId);
                        } catch (err) {
                            logger.error(`Error processing ${eventName} event: ${err.message}`);
                        }
                    }
                },
                {
                    type: 'contract',
                    startBlock: await this.getLastCheckpoint()
                }
            );

            this.listeners.push({ eventName, listener });
            logger.info(`Listening for ${eventName} events`);
        } catch (error) {
            logger.error(`Failed to listen for ${eventName}: ${error.message}`);
            throw error;
        }
    }

    handleStudentCreated(event) {
        logger.info('StudentCreated Event:', {
            rollNumber: event.payload.rollNumber,
            name: event.payload.name,
            department: event.payload.department,
            enrollmentYear: event.payload.enrollmentYear,
            transactionId: event.transactionId,
            blockNumber: event.blockNumber
        });

        // Here you can add additional logic:
        // - Send notification to admin
        // - Update external database
        // - Trigger webhooks
        // - Send email to student
    }

    handleStudentUpdated(event) {
        logger.info('StudentUpdated Event:', {
            rollNumber: event.payload.rollNumber,
            field: event.payload.field,
            oldValue: event.payload.oldValue,
            newValue: event.payload.newValue,
            transactionId: event.transactionId,
            blockNumber: event.blockNumber
        });

        // Additional logic for student updates
    }

    handleRecordCreated(event) {
        logger.info('RecordCreated Event:', {
            recordID: event.payload.recordID,
            studentID: event.payload.studentID,
            semester: event.payload.semester,
            department: event.payload.department,
            transactionId: event.transactionId,
            blockNumber: event.blockNumber
        });

        // Additional logic for record creation
        // - Notify department head
        // - Update analytics dashboard
    }

    handleRecordApproved(event) {
        logger.info('RecordApproved Event:', {
            recordID: event.payload.recordID,
            studentID: event.payload.studentID,
            semester: event.payload.semester,
            sgpa: event.payload.sgpa,
            cgpa: event.payload.cgpa,
            approvedBy: event.payload.approvedBy,
            transactionId: event.transactionId,
            blockNumber: event.blockNumber
        });

        // Additional logic for record approval
        // - Send notification to student
        // - Update student portal
        // - Generate transcript if final semester
    }

    handleCertificateIssued(event) {
        logger.info('CertificateIssued Event:', {
            certificateID: event.payload.certificateID,
            studentID: event.payload.studentID,
            certType: event.payload.certType,
            issuedBy: event.payload.issuedBy,
            transactionId: event.transactionId,
            blockNumber: event.blockNumber
        });

        // Additional logic for certificate issuance
        // - Send certificate to student email
        // - Update certificate registry
        // - Generate QR code for verification
    }

    handleStudentStatusChanged(event) {
        logger.info('StudentStatusChanged Event:', {
            rollNumber: event.payload.rollNumber,
            oldStatus: event.payload.oldStatus,
            newStatus: event.payload.newStatus,
            reason: event.payload.reason,
            modifiedBy: event.payload.modifiedBy,
            transactionId: event.transactionId,
            blockNumber: event.blockNumber
        });

        // Additional logic for status changes
        // - Send notification to student
        // - Update student portal access
        // - Trigger graduation workflow if status is GRADUATED
        // - Alert admin if status is WITHDRAWN or CANCELLED
    }

    handleStudentDepartmentChanged(event) {
        logger.info('StudentDepartmentChanged Event:', {
            rollNumber: event.payload.rollNumber,
            oldDepartment: event.payload.oldDepartment,
            newDepartment: event.payload.newDepartment,
            modifiedBy: event.payload.modifiedBy,
            transactionId: event.transactionId,
            blockNumber: event.blockNumber
        });

        // Additional logic for department changes
        // - Notify both old and new departments
        // - Update course registrations
        // - Transfer academic records
        // - Update department statistics
    }

    handleCertificateRevoked(event) {
        logger.info('CertificateRevoked Event:', {
            certificateID: event.payload.certificateID,
            studentID: event.payload.studentID,
            certType: event.payload.certType,
            reason: event.payload.reason,
            revokedBy: event.payload.revokedBy,
            revokedAt: event.payload.revokedAt,
            transactionId: event.transactionId,
            blockNumber: event.blockNumber
        });

        // Additional logic for certificate revocation
        // - Send notification to student
        // - Update verification portal
        // - Alert external verification services
        // - Log in audit trail
    }

    saveCheckpoint(blockNumber, transactionId) {
        try {
            const checkpoint = {
                lastBlockNumber: blockNumber,
                lastTransactionId: transactionId,
                timestamp: new Date().toISOString()
            };

            fs.writeFileSync(this.checkpointFile, JSON.stringify(checkpoint, null, 2));
            logger.debug(`Checkpoint saved: Block ${blockNumber}`);
        } catch (error) {
            logger.error(`Failed to save checkpoint: ${error.message}`);
        }
    }

    async getLastCheckpoint() {
        try {
            if (fs.existsSync(this.checkpointFile)) {
                const data = fs.readFileSync(this.checkpointFile, 'utf8');
                const checkpoint = JSON.parse(data);
                logger.info(`Resuming from checkpoint: Block ${checkpoint.lastBlockNumber}`);
                return checkpoint.lastBlockNumber;
            }
        } catch (error) {
            logger.error(`Failed to read checkpoint: ${error.message}`);
        }
        
        // Start from the beginning if no checkpoint
        return undefined;
    }

    async stopListening() {
        try {
            for (const { eventName, listener } of this.listeners) {
                listener.unregister();
                logger.info(`Stopped listening for ${eventName} events`);
            }
            
            this.listeners = [];
            this.isListening = false;
            logger.info('All event listeners stopped');
        } catch (error) {
            logger.error(`Failed to stop event listeners: ${error.message}`);
            throw error;
        }
    }

    getStatus() {
        return {
            isListening: this.isListening,
            activeListeners: this.listeners.map(l => l.eventName),
            listenerCount: this.listeners.length
        };
    }
}

module.exports = EventListener;
