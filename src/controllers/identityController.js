const FabricCAClient = require('../fabricCAClient');
const logger = require('../utils/logger');

class IdentityController {
    // Enroll admin
    static async enrollAdmin(req, res) {
        try {
            const { userId, password } = req.body;
            const caClient = new FabricCAClient();

            const result = await caClient.enrollAdmin(
                userId || 'admin',
                password || 'adminpw'
            );

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            logger.error(`Error enrolling admin: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Register user
    static async registerUser(req, res) {
        try {
            const { userId, role, attributes, affiliation } = req.body;
            const caClient = new FabricCAClient();

            const result = await caClient.registerUser(
                userId,
                attributes || {},
                role || 'client',
                affiliation || ''
            );

            res.status(201).json({
                success: true,
                message: result.message,
                data: {
                    userId: result.userId,
                    secret: result.secret
                }
            });
        } catch (error) {
            logger.error(`Error registering user: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get user identity
    static async getUser(req, res) {
        try {
            const { userId } = req.params;
            const caClient = new FabricCAClient();

            const user = await caClient.getUser(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            logger.error(`Error getting user: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // List all users
    static async listUsers(req, res) {
        try {
            const caClient = new FabricCAClient();
            const users = await caClient.listUsers();

            res.status(200).json({
                success: true,
                data: users
            });
        } catch (error) {
            logger.error(`Error listing users: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Delete user
    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const caClient = new FabricCAClient();

            const result = await caClient.deleteUser(userId);

            if (!result.success) {
                return res.status(404).json({
                    success: false,
                    message: result.message
                });
            }

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            logger.error(`Error deleting user: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = IdentityController;
