/**
 * MSP Mapper Utility
 * Maps backend user roles to Hyperledger Fabric MSP identities
 */

// MSP Constants - must match chaincode MSP definitions
const MSP_IDS = {
    NITWarangalMSP: 'NITWarangalMSP',      // Institute administration
    DepartmentsMSP: 'DepartmentsMSP',      // Department faculty
    VerifiersMSP: 'VerifiersMSP'           // External verifiers
};

// Role to MSP mapping
const ROLE_TO_MSP = {
    'admin': MSP_IDS.NITWarangalMSP,       // Admin uses institute MSP
    'student': MSP_IDS.NITWarangalMSP,     // Students use institute MSP
    'department': MSP_IDS.DepartmentsMSP,   // Department users use departments MSP
    'verifier': MSP_IDS.VerifiersMSP        // Verifier uses verifiers MSP
};

// MSP to Role mapping (reverse lookup)
const MSP_TO_ROLES = {
    [MSP_IDS.NITWarangalMSP]: ['admin', 'student'],
    [MSP_IDS.DepartmentsMSP]: ['department'],
    [MSP_IDS.VerifiersMSP]: ['verifier']
};

/**
 * Get MSP ID for a given role
 * @param {string} role - User role (admin, faculty, verifier)
 * @returns {string|null} MSP ID or null if role not found
 */
const getMSPForRole = (role) => {
    return ROLE_TO_MSP[role] || null;
};

/**
 * Get Fabric wallet identity name for a user
 * This determines which identity from the wallet to use for Fabric Gateway connection
 * 
 * @param {object} user - User object with userId, role, department
 * @returns {string} Identity name to use from wallet
 */
const getFabricIdentity = (user) => {
    // Admin always uses 'admin' identity
    if (user.role === 'admin') {
        return 'admin';
    }

    // Students use 'admin' identity (they're part of NITWarangalMSP)
    // TODO: Could create student-specific identities if needed
    if (user.role === 'student') {
        return 'admin';
    }

    // Department users use admin identity (they're in DepartmentsMSP)
    // Format: dept-cse, dept-ece, etc. (for future implementation)
    if (user.role === 'department') {
        // For now, use admin identity. In future, create department-specific identities
        return 'admin';
    }

    // Verifier uses 'verifier' identity
    if (user.role === 'verifier') {
        return 'verifier';
    }

    // Default fallback to userId
    return user.userId;
};

/**
 * Check if a role is valid
 * @param {string} role - Role to validate
 * @returns {boolean} True if valid role
 */
const isValidRole = (role) => {
    return Object.keys(ROLE_TO_MSP).includes(role);
};

/**
 * Get all valid roles
 * @returns {string[]} Array of valid role names
 */
const getAllRoles = () => {
    return Object.keys(ROLE_TO_MSP);
};

/**
 * Get roles that can access a specific MSP
 * @param {string} mspId - MSP ID
 * @returns {string[]} Array of roles that use this MSP
 */
const getRolesForMSP = (mspId) => {
    return MSP_TO_ROLES[mspId] || [];
};

/**
 * Check if a user has access to a specific operation based on MSP requirements
 * This is a backend-level pre-check before calling chaincode
 * Chaincode will still enforce its own MSP access control
 * 
 * @param {object} user - User object
 * @param {string[]} requiredMSPs - Array of MSP IDs that can perform the operation
 * @returns {boolean} True if user's MSP is in required MSPs
 */
const hasAccess = (user, requiredMSPs) => {
    const userMSP = getMSPForRole(user.role);
    return requiredMSPs.includes(userMSP);
};

/**
 * Get department-specific identity attributes
 * These attributes will be used when enrolling faculty users
 * 
 * @param {string} department - Department code (CSE, ECE, ME, etc.)
 * @returns {object} Attributes to include in identity enrollment
 */
const getDepartmentAttributes = (department) => {
    return {
        department: department,
        affiliation: `org1.department.${department.toLowerCase()}`
    };
};

module.exports = {
    MSP_IDS,
    ROLE_TO_MSP,
    MSP_TO_ROLES,
    getMSPForRole,
    getFabricIdentity,
    isValidRole,
    getAllRoles,
    getRolesForMSP,
    hasAccess,
    getDepartmentAttributes
};
