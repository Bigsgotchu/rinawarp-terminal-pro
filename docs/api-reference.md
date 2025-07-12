# RinaWarp Terminal API Reference

## Overview

The RinaWarp Terminal API provides programmatic access to terminal management, command execution, and performance analytics. This documentation covers both JavaScript/TypeScript and Python SDKs.

## Authentication

All API requests require authentication via an API key. You can obtain an API key from the [RinaWarp Dashboard](https://dashboard.rinawarp.com).

### API Key Usage

Include your API key in the request headers:

```
X-RinaWarp-API-Key: your-api-key-here
```

## SDKs

### JavaScript/TypeScript SDK

#### Installation

```bash
npm install @rinawarp/terminal-sdk
```

#### Basic Usage

```javascript
import { RinaWarpSDK } from '@rinawarp/terminal-sdk';

const sdk = new RinaWarpSDK({
  apiKey: 'your-api-key-here',
  apiUrl: 'https://api.rinawarp.com'
});
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | - | **Required.** Your RinaWarp API key |
| `apiUrl` | string | `https://api.rinawarp.com` | Base API URL |
| `timeout` | number | `30000` | Request timeout in milliseconds |
| `retries` | number | `3` | Number of retry attempts for failed requests |

### Python SDK

#### Installation

```bash
pip install rinawarp-terminal-sdk
```

#### Basic Usage

```python
from rinawarp_sdk import create_client

async with create_client('your-api-key-here') as client:
    # Your code here
    pass
```

## API Endpoints

### Terminal Management

#### Create Terminal

Creates a new terminal instance.

**JavaScript/TypeScript:**
```javascript
const terminal = await sdk.createTerminal('My Terminal', 'org-123');
```

**Python:**
```python
config = TerminalConfig(name='My Terminal', organization_id='org-123')
terminal = await client.create_terminal(config)
```

**Response:**
```json
{
  "id": "term-abc123",
  "name": "My Terminal",
  "organizationId": "org-123",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### Get Terminal

Retrieves information about a specific terminal.

**JavaScript/TypeScript:**
```javascript
const terminal = await sdk.getTerminal('term-abc123');
```

**Python:**
```python
terminal = await client.get_terminal('term-abc123')
```

#### List Terminals

Gets all terminals for the authenticated user.

**JavaScript/TypeScript:**
```javascript
const terminals = await sdk.getTerminals();
```

**Python:**
```python
terminals = await client.get_terminals()
```

#### Delete Terminal

Deletes a terminal instance.

**JavaScript/TypeScript:**
```javascript
await sdk.deleteTerminal('term-abc123');
```

**Python:**
```python
await client.delete_terminal('term-abc123')
```

### Command Execution

#### Execute Command

Executes a command in a terminal.

**JavaScript/TypeScript:**
```javascript
const result = await sdk.executeCommand('term-abc123', 'ls -la');
```

**Python:**
```python
result = await client.execute_command('term-abc123', 'ls -la')
```

**Response:**
```json
{
  "commandId": "cmd-xyz789",
  "exitCode": 0,
  "output": "total 8\ndrwxr-xr-x 2 user user 4096 Jan 1 00:00 .\n",
  "error": "",
  "duration": 0.123,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Get Command History

Retrieves command history for a terminal.

**JavaScript/TypeScript:**
```javascript
const history = await sdk.getCommandHistory('term-abc123', 50);
```

**Python:**
```python
history = await client.get_command_history('term-abc123', 50)
```

### Performance Analytics

#### Get Performance Metrics

Retrieves performance metrics for a terminal.

**JavaScript/TypeScript:**
```javascript
const metrics = await sdk.getPerformanceMetrics('term-abc123', {
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-31T23:59:59Z'
});
```

**Python:**
```python
metrics = await client.get_performance_metrics('term-abc123', {
  'start': '2024-01-01T00:00:00Z',
  'end': '2024-01-31T23:59:59Z'
})
```

**Response:**
```json
{
  "responseTime": 95.5,
  "throughput": 1250.0,
  "errorRate": 0.012,
  "cpuUsage": 23.4,
  "memoryUsage": 1024.5,
  "diskUsage": 2048.0
}
```

#### Get User Analytics

Retrieves analytics for the authenticated user.

**JavaScript/TypeScript:**
```javascript
const analytics = await sdk.getUserAnalytics();
```

**Python:**
```python
analytics = await client.get_user_analytics()
```

**Response:**
```json
{
  "totalCommands": 1500,
  "activeTerminals": 5,
  "lastActivity": "2024-01-01T00:00:00Z",
  "popularCommands": [
    { "command": "ls", "count": 250 },
    { "command": "cd", "count": 200 }
  ]
}
```

### Real-time Features

#### WebSocket Connection

Establish a WebSocket connection for real-time updates.

**JavaScript/TypeScript:**
```javascript
await sdk.connect();

// Listen for connection events
sdk.on('connect', () => console.log('Connected'));
sdk.on('disconnect', () => console.log('Disconnected'));
sdk.on('error', (error) => console.error('Error:', error));
```

**Python:**
```python
await client.connect_websocket()

# Event handlers
client.on('connect', lambda: print('Connected'))
client.on('disconnect', lambda: print('Disconnected'))
client.on('error', lambda err: print(f'Error: {err}'))
```

#### Subscribe to Terminal Updates

Subscribe to real-time terminal output.

**JavaScript/TypeScript:**
```javascript
const unsubscribe = await sdk.subscribeToTerminal('term-abc123', (message) => {
  console.log('Terminal output:', message.payload);
});

// Later, unsubscribe
unsubscribe();
```

**Python:**
```python
async def terminal_handler(message):
    print(f'Terminal output: {message.payload}')

await client.subscribe_to_terminal('term-abc123', terminal_handler)
```

#### Subscribe to Performance Alerts

Subscribe to performance alerts.

**JavaScript/TypeScript:**
```javascript
const unsubscribe = await sdk.subscribeToPerformanceAlerts((alert) => {
  console.log('Performance alert:', alert);
});
```

**Python:**
```python
async def alert_handler(alert):
    print(f'Performance alert: {alert}')

await client.subscribe_to_performance_alerts(alert_handler)
```

### Advanced Features

#### GraphQL Queries

Execute GraphQL queries against the API.

**JavaScript/TypeScript:**
```javascript
const query = `
  query GetTerminals($limit: Int) {
    terminals(limit: $limit) {
      id
      name
      status
      createdAt
    }
  }
`;

const result = await sdk.graphql(query, { limit: 10 });
```

**Python:**
```python
query = """
  query GetTerminals($limit: Int) {
    terminals(limit: $limit) {
      id
      name
      status
      createdAt
    }
  }
"""

result = await client.graphql(query, {'limit': 10})
```

#### Batch Operations

Execute multiple operations in a single request.

**JavaScript/TypeScript:**
```javascript
const operations = [
  { method: 'GET', endpoint: '/api/terminal' },
  { method: 'POST', endpoint: '/api/terminal', body: { name: 'New Terminal' } }
];

const results = await sdk.batch(operations);
```

**Python:**
```python
operations = [
  {'method': 'GET', 'endpoint': '/api/terminal'},
  {'method': 'POST', 'endpoint': '/api/terminal', 'body': {'name': 'New Terminal'}}
]

results = await client.batch(operations)
```

## Error Handling

### RinaWarpError

Both SDKs provide a custom error class for API errors.

**JavaScript/TypeScript:**
```javascript
import { RinaWarpError } from '@rinawarp/terminal-sdk';

try {
  await sdk.getTerminal('invalid-id');
} catch (error) {
  if (error instanceof RinaWarpError) {
    console.log('Status:', error.status);
    console.log('Code:', error.code);
    console.log('Message:', error.message);
  }
}
```

**Python:**
```python
from rinawarp_sdk import RinaWarpError

try:
    await client.get_terminal('invalid-id')
except RinaWarpError as error:
    print(f'Status: {error.status}')
    print(f'Code: {error.code}')
    print(f'Message: {error}')
```

### Common Error Codes

| Code | Status | Description |
|------|---------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limiting

The API enforces rate limiting to ensure fair usage:

- **Free tier:** 100 requests per minute
- **Pro tier:** 1,000 requests per minute
- **Enterprise tier:** 10,000 requests per minute

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Best Practices

### Connection Management

1. **Reuse connections:** Keep WebSocket connections open for real-time features
2. **Handle reconnection:** Implement exponential backoff for reconnection attempts
3. **Clean up:** Always close connections when done

### Error Handling

1. **Implement retry logic:** Handle transient failures gracefully
2. **Log errors:** Keep detailed error logs for debugging
3. **User feedback:** Provide meaningful error messages to users

### Performance

1. **Batch requests:** Use batch operations for multiple API calls
2. **Pagination:** Use appropriate limits for list operations
3. **Caching:** Cache frequently accessed data where appropriate

### Security

1. **Secure API keys:** Never expose API keys in client-side code
2. **Environment variables:** Store sensitive configuration in environment variables
3. **HTTPS only:** Always use HTTPS for API communication

## Examples

### Terminal Management Dashboard

```javascript
// Create a simple terminal dashboard
class TerminalDashboard {
  constructor(apiKey) {
    this.sdk = new RinaWarpSDK({ apiKey });
  }

  async initialize() {
    await this.sdk.connect();
    this.terminals = await this.sdk.getTerminals();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.sdk.on('connect', () => {
      console.log('Dashboard connected');
    });

    this.sdk.on('disconnect', () => {
      console.log('Dashboard disconnected');
    });
  }

  async createTerminal(name) {
    const terminal = await this.sdk.createTerminal(name);
    this.terminals.push(terminal);
    return terminal;
  }

  async executeCommand(terminalId, command) {
    return await this.sdk.executeCommand(terminalId, command);
  }
}
```

### Performance Monitor

```python
# Monitor terminal performance
class PerformanceMonitor:
    def __init__(self, api_key):
        self.client = create_client(api_key)
        
    async def start_monitoring(self, terminal_id):
        async def alert_handler(alert):
            if alert.get('severity') == 'high':
                await self.handle_high_severity_alert(alert)
        
        await self.client.subscribe_to_performance_alerts(alert_handler)
        
    async def handle_high_severity_alert(self, alert):
        # Send notification, scale resources, etc.
        print(f"High severity alert: {alert}")
```

## Support

For additional support:

- **Documentation:** [https://docs.rinawarp.com](https://docs.rinawarp.com)
- **GitHub Issues:** [https://github.com/rinawarp/terminal-sdk/issues](https://github.com/rinawarp/terminal-sdk/issues)
- **Community:** [https://community.rinawarp.com](https://community.rinawarp.com)
- **Email:** [support@rinawarp.com](mailto:support@rinawarp.com)
