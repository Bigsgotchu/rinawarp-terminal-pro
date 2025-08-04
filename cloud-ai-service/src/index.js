import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';
import { connectDatabase } from './db/connection.js';
import { AIOrchestrator } from './services/ai-orchestrator.js';
import { errorHandler } from './middleware/error-handler.js';
import { authMiddleware } from './middleware/auth.js';

// Routes
import aiRoutes, { setAIOrchestrator } from './routes/ai.routes.js';
import authRoutes from './routes/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import webhookRoutes from './routes/webhook.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});

// Initialize AI Orchestrator
const aiOrchestrator = new AIOrchestrator();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Routes
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/webhooks', webhookRoutes);

// WebSocket connection for real-time AI interactions
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    // Verify token here
    socket.userId = 'user-id'; // Set from token
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', socket => {
  logger.info('Client connected', { socketId: socket.id, userId: socket.userId });

  socket.on('ai:prompt', async data => {
    try {
      const { prompt, context, options } = data;

      // Stream response back to client
      const stream = await aiOrchestrator.streamCompletion(prompt, {
        userId: socket.userId,
        context,
        ...options,
      });

      for await (const chunk of stream) {
        socket.emit('ai:response', { chunk, done: false });
      }

      socket.emit('ai:response', { chunk: '', done: true });
    } catch (error) {
      logger.error('AI processing error', error);
      socket.emit('ai:error', { message: 'Failed to process request' });
    }
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize AI models
    await aiOrchestrator.initialize();

    // Pass orchestrator to routes
    setAIOrchestrator(aiOrchestrator);

    httpServer.listen(PORT, () => {
      logger.info(`🚀 RinaWarp AI Cloud Service running on port ${PORT}`);
      logger.info(`📡 WebSocket server ready`);
      logger.info(`🧠 AI models initialized`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
});
