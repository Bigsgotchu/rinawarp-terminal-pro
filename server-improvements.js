/**
 * RinaWarp Terminal Server - Security and Endpoint Improvements
 * This file contains middleware functions and route handlers that can be integrated into server.js
 */

const path = require('path');
const fs = require('fs');

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Essential security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader(
    'Content-Security-Policy',
    'default-src \'self\'; ' +
      'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; ' +
      'style-src \'self\' \'unsafe-inline\'; ' +
      'img-src \'self\' data: https:; ' +
      'font-src \'self\' data:; ' +
      'connect-src \'self\' wss: ws:; ' +
      'object-src \'none\'; ' +
      'base-uri \'self\';'
  );

  // Additional security headers
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

// Status endpoint middleware
const statusEndpoint = (req, res) => {
  console.log('[STATUS] Status check requested');
  res.status(200).json({
    status: 'operational',
    service: 'RinaWarp Terminal Server',
    timestamp: new Date().toISOString(),
    version: '1.0.7',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
  });
};

// Terminal interface endpoint
const terminalEndpoint = (req, res) => {
  console.log('[TERMINAL] Terminal interface requested');
  // For now, redirect to main page or serve terminal-specific content
  res.redirect('/');
};

// API Gateway endpoint
const apiEndpoint = (req, res) => {
  console.log('[API] API root requested');
  res.status(200).json({
    name: 'RinaWarp Terminal API',
    version: '1.0.7',
    status: 'operational',
    endpoints: {
      health: '/api/health',
      config: '/api/stripe-config',
      status: '/status',
      terminal: '/terminal',
    },
    documentation: 'https://docs.rinawarp.com/api',
  });
};

// Authentication endpoint
const authEndpoint = (req, res) => {
  console.log('[AUTH] Authentication endpoint requested');
  res.status(200).json({
    message: 'Authentication service',
    status: 'available',
    methods: ['oauth', 'token'],
    version: '1.0.7',
  });
};

// WebSocket endpoint info
const wsEndpoint = (req, res) => {
  console.log('[WS] WebSocket endpoint info requested');
  res.status(200).json({
    message: 'WebSocket connection endpoint',
    status: 'available',
    protocol: 'ws',
    path: '/ws',
    version: '1.0.7',
  });
};

// Download endpoints
const downloadWindowsEndpoint = (req, res) => {
  console.log('[DOWNLOAD] Windows download requested');
  const windowsInstaller = 'RinaWarp Terminal Setup 1.0.7.exe';
  const filePath = path.join(__dirname, 'dist', windowsInstaller);

  if (fs.existsSync(filePath)) {
    res.download(filePath, windowsInstaller);
  } else {
    res.status(404).json({
      error: 'Windows installer not found',
      alternative: '/releases/latest',
    });
  }
};

const downloadLinuxEndpoint = (req, res) => {
  console.log('[DOWNLOAD] Linux download requested');
  const linuxPackage = 'RinaWarp Terminal 1.0.7.AppImage';
  const filePath = path.join(__dirname, 'dist', linuxPackage);

  if (fs.existsSync(filePath)) {
    res.download(filePath, linuxPackage);
  } else {
    res.status(404).json({
      error: 'Linux package not found',
      alternative: '/releases/latest',
    });
  }
};

const downloadMacOSEndpoint = (req, res) => {
  console.log('[DOWNLOAD] macOS download requested');
  res.status(501).json({
    error: 'macOS build not available',
    message: 'macOS builds are coming soon',
    alternative: '/releases/latest',
  });
};

// Latest release endpoint
const releasesLatestEndpoint = (req, res) => {
  console.log('[RELEASES] Latest release requested');

  // Check for available releases
  const distPath = path.join(__dirname, 'dist');
  const releases = [];

  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    files.forEach(file => {
      if (file.endsWith('.exe') || file.endsWith('.AppImage') || file.endsWith('.dmg')) {
        releases.push({
          filename: file,
          platform: file.includes('Setup')
            ? 'windows'
            : file.includes('AppImage')
              ? 'linux'
              : file.includes('.dmg')
                ? 'macos'
                : 'unknown',
          downloadUrl: `/download/${file}`,
          size: fs.statSync(path.join(distPath, file)).size,
        });
      }
    });
  }

  res.status(200).json({
    version: '1.0.7',
    releaseDate: new Date().toISOString(),
    releases: releases,
    changelog: [
      'Added AI-powered command suggestions',
      'Improved theme system with 15+ themes',
      'Enhanced security features',
      'Performance optimizations',
      'Bug fixes and stability improvements',
    ],
  });
};

// Error handling middleware (add at the end of server.js)
const errorHandler = (err, req, res, _next) => {
  console.error('[ERROR] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
};

// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    availableEndpoints: [
      '/',
      '/health',
      '/api/health',
      '/status',
      '/terminal',
      '/api',
      '/auth',
      '/ws',
      '/download/windows',
      '/download/linux',
      '/releases/latest',
    ],
  });
};

module.exports = {
  securityHeaders,
  statusEndpoint,
  terminalEndpoint,
  apiEndpoint,
  authEndpoint,
  wsEndpoint,
  downloadWindowsEndpoint,
  downloadLinuxEndpoint,
  downloadMacOSEndpoint,
  releasesLatestEndpoint,
  errorHandler,
  notFoundHandler,
};
