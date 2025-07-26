const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');
const winston = require('winston');

class DebugDashboard {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server);
    
    // Setup logger
    this.logger = winston.createLogger({
      level: config.logging.level,
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: config.logging.file })
      ]
    });

    // Setup routes and socket handlers
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  setupRoutes() {
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
    
    this.app.use('/static', express.static(path.join(__dirname, '../public')));
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      if (process.env.NODE_ENV !== 'production') console.log('Client connected');
      
      // Start sending metrics
      this.startMetricsInterval(socket);

      socket.on('disconnect', () => {
        if (process.env.NODE_ENV !== 'production') console.log('Client disconnected');
      });
    });
  }

  startMetricsInterval(socket) {
    const interval = setInterval(async () => {
      const metrics = await this.gatherMetrics();
      socket.emit('metrics', metrics);
    }, this.config.debugOverlay.refreshInterval);

    socket.on('disconnect', () => {
      clearInterval(interval);
    });
  }

  async gatherMetrics() {
    return {
      moduleStatus: await this.getModuleStatus(),
      performance: await this.getPerformanceMetrics(),
      errors: await this.getErrorLogs(),
      config: await this.getConfigSnapshot(),
      system: await this.getSystemMetrics()
    };
  }

  async getModuleStatus() {
    // Implementation for module loading status
    return {
      loaded: ['core', 'ui', 'network'],
      loading: ['extensions'],
      failed: []
    };
  }

  async getPerformanceMetrics() {
    return {
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  async getErrorLogs() {
    // Get last 10 errors from Winston logs
    return this.logger.query({
      level: 'error',
      limit: 10,
      order: 'desc'
    });
  }

  async getConfigSnapshot() {
    return this.config;
  }

  async getSystemMetrics() {
    return {
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus().length
    };
  }

  start() {
    const port = this.config.debugOverlay.port;
    this.server.listen(port, () => {
      if (process.env.NODE_ENV !== 'production') console.log(`Debug dashboard running on http://localhost:${port}`);
    });
  }
}

module.exports = { DebugDashboard };
