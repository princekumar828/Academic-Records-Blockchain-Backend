require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const FabricGateway = require('./fabricGateway');
const EventListener = require('./eventListener');
const { 
    APP_CONFIG, 
    validateConfig, 
    printConfigSummary,
    isDevelopment 
} = require('./config/app.config');

// Validate configuration on startup
try {
    validateConfig();
    if (isDevelopment()) {
        printConfigSummary();
    }
} catch (error) {
    console.error('Configuration validation failed:', error.message);
    process.exit(1);
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const recordRoutes = require('./routes/recordRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const identityRoutes = require('./routes/identityRoutes');
const statsRoutes = require('./routes/statsRoutes');
const departmentRoutes = require('./routes/departmentRoutes');

const app = express();

// Global event listener instance
let eventListener = null;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: APP_CONFIG.security.cors.origins,
    credentials: APP_CONFIG.security.cors.credentials,
    methods: APP_CONFIG.security.cors.methods,
    allowedHeaders: APP_CONFIG.security.cors.allowedHeaders
}));
app.use(bodyParser.json({ limit: APP_CONFIG.performance.limits.jsonBodySize }));
app.use(bodyParser.urlencoded({ 
    extended: true, 
    limit: APP_CONFIG.performance.limits.urlEncodedBodySize 
}));

// Logging
if (APP_CONFIG.logging.requests.enabled) {
    app.use(morgan(APP_CONFIG.logging.requests.format, {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: APP_CONFIG.security.rateLimit.windowMs,
    max: APP_CONFIG.security.rateLimit.maxRequests,
    message: APP_CONFIG.security.rateLimit.message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: APP_CONFIG.security.rateLimit.skipSuccessfulRequests
});
app.use(`${APP_CONFIG.server.apiPrefix}/`, limiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        environment: APP_CONFIG.server.nodeEnv,
        timestamp: new Date().toISOString(),
        eventListener: eventListener ? eventListener.getStatus() : { isListening: false }
    });
});

// Simple test endpoint
app.get('/test', (req, res) => {
    res.send('OK');
});

// API Routes
app.use(`${APP_CONFIG.server.apiPrefix}/auth`, authRoutes);
app.use(`${APP_CONFIG.server.apiPrefix}/students`, studentRoutes);
app.use(`${APP_CONFIG.server.apiPrefix}/records`, recordRoutes);
app.use(`${APP_CONFIG.server.apiPrefix}/certificates`, certificateRoutes);
app.use(`${APP_CONFIG.server.apiPrefix}/identities`, identityRoutes);
app.use(`${APP_CONFIG.server.apiPrefix}/stats`, statsRoutes);
app.use(`${APP_CONFIG.server.apiPrefix}/department`, departmentRoutes);

// Event listener status endpoint
app.get(`${APP_CONFIG.server.apiPrefix}/events/status`, (req, res) => {
    if (eventListener) {
        res.status(200).json({
            success: true,
            data: eventListener.getStatus()
        });
    } else {
        res.status(200).json({
            success: true,
            data: { isListening: false, message: 'Event listener not initialized' }
        });
    }
});

// Start/stop event listener endpoints
app.post(`${APP_CONFIG.server.apiPrefix}/events/start`, async (req, res) => {
    try {
        if (eventListener && eventListener.getStatus().isListening) {
            return res.status(400).json({
                success: false,
                message: 'Event listener is already running'
            });
        }

        const gateway = new FabricGateway();
        await gateway.connect('admin');
        const network = gateway.getNetwork();
        const contract = gateway.getContract();

        eventListener = new EventListener(network, contract);
        await eventListener.startListening();

        res.status(200).json({
            success: true,
            message: 'Event listener started successfully',
            data: eventListener.getStatus()
        });
    } catch (error) {
        logger.error(`Error starting event listener: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post(`${APP_CONFIG.server.apiPrefix}/events/stop`, async (req, res) => {
    try {
        if (!eventListener) {
            return res.status(400).json({
                success: false,
                message: 'Event listener is not running'
            });
        }

        await eventListener.stopListening();
        eventListener = null;

        res.status(200).json({
            success: true,
            message: 'Event listener stopped successfully'
        });
    } catch (error) {
        logger.error(`Error stopping event listener: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`, { stack: err.stack });
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Initialize event listener on server start
async function initializeEventListener() {
    // Disabled due to SDK compatibility issues
    // Event listener functionality can be added later
    logger.info('Event listener disabled - SDK compatibility issue');
    logger.info('Server running without event notifications');
    return;
    
    if (APP_CONFIG.events.enabled) {
        try {
            logger.info('Initializing event listener...');
            const gateway = new FabricGateway();
            await gateway.connect(APP_CONFIG.fabric.admin.userId);
            const network = gateway.getNetwork();
            const contract = gateway.getContract();

            eventListener = new EventListener(network, contract);
            await eventListener.startListening();
            logger.info('Event listener initialized successfully');
        } catch (error) {
            logger.error(`Failed to initialize event listener: ${error.message}`);
            logger.warn('Server will start without event listener. You can start it manually via API.');
        }
    }
}

// Start server
app.listen(APP_CONFIG.server.port, APP_CONFIG.server.host, async () => {
    logger.info(`🚀 Academic Records Backend Server running on ${APP_CONFIG.server.host}:${APP_CONFIG.server.port}`);
    logger.info(`📡 Environment: ${APP_CONFIG.server.nodeEnv}`);
    logger.info(`📋 Health check: http://localhost:${APP_CONFIG.server.port}/health`);
    logger.info(`🔗 API Base URL: http://localhost:${APP_CONFIG.server.port}${APP_CONFIG.server.apiPrefix}`);
    logger.info(`🔗 Channel: ${APP_CONFIG.fabric.channelName}`);
    logger.info(`📦 Chaincode: ${APP_CONFIG.fabric.chaincodeName}`);
    
    // Initialize event listener
    await initializeEventListener();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    
    if (eventListener) {
        await eventListener.stopListening();
    }
    
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Shutting down gracefully...');
    
    if (eventListener) {
        await eventListener.stopListening();
    }
    
    process.exit(0);
});

module.exports = app;
