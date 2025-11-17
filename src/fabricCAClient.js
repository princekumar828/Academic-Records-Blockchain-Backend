const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

class FabricCAClient {
    constructor() {
        this.walletPath = path.join(__dirname, '../wallet');
        this.caURL = process.env.CA_URL || 'https://localhost:8054';
        this.caName = process.env.CA_NAME || 'ca-nitwarangal';
        this.mspId = process.env.MSP_ID || 'NITWarangalMSP';
    }

    async getWallet() {
        const wallet = await Wallets.newFileSystemWallet(this.walletPath);
        return wallet;
    }

    async getCaClient() {
        const ccpPath = path.resolve(__dirname, '..', '..', 'organizations', 'peerOrganizations', 
            'nitwarangal.nitw.edu', 'connection-nitwarangal.json');
        
        if (!fs.existsSync(ccpPath)) {
            throw new Error(`Connection profile not found at ${ccpPath}`);
        }

        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);

        const caInfo = ccp.certificateAuthorities[this.caName];
        if (!caInfo) {
            throw new Error(`CA "${this.caName}" not found in connection profile`);
        }
        
        // Handle tlsCACerts.pem as either string or array
        let caTLSCACerts = caInfo.tlsCACerts.pem;
        if (Array.isArray(caTLSCACerts)) {
            caTLSCACerts = caTLSCACerts.join('\n');
        }
        
        // Create CA client - caName parameter is optional
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false });

        return ca;
    }

    async enrollAdmin(adminUserId = 'admin', adminPassword = 'adminpw') {
        try {
            const wallet = await this.getWallet();

            // Check if admin already enrolled
            const adminIdentity = await wallet.get(adminUserId);
            if (adminIdentity) {
                logger.info(`Admin user "${adminUserId}" already exists in wallet`);
                return { success: true, message: 'Admin already enrolled' };
            }

            // Enroll admin
            const ca = await this.getCaClient();
            const enrollment = await ca.enroll({
                enrollmentID: adminUserId,
                enrollmentSecret: adminPassword
            });

            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: this.mspId,
                type: 'X.509',
            };

            await wallet.put(adminUserId, x509Identity);
            logger.info(`Admin user "${adminUserId}" enrolled successfully`);

            return { success: true, message: 'Admin enrolled successfully' };
        } catch (error) {
            logger.error(`Failed to enroll admin: ${error.message}`);
            throw error;
        }
    }

    async registerUser(userId, attributes = {}, role = 'client', affiliation = '', adminUserId = 'admin') {
        try {
            const wallet = await this.getWallet();

            // Check if user already exists
            const userIdentity = await wallet.get(userId);
            if (userIdentity) {
                logger.warn(`User "${userId}" already exists in wallet`);
                return { success: false, message: 'User already registered' };
            }

            // Check admin exists
            const adminIdentity = await wallet.get(adminUserId);
            if (!adminIdentity) {
                throw new Error(`Admin user "${adminUserId}" does not exist. Please enroll admin first.`);
            }

            // Build user identity
            const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
            const adminUser = await provider.getUserContext(adminIdentity, adminUserId);

            // Register the user
            const ca = await this.getCaClient();
            
            const registerRequest = {
                enrollmentID: userId,
                enrollmentSecret: userId + 'pw', // Generate password
                role: role,
                affiliation: affiliation || 'org1.department1',
                attrs: []
            };

            // Add custom attributes
            if (attributes.role) {
                registerRequest.attrs.push({ name: 'role', value: attributes.role, ecert: true });
            }
            if (attributes.department) {
                registerRequest.attrs.push({ name: 'department', value: attributes.department, ecert: true });
            }
            if (attributes.email) {
                registerRequest.attrs.push({ name: 'email', value: attributes.email, ecert: true });
            }

            const secret = await ca.register(registerRequest, adminUser);

            // Enroll the user
            const enrollment = await ca.enroll({
                enrollmentID: userId,
                enrollmentSecret: secret
            });

            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: this.mspId,
                type: 'X.509',
            };

            await wallet.put(userId, x509Identity);
            logger.info(`User "${userId}" registered and enrolled successfully`);

            return {
                success: true,
                message: 'User registered successfully',
                userId: userId,
                secret: secret
            };
        } catch (error) {
            logger.error(`Failed to register user: ${error.message}`);
            throw error;
        }
    }

    async getUser(userId) {
        try {
            const wallet = await this.getWallet();
            const identity = await wallet.get(userId);
            
            if (!identity) {
                return null;
            }

            return {
                userId: userId,
                mspId: identity.mspId,
                type: identity.type
            };
        } catch (error) {
            logger.error(`Failed to get user: ${error.message}`);
            throw error;
        }
    }

    async listUsers() {
        try {
            const wallet = await this.getWallet();
            const identities = await wallet.list();
            return identities;
        } catch (error) {
            logger.error(`Failed to list users: ${error.message}`);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            const wallet = await this.getWallet();
            const identity = await wallet.get(userId);
            
            if (!identity) {
                return { success: false, message: 'User not found' };
            }

            await wallet.remove(userId);
            logger.info(`User "${userId}" deleted successfully`);

            return { success: true, message: 'User deleted successfully' };
        } catch (error) {
            logger.error(`Failed to delete user: ${error.message}`);
            throw error;
        }
    }
}

module.exports = FabricCAClient;
