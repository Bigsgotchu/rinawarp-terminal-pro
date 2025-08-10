# Sentry Integration Guide for RinaWarp Terminal

This guide explains how to use the Sentry helpers to monitor your Node.js application for errors, performance issues, and debugging information.

## Quick Start

1. **Install Dependencies** (if not already installed):
```bash
npm install @sentry/node @sentry/profiling-node
```

2. **Set Environment Variables**:
```bash
export SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
export NODE_ENV="production"  # or "development"
```

3. **Start Server with Sentry**:
```bash
NODE_OPTIONS="--import ./instrument.mjs" npm start
```

## Available Helper Functions

### Error Tracking

#### `captureErrorWithContext(error, category, context)`
Captures errors with rich context information.

```javascript
import { captureErrorWithContext } from './src/utils/sentry-helpers.js';

try {
  await riskyOperation();
} catch (error) {
  captureErrorWithContext(error, 'payment', {
    userId: '123',
    transactionAmount: 99.99,
    paymentMethod: 'stripe'
  });
  throw error; // Re-throw if needed
}
```

### Performance Monitoring

#### `trackPerformance(operationName, asyncFunction)`
Monitors the performance of async operations.

```javascript
import { trackPerformance } from './src/utils/sentry-helpers.js';

const result = await trackPerformance('database_query', async () => {
  return await db.users.findById(userId);
});
```

### Breadcrumbs (Debug Trail)

#### `addBreadcrumb(message, category, level, data)`
Adds debugging breadcrumbs to track application flow.

```javascript
import { addBreadcrumb } from './src/utils/sentry-helpers.js';

addBreadcrumb('User login attempt', 'auth', 'info', {
  email: 'user@example.com',
  timestamp: new Date().toISOString()
});
```

### User Context

#### `setUserContext(user)`
Sets user information for error tracking.

```javascript
import { setUserContext } from './src/utils/sentry-helpers.js';

setUserContext({
  id: '123',
  email: 'user@example.com',
  role: 'premium'
});
```

### Route Monitoring

#### `wrapRouteHandler(handler, res, operationName)`
Wraps Express route handlers with comprehensive monitoring.

```javascript
import { wrapRouteHandler } from './src/utils/sentry-helpers.js';

app.post('/api/users', async (req, res) => {
  return await wrapRouteHandler(async () => {
    const user = await createUser(req.body);
    res.json(user);
  }, res, 'user_creation');
});
```

### Database Monitoring

#### `monitorDatabaseCall(table, operation, asyncFunction)`
Monitors database operations with automatic error handling.

```javascript
import { monitorDatabaseCall } from './src/utils/sentry-helpers.js';

const users = await monitorDatabaseCall('users', 'findAll', async () => {
  return await db.users.findAll({ where: { active: true } });
});
```

### API Monitoring

#### `monitorApiCall(service, operation, asyncFunction)`
Monitors external API calls.

```javascript
import { monitorApiCall } from './src/utils/sentry-helpers.js';

const result = await monitorApiCall('stripe', 'create_payment', async () => {
  return await stripe.paymentIntents.create({
    amount: 2000,
    currency: 'usd'
  });
});
```

## Integration Examples

### Basic Express Route
```javascript
app.post('/api/checkout', async (req, res) => {
  const { captureErrorWithContext, trackPerformance, addBreadcrumb } = 
    await import('./src/utils/sentry-helpers.js');
  
  try {
    addBreadcrumb('Checkout started', 'payment', 'info', {
      cartTotal: req.body.total
    });
    
    const paymentResult = await trackPerformance('payment_processing', async () => {
      return await processPayment(req.body);
    });
    
    res.json({ success: true, paymentId: paymentResult.id });
  } catch (error) {
    captureErrorWithContext(error, 'payment', {
      cartItems: req.body.items,
      customerEmail: req.body.email
    });
    res.status(500).json({ error: 'Payment failed' });
  }
});
```

### Comprehensive Route Monitoring
```javascript
app.post('/api/users/register', async (req, res) => {
  const { wrapRouteHandler, addBreadcrumb } = 
    await import('./src/utils/sentry-helpers.js');
  
  return await wrapRouteHandler(async () => {
    addBreadcrumb('User registration started', 'user', 'info');
    
    const user = await createUser(req.body);
    
    res.status(201).json({
      message: 'User created successfully',
      userId: user.id
    });
  }, res, 'user_registration');
});
```

### Background Job Monitoring
```javascript
async function processEmailQueue() {
  const { captureErrorWithContext, setUserContext, addBreadcrumb } = 
    await import('./src/utils/sentry-helpers.js');
  
  try {
    const job = await getNextEmailJob();
    
    setUserContext({
      id: job.userId,
      email: job.recipientEmail
    });
    
    addBreadcrumb('Processing email job', 'email', 'info', {
      jobId: job.id,
      type: job.type
    });
    
    await sendEmail(job);
    
  } catch (error) {
    captureErrorWithContext(error, 'email', {
      jobId: job.id,
      component: 'email_queue'
    });
  }
}
```

## Best Practices

### 1. Use Appropriate Categories
Organize errors by category for better filtering:
- `auth` - Authentication/authorization
- `payment` - Payment processing
- `email` - Email operations
- `database` - Database operations
- `api` - External API calls
- `validation` - Input validation

### 2. Add Rich Context
Always include relevant context data:

```javascript
captureErrorWithContext(error, 'payment', {
  userId: user.id,
  transactionAmount: amount,
  paymentMethod: 'credit_card',
  timestamp: new Date().toISOString(),
  // Add any data that helps debug the issue
});
```

### 3. Use Performance Tracking
Monitor critical operations:

```javascript
// Monitor database queries
const users = await trackPerformance('user_lookup', async () => {
  return await db.users.findAll();
});

// Monitor external API calls
const result = await trackPerformance('stripe_payment', async () => {
  return await stripe.charges.create(chargeData);
});
```

### 4. Add Breadcrumbs for Flow Tracking
Create a debug trail of user actions:

```javascript
addBreadcrumb('User login attempt', 'auth', 'info', { email });
addBreadcrumb('User authenticated', 'auth', 'info', { userId });
addBreadcrumb('Accessing protected resource', 'auth', 'info', { resource: '/api/profile' });
```

### 5. Set User Context Early
Set user information as soon as it's available:

```javascript
// In authentication middleware
setUserContext({
  id: user.id,
  email: user.email,
  role: user.role,
  subscription: user.subscriptionTier
});
```

## Monitoring Your Application

### View Your Sentry Dashboard
1. Visit your Sentry project dashboard
2. Monitor error rates and performance metrics
3. Set up alerts for critical issues
4. Review performance trends

### Key Metrics to Watch
- **Error Rate**: Percentage of requests that result in errors
- **Response Time**: P95/P99 response times for critical endpoints
- **Transaction Volume**: Number of requests per minute/hour
- **User Impact**: Number of users affected by errors

### Setting Up Alerts
Configure alerts for:
- Error rate increases
- Slow response times
- Critical payment failures
- Database connection issues

## Troubleshooting

### Common Issues

1. **Sentry not initialized**: Make sure you start your server with the `--import ./instrument.mjs` flag
2. **Missing breadcrumbs**: Breadcrumbs are only available after Sentry is properly initialized
3. **Context not showing**: Ensure you're calling helper functions after importing them

### Debug Mode
To see Sentry debug information:

```bash
DEBUG=sentry:* NODE_OPTIONS="--import ./instrument.mjs" npm start
```

## Advanced Usage

### Custom Error Boundaries
```javascript
export function withErrorBoundary(asyncFunction, context = {}) {
  return async (...args) => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      captureErrorWithContext(error, 'boundary', {
        ...context,
        functionName: asyncFunction.name,
        arguments: args
      });
      throw error;
    }
  };
}
```

### Performance Middleware
```javascript
export function performanceMiddleware(operationName) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      trackPerformance(operationName, async () => {
        // This creates a performance entry
        return new Promise(resolve => {
          setTimeout(resolve, duration);
        });
      });
    });
    
    next();
  };
}
```

For more examples, see the `examples/sentry-integration-examples.js` file in this project.
