require('dotenv').config();
const FabricCAClient = require('./fabricCAClient');
const logger = require('./utils/logger');

async function main() {
    try {
        const caClient = new FabricCAClient();
        
        const adminUserId = process.env.ADMIN_USER_ID || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'adminpw';

        logger.info(`Enrolling admin user: ${adminUserId}`);
        
        const result = await caClient.enrollAdmin(adminUserId, adminPassword);
        
        if (result.success) {
            logger.info(`✅ ${result.message}`);
            logger.info(`Admin identity stored in wallet at: ${caClient.walletPath}`);
        } else {
            logger.warn(`⚠️  ${result.message}`);
        }
    } catch (error) {
        logger.error(`❌ Failed to enroll admin: ${error.message}`);
        process.exit(1);
    }
}

main();
