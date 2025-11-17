require('dotenv').config();
const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

async function main() {
    try {
        const walletPath = path.join(__dirname, '../wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if admin already exists
        const adminIdentity = await wallet.get('admin');
        if (adminIdentity) {
            logger.info('Admin identity already exists in wallet, removing it first...');
            await wallet.remove('admin');
        }

        // Path to pre-generated admin credentials
        const adminCertPath = path.resolve(__dirname, '..', '..', 'organizations', 'peerOrganizations',
            'nitwarangal.nitw.edu', 'users', 'Admin@nitwarangal.nitw.edu', 'msp', 'signcerts');
        
        const adminKeyPath = path.resolve(__dirname, '..', '..', 'organizations', 'peerOrganizations',
            'nitwarangal.nitw.edu', 'users', 'Admin@nitwarangal.nitw.edu', 'msp', 'keystore');

        // Read certificate
        const certFiles = fs.readdirSync(adminCertPath);
        if (certFiles.length === 0) {
            throw new Error('No certificate files found');
        }
        const certificate = fs.readFileSync(path.join(adminCertPath, certFiles[0]), 'utf8');

        // Read private key
        const keyFiles = fs.readdirSync(adminKeyPath);
        if (keyFiles.length === 0) {
            throw new Error('No private key files found');
        }
        const privateKey = fs.readFileSync(path.join(adminKeyPath, keyFiles[0]), 'utf8');

        // Create X.509 identity
        const x509Identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey,
            },
            mspId: 'NITWarangalMSP',
            type: 'X.509',
        };

        // Import identity to wallet
        await wallet.put('admin', x509Identity);

        logger.info('✅ Successfully imported pre-generated admin identity');
        logger.info(`Admin identity stored in wallet at: ${walletPath}`);
        logger.info('This admin identity has the correct OU=admin attribute for ACL checks');

    } catch (error) {
        logger.error(`❌ Failed to import admin identity: ${error.message}`);
        logger.error(error.stack);
        process.exit(1);
    }
}

main();
