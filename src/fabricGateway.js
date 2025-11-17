const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const { 
    APP_CONFIG, 
    getConnectionProfilePath, 
    getWalletPath 
} = require('./config/app.config');

class FabricGateway {
    constructor() {
        this.channelName = APP_CONFIG.fabric.channelName;
        this.chaincodeName = APP_CONFIG.fabric.chaincodeName;
        this.walletPath = getWalletPath();
        this.gateway = null;
        this.network = null;
        this.contract = null;
    }

    async connect(userId) {
        try {
            // userId should be the Fabric wallet identity name
            // For now, we use 'admin' for all users until we create role-specific identities
            // TODO: Create and use role-specific identities (faculty-cse, verifier, etc.)
            
            // Load connection profile
            const ccpPath = getConnectionProfilePath();

            if (!fs.existsSync(ccpPath)) {
                throw new Error(`Connection profile not found at ${ccpPath}`);
            }

            const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
            const ccp = JSON.parse(ccpJSON);

            // Get wallet
            const wallet = await Wallets.newFileSystemWallet(this.walletPath);

            // Check if user exists in wallet
            const identity = await wallet.get(userId);
            if (!identity) {
                // For now, fall back to 'admin' identity if user-specific identity doesn't exist
                logger.warn(`Identity "${userId}" not found in wallet, using '${APP_CONFIG.fabric.admin.userId}' as fallback`);
                const adminIdentity = await wallet.get(APP_CONFIG.fabric.admin.userId);
                if (!adminIdentity) {
                    throw new Error(`Neither "${userId}" nor "${APP_CONFIG.fabric.admin.userId}" identity exists in the wallet`);
                }
                userId = APP_CONFIG.fabric.admin.userId;
            }

            // Create gateway instance
            this.gateway = new Gateway();

            // Connect to gateway
            await this.gateway.connect(ccp, {
                wallet,
                identity: userId,
                discovery: APP_CONFIG.fabric.gateway.discovery
            });
            await this.gateway.connect(ccp, {
                wallet,
                identity: userId,
                discovery: { 
                    enabled: true, 
                    asLocalhost: true 
                }
            });

            logger.info(`Connected to gateway as user: ${userId}`);

            // Get network
            this.network = await this.gateway.getNetwork(this.channelName);

            // Get contract
            this.contract = this.network.getContract(this.chaincodeName);

            logger.info(`Connected to channel: ${this.channelName}, chaincode: ${this.chaincodeName}`);

            return this.contract;
        } catch (error) {
            logger.error(`Failed to connect to gateway: ${error.message}`);
            throw error;
        }
    }

    async disconnect() {
        if (this.gateway) {
            this.gateway.disconnect();
            logger.info('Disconnected from gateway');
        }
    }

    async submitTransaction(functionName, ...args) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized. Call connect() first.');
            }

            logger.info(`Submitting transaction: ${functionName} with args: ${JSON.stringify(args)}`);
            
            const result = await this.contract.submitTransaction(functionName, ...args);
            
            logger.info(`Transaction ${functionName} submitted successfully`);
            
            // Parse result if it's JSON
            try {
                return JSON.parse(result.toString());
            } catch (e) {
                return result.toString();
            }
        } catch (error) {
            logger.error(`Failed to submit transaction ${functionName}: ${error.message}`);
            throw error;
        }
    }

    async evaluateTransaction(functionName, ...args) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized. Call connect() first.');
            }

            logger.info(`Evaluating transaction: ${functionName} with args: ${JSON.stringify(args)}`);
            const result = await this.contract.evaluateTransaction(functionName, ...args);
            
            logger.info(`Transaction ${functionName} evaluated successfully`);
            
            // Parse result if it's JSON
            try {
                return JSON.parse(result.toString());
            } catch (e) {
                return result.toString();
            }
        } catch (error) {
            logger.error(`Failed to evaluate transaction ${functionName}: ${error.message}`);
            throw error;
        }
    }

    async submitTransactionWithTransient(functionName, transientData, ...args) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized. Call connect() first.');
            }

            // Convert transient data values to Buffer
            const transientMap = {};
            for (const key in transientData) {
                transientMap[key] = Buffer.from(transientData[key]);
            }

            logger.info(`Submitting transaction with transient data: ${functionName}`);
            
            const transaction = this.contract.createTransaction(functionName);
            transaction.setTransient(transientMap);
            
            const result = await transaction.submit(...args);
            
            logger.info(`Transaction ${functionName} with transient data submitted successfully`);
            
            // Parse result if it's JSON
            try {
                return JSON.parse(result.toString());
            } catch (e) {
                return result.toString();
            }
        } catch (error) {
            logger.error(`Failed to submit transaction with transient data ${functionName}: ${error.message}`);
            throw error;
        }
    }

    getNetwork() {
        return this.network;
    }

    getContract() {
        return this.contract;
    }
}

module.exports = FabricGateway;
