# Academic Records Blockchain - Backend API

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![Hyperledger Fabric](https://img.shields.io/badge/Hyperledger_Fabric-2.5-orange.svg)](https://www.hyperledger.org/projects/fabric)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A production-ready Node.js REST API backend for managing academic records on Hyperledger Fabric blockchain. Built with Express.js and Fabric SDK, featuring comprehensive configuration management, authentication, and real-time event listening.

> **🔗 Related Repository**: [Academic Records Blockchain - Frontend]
> https://github.com/princekumar828/Academic-Records-Blockchain---Frontend  
> Modern Angular frontend with Material Design

---

## 📑 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Identity Management](#-identity-management)
- [Running the Server](#-running-the-server)
- [API Documentation](#-api-documentation)
- [Event Listener](#-event-listener)
- [Security](#-security)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## ✨ Features

### 🎯 Core Functionality
- **RESTful API**: Complete CRUD operations for all entities
- **Blockchain Integration**: Seamless interaction with Hyperledger Fabric
- **Identity Management**: User enrollment, registration, and wallet management
- **Event Listening**: Real-time blockchain event monitoring
- **Smart Contract Invocation**: Transaction submission and query operations

### 🔐 Security
- **JWT Authentication**: Token-based authentication system (ready for integration)
- **Rate Limiting**: Protect against DDoS attacks
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: HTTP security headers
- **Input Validation**: Request data validation and sanitization

### 📊 Advanced Features
- **Centralized Configuration**: Single source for all application settings
- **Feature Flags**: Enable/disable features without code changes
- **Comprehensive Logging**: Winston logger with file and console output
- **Health Checks**: Monitor application and blockchain status
- **Error Handling**: Graceful error handling with detailed messages
- **Performance Monitoring**: Request timing and metrics

### 🚀 Production Ready
- **PM2 Support**: Process management for production
- **Checkpoint System**: Event listener state persistence
- **Automatic Reconnection**: Resilient blockchain connections
- **Environment Detection**: Auto-configure for dev/prod
- **Graceful Shutdown**: Clean resource cleanup

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
│              (Angular 17 + Material Design)                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Server                        │
│                  (Node.js + Express.js)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Controllers  │  Middleware  │  Routes  │  Utils    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Fabric Gateway + SDK Client                │   │
│  │         (Connection Pool + Event Listener)           │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ Fabric SDK
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Hyperledger Fabric Network                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Peer0      │  │  Orderer     │  │   CA         │     │
│  │ NITWarangal  │  │  (Raft)      │  │ (Fabric-CA)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        Smart Contract (Chaincode - Go)               │  │
│  │  • CreateStudent    • ApproveRecord                  │  │
│  │  • CreateRecord     • IssueCertificate               │  │
│  │  • GetStudent       • RevokeCertificate              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    LevelDB / CouchDB                         │
│                   (World State Database)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Technology Stack

### Core Framework
- **Node.js 18.x**: JavaScript runtime
- **Express.js 4.x**: Web application framework
- **Fabric SDK 2.5**: Hyperledger Fabric client SDK

### Key Libraries
- **fabric-network**: Gateway and wallet management
- **fabric-ca-client**: Certificate Authority client
- **winston**: Advanced logging
- **helmet**: Security middleware
- **cors**: Cross-origin resource sharing
- **express-rate-limit**: Rate limiting middleware
- **dotenv**: Environment variable management
- **body-parser**: Request parsing
- **morgan**: HTTP request logger

### Development Tools
- **nodemon**: Auto-restart on file changes
- **PM2**: Production process manager
- **ESLint**: Code linting (optional)
- **Postman**: API testing

---

## 📂 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── app.config.js           # Centralized configuration
│   │
│   ├── controllers/
│   │   ├── authController.js       # Authentication logic
│   │   ├── studentController.js    # Student operations
│   │   ├── recordController.js     # Academic record operations
│   │   ├── certificateController.js # Certificate operations
│   │   ├── departmentController.js # Department operations
│   │   ├── facultyController.js    # Faculty operations
│   │   ├── statsController.js      # Statistics & analytics
│   │   └── identityController.js   # Identity management
│   │
│   ├── middleware/
│   │   ├── auth.js                 # JWT authentication middleware
│   │   ├── errorHandler.js         # Global error handler
│   │   └── validation.js           # Input validation
│   │
│   ├── routes/
│   │   ├── authRoutes.js           # Auth endpoints
│   │   ├── studentRoutes.js        # Student endpoints
│   │   ├── recordRoutes.js         # Record endpoints
│   │   ├── certificateRoutes.js    # Certificate endpoints
│   │   ├── departmentRoutes.js     # Department endpoints
│   │   ├── facultyRoutes.js        # Faculty endpoints
│   │   ├── statsRoutes.js          # Stats endpoints
│   │   └── identityRoutes.js       # Identity endpoints
│   │
│   ├── utils/
│   │   ├── logger.js               # Winston logger configuration
│   │   ├── validator.js            # Input validation helpers
│   │   └── helpers.js              # Utility functions
│   │
│   ├── scripts/
│   │   └── checkIdentities.js      # Check wallet identities
│   │
│   ├── fabricGateway.js            # Fabric SDK gateway wrapper
│   ├── fabricCAClient.js           # Fabric CA client wrapper
│   ├── eventListener.js            # Blockchain event listener
│   ├── enrollAdmin.js              # Enroll admin identity
│   ├── registerUser.js             # Register new users
│   ├── importAdmin.js              # Import admin from cryptogen
│   └── server.js                   # Express server setup
│
├── wallet/                         # Fabric identities wallet
├── logs/                           # Application logs
├── checkpoints/                    # Event listener checkpoints
├── data/                           # Application data
│
├── .env                            # Environment variables (create from .env.example)
├── .env.example                    # Environment template
├── .gitignore                      # Git ignore rules
├── package.json                    # Dependencies and scripts
├── package-lock.json               # Locked dependencies
└── README.md                       # This file
```

---

## 📋 Prerequisites

### Required Software
- **Node.js**: Version 18.x or higher
  ```bash
  node --version  # Should be v18.x or higher
  ```
- **npm**: Version 9.x or higher
  ```bash
  npm --version   # Should be v9.x or higher
  ```

### Required Infrastructure
- **Hyperledger Fabric Network**: Running fabric network
  - Channel created: `academic-records-channel`
  - Chaincode deployed: `academic-records`
  - Organization: `NITWarangalMSP`
  - CA running on `localhost:8054`

### System Requirements
- **OS**: Linux, macOS, or Windows with WSL2
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 2GB free

---

## 🚀 Installation

### 1. Navigate to Backend Directory
```bash
cd /path/to/Academic_RecordsBlockchain/nit-warangal-network/backend
```

### 2. Install Dependencies
```bash
npm install
```

This will install all required packages:
- Express and middleware
- Hyperledger Fabric SDK
- Logging and security packages
- All dependencies from `package.json`

### 3. Create Environment File
```bash
cp .env.example .env
```

### 4. Configure Environment Variables
Edit `.env` file with your settings:
```bash
nano .env
# or
code .env
```

**Minimum required configuration:**
```env
NODE_ENV=development
PORT=3000
CHANNEL_NAME=academic-records-channel
CHAINCODE_NAME=academic-records
JWT_SECRET=your-unique-secret-key-here
```

### 5. Verify Installation
```bash
npm run check
# or
node --version && npm --version
```

---

## ⚙️ Configuration

### Centralized Configuration System

All settings are managed in `src/config/app.config.js` with 10 major sections:

#### 1. Server Configuration
```javascript
APP_CONFIG.server = {
    port: 3000,
    host: '0.0.0.0',
    nodeEnv: 'development',
    apiPrefix: '/api',
    requestTimeout: 30000,
    keepAliveTimeout: 65000
}
```

#### 2. Fabric Configuration
```javascript
APP_CONFIG.fabric = {
    channelName: 'academic-records-channel',
    chaincodeName: 'academic-records',
    mspId: 'NITWarangalMSP',
    connectionProfilePath: '../../../organizations/.../connection-nitwarangal.json',
    walletPath: './wallet',
    admin: { userId: 'admin', password: 'adminpw' },
    ca: { url: 'https://localhost:8054', name: 'ca-nitwarangal' },
    gateway: { discovery: { enabled: true, asLocalhost: true } }
}
```

#### 3. Security Configuration
```javascript
APP_CONFIG.security = {
    jwt: { 
        secret: 'your-secret-key',
        expiresIn: '24h',
        algorithm: 'HS256'
    },
    cors: {
        origins: ['http://localhost:4200'],
        credentials: true
    },
    rateLimit: {
        windowMs: 900000,      // 15 minutes
        maxRequests: 100
    },
    password: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true
    }
}
```

#### 4. Logging Configuration
```javascript
APP_CONFIG.logging = {
    level: 'info',                    // debug, info, warn, error
    format: 'json',
    file: {
        enabled: true,
        path: './logs/app.log',
        maxSize: '20m',
        maxFiles: 5
    },
    console: { enabled: true, colorize: true }
}
```

#### 5. Event Listener Configuration
```javascript
APP_CONFIG.events = {
    enabled: true,
    events: {
        studentCreated: true,
        recordSubmitted: true,
        recordApproved: true,
        certificateIssued: true,
        certificateRevoked: true
    },
    reconnect: {
        enabled: true,
        maxRetries: 5,
        retryDelay: 5000
    }
}
```

#### 6. Feature Flags
```javascript
APP_CONFIG.features = {
    auth: {
        enableRegistration: true,
        enablePasswordReset: true,
        enableTwoFactor: false
    },
    certificates: {
        enableRevocation: true,
        enableBulkIssue: false,
        enableQRCode: true
    },
    analytics: {
        enableDashboard: true,
        enableReports: true
    }
}
```

#### 7. Business Rules
```javascript
APP_CONFIG.business = {
    academic: {
        minCreditsPerSemester: 16,
        maxCreditsPerSemester: 30,
        passingGrade: 5.0,
        maxGrade: 10.0
    },
    certificate: {
        defaultValidityYears: 10,
        enableExpiry: false
    }
}
```

#### 8. Integration Configuration
```javascript
APP_CONFIG.integration = {
    email: {
        enabled: false,
        provider: 'smtp',
        from: 'noreply@nitw.edu'
    },
    external: {
        verificationBaseUrl: 'http://localhost:4200'
    }
}
```

#### 9. Performance Configuration
```javascript
APP_CONFIG.performance = {
    cache: {
        enabled: false,
        ttl: 300
    },
    limits: {
        jsonBodySize: '10mb',
        urlEncodedBodySize: '10mb'
    }
}
```

#### 10. Storage Configuration
```javascript
APP_CONFIG.storage = {
    checkpoint: {
        enabled: true,
        path: './checkpoints/checkpoint.json',
        saveInterval: 5000
    },
    dataDir: './data'
}
```

### Configuration Helper Functions

```javascript
const { 
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
    printConfigSummary
} = require('./config/app.config');

// Usage examples
const port = APP_CONFIG.server.port;
const channelName = APP_CONFIG.fabric.channelName;

if (isFeatureEnabled('certificates', 'enableRevocation')) {
    // Revocation logic
}

const ccpPath = getConnectionProfilePath();
const walletPath = getWalletPath();
```

### Environment Variables

All configuration can be overridden via environment variables in `.env`:

```env
# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
API_PREFIX=/api

# ============================================
# FABRIC CONFIGURATION
# ============================================
CHANNEL_NAME=academic-records-channel
CHAINCODE_NAME=academic-records
MSP_ID=NITWarangalMSP
ADMIN_USER_ID=admin
ADMIN_PASSWORD=adminpw

# ============================================
# SECURITY CONFIGURATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
CORS_ORIGINS=http://localhost:4200,http://localhost:3001
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# LOGGING CONFIGURATION
# ============================================
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# ============================================
# FEATURE FLAGS
# ============================================
FEATURE_ENABLE_CERT_REVOCATION=true
FEATURE_ENABLE_ANALYTICS=true
ENABLE_EVENT_LISTENER=true
```

---

## 🔐 Identity Management

### Understanding Fabric Identities

Hyperledger Fabric requires identities (X.509 certificates) to interact with the network. Identities are stored in a wallet.

### 1. Enroll Admin Identity

**First time setup - Enroll the admin:**

```bash
node src/enrollAdmin.js
```

**Expected output:**
```
Successfully enrolled admin user and imported it to the wallet
```

**What this does:**
- Connects to Fabric CA
- Enrolls admin with credentials
- Stores certificate in `wallet/admin.id`

### 2. Import Admin from Cryptogen (Alternative)

If using cryptogen for network setup:

```bash
node src/importAdmin.js
```

### 3. Register Additional Users

Register users with different roles:

```bash
# Register a department user
node src/registerUser.js dept-cse department CSE

# Register a faculty member
node src/registerUser.js faculty-john faculty CSE

# Register a student
node src/registerUser.js student-123 student CSE
```

**Syntax:**
```bash
node src/registerUser.js <userId> <role> <department>
```

**Roles:** `admin`, `department`, `faculty`, `student`, `verifier`

### 4. Check Wallet Identities

```bash
node src/scripts/checkIdentities.js
```

**Output shows:**
```
Wallet identities:
- admin (admin)
- dept-cse (department)
- faculty-john (faculty)
```

### 5. Identity Structure

Wallet location: `backend/wallet/`

Each identity contains:
- **Certificate**: X.509 certificate
- **Private Key**: User's private key
- **MSP ID**: Organization identifier
- **Type**: X.509 identity type

---

## 💻 Running the Server

### Development Mode

**With auto-reload (recommended for development):**

```bash
npm run dev
```

Uses `nodemon` to automatically restart on file changes.

### Production Mode

**Standard production start:**

```bash
npm start
```

**With PM2 (recommended for production):**

```bash
# Start with PM2
pm2 start src/server.js --name academic-records-api

# View logs
pm2 logs academic-records-api

# Monitor
pm2 monit

# Stop
pm2 stop academic-records-api

# Restart
pm2 restart academic-records-api

# Delete
pm2 delete academic-records-api
```

### Environment-Specific Startup

```bash
# Development
NODE_ENV=development npm start

# Production
NODE_ENV=production npm start

# Custom port
PORT=4000 npm start
```

### Verify Server is Running

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response:
{
  "success": true,
  "message": "Server is running",
  "environment": "development",
  "timestamp": "2025-11-17T04:46:00.000Z",
  "eventListener": { "isListening": false }
}
```

### Server Startup Output

```
=== Application Configuration Summary ===
Environment: development
Server: 0.0.0.0:3000
API Prefix: /api
Channel: academic-records-channel
Chaincode: academic-records
MSP ID: NITWarangalMSP
Log Level: info
Event Listener: Enabled
=========================================

🚀 Academic Records Backend Server running on 0.0.0.0:3000
📡 Environment: development
📋 Health check: http://localhost:3000/health
🔗 API Base URL: http://localhost:3000/api
🔗 Channel: academic-records-channel
📦 Chaincode: academic-records
```

---

## 📚 API Documentation

### Base URL

```
Development: http://localhost:3000/api
Production:  https://your-domain.com/api
```

### Authentication

Most endpoints require JWT authentication (implementation ready):

```http
Authorization: Bearer <jwt_token>
```

### Response Format

All responses follow this structure:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### API Endpoints

#### Authentication (`/api/auth`)

```http
POST   /api/auth/login          # User login (ready for implementation)
POST   /api/auth/register       # User registration
POST   /api/auth/logout         # User logout
POST   /api/auth/refresh        # Refresh JWT token
GET    /api/auth/me             # Get current user
```

#### Students (`/api/students`)

```http
POST   /api/students                    # Create student
GET    /api/students                    # Get all students
GET    /api/students/:rollNumber        # Get student by roll number
PATCH  /api/students/:rollNumber/status # Update student status
GET    /api/students/:rollNumber/records # Get student's records
GET    /api/students/:rollNumber/certificates # Get student's certificates
```

**Example - Create Student:**
```bash
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "S2025001",
    "name": "John Doe",
    "rollNumber": "22MCF1R01",
    "email": "john@student.nitw.ac.in",
    "department": "CSE",
    "program": "M.Tech",
    "enrollmentYear": 2022,
    "dateOfBirth": "2000-01-01",
    "phoneNumber": "9876543210"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "studentId": "S2025001",
    "name": "John Doe",
    "rollNumber": "22MCF1R01",
    "status": "ACTIVE"
  }
}
```

#### Academic Records (`/api/records`)

```http
POST   /api/records                     # Create academic record
GET    /api/records/student/:studentId  # Get student records
GET    /api/records/:recordId           # Get specific record
POST   /api/records/:recordId/approve   # Approve record (admin)
GET    /api/records/department/:dept    # Get department records
GET    /api/records/pending             # Get pending approvals
```

**Example - Create Record:**
```bash
curl -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "S2025001",
    "semester": 1,
    "academicYear": "2022-2023",
    "courses": [
      {
        "courseCode": "CS501",
        "courseName": "Advanced Algorithms",
        "credits": 4,
        "grade": 9.5
      }
    ]
  }'
```

#### Certificates (`/api/certificates`)

```http
POST   /api/certificates                # Issue certificate
GET    /api/certificates/:certificateId # Get certificate
POST   /api/certificates/verify         # Verify certificate
POST   /api/certificates/:id/revoke     # Revoke certificate
GET    /api/certificates/student/:studentId # Get student certificates
```

**Example - Issue Certificate:**
```bash
curl -X POST http://localhost:3000/api/certificates \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "S2025001",
    "certificateType": "DEGREE",
    "issueDate": "2025-06-15",
    "expiryDate": "2035-06-15",
    "details": {
      "degree": "Master of Technology",
      "specialization": "Computer Science",
      "cgpa": 8.75
    }
  }'
```

**Example - Verify Certificate:**
```bash
curl -X POST http://localhost:3000/api/certificates/verify \
  -H "Content-Type: application/json" \
  -d '{
    "certificateId": "CERT-2025-001"
  }'
```

#### Departments (`/api/department`)

```http
POST   /api/department              # Create department
GET    /api/department              # Get all departments
GET    /api/department/:code        # Get department details
GET    /api/department/:code/students # Get department students
GET    /api/department/:code/stats  # Get department statistics
```

#### Faculty (`/api/faculty`)

```http
POST   /api/faculty                 # Create faculty
GET    /api/faculty                 # Get all faculty
GET    /api/faculty/:facultyId      # Get faculty details
GET    /api/faculty/:facultyId/students # Get faculty's students
```

#### Statistics (`/api/stats`)

```http
GET    /api/stats/dashboard         # Get dashboard statistics
GET    /api/stats/students          # Get student statistics
GET    /api/stats/records           # Get record statistics
GET    /api/stats/certificates      # Get certificate statistics
GET    /api/stats/department/:dept  # Get department statistics
```

**Example - Dashboard Stats:**
```bash
curl http://localhost:3000/api/stats/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStudents": 150,
    "totalRecords": 450,
    "totalCertificates": 45,
    "pendingApprovals": 12,
    "activeStudents": 145,
    "departments": 5
  }
}
```

#### Identities (`/api/identities`)

```http
POST   /api/identities/register     # Register new identity
GET    /api/identities              # List all identities
GET    /api/identities/:userId      # Get identity details
DELETE /api/identities/:userId      # Remove identity
```

#### Events (`/api/events`)

```http
GET    /api/events/status           # Get event listener status
POST   /api/events/start            # Start event listener
POST   /api/events/stop             # Stop event listener
```

### Postman Collection

Import the included Postman collection:

```bash
backend/postman_collection.json
```

Contains pre-configured requests for all endpoints.

---

## 📡 Event Listener

### Overview

The event listener monitors blockchain events in real-time and maintains a checkpoint for resilience.

### Features

- **Real-time Monitoring**: Listen to chaincode events
- **Checkpoint System**: Resume from last processed block
- **Automatic Reconnection**: Reconnect on network failures
- **Event Types**:
  - `StudentCreated`
  - `RecordSubmitted`
  - `RecordApproved`
  - `CertificateIssued`
  - `CertificateRevoked`

### Configuration

In `.env` or `app.config.js`:

```javascript
ENABLE_EVENT_LISTENER=true
EVENT_STUDENT_CREATED=true
EVENT_RECORD_SUBMITTED=true
EVENT_RECORD_APPROVED=true
EVENT_CERTIFICATE_ISSUED=true
EVENT_CERTIFICATE_REVOKED=true
EVENT_CHECKPOINT_FILE=./checkpoints/checkpoint.json
EVENT_RECONNECT_ENABLED=true
EVENT_RECONNECT_MAX_RETRIES=5
```

### Usage

**Automatic start (on server startup):**
```javascript
// Enabled by default if ENABLE_EVENT_LISTENER=true
```

**Manual control via API:**

```bash
# Start listening
curl -X POST http://localhost:3000/api/events/start

# Check status
curl http://localhost:3000/api/events/status

# Stop listening
curl -X POST http://localhost:3000/api/events/stop
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isListening": true,
    "eventsReceived": 45,
    "lastEventTime": "2025-11-17T04:30:00.000Z",
    "currentBlock": 125
  }
}
```

### Checkpoint System

Events are checkpointed to survive restarts:

**Checkpoint file:** `checkpoints/checkpoint.json`

```json
{
  "blockNumber": 125,
  "transactionId": "abc123...",
  "timestamp": "2025-11-17T04:30:00.000Z",
  "eventsProcessed": 45
}
```

On restart, listening resumes from the last checkpoint.

### Event Handler Example

```javascript
// In eventListener.js
async handleStudentCreated(event) {
    const payload = JSON.parse(event.payload.toString());
    logger.info('Student created:', payload);
    
    // Custom logic here
    // - Send notification
    // - Update cache
    // - Trigger webhook
}
```

---

## 🔒 Security

### Security Measures

1. **Helmet Security Headers**
   - XSS protection
   - Content Security Policy
   - HSTS enforcement
   - Frame guard

2. **CORS Protection**
   ```javascript
   cors: {
       origins: ['http://localhost:4200'],
       credentials: true,
       methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
   }
   ```

3. **Rate Limiting**
   ```javascript
   rateLimit: {
       windowMs: 900000,  // 15 minutes
       maxRequests: 100
   }
   ```

4. **JWT Authentication** (Ready for implementation)
   ```javascript
   jwt: {
       secret: process.env.JWT_SECRET,
       expiresIn: '24h',
       algorithm: 'HS256'
   }
   ```

5. **Input Validation**
   - Request body validation
   - SQL injection prevention
   - XSS sanitization

6. **Error Handling**
   - No stack traces in production
   - Sanitized error messages
   - Comprehensive logging

### Best Practices

**In Production:**

1. **Change JWT Secret:**
   ```env
   JWT_SECRET=use-a-strong-random-secret-key-here
   ```

2. **Use HTTPS:**
   ```env
   NODE_ENV=production
   ```

3. **Restrict CORS:**
   ```env
   CORS_ORIGINS=https://your-frontend-domain.com
   ```

4. **Enable Rate Limiting:**
   ```env
   RATE_LIMIT_MAX_REQUESTS=50
   ```

5. **Secure Environment Variables:**
   - Never commit `.env` to git
   - Use secrets management (AWS Secrets Manager, etc.)

6. **Regular Updates:**
   ```bash
   npm audit
   npm audit fix
   ```

---

## 🧪 Testing

### Manual Testing

**1. Health Check:**
```bash
curl http://localhost:3000/health
```

**2. Create Student:**
```bash
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{"studentId":"TEST001","name":"Test User","rollNumber":"TEST123",...}'
```

**3. Get All Students:**
```bash
curl http://localhost:3000/api/students
```

### Automated Testing

**Unit Tests (when implemented):**
```bash
npm test
```

**Integration Tests:**
```bash
npm run test:integration
```

### Testing Tools

- **Postman**: Import `postman_collection.json`
- **cURL**: Command-line testing
- **Insomnia**: Alternative REST client

### Test Data

Use the provided test scripts:

```bash
# Create test students
node src/scripts/createTestData.js

# Verify blockchain state
node src/scripts/verifyState.js
```

---

## 🚀 Deployment

### Production Deployment

#### 1. Prepare Environment

```bash
# Set production environment
export NODE_ENV=production

# Update .env with production values
cp .env.example .env.production
nano .env.production
```

#### 2. Install Production Dependencies

```bash
npm ci --production
```

#### 3. Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/server.js --name academic-records-api \
  --instances 2 \
  --env production

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

#### 4. Configure Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name api.yoursite.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5. SSL/TLS Setup (Let's Encrypt)

```bash
sudo certbot --nginx -d api.yoursite.com
```

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
```

**Build and run:**
```bash
docker build -t academic-records-api .
docker run -d -p 3000:3000 --env-file .env academic-records-api
```

### Environment Variables in Production

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<strong-random-secret>
CORS_ORIGINS=https://yourfrontend.com
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=50
```

### Monitoring

**PM2 Monitoring:**
```bash
pm2 monit
pm2 logs academic-records-api
pm2 status
```

**Application Logs:**
```bash
tail -f logs/app.log
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Cannot Connect to Fabric Network

**Error:** `Failed to connect to Fabric gateway`

**Solutions:**
```bash
# Check if Fabric network is running
docker ps | grep peer
docker ps | grep orderer

# Verify connection profile exists
ls -la ../organizations/peerOrganizations/nitwarangal.nitw.edu/connection-nitwarangal.json

# Check wallet has admin identity
ls -la wallet/

# Re-enroll admin if needed
node src/enrollAdmin.js
```

#### 2. Admin Identity Not Found

**Error:** `admin identity does not exist in the wallet`

**Solutions:**
```bash
# Enroll admin
node src/enrollAdmin.js

# Or import from cryptogen
node src/importAdmin.js

# Verify wallet
node src/scripts/checkIdentities.js
```

#### 3. Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solutions:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=4000 npm start
```

#### 4. Module Not Found

**Error:** `Cannot find module 'express'`

**Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Or
npm ci
```

#### 5. Certificate Verification Failed

**Error:** `certificate verification failed`

**Solutions:**
```bash
# Check CA is running
docker ps | grep ca

# Verify CA URL in .env
CA_URL=https://localhost:8054

# Check TLS certificate path
ls -la ../organizations/peerOrganizations/.../ca/*.pem
```

#### 6. Event Listener Errors

**Error:** `Event listener connection failed`

**Solutions:**
```bash
# Check chaincode is running
docker ps | grep chaincode

# Verify channel name
echo $CHANNEL_NAME

# Restart event listener via API
curl -X POST http://localhost:3000/api/events/stop
curl -X POST http://localhost:3000/api/events/start
```

### Debug Mode

Enable detailed logging:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

View logs:
```bash
tail -f logs/app.log
```

### Fabric Network Issues

```bash
# Check Fabric network status
cd ../
./network.sh status

# Restart network if needed
./network.sh down
./network.sh up

# Redeploy chaincode
./network.sh deployCC
```

---

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make changes:**
   - Follow Node.js best practices
   - Add tests for new features
   - Update documentation

4. **Commit changes:**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

5. **Push to branch:**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Create Pull Request**

### Coding Standards

- **Style Guide:** Follow Airbnb JavaScript Style Guide
- **Linting:** Use ESLint (when configured)
- **Formatting:** Use Prettier (when configured)
- **Comments:** Document complex logic
- **Error Handling:** Always handle errors gracefully
- **Logging:** Use Winston logger, not console.log

### Commit Message Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
perf: Performance improvement
```

---

## 📞 Support

### Resources

- **Hyperledger Fabric Docs**: [https://hyperledger-fabric.readthedocs.io](https://hyperledger-fabric.readthedocs.io)
- **Fabric SDK Node**: [https://hyperledger.github.io/fabric-sdk-node/](https://hyperledger.github.io/fabric-sdk-node/)
- **Express.js Docs**: [https://expressjs.com](https://expressjs.com)
- **Issues**: [GitHub Issues](https://github.com/princekumar828/Academic_RecordsBlockchain/issues)

### Contact

- **Email**: princekumar828@example.com
- **GitHub**: [@princekumar828](https://github.com/princekumar828)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Hyperledger Fabric team for the amazing blockchain framework
- Express.js team for the web framework
- NIT Warangal for the use case
- Open source community

---

## 📊 Project Statistics

- **Total Lines of Code**: ~8,000+
- **API Endpoints**: 40+
- **Configuration Options**: 150+
- **Supported Operations**: Complete CRUD for all entities
- **Production Ready**: ✅ PM2, logging, monitoring, security

---

**Built with ❤️ for NIT Warangal Academic Records Blockchain**

*Version 1.0.0 - November 2025*
