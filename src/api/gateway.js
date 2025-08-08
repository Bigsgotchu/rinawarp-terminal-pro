import logger from '../utilities/logger.js';
/**
 * RinaWarp API Gateway
 * Centralized API management with authentication, rate limiting, and routing
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { GraphQLHandler } from './graphql/handler.js';
import { AuthenticationService } from './auth/auth-service.js';
import { MetricsCollector } from './metrics/collector.js';

export class RinaWarpAPIGateway {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3001,
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET,
      enableCors: config.enableCors !== false,
      enableRateLimit: config.enableRateLimit !== false,
      enableMetrics: config.enableMetrics !== false,
      services: config.services || {
        terminal: 'http://localhost:3002',
        analytics: 'http://localhost:3003',
        auth: 'http://localhost:3004',
        mobile: 'http://localhost:3005',
      },
      ...config,
    };

    this.app = express();
    this.server = createServer(this.app);
    this.authService = new AuthenticationService(this.config);
    this.metricsCollector = new MetricsCollector();
    this.graphqlHandler = new GraphQLHandler();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupGraphQL();
  }

  /**
   * Setup core middleware
   */
  setupMiddleware() {
    // Security headers
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ['\'self\''],
            scriptSrc: ['\'self\'', '\'unsafe-inline\''],
            styleSrc: ['\'self\'', '\'unsafe-inline\''],
            imgSrc: ['\'self\'', 'data:', 'https:'],
            connectSrc: ['\'self\'', 'ws:', 'wss:'],
          },
        },
      })
    );

    // CORS configuration
    if (this.config.enableCors) {
      this.app.use(
        cors({
          origin:
            process.env.NODE_ENV === 'production'
              ? ['https://app.rinawarp.com', 'https://dashboard.rinawarp.com']
              : true,
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-RinaWarp-API-Key'],
        })
      );
    }

    // Rate limiting
    if (this.config.enableRateLimit) {
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: req => {
          // Different limits based on authentication
          if (req.user?.tier === 'enterprise') return 10000;
          if (req.user?.tier === 'pro') return 5000;
          return 1000; // Free tier
        },
        message: {
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: '15 minutes',
        },
        standardHeaders: true,
        legacyHeaders: false,
      });
      this.app.use(limiter);
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging and metrics
    this.app.use((req, res, next) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.metricsCollector.recordRequest({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          userId: req.user?.id,
          apiKey: req.headers['x-rinawarp-api-key'],
        });
      });

      next();
    });

    // Authentication middleware
    this.app.use(this.authMiddleware.bind(this));
  }

  /**
   * Authentication middleware
   */
  async authMiddleware(req, res, next) {
    // Skip auth for health checks and public endpoints
    const publicPaths = ['/health', '/api/auth/login', '/api/auth/register', '/docs'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    try {
      const authHeader = req.headers.authorization;
      const apiKey = req.headers['x-rinawarp-api-key'];

      if (authHeader?.startsWith('Bearer ')) {
        // JWT token authentication
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, this.config.jwtSecret);
        req.user = await this.authService.getUserById(decoded.userId);
      } else if (apiKey) {
        // API key authentication
        req.user = await this.authService.getUserByApiKey(apiKey);
      } else {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }

      if (!req.user) {
        return res.status(401).json({
          error: 'Invalid authentication credentials',
          code: 'INVALID_CREDENTIALS',
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Authentication failed',
        code: 'AUTHENTICATION_FAILED',
        details: error.message,
      });
    }
  }

  /**
   * Setup API routes and service proxies
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        services: this.getServiceHealth(),
      });
    });

    // API documentation
    this.app.get('/docs', (req, res) => {
      res.redirect('https://docs.rinawarp.com/api');
    });

    // Terminal service proxy
    this.app.use(
      '/api/terminal',
      createProxyMiddleware({
        target: this.config.services.terminal,
        changeOrigin: true,
        pathRewrite: { '^/api/terminal': '' },
        onProxyReq: this.addUserContext.bind(this),
        onError: this.handleProxyError.bind(this),
      })
    );

    // Analytics service proxy
    this.app.use(
      '/api/analytics',
      createProxyMiddleware({
        target: this.config.services.analytics,
        changeOrigin: true,
        pathRewrite: { '^/api/analytics': '' },
        onProxyReq: this.addUserContext.bind(this),
        onError: this.handleProxyError.bind(this),
      })
    );

    // Authentication service
    this.app.use(
      '/api/auth',
      createProxyMiddleware({
        target: this.config.services.auth,
        changeOrigin: true,
        pathRewrite: { '^/api/auth': '' },
        onError: this.handleProxyError.bind(this),
      })
    );

    // Mobile API endpoints
    this.app.use(
      '/api/mobile',
      createProxyMiddleware({
        target: this.config.services.mobile,
        changeOrigin: true,
        pathRewrite: { '^/api/mobile': '' },
        onProxyReq: this.addUserContext.bind(this),
        onError: this.handleProxyError.bind(this),
      })
    );

    // Webhook endpoints
    this.setupWebhooks();

    // SDK endpoints
    this.setupSDKEndpoints();

    // Error handling
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * Setup webhook system
   */
  setupWebhooks() {
    this.app.post('/api/webhooks/:service/:event', async (req, res) => {
      try {
        const { service, event } = req.params;
        const payload = req.body;

        // Verify webhook signature
        const signature = req.headers['x-rinawarp-signature'];
        if (!this.verifyWebhookSignature(payload, signature)) {
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }

        // Process webhook
        await this.processWebhook(service, event, payload, req.user);

        res.json({ success: true, processed: true });
      } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });
  }

  /**
   * Setup SDK-specific endpoints
   */
  setupSDKEndpoints() {
    // SDK download endpoints
    this.app.get('/sdk/:language/:version?', (req, res) => {
      const { language, version = 'latest' } = req.params;
      const supportedLanguages = ['javascript', 'python', 'go', 'java', 'csharp'];

      if (!supportedLanguages.includes(language)) {
        return res.status(404).json({ error: 'SDK not available for this language' });
      }

      res.redirect(`https://cdn.rinawarp.com/sdk/${language}/${version}/`);
    });

    // SDK documentation
    this.app.get('/sdk/:language/docs', (req, res) => {
      const { language } = req.params;
      res.redirect(`https://docs.rinawarp.com/sdk/${language}`);
    });
  }

  /**
   * Setup GraphQL endpoint
   */
  setupGraphQL() {
    this.app.use('/graphql', this.graphqlHandler.getMiddleware());
  }

  /**
   * Setup WebSocket server for real-time features
   */
  setupWebSocket() {
    this.wss = new WebSocketServer({
      server: this.server,
      path: '/ws',
    });

    this.wss.on('connection', async (ws, req) => {
      try {
        // Authenticate WebSocket connection
        const token = new URL(req.url, 'http://localhost').searchParams.get('token');
        if (!token) {
          ws.close(1008, 'Authentication required');
          return;
        }

        const decoded = jwt.verify(token, this.config.jwtSecret);
        const user = await this.authService.getUserById(decoded.userId);

        if (!user) {
          ws.close(1008, 'Invalid authentication');
          return;
        }

        ws.user = user;
        ws.subscriptions = new Set();

        // Handle WebSocket messages
        ws.on('message', async data => {
          try {
            const message = JSON.parse(data);
            await this.handleWebSocketMessage(ws, message);
          } catch (error) {
            ws.send(
              JSON.stringify({
                type: 'error',
                error: 'Invalid message format',
              })
            );
          }
        });

        // Handle disconnection
        ws.on('close', () => {
          this.handleWebSocketDisconnect(ws);
        });

        // Send welcome message
        ws.send(
          JSON.stringify({
            type: 'connected',
            userId: user.id,
            timestamp: new Date().toISOString(),
          })
        );

        // Simulate real-time updates
        const interval = setInterval(() => {
          if (ws.readyState === ws.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'update',
                message: `Real-time update at ${new Date().toISOString()}`,
              })
            );
          } else {
            clearInterval(interval);
          }
        }, 10000); // Update every 10 seconds
      } catch (error) {
        ws.close(1008, 'Authentication failed');
      }
    });
  }

  /**
   * Handle WebSocket messages
   */
  async handleWebSocketMessage(ws, message) {
    const { type, payload } = message;

    switch (type) {
    case 'subscribe':
      ws.subscriptions.add(payload.channel);
      ws.send(
        JSON.stringify({
          type: 'subscribed',
          channel: payload.channel,
        })
      );
      break;

    case 'unsubscribe':
      ws.subscriptions.delete(payload.channel);
      ws.send(
        JSON.stringify({
          type: 'unsubscribed',
          channel: payload.channel,
        })
      );
      break;

    case 'terminal_input':
      // Forward terminal input to appropriate service
      await this.forwardTerminalInput(ws.user, payload);
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    default:
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'Unknown message type',
        })
      );
    }
  }

  /**
   * Add user context to proxied requests
   */
  addUserContext(proxyReq, req) {
    if (req.user) {
      proxyReq.setHeader('X-RinaWarp-User-ID', req.user.id);
      proxyReq.setHeader('X-RinaWarp-User-Tier', req.user.tier);
      proxyReq.setHeader('X-RinaWarp-Organization', req.user.organizationId);
    }
  }

  /**
   * Handle proxy errors
   */
  handleProxyError(err, req, res) {
    console.error('Proxy error:', err);
    res.status(502).json({
      error: 'Service unavailable',
      code: 'SERVICE_UNAVAILABLE',
      details: 'The requested service is currently unavailable',
    });
  }

  /**
   * Error handler middleware
   */
  errorHandler(error, req, res, next) {
    console.error('API Gateway error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.details,
      });
    }

    if (error.name === 'UnauthorizedError') {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.headers['x-request-id'],
    });
  }

  /**
   * Get service health status
   */
  getServiceHealth() {
    // Implementation would ping each service
    return {
      terminal: 'healthy',
      analytics: 'healthy',
      auth: 'healthy',
      mobile: 'healthy',
    };
  }

  /**
   * Process webhook events
   */
  async processWebhook(_service, event, _payload, _user) {
    // Implement webhook processing logic
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(_payload, _signature) {
    // Implement webhook signature verification
    return true; // Simplified for now
  }

  /**
   * Forward terminal input through WebSocket
   */
  async forwardTerminalInput(_user, _payload) {
    // Implementation would forward to terminal service
  }

  /**
   * Handle WebSocket disconnection
   */
  handleWebSocketDisconnect(ws) {
    // Cleanup logic
    ws.subscriptions.forEach(_subscription => {});
    ws.subscriptions.clear();
  }

  /**
   * Start the API Gateway server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, err => {
        if (err) {
          reject(err);
        } else {
          logger.debug(`📊 Metrics enabled: ${this.config.enableMetrics}`);
          resolve();
        }
      });
    });
  }

  /**
   * Stop the API Gateway server
   */
  async stop() {
    return new Promise(resolve => {
      this.server.close(() => {
        resolve();
      });
    });
  }
}

export default RinaWarpAPIGateway;
