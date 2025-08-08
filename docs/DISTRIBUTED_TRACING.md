# Distributed Tracing Implementation

This document explains how distributed tracing has been implemented in RinaWarp Terminal using Sentry, providing comprehensive observability across all services and components.

## Overview

Distributed tracing allows you to track requests as they flow through different parts of your application, providing insights into performance bottlenecks, error sources, and system dependencies.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RinaWarp Terminal                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Express Server                                                             │
│  ├── Sentry Request Handler ──► Creates Transaction for each request        │
│  ├── Custom Tracing Middleware ──► Adds context and spans                  │
│  ├── API Routes ──► Traced endpoints with business logic                   │
│  └── Sentry Error Handler ──► Captures errors with trace context          │
├─────────────────────────────────────────────────────────────────────────────┤
│  External Services                                                          │
│  ├── Stripe API ──► Payment processing with trace propagation             │
│  ├── Anthropic API ──► AI processing with performance tracking            │
│  ├── SendGrid API ──► Email delivery with success/failure tracking        │
│  └── Database ──► Query performance and result tracking                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Sentry Configuration (`src/instrument.js`)

The instrumentation file configures Sentry with:
- **Performance Monitoring**: 100% trace sampling in development, configurable in production
- **Profiling**: CPU and memory profiling for performance optimization
- **Custom Sampling**: Different sample rates for different operations
- **Error Filtering**: Intelligent filtering of development vs production errors

### 2. Express Middleware Integration

```javascript
// server.js
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... your routes ...

app.use(Sentry.Handlers.errorHandler());
```

### 3. Custom Tracing Utilities (`src/tracing/distributedTracing.js`)

Provides specialized tracing functions for:
- Database queries
- External HTTP requests  
- AI/ML operations
- Payment processing
- Business logic spans

## Usage Examples

### Basic Function Tracing

```javascript
import { traceAsync } from './src/tracing/distributedTracing.js';

const myFunction = traceAsync('process_user_data', async (userData) => {
  // Your function logic here
  return processedData;
}, {
  op: 'business.data_processing',
  data: {
    component: 'user-service'
  }
});
```

### Tracing External API Calls

```javascript
import { traceHttpRequest } from './src/tracing/distributedTracing.js';

const result = await traceHttpRequest(
  'POST',
  'https://api.stripe.com/v1/checkout/sessions',
  { amount: 2999 },
  async () => {
    const response = await fetch(url, options);
    return response.json();
  }
);
```

### Database Query Tracing

```javascript
import { traceDatabase } from './src/tracing/distributedTracing.js';

const users = await traceDatabase(
  'SELECT * FROM users WHERE active = ?',
  [true],
  async () => {
    return await db.query('SELECT * FROM users WHERE active = ?', [true]);
  }
);
```

### AI Operations Tracing

```javascript
import { traceAI } from './src/tracing/distributedTracing.js';

const aiResponse = await traceAI(
  'claude-3-sonnet',
  'completion',
  { prompt: userInput },
  async () => {
    return await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userInput }]
    });
  }
);
```

### Custom Spans

```javascript
import { createSpan } from './src/tracing/distributedTracing.js';

const span = createSpan('cache.lookup', 'Check user cache', {
  'cache.key': `user:${userId}`,
  'cache.type': 'redis'
});

try {
  const result = await cache.get(`user:${userId}`);
  span.setTag('cache.hit', !!result);
  return result;
} finally {
  span.finish();
}
```

## Transaction Context

### Adding Tags and Data

```javascript
import { addTransactionTags, addTransactionData } from './src/tracing/distributedTracing.js';

// Add searchable tags
addTransactionTags({
  'user.plan': 'professional',
  'feature.name': 'ai-assistant',
  'endpoint.critical': true
});

// Add detailed context data
addTransactionData('request.validation_time', validationDuration);
addTransactionData('business.rules_applied', appliedRules);
```

### Setting User Context

```javascript
import { setUser } from './src/tracing/distributedTracing.js';

setUser({
  id: user.id,
  email: user.email,
  subscription: user.subscription_type,
  created_at: user.created_at
});
```

## Trace Propagation

### Outgoing HTTP Requests

```javascript
import { getTraceHeaders } from './src/tracing/distributedTracing.js';

const response = await fetch('https://external-api.com/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...getTraceHeaders(), // Propagates trace context
  },
  body: JSON.stringify(data)
});
```

### Microservice Communication

When making requests to other services, include trace headers:

```javascript
const traceHeaders = getTraceHeaders();
const serviceResponse = await fetch('https://ai-service.internal/process', {
  headers: {
    ...traceHeaders,
    'Authorization': `Bearer ${token}`
  }
});
```

## Performance Monitoring

### Key Metrics Tracked

1. **HTTP Requests**
   - Response times
   - Status codes
   - Error rates
   - Request size

2. **Database Operations**
   - Query execution time
   - Rows affected
   - Query complexity
   - Connection pool usage

3. **External APIs**
   - Third-party response times
   - API rate limits
   - Success/failure rates
   - Network latency

4. **AI Operations**
   - Model inference time
   - Token usage
   - Request/response sizes
   - Provider-specific metrics

### Custom Performance Metrics

```javascript
import { createSpan } from './src/tracing/distributedTracing.js';

async function processLargeDataset(data) {
  const span = createSpan('business.data_processing', 'Process large dataset', {
    'data.size': data.length,
    'data.type': 'user_analytics'
  });

  try {
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = Date.now();
    
    const result = await heavyProcessing(data);
    
    const endMemory = process.memoryUsage().heapUsed;
    const duration = Date.now() - startTime;
    
    span.setData('performance.duration_ms', duration);
    span.setData('performance.memory_delta_mb', (endMemory - startMemory) / 1024 / 1024);
    span.setData('performance.throughput_items_per_sec', data.length / (duration / 1000));
    
    return result;
  } finally {
    span.finish();
  }
}
```

## Error Tracking with Context

Errors are automatically captured with full trace context:

```javascript
try {
  await riskyOperation();
} catch (error) {
  // Error is automatically captured with:
  // - Current transaction context
  // - User information
  // - Request details
  // - Custom tags and data
  // - Stack trace
  throw error; // Re-throw to maintain normal error flow
}
```

## Environment Configuration

### Development

```env
# High sampling for full visibility
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_SAMPLE_RATE=1.0
SENTRY_ENVIRONMENT=development

# Enable debug logging
SENTRY_DEBUG=true
```

### Production

```env
# Optimized sampling to balance cost and visibility
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_SAMPLE_RATE=1.0
SENTRY_ENVIRONMENT=production

# Disable debug logging
SENTRY_DEBUG=false
```

## Best Practices

### 1. Naming Conventions

- **Transactions**: Use format `METHOD /api/resource/action`
- **Spans**: Use format `category.operation` (e.g., `db.query`, `http.client`, `ai.inference`)
- **Tags**: Use dot notation for hierarchical data (`user.plan`, `payment.provider`)

### 2. Data Sensitivity

```javascript
// ✅ Good - Hash or mask sensitive data
span.setData('user.id_hash', hashUserId(user.id));
span.setData('payment.amount', amount);

// ❌ Bad - Don't log sensitive data
span.setData('user.password', user.password);
span.setData('payment.card_number', cardNumber);
```

### 3. Span Lifecycle Management

```javascript
// ✅ Good - Always finish spans
const span = createSpan('operation', 'description');
try {
  const result = await operation();
  span.setTag('success', true);
  return result;
} catch (error) {
  span.setTag('success', false);
  throw error;
} finally {
  span.finish(); // Always called
}

// ✅ Also good - Use wrapper functions
const result = await traceAsync('operation', operation);
```

### 4. Performance Considerations

- Use sampling in production to manage costs
- Avoid tracing very frequent operations unless necessary
- Be selective about data logged to spans
- Use tags for searching, data for detailed context

## Monitoring and Alerting

### Key Alerts to Set Up

1. **High Error Rate**: > 5% error rate on critical endpoints
2. **Slow Responses**: P95 response time > 2s
3. **External API Issues**: Third-party services responding slowly or failing
4. **Memory Leaks**: Sustained memory growth in AI operations
5. **Payment Failures**: Any increase in payment processing errors

### Dashboard Metrics

Create dashboards to monitor:
- Request throughput and latency by endpoint
- Error rates by service and operation type
- External API performance and availability
- AI operation costs and performance
- User journey completion rates

## Troubleshooting

### Common Issues

1. **Missing Traces**: Ensure `instrument.js` is imported first
2. **Incomplete Spans**: Always call `span.finish()` in finally blocks
3. **High Costs**: Reduce sampling rates in production
4. **Performance Impact**: Monitor overhead, typically <5% in well-configured setups

### Debug Mode

Enable debug logging to see trace creation:

```javascript
// In development
process.env.SENTRY_DEBUG = 'true';
```

### Viewing Traces

1. Open Sentry dashboard
2. Navigate to "Performance" section
3. Search by transaction name, user ID, or custom tags
4. Click on specific transactions to see detailed trace waterfalls
5. Analyze spans to identify bottlenecks

## Integration Examples

See `src/tracing/examples.js` for complete working examples of:
- Stripe payment processing with tracing
- AI command processing with Anthropic
- Email sending with SendGrid
- Complex business logic tracing
- Express route instrumentation

## Next Steps

1. **Add Custom Dashboards**: Create business-specific monitoring dashboards
2. **Set Up Alerts**: Configure alerts for critical performance and error thresholds
3. **Extend Tracing**: Add tracing to additional services and components
4. **Cost Optimization**: Fine-tune sampling rates based on usage patterns
5. **User Experience Monitoring**: Track user journeys and conversion funnels
