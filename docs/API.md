# RinaWarp Terminal API Documentation

## Overview

The RinaWarp Terminal API provides programmatic access to terminal features, user management, and enterprise functionality. This REST API is designed for integration with third-party applications and enterprise systems.

**Base URL**: `https://api.rinawarp-terminal.com/v1`
**Current Version**: v1.0  
**Authentication**: JWT Bearer tokens  

## Authentication

All API requests require authentication using JWT tokens.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "plan": "professional"
  }
}
```

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "firstName": "John",
  "lastName": "Doe"
}
```

## User Management

### Get User Profile
```http
GET /api/users/{id}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "id": "user123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "plan": "professional",
  "createdAt": "2023-01-01T00:00:00Z",
  "lastLogin": "2023-06-15T10:30:00Z"
}
```

### Update User Profile
```http
PUT /api/users/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "preferences": {
    "theme": "dark",
    "aiEnabled": true
  }
}
```

## Terminal Sessions

### Create Session
```http
POST /api/sessions
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Development Session",
  "shell": "powershell",
  "workingDirectory": "C:\\Projects"
}
```

### Get Session
```http
GET /api/sessions/{sessionId}
Authorization: Bearer {token}
```

### List Sessions
```http
GET /api/sessions
Authorization: Bearer {token}
```

### Delete Session
```http
DELETE /api/sessions/{sessionId}
Authorization: Bearer {token}
```

## AI Features

### Get Command Suggestions
```http
POST /api/ai/suggestions
Authorization: Bearer {token}
Content-Type: application/json

{
  "context": "git st",
  "shell": "bash",
  "workingDirectory": "/home/user/project"
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "command": "git status",
      "description": "Show the working tree status",
      "confidence": 0.95
    },
    {
      "command": "git stash",
      "description": "Stash changes in working directory",
      "confidence": 0.8
    }
  ]
}
```

## Enterprise Features

### Team Management
```http
GET /api/teams
POST /api/teams
PUT /api/teams/{teamId}
DELETE /api/teams/{teamId}
```

### License Management
```http
GET /api/licenses
POST /api/licenses/validate
```

## Webhooks

### Register Webhook
```http
POST /api/webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["session.created", "user.login"],
  "secret": "your_webhook_secret"
}
```

### Webhook Events
- `session.created` - New terminal session created
- `session.closed` - Terminal session closed
- `user.login` - User logged in
- `user.logout` - User logged out
- `command.executed` - Command executed (enterprise only)

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Free Plan**: 100 requests per hour
- **Personal Plan**: 1,000 requests per hour
- **Professional Plan**: 10,000 requests per hour
- **Enterprise Plan**: 100,000 requests per hour

Rate limit headers are included in all responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1623456789
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "The provided token is invalid or expired",
    "details": {
      "timestamp": "2023-06-15T10:30:00Z",
      "requestId": "req_123456"
    }
  }
}
```

### Common Error Codes
- `INVALID_TOKEN` (401) - Authentication token is invalid
- `INSUFFICIENT_PERMISSIONS` (403) - User lacks required permissions
- `RESOURCE_NOT_FOUND` (404) - Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `VALIDATION_ERROR` (422) - Request validation failed
- `INTERNAL_ERROR` (500) - Server error

## SDK and Libraries

### JavaScript/Node.js
```bash
npm install @rinawarp/terminal-sdk
```

```javascript
const RinaWarp = require('@rinawarp/terminal-sdk');

const client = new RinaWarp.Client({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.rinawarp-terminal.com/v1'
});

// Get user profile
const user = await client.users.get('user123');
```

### Python
```bash
pip install rinawarp-terminal
```

```python
from rinawarp import Client

client = Client(api_key='your-api-key')
user = client.users.get('user123')
```

### cURL Examples
```bash
# Login
curl -X POST https://api.rinawarp-terminal.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get user profile
curl -X GET https://api.rinawarp-terminal.com/v1/users/user123 \
  -H "Authorization: Bearer your-token"
```

## Changelog

### v1.0.0 (2023-06-15)
- Initial API release
- Basic authentication and user management
- Terminal session management
- AI command suggestions
- Rate limiting implementation

### v1.0.1 (2023-07-01)
- Added webhook support
- Enhanced error handling
- Performance improvements

### v1.0.2 (2023-07-15)
- Added enterprise features
- Team management endpoints
- License validation

## Support

For API support:
- **Documentation**: [https://docs.rinawarp-terminal.com/api](https://docs.rinawarp-terminal.com/api)
- **Status Page**: [https://status.rinawarp-terminal.com](https://status.rinawarp-terminal.com)
- **Email Support**: api-support@rinawarp-terminal.com
- **GitHub Issues**: [https://github.com/Rinawarp-Terminal/rinawarp-terminal/issues](https://github.com/Rinawarp-Terminal/rinawarp-terminal/issues)

## Terms of Service

By using the RinaWarp Terminal API, you agree to our [Terms of Service](https://rinawarp.com/terms) and [Privacy Policy](https://rinawarp.com/privacy).
