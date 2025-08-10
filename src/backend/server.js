#!/usr/bin/env node

/**
 * RinaWarp Terminal Backend Server
 * Handles authentication, subscription verification, and feature access
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

// Import our modules
const subscriptionRouter = require('./api/subscription');
const stripeWebhookRouter = require('./webhooks/stripe');
const { verifySubscription, rateLimitByTier } = require('./middleware/auth');
const AuthManager = require('./auth/AuthManager');
const FeatureManager = require('./features/FeatureManager');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Rate limiting (global)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use('/webhooks', express.raw({ type: 'application/json' })); // Raw for webhooks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await AuthManager.register(email, password, name);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    
    const result = await AuthManager.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/auth/logout', verifySubscription(), (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      AuthManager.logout(token);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Feature access endpoints
app.post('/api/feature-access', verifySubscription(), (req, res) => {
  try {
    const { featureName, usage = {} } = req.body;
    const userTier = req.user.tier;
    
    const access = FeatureManager.validateFeatureAccess(userTier, featureName, usage);
    res.json(access);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/features/:tier', verifySubscription(), (req, res) => {
  try {
    const tier = req.params.tier;
    const features = FeatureManager.getAvailableFeatures(tier);
    res.json(features);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI endpoints with tier-based access
app.post('/api/ai/chat', verifySubscription('personal'), rateLimitByTier, async (req, res) => {
  try {
    const { prompt, model = 'gpt-3.5-turbo' } = req.body;
    const userTier = req.user.tier;
    
    // Check AI feature access
    const access = FeatureManager.validateFeatureAccess(userTier, 'ai_assistant');
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }
    
    // Check model access for advanced AI
    if (model !== 'gpt-3.5-turbo') {
      const advancedAccess = FeatureManager.validateFeatureAccess(userTier, 'advanced_ai');
      if (!advancedAccess.allowed) {
        return res.status(403).json({ 
          error: 'Advanced AI models require Professional tier or higher',
          availableModels: ['gpt-3.5-turbo']
        });
      }
    }
    
    // Here you would integrate with your actual AI service
    // For now, return a mock response
    const response = {
      message: `AI Response to: ${prompt}`,
      model: model,
      tier: userTier,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Terminal features endpoints
app.get('/api/terminal/themes', verifySubscription('personal'), (req, res) => {
  try {
    const userTier = req.user.tier;
    const access = FeatureManager.validateFeatureAccess(userTier, 'custom_themes');
    
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }
    
    const limits = FeatureManager.getFeatureLimit(userTier, 'custom_themes');
    
    res.json({
      available: true,
      limits: limits,
      themes: ['default', 'dark', 'light', 'cyberpunk', 'retro'] // Mock themes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cloud sync endpoints
app.get('/api/sync/status', verifySubscription('personal'), (req, res) => {
  try {
    const userTier = req.user.tier;
    const access = FeatureManager.validateFeatureAccess(userTier, 'cloud_sync');
    
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }
    
    const limits = FeatureManager.getFeatureLimit(userTier, 'cloud_sync');
    
    res.json({
      enabled: true,
      limits: limits,
      usage: {
        storage: '0.5GB', // Mock usage
        lastSync: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Team features (Team tier and above)
app.get('/api/team/members', verifySubscription('team'), (req, res) => {
  try {
    const userTier = req.user.tier;
    const access = FeatureManager.validateFeatureAccess(userTier, 'team_management');
    
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }
    
    res.json({
      members: [], // Mock team members
      limits: FeatureManager.getFeatureLimit(userTier, 'team_management')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mount routers
app.use('/api', subscriptionRouter);
app.use('/webhooks', stripeWebhookRouter);

// Error handling
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 RinaWarp Backend Server running on port ${PORT}`);
    console.log(`🔐 Authentication system active`);
    console.log(`💳 Stripe webhooks ready`);
    console.log(`🎯 Feature access controls enabled`);
    
    // Verify environment variables
    const requiredEnvVars = ['STRIPE_SECRET_KEY', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
    } else {
      console.log('✅ All required environment variables are set');
    }
  });
}

module.exports = app;
