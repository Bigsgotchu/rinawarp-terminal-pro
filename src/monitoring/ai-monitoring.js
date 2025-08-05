/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * AI Monitoring for Sentry
 * Wraps AI SDK calls to track performance, costs, and usage
 */

import * as Sentry from '@sentry/node';

/**
 * Monitor AI/LLM calls with Sentry
 * @param {string} provider - The AI provider (e.g., 'openai', 'anthropic')
 * @param {string} operation - The specific operation (e.g., 'chat.completions', 'embeddings')
 * @param {Function} fn - The function to wrap
 * @param {Object} options - Additional options for monitoring
 */
export function monitorAICall(provider, operation, fn, options = {}) {
  return async function monitoredFunction(...args) {
    const spanName = `ai.${provider}.${operation}`;
    const startTime = Date.now();

    // Use startSpan with callback pattern
    return await Sentry.startSpan(
      {
        op: 'ai.run',
        name: spanName,
      },
      async span => {
        // Set AI-specific attributes
        span.setAttributes({
          'ai.provider': provider,
          'ai.operation': operation,
        });

        // Extract model info if available
        if (args[0]?.model) {
          span.setAttribute('ai.model', args[0].model);
        }

        try {
          const result = await fn.apply(this, args);

          // Track token usage if available
          if (result?.usage) {
            span.setAttributes({
              'ai.tokens.prompt': result.usage.prompt_tokens,
              'ai.tokens.completion': result.usage.completion_tokens,
              'ai.tokens.total': result.usage.total_tokens,
            });

            // Estimate cost if pricing info is available
            if (options.pricing) {
              const cost = calculateCost(result.usage, options.pricing);
              span.setAttribute('ai.cost.estimated', cost);
            }
          }

          // Track response time
          const duration = Date.now() - startTime;
          span.setAttribute('ai.duration_ms', duration);

          // Set successful status
          span.setStatus({ code: 1 }); // SpanStatusCode.OK = 1

          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            console.log({
              tokens: result?.usage,
              model: args[0]?.model,
            });
          }

          return result;
        } catch (error) {
          // Track error details
          span.setStatus({ code: 2 }); // SpanStatusCode.ERROR = 2
          span.setAttributes({
            'ai.error': error.message,
            'ai.error.type': error.constructor.name,
          });

          // Track specific OpenAI error types
          if (error.response?.status) {
            span.setAttributes({
              'ai.error.status': error.response.status,
              'ai.error.code': error.response.data?.error?.code,
            });
          }

          // Send error to Sentry
          Sentry.captureException(error, {
            tags: {
              'ai.provider': provider,
              'ai.operation': operation,
            },
          });

          throw new Error(error);
        }
      }
    );
  };
}

/**
 * Calculate estimated cost based on token usage
 * @param {Object} usage - Token usage object
 * @param {Object} pricing - Pricing configuration
 */
function calculateCost(usage, pricing) {
  const promptCost = (usage.prompt_tokens / 1000) * pricing.promptPricePerK;
  const completionCost = (usage.completion_tokens / 1000) * pricing.completionPricePerK;
  return promptCost + completionCost;
}

/**
 * Wrap OpenAI client for monitoring
 * @param {Object} openaiClient - The OpenAI client instance
 */
export function wrapOpenAIClient(openaiClient) {
  if (!openaiClient) return openaiClient;

  // Wrap chat completions
  if (openaiClient.chat?.completions?.create) {
    const originalCreate = openaiClient.chat.completions.create.bind(openaiClient.chat.completions);
    openaiClient.chat.completions.create = monitorAICall(
      'openai',
      'chat.completions',
      originalCreate,
      {
        pricing: {
          promptPricePerK: 0.001, // $0.001 per 1K tokens for GPT-3.5
          completionPricePerK: 0.002, // $0.002 per 1K tokens for GPT-3.5
        },
      }
    );
  }

  // Wrap embeddings if they exist
  if (openaiClient.embeddings?.create) {
    const originalCreate = openaiClient.embeddings.create.bind(openaiClient.embeddings);
    openaiClient.embeddings.create = monitorAICall('openai', 'embeddings', originalCreate, {
      pricing: {
        promptPricePerK: 0.0001, // $0.0001 per 1K tokens for embeddings
        completionPricePerK: 0,
      },
    });
  }

  return openaiClient;
}

/**
 * Create custom AI monitoring transaction
 * @param {string} name - Transaction name
 * @param {Function} callback - Function to execute within transaction
 */
export async function withAITransaction(name, callback) {
  // Use startSpan with callback pattern instead of startTransaction
  return await Sentry.startSpan(
    {
      op: 'ai.pipeline',
      name,
    },
    async span => {
      try {
        const result = await callback(span);
        span.setStatus({ code: 1 }); // SpanStatusCode.OK = 1
        return result;
      } catch (error) {
        span.setStatus({ code: 2 }); // SpanStatusCode.ERROR = 2
        throw new Error(error);
      }
    }
  );
}

/**
 * Track custom AI metrics
 * @param {string} metric - Metric name
 * @param {number} value - Metric value
 * @param {Object} tags - Additional tags
 */
export function trackAIMetric(metric, value, tags = {}) {
  const transaction = Sentry.getCurrentScope().getTransaction();

  if (transaction) {
    transaction.setMeasurement(`ai.${metric}`, value, 'none');

    // Set tags
    Object.entries(tags).forEach(([key, val]) => {
      transaction.setTag(`ai.${key}`, val);
    });
  }

  // Log metric in development
  if (process.env.NODE_ENV === 'development') {
  }
}

// Export monitoring utilities
export default {
  monitorAICall,
  wrapOpenAIClient,
  withAITransaction,
  trackAIMetric,
};
