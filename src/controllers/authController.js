const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { authenticateUser, createUser, findUserByUsername, changePassword } = require('../utils/userManager');
const { getMSPForRole } = require('../utils/mspMapper');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// Store for refresh tokens (in production, use Redis or database)
const refreshTokens = new Map();

/**
 * Generate JWT access token
 * @param {object} user - User object
 * @returns {string} JWT token
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            role: user.role,
            mspId: getMSPForRole(user.role),
            department: user.department,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
};

/**
 * Generate JWT refresh token
 * @param {object} user - User object
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (user) => {
    const refreshToken = jwt.sign(
        {
            userId: user.id,
            username: user.username
        },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRY }
    );

    // Store refresh token
    refreshTokens.set(refreshToken, {
        userId: user.id,
        createdAt: new Date().toISOString()
    });

    return refreshToken;
};

/**
 * Login endpoint
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Accept either username or email
        const loginIdentifier = email || username;

        // Validate input
        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email/username and password are required'
            });
        }

        // Authenticate user (try email first, then username)
        let user = await authenticateUser(loginIdentifier, password);
        
        // If authentication by email failed and email was provided, try finding by username
        if (!user && email) {
            const userByUsername = await findUserByUsername(loginIdentifier);
            if (userByUsername) {
                user = await authenticateUser(userByUsername.username, password);
            }
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        logger.info(`User logged in: ${username}`);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                accessToken,
                refreshToken,
                tokenType: 'Bearer',
                expiresIn: JWT_EXPIRY,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                    mspId: getMSPForRole(user.role)
                }
            }
        });
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login',
            error: error.message
        });
    }
};

/**
 * Register endpoint
 * POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const { username, password, email, role, department, name, designation } = req.body;

        // Validate input
        if (!username || !password || !email || !role) {
            return res.status(400).json({
                success: false,
                message: 'Username, password, email, and role are required'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Step 1: Create user in database (for authentication)
        const user = await createUser({
            username,
            password,
            email,
            role,
            department: department || null
        });

        logger.info(`User created in database: ${username} (${role})`);

        // Step 2: Create user in blockchain (for academic identity)
        try {
            const walletPath = path.join(__dirname, '../../wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            // Use admin identity to create blockchain records
            const adminIdentity = await wallet.get('admin');
            if (!adminIdentity) {
                logger.warn('Admin identity not found in wallet. Skipping blockchain creation.');
                return res.status(201).json({
                    success: true,
                    message: 'User registered in database only (blockchain creation skipped)',
                    data: {
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            role: user.role,
                            department: user.department,
                            mspId: getMSPForRole(user.role)
                        }
                    }
                });
            }

            const ccpPath = path.join(__dirname, '../../../', 'organizations', 'peerOrganizations', 'nitwarangal.nitw.edu', 'connection-nitwarangal.json');
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: 'admin',
                discovery: { enabled: true, asLocalhost: true }
            });

            const network = await gateway.getNetwork('academic-records-channel');
            const contract = network.getContract('academic-records');

            // Create blockchain record based on role
            if (role === 'student') {
                const studentName = name || username;
                const rollNumber = username; // Use username as roll number
                const enrollmentYear = new Date().getFullYear();
                
                await contract.submitTransaction(
                    'CreateStudent',
                    user.id,              // studentId
                    studentName,          // name
                    department || 'CSE',  // department
                    enrollmentYear.toString(), // enrollmentYear
                    rollNumber,           // rollNumber
                    email,                // email
                    'GENERAL'            // admissionCategory
                );
                
                logger.info(`Student created in blockchain: ${user.id}`);
                
            } else if (role === 'department') {
                // Department users don't need separate blockchain entity
                // They will use existing Department records created by admin
                logger.info(`Department user registered (uses existing department entity): ${user.id}`);
            }
            // Note: admin role doesn't need blockchain records

            await gateway.disconnect();

            logger.info(`User registered successfully in both systems: ${username} (${role})`);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        department: user.department,
                        mspId: getMSPForRole(user.role)
                    }
                }
            });

        } catch (blockchainError) {
            logger.error(`Blockchain creation error: ${blockchainError.message}`);
            
            // User is already created in database, so return success with warning
            return res.status(201).json({
                success: true,
                message: 'User registered in database. Blockchain creation failed but can be done later.',
                warning: blockchainError.message,
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        department: user.department,
                        mspId: getMSPForRole(user.role)
                    }
                }
            });
        }

    } catch (error) {
        logger.error(`Registration error: ${error.message}`);
        
        // Handle specific errors
        if (error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.includes('Invalid role')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'An error occurred during registration',
            error: error.message
        });
    }
};

/**
 * Refresh token endpoint
 * POST /api/auth/refresh
 */
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Check if refresh token exists in store
        if (!refreshTokens.has(refreshToken)) {
            return res.status(403).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_SECRET);

        // Get user info
        const user = findUserByUsername(decoded.username);

        if (!user || !user.isActive) {
            // Remove invalid refresh token
            refreshTokens.delete(refreshToken);
            return res.status(403).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        // Generate new access token
        const newAccessToken = generateAccessToken(user);

        logger.info(`Token refreshed for user: ${user.username}`);

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken: newAccessToken,
                tokenType: 'Bearer',
                expiresIn: JWT_EXPIRY
            }
        });
    } catch (error) {
        logger.error(`Token refresh error: ${error.message}`);

        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Refresh token expired. Please login again.'
            });
        }

        res.status(403).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken && refreshTokens.has(refreshToken)) {
            refreshTokens.delete(refreshToken);
            logger.info(`User logged out, refresh token removed`);
        }

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        logger.error(`Logout error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'An error occurred during logout'
        });
    }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
    try {
        // req.user is set by authenticateToken middleware
        const user = findUserByUsername(req.user.username);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                department: user.department,
                mspId: getMSPForRole(user.role),
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        logger.error(`Get profile error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching profile'
        });
    }
};

/**
 * Change password endpoint
 * POST /api/auth/change-password
 */
const changePasswordEndpoint = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        // Validate input
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Old password and new password are required'
            });
        }

        // Validate new password strength
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Change password
        await changePassword(req.user.userId, oldPassword, newPassword);

        logger.info(`Password changed for user: ${req.user.username}`);

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        logger.error(`Change password error: ${error.message}`);

        if (error.message === 'Current password is incorrect') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'An error occurred while changing password'
        });
    }
};

module.exports = {
    login,
    register,
    refresh,
    logout,
    getProfile,
    changePasswordEndpoint
};
