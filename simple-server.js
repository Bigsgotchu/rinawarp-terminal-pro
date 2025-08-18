const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'RinaWarp API Server',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    version: '1.0.0',
  });
});

// License validation endpoint (mock for now)
app.post('/api/license/validate', (req, res) => {
  const { licenseKey, deviceId } = req.body;

  // Mock validation - in production, validate against database
  if (licenseKey && deviceId) {
    res.json({
      valid: true,
      tier: 'premium',
      features: ['ai-integration', 'advanced-terminal', 'collaboration'],
      expiresAt: '2024-12-31T23:59:59Z',
    });
  } else {
    res.status(400).json({
      valid: false,
      error: 'Invalid license key or device ID',
    });
  }
});

// Payment webhook endpoint (mock for now)
app.post('/webhook/stripe', (req, res) => {
  console.log('Stripe webhook received:', req.headers);
  // In production, verify webhook signature and process payment
  res.json({ received: true });
});

// GET version for testing
app.get('/webhook/stripe', (req, res) => {
  res.json({
    endpoint: '/webhook/stripe',
    method: 'POST',
    description: 'Stripe payment webhook endpoint',
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

// AI integration endpoints
app.post('/api/ai/chat', (req, res) => {
  const { message, provider } = req.body;

  // Mock AI response - in production, integrate with actual AI providers
  res.json({
    response: `AI response to: "${message}" (using ${provider || 'default'} provider)`,
    timestamp: new Date().toISOString(),
    provider: provider || 'default',
  });
});

// GET version for testing
app.get('/api/ai/chat', (req, res) => {
  res.json({
    endpoint: '/api/ai/chat',
    method: 'POST',
    description: 'AI chat integration endpoint',
    requiredFields: ['message', 'provider (optional)'],
    example: {
      message: 'Hello AI',
      provider: 'openai',
    },
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RinaWarp API Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
