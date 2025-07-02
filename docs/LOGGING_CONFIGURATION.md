# RinaWarp Terminal - Logging Configuration Guide

## Overview

RinaWarp Terminal uses a centralized logging system that provides environment-aware logging, telemetry capabilities, and production-ready log management.

## Environment Variables

### Core Logging Settings

```env
# Environment
NODE_ENV=production          # 'development', 'production', 'test'
LOG_LEVEL=info              # 'debug', 'info', 'warn', 'error'
ENABLE_TELEMETRY=true       # Enable/disable telemetry collection
DEBUG=false                 # Enable/disable debug mode
```

### File Logging Settings

```env
LOG_TO_FILE=true            # Enable file logging
LOG_DIRECTORY=./logs        # Directory for log files
MAX_LOG_SIZE=50MB          # Maximum size per log file
MAX_LOG_FILES=10           # Number of log files to retain
```

### Telemetry Configuration

```env
TELEMETRY_ENDPOINT=         # Your telemetry service endpoint
TELEMETRY_API_KEY=          # API key for telemetry service
SENTRY_DSN=                 # Sentry DSN for error tracking
```

## Log Levels

The logging system supports the following levels (in order of priority):

1. **debug** (0) - Detailed debugging information
2. **info** (1) - General information messages
3. **warn** (2) - Warning messages
4. **error** (3) - Error messages

Only messages at or above the configured `LOG_LEVEL` will be output.

## Environment-Based Behavior

### Development Mode
- All log levels are displayed in console
- Detailed stack traces are shown
- Performance logging is enabled
- User action tracking is enabled

### Production Mode
- Only warnings and errors are displayed in console
- Logs are written to files
- Telemetry data is sent to configured endpoints
- Stack traces are limited for security

## Logger API

The centralized logger provides the following methods:

### Basic Logging
```javascript
logger.debug(message, context);    // Debug information
logger.info(message, context);     // General information
logger.warn(message, context);     // Warnings
logger.error(message, context);    // Errors
```

### Specialized Logging
```javascript
logger.system(event, context);     // System events
logger.security(event, context);   // Security events
logger.performance(operation, duration, context);  // Performance metrics
logger.userAction(action, context); // User interactions
```

### Context Object
All logging methods accept an optional context object:

```javascript
{
  component: 'component-name',    // Component identifier
  module: 'module-name',          // Sub-module identifier
  userId: 'user-id',              // User identifier
  sessionId: 'session-id',        // Session identifier
  error: 'error-message',         // Error message
  stack: 'stack-trace',           // Stack trace
  duration: 1234,                 // Duration in ms
  // ... any other relevant data
}
```

## Telemetry Integration

### Supported Services

1. **Sentry** - Error tracking and performance monitoring
2. **Custom Endpoints** - Send logs to your own analytics service
3. **Local File System** - Store logs locally for analysis

### Data Privacy

- Sensitive data is automatically masked
- User consent is respected
- Only essential telemetry data is collected
- All data collection complies with privacy regulations

## File Logging

### Log File Structure

```
logs/
├── application.log         # Main application log
├── error.log              # Error-only log
├── security.log           # Security events
├── performance.log        # Performance metrics
└── archived/              # Rotated log files
    ├── application.log.1
    ├── application.log.2
    └── ...
```

### Log Rotation

- Logs are automatically rotated when they reach `MAX_LOG_SIZE`
- Up to `MAX_LOG_FILES` are retained
- Older logs are compressed and archived
- Cleanup is performed automatically

## Production Deployment

### Recommended Settings

```env
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_TELEMETRY=true
DEBUG=false
LOG_TO_FILE=true
LOG_DIRECTORY=/var/log/rinawarp
MAX_LOG_SIZE=100MB
MAX_LOG_FILES=30
```

### Security Considerations

1. **Log File Permissions**: Ensure log files have appropriate permissions
2. **Sensitive Data**: Configure masking for sensitive information
3. **Network Security**: Use HTTPS for telemetry endpoints
4. **API Keys**: Secure your telemetry API keys

### Monitoring Integration

#### With Sentry
```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

#### With DataDog
```env
TELEMETRY_ENDPOINT=https://http-intake.logs.datadoghq.com/v1/input/YOUR_API_KEY
TELEMETRY_API_KEY=your-datadog-api-key
```

#### With Custom Service
```env
TELEMETRY_ENDPOINT=https://your-analytics-service.com/api/logs
TELEMETRY_API_KEY=your-custom-api-key
```

## Troubleshooting

### Common Issues

1. **Logs not appearing in production**
   - Check `LOG_LEVEL` setting
   - Verify file permissions for log directory
   - Ensure `LOG_TO_FILE` is enabled

2. **Telemetry not working**
   - Verify `ENABLE_TELEMETRY=true`
   - Check API keys and endpoints
   - Review network connectivity

3. **Performance issues**
   - Lower `LOG_LEVEL` to reduce output
   - Increase `MAX_LOG_SIZE` to reduce rotation frequency
   - Consider async logging for high-volume applications

### Debug Mode

Enable debug mode for troubleshooting:

```env
DEBUG=true
LOG_LEVEL=debug
```

This will provide detailed logging information to help diagnose issues.

## Best Practices

1. **Use appropriate log levels** - Don't log everything as errors
2. **Include context** - Always provide relevant context with log messages
3. **Respect privacy** - Don't log sensitive user data
4. **Monitor performance** - Logging should not impact application performance
5. **Regular maintenance** - Monitor log file sizes and clean up old logs
6. **Security audit** - Regularly review what data is being logged

## Examples

### Basic Usage
```javascript
// Import the logger
const logger = require('./src/utils/logger');

// Log an info message
logger.info('User logged in successfully', {
  component: 'auth-service',
  userId: 'user123',
  timestamp: Date.now()
});

// Log an error with context
logger.error('Database connection failed', {
  component: 'database',
  error: error.message,
  stack: error.stack,
  connectionString: 'masked'
});
```

### Performance Logging
```javascript
const startTime = Date.now();
// ... perform operation
const duration = Date.now() - startTime;

logger.performance('Database query', duration, {
  component: 'database',
  query: 'SELECT * FROM users',
  recordCount: results.length
});
```

### Security Event Logging
```javascript
logger.security('Failed login attempt', {
  component: 'auth-service',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  attemptedUsername: username
});
```

## Support

For additional support with logging configuration:

1. Check the [main documentation](../README.md)
2. Review the [logger source code](../src/utils/logger.js)
3. Create an issue on GitHub
4. Contact the development team

---

**Security Note**: Always review your logging configuration before deploying to production to ensure no sensitive data is being logged inappropriately.
