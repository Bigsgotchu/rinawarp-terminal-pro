/**
 * RinaWarp Terminal JavaScript SDK
 * Provides easy integration with RinaWarp Terminal API
 */

import { ErrorHandler } from './error-handler.js';

class RinaWarpSDK {
  constructor(config = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'https://api.rinawarp.com',
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      ...config,
    };

    if (!this.config.apiKey) {
      throw new Error('API key is required. Get one at https://dashboard.rinawarp.com');
    }

    this.ws = null;
    this.subscriptions = new Map();
    this.eventListeners = new Map();
    
    // Initialize error handler
    this.errorHandler = new ErrorHandler(this);
  }

  /**
   * Make authenticated HTTP request
   */
  async request(endpoint, options = {}) {
    const url = `${this.config.apiUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-RinaWarp-API-Key': this.config.apiKey,
      'User-Agent': 'RinaWarp-SDK-JS/1.0.0',
      ...options.headers,
    };

    const requestOptions = {
      method: options.method || 'GET',
      headers,
      ...options,
    };

    if (options.body && typeof options.body === 'object') {
      requestOptions.body = JSON.stringify(options.body);
    }

    let lastError;
    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = setTimeout(() => controller?.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...requestOptions,
          ...(controller && { signal: controller.signal }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new RinaWarpError(
            errorData.error || `HTTP ${response.status}`,
            response.status,
            errorData.code
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt < this.config.retries - 1 && this.isRetryableError(error)) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Terminal Management
   */
  async createTerminal(name, organizationId = null) {
    return this.request('/api/terminal', {
      method: 'POST',
      body: { name, organizationId },
    });
  }

  async getTerminal(terminalId) {
    return this.request(`/api/terminal/${terminalId}`);
  }

  async getTerminals() {
    return this.request('/api/terminal');
  }

  async deleteTerminal(terminalId) {
    return this.request(`/api/terminal/${terminalId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Command Execution
   */
  async executeCommand(terminalId, command, options = {}) {
    return this.request(`/api/terminal/${terminalId}/execute`, {
      method: 'POST',
      body: { command, ...options },
    });
  }

  async getCommandHistory(terminalId, limit = 50) {
    return this.request(`/api/terminal/${terminalId}/history?limit=${limit}`);
  }

  /**
   * Performance Analytics
   */
  async getPerformanceMetrics(terminalId, timeRange) {
    const params = new URLSearchParams({
      start: timeRange.start,
      end: timeRange.end,
    });
    return this.request(`/api/analytics/performance/${terminalId}?${params}`);
  }

  async getUserAnalytics(userId = 'me') {
    return this.request(`/api/analytics/user/${userId}`);
  }

  async getOrganizationAnalytics(organizationId) {
    return this.request(`/api/analytics/organization/${organizationId}`);
  }

  /**
   * Real-time WebSocket Connection
   */
  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = this.config.apiUrl.replace(/^http/, 'ws') + '/ws';
    const token = await this.getWebSocketToken();

    this.ws = new WebSocket(`${wsUrl}?token=${token}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.setupWebSocketHandlers();
        resolve();
      };

      this.ws.onerror = error => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
  }

  /**
   * Real-time Subscriptions
   */
  async subscribeToTerminal(terminalId, callback) {
    await this.connect();

    const channel = `terminal:${terminalId}`;
    this.subscriptions.set(channel, callback);

    this.ws.send(
      JSON.stringify({
        type: 'subscribe',
        payload: { channel },
      })
    );

    return () => this.unsubscribe(channel);
  }

  async subscribeToPerformanceAlerts(callback) {
    await this.connect();

    const channel = 'performance:alerts';
    this.subscriptions.set(channel, callback);

    this.ws.send(
      JSON.stringify({
        type: 'subscribe',
        payload: { channel },
      })
    );

    return () => this.unsubscribe(channel);
  }

  unsubscribe(channel) {
    this.subscriptions.delete(channel);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'unsubscribe',
          payload: { channel },
        })
      );
    }
  }

  /**
   * GraphQL Support
   */
  async graphql(query, variables = {}) {
    return this.request('/graphql', {
      method: 'POST',
      body: { query, variables },
    });
  }

  /**
   * Batch Operations
   */
  async batch(operations) {
    return this.request('/api/batch', {
      method: 'POST',
      body: { operations },
    });
  }

  /**
   * Event Emitter functionality
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Helper methods
   */
  setupWebSocketHandlers() {
    this.ws.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      this.emit('disconnect');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (this.subscriptions.size > 0) {
          this.connect().catch(console.error);
        }
      }, 5000);
    };

    this.ws.onerror = error => {
      this.emit('error', error);
    };
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'connected':
        this.emit('connect', message);
        break;

      case 'subscribed':
        this.emit('subscribed', message.channel);
        break;

      case 'terminal_output':
        const terminalCallback = this.subscriptions.get(`terminal:${message.terminalId}`);
        if (terminalCallback) {
          terminalCallback(message);
        }
        break;

      case 'performance_alert':
        const alertCallback = this.subscriptions.get('performance:alerts');
        if (alertCallback) {
          alertCallback(message);
        }
        break;

      case 'error':
        this.emit('error', new Error(message.error));
        break;

      default:
        this.emit('message', message);
    }
  }

  async getWebSocketToken() {
    const response = await this.request('/api/auth/ws-token', {
      method: 'POST',
    });
    return response.token;
  }

  isRetryableError(error) {
    if (error.name === 'AbortError') return false;
    if (error.status && error.status >= 400 && error.status < 500) return false;
    return true;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility methods for common operations
   */
  async streamCommand(terminalId, command, onOutput) {
    const unsubscribe = await this.subscribeToTerminal(terminalId, message => {
      if (message.type === 'command_output') {
        onOutput(message.output);
      }
    });

    try {
      const result = await this.executeCommand(terminalId, command);
      return result;
    } finally {
      unsubscribe();
    }
  }

  async waitForCommand(terminalId, commandId, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, timeout);

      const unsubscribe = this.subscribeToTerminal(terminalId, message => {
        if (message.commandId === commandId && message.type === 'command_complete') {
          clearTimeout(timer);
          unsubscribe();
          resolve(message.result);
        }
      });
    });
  }
}

/**
 * Custom Error class for RinaWarp API errors
 */
class RinaWarpError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'RinaWarpError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Create a safe SDK instance with error handling
 */
function createSafeSDK(config) {
  const sdk = new RinaWarpSDK(config);
  return sdk.errorHandler.createSafeSDK(sdk);
}

// Browser/Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RinaWarpSDK, RinaWarpError, createSafeSDK };
} else if (typeof window !== 'undefined') {
  window.RinaWarpSDK = RinaWarpSDK;
  window.RinaWarpError = RinaWarpError;
  window.createSafeSDK = createSafeSDK;
}

export { RinaWarpSDK, RinaWarpError, createSafeSDK };
