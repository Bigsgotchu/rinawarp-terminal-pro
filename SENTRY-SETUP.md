# 🚨 Sentry Error Monitoring & Performance Tracking Setup

## ✅ Installation Complete!

Your RinaWarp Terminal now has comprehensive Sentry monitoring with:
- ✅ **@sentry/node v10.3.0** installed
- ✅ **Enhanced Sentry utilities** (CommonJS & ESM)
- ✅ **Performance monitoring** with spans and metrics
- ✅ **Error boundary patterns**
- ✅ **Feature usage tracking**
- ✅ **Working examples** with real integrations

---

## 📁 Files Added/Updated

### Core Integration Files:
- `src/instrument.cjs` - CommonJS Sentry initialization (already existed)
- `instrument.mjs` - ESM Sentry initialization (already existed)
- `src/utilities/sentry-utils.cjs` - **NEW** Enhanced utilities (CommonJS)
- `src/utilities/sentry-utils.js` - **NEW** Enhanced utilities (ESM)

### Example & Documentation:
- `sentry-integration-example.cjs` - **NEW** Working examples
- `facebook-marketing-cli.cjs` - **NEW** Facebook Marketing CLI (bonus!)
- `SENTRY-SETUP.md` - **NEW** This setup guide

---

## 🚀 Quick Start

### 1. Basic Usage in Your Code

```javascript
// CommonJS
const SentryUtils = require('./src/utilities/sentry-utils.cjs');

// ESM
import { SentryUtils } from './src/utilities/sentry-utils.js';

// Set user context (do this early in your app)
SentryUtils.setUserContext({
  username: 'kgilley',
  platform: process.platform,
  nodeVersion: process.version
});
```

### 2. Track Command Execution

```javascript
// Wrap any command with automatic error tracking and performance monitoring
const result = await SentryUtils.trackCommand('git status', async () => {
  return await executeShellCommand('git status');
});
```

### 3. Monitor API Calls

```javascript
// Track API performance and errors
const data = await SentryUtils.trackApiCall('github', 'https://api.github.com/user', async () => {
  return await fetch('https://api.github.com/user');
});
```

### 4. Measure Performance

```javascript
// Monitor slow operations
const result = await SentryUtils.measurePerformance('file_processing', async () => {
  return await processLargeFile(filePath);
});
```

### 5. Track Feature Usage

```javascript
// Understand user behavior
SentryUtils.trackFeatureUsage('theme_change', {
  theme: 'dark',
  source: 'user_preference'
});
```

### 6. Error Boundaries

```javascript
// Automatic error tracking for risky operations
await SentryUtils.withErrorBoundary(async () => {
  await riskyOperation();
}, 'risky_operation');
```

---

## 📊 Dashboard & Monitoring

### Sentry Dashboard Access:
- **URL**: https://sentry.io/
- **DSN**: Already configured in your `instrument.cjs` files
- **Environment**: Automatically detected (development/production)

### What You'll See:
- 🐛 **Errors**: Detailed error reports with stack traces and context
- ⚡ **Performance**: Transaction timing, span details, and bottlenecks
- 👥 **Users**: User sessions, platforms, and behavior patterns  
- 🔍 **Breadcrumbs**: Detailed activity trail before errors occur

---

## 🎯 Integration Points in Your App

### Already Integrated:
- ✅ Main application startup (`src/main.cjs` already requires instrument)
- ✅ Server startup (`server.js` already imports instrument.mjs)
- ✅ Error handling in main process

### Recommended Integrations:

#### 1. Terminal Commands:
```javascript
// In your terminal command handler
const SentryUtils = require('./src/utilities/sentry-utils.cjs');

async function executeCommand(command, args) {
  return SentryUtils.trackCommand(command, async () => {
    // Your existing command execution logic
    return await actualCommandExecution(command, args);
  });
}
```

#### 2. API Endpoints:
```javascript
// In your server routes
app.get('/api/terminal/command', async (req, res) => {
  try {
    const result = await SentryUtils.trackCommand(req.body.command, async () => {
      return await executeTerminalCommand(req.body.command);
    });
    res.json(result);
  } catch (error) {
    SentryUtils.captureException(error, {
      tags: { endpoint: '/api/terminal/command' }
    });
    res.status(500).json({ error: error.message });
  }
});
```

#### 3. File Operations:
```javascript
// In file processing code
const result = await SentryUtils.measurePerformance('file_read', async () => {
  return await fs.readFile(filePath, 'utf8');
});
```

#### 4. Feature Usage:
```javascript
// Track user interactions
function onThemeChange(newTheme) {
  SentryUtils.trackFeatureUsage('theme_change', {
    theme: newTheme,
    timestamp: new Date().toISOString()
  });
  
  // Your theme change logic
  applyTheme(newTheme);
}
```

---

## ⚙️ Configuration

### Environment Variables (Optional):
```bash
# .env file
SENTRY_DSN=your-custom-dsn-if-needed
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_SAMPLE_RATE=1.0
TELEMETRY_PRIVACY_MODE=false
```

### Sample Rate Recommendations:
- **Development**: `1.0` (100% - catch everything)
- **Production**: `0.1` (10% - balance performance vs. monitoring)

---

## 🔍 Monitoring Best Practices

### 1. Error Context:
Always provide rich context when capturing errors:
```javascript
SentryUtils.captureException(error, {
  tags: {
    component: 'terminal',
    operation: 'command_execution'
  },
  contexts: {
    command: {
      name: commandName,
      args: commandArgs,
      cwd: process.cwd()
    }
  }
});
```

### 2. Performance Tracking:
Monitor operations that matter to users:
- Command execution time
- File I/O operations
- API response times
- UI rendering performance

### 3. User Journey:
Track feature usage to understand user behavior:
```javascript
SentryUtils.trackFeatureUsage('terminal_opened');
SentryUtils.trackFeatureUsage('command_autocomplete_used');
SentryUtils.trackFeatureUsage('theme_customized');
```

### 4. Memory Monitoring:
The utilities automatically include memory usage in error reports.

---

## 🧪 Testing Your Setup

Run the example to verify everything works:
```bash
node sentry-integration-example.cjs
```

This will:
- ✅ Set up user context
- ✅ Track command execution
- ✅ Monitor API calls  
- ✅ Measure performance
- ✅ Demonstrate error tracking
- ✅ Show feature usage tracking

---

## 📈 Advanced Features

### Custom Spans:
```javascript
await SentryUtils.withSpan('database', 'user query', async (span) => {
  span.setAttributes({ userId: user.id, query: 'select * from users' });
  return await database.query('SELECT * FROM users');
});
```

### Session Tracking:
```javascript
// Start session when app launches
SentryUtils.startSession();

// End session when app closes
process.on('beforeExit', () => {
  SentryUtils.endSession('ok');
});
```

### Custom Metrics:
```javascript
// Track custom business metrics
SentryUtils.recordMetric('commands_per_session', sessionCommandCount);
SentryUtils.recordMetric('startup_time', startupDuration);
```

---

## 🚨 Privacy & Compliance

### PII Handling:
- **sendDefaultPii**: Configured based on `TELEMETRY_PRIVACY_MODE`
- **User data**: Only includes username, platform info (no sensitive data)
- **Command data**: Only command names, not full output or arguments

### Data Retention:
- Sentry retains data based on your plan
- Errors: 90 days (default)
- Performance: 90 days (default)
- You can configure retention in Sentry dashboard

---

## 🛠️ Troubleshooting

### Common Issues:

#### 1. "Events not appearing in dashboard"
- Check your DSN in `src/instrument.cjs`
- Ensure you're calling `SentryUtils.flush()` before app exit
- Verify network connectivity

#### 2. "Too many events/quota exceeded"
- Adjust sample rates in instrument files
- Add more specific error filtering
- Review breadcrumb frequency

#### 3. "Performance data missing"
- Ensure you're using `trackCommand` or `measurePerformance`
- Check tracesSampleRate in configuration
- Verify spans are being created properly

### Debug Mode:
Set `debug: true` in your Sentry initialization to see detailed logs.

---

## 🎉 Next Steps

1. **Deploy**: Your monitoring is ready for production
2. **Customize**: Adjust sample rates and error filtering for your needs
3. **Extend**: Add monitoring to specific features important to your users
4. **Analyze**: Use Sentry dashboard to identify performance bottlenecks and errors
5. **Iterate**: Continuously improve based on the data you collect

---

## 📚 Additional Resources

- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Performance Monitoring Guide](https://docs.sentry.io/product/performance/)
- [Error Tracking Best Practices](https://blog.sentry.io/2019/06/04/error-monitoring-best-practices)

Happy monitoring! 🚀 Your RinaWarp Terminal now has enterprise-grade error tracking and performance monitoring.
