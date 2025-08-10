/**
 * RinaWarp Terminal - Real-time Admin Dashboard WebSocket Server
 * Provides real-time monitoring and analytics for administrators
 */

import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import AnalyticsDB from '../database/analytics.js';

class AdminWebSocketServer {
  constructor(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/api/admin/ws',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.clients = new Map();
    this.analyticsDB = new AnalyticsDB();
    this.metricsInterval = null;
    
    this.setupWebSocketServer();
    this.startMetricsCollection();
  }

  /**
   * Verify JWT token for WebSocket connection
   */
  verifyClient(info) {
    try {
      const url = new URL(info.req.url, 'ws://localhost');
      const token = url.searchParams.get('token');
      
      if (!token) {
        return false;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      
      // Only allow admin users
      if (decoded.role !== 'ADMIN') {
        return false;
      }

      // Store decoded token for later use
      info.req.user = decoded;
      return true;
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      return false;
    }
  }

  /**
   * Setup WebSocket server event handlers
   */
  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const user = req.user;
      
      console.log(`Admin WebSocket connected: ${user.email} (${clientId})`);
      
      // Store client information
      this.clients.set(clientId, {
        ws,
        user,
        connectedAt: new Date(),
        lastPing: new Date()
      });

      // Send initial data
      this.sendInitialData(ws);

      // Handle incoming messages
      ws.on('message', (message) => {
        this.handleMessage(clientId, message);
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log(`Admin WebSocket disconnected: ${user.email} (${clientId})`);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Send ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(clientId, message) {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(clientId);
      
      if (!client) return;

      switch (data.type) {
        case 'request_metrics':
          await this.sendMetrics(client.ws);
          break;
        case 'request_active_users':
          await this.sendActiveUsers(client.ws);
          break;
        case 'request_system_status':
          await this.sendSystemStatus(client.ws);
          break;
        case 'ping':
          client.lastPing = new Date();
          this.sendMessage(client.ws, { type: 'pong' });
          break;
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Send initial data to newly connected client
   */
  async sendInitialData(ws) {
    await Promise.all([
      this.sendMetrics(ws),
      this.sendActiveUsers(ws),
      this.sendSystemStatus(ws)
    ]);
  }

  /**
   * Send real-time metrics
   */
  async sendMetrics(ws) {
    try {
      const metrics = {
        type: 'metrics',
        timestamp: new Date().toISOString(),
        data: {
          // Database metrics
          totalLicenses: await this.getTotalLicenses(),
          totalEmailsSent: await this.getTotalEmailsSent(),
          conversionRate: await this.getConversionRate(),
          
          // System metrics
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          
          // Active connections
          activeWebSocketConnections: this.clients.size
        }
      };
      
      this.sendMessage(ws, metrics);
    } catch (error) {
      console.error('Error sending metrics:', error);
    }
  }

  /**
   * Send active users data
   */
  async sendActiveUsers(ws) {
    try {
      const activeUsers = {
        type: 'active_users',
        timestamp: new Date().toISOString(),
        data: {
          connectedAdmins: Array.from(this.clients.values()).map(client => ({
            email: client.user.email,
            connectedAt: client.connectedAt,
            lastPing: client.lastPing
          })),
          totalConnections: this.clients.size
        }
      };
      
      this.sendMessage(ws, activeUsers);
    } catch (error) {
      console.error('Error sending active users:', error);
    }
  }

  /**
   * Send system status
   */
  async sendSystemStatus(ws) {
    try {
      const systemStatus = {
        type: 'system_status',
        timestamp: new Date().toISOString(),
        data: {
          server: {
            status: 'healthy',
            uptime: process.uptime(),
            version: process.version,
            platform: process.platform,
            arch: process.arch
          },
          database: {
            status: await this.getDatabaseStatus(),
            lastBackup: await this.getLastBackupTime()
          },
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100).toFixed(2)
          }
        }
      };
      
      this.sendMessage(ws, systemStatus);
    } catch (error) {
      console.error('Error sending system status:', error);
    }
  }

  /**
   * Broadcast message to all connected admin clients
   */
  broadcast(message) {
    this.clients.forEach((client) => {
      if (client.ws.readyState === client.ws.OPEN) {
        this.sendMessage(client.ws, message);
      }
    });
  }

  /**
   * Send message to specific WebSocket client
   */
  sendMessage(ws, message) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Start periodic metrics collection and broadcasting
   */
  startMetricsCollection() {
    // Send metrics every 5 seconds
    this.metricsInterval = setInterval(() => {
      if (this.clients.size > 0) {
        this.clients.forEach((client) => {
          this.sendMetrics(client.ws);
        });
      }
    }, 5000);
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Database helper methods (with mock data for demonstration)
   */
  async getTotalLicenses() {
    try {
      // Mock data - replace with real database queries
      return Math.floor(Math.random() * 1000) + 500;
    } catch (error) {
      console.error('Error getting total licenses:', error);
      return 0;
    }
  }

  async getTotalEmailsSent() {
    try {
      // Mock data - replace with real database queries
      return Math.floor(Math.random() * 5000) + 2000;
    } catch (error) {
      console.error('Error getting total emails:', error);
      return 0;
    }
  }

  async getConversionRate() {
    try {
      // Mock data - replace with real calculation
      return (Math.random() * 15 + 5).toFixed(2);
    } catch (error) {
      console.error('Error calculating conversion rate:', error);
      return 0;
    }
  }

  async getDatabaseStatus() {
    try {
      // Mock successful connection
      return 'connected';
    } catch (error) {
      return 'error';
    }
  }

  async getLastBackupTime() {
    try {
      // This would need to be implemented based on your backup system
      // For now, return a placeholder
      return new Date().toISOString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Cleanup and close server
   */
  close() {
    this.stopMetricsCollection();
    this.clients.clear();
    this.wss.close();
  }
}

export default AdminWebSocketServer;
