const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const logger = require('./logger');
const { isValidRole } = require('./mspMapper');

/**
 * User Manager
 * Simple JSON file-based user storage
 * For production, replace with a proper database (MongoDB, PostgreSQL, etc.)
 */

const USERS_FILE = path.join(__dirname, '../../data/users.json');
const SALT_ROUNDS = 10;

// Ensure data directory exists
const dataDir = path.dirname(USERS_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = [
        {
            id: 'admin',
            username: 'admin',
            email: 'admin@nitw.edu',
            passwordHash: bcrypt.hashSync('admin123', SALT_ROUNDS), // Default password: admin123
            role: 'admin',
            department: null,
            createdAt: new Date().toISOString(),
            isActive: true
        }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    logger.info('Initialized users.json with default admin user');
}

/**
 * Load users from file
 * @returns {Array} Array of user objects
 */
const loadUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error(`Error loading users: ${error.message}`);
        return [];
    }
};

/**
 * Save users to file
 * @param {Array} users - Array of user objects
 */
const saveUsers = (users) => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        logger.info('Users saved successfully');
    } catch (error) {
        logger.error(`Error saving users: ${error.message}`);
        throw new Error('Failed to save user data');
    }
};

/**
 * Find user by username
 * @param {string} username - Username to search for
 * @returns {object|null} User object or null if not found
 */
const findUserByUsername = (username) => {
    const users = loadUsers();
    return users.find(u => u.username === username) || null;
};

/**
 * Find user by email
 * @param {string} email - Email to search for
 * @returns {object|null} User object or null if not found
 */
const findUserByEmail = (email) => {
    const users = loadUsers();
    return users.find(u => u.email === email) || null;
};

/**
 * Find user by ID
 * @param {string} id - User ID
 * @returns {object|null} User object or null if not found
 */
const findUserById = (id) => {
    const users = loadUsers();
    return users.find(u => u.id === id) || null;
};

/**
 * Create a new user
 * @param {object} userData - User data
 * @returns {object} Created user object (without password)
 */
const createUser = async (userData) => {
    const { username, password, email, role, department } = userData;

    // Validation
    if (!username || !password || !email || !role) {
        throw new Error('Missing required fields: username, password, email, role');
    }

    if (!isValidRole(role)) {
        throw new Error(`Invalid role: ${role}. Valid roles: admin, student, faculty, verifier`);
    }

    if ((role === 'faculty' || role === 'student') && !department) {
        throw new Error('Department is required for faculty and student roles');
    }

    // Check if user already exists
    if (findUserByUsername(username)) {
        throw new Error(`Username '${username}' already exists`);
    }

    if (findUserByEmail(email)) {
        throw new Error(`Email '${email}' already exists`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user object
    const newUser = {
        id: `${role}-${Date.now()}`, // Simple ID generation
        username,
        email,
        passwordHash,
        role,
        department: department || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
    };

    // Save user
    const users = loadUsers();
    users.push(newUser);
    saveUsers(users);

    logger.info(`User created: ${username} (${role})`);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
};

/**
 * Authenticate user with username/email and password
 * @param {string} identifier - Username or email
 * @param {string} password - Password
 * @returns {object|null} User object (without password) or null if authentication fails
 */
const authenticateUser = async (identifier, password) => {
    // Try to find user by email first, then by username
    let user = findUserByEmail(identifier);
    if (!user) {
        user = findUserByUsername(identifier);
    }

    if (!user) {
        logger.warn(`Authentication failed: User '${identifier}' not found`);
        return null;
    }

    if (!user.isActive) {
        logger.warn(`Authentication failed: User '${identifier}' is inactive`);
        return null;
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
        logger.warn(`Authentication failed: Invalid password for user '${identifier}'`);
        return null;
    }

    logger.info(`User authenticated: ${user.username} (${user.email})`);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

/**
 * Update user
 * @param {string} userId - User ID
 * @param {object} updates - Fields to update
 * @returns {object} Updated user object (without password)
 */
const updateUser = async (userId, updates) => {
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error('User not found');
    }

    // Don't allow changing certain fields
    const allowedUpdates = ['email', 'department', 'isActive'];
    const sanitizedUpdates = {};

    for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
            sanitizedUpdates[key] = updates[key];
        }
    }

    // Handle password update separately
    if (updates.password) {
        sanitizedUpdates.passwordHash = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }

    // Update user
    users[userIndex] = {
        ...users[userIndex],
        ...sanitizedUpdates,
        updatedAt: new Date().toISOString()
    };

    saveUsers(users);
    logger.info(`User updated: ${users[userIndex].username}`);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
};

/**
 * Delete user (soft delete - set isActive to false)
 * @param {string} userId - User ID
 * @returns {boolean} True if deleted successfully
 */
const deleteUser = (userId) => {
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error('User not found');
    }

    // Soft delete
    users[userIndex].isActive = false;
    users[userIndex].updatedAt = new Date().toISOString();

    saveUsers(users);
    logger.info(`User deactivated: ${users[userIndex].username}`);

    return true;
};

/**
 * Get all users (without password hashes)
 * @param {object} filters - Optional filters (role, department, isActive)
 * @returns {Array} Array of user objects
 */
const getAllUsers = (filters = {}) => {
    let users = loadUsers();

    // Apply filters
    if (filters.role) {
        users = users.filter(u => u.role === filters.role);
    }
    if (filters.department) {
        users = users.filter(u => u.department === filters.department);
    }
    if (filters.isActive !== undefined) {
        users = users.filter(u => u.isActive === filters.isActive);
    }

    // Remove password hashes
    return users.map(({ passwordHash, ...user }) => user);
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @returns {boolean} True if password changed successfully
 */
const changePassword = async (userId, oldPassword, newPassword) => {
    const users = loadUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
        throw new Error('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
        throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    const userIndex = users.findIndex(u => u.id === userId);
    users[userIndex].passwordHash = newPasswordHash;
    users[userIndex].updatedAt = new Date().toISOString();

    saveUsers(users);
    logger.info(`Password changed for user: ${user.username}`);

    return true;
};

module.exports = {
    findUserByUsername,
    findUserByEmail,
    findUserById,
    createUser,
    authenticateUser,
    updateUser,
    deleteUser,
    getAllUsers,
    changePassword
};
