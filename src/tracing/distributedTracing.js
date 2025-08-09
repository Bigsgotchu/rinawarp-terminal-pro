/**
 * Distributed Tracing Utilities for RinaWarp Terminal
 *
 * This module provides utilities for creating custom spans, transactions,
 * and propagating trace context across microservices and external API calls.
 */

import Sentry from '../instrument.js';

/**
 * Create a custom transaction with proper context
 * @param {string} name - Transaction name
 * @param {string} op - Operation type (e.g., 'http.server', 'db.query', 'ai.processing')
 * @param {Object} context - Additional context data
 * @returns {Transaction} Sentry transaction
 */
export function createTransaction(name, op = 'custom', context = {}) {
  const transaction = Sentry.startTransaction({
    name,
    op,
    data: context,
    tags: {
      service: 'rinawarp-terminal',
      component: context.component || 'server',
      ...context.tags,
    },
  });

  // Set the transaction on the scope so spans are attached to it
  Sentry.configureScope(scope => {
    scope.setSpan(transaction);
  });

  return transaction;
}

/**
 * Create a child span within the current transaction
 * @param {string} operation - Span operation name
 * @param {string} description - Span description
 * @param {Object} data - Additional span data
 * @returns {Span} Sentry span
 */
export function createSpan(operation, description, data = {}) {
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();

  if (!transaction) {
    console.warn('No active transaction found for span creation');
    return null;
  }

  const span = transaction.startChild({
    op: operation,
    description,
    data,
    tags: {
      service: 'rinawarp-terminal',
      ...data.tags,
    },
  });

  return span;
}

/**
 * Wrap an async function with distributed tracing
 * @param {string} operationName - Name of the operation
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Options for the span
 * @returns {Function} Wrapped function
 */
export function traceAsync(operationName, fn, options = {}) {
  return async function tracedFunction(...args) {
    const span = createSpan(options.op || 'function', operationName, {
      functionName: fn.name,
      args: options.logArgs ? args : undefined,
      ...options.data,
    });

    try {
      const result = await fn.apply(this, args);

      if (span) {
        span.setTag('success', true);
        if (options.logResult && result !== undefined) {
          span.setData('result', result);
        }
      }

      return result;
    } catch (error) {
      if (span) {
        span.setTag('success', false);
        span.setData('error', error.message);
      }

      // Record the error in Sentry
      Sentry.captureException(error, {
        tags: {
          operation: operationName,
          function: fn.name,
        },
        extra: {
          args: options.logArgs ? args : 'hidden',
        },
      });

      throw error;
    } finally {
      if (span) {
        span.finish();
      }
    }
  };
}

/**
 * Express middleware to create transactions for incoming requests
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
export function createTracingMiddleware(options = {}) {
  return (req, res, next) => {
    const transactionName = options.getTransactionName
      ? options.getTransactionName(req)
      : `${req.method} ${req.route?.path || req.path}`;

    const transaction = createTransaction(transactionName, 'http.server', {
      component: 'express',
      tags: {
        'http.method': req.method,
        'http.path': req.path,
        'http.route': req.route?.path,
        'http.user_agent': req.get('user-agent'),
        'http.ip': req.ip,
      },
    });

    // Add request context to transaction
    transaction.setData('request', {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: options.logHeaders
        ? req.headers
        : {
            'user-agent': req.get('user-agent'),
            'content-type': req.get('content-type'),
          },
    });

    // Store transaction in request for later use
    req.sentryTransaction = transaction;

    // Handle response completion
    const originalEnd = res.end;
    res.end = function (...args) {
      transaction.setTag('http.status_code', res.statusCode);
      transaction.setData('response', {
        status: res.statusCode,
        headers: options.logResponseHeaders ? res.getHeaders() : {},
      });

      // Set transaction status based on HTTP status
      if (res.statusCode >= 400) {
        transaction.setStatus('failed_precondition');
      } else {
        transaction.setStatus('ok');
      }

      transaction.finish();
      originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * Trace database operations
 * @param {string} query - Database query
 * @param {Object} params - Query parameters
 * @param {Function} executor - Function that executes the query
 * @returns {Promise} Query result
 */
export async function traceDatabase(query, params, executor) {
  const span = createSpan('db.query', query, {
    'db.type': 'sql',
    'db.statement': query,
    'db.params': params,
  });

  try {
    const startTime = Date.now();
    const result = await executor();

    if (span) {
      span.setData('db.duration', Date.now() - startTime);
      span.setTag('db.success', true);

      // Log result size if it's an array
      if (Array.isArray(result)) {
        span.setData('db.rows', result.length);
      }
    }

    return result;
  } catch (error) {
    if (span) {
      span.setTag('db.success', false);
      span.setData('db.error', error.message);
    }

    throw error;
  } finally {
    if (span) {
      span.finish();
    }
  }
}

/**
 * Trace external HTTP requests
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @param {Function} executor - Function that makes the request
 * @returns {Promise} Request response
 */
export async function traceHttpRequest(method, url, options, executor) {
  const urlObj = new URL(url);
  const span = createSpan('http.client', `${method} ${urlObj.hostname}${urlObj.pathname}`, {
    'http.method': method,
    'http.url': url,
    'http.host': urlObj.hostname,
    'http.scheme': urlObj.protocol.replace(':', ''),
    'http.target': `${urlObj.pathname}${urlObj.search}`,
  });

  try {
    const startTime = Date.now();
    const response = await executor();

    if (span) {
      span.setData('http.duration', Date.now() - startTime);
      span.setTag('http.status_code', response.status || response.statusCode);

      if (response.status >= 400) {
        span.setStatus('failed_precondition');
      } else {
        span.setStatus('ok');
      }
    }

    return response;
  } catch (error) {
    if (span) {
      span.setStatus('internal_error');
      span.setData('http.error', error.message);
    }

    throw error;
  } finally {
    if (span) {
      span.finish();
    }
  }
}

/**
 * Trace AI/ML operations
 * @param {string} model - AI model name
 * @param {string} operation - Operation type (e.g., 'completion', 'embedding')
 * @param {Object} input - Input data
 * @param {Function} executor - Function that calls the AI service
 * @returns {Promise} AI response
 */
export async function traceAI(model, operation, input, executor) {
  const span = createSpan('ai.inference', `${model} ${operation}`, {
    'ai.model': model,
    'ai.operation': operation,
    'ai.input_size': JSON.stringify(input).length,
    'ai.provider': 'anthropic', // or detect based on model
  });

  try {
    const startTime = Date.now();
    const result = await executor();

    if (span) {
      span.setData('ai.duration', Date.now() - startTime);
      span.setTag('ai.success', true);

      if (result) {
        span.setData('ai.output_size', JSON.stringify(result).length);

        // Track token usage if available
        if (result.usage) {
          span.setData('ai.tokens_input', result.usage.input_tokens);
          span.setData('ai.tokens_output', result.usage.output_tokens);
          span.setData('ai.tokens_total', result.usage.total_tokens);
        }
      }
    }

    return result;
  } catch (error) {
    if (span) {
      span.setTag('ai.success', false);
      span.setData('ai.error', error.message);
    }

    throw error;
  } finally {
    if (span) {
      span.finish();
    }
  }
}

/**
 * Trace payment operations
 * @param {string} operation - Payment operation (e.g., 'create_checkout', 'process_webhook')
 * @param {Object} data - Payment data
 * @param {Function} executor - Function that processes payment
 * @returns {Promise} Payment result
 */
export async function tracePayment(operation, data, executor) {
  const span = createSpan('payment.process', operation, {
    'payment.provider': 'stripe',
    'payment.operation': operation,
    'payment.currency': data.currency || 'usd',
    'payment.amount': data.amount,
  });

  try {
    const startTime = Date.now();
    const result = await executor();

    if (span) {
      span.setData('payment.duration', Date.now() - startTime);
      span.setTag('payment.success', true);

      if (result && result.id) {
        span.setData('payment.session_id', result.id);
      }
    }

    return result;
  } catch (error) {
    if (span) {
      span.setTag('payment.success', false);
      span.setData('payment.error', error.message);
    }

    throw error;
  } finally {
    if (span) {
      span.finish();
    }
  }
}

/**
 * Add custom tags to the current transaction
 * @param {Object} tags - Tags to add
 */
export function addTransactionTags(tags) {
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
  if (transaction) {
    Object.entries(tags).forEach(([key, value]) => {
      transaction.setTag(key, value);
    });
  }
}

/**
 * Add custom data to the current transaction
 * @param {string} key - Data key
 * @param {*} value - Data value
 */
export function addTransactionData(key, value) {
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
  if (transaction) {
    transaction.setData(key, value);
  }
}

/**
 * Set user context for the current transaction
 * @param {Object} user - User information
 */
export function setUser(user) {
  Sentry.configureScope(scope => {
    scope.setUser(user);
  });
}

/**
 * Create trace headers for outgoing requests
 * @returns {Object} Headers with trace context
 */
export function getTraceHeaders() {
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
  if (!transaction) {
    return {};
  }

  const traceId = transaction.traceId;
  const spanId = transaction.spanId;

  return {
    'sentry-trace': `${traceId}-${spanId}-1`,
    baggage: `sentry-trace_id=${traceId},sentry-public_key=${Sentry.getCurrentHub().getClient()?.getDsn()?.publicKey},sentry-sample_rate=1`,
  };
}

/**
 * Performance monitoring decorator
 * @param {string} operationName - Name of the operation
 * @returns {Function} Decorator function
 */
export function traced(operationName) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const span = createSpan('method', `${target.constructor.name}.${propertyKey}`, {
        class: target.constructor.name,
        method: propertyKey,
        operation: operationName,
      });

      try {
        const result = await originalMethod.apply(this, args);
        if (span) {
          span.setTag('success', true);
        }
        return result;
      } catch (error) {
        if (span) {
          span.setTag('success', false);
          span.setData('error', error.message);
        }
        throw error;
      } finally {
        if (span) {
          span.finish();
        }
      }
    };

    return descriptor;
  };
}

export default {
  createTransaction,
  createSpan,
  traceAsync,
  createTracingMiddleware,
  traceDatabase,
  traceHttpRequest,
  traceAI,
  tracePayment,
  addTransactionTags,
  addTransactionData,
  setUser,
  getTraceHeaders,
  traced,
};
