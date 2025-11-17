const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate JWT tokens
 * Extracts and verifies JWT token from Authorization header
 * Sets req.user with decoded token data
 */
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            logger.warn('Access attempt without token');
            return res.status(401).json({
                success: false,
                message: 'Access token required. Please provide a valid JWT token in the Authorization header.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-in-production');
        
        // Set user info in request
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role,
            mspId: decoded.mspId,
            department: decoded.department || null,
            email: decoded.email || null
        };

        logger.info(`Authenticated user: ${req.user.username} (${req.user.role})`);
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logger.warn(`Expired token: ${error.message}`);
            return res.status(403).json({
                success: false,
                message: 'Token expired. Please login again.',
                code: 'TOKEN_EXPIRED'
            });
        } else if (error.name === 'JsonWebTokenError') {
            logger.error(`Invalid token: ${error.message}`);
            return res.status(403).json({
                success: false,
                message: 'Invalid token. Please login again.',
                code: 'INVALID_TOKEN'
            });
        } else {
            logger.error(`Token verification error: ${error.message}`);
            return res.status(403).json({
                success: false,
                message: 'Token verification failed',
                code: 'VERIFICATION_FAILED'
            });
        }
    }
};

/**
 * Middleware to require specific roles
 * Must be used after authenticateToken middleware
 * @param {...string} allowedRoles - Array of allowed role names
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            logger.error('requireRole called without authentication');
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(`Access denied for user ${req.user.username}: role ${req.user.role} not in [${allowedRoles.join(', ')}]`);
            return res.status(403).json({
                success: false,
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
            });
        }

        logger.info(`Role authorization passed for ${req.user.username}: ${req.user.role}`);
        next();
    };
};

/**
 * Middleware to enforce department-level access control
 * Faculty users can only access data from their department
 * Admin users have access to all departments
 */
const enforceDepartmentAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Admin has access to all departments
    if (req.user.role === 'admin') {
        return next();
    }

    // Faculty must have department assigned
    if (req.user.role === 'faculty') {
        if (!req.user.department) {
            logger.error(`Faculty user ${req.user.username} has no department assigned`);
            return res.status(403).json({
                success: false,
                message: 'Your account has no department assigned. Please contact administrator.'
            });
        }

        // Add department filter to request for queries
        req.departmentFilter = req.user.department;

        // If accessing specific student, verify department match
        if (req.params.rollNumber) {
            const rollNumber = req.params.rollNumber;
            // Roll number format: CS25B999 (first 2-3 chars indicate department)
            const studentDeptCode = rollNumber.substring(0, 2).toUpperCase(); // CS, EC, ME, etc.
            const userDeptCode = req.user.department.substring(0, 2).toUpperCase();

            if (studentDeptCode !== userDeptCode) {
                logger.warn(`Faculty ${req.user.username} (${req.user.department}) attempted to access student ${rollNumber} from different department`);
                return res.status(403).json({
                    success: false,
                    message: `Access denied: Student ${rollNumber} is not in your department (${req.user.department})`
                });
            }
        }

        // If creating/updating with department field, verify it matches user's department
        if (req.body && req.body.department) {
            if (req.body.department !== req.user.department) {
                logger.warn(`Faculty ${req.user.username} attempted to modify data for department ${req.body.department}`);
                return res.status(403).json({
                    success: false,
                    message: `Access denied: You can only modify data for your department (${req.user.department})`
                });
            }
        }

        logger.info(`Department access check passed for ${req.user.username}: ${req.user.department}`);
        next();
    } else {
        // Other roles (verifier, student) - implement as needed
        next();
    }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but continues even if no token provided
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-in-production');
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role,
            mspId: decoded.mspId,
            department: decoded.department || null,
            email: decoded.email || null
        };
        logger.info(`Optional auth: User ${req.user.username} authenticated`);
    } catch (error) {
        logger.info('Optional auth: No valid token, continuing as anonymous');
        req.user = null;
    }

    next();
};

module.exports = {
    authenticateToken,
    requireRole,
    enforceDepartmentAccess,
    optionalAuth
};
