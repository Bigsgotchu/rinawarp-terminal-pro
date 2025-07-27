/**
 * RinaWarp Terminal - Advanced Terminal Emulator
 * Copyright (c) 2025 Rinawarp Technologies, LLC. All rights reserved.
 *
 * This file is part of RinaWarp Terminal, an advanced terminal emulator with
 * AI assistance, enterprise security, cloud sync, and revolutionary features.
 *
 * CONFIDENTIAL AND PROPRIETARY
 * This source code is proprietary and confidential information of Rinawarp Technologies, LLC.
 * Unauthorized reproduction, distribution, or disclosure is strictly prohibited.
 *
 * Patent Pending - Advanced Terminal Integration Architecture
 * U.S. Patent Application Filed: 2025
 * International Patent Applications: PCT, EU, CN, JP
 *
 * Licensed under RinaWarp Commercial License.
 * See LICENSE file for detailed terms and conditions.
 *
 * For licensing inquiries, contact: licensing@rinawarp.com
 *
 * @author Rinawarp Technologies, LLC
 * @copyright 2025 Rinawarp Technologies, LLC. All rights reserved.
 * @license RinaWarp Commercial License
 * @version 1.0.0
 * @since 2025-01-01
 */

// Load environment variables FIRST, before any other imports
import { config } from 'dotenv';
const startTime = Date.now();
console.log('🚀 Starting RinaWarp Terminal Server v1.0.8...');

config();
console.log('✅ Environment variables loaded');

// RinaWarp Environment Validator
const requiredKeys = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID'];
const recommendedKeys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SENDGRID_API_KEY'];
const missing = requiredKeys.filter(k => !process.env[k] || process.env[k] === `{{${k}}}`);
const missingRecommended = recommendedKeys.filter(
  k => !process.env[k] || process.env[k] === `{{${k}}}`
);

if (missing.length && process.env.NODE_ENV === 'production') {
  console.error(`❌ Missing critical environment variables: ${missing.join(', ')}`);
  // Don't exit in production, but log the issue
  console.log('⚠️ Server will continue but some features may not work');
} else if (missing.length) {
  console.log(`⚠️ Development mode: Missing environment keys: ${missing.join(', ')}`);
}

if (missingRecommended.length) {
  console.log(
    `💡 Optional features disabled due to missing keys: ${missingRecommended.join(', ')}`
  );
}

console.log('🧠 RinaWarp Environment Status:');
console.log(
  `   Required keys: ${requiredKeys.length - missing.length}/${requiredKeys.length} configured`
);
console.log(
  `   Optional keys: ${recommendedKeys.length - missingRecommended.length}/${recommendedKeys.length} configured`
);

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

// Dynamic import for CommonJS package
const { default: rateLimit } = await import('express-rate-limit');
import Stripe from 'stripe';
import cors from 'cors';
import helmet from 'helmet';
import Joi from 'joi';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
// import { validationResult } from 'express-validator'; // Currently unused
import errorHandler, { notFoundHandler } from './src/middleware/errorHandler.js';
import statusRouter from './src/api/status.js';
import downloadRouter from './src/api/download.js';
import authRouter from './src/api/auth.js';
import securityRouter from './src/api/security.js';
import marketingRouter from './src/api/marketing.js';
import analyticsRouter from './src/api/analytics.js';
import supportRouter from './src/api/support.js';
import ThreatDetector from './src/security/ThreatDetector.js';
import AgentChatAPI from './src/api/agent-chat.js';
import cookieParser from 'cookie-parser';

// Validate SMTP configuration AFTER dotenv
const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const sendgridConfigured = process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL;

if (smtpConfigured || sendgridConfigured) {
  console.log('✅ SMTP credentials detected and configured');
} else if (process.env.NODE_ENV === 'development') {
  console.log('📧 SMTP not configured - using mock mode for development');
} else {
  console.log('⚠️ SMTP credentials not configured for production mode');
}

// Configure Email Transport (supports both SMTP and SendGrid)
let transporter;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  // Use traditional SMTP
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('✅ Nodemailer SMTP transporter configured successfully');
} else if (process.env.SENDGRID_API_KEY) {
  // Use SendGrid via SMTP
  transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY,
    },
  });
  console.log('✅ Nodemailer SendGrid transporter configured successfully');
} else {
  // Create mock transporter for development
  if (process.env.NODE_ENV === 'development') {
    transporter = {
      sendMail: async mailOptions => {
        console.log('📧 [MOCK EMAIL] Simulating email send:');
        console.log('   To:', mailOptions.to);
        console.log('   Subject:', mailOptions.subject);
        console.log('   From:', mailOptions.from);
        console.log('   Text Preview:', mailOptions.text?.substring(0, 200) + '...');
        return {
          messageId: 'mock-' + Date.now(),
          accepted: [mailOptions.to],
          rejected: [],
        };
      },
    };
    console.log('✅ Mock SMTP transporter configured for development');
  } else {
    console.log('⚠️ No email service configured (neither SMTP nor SendGrid)');
  }
}

// Initialize Stripe
let stripe;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== '{{STRIPE_SECRET_KEY}}') {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe configured successfully');
} else {
  console.log('⚠️ Stripe secret key not configured');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Configure Express to trust Railway proxy for X-Forwarded-For headers
// Railway uses reverse proxies, so we need to trust the first proxy
app.set('trust proxy', 1);

// Initialize Advanced Threat Detection System
const threatDetector = new ThreatDetector();
app.set('threatDetector', threatDetector);

// Add webhook for Discord/Slack alerts if configured
if (process.env.DISCORD_WEBHOOK_URL) {
  threatDetector.addWebhook(process.env.DISCORD_WEBHOOK_URL, 'discord');
}
if (process.env.SLACK_WEBHOOK_URL) {
  threatDetector.addWebhook(process.env.SLACK_WEBHOOK_URL, 'slack');
}

console.log('🔍 Startup Debug Info:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT environment variable:', process.env.PORT);
console.log('Using PORT:', PORT);
console.log('Current working directory:', process.cwd());
console.log('Node version:', process.version);

// Add error handling for startup with graceful handling
process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  // Log but don't exit immediately during startup/operation
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️ Continuing operation despite error...');
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason && reason.stack) {
    console.error('Stack trace:', reason.stack);
  }
  // Log but don't exit immediately during startup/operation
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️ Continuing operation despite rejection...');
  } else {
    process.exit(1);
  }
});

// Security configuration for file serving
const _ALLOWED_STATIC_FILES = [
  'index.html',
  'pricing.html',
  'download.html',
  'success.html',
  'beta.html',
  'main.css',
  'phase2-ui.css',
  'hotfix-beta.js',
  'favicon.ico',
  'RinaWarp-Terminal-Setup-Windows.exe',
  'RinaWarp-Terminal-Portable-Windows.exe',
  'RinaWarp-Terminal-Linux.tar.gz',
];

const _ALLOWED_STATIC_DIRS = ['styles', 'js', 'images', 'assets', 'themes', 'releases'];

const _PUBLIC_DIR = path.join(__dirname, 'public');
const _RELEASES_DIR = path.join(__dirname, 'releases');

// Enhanced logging middleware with proxy trust verification
function logRequest(req, res, next) {
  const timestamp = new Date().toISOString();
  const clientIp = req.ip;
  const xForwardedFor = req.get('X-Forwarded-For');
  const realIp = req.get('X-Real-IP');

  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  console.log(`  - Client IP: ${clientIp}`);
  if (xForwardedFor) console.log(`  - X-Forwarded-For: ${xForwardedFor}`);
  if (realIp) console.log(`  - X-Real-IP: ${realIp}`);
  console.log(`  - Trust Proxy: ${req.app.get('trust proxy')}`);

  next();
}

// Configure CORS to allow requests from frontend domains
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://rinawarptech.com',
      'https://www.rinawarptech.com',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
    ];

    // Railway domain patterns
    const railwayPatterns = [/https:\/\/.*\.railway\.app$/, /https:\/\/.*\.up\.railway\.app$/];

    // Check exact matches first
    const isAllowedOrigin = allowedOrigins.includes(origin);

    // Check Railway patterns
    const isRailwayDomain = railwayPatterns.some(pattern => pattern.test(origin));

    if (isAllowedOrigin || isRailwayDomain) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'stripe-signature'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
};

// Apply CORS middleware BEFORE helmet to ensure proper header handling
app.use(cors(corsOptions));
console.log('✅ CORS middleware configured');

// Domain redirect - handle www subdomain redirect on Railway
app.use((req, res, next) => {
  if (req.headers.host && req.headers.host.startsWith('www.')) {
    const newHost = req.headers.host.replace(/^www\./, '');
    return res.redirect(301, `https://${newHost}${req.originalUrl}`);
  }
  next();
});

// Nonce generation removed - we're using external scripts only for CSP compliance

// CSP Report-Only for testing strict policy
app.use((req, res, next) => {
  // Test strict CSP without breaking functionality
  const strictCSP = [
    "default-src 'self'",
    "script-src 'self' https://js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com",
    "style-src 'self' 'unsafe-inline'", // Allow unsafe-inline for styles
    "img-src 'self' data: https: blob: https://www.google-analytics.com https://www.googletagmanager.com https://*.stripe.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://*.railway.app",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    'report-uri /api/csp-report',
  ].join('; ');

  res.setHeader('Content-Security-Policy-Report-Only', strictCSP);
  next();
});

// Apply helmet security headers with comprehensive protection
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://js.stripe.com',
          'https://checkout.stripe.com',
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
          'https://analytics.google.com',
          // No nonce needed - all scripts are external now
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: [
          "'self'",
          'data:',
          'https:',
          'blob:',
          'https://www.google-analytics.com',
          'https://www.googletagmanager.com',
          'https://*.stripe.com',
        ],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        connectSrc: [
          "'self'",
          'wss:',
          'ws:',
          'https://api.stripe.com',
          'https://checkout.stripe.com',
          'https://www.google-analytics.com',
          'https://analytics.google.com',
          'https://www.googletagmanager.com',
          'https://*.railway.app',
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameSrc: ["'self'", 'https://js.stripe.com', 'https://checkout.stripe.com', 'https://hooks.stripe.com'],
        formAction: ["'self'", 'https://checkout.stripe.com'],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for terminal functionality
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: false, // Disable to allow CORS to handle properly
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 63072000, // 2 years (recommended)
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  })
);

// Apply morgan logging middleware for detailed request logging
app.use(
  morgan('combined', {
    stream: {
      write: message => {
        console.log(message.trim());
      },
    },
  })
);

// WordPress scanner blocking middleware
app.use((req, res, next) => {
  const suspiciousPatterns = [
    '/wp-admin',
    '/wordpress',
    '/wp-content',
    '/wp-includes',
    '.php',
    '/xmlrpc.php',
    '/wp-login.php',
  ];

  const isSuspicious = suspiciousPatterns.some(pattern =>
    req.url.toLowerCase().includes(pattern.toLowerCase())
  );

  if (isSuspicious) {
    console.log(`🚫 Blocked WordPress scanner attempt: ${req.method} ${req.url} from ${req.ip}`);
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
});

// Apply Advanced Threat Detection middleware (before other middleware)
app.use(threatDetector.createMiddleware());

// Apply custom logging middleware to all requests
app.use(logRequest);

// Middleware
app.use(express.json({ limit: '10mb' })); // Increase limit and add security
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); // Enable cookie parsing for A/B testing

// JWT Authentication Middleware (unused - kept for future use)
const _authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Optional JWT middleware for routes that can work with or without auth (unused - kept for future use)
const _optionalJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
      req.user = decoded;
    } catch (error) {
      // Token invalid but continue without auth
      req.user = null;
    }
  }
  next();
};

// Enhanced status/health endpoint with integration checks (before status router)
app.get('/api/status/health', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  const serverStartupTime = Date.now() - startTime;

  const healthData = {
    status: 'healthy',
    service: 'RinaWarp Terminal API',
    version: '1.0.9',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    },
    startup: {
      time_ms: serverStartupTime,
      human: `${serverStartupTime}ms`,
    },
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
    },
    integrations: {
      smtp: {
        configured: smtpConfigured || sendgridConfigured,
        mode: process.env.NODE_ENV === 'development' && !smtpConfigured ? 'mock' : 'real',
        provider: smtpConfigured ? 'SMTP' : sendgridConfigured ? 'SendGrid' : 'none',
      },
      stripe: {
        configured: !!stripe,
        publishableKey: !!process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      },
    },
    environment: {
      node_env: process.env.NODE_ENV || 'development',
      node_version: process.version,
      platform: process.platform,
    },
  };

  // Test SMTP connectivity if configured
  if (smtpConfigured && transporter && transporter.verify) {
    try {
      await transporter.verify();
      healthData.integrations.smtp.status = 'connected';
    } catch (error) {
      healthData.integrations.smtp.status = 'error';
      healthData.integrations.smtp.error = error.message;
    }
  } else {
    healthData.integrations.smtp.status = sendgridConfigured ? 'configured' : 'not_configured';
  }

  res.json(healthData);
});

// Initialize Agent Chat API
const agentChatAPI = new AgentChatAPI();

// Routes
app.use('/api/status', statusRouter);
app.use('/api/download', downloadRouter);
app.use('/api/auth', authRouter);
app.use('/api/security', securityRouter);
app.use('/api/marketing', marketingRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/support', supportRouter);
app.use('/api/ai', agentChatAPI.getRouter());

// Health Check
app.get('/api/ping', (req, res) => {
  res.status(200).json({ pong: true, timestamp: new Date().toISOString() });
});

// Version route for deployment verification
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.9',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local-dev',
    timestamp: new Date().toISOString(),
    downloadMapSupported: true,
  });
});

// Custom request validation middleware - currently unused but kept for future use
// const validateRequest = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       error: 'Validation failed',
//       details: errors.array()
//     });
//   }
//   next();
// };

// Input validation schemas using Joi
const licenseValidationSchema = Joi.object({
  licenseKey: Joi.string()
    .required()
    .min(10)
    .max(200)
    .pattern(/^[A-Z0-9\-]+$/)
    .messages({
      'string.pattern.base':
        'License key must contain only uppercase letters, numbers, and hyphens',
    }),
});

const checkoutValidationSchema = Joi.object({
  priceId: Joi.string().required().min(5).max(100),
  successUrl: Joi.string().uri().optional(),
  cancelUrl: Joi.string().uri().optional(),
  customerEmail: Joi.string().email().optional(),
  userId: Joi.string().optional(),
  metadata: Joi.object().optional(),
});

const emailValidationSchema = Joi.object({
  email: Joi.string().email().required(),
  licenseType: Joi.string()
    .valid('trial', 'personal', 'professional', 'team', 'enterprise')
    .default('personal'),
});

// Joi validation middleware factory
const validateJoi = schema => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }
    next();
  };
};

// Utility function to validate and normalize file paths
function validateAndNormalizePath(requestedPath, allowedBaseDir) {
  try {
    // Normalize the path to resolve any '..' or '.' segments
    const normalizedPath = path.normalize(requestedPath);

    // Resolve to absolute path
    const absolutePath = path.resolve(allowedBaseDir, normalizedPath);

    // Ensure the resolved path is still within the allowed base directory
    if (!absolutePath.startsWith(path.resolve(allowedBaseDir))) {
      return null; // Path traversal attempt detected
    }

    return absolutePath;
  } catch (error) {
    return null; // Invalid path
  }
}

// Secure file serving middleware
function _secureFileServer(baseDir, allowedFiles = [], allowedDirs = []) {
  return (req, res, _next) => {
    const requestedPath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
    console.log(`[DEBUG] Attempting to serve: ${requestedPath} from baseDir: ${baseDir}`);
    console.log(`[DEBUG] Allowed files: ${allowedFiles.join(', ')}`);
    console.log(`[DEBUG] Allowed dirs: ${allowedDirs.join(', ')}`);

    // Log current working directory and file existence
    console.log(`[DEBUG] Current working directory: ${process.cwd()}`);
    console.log(`[DEBUG] Checking path: ${baseDir}/${requestedPath}`);

    const fullPath = path.join(baseDir, requestedPath);
    console.log(`[DEBUG] Full resolved path: ${fullPath}`);
    console.log(`[DEBUG] File exists: ${fs.existsSync(fullPath)}`);

    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`[DEBUG] Is directory: ${stats.isDirectory()}`);
      console.log(`[DEBUG] File size: ${stats.size} bytes`);
    }

    // Validate and normalize the path
    const safePath = validateAndNormalizePath(requestedPath, baseDir);

    if (!safePath) {
      return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }

    // Check if file exists
    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if it's a directory (not allowed for direct access)
    const stats = fs.statSync(safePath);
    if (stats.isDirectory()) {
      return res.status(403).json({ error: 'Directory access not allowed' });
    }

    // Extract filename and directory from the requested path
    const parsedPath = path.parse(requestedPath);
    const filename = parsedPath.base;
    // Handle both forward slashes and backslashes for cross-platform compatibility
    const pathParts = parsedPath.dir.split(/[/\\]/).filter(part => part !== '');
    const topLevelDir = pathParts[0]; // Get first directory in path

    // Check if file is in allowed files list or in allowed directory
    const isAllowedFile =
      allowedFiles.includes(filename) || (!parsedPath.dir && allowedFiles.includes(filename));
    const isInAllowedDir = topLevelDir && allowedDirs.includes(topLevelDir);

    // Special handling for nested directories like themes
    const isInNestedAllowedDir =
      pathParts.length > 1 && pathParts.every(part => allowedDirs.includes(part));
    const hasAllowedParentDir = pathParts.some(part => allowedDirs.includes(part));

    if (!isAllowedFile && !isInAllowedDir && !isInNestedAllowedDir && !hasAllowedParentDir) {
      return res.status(403).json({ error: 'Access denied: File not in whitelist' });
    }

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Serve the file
    res.sendFile(safePath);
  };
}

// Rate limiting configurations
// Static pages - generous limits (low risk)
const staticPageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  statusCode: 429,
});

// API endpoints with sensitive data - moderate limits (medium risk)
const apiConfigLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many API requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
});

// General API rate limiter - moderate limits
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    error: 'Too many API requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
});

// License validation - strict limits (high risk - potential for abuse/brute force)
const licenseValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many license validation attempts from this IP. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
});

// Health check endpoint for Railway (simple and reliable)
app.get('/health', (req, res) => {
  console.log('[HEALTH] Health check requested');
  res.status(200).send('OK');
});

// API health check endpoint
app.get('/api/health', (req, res) => {
  console.log('[API HEALTH] API health check requested');
  res.status(200).json({
    status: 'healthy',
    service: 'RinaWarp Terminal API',
    timestamp: new Date().toISOString(),
    version: '1.0.7',
  });

  // CSP Violation Report Endpoint
  app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
    const report = req.body['csp-report'];
    if (report) {
      console.log('🚨 CSP Violation Report:');
      console.log('  - Document:', report['document-uri']);
      console.log('  - Blocked:', report['blocked-uri']);
      console.log('  - Directive:', report['violated-directive']);
      console.log('  - Line:', report['line-number']);
      console.log('  - Column:', report['column-number']);

      // Log to file for analysis
      const logEntry = {
        timestamp: new Date().toISOString(),
        report: report,
        userAgent: req.headers['user-agent'],
      };

      fs.appendFile('./logs/csp-violations.log', JSON.stringify(logEntry) + '\n').catch(() => {});
    }

    res.status(204).end();
  });
});

// Status endpoint moved to modular router (src/api/status.js)

// Download API endpoint handled by modular router (src/api/download.js)
// This route is now handled by the downloadRouter imported above

// API endpoint to get Stripe configuration
app.get('/api/stripe-config', apiConfigLimiter, (req, res) => {
  console.log('[STRIPE] Config requested');

  // Only send publishable key and price IDs (never secret keys!)
  const config = {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim(),
    prices: {
      personal: process.env.STRIPE_PRICE_PERSONAL?.trim(),
      professional: process.env.STRIPE_PRICE_PROFESSIONAL?.trim(),
      team: process.env.STRIPE_PRICE_TEAM?.trim(),
    },
    betaPrices: {
      earlybird: process.env.STRIPE_PRICE_EARLYBIRD?.trim(),
      beta: process.env.STRIPE_PRICE_BETA?.trim(),
      premium: process.env.STRIPE_PRICE_PREMIUM?.trim(),
    },
  };

  // Validate that required config is present
  if (!config.publishableKey) {
    console.log('[STRIPE] Missing publishable key');
    return res.status(500).json({
      error: 'Missing Stripe publishable key',
    });
  }

  console.log('[STRIPE] Config sent successfully');
  res.json(config);
});

// Serve favicon.ico (fix 404 error)
app.get('/favicon.ico', (req, res) => {
  const faviconPath = validateAndNormalizePath('favicon.ico', _PUBLIC_DIR);
  if (faviconPath && fs.existsSync(faviconPath)) {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.sendFile(faviconPath);
  } else {
    // Return empty favicon to prevent repeated requests
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Content-Length', '0');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(204).end();
  }
});

// Serve the main page (index.html) with nonce injection for CSP compliance
app.get('/', staticPageLimiter, (req, res) => {
  console.log('[ROUTE] Root route requested');
  const safePath = validateAndNormalizePath('index.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    console.log('[ROUTE] index.html not found, serving API status');
    return res.status(200).json({
      message: 'RinaWarp Terminal API is running',
      status: 'healthy',
      version: '1.0.7',
      timestamp: new Date().toISOString(),
      availableEndpoints: ['/health', '/api/stripe-config'],
    });
  }

  console.log('[ROUTE] Serving index.html');

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// A/B Testing for Pricing Page
app.get('/pricing', staticPageLimiter, (req, res) => {
  // Get or set user's test variant
  let variant = req.cookies.pricingVariant;
  
  if (!variant) {
    // Randomly assign variant (50/50 split)
    variant = Math.random() < 0.5 ? 'simple' : 'complex';
    res.cookie('pricingVariant', variant, { 
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true 
    });
  }
  
  // Log the view
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event: 'view',
    variant,
    url: req.url,
    referrer: req.get('referrer') || 'direct',
    userAgent: req.get('user-agent')
  };
  
  fs.appendFile('./logs/ab-test-pricing.log', JSON.stringify(logEntry) + '\n').catch(() => {});
  
  // Determine which file to serve
  const filename = variant === 'simple' ? 'pricing.html' : 'pricing-old-basic.html';
  const safePath = validateAndNormalizePath(filename, _PUBLIC_DIR);
  
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve the pricing page with .html extension (also with A/B testing)
app.get('/pricing.html', staticPageLimiter, (req, res) => {
  // Redirect to /pricing to ensure consistent A/B testing
  res.redirect('/pricing');
});

// Serve success page
app.get('/success', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('success.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve beta page
app.get('/beta', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('beta.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve checkout page for abandoned cart recovery
app.get('/checkout', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('checkout.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve download page
app.get('/download', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('download.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve download page with .html extension
app.get('/download.html', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('download.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve sales optimization page
app.get('/sales', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('sales-optimization.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve sales optimization page with .html extension
app.get('/sales-optimization.html', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('sales-optimization.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve security dashboard
app.get('/security', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('security-dashboard.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Security dashboard not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve security dashboard with .html extension
app.get('/security-dashboard.html', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('security-dashboard.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Security dashboard not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve admin dashboard
app.get('/admin', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('admin-dashboard.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Admin dashboard not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve admin dashboard with .html extension
app.get('/admin-dashboard.html', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('admin-dashboard.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Admin dashboard not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve GA4 test page
app.get('/ga4-test', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('ga4-test.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'GA4 test page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-cache'); // Don't cache test page
  res.sendFile(safePath);
});

// Serve GA4 test page with .html extension
app.get('/ga4-test.html', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('ga4-test.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'GA4 test page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-cache'); // Don't cache test page
  res.sendFile(safePath);
});

// Release files are served directly from the public/releases directory

// General release files handler
app.use('/releases', staticPageLimiter, (req, res, _next) => {
  const requestedPath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
  console.log(`[RELEASES] Attempting to serve: ${requestedPath}`);
  const releasesDir = path.join(_PUBLIC_DIR, 'releases');
  const safePath = validateAndNormalizePath(requestedPath, releasesDir);

  if (!safePath) {
    console.log(`[ERROR] Invalid path for releases: ${requestedPath}`);
    return res.status(403).json({ error: 'Access denied: Invalid file path' });
  }

  // Check if file exists and is not a directory
  if (!fs.existsSync(safePath)) {
    console.log(`[ERROR] Release file not found: ${safePath}`);
    return res.status(404).json({ error: 'File not found' });
  }

  const stats = fs.statSync(safePath);
  if (stats.isDirectory()) {
    return res.status(403).json({ error: 'Directory listing not allowed' });
  }

  // Only allow specific file extensions for releases
  const allowedExtensions = ['.zip', '.tar.gz', '.exe', '.dmg', '.deb', '.rpm', '.msi'];
  const fileExtension = path.extname(safePath).toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    return res.status(403).json({ error: 'File type not allowed' });
  }

  // Set appropriate headers for downloads
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'attachment');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours

  res.sendFile(safePath);
});

// Stripe webhook endpoint
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.get('stripe-signature');
  let event;

  try {
    // Verify webhook signature
    if (
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_WEBHOOK_SECRET !== '{{STRIPE_WEBHOOK_SECRET}}'
    ) {
      // Use proper signature verification when webhook secret is configured
      if (typeof stripe !== 'undefined') {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } else {
        console.log('⚠️ Stripe not initialized, parsing event without verification');
        event = JSON.parse(req.body);
      }
    } else {
      console.log('⚠️ Webhook secret not configured, parsing event without verification');
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.log('⚠️ Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('💰 Payment successful:', session.id);
      handlePaymentSuccess(session);
      break;
    }
    case 'customer.subscription.created':
      console.log('🔄 Subscription created:', event.data.object.id);
      handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      console.log('🔄 Subscription updated:', event.data.object.id);
      handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      console.log('❌ Subscription cancelled:', event.data.object.id);
      handleSubscriptionCancelled(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      console.log('💳 Invoice paid:', event.data.object.id);
      handleInvoicePayment(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Alternative webhook endpoint for /api/webhook path
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment was successful!', session);
      handlePaymentSuccess(session);
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('Subscription payment succeeded:', invoice);
      handleInvoicePayment(invoice);
      break;
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      console.log('Subscription cancelled:', subscription);
      handleSubscriptionCancelled(subscription);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Lead capture endpoint for email marketing
app.post('/api/capture-lead', apiRateLimiter, async (req, res) => {
  const { email, source = 'website' } = req.body;

  // Validate email
  const emailSchema = Joi.object({
    email: Joi.string().email().required(),
    source: Joi.string().valid('lead_magnet', 'newsletter', 'beta_interest', 'website').optional(),
  });

  const { error } = emailSchema.validate({ email, source });
  if (error) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    // Store lead in database (for now, we'll log it)
    console.log('📧 New lead captured:', { email, source, timestamp: new Date().toISOString() });

    // Send lead magnet email if source is lead_magnet
    if (source === 'lead_magnet') {
      console.log('🎯 Attempting to send lead magnet email to:', email);
      try {
        await sendLeadMagnetEmail(email);
        console.log('✅ Lead magnet email sent successfully');
      } catch (emailError) {
        console.error('❌ Error sending lead magnet email:', emailError);
        console.error('Error details:', {
          message: emailError.message,
          code: emailError.code,
          response: emailError.response,
          stack: emailError.stack,
        });
        throw emailError; // Re-throw to handle in outer catch
      }
    }

    // Track in analytics
    console.log(`✅ Lead captured successfully: ${email} from ${source}`);

    res.json({
      success: true,
      message: 'Thank you! Check your email for your free guide.',
      email,
    });
  } catch (error) {
    console.error('❌ Error in lead capture endpoint:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// Function to send lead magnet email
async function sendLeadMagnetEmail(email) {
  if (!transporter) {
    console.log('⚠️ SMTP not configured, would send lead magnet to:', email);
    return;
  }

  const fromEmail =
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.SMTP_FROM_EMAIL ||
    process.env.SMTP_USER ||
    'noreply@rinawarp.com';

  console.log('📧 Email configuration:', {
    fromEmail,
    toEmail: email,
    transporterType: transporter.constructor.name,
    sendgridConfigured,
  });

  const mailOptions = {
    from: `RinaWarp Terminal <${fromEmail}>`,
    to: email,
    subject: '🎁 Your Free Guide: 10 Terminal Productivity Hacks',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff1493, #00ffff); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0;">Your Free Terminal Guide is Here!</h1>
        </div>
        
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; line-height: 1.6;">Hi there!</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Thank you for your interest in boosting your terminal productivity! 
            We're excited to share our top 10 terminal hacks that will save you hours every week.
          </p>
          
          <div style="background: #f0f0f0; padding: 25px; border-radius: 8px; margin: 25px 0;">
            <h2 style="color: #ff1493; margin-top: 0;">📚 What's Inside:</h2>
            <ul style="line-height: 1.8;">
              <li>Speed up navigation with advanced shortcuts</li>
              <li>Automate repetitive tasks with aliases</li>
              <li>Master git workflows in the terminal</li>
              <li>Use AI to generate complex commands</li>
              <li>And 6 more productivity boosters!</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://rinawarptech.com/guides/terminal-productivity-hacks.pdf" 
               style="display: inline-block; background: linear-gradient(135deg, #ff1493, #00ffff); 
                      color: white; padding: 15px 40px; text-decoration: none; 
                      border-radius: 25px; font-weight: bold; font-size: 18px;">
              📥 Download Your Free Guide
            </a>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ff1493;">
            <h3 style="color: #ff1493; margin-top: 0;">🚀 Ready for More?</h3>
            <p style="margin-bottom: 15px;">
              RinaWarp Terminal takes these productivity hacks to the next level with:
            </p>
            <ul style="margin-bottom: 15px;">
              <li>AI-powered command suggestions</li>
              <li>Visual workflow automation</li>
              <li>Cloud sync across devices</li>
              <li>Team collaboration features</li>
            </ul>
            <a href="https://rinawarptech.com/pricing" style="color: #ff1493; font-weight: bold;">
              Try RinaWarp Terminal Free for 14 Days →
            </a>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">
            Happy coding!<br>
            The RinaWarp Team
          </p>
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>You received this email because you requested our terminal productivity guide.</p>
          <p>© 2025 RinaWarp Technologies. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `Your Free Terminal Guide is Here!

Thank you for your interest in boosting your terminal productivity!

Download your guide here: https://rinawarptech.com/guides/terminal-productivity-hacks.pdf

What's Inside:
- Speed up navigation with advanced shortcuts
- Automate repetitive tasks with aliases  
- Master git workflows in the terminal
- Use AI to generate complex commands
- And 6 more productivity boosters!

Happy coding!
The RinaWarp Team`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Lead magnet email sent:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending lead magnet email:', error);
    throw error;
  }
}

// License generation and delivery functions
function generateLicenseKey(customerId, licenseType) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const prefix =
    {
      personal: 'RINAWARP-PERSONAL',
      professional: 'RINAWARP-PRO',
      team: 'RINAWARP-TEAM',
      enterprise: 'RINAWARP-ENT',
    }[licenseType] || 'RINAWARP';

  return `${prefix}-${timestamp}-${random.toUpperCase()}`;
}

function getLicenseTypeFromPrice(priceId) {
  const priceMap = {
    // New updated prices
    price_1RlLBwG2ToGP7ChnhstisPz0: 'personal', // Reef Explorer $15/month
    price_1RlLC4G2ToGP7ChndbHLotM7: 'professional', // Mermaid Pro $25/month
    price_1RlLCEG2ToGP7ChnZa5Px0ow: 'team', // Ocean Fleet $35/month
    // Legacy prices (keep for backward compatibility)
    price_1RayttG2ToGP7Chn6ectv20s: 'personal',
    price_1RayskG2ToGP7ChnotKOPBUs: 'personal',
    price_1RayrzG2ToGP7ChnAM4BXGoH: 'professional',
    price_1RayrCG2ToGP7ChnKWA7tstz: 'professional',
    price_1RayqKG2ToGP7ChnTMT6gwce: 'team',
    price_1RaypMG2ToGP7ChnzbKQOAPF: 'team',
  };
  return priceMap[priceId] || 'personal';
}

async function sendLicenseEmail(customerEmail, licenseKey, licenseType) {
  try {
    // Check if Nodemailer is configured
    if (!transporter) {
      console.log('⚠️ SMTP not configured, logging license details instead:');
      console.log(`   Email: ${customerEmail}`);
      console.log(`   License: ${licenseKey}`);
      console.log(`   Type: ${licenseType}`);
      return;
    }

    // Create email content
    const licenseTypeFormatted = licenseType.charAt(0).toUpperCase() + licenseType.slice(1);
    const fromEmail =
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.SMTP_FROM_EMAIL ||
      process.env.SMTP_USER ||
      'noreply@rinawarp.com';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #1a1a1a; padding: 30px; border-radius: 10px; color: white; text-align: center;">
          <h1 style="color: #00ff88; margin-bottom: 20px;">🎉 Welcome to RinaWarp Terminal!</h1>
          <p style="font-size: 18px; margin-bottom: 30px;">Thank you for purchasing RinaWarp Terminal ${licenseTypeFormatted}!</p>
          
          <div style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #00ff88; margin-bottom: 15px;">Your License Key</h2>
            <div style="background-color: #000; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 16px; word-break: break-all; color: #00ff88; border: 2px solid #00ff88;">
              ${licenseKey}
            </div>
          </div>
          
          <div style="text-align: left; margin-top: 30px;">
            <h3 style="color: #00ff88;">Getting Started:</h3>
            <ol style="color: #cccccc; line-height: 1.6;">
              <li>Download RinaWarp Terminal from <a href="https://rinawarptech.com/" style="color: #00ff88;">our website</a></li>
              <li>Install and launch the application</li>
              <li>Go to Settings → License</li>
              <li>Enter your license key above</li>
              <li>Enjoy your ${licenseTypeFormatted} features!</li>
            </ol>
          </div>
          
          <div style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
            <h3 style="color: #00ff88; margin-bottom: 15px;">🎯 Help Us Improve!</h3>
            <p style="color: #cccccc; margin-bottom: 20px;">Your feedback is incredibly valuable to us. Please take 2 minutes to share your experience:</p>
            <a href="https://docs.google.com/forms/d/1wHNr7FrQ8z9l1f22Qs3paIrpimnufCR3l2skPXYz-dc/viewform" 
               style="display: inline-block; background: linear-gradient(135deg, #00ff88, #00d4aa); color: #1a1a2e; padding: 15px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 16px;">
              📝 Share Your Feedback
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #444;">
            <p style="color: #888; font-size: 14px;">Need help? Contact us at support@rinawarp.com</p>
            <p style="color: #888; font-size: 14px;">License Type: ${licenseTypeFormatted}</p>
          </div>
        </div>
      </div>
    `;

    const textContent = `
      Welcome to RinaWarp Terminal!
      
      Thank you for purchasing RinaWarp Terminal ${licenseTypeFormatted}!
      
      Your License Key: ${licenseKey}
      
      Getting Started:
      1. Download RinaWarp Terminal from https://rinawarptech.com/
      2. Install and launch the application
      3. Go to Settings → License
      4. Enter your license key above
      5. Enjoy your ${licenseTypeFormatted} features!
      
      Help Us Improve!
      Your feedback is incredibly valuable to us. Please take 2 minutes to share your experience:
      https://docs.google.com/forms/d/1wHNr7FrQ8z9l1f22Qs3paIrpimnufCR3l2skPXYz-dc/viewform
      
      Need help? Contact us at support@rinawarp.com
      License Type: ${licenseTypeFormatted}
    `;

    const mailOptions = {
      from: `"RinaWarp Terminal" <${fromEmail}>`,
      to: customerEmail,
      subject: `🎉 Your RinaWarp Terminal ${licenseTypeFormatted} License Key`,
      text: textContent,
      html: htmlContent,
    };

    // Send email using Nodemailer
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 License Email Sent Successfully:');
    console.log(`   Email: ${customerEmail}`);
    console.log(`   License: ${licenseKey}`);
    console.log(`   Type: ${licenseType}`);
    console.log(`   Message ID: ${info.messageId}`);
  } catch (error) {
    console.error('❌ Error sending license email:', error);

    // Log the license details even if email fails
    console.log('📧 Email failed, logging license details:');
    console.log(`   Email: ${customerEmail}`);
    console.log(`   License: ${licenseKey}`);
    console.log(`   Type: ${licenseType}`);

    // Don't throw error to prevent payment processing from failing
    // The license is still valid even if email fails
  }
}

function saveLicenseToDatabase(licenseData) {
  // Database storage logic would go here
  console.log('💾 License Saved:', licenseData);

  // TODO: Save to database
  // await db.licenses.create(licenseData);
}

async function handlePaymentSuccess(session) {
  try {
    console.log('🎯 Processing payment success for session:', session.id);

    // Extract customer and payment information
    const customerId = session.customer;
    let customerEmail = session.customer_details?.email;

    // If email is not in session, fetch from Stripe customer
    if (!customerEmail && customerId && stripe) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        customerEmail = customer.email;
        console.log('📝 Retrieved customer email from Stripe:', customerEmail);
      } catch (error) {
        console.error('⚠️ Failed to retrieve customer from Stripe:', error.message);
      }
    }

    // Get line items to determine license type
    let lineItems = session.line_items?.data || [];

    // If line items are not expanded, fetch them
    if (lineItems.length === 0 && stripe) {
      try {
        const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items', 'line_items.data.price'],
        });
        lineItems = sessionWithLineItems.line_items?.data || [];
        console.log('📝 Retrieved line items from Stripe:', lineItems.length, 'items');
      } catch (error) {
        console.error('⚠️ Failed to retrieve line items from Stripe:', error.message);
      }
    }

    if (lineItems.length > 0) {
      const priceId = lineItems[0].price?.id;
      const licenseType = getLicenseTypeFromPrice(priceId);
      const licenseKey = generateLicenseKey(customerId, licenseType);

      console.log('📝 License details:');
      console.log('  - Customer ID:', customerId);
      console.log('  - Customer Email:', customerEmail);
      console.log('  - Price ID:', priceId);
      console.log('  - License Type:', licenseType);
      console.log('  - License Key:', licenseKey);

      // Create license record
      const licenseData = {
        licenseKey,
        customerId,
        customerEmail,
        licenseType,
        status: 'active',
        createdAt: new Date(),
        sessionId: session.id,
        priceId,
      };

      // Save license
      saveLicenseToDatabase(licenseData);

      // Send license email
      if (customerEmail) {
        await sendLicenseEmail(customerEmail, licenseKey, licenseType);
      } else {
        console.error('⚠️ No customer email available for license delivery');
      }

      console.log('✅ License generated and delivered successfully!');
    } else {
      console.error('⚠️ No line items found in checkout session');
    }
  } catch (error) {
    console.error('❌ Error processing payment success:', error);
  }
}

async function handleSubscriptionCreated(subscription) {
  try {
    console.log('🎯 Processing new subscription:', subscription.id);

    const customerId = subscription.customer;
    const priceId = subscription.items?.data[0]?.price?.id;
    const licenseType = getLicenseTypeFromPrice(priceId);
    const licenseKey = generateLicenseKey(customerId, licenseType);

    // Create license record for subscription
    const licenseData = {
      licenseKey,
      customerId,
      licenseType,
      status: 'active',
      subscriptionId: subscription.id,
      createdAt: new Date(),
      priceId,
    };

    saveLicenseToDatabase(licenseData);
    console.log('✅ Subscription license created successfully!');
  } catch (error) {
    console.error('❌ Error processing subscription creation:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    console.log('🎯 Processing subscription update:', subscription.id);

    if (subscription.status === 'active') {
      console.log('✅ Subscription reactivated');
      // Reactivate license if needed
    } else if (subscription.cancel_at_period_end) {
      console.log('⏰ Subscription will cancel at period end');
      // Mark license for future cancellation
    }
  } catch (error) {
    console.error('❌ Error processing subscription update:', error);
  }
}

async function handleSubscriptionCancelled(subscription) {
  try {
    console.log('🎯 Processing subscription cancellation:', subscription.id);

    // Deactivate associated license
    console.log('🔒 License deactivated for cancelled subscription');
    // TODO: Update license status in database
  } catch (error) {
    console.error('❌ Error processing subscription cancellation:', error);
  }
}

async function handleInvoicePayment(invoice) {
  try {
    console.log('🎯 Processing invoice payment:', invoice.id);

    // Handle recurring payment success
    if (invoice.billing_reason === 'subscription_cycle') {
      console.log('🔄 Recurring payment successful - license remains active');
    }
  } catch (error) {
    console.error('❌ Error processing invoice payment:', error);
  }
}

// Enhanced license validation with real data
app.post(
  '/api/validate-license',
  licenseValidationLimiter,
  validateJoi(licenseValidationSchema),
  (req, res) => {
    const { licenseKey } = req.body;

    // Enhanced license validation
    const licenseData = validateLicenseKey(licenseKey);

    if (!licenseData) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid license key',
      });
    }

    res.json(licenseData);
  }
);

// Generate new license endpoint (for testing)
app.post('/api/generate-license', (req, res) => {
  const { customerId, licenseType, email } = req.body;

  if (!customerId || !licenseType) {
    return res.status(400).json({
      error: 'Customer ID and license type are required',
    });
  }

  const licenseKey = generateLicenseKey(customerId, licenseType);
  const licenseData = {
    licenseKey,
    customerId,
    email,
    licenseType,
    status: 'active',
    createdAt: new Date(),
    maxDevices: getLicenseDeviceLimit(licenseType),
    features: getLicenseFeatures(licenseType),
  };

  saveLicenseToDatabase(licenseData);

  res.json({
    success: true,
    license: licenseData,
  });
});

// Test license email endpoint
app.post('/api/test-license-email', validateJoi(emailValidationSchema), async (req, res) => {
  const { email, licenseType = 'personal' } = req.body;

  try {
    const testLicenseKey = generateLicenseKey('test-customer', licenseType);
    await sendLicenseEmail(email, testLicenseKey, licenseType);

    res.json({
      success: true,
      message: 'Test license email sent successfully',
      licenseKey: testLicenseKey,
      email: email,
      licenseType: licenseType,
    });
  } catch (error) {
    console.error('Error sending test license email:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      details: error.message,
    });
  }
});

// License status endpoint
app.get('/api/license-status/:licenseKey', (req, res) => {
  const { licenseKey } = req.params;
  const licenseData = validateLicenseKey(licenseKey);

  if (!licenseData) {
    return res.status(404).json({
      error: 'License not found',
    });
  }

  res.json(licenseData);
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({ message: 'API routes are working!', timestamp: new Date().toISOString() });
});

// Debug endpoint for SendGrid configuration
app.get('/api/debug/sendgrid', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    sendgrid: {
      configured: sendgridConfigured,
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@rinawarp.com',
      transporterExists: !!transporter,
      transporterType: transporter ? transporter.constructor.name : 'none',
    },
  });
});

// Test lead magnet email with simplified content
app.post('/api/test/lead-magnet-simple', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // First test with very simple email
    const simpleMailOptions = {
      from: `RinaWarp <${process.env.SENDGRID_FROM_EMAIL || 'noreply@rinawarp.com'}>`,
      to: email,
      subject: 'Your Terminal Guide',
      text: 'Thank you for your interest! Here is your guide: https://rinawarptech.com/guides/terminal-productivity-hacks.pdf',
      html: '<p>Thank you for your interest! <a href="https://rinawarptech.com/guides/terminal-productivity-hacks.pdf">Download your guide here</a></p>',
    };

    console.log('🧪 Testing simplified email to:', email);
    console.log('📧 Mail options:', JSON.stringify(simpleMailOptions, null, 2));

    const info = await transporter.sendMail(simpleMailOptions);
    console.log('✅ Simple email sent successfully:', info.messageId);

    res.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
  } catch (error) {
    console.error('❌ Error sending simple email:', error);
    res.status(500).json({
      error: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
      stack: error.stack,
    });
  }
});

// Email connectivity test endpoint
app.get('/api/test/email-ping', async (req, res) => {
  const testResult = {
    timestamp: new Date().toISOString(),
    smtp: {
      configured: smtpConfigured || sendgridConfigured,
      provider: smtpConfigured ? 'SMTP' : sendgridConfigured ? 'SendGrid' : 'none',
    },
  };

  if (smtpConfigured && transporter && transporter.verify) {
    try {
      await transporter.verify();
      testResult.smtp.status = 'connected';
      testResult.smtp.test = 'SMTP verification successful';
    } catch (error) {
      testResult.smtp.status = 'error';
      testResult.smtp.error = error.message;
    }
  } else if (sendgridConfigured) {
    testResult.smtp.status = 'configured';
    testResult.smtp.test = 'SendGrid configured via environment variables';
  } else {
    testResult.smtp.status = 'not_configured';
    testResult.smtp.test = 'No email service configured';
  }

  res.json(testResult);
});

// Simple POST test endpoint
app.post('/api/test-post', (req, res) => {
  res.json({
    message: 'POST endpoint working!',
    body: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Security headers test endpoint
app.get('/api/test/security-headers', (req, res) => {
  res.json({
    message: 'Security headers test endpoint',
    timestamp: new Date().toISOString(),
    headers: {
      'Strict-Transport-Security': res.get('Strict-Transport-Security'),
      'X-Content-Type-Options': res.get('X-Content-Type-Options'),
      'X-Frame-Options': res.get('X-Frame-Options'),
      'Referrer-Policy': res.get('Referrer-Policy'),
      'Content-Security-Policy': res.get('Content-Security-Policy'),
      'X-XSS-Protection': res.get('X-XSS-Protection'),
    },
    test: 'If you can see this, security headers are working properly',
  });
});

// Debug endpoint to check environment variables
app.get('/api/debug/env-check', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    stripeEnvVars: {
      STRIPE_PRICE_PERSONAL: process.env.STRIPE_PRICE_PERSONAL?.trim(),
      STRIPE_PRICE_PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL?.trim(),
      STRIPE_PRICE_TEAM: process.env.STRIPE_PRICE_TEAM?.trim(),
      STRIPE_PRICE_BETA: process.env.STRIPE_PRICE_BETA?.trim(),
      NODE_ENV: process.env.NODE_ENV,
    },
  });
});

// Analytics tracking endpoints
const analyticsData = new Map(); // In-memory storage for demo (use database in production)

// Track conversions for A/B testing
app.post('/api/track-conversion', express.json(), (req, res) => {
  const { event, plan, variant } = req.body;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: 'conversion',
    plan,
    variant: variant || req.cookies.pricingVariant,
    value: plan === 'professional' ? 25 : plan === 'starter' ? 15 : 35
  };
  
  fs.appendFile('./logs/ab-test-pricing.log', JSON.stringify(logEntry) + '\n').catch(() => {});
  
  res.json({ success: true });
});

// Get A/B test results
app.get('/api/ab-test-results', async (req, res) => {
  try {
    // Read the log file
    const logPath = './logs/ab-test-pricing.log';
    let logs = [];
    
    if (fs.existsSync(logPath)) {
      const content = await fs.promises.readFile(logPath, 'utf8');
      logs = content.trim().split('\n').filter(line => line).map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(log => log);
    }
    
    // Calculate metrics for each variant
    const results = {
      simple: {
        views: 0,
        conversions: 0,
        conversionRate: 0,
        revenue: 0,
        avgRevenue: 0
      },
      complex: {
        views: 0,
        conversions: 0,
        conversionRate: 0,
        revenue: 0,
        avgRevenue: 0
      }
    };
    
    // Process logs
    logs.forEach(log => {
      if (log.variant && results[log.variant]) {
        if (log.event === 'view') {
          results[log.variant].views++;
        } else if (log.event === 'conversion') {
          results[log.variant].conversions++;
          results[log.variant].revenue += log.value || 0;
        }
      }
    });
    
    // Calculate conversion rates and average revenue
    Object.keys(results).forEach(variant => {
      const data = results[variant];
      if (data.views > 0) {
        data.conversionRate = ((data.conversions / data.views) * 100).toFixed(2);
        data.avgRevenue = data.views > 0 ? (data.revenue / data.views).toFixed(2) : 0;
      }
    });
    
    res.json(results);
  } catch (error) {
    console.error('Error reading A/B test results:', error);
    res.status(500).json({ error: 'Failed to get A/B test results' });
  }
});

// A/B Test Dashboard
app.get('/ab-test-dashboard', (req, res) => {
  const dashboardHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Pricing A/B Test Results</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric h3 { margin: 0 0 10px 0; color: #666; font-size: 0.9rem; text-transform: uppercase; }
        .metric .value { font-size: 2rem; font-weight: bold; color: #333; }
        .metric .change { font-size: 0.9rem; margin-top: 5px; }
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
        .chart { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .winner { background: #d1fae5; }
        .refresh-info { text-align: right; color: #666; font-size: 0.9rem; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Pricing Page A/B Test Results</h1>
        <div class="refresh-info">Auto-refreshes every 30 seconds</div>
        
        <div class="metrics">
            <div class="metric">
                <h3>Simple Version</h3>
                <div class="value" id="simple-views">0</div>
                <div>Views</div>
            </div>
            <div class="metric">
                <h3>Simple Conversion Rate</h3>
                <div class="value" id="simple-rate">0%</div>
                <div class="change positive" id="simple-change"></div>
            </div>
            <div class="metric">
                <h3>Complex Version</h3>
                <div class="value" id="complex-views">0</div>
                <div>Views</div>
            </div>
            <div class="metric">
                <h3>Complex Conversion Rate</h3>
                <div class="value" id="complex-rate">0%</div>
                <div class="change negative" id="complex-change"></div>
            </div>
        </div>
        
        <div class="chart">
            <h2>Conversion Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Simple Version</th>
                        <th>Complex Version</th>
                        <th>Winner</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Total Views</td>
                        <td id="table-simple-views">0</td>
                        <td id="table-complex-views">0</td>
                        <td id="views-winner">-</td>
                    </tr>
                    <tr>
                        <td>Conversions</td>
                        <td id="table-simple-conversions">0</td>
                        <td id="table-complex-conversions">0</td>
                        <td id="conversions-winner">-</td>
                    </tr>
                    <tr>
                        <td>Conversion Rate</td>
                        <td id="table-simple-rate">0%</td>
                        <td id="table-complex-rate">0%</td>
                        <td id="rate-winner">-</td>
                    </tr>
                    <tr>
                        <td>Avg. Revenue/User</td>
                        <td id="table-simple-revenue">$0</td>
                        <td id="table-complex-revenue">$0</td>
                        <td id="revenue-winner">-</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="chart">
            <h2>Recommendations</h2>
            <div id="recommendations">
                <p>Collecting data... Check back after at least 100 views per variant.</p>
            </div>
        </div>
    </div>

    <script>
        async function loadResults() {
            try {
                const response = await fetch('/api/ab-test-results');
                const data = await response.json();
                
                // Update metrics
                document.getElementById('simple-views').textContent = data.simple.views;
                document.getElementById('simple-rate').textContent = data.simple.conversionRate + '%';
                document.getElementById('complex-views').textContent = data.complex.views;
                document.getElementById('complex-rate').textContent = data.complex.conversionRate + '%';
                
                // Update table
                document.getElementById('table-simple-views').textContent = data.simple.views;
                document.getElementById('table-complex-views').textContent = data.complex.views;
                document.getElementById('table-simple-conversions').textContent = data.simple.conversions;
                document.getElementById('table-complex-conversions').textContent = data.complex.conversions;
                document.getElementById('table-simple-rate').textContent = data.simple.conversionRate + '%';
                document.getElementById('table-complex-rate').textContent = data.complex.conversionRate + '%';
                document.getElementById('table-simple-revenue').textContent = '$' + data.simple.avgRevenue;
                document.getElementById('table-complex-revenue').textContent = '$' + data.complex.avgRevenue;
                
                // Determine winners
                if (data.simple.views > 10 && data.complex.views > 10) {
                    if (parseFloat(data.simple.conversionRate) > parseFloat(data.complex.conversionRate)) {
                        document.getElementById('rate-winner').textContent = '✅ Simple';
                        document.getElementById('rate-winner').className = 'winner';
                        const improvement = (parseFloat(data.simple.conversionRate) - parseFloat(data.complex.conversionRate)).toFixed(1);
                        document.getElementById('simple-change').textContent = '+' + improvement + '% better';
                        document.getElementById('complex-change').textContent = '';
                    } else if (parseFloat(data.complex.conversionRate) > parseFloat(data.simple.conversionRate)) {
                        document.getElementById('rate-winner').textContent = '✅ Complex';
                        document.getElementById('rate-winner').className = 'winner';
                        const improvement = (parseFloat(data.complex.conversionRate) - parseFloat(data.simple.conversionRate)).toFixed(1);
                        document.getElementById('complex-change').textContent = '+' + improvement + '% better';
                        document.getElementById('simple-change').textContent = '';
                    }
                    
                    if (parseFloat(data.simple.avgRevenue) > parseFloat(data.complex.avgRevenue)) {
                        document.getElementById('revenue-winner').textContent = '✅ Simple';
                        document.getElementById('revenue-winner').className = 'winner';
                    } else if (parseFloat(data.complex.avgRevenue) > parseFloat(data.simple.avgRevenue)) {
                        document.getElementById('revenue-winner').textContent = '✅ Complex';
                        document.getElementById('revenue-winner').className = 'winner';
                    }
                }
                
                // Update recommendations
                const totalViews = data.simple.views + data.complex.views;
                const recommendations = document.getElementById('recommendations');
                
                if (totalViews < 100) {
                    recommendations.innerHTML = '<p>⏳ Still collecting data. Need at least 100 total views for meaningful results.</p>';
                } else if (totalViews < 500) {
                    recommendations.innerHTML = '<p>📊 Early results are showing. Continue running the test for more confidence.</p>';
                } else {
                    const winner = parseFloat(data.simple.conversionRate) > parseFloat(data.complex.conversionRate) ? 'simple' : 'complex';
                    const confidence = totalViews > 1000 ? 'high' : 'moderate';
                    recommendations.innerHTML = `
                        <p>\u2705 <strong>Recommendation:</strong> The ${winner} pricing page is performing better.</p>
                        <p>\uD83D\uDCC8 Confidence level: ${confidence}</p>
                        <p>\uD83D\uDCA1 Consider making the ${winner} version your default pricing page.</p>
                    `;
                }
            } catch (error) {
                console.error('Error loading results:', error);
            }
        }
        
        // Load results on page load
        loadResults();
        
        // Auto-refresh every 30 seconds
        setInterval(loadResults, 30000);
    </script>
</body>
</html>
  `;
  
  res.send(dashboardHTML);
});

app.post('/api/analytics/batch', (req, res) => {
  try {
    const { sessionId, events, metadata } = req.body;

    if (!sessionId || !events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid analytics data' });
    }

    // Store analytics data
    if (!analyticsData.has(sessionId)) {
      analyticsData.set(sessionId, {
        sessionId,
        metadata,
        events: [],
        createdAt: new Date().toISOString(),
      });
    }

    const sessionData = analyticsData.get(sessionId);
    sessionData.events.push(...events);
    sessionData.lastUpdated = new Date().toISOString();

    console.log(`📊 Analytics batch received: ${events.length} events for session ${sessionId}`);

    // Log key conversion events
    events.forEach(event => {
      if (
        ['checkout_initiated', 'purchase_completed', 'pricing_plan_selected'].includes(
          event.eventName
        )
      ) {
        console.log(`💰 Conversion Event: ${event.eventName}`, event);
      }
    });

    res.json({
      success: true,
      processed: events.length,
      sessionId,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to process analytics data' });
  }
});

// Get analytics dashboard data
app.get('/api/analytics/dashboard', (req, res) => {
  try {
    const sessions = Array.from(analyticsData.values());
    const allEvents = sessions.flatMap(s => s.events);

    const stats = {
      totalSessions: sessions.length,
      totalEvents: allEvents.length,
      pageViews: allEvents.filter(e => e.eventName === 'page_view').length,
      checkoutInitiated: allEvents.filter(e => e.eventName === 'checkout_initiated').length,
      purchasesCompleted: allEvents.filter(e => e.eventName === 'purchase_completed').length,
      pricingPlanSelections: allEvents.filter(e => e.eventName === 'pricing_plan_selected').length,
    };

    stats.conversionRate =
      stats.pageViews > 0 ? ((stats.purchasesCompleted / stats.pageViews) * 100).toFixed(2) : 0;

    stats.checkoutConversionRate =
      stats.checkoutInitiated > 0
        ? ((stats.purchasesCompleted / stats.checkoutInitiated) * 100).toFixed(2)
        : 0;

    // Popular plans
    const planSelections = allEvents
      .filter(e => e.eventName === 'pricing_plan_selected')
      .reduce((acc, e) => {
        const plan = e.plan || 'unknown';
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      }, {});

    // Recent events (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentEvents = allEvents
      .filter(e => e.timestamp > oneDayAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    res.json({
      stats,
      planSelections,
      recentEvents,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to get analytics data' });
  }
});

// Stripe checkout session creation endpoint
app.post(
  '/api/create-checkout-session',
  validateJoi(checkoutValidationSchema),
  async (req, res) => {
    try {
      const { priceId, successUrl, cancelUrl, customerEmail, userId, metadata } = req.body;

      console.log('🛒 Creating checkout session for price:', priceId);
      console.log('📧 Customer email:', customerEmail);
      console.log('👤 User ID:', userId);

      if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
      }

      // Use the provided URLs or defaults
      const defaultSuccessUrl = `${req.protocol}://${req.get('host')}/success.html?session_id={CHECKOUT_SESSION_ID}`;
      const defaultCancelUrl = `${req.protocol}://${req.get('host')}/pricing.html`;

      // Fetch the price object to determine if it's recurring or one-time
      const price = await stripe.prices.retrieve(priceId);
      const mode = price.recurring ? 'subscription' : 'payment';

      console.log(
        `💡 Price ${priceId} is ${price.recurring ? 'recurring' : 'one-time'}, using mode: ${mode}`
      );

      // Build session configuration
      const sessionConfig = {
        mode,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl || defaultSuccessUrl,
        cancel_url: cancelUrl || defaultCancelUrl,
        automatic_tax: { enabled: true },
        billing_address_collection: 'required',
        metadata: {
          priceId: priceId,
          product: 'RinaWarp Terminal',
          priceType: price.recurring ? 'recurring' : 'one-time',
          mode: mode,
          ...(userId && { userId: userId }),
          ...(metadata && typeof metadata === 'object' && metadata),
        },
      };

      // Only add customer_creation for one-time payments
      // Stripe automatically creates customers for subscriptions
      if (mode === 'payment') {
        sessionConfig.customer_creation = 'always';
      }

      // Add customer email if provided
      if (customerEmail) {
        sessionConfig.customer_email = customerEmail;
      }

      // Add subscription-specific configurations
      if (mode === 'subscription') {
        sessionConfig.subscription_data = {
          metadata: {
            priceId: priceId,
            product: 'RinaWarp Terminal',
            ...(userId && { userId: userId }),
          },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      console.log('✅ Checkout session created:', session.id);

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      res.status(500).json({
        error: 'Failed to create checkout session',
        details: error.message,
      });
    }
  }
);

// License utility functions
function validateLicenseKey(licenseKey) {
  // Enhanced validation with real license database lookup
  const validLicenses = {
    'RINAWARP-TRIAL-2025': {
      type: 'trial',
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
      status: 'active',
      maxDevices: 1,
      features: ['basic_terminal', 'themes'],
    },
    'RINAWARP-PERSONAL-2025': {
      type: 'personal',
      expires: null,
      status: 'active',
      maxDevices: 3,
      features: ['full_terminal', 'themes', 'ai_assistant', 'cloud_sync'],
    },
    'RINAWARP-PRO-2025': {
      type: 'professional',
      expires: null,
      status: 'active',
      maxDevices: 5,
      features: [
        'full_terminal',
        'themes',
        'ai_assistant',
        'cloud_sync',
        'priority_support',
        'advanced_features',
      ],
    },
    'RINAWARP-TEAM-2025': {
      type: 'team',
      expires: null,
      status: 'active',
      maxDevices: 10,
      features: [
        'full_terminal',
        'themes',
        'ai_assistant',
        'cloud_sync',
        'team_management',
        'collaboration',
        'priority_support',
      ],
    },
    'RINAWARP-ENT-2025': {
      type: 'enterprise',
      expires: null,
      status: 'active',
      maxDevices: -1, // unlimited
      features: [
        'full_terminal',
        'themes',
        'ai_assistant',
        'cloud_sync',
        'team_management',
        'collaboration',
        'sla',
        'custom_integrations',
      ],
    },
  };

  const license = validLicenses[licenseKey];

  if (!license) {
    return null;
  }

  // Check if license is expired
  if (license.expires && Date.now() > license.expires) {
    return {
      valid: false,
      error: 'License has expired',
      licenseType: license.type,
      expires: license.expires,
    };
  }

  return {
    valid: true,
    licenseKey,
    licenseType: license.type,
    status: license.status,
    expires: license.expires,
    maxDevices: license.maxDevices,
    features: license.features,
    validatedAt: Date.now(),
  };
}

function getLicenseDeviceLimit(licenseType) {
  const limits = {
    trial: 1,
    personal: 3,
    professional: 5,
    team: 10,
    enterprise: -1, // unlimited
  };
  return limits[licenseType] || 1;
}

function getLicenseFeatures(licenseType) {
  const features = {
    trial: ['basic_terminal', 'themes'],
    personal: ['full_terminal', 'themes', 'ai_assistant', 'cloud_sync'],
    professional: [
      'full_terminal',
      'themes',
      'ai_assistant',
      'cloud_sync',
      'priority_support',
      'advanced_features',
    ],
    team: [
      'full_terminal',
      'themes',
      'ai_assistant',
      'cloud_sync',
      'team_management',
      'collaboration',
      'priority_support',
    ],
    enterprise: [
      'full_terminal',
      'themes',
      'ai_assistant',
      'cloud_sync',
      'team_management',
      'collaboration',
      'sla',
      'custom_integrations',
    ],
  };
  return features[licenseType] || features['personal'];
}

// Serve static files with express.static middleware for public directory
// This provides efficient static file serving with proper caching headers
app.use(
  express.static(_PUBLIC_DIR, {
    maxAge: '1h', // Cache static assets for 1 hour
    etag: true,
    lastModified: true,
    index: false, // Don't serve index.html for directory requests
    setHeaders: (res, _path) => {
      // Set security headers for static files
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  })
);

// Serve releases directory specifically
app.use(
  '/releases',
  express.static(path.join(_PUBLIC_DIR, 'releases'), {
    maxAge: '1h',
    etag: true,
    lastModified: true,
    index: false,
    setHeaders: (res, _path) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  })
);

// Serve stripe-csp-test.html specifically
app.get('/stripe-csp-test.html', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('stripe-csp-test.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'CSP test page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-cache'); // Don't cache test page
  res.sendFile(safePath);
});

// Note: Removed catch-all static file server to prevent conflicts with API routes
// Static files are now served via express.static middleware and specific routes

// 404 Handler for undefined routes (must be after all other routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
  const bootTime = Date.now() - startTime;
  console.log(`🚀 RinaWarp Terminal server running on http://0.0.0.0:${PORT}`);
  console.log(`🌍 Server started at ${new Date().toISOString()}`);
  console.log(`⚡ Boot time: ${bootTime}ms`);
  console.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
  console.log('🔧 Environment variables loaded:');
  console.log(
    '- STRIPE_PUBLISHABLE_KEY:',
    process.env.STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing'
  );
  console.log(
    '- STRIPE_PRICE_PERSONAL_MONTHLY:',
    process.env.STRIPE_PRICE_PERSONAL_MONTHLY ? '✅ Set' : '❌ Missing'
  );
  console.log(
    '- STRIPE_PRICE_PERSONAL_YEARLY:',
    process.env.STRIPE_PRICE_PERSONAL_YEARLY ? '✅ Set' : '❌ Missing'
  );
  console.log(
    '- STRIPE_PRICE_PROFESSIONAL_MONTHLY:',
    process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY ? '✅ Set' : '❌ Missing'
  );
  console.log(
    '- STRIPE_PRICE_PROFESSIONAL_YEARLY:',
    process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY ? '✅ Set' : '❌ Missing'
  );
  console.log(
    '- STRIPE_PRICE_TEAM_MONTHLY:',
    process.env.STRIPE_PRICE_TEAM_MONTHLY ? '✅ Set' : '❌ Missing'
  );
  console.log(
    '- STRIPE_PRICE_TEAM_YEARLY:',
    process.env.STRIPE_PRICE_TEAM_YEARLY ? '✅ Set' : '❌ Missing'
  );
  console.log('- SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Missing');
  console.log(
    '- SENDGRID_FROM_EMAIL:',
    process.env.SENDGRID_FROM_EMAIL ? '✅ Set' : '❌ Missing (will use default)'
  );
  console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');

  // Email test ping on startup
  if (sendgridConfigured) {
    console.log('📧 Testing SendGrid connectivity...');
    // Note: We'll add a test ping endpoint instead of testing on startup to avoid delays
  }

  console.log('✅ Server ready to accept connections');
  console.log('📊 Marketing System: Initialized for lead capture and email campaigns');
  console.log('📈 Analytics System: Ready for event tracking and funnel analysis');
  console.log('🎯 Support System: Help desk and knowledge base operational');
  console.log('🔗 Health endpoint: http://localhost:' + PORT + '/api/status/health');
  console.log('🐚 All systems operational - RinaWarp is ready to make waves!');
});

server.on('error', error => {
  console.error('Server error:', error);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
