#!/usr/bin/env node

/**
 * Minimal test server to validate Railway deployment
 * This strips out all complexity to identify deployment issues
 */

import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Starting minimal test server...');
console.log(`Port: ${PORT}`);
console.log(`Node: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`ENV: ${process.env.NODE_ENV || 'not set'}`);

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'RinaWarp Test Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    port: PORT,
    env: process.env.NODE_ENV || 'not set'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'RinaWarp Terminal API is running!',
    status: 'operational',
    endpoints: ['/health', '/api/health'],
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    requested: req.url,
    available: ['/', '/health', '/api/health']
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal test server running on port ${PORT}`);
  console.log(`🌐 Access at: http://0.0.0.0:${PORT}`);
  console.log('📊 Memory usage:', process.memoryUsage());
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
