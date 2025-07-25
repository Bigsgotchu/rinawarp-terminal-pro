/**
 * WebSocket Communication Layer for RinaWarp
 * Inspired by WaveTerm's sophisticated real-time communication system
 */

class WebSocketManager {
  constructor(config = {}) {
    this.config = {
      url: config.url || 'ws://localhost:8080',
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      messageTimeout: config.messageTimeout || 15000,
      ...config,
    };

    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.pendingMessages = new Map();
    this.eventHandlers = new Map();
    this.heartbeatTimer = null;
    this.messageId = 0;

    this.setupEventHandlers();
  }

  async connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.config.url);

        const connectTimeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
          this.socket?.close();
        }, 10000);

        this.socket.onopen = () => {
          clearTimeout(connectTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processMessageQueue();

          console.log('✅ WebSocket connected');
          this.emit('connected');
          resolve();
        };

        this.socket.onmessage = event => {
          this.handleMessage(event.data);
        };

        this.socket.onclose = event => {
          this.handleDisconnection(event);
        };

        this.socket.onerror = error => {
          clearTimeout(connectTimeout);
          console.error('❌ WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.isConnected = false;
    console.log('📡 WebSocket disconnected');
    this.emit('disconnected');
  }

  async send(type, data = {}, options = {}) {
    const message = this.createMessage(type, data, options);

    if (!this.isConnected) {
      if (options.queue !== false) {
        this.messageQueue.push(message);
        console.log(`📤 Message queued: ${type}`);
        return Promise.resolve({ queued: true });
      } else {
        throw new Error('WebSocket not connected');
      }
    }

    return this.sendMessage(message);
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        // Set up response handling for messages that expect a response
        if (message.expectResponse) {
          const timeout = setTimeout(() => {
            this.pendingMessages.delete(message.id);
            reject(new Error(`Message timeout: ${message.type}`));
          }, this.config.messageTimeout);

          this.pendingMessages.set(message.id, { resolve, reject, timeout });
        }

        this.socket.send(JSON.stringify(message));
        console.log(`📤 Sent message: ${message.type}`);

        // If no response expected, resolve immediately
        if (!message.expectResponse) {
          resolve({ sent: true });
        }
      } catch (error) {
        if (message.expectResponse) {
          this.pendingMessages.delete(message.id);
        }
        reject(error);
      }
    });
  }

  createMessage(type, data, options) {
    return {
      id: ++this.messageId,
      type,
      data,
      timestamp: Date.now(),
      expectResponse: options.expectResponse || false,
      timeout: options.timeout || this.config.messageTimeout,
    };
  }

  handleMessage(rawData) {
    try {
      const message = JSON.parse(rawData);
      console.log(`📥 Received message: ${message.type}`);

      // Handle response to pending message
      if (message.responseId && this.pendingMessages.has(message.responseId)) {
        const pending = this.pendingMessages.get(message.responseId);
        clearTimeout(pending.timeout);
        this.pendingMessages.delete(message.responseId);

        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.data);
        }
        return;
      }

      // Route message to appropriate handler
      this.routeMessage(message);
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
      this.emit('error', { type: 'parse_error', error });
    }
  }

  routeMessage(message) {
    const { type, data, id } = message;

    // Built-in message handlers
    switch (type) {
      case 'heartbeat':
        this.send('heartbeat_response', { receivedAt: Date.now() });
        break;

      case 'terminal_data':
        this.handleTerminalData(data);
        break;

      case 'terminal_resize':
        this.handleTerminalResize(data);
        break;

      case 'file_change':
        this.handleFileChange(data);
        break;

      case 'system_notification':
        this.handleSystemNotification(data);
        break;

      case 'block_update':
        this.handleBlockUpdate(data);
        break;

      case 'connection_status':
        this.handleConnectionStatus(data);
        break;

      default:
        // Emit to custom handlers
        this.emit(type, data, id);
        break;
    }
  }

  handleTerminalData(data) {
    const { blockId, output, source } = data;

    this.emit('terminal_data', {
      blockId,
      output,
      source,
      timestamp: Date.now(),
    });

    // Update block manager if available
    if (window.blockManager) {
      const block = window.blockManager.blocks.get(blockId);
      if (block?.terminal) {
        block.terminal.write(output);
      }
    }
  }

  handleTerminalResize(data) {
    const { blockId, rows, cols } = data;

    this.emit('terminal_resize', { blockId, rows, cols });

    // Trigger resize in block manager
    if (window.blockManager) {
      const block = window.blockManager.blocks.get(blockId);
      if (block?.fitAddon) {
        block.fitAddon.fit();
      }
    }
  }

  handleFileChange(data) {
    const { path, type, content } = data;

    this.emit('file_change', { path, type, content });

    // Notify file preview system
    if (window.filePreviewSystem) {
      window.filePreviewSystem.handleFileChange(path, type, content);
    }
  }

  handleSystemNotification(data) {
    const { level, message, source, details } = data;

    this.emit('system_notification', { level, message, source, details });

    // Show in UI
    if (window.notificationSystem) {
      window.notificationSystem.show(message, level, { source, details });
    }
  }

  handleBlockUpdate(data) {
    const { blockId, updates } = data;

    this.emit('block_update', { blockId, updates });

    // Update block in block manager
    if (window.blockManager) {
      const block = window.blockManager.blocks.get(blockId);
      if (block) {
        Object.assign(block, updates);
        block.metadata.lastUpdated = new Date();
      }
    }
  }

  handleConnectionStatus(data) {
    const { connectionId, status, details } = data;

    this.emit('connection_status', { connectionId, status, details });

    // Update connection manager
    if (window.connectionManager) {
      window.connectionManager.updateConnectionStatus(connectionId, status, details);
    }
  }

  handleDisconnection(event) {
    this.isConnected = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    console.log(`📡 WebSocket disconnected: ${event.code} - ${event.reason}`);
    this.emit('disconnected', { code: event.code, reason: event.reason });

    // Attempt reconnection if not a clean close
    if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch(error => {
          console.error('❌ Reconnection failed:', error);

          if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else {
            console.error('❌ Max reconnection attempts reached');
            this.emit('max_reconnect_attempts_reached');
          }
        });
      }
    }, delay);
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send('heartbeat', { timestamp: Date.now() }, { queue: false }).catch(error => {
          console.warn('⚠️ Heartbeat failed:', error);
        });
      }
    }, this.config.heartbeatInterval);
  }

  processMessageQueue() {
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of queue) {
      this.sendMessage(message).catch(error => {
        console.error('❌ Failed to send queued message:', error);
      });
    }

    if (queue.length > 0) {
      console.log(`📤 Processed ${queue.length} queued messages`);
    }
  }

  setupEventHandlers() {
    // Terminal integration
    this.on('terminal_input', async data => {
      await this.send('terminal_input', data, { expectResponse: false });
    });

    // Block management integration
    this.on('block_created', async data => {
      await this.send('block_created', data, { expectResponse: false });
    });

    this.on('block_closed', async data => {
      await this.send('block_closed', data, { expectResponse: false });
    });

    // File operations
    this.on('file_request', async data => {
      return await this.send('file_request', data, { expectResponse: true });
    });

    // AI assistance
    this.on('ai_request', async data => {
      return await this.send('ai_request', data, { expectResponse: true });
    });
  }

  // Event system
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
    }
  }

  emit(event, ...args) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`❌ Event handler error for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      pendingMessages: this.pendingMessages.size,
    };
  }

  clearMessageQueue() {
    this.messageQueue = [];
    console.log('🗑️ Message queue cleared');
  }

  // Terminal-specific methods
  async sendTerminalInput(blockId, input) {
    return await this.send('terminal_input', { blockId, input });
  }

  async requestTerminalResize(blockId, rows, cols) {
    return await this.send('terminal_resize', { blockId, rows, cols });
  }

  async createTerminalSession(config) {
    return await this.send('create_terminal_session', config, { expectResponse: true });
  }

  async closeTerminalSession(sessionId) {
    return await this.send('close_terminal_session', { sessionId });
  }

  // File system methods
  async requestFileContent(path) {
    return await this.send('file_content_request', { path }, { expectResponse: true });
  }

  async watchFile(path) {
    return await this.send('file_watch', { path });
  }

  async unwatchFile(path) {
    return await this.send('file_unwatch', { path });
  }

  // AI integration methods
  async requestAICompletion(prompt, context = {}) {
    return await this.send('ai_completion_request', { prompt, context }, { expectResponse: true });
  }

  async requestCommandExplanation(command, context = {}) {
    return await this.send(
      'ai_command_explanation',
      { command, context },
      { expectResponse: true }
    );
  }

  // Connection management methods
  async createRemoteConnection(config) {
    return await this.send('create_remote_connection', config, { expectResponse: true });
  }

  async closeRemoteConnection(connectionId) {
    return await this.send('close_remote_connection', { connectionId });
  }

  async testRemoteConnection(connectionId) {
    return await this.send('test_remote_connection', { connectionId }, { expectResponse: true });
  }
}

// WebSocket Server Integration for Backend
export class WebSocketServer {
  constructor(server, config = {}) {
    this.server = server;
    this.config = {
      port: config.port || 8080,
      path: config.path || '/ws',
      heartbeatInterval: config.heartbeatInterval || 30000,
      ...config,
    };

    this.clients = new Map();
    this.terminalSessions = new Map();
    this.fileWatchers = new Map();
    this.connections = new Map();

    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    const WebSocket = require('ws');

    this.wss = new WebSocket.Server({
      server: this.server,
      path: this.config.path,
    });

    this.wss.on('connection', (ws, request) => {
      const clientId = this.generateClientId();

      this.clients.set(clientId, {
        id: clientId,
        ws,
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
        connected: Date.now(),
        lastHeartbeat: Date.now(),
      });

      console.log(`📡 Client connected: ${clientId}`);

      ws.on('message', data => {
        this.handleClientMessage(clientId, data);
      });

      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      ws.on('error', error => {
        console.error(`❌ WebSocket error for client ${clientId}:`, error);
      });

      // Send welcome message
      this.sendToClient(clientId, 'welcome', {
        clientId,
        serverVersion: '1.0.0',
        features: ['terminal', 'files', 'ai', 'connections'],
      });
    });

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();

    console.log(`✅ WebSocket server listening on ${this.config.path}`);
  }

  generateClientId() {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  handleClientMessage(clientId, rawData) {
    try {
      const message = JSON.parse(rawData);
      console.log(`📥 Message from ${clientId}: ${message.type}`);

      // Update last heartbeat
      const client = this.clients.get(clientId);
      if (client) {
        client.lastHeartbeat = Date.now();
      }

      this.routeClientMessage(clientId, message);
    } catch (error) {
      console.error('❌ Failed to parse client message:', error);
      this.sendToClient(clientId, 'error', {
        error: 'Invalid message format',
        originalMessage: rawData.toString(),
      });
    }
  }

  async routeClientMessage(clientId, message) {
    const { type, data, id } = message;

    try {
      let response = null;

      switch (type) {
        case 'heartbeat':
          response = { timestamp: Date.now() };
          break;

        case 'terminal_input':
          await this.handleTerminalInput(clientId, data);
          break;

        case 'terminal_resize':
          await this.handleTerminalResize(clientId, data);
          break;

        case 'create_terminal_session':
          response = await this.createTerminalSession(clientId, data);
          break;

        case 'close_terminal_session':
          await this.closeTerminalSession(clientId, data);
          break;

        case 'file_content_request':
          response = await this.handleFileContentRequest(clientId, data);
          break;

        case 'file_watch':
          await this.handleFileWatch(clientId, data);
          break;

        case 'ai_completion_request':
          response = await this.handleAICompletionRequest(clientId, data);
          break;

        case 'create_remote_connection':
          response = await this.createRemoteConnection(clientId, data);
          break;

        default:
          console.warn(`⚠️ Unknown message type: ${type}`);
          break;
      }

      // Send response if expected
      if (response !== null && id) {
        this.sendToClient(clientId, 'response', response, id);
      }
    } catch (error) {
      console.error(`❌ Error handling message ${type}:`, error);

      if (id) {
        this.sendToClient(
          clientId,
          'response',
          {
            error: error.message,
          },
          id
        );
      }
    }
  }

  sendToClient(clientId, type, data, responseId = null) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== 1) {
      return false;
    }

    const message = {
      type,
      data,
      timestamp: Date.now(),
    };

    if (responseId) {
      message.responseId = responseId;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ Failed to send message to ${clientId}:`, error);
      return false;
    }
  }

  broadcast(type, data, excludeClient = null) {
    let sentCount = 0;

    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClient && client.ws.readyState === 1) {
        if (this.sendToClient(clientId, type, data)) {
          sentCount++;
        }
      }
    }

    console.log(`📡 Broadcast ${type} to ${sentCount} clients`);
    return sentCount;
  }

  handleClientDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Clean up client resources
    this.cleanupClientResources(clientId);
    this.clients.delete(clientId);

    console.log(`📡 Client disconnected: ${clientId}`);
  }

  cleanupClientResources(clientId) {
    // Close terminal sessions
    for (const [sessionId, session] of this.terminalSessions) {
      if (session.clientId === clientId) {
        this.closeTerminalSession(clientId, { sessionId });
      }
    }

    // Remove file watchers
    for (const [path, watcher] of this.fileWatchers) {
      if (watcher.clientId === clientId) {
        watcher.close();
        this.fileWatchers.delete(path);
      }
    }

    // Close remote connections
    for (const [connectionId, connection] of this.connections) {
      if (connection.clientId === clientId) {
        this.closeRemoteConnection(clientId, { connectionId });
      }
    }
  }

  startHeartbeatMonitoring() {
    setInterval(() => {
      const now = Date.now();
      const timeout = this.config.heartbeatInterval * 2;

      for (const [clientId, client] of this.clients) {
        if (now - client.lastHeartbeat > timeout) {
          console.log(`💔 Client ${clientId} timed out`);
          client.ws.terminate();
          this.handleClientDisconnect(clientId);
        }
      }
    }, this.config.heartbeatInterval);
  }

  // Terminal session management
  async createTerminalSession(clientId, config) {
    const { spawn } = require('child_process');
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const shell = config.shell || (process.platform === 'win32' ? 'pwsh.exe' : '/bin/bash');
      const args = config.args || [];

      const proc = spawn(shell, args, {
        cwd: config.cwd || process.cwd(),
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const session = {
        id: sessionId,
        clientId,
        process: proc,
        shell,
        created: Date.now(),
      };

      this.terminalSessions.set(sessionId, session);

      // Handle process output
      proc.stdout.on('data', data => {
        this.sendToClient(clientId, 'terminal_data', {
          sessionId,
          output: data.toString(),
          source: 'stdout',
        });
      });

      proc.stderr.on('data', data => {
        this.sendToClient(clientId, 'terminal_data', {
          sessionId,
          output: data.toString(),
          source: 'stderr',
        });
      });

      proc.on('exit', (code, signal) => {
        this.sendToClient(clientId, 'terminal_exit', {
          sessionId,
          code,
          signal,
        });
        this.terminalSessions.delete(sessionId);
      });

      console.log(`✅ Terminal session created: ${sessionId}`);
      return { sessionId, shell, pid: proc.pid };
    } catch (error) {
      console.error('❌ Failed to create terminal session:', error);
      throw error;
    }
  }

  async handleTerminalInput(clientId, data) {
    const { sessionId, input } = data;
    const session = this.terminalSessions.get(sessionId);

    if (!session || session.clientId !== clientId) {
      throw new Error(`Terminal session ${sessionId} not found`);
    }

    session.process.stdin.write(input);
  }

  async closeTerminalSession(clientId, data) {
    const { sessionId } = data;
    const session = this.terminalSessions.get(sessionId);

    if (session && session.clientId === clientId) {
      session.process.kill('SIGTERM');
      this.terminalSessions.delete(sessionId);
      console.log(`✅ Terminal session closed: ${sessionId}`);
    }
  }

  // File system operations
  async handleFileContentRequest(clientId, data) {
    const { path } = data;
    const fs = require('fs').promises;

    try {
      const content = await fs.readFile(path, 'utf8');
      const stats = await fs.stat(path);

      return {
        path,
        content,
        size: stats.size,
        modified: stats.mtime,
        type: this.getFileType(path),
      };
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${error.message}`);
    }
  }

  getFileType(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const typeMap = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      md: 'markdown',
      json: 'json',
      html: 'html',
      css: 'css',
      txt: 'text',
    };
    return typeMap[ext] || 'text';
  }

  getConnectedClients() {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      ip: client.ip,
      userAgent: client.userAgent,
      connected: client.connected,
      lastHeartbeat: client.lastHeartbeat,
    }));
  }
}

// Export for integration
export default WebSocketManager;
