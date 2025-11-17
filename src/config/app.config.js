/**
 * Centralized Configuration for Backend Application
 * 
 * This file provides a single source of truth for all application settings.
 * Configuration is organized into logical sections for easy maintenance.
 * 
 * Usage:
 *   const { APP_CONFIG, getConfig } = require('./config/app.config');
 *   const apiPort = APP_CONFIG.server.port;
 *   const channelName = APP_CONFIG.fabric.channelName;
 */

require('dotenv').config();
const path = require('path');

/**
 * Server Configuration
 */
const serverConfig = {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || '/api',
    
    // Server timeouts
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 65000,
};

/**
 * Hyperledger Fabric Configuration
 */
const fabricConfig = {
    // Network identifiers
    channelName: process.env.CHANNEL_NAME || 'academic-records-channel',
    chaincodeName: process.env.CHAINCODE_NAME || 'academic-records',
    mspId: process.env.MSP_ID || 'NITWarangalMSP',
    
    // Paths (relative to backend root)
    connectionProfilePath: process.env.CONNECTION_PROFILE_PATH || 
        path.join(__dirname, '../../../organizations/peerOrganizations/nitwarangal.nitw.edu/connection-nitwarangal.json'),
    walletPath: process.env.WALLET_PATH || 
        path.join(__dirname, '../../wallet'),
    
    // Admin credentials
    admin: {
        userId: process.env.ADMIN_USER_ID || 'admin',
        password: process.env.ADMIN_PASSWORD || 'adminpw',
    },
    
    // Certificate Authority
    ca: {
        url: process.env.CA_URL || 'https://localhost:8054',
        name: process.env.CA_NAME || 'ca-nitwarangal',
        tlsCertPath: process.env.CA_TLS_CERT_PATH || 
            path.join(__dirname, '../../../organizations/peerOrganizations/nitwarangal.nitw.edu/ca/ca.nitwarangal.nitw.edu-cert.pem'),
    },
    
    // Gateway options
    gateway: {
        discovery: {
            enabled: process.env.GATEWAY_DISCOVERY_ENABLED === 'true',
            asLocalhost: process.env.GATEWAY_DISCOVERY_AS_LOCALHOST !== 'false', // default true for dev
        },
        connection: {
            timeout: parseInt(process.env.GATEWAY_CONNECTION_TIMEOUT) || 30,
        },
    },
};

/**
 * Security Configuration
 */
const securityConfig = {
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        algorithm: process.env.JWT_ALGORITHM || 'HS256',
    },
    
    // CORS Configuration
    cors: {
        origins: process.env.CORS_ORIGINS 
            ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
            : ['http://localhost:4200', 'http://localhost:3001'],
        credentials: process.env.CORS_CREDENTIALS !== 'false',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
    
    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again later.',
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
    },
    
    // Password requirements
    password: {
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
        requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
        requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
    },
    
    // Session configuration
    session: {
        timeout: parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000, // 30 minutes
        maxConcurrent: parseInt(process.env.SESSION_MAX_CONCURRENT) || 3,
    },
};

/**
 * Logging Configuration
 */
const loggingConfig = {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    
    // File logging
    file: {
        enabled: process.env.LOG_FILE_ENABLED !== 'false',
        path: process.env.LOG_FILE || path.join(__dirname, '../../logs/app.log'),
        maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
        maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 5,
    },
    
    // Console logging
    console: {
        enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
        colorize: process.env.LOG_CONSOLE_COLORIZE !== 'false',
    },
    
    // Request logging
    requests: {
        enabled: process.env.LOG_REQUESTS_ENABLED !== 'false',
        format: process.env.LOG_REQUESTS_FORMAT || 'combined',
    },
};

/**
 * Database/Storage Configuration
 */
const storageConfig = {
    // Checkpoint file for event listener
    checkpoint: {
        enabled: process.env.CHECKPOINT_ENABLED !== 'false',
        path: process.env.EVENT_CHECKPOINT_FILE || path.join(__dirname, '../../checkpoints/checkpoint.json'),
        saveInterval: parseInt(process.env.CHECKPOINT_SAVE_INTERVAL) || 5000, // 5 seconds
    },
    
    // Data directory
    dataDir: process.env.DATA_DIR || path.join(__dirname, '../../data'),
};

/**
 * Event Listener Configuration
 */
const eventConfig = {
    enabled: process.env.ENABLE_EVENT_LISTENER !== 'false',
    
    // Event types to listen for
    events: {
        studentCreated: process.env.EVENT_STUDENT_CREATED !== 'false',
        recordSubmitted: process.env.EVENT_RECORD_SUBMITTED !== 'false',
        recordApproved: process.env.EVENT_RECORD_APPROVED !== 'false',
        certificateIssued: process.env.EVENT_CERTIFICATE_ISSUED !== 'false',
        certificateRevoked: process.env.EVENT_CERTIFICATE_REVOKED !== 'false',
    },
    
    // Replay configuration
    replay: {
        enabled: process.env.EVENT_REPLAY_ENABLED === 'true',
        startBlock: parseInt(process.env.EVENT_REPLAY_START_BLOCK) || 0,
    },
    
    // Reconnection
    reconnect: {
        enabled: process.env.EVENT_RECONNECT_ENABLED !== 'false',
        maxRetries: parseInt(process.env.EVENT_RECONNECT_MAX_RETRIES) || 5,
        retryDelay: parseInt(process.env.EVENT_RECONNECT_RETRY_DELAY) || 5000, // 5 seconds
    },
};

/**
 * Application Features Configuration
 */
const featuresConfig = {
    // Authentication features
    auth: {
        enableRegistration: process.env.FEATURE_ENABLE_REGISTRATION !== 'false',
        enablePasswordReset: process.env.FEATURE_ENABLE_PASSWORD_RESET !== 'false',
        enableTwoFactor: process.env.FEATURE_ENABLE_2FA === 'true',
        enableSocialLogin: process.env.FEATURE_ENABLE_SOCIAL_LOGIN === 'true',
    },
    
    // Certificate features
    certificates: {
        enableRevocation: process.env.FEATURE_ENABLE_CERT_REVOCATION !== 'false',
        enableBulkIssue: process.env.FEATURE_ENABLE_BULK_ISSUE === 'true',
        enableQRCode: process.env.FEATURE_ENABLE_QR_CODE !== 'false',
    },
    
    // Student features
    students: {
        enableBulkImport: process.env.FEATURE_ENABLE_BULK_IMPORT === 'true',
        enableProfileEdit: process.env.FEATURE_ENABLE_PROFILE_EDIT !== 'false',
    },
    
    // Analytics features
    analytics: {
        enableDashboard: process.env.FEATURE_ENABLE_ANALYTICS !== 'false',
        enableReports: process.env.FEATURE_ENABLE_REPORTS !== 'false',
    },
};

/**
 * Business Rules Configuration
 */
const businessConfig = {
    // Academic rules
    academic: {
        minCreditsPerSemester: parseInt(process.env.MIN_CREDITS_PER_SEMESTER) || 16,
        maxCreditsPerSemester: parseInt(process.env.MAX_CREDITS_PER_SEMESTER) || 30,
        passingGrade: parseFloat(process.env.PASSING_GRADE) || 5.0,
        maxGrade: parseFloat(process.env.MAX_GRADE) || 10.0,
    },
    
    // Certificate validity
    certificate: {
        defaultValidityYears: parseInt(process.env.CERTIFICATE_VALIDITY_YEARS) || 10,
        enableExpiry: process.env.CERTIFICATE_ENABLE_EXPIRY === 'true',
    },
    
    // Approval workflow
    approval: {
        requireDepartmentApproval: process.env.REQUIRE_DEPT_APPROVAL !== 'false',
        requireAdminApproval: process.env.REQUIRE_ADMIN_APPROVAL !== 'false',
        autoApproveThreshold: parseFloat(process.env.AUTO_APPROVE_THRESHOLD) || 0, // 0 means disabled
    },
};

/**
 * Integration Configuration
 */
const integrationConfig = {
    // Email service (future use)
    email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        provider: process.env.EMAIL_PROVIDER || 'smtp',
        from: process.env.EMAIL_FROM || 'noreply@nitw.edu',
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        username: process.env.EMAIL_USERNAME,
        password: process.env.EMAIL_PASSWORD,
    },
    
    // SMS service (future use)
    sms: {
        enabled: process.env.SMS_ENABLED === 'true',
        provider: process.env.SMS_PROVIDER,
        apiKey: process.env.SMS_API_KEY,
    },
    
    // External APIs
    external: {
        verificationBaseUrl: process.env.VERIFICATION_BASE_URL || 'http://localhost:4200',
    },
};

/**
 * Performance Configuration
 */
const performanceConfig = {
    // Caching
    cache: {
        enabled: process.env.CACHE_ENABLED === 'true',
        ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
        checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 600, // 10 minutes
    },
    
    // Request limits
    limits: {
        jsonBodySize: process.env.JSON_BODY_LIMIT || '10mb',
        urlEncodedBodySize: process.env.URL_ENCODED_BODY_LIMIT || '10mb',
        maxQueryComplexity: parseInt(process.env.MAX_QUERY_COMPLEXITY) || 100,
    },
};

/**
 * Combined Application Configuration
 */
const APP_CONFIG = {
    server: serverConfig,
    fabric: fabricConfig,
    security: securityConfig,
    logging: loggingConfig,
    storage: storageConfig,
    events: eventConfig,
    features: featuresConfig,
    business: businessConfig,
    integration: integrationConfig,
    performance: performanceConfig,
};

/**
 * Helper Functions
 */

/**
 * Get the complete configuration object
 * @returns {Object} Complete configuration
 */
function getConfig() {
    return APP_CONFIG;
}

/**
 * Get a specific configuration section
 * @param {string} section - Section name (e.g., 'server', 'fabric', 'security')
 * @returns {Object} Section configuration
 */
function getConfigSection(section) {
    return APP_CONFIG[section] || null;
}

/**
 * Check if a feature is enabled
 * @param {string} category - Feature category (e.g., 'auth', 'certificates')
 * @param {string} feature - Feature name (e.g., 'enableRevocation')
 * @returns {boolean} Whether the feature is enabled
 */
function isFeatureEnabled(category, feature) {
    return APP_CONFIG.features[category]?.[feature] ?? false;
}

/**
 * Get Fabric connection profile path
 * @returns {string} Absolute path to connection profile
 */
function getConnectionProfilePath() {
    return path.resolve(APP_CONFIG.fabric.connectionProfilePath);
}

/**
 * Get wallet path
 * @returns {string} Absolute path to wallet directory
 */
function getWalletPath() {
    return path.resolve(APP_CONFIG.fabric.walletPath);
}

/**
 * Check if running in production
 * @returns {boolean} Whether running in production mode
 */
function isProduction() {
    return APP_CONFIG.server.nodeEnv === 'production';
}

/**
 * Check if running in development
 * @returns {boolean} Whether running in development mode
 */
function isDevelopment() {
    return APP_CONFIG.server.nodeEnv === 'development';
}

/**
 * Get API base URL
 * @returns {string} API base URL
 */
function getApiBaseUrl() {
    const { host, port, apiPrefix } = APP_CONFIG.server;
    const hostname = host === '0.0.0.0' ? 'localhost' : host;
    return `http://${hostname}:${port}${apiPrefix}`;
}

/**
 * Validate required configuration
 * Throws error if critical configuration is missing
 */
function validateConfig() {
    const required = [
        { path: 'fabric.channelName', value: APP_CONFIG.fabric.channelName },
        { path: 'fabric.chaincodeName', value: APP_CONFIG.fabric.chaincodeName },
        { path: 'security.jwt.secret', value: APP_CONFIG.security.jwt.secret },
        { path: 'server.port', value: APP_CONFIG.server.port },
    ];

    const missing = required.filter(item => !item.value);
    
    if (missing.length > 0) {
        const paths = missing.map(item => item.path).join(', ');
        throw new Error(`Missing required configuration: ${paths}`);
    }

    // Warn about default JWT secret in production
    if (isProduction() && APP_CONFIG.security.jwt.secret.includes('change-in-production')) {
        console.warn('WARNING: Using default JWT secret in production. Please set JWT_SECRET environment variable!');
    }
}

/**
 * Print configuration summary (for debugging)
 * @param {boolean} includeSecrets - Whether to include sensitive values (default: false)
 */
function printConfigSummary(includeSecrets = false) {
    console.log('=== Application Configuration Summary ===');
    console.log(`Environment: ${APP_CONFIG.server.nodeEnv}`);
    console.log(`Server: ${APP_CONFIG.server.host}:${APP_CONFIG.server.port}`);
    console.log(`API Prefix: ${APP_CONFIG.server.apiPrefix}`);
    console.log(`Channel: ${APP_CONFIG.fabric.channelName}`);
    console.log(`Chaincode: ${APP_CONFIG.fabric.chaincodeName}`);
    console.log(`MSP ID: ${APP_CONFIG.fabric.mspId}`);
    console.log(`Log Level: ${APP_CONFIG.logging.level}`);
    console.log(`Event Listener: ${APP_CONFIG.events.enabled ? 'Enabled' : 'Disabled'}`);
    
    if (includeSecrets) {
        console.log(`JWT Secret: ${APP_CONFIG.security.jwt.secret}`);
    }
    
    console.log('=========================================');
}

// Export configuration and helper functions
module.exports = {
    APP_CONFIG,
    getConfig,
    getConfigSection,
    isFeatureEnabled,
    getConnectionProfilePath,
    getWalletPath,
    isProduction,
    isDevelopment,
    getApiBaseUrl,
    validateConfig,
    printConfigSummary,
};
