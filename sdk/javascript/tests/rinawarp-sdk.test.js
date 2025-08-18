/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const { RinaWarpSDK, RinaWarpError } = require('../src/rinawarp-sdk');
const fetchMock = require('jest-fetch-mock');

// Mock WebSocket
const mockWebSocket = {
  OPEN: 1,
  CLOSED: 3,
  readyState: 1,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

global.WebSocket = jest.fn(() => mockWebSocket);
global.fetch = fetchMock;

describe('RinaWarpSDK', () => {
  let sdk;
  const mockConfig = {
    apiKey: 'test-api-key',
    apiUrl: 'https://api.test.com',
    timeout: 5000,
    retries: 2,
  };

  beforeEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks();
    sdk = new RinaWarpSDK(mockConfig);
  });

  afterEach(async () => {
    await sdk.disconnect();
  });

  describe('Constructor', () => {
    it('should initialize with correct config', () => {
      expect(sdk.config.apiKey).toBe(mockConfig.apiKey);
      expect(sdk.config.apiUrl).toBe(mockConfig.apiUrl);
      expect(sdk.config.timeout).toBe(mockConfig.timeout);
      expect(sdk.config.retries).toBe(mockConfig.retries);
    });

    it('should throw error if no API key provided', () => {
      expect(() => new RinaWarpSDK({})).toThrow('API key is required');
    });

    it('should use default values for optional config', () => {
      const sdkWithDefaults = new RinaWarpSDK({ apiKey: 'test' });
      expect(sdkWithDefaults.config.apiUrl).toBe('https://api.rinawarp.com');
      expect(sdkWithDefaults.config.timeout).toBe(30000);
      expect(sdkWithDefaults.config.retries).toBe(3);
    });
  });

  describe('HTTP Requests', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'test' };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await sdk.request('/test');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-RinaWarp-API-Key': 'test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make successful POST request with body', async () => {
      const mockResponse = { success: true };
      const requestBody = { name: 'test' };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await sdk.request('/test', {
        method: 'POST',
        body: requestBody,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle HTTP error responses', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' }), {
        status: 404,
      });

      await expect(sdk.request('/test')).rejects.toThrow(RinaWarpError);
    });

    it('should retry on network errors', async () => {
      fetchMock
        .mockRejectOnce(new Error('Network error'))
        .mockResponseOnce(JSON.stringify({ success: true }));

      const result = await sdk.request('/test');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('should not retry on client errors', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Bad request' }), { status: 400 });

      await expect(sdk.request('/test')).rejects.toThrow(RinaWarpError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Terminal Management', () => {
    it('should create terminal', async () => {
      const mockTerminal = { id: 'term-1', name: 'Test Terminal' };
      fetchMock.mockResponseOnce(JSON.stringify(mockTerminal));

      const result = await sdk.createTerminal('Test Terminal');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/api/terminal',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test Terminal', organizationId: null }),
        })
      );
      expect(result).toEqual(mockTerminal);
    });

    it('should get terminal by ID', async () => {
      const mockTerminal = { id: 'term-1', name: 'Test Terminal' };
      fetchMock.mockResponseOnce(JSON.stringify(mockTerminal));

      const result = await sdk.getTerminal('term-1');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/api/terminal/term-1',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockTerminal);
    });

    it('should get all terminals', async () => {
      const mockTerminals = [
        { id: 'term-1', name: 'Terminal 1' },
        { id: 'term-2', name: 'Terminal 2' },
      ];
      fetchMock.mockResponseOnce(JSON.stringify(mockTerminals));

      const result = await sdk.getTerminals();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/api/terminal',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockTerminals);
    });

    it('should delete terminal', async () => {
      const mockResponse = { success: true };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const result = await sdk.deleteTerminal('term-1');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/api/terminal/term-1',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Command Execution', () => {
    it('should execute command', async () => {
      const mockResult = {
        commandId: 'cmd-1',
        exitCode: 0,
        output: 'Hello World',
        timestamp: '2024-01-01T00:00:00Z',
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockResult));

      const result = await sdk.executeCommand('term-1', 'echo "Hello World"');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/api/terminal/term-1/execute',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ command: 'echo "Hello World"' }),
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('should get command history', async () => {
      const mockHistory = [
        { command: 'ls', timestamp: '2024-01-01T00:00:00Z' },
        { command: 'pwd', timestamp: '2024-01-01T00:01:00Z' },
      ];
      fetchMock.mockResponseOnce(JSON.stringify(mockHistory));

      const result = await sdk.getCommandHistory('term-1', 10);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/api/terminal/term-1/history?limit=10',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockHistory);
    });
  });

  describe('Performance Analytics', () => {
    it('should get performance metrics', async () => {
      const mockMetrics = {
        responseTime: 100,
        throughput: 1000,
        errorRate: 0.01,
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockMetrics));

      const timeRange = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
      };

      const result = await sdk.getPerformanceMetrics('term-1', timeRange);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/api/analytics/performance/term-1?start=2024-01-01T00%3A00%3A00Z&end=2024-01-31T23%3A59%3A59Z',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockMetrics);
    });

    it('should get user analytics', async () => {
      const mockAnalytics = {
        totalCommands: 100,
        activeTerminals: 5,
        lastActivity: '2024-01-01T00:00:00Z',
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockAnalytics));

      const result = await sdk.getUserAnalytics();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/api/analytics/user/me',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('WebSocket Connection', () => {
    it('should connect to WebSocket', async () => {
      const mockToken = { token: 'ws-token-123' };
      fetchMock.mockResponseOnce(JSON.stringify(mockToken));

      mockWebSocket.onopen = jest.fn();

      // Mock the WebSocket constructor to call onopen immediately
      global.WebSocket = jest.fn(() => {
        const ws = { ...mockWebSocket };
        setTimeout(() => ws.onopen && ws.onopen(), 0);
        return ws;
      });

      await sdk.connect();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/api/auth/ws-token',
        expect.objectContaining({ method: 'POST' })
      );
      expect(global.WebSocket).toHaveBeenCalledWith('wss://api.test.com/ws?token=ws-token-123');
    });

    it('should handle WebSocket connection timeout', async () => {
      const mockToken = { token: 'ws-token-123' };
      fetchMock.mockResponseOnce(JSON.stringify(mockToken));

      global.WebSocket = jest.fn(() => mockWebSocket);

      await expect(sdk.connect()).rejects.toThrow('WebSocket connection timeout');
    });

    it('should subscribe to terminal updates', async () => {
      const mockToken = { token: 'ws-token-123' };
      fetchMock.mockResponseOnce(JSON.stringify(mockToken));

      global.WebSocket = jest.fn(() => {
        const ws = { ...mockWebSocket };
        setTimeout(() => ws.onopen && ws.onopen(), 0);
        return ws;
      });

      const callback = jest.fn();
      const unsubscribe = await sdk.subscribeToTerminal('term-1', callback);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          payload: { channel: 'terminal:term-1' },
        })
      );
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Event Handling', () => {
    it('should register and trigger event handlers', () => {
      const handler = jest.fn();
      sdk.on('test-event', handler);

      sdk.emit('test-event', { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should unregister event handlers', () => {
      const handler = jest.fn();
      sdk.on('test-event', handler);
      sdk.off('test-event', handler);

      sdk.emit('test-event', { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should identify retryable errors', () => {
      expect(sdk.isRetryableError(new Error('Network error'))).toBe(true);
      expect(sdk.isRetryableError({ name: 'AbortError' })).toBe(false);
      expect(sdk.isRetryableError({ status: 400 })).toBe(false);
      expect(sdk.isRetryableError({ status: 500 })).toBe(true);
    });

    it('should create delay promise', async () => {
      const start = Date.now();
      await sdk.delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90);
    });
  });

  describe('GraphQL Support', () => {
    it('should execute GraphQL query', async () => {
      const mockResult = {
        data: {
          terminals: [{ id: 'term-1', name: 'Test' }],
        },
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockResult));

      const query = 'query { terminals { id name } }';
      const variables = { limit: 10 };

      const result = await sdk.graphql(query, variables);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/graphql',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query, variables }),
        })
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('Batch Operations', () => {
    it('should execute batch operations', async () => {
      const mockResult = {
        results: [
          { status: 200, data: { terminals: [] } },
          { status: 201, data: { id: 'term-1' } },
        ],
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockResult));

      const operations = [
        { method: 'GET', endpoint: '/api/terminal' },
        { method: 'POST', endpoint: '/api/terminal', body: { name: 'Test' } },
      ];

      const result = await sdk.batch(operations);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test.com/api/batch',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ operations }),
        })
      );
      expect(result).toEqual(mockResult);
    });
  });
});

describe('RinaWarpError', () => {
  it('should create error with message only', () => {
    const error = new RinaWarpError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('RinaWarpError');
    expect(error.status).toBeUndefined();
    expect(error.code).toBeUndefined();
  });

  it('should create error with all properties', () => {
    const error = new RinaWarpError('Test error', 404, 'NOT_FOUND');
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });
});
