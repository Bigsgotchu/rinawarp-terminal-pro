/**
 * RinaWarp Terminal TypeScript SDK
 * Provides easy integration with RinaWarp Terminal API with full type safety
 */

export interface RinaWarpConfig {
  apiUrl?: string;
  apiKey: string;
  timeout?: number;
  retries?: number;
  [key: string]: any;
}

export interface Terminal {
  id: string;
  name: string;
  organizationId?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface CommandResult {
  commandId: string;
  exitCode: number;
  output: string;
  error: string;
  duration: number;
  timestamp: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
}

export interface UserAnalytics {
  totalCommands: number;
  activeTerminals: number;
  lastActivity: string;
  popularCommands: Array<{
    command: string;
    count: number;
  }>;
}

export interface BatchOperation {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface WebSocketMessage {
  type: string;
  payload?: any;
  terminalId?: string;
  commandId?: string;
  timestamp?: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

export class RinaWarpError extends Error {
  public readonly status?: number;
  public readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'RinaWarpError';
    this.status = status;
    this.code = code;
  }
}

export class RinaWarpSDK {
  private config: Required<RinaWarpConfig>;
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, (message: WebSocketMessage) => void>();
  private eventListeners = new Map<string, Array<(data?: any) => void>>();

  constructor(config: RinaWarpConfig) {
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
  }

  /**
   * Make authenticated HTTP request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit & { body?: Record<string, any> } = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-RinaWarp-API-Key': this.config.apiKey,
      'User-Agent': 'RinaWarp-SDK-TS/1.0.0',
      ...(options.headers || {}),
    };

    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers,
      ...options,
    };

    if (options.body && typeof options.body === 'object') {
      requestOptions.body = JSON.stringify(options.body);
    }

    let lastError: Error;
    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
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
        lastError = error as Error;
        if (attempt < this.config.retries - 1 && this.isRetryableError(error)) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * Terminal Management
   */
  async createTerminal(name: string, organizationId?: string): Promise<Terminal> {
    return this.request<Terminal>('/api/terminal', {
      method: 'POST',
      body: { name, organizationId },
    });
  }

  async getTerminal(terminalId: string): Promise<Terminal> {
    return this.request<Terminal>(`/api/terminal/${terminalId}`);
  }

  async getTerminals(): Promise<Terminal[]> {
    return this.request<Terminal[]>('/api/terminal');
  }

  async deleteTerminal(terminalId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/terminal/${terminalId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Command Execution
   */
  async executeCommand(
    terminalId: string,
    command: string,
    options: Record<string, any> = {}
  ): Promise<CommandResult> {
    return this.request<CommandResult>(`/api/terminal/${terminalId}/execute`, {
      method: 'POST',
      body: { command, ...options },
    });
  }

  async getCommandHistory(terminalId: string, limit: number = 50): Promise<CommandResult[]> {
    return this.request<CommandResult[]>(`/api/terminal/${terminalId}/history?limit=${limit}`);
  }

  /**
   * Performance Analytics
   */
  async getPerformanceMetrics(
    terminalId: string,
    timeRange: TimeRange
  ): Promise<PerformanceMetrics> {
    const params = new URLSearchParams({
      start: timeRange.start,
      end: timeRange.end,
    });
    return this.request<PerformanceMetrics>(`/api/analytics/performance/${terminalId}?${params}`);
  }

  async getUserAnalytics(userId: string = 'me'): Promise<UserAnalytics> {
    return this.request<UserAnalytics>(`/api/analytics/user/${userId}`);
  }

  async getOrganizationAnalytics(organizationId: string): Promise<any> {
    return this.request(`/api/analytics/organization/${organizationId}`);
  }

  /**
   * Real-time WebSocket Connection
   */
  async connect(): Promise<void> {
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

      this.ws!.onopen = () => {
        clearTimeout(timeout);
        this.setupWebSocketHandlers();
        resolve();
      };

      this.ws!.onerror = error => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
  }

  /**
   * Real-time Subscriptions
   */
  async subscribeToTerminal(
    terminalId: string,
    callback: (message: WebSocketMessage) => void
  ): Promise<() => void> {
    await this.connect();

    const channel = `terminal:${terminalId}`;
    this.subscriptions.set(channel, callback);

    this.ws!.send(
      JSON.stringify({
        type: 'subscribe',
        payload: { channel },
      })
    );

    return () => this.unsubscribe(channel);
  }

  async subscribeToPerformanceAlerts(
    callback: (message: WebSocketMessage) => void
  ): Promise<() => void> {
    await this.connect();

    const channel = 'performance:alerts';
    this.subscriptions.set(channel, callback);

    this.ws!.send(
      JSON.stringify({
        type: 'subscribe',
        payload: { channel },
      })
    );

    return () => this.unsubscribe(channel);
  }

  unsubscribe(channel: string): void {
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
  async graphql<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
    return this.request<T>('/graphql', {
      method: 'POST',
      body: { query, variables },
    });
  }

  /**
   * Batch Operations
   */
  async batch<T = any>(operations: BatchOperation[]): Promise<T> {
    return this.request<T>('/api/batch', {
      method: 'POST',
      body: { operations },
    });
  }

  /**
   * Event Emitter functionality
   */
  on(event: string, callback: (data?: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data?: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Helper methods
   */
  private setupWebSocketHandlers(): void {
    this.ws!.onmessage = event => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws!.onclose = () => {
      this.emit('disconnect');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (this.subscriptions.size > 0) {
          this.connect().catch(console.error);
        }
      }, 5000);
    };

    this.ws!.onerror = error => {
      this.emit('error', error);
    };
  }

  private handleWebSocketMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'connected':
        this.emit('connect', message);
        break;

      case 'subscribed':
        this.emit('subscribed', message.payload?.channel);
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
        this.emit('error', new Error(message.payload?.error || 'Unknown error'));
        break;

      default:
        this.emit('message', message);
    }
  }

  private async getWebSocketToken(): Promise<string> {
    const response = await this.request<{ token: string }>('/api/auth/ws-token', {
      method: 'POST',
    });
    return response.token;
  }

  private isRetryableError(error: any): boolean {
    if (error.name === 'AbortError') return false;
    if (error.status && error.status >= 400 && error.status < 500) return false;
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility methods for common operations
   */
  async streamCommand(
    terminalId: string,
    command: string,
    onOutput: (output: string) => void
  ): Promise<CommandResult> {
    const unsubscribe = await this.subscribeToTerminal(terminalId, message => {
      if (message.type === 'command_output') {
        onOutput(message.payload?.output || '');
      }
    });

    try {
      const result = await this.executeCommand(terminalId, command);
      return result;
    } finally {
      unsubscribe();
    }
  }

  async waitForCommand(
    terminalId: string,
    commandId: string,
    timeout: number = 30000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, timeout);

      const unsubscribe = this.subscribeToTerminal(terminalId, message => {
        if (message.commandId === commandId && message.type === 'command_complete') {
          clearTimeout(timer);
          unsubscribe.then(unsub => unsub());
          resolve(message.payload?.result);
        }
      });
    });
  }
}

// Export factory function
export function createRinaWarpSDK(config: RinaWarpConfig): RinaWarpSDK {
  return new RinaWarpSDK(config);
}

export default RinaWarpSDK;
