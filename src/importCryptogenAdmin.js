const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

async function importCryptogenAdmin() {
    try {
        // Path to wallet
        const walletPath = path.join(__dirname, '../wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if admin already exists
        const adminExists = await wallet.get('admin');
        if (adminExists) {
            logger.info('Admin identity already exists in wallet');
            logger.info('Removing old admin identity');
            await wallet.remove('admin');
        }

        // Path to cryptogen-generated admin certificates
        const credPath = path.join(__dirname, '../../organizations/peerOrganizations/nitwarangal.nitw.edu/users/Admin@nitwarangal.nitw.edu');
        const certificate = fs.readFileSync(path.join(credPath, '/msp/signcerts/cert.pem')).toString();
        
        // Find the private key file (it has a random name ending with _sk)
        const keystorePath = path.join(credPath, '/msp/keystore');
        const keyFiles = fs.readdirSync(keystorePath);
        const keyFile = keyFiles.find(f => f.endsWith('_sk'));
        if (!keyFile) {
            throw new Error('Private key file not found in keystore');
        }
        const privateKey = fs.readFileSync(path.join(keystorePath, keyFile)).toString();

        // Create identity
        const identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey,
            },
            mspId: 'NITWarangalMSP',
            type: 'X.509',
        };

        // Put identity in wallet
        await wallet.put('admin', identity);
        logger.info('✅ Admin identity from cryptogen imported successfully');
        logger.info(`Admin identity stored in wallet at: ${walletPath}`);

    } catch (error) {
        logger.error(`Failed to import admin identity: ${error.message}`);
        process.exit(1);
    }
}

importCryptogenAdmin();
