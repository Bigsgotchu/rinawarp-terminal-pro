#!/usr/bin/env node

/**
 * Example: OpenAI + Sentry Integration for RinaWarp Terminal
 * Demonstrates comprehensive monitoring of AI operations
 */

const SentryOpenAIUtils = require('./src/utilities/sentry-openai-utils.cjs');

// Mock OpenAI client for demonstration (replace with real OpenAI client)
class MockOpenAIClient {
  async createChatCompletion(params) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate occasional errors
    if (Math.random() < 0.1) {
      const error = new Error('Rate limit exceeded');
      error.code = 'rate_limit_exceeded';
      error.type = 'insufficient_quota';
      throw error;
    }

    // Mock successful response
    const promptTokens = Math.floor(50 + Math.random() * 200);
    const completionTokens = Math.floor(20 + Math.random() * 150);

    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: params.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content:
              'This is a mock response from the AI model. In a real implementation, this would be the actual AI-generated content.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }

  async createEmbedding(params) {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    return {
      object: 'list',
      data: [
        {
          object: 'embedding',
          index: 0,
          embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5),
        },
      ],
      model: params.model,
      usage: {
        prompt_tokens: Math.floor(10 + Math.random() * 50),
        total_tokens: Math.floor(10 + Math.random() * 50),
      },
    };
  }
}

const openai = new MockOpenAIClient();

async function demonstrateOpenAITracking() {
  console.log('🤖 OpenAI + Sentry Integration Examples\n');

  try {
    // Set up user context for AI operations
    console.log('🔧 Setting up AI user context...');
    SentryOpenAIUtils.setUserContext({
      username: 'ai_user',
      platform: process.platform,
      ai_features_enabled: true,
    });

    SentryOpenAIUtils.setTags({
      component: 'ai_system',
      feature: 'chat_completion',
      environment: 'development',
    });
    console.log('✅ User context configured for AI operations');

    // Example 1: Track chat completion
    console.log('\n🎯 Example 1: Tracking Chat Completion...');
    try {
      const response = await SentryOpenAIUtils.trackOpenAICall(
        'gpt-4',
        'chat.completion',
        {
          messages: [
            { role: 'system', content: 'You are a helpful terminal assistant.' },
            { role: 'user', content: 'Explain how to use git status command' },
          ],
          max_tokens: 150,
          temperature: 0.7,
        },
        async () => {
          return await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are a helpful terminal assistant.' },
              { role: 'user', content: 'Explain how to use git status command' },
            ],
            max_tokens: 150,
            temperature: 0.7,
          });
        }
      );

      console.log('✅ Chat completion tracked successfully');
      console.log(`   Response ID: ${response.id}`);
      console.log(`   Tokens used: ${response.usage.total_tokens}`);

      // Track AI quality metrics
      SentryOpenAIUtils.trackAIQuality(
        'gpt-4',
        'Explain how to use git status command',
        response.choices[0].message.content,
        {
          userRating: 5,
          taskType: 'command_explanation',
          contextLength: 2,
        }
      );
    } catch (error) {
      console.log(`❌ Chat completion failed: ${error.message}`);
      console.log('   Error was automatically tracked by Sentry');
    }

    // Example 2: Track embeddings
    console.log('\n🎯 Example 2: Tracking Embeddings...');
    try {
      const embedding = await SentryOpenAIUtils.trackOpenAICall(
        'text-embedding-ada-002',
        'embeddings',
        {
          input: 'RinaWarp Terminal is an advanced terminal emulator',
          model: 'text-embedding-ada-002',
        },
        async () => {
          return await openai.createEmbedding({
            input: 'RinaWarp Terminal is an advanced terminal emulator',
            model: 'text-embedding-ada-002',
          });
        }
      );

      console.log('✅ Embeddings tracked successfully');
      console.log(`   Vector dimensions: ${embedding.data[0].embedding.length}`);
      console.log(`   Tokens used: ${embedding.usage.total_tokens}`);
    } catch (error) {
      console.log(`❌ Embeddings failed: ${error.message}`);
    }

    // Example 3: Track conversation flow
    console.log('\n🎯 Example 3: Tracking Conversation Flow...');
    const conversationId = `conv_${Date.now()}`;
    const messages = [
      { role: 'user', content: 'How do I create a new Git repository?' },
      { role: 'assistant', content: 'You can create a new Git repository using git init...' },
      { role: 'user', content: 'What about adding files?' },
      { role: 'assistant', content: 'Use git add <filename> or git add . to add all files...' },
    ];

    SentryOpenAIUtils.trackConversation(conversationId, messages, {
      durationMinutes: 5.2,
      satisfaction: 4.5,
      taskCompleted: true,
    });

    console.log('✅ Conversation flow tracked');
    console.log(`   Conversation ID: ${conversationId}`);
    console.log(`   Messages: ${messages.length}`);

    // Example 4: Track AI feature usage
    console.log('\n🎯 Example 4: Tracking AI Feature Usage...');
    SentryOpenAIUtils.trackAIFeatureUsage('command_suggestion', {
      model: 'gpt-4',
      success: true,
      user_accepted: true,
      suggestion_type: 'git_command',
    });

    SentryOpenAIUtils.trackAIFeatureUsage('code_explanation', {
      model: 'gpt-4',
      success: true,
      code_language: 'bash',
      explanation_length: 'detailed',
    });

    console.log('✅ AI feature usage tracked');

    // Example 5: Monitor AI system health
    console.log('\n🎯 Example 5: Monitoring AI System Health...');
    SentryOpenAIUtils.monitorAISystemHealth({
      active_conversations: 3,
      tokens_used_today: 15420,
      api_calls_per_minute: 12,
      average_response_time_ms: 1850,
      error_rate_percent: 2.1,
      model_availability: {
        'gpt-4': 'available',
        'gpt-3.5-turbo': 'available',
        'text-embedding-ada-002': 'available',
      },
    });

    console.log('✅ AI system health monitored');

    console.log('\n🎉 All OpenAI tracking examples completed!');
    console.log('\n📊 Check your Sentry dashboard at: https://sentry.io/');
    console.log('🔗 You should see:');
    console.log('   - AI operation spans with detailed metrics');
    console.log('   - Token usage and cost estimates');
    console.log('   - Error tracking for failed AI calls');
    console.log('   - Performance metrics and system health');
    console.log('   - User conversation flows and feature usage');
  } catch (error) {
    console.error('❌ Demo execution failed:', error);
    SentryOpenAIUtils.captureException(error, {
      tags: { context: 'openai_demo' },
    });
  } finally {
    // Flush events to ensure they're sent
    console.log('\n⏳ Flushing events to Sentry...');
    const flushed = await SentryOpenAIUtils.flush(3000);
    console.log(
      flushed ? '✅ Events flushed successfully' : '⚠️  Some events may not have been sent'
    );
  }
}

function showOpenAIIntegrationGuide() {
  console.log(`
📚 OpenAI + Sentry Integration Guide:

🔧 Setup:
1. Install OpenAI SDK: npm install openai
2. Import utilities: const SentryOpenAIUtils = require('./src/utilities/sentry-openai-utils.cjs');
3. Wrap OpenAI calls with tracking

💡 Key Features:
✅ Automatic token usage tracking
✅ Cost estimation per model
✅ Performance metrics (tokens/second)
✅ Error tracking with context
✅ Conversation flow analysis
✅ AI quality metrics
✅ System health monitoring
✅ Feature usage analytics

📊 Metrics Tracked:
• Token usage (prompt, completion, total)
• API response times
• Error rates and types
• Cost estimates
• Model performance
• User satisfaction
• Conversation patterns
• System resource usage

🎯 Usage Examples:

// Track a chat completion
const response = await SentryOpenAIUtils.trackOpenAICall(
  'gpt-4', 
  'chat.completion',
  requestData,
  () => openai.chat.completions.create(requestData)
);

// Track feature usage
SentryOpenAIUtils.trackAIFeatureUsage('code_generation', {
  model: 'gpt-4',
  success: true,
  language: 'javascript'
});

// Monitor system health
SentryOpenAIUtils.monitorAISystemHealth({
  active_conversations: 5,
  tokens_used_today: 12000
});

🔐 Privacy:
• Request data is automatically sanitized
• Long prompts/responses are truncated
• No sensitive user data is logged
• Configurable PII filtering

📈 Dashboard Insights:
• View AI operation performance
• Monitor token consumption
• Track error patterns
• Analyze user behavior
• Optimize model selection
• Control costs
  `);
}

if (require.main === module) {
  demonstrateOpenAITracking()
    .then(() => {
      showOpenAIIntegrationGuide();
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  demonstrateOpenAITracking,
  showOpenAIIntegrationGuide,
};
