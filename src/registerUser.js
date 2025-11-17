require('dotenv').config();
const FabricCAClient = require('./fabricCAClient');
const logger = require('./utils/logger');

async function main() {
    try {
        const args = process.argv.slice(2);
        
        if (args.length < 1) {
            console.log('Usage: node registerUser.js <userId> [role] [department]');
            console.log('Example: node registerUser.js user1 dean CSE');
            process.exit(1);
        }

        const userId = args[0];
        const role = args[1] || 'client';
        const department = args[2] || '';

        const caClient = new FabricCAClient();
        
        logger.info(`Registering user: ${userId}`);
        
        const attributes = {};
        if (role) attributes.role = role;
        if (department) attributes.department = department;

        const result = await caClient.registerUser(userId, attributes, 'client', 'org1.department1');
        
        if (result.success) {
            logger.info(`✅ ${result.message}`);
            logger.info(`User ID: ${result.userId}`);
            logger.info(`Secret: ${result.secret}`);
            logger.info(`Identity stored in wallet at: ${caClient.walletPath}`);
        } else {
            logger.warn(`⚠️  ${result.message}`);
        }
    } catch (error) {
        logger.error(`❌ Failed to register user: ${error.message}`);
        process.exit(1);
    }
}

main();
