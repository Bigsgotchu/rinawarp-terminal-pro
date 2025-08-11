/**
 * OpenAI-specific Sentry monitoring utilities for RinaWarp Terminal
 * Enhanced monitoring for AI operations, token usage, and model performance
 */

const Sentry = require('@sentry/node');
const SentryUtils = require('./sentry-utils.cjs');

class SentryOpenAIUtils extends SentryUtils {
  /**
   * Track OpenAI API calls with enhanced metrics
   * @param {string} model - AI model being used (e.g., 'gpt-4', 'gpt-3.5-turbo')
   * @param {string} operation - Type of operation (completion, embedding, etc.)
   * @param {Object} requestData - Request parameters
   * @param {Function} operation - Async OpenAI operation
   * @returns {Promise} OpenAI response with tracking
   */
  static async trackOpenAICall(model, operationType, requestData, operation) {
    return Sentry.startSpan(
      {
        name: `openai.${operationType}`,
        op: 'ai.completion',
        attributes: {
          'ai.model': model,
          'ai.operation.type': operationType,
          'ai.request.max_tokens': requestData.max_tokens || 'default',
          'ai.request.temperature': requestData.temperature || 0.7,
          'ai.request.message_count': requestData.messages?.length || 0,
          platform: process.platform,
          timestamp: new Date().toISOString(),
        },
      },
      async span => {
        const startTime = Date.now();

        try {
          const response = await operation();
          const duration = Date.now() - startTime;

          // Enhanced tracking for OpenAI responses
          if (response.usage) {
            span.setAttributes({
              'ai.response.prompt_tokens': response.usage.prompt_tokens,
              'ai.response.completion_tokens': response.usage.completion_tokens,
              'ai.response.total_tokens': response.usage.total_tokens,
            });

            // Track token usage metrics
            this.trackTokenUsage(model, response.usage, duration);
          }

          if (response.choices && response.choices.length > 0) {
            span.setAttributes({
              'ai.response.choices_count': response.choices.length,
              'ai.response.finish_reason': response.choices[0].finish_reason,
            });
          }

          // Set response metadata
          span.setAttributes({
            'ai.response.duration_ms': duration,
            'ai.response.id': response.id,
            'ai.response.created': response.created,
          });

          span.setStatus({ code: 1 }); // OK
          return response;
        } catch (error) {
          const duration = Date.now() - startTime;

          span.setAttributes({
            'ai.error.duration_ms': duration,
            'ai.error.type': error.constructor.name,
          });

          span.setStatus({ code: 2 }); // ERROR

          this.captureOpenAIException(error, {
            model,
            operationType,
            requestData: this.sanitizeRequestData(requestData),
            duration,
          });

          throw error;
        }
      }
    );
  }

  /**
   * Track token usage and costs
   * @param {string} model - AI model used
   * @param {Object} usage - Usage object from OpenAI response
   * @param {number} duration - Request duration in ms
   */
  static trackTokenUsage(model, usage, duration) {
    // Estimate costs based on model (approximate pricing)
    const modelPricing = {
      'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'text-embedding-ada-002': { input: 0.0001, output: 0 },
    };

    const pricing = modelPricing[model] || { input: 0.001, output: 0.002 };
    const estimatedCost =
      (usage.prompt_tokens / 1000) * pricing.input +
      (usage.completion_tokens / 1000) * pricing.output;

    // Record detailed metrics
    Sentry.addBreadcrumb({
      category: 'ai.tokens',
      message: `Token usage for ${model}`,
      level: 'info',
      data: {
        model,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        estimated_cost_usd: estimatedCost.toFixed(6),
        duration_ms: duration,
        tokens_per_second: Math.round(usage.total_tokens / (duration / 1000)),
        timestamp: new Date().toISOString(),
      },
    });

    // Track aggregate metrics
    this.recordMetric('ai.tokens.total', usage.total_tokens, { model });
    this.recordMetric('ai.tokens.prompt', usage.prompt_tokens, { model });
    this.recordMetric('ai.tokens.completion', usage.completion_tokens, { model });
    this.recordMetric('ai.cost.estimated_usd', estimatedCost * 1000000, { model }); // Convert to micro-dollars
    this.recordMetric('ai.performance.tokens_per_second', usage.total_tokens / (duration / 1000), {
      model,
    });
  }

  /**
   * Capture OpenAI-specific exceptions with enhanced context
   * @param {Error} error - OpenAI error
   * @param {Object} context - AI operation context
   */
  static captureOpenAIException(error, context = {}) {
    const enhancedContext = {
      tags: {
        ...context.tags,
        errorType: 'openai_error',
        model: context.model,
        operation: context.operationType,
        component: 'ai_system',
      },
      contexts: {
        openai: {
          model: context.model,
          operation_type: context.operationType,
          duration_ms: context.duration,
          request_size_chars: JSON.stringify(context.requestData || {}).length,
          timestamp: new Date().toISOString(),
        },
      },
      extra: {
        ...context.extra,
        request_data: context.requestData,
        error_code: error.code,
        error_type: error.type,
        error_param: error.param,
      },
    };

    this.captureException(error, enhancedContext);
  }

  /**
   * Track AI model performance and quality metrics
   * @param {string} model - AI model used
   * @param {string} prompt - Input prompt (will be sanitized)
   * @param {string} response - AI response (will be sanitized)
   * @param {Object} metadata - Additional tracking data
   */
  static trackAIQuality(model, prompt, response, metadata = {}) {
    const promptLength = prompt.length;
    const responseLength = response.length;
    const compressionRatio = responseLength / promptLength;

    Sentry.addBreadcrumb({
      category: 'ai.quality',
      message: `AI quality metrics for ${model}`,
      level: 'info',
      data: {
        model,
        prompt_length: promptLength,
        response_length: responseLength,
        compression_ratio: compressionRatio.toFixed(2),
        user_rating: metadata.userRating,
        task_type: metadata.taskType,
        context_length: metadata.contextLength,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track conversation flows and context management
   * @param {string} conversationId - Unique conversation identifier
   * @param {Array} messages - Message history
   * @param {Object} metadata - Conversation metadata
   */
  static trackConversation(conversationId, messages, metadata = {}) {
    const totalTokens = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    const conversationLength = messages.length;

    Sentry.addBreadcrumb({
      category: 'ai.conversation',
      message: `Conversation tracking: ${conversationId}`,
      level: 'info',
      data: {
        conversation_id: conversationId,
        message_count: conversationLength,
        total_characters: totalTokens,
        avg_message_length: Math.round(totalTokens / conversationLength),
        conversation_duration_minutes: metadata.durationMinutes,
        user_satisfaction: metadata.satisfaction,
        task_completed: metadata.taskCompleted,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track AI feature usage patterns
   * @param {string} feature - AI feature used
   * @param {Object} usage - Feature usage data
   */
  static trackAIFeatureUsage(feature, usage = {}) {
    this.trackFeatureUsage(`ai.${feature}`, {
      ...usage,
      ai_powered: true,
      model: usage.model,
      success: usage.success !== false,
    });
  }

  /**
   * Sanitize request data for logging (remove sensitive content)
   * @param {Object} requestData - Original request data
   * @returns {Object} Sanitized request data
   */
  static sanitizeRequestData(requestData) {
    const sanitized = { ...requestData };

    // Truncate long messages for privacy and storage efficiency
    if (sanitized.messages) {
      sanitized.messages = sanitized.messages.map(msg => ({
        ...msg,
        content: msg.content
          ? msg.content.length > 200
            ? msg.content.substring(0, 200) + '...'
            : msg.content
          : msg.content,
      }));
    }

    // Remove or truncate other potentially sensitive fields
    if (sanitized.prompt && sanitized.prompt.length > 200) {
      sanitized.prompt = sanitized.prompt.substring(0, 200) + '...';
    }

    return sanitized;
  }

  /**
   * Monitor AI system health and performance
   * @param {Object} systemMetrics - System performance data
   */
  static monitorAISystemHealth(systemMetrics = {}) {
    const healthData = {
      ...systemMetrics,
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      uptime_minutes: Math.round(process.uptime() / 60),
      platform: process.platform,
      node_version: process.version,
      timestamp: new Date().toISOString(),
    };

    Sentry.addBreadcrumb({
      category: 'ai.system',
      message: 'AI system health check',
      level: 'info',
      data: healthData,
    });

    // Alert on concerning metrics
    if (healthData.memory_usage_mb > 1000) {
      // > 1GB
      this.captureMessage('High memory usage in AI system', 'warning', {
        extra: { system_metrics: healthData },
      });
    }
  }
}

module.exports = SentryOpenAIUtils;
