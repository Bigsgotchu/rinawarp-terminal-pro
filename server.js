/**
 * RinaWarp Terminal - Minimal Clean Server
 * Only essential functionality for web serving and analytics
 */

import { config } from 'dotenv';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { performanceMonitor } from './monitoring/performance-monitor.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8080;

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://rinawarptech.com',
      'https://www.rinawarptech.com',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080'
    ];
    
    // Railway domain patterns
    const railwayPatterns = [/https:\/\/.*\.railway\.app$/, /https:\/\/.*\.up\.railway\.app$/];
    
    if (!origin || allowedOrigins.includes(origin) || railwayPatterns.some(pattern => pattern.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Start performance monitoring
performanceMonitor.start();
app.use(performanceMonitor.trackRequest());

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'RinaWarp Terminal API',
    version: '1.3.1',
    timestamp: new Date().toISOString()
  });
});

// Analytics endpoints - MINIMAL VERSION
app.post('/api/analytics/conversion-batch', (req, res) => {
  try {
    const { sessionId, events } = req.body;
    
    if (!sessionId || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid analytics data' });
    }

    console.log(`📊 Received ${events.length} analytics events for session ${sessionId}`);
    
    // Simple logging to file
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      events,
      ip: req.ip
    };
    
    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Log to file
    const logFile = path.join(dataDir, 'analytics.log');
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    
    res.json({
      success: true,
      processed: events.length
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to process analytics' });
  }
});

app.get('/api/analytics/dashboard-data', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics dashboard endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Performance monitoring endpoints
app.get('/api/monitoring/metrics', (req, res) => {
  res.json(performanceMonitor.getMetrics());
});

app.get('/api/monitoring/analytics', (req, res) => {
  res.json(performanceMonitor.getAnalytics());
});

app.get('/api/monitoring/health', (req, res) => {
  const health = performanceMonitor.getHealthStatus();
  res.status(health.status === 'critical' ? 503 : 200).json(health);
});

// Static file serving
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, {
  maxAge: '1h',
  etag: true
}));

// Serve main pages
app.get('/', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      message: 'RinaWarp Terminal API is running',
      status: 'healthy',
      version: '1.3.1',
      timestamp: new Date().toISOString()
    });
  }
});

// Catch-all for 404s
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RinaWarp Terminal Server (MINIMAL) started on port ${PORT}`);
  console.log(`🌐 Server URL: http://0.0.0.0:${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log('✅ Server ready to accept connections');
});

// Graceful shutdown
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
