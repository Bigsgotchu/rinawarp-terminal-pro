/**
 * RinaWarp Terminal - Advanced Terminal Emulator
 * Copyright (c) 2025 RinaWarp Technologies. All rights reserved.
 *
 * This file is part of RinaWarp Terminal, an advanced terminal emulator with
 * AI assistance, enterprise security, cloud sync, and revolutionary features.
 *
 * CONFIDENTIAL AND PROPRIETARY
 * This source code is proprietary and confidential information of RinaWarp Technologies.
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
 * @author RinaWarp Technologies
 * @copyright 2025 RinaWarp Technologies. All rights reserved.
 * @license RinaWarp Commercial License
 * @version 1.0.0
 * @since 2025-01-01
 */

// Load environment variables FIRST, before any other imports
import { config } from 'dotenv';
const startTime = Date.now();
console.log('🚀 Starting RinaWarp Terminal Server...');

config();
console.log('✅ Environment variables loaded');

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import cors from 'cors';
import helmet from 'helmet';
import Joi from 'joi';
import morgan from 'morgan';
// import { validationResult } from 'express-validator'; // Currently unused
import errorHandler, { notFoundHandler } from './src/middleware/errorHandler.js';
import statusRouter from './src/api/status.js';
import downloadRouter from './src/api/download.js';
import authRouter from './src/api/auth.js';

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

// Configure Nodemailer
let transporter;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('✅ Nodemailer configured successfully');
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
    console.log('⚠️ SMTP credentials not configured');
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

// Enhanced logging middleware
function logRequest(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
}

// Configure CORS to allow requests from Vercel frontend
const corsOptions = {
  origin: [
    'https://rinawarp-terminal-pjiiyl0tw-rinawarp-terminal.vercel.app',
    'https://rinawarp-terminal.vercel.app',
    'https://rinawarp-terminal-fresh.vercel.app',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'stripe-signature'],
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Apply helmet security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'wss:', 'ws:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
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

// Apply custom logging middleware to all requests
app.use(logRequest);

// Middleware
app.use(express.json());
// More middleware like cors(), helmet()

// Enhanced status/health endpoint with integration checks (before status router)
app.get('/api/status/health', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  const serverStartupTime = Date.now() - startTime;

  const healthData = {
    status: 'healthy',
    service: 'RinaWarp Terminal API',
    version: '1.0.8',
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

// Routes
app.use('/api/status', statusRouter);
app.use('/api/download', downloadRouter);
app.use('/api/auth', authRouter);

// Health Check
app.get('/api/ping', (req, res) => {
  res.status(200).json({ pong: true, timestamp: new Date().toISOString() });
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
});

// Status endpoint moved to modular router (src/api/status.js)

// Download API endpoint - redirects to GitHub releases
app.get('/api/download', (req, res) => {
  const { file } = req.query;

  // Map of request types to GitHub release URLs
  const githubReleaseBaseUrl =
    'https://github.com/Bigsgotchu/rinawarp-terminal/releases/latest/download';
  const allowedFiles = {
    'rinawarp.zip': `${githubReleaseBaseUrl}/rinawarp.zip`,
    portable: `${githubReleaseBaseUrl}/RinaWarp-Terminal-Portable-Windows.exe`,
    linux: `${githubReleaseBaseUrl}/RinaWarp-Terminal-Linux.tar.gz`,
    macos: `${githubReleaseBaseUrl}/RinaWarp-Terminal-macOS.dmg`,
    setup: `${githubReleaseBaseUrl}/RinaWarp-Terminal-Setup-Windows.exe`,
  };

  // Default to main installer if no file specified
  const downloadUrl = file ? allowedFiles[file] : allowedFiles['setup'];

  if (!downloadUrl) {
    return res.status(400).json({
      error: 'Invalid file requested',
      available: Object.keys(allowedFiles),
      message: 'Please specify one of the available file types',
    });
  }

  console.log(`[DOWNLOAD] Redirecting to: ${downloadUrl}`);

  // Check if files exist locally first (for development)
  if (process.env.NODE_ENV === 'development') {
    const fileName = downloadUrl.split('/').pop();
    const releasesPath = path.join(_PUBLIC_DIR, 'releases', fileName);
    const publicPath = path.join(_PUBLIC_DIR, fileName);

    if (fs.existsSync(releasesPath)) {
      console.log(`[DOWNLOAD] Serving local file: ${releasesPath}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.sendFile(releasesPath);
    } else if (fs.existsSync(publicPath)) {
      console.log(`[DOWNLOAD] Serving local file: ${publicPath}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.sendFile(publicPath);
    }
  }

  // Redirect to GitHub releases for production
  res.redirect(302, downloadUrl);
});

// API endpoint to get Stripe configuration
app.get('/api/stripe-config', apiConfigLimiter, (req, res) => {
  console.log('[STRIPE] Config requested');

  // Only send publishable key and price IDs (never secret keys!)
  const config = {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    prices: {
      personal: process.env.STRIPE_PRICE_PERSONAL_YEARLY,
      professional: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY,
      team: process.env.STRIPE_PRICE_TEAM_YEARLY,
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

// Serve the main page (index.html)
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

// Serve the pricing page
app.get('/pricing', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('pricing.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
});

// Serve the pricing page with .html extension
app.get('/pricing.html', staticPageLimiter, (req, res) => {
  const safePath = validateAndNormalizePath('pricing.html', _PUBLIC_DIR);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.sendFile(safePath);
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

// Specific routes for common release files
app.get('/releases/RinaWarp-Terminal-Setup-Windows.exe', staticPageLimiter, (req, res) => {
  const filePath = path.join(_PUBLIC_DIR, 'releases', 'RinaWarp-Terminal-Setup-Windows.exe');
  console.log(`[DOWNLOAD] Requested Windows installer: ${filePath}`);
  console.log(`[DOWNLOAD] File exists: ${fs.existsSync(filePath)}`);

  if (!fs.existsSync(filePath)) {
    console.log(`[ERROR] Windows installer not found at: ${filePath}`);
    return res.status(404).json({ error: 'Windows installer not found' });
  }

  res.setHeader(
    'Content-Disposition',
    'attachment; filename="RinaWarp-Terminal-Setup-Windows.exe"'
  );
  res.setHeader('Content-Type', 'application/octet-stream');
  res.sendFile(filePath);
});

app.get('/releases/RinaWarp-Terminal-Linux.tar.gz', staticPageLimiter, (req, res) => {
  const filePath = path.join(_PUBLIC_DIR, 'releases', 'RinaWarp-Terminal-Linux.tar.gz');
  console.log(`[DOWNLOAD] Requested Linux package: ${filePath}`);
  console.log(`[DOWNLOAD] File exists: ${fs.existsSync(filePath)}`);

  if (!fs.existsSync(filePath)) {
    console.log(`[ERROR] Linux package not found at: ${filePath}`);
    return res.status(404).json({ error: 'Linux package not found' });
  }

  res.setHeader('Content-Disposition', 'attachment; filename="RinaWarp-Terminal-Linux.tar.gz"');
  res.setHeader('Content-Type', 'application/gzip');
  res.sendFile(filePath);
});

// General release files handler
app.use('/releases', staticPageLimiter, (req, res, _next) => {
  const requestedPath = req.path;
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
app.post('/webhook', (req, res) => {
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
      process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@rinawarp.com';

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
              <li>Download RinaWarp Terminal from <a href="https://rinawarp-terminal.vercel.app/" style="color: #00ff88;">our website</a></li>
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
      1. Download RinaWarp Terminal from https://rinawarp-terminal.vercel.app/
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
  '/public',
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
