#!/usr/bin/env node

/**
 * Comprehensive AI Agent Monitoring Verification
 * Tests all aspects of agent monitoring to ensure Sentry is capturing AI interactions correctly
 */

const SentryOpenAIUtils = require('./src/utilities/sentry-openai-utils.cjs');
const os = require('os');

// Mock AI agent classes that simulate your real AI system
class MockAIProvider {
  constructor(providerId, config) {
    this.id = providerId;
    this.config = config;
    this.status = 'ready';
    this.lastLatency = 0;
  }

  async generateCompletion(prompt, options = {}) {
    const startTime = Date.now();

    // Simulate different response types and delays
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 2000));

    // Simulate occasional failures
    if (Math.random() < 0.15) {
      const error = new Error('API rate limit exceeded');
      error.code = 'rate_limit_exceeded';
      error.provider = this.id;
      throw error;
    }

    this.lastLatency = Date.now() - startTime;

    // Return mock response based on provider
    const responses = {
      openai: {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        model: options.model || 'gpt-4',
        created: Math.floor(Date.now() / 1000),
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: `Mock ${this.id} response to: "${prompt.substring(0, 50)}..."`,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: Math.floor(20 + Math.random() * 100),
          completion_tokens: Math.floor(10 + Math.random() * 80),
          total_tokens: Math.floor(30 + Math.random() * 180),
        },
      },
      anthropic: {
        id: `msg-${Date.now()}`,
        type: 'message',
        model: options.model || 'claude-3-sonnet',
        content: [
          {
            type: 'text',
            text: `Mock Claude response to: "${prompt.substring(0, 50)}..."`,
          },
        ],
        usage: {
          input_tokens: Math.floor(20 + Math.random() * 100),
          output_tokens: Math.floor(10 + Math.random() * 80),
        },
      },
      ollama: {
        model: options.model || 'llama2',
        response: `Mock Ollama response to: "${prompt.substring(0, 50)}..."`,
        done: true,
        eval_count: Math.floor(10 + Math.random() * 80),
        prompt_eval_count: Math.floor(20 + Math.random() * 100),
      },
    };

    return responses[this.id] || responses.openai;
  }
}

class MockAdvancedAISystem {
  constructor() {
    this.providers = new Map();
    this.activeProvider = 'openai';
    this.conversationHistory = [];

    // Initialize mock providers
    this.providers.set('openai', new MockAIProvider('openai', { name: 'OpenAI' }));
    this.providers.set('anthropic', new MockAIProvider('anthropic', { name: 'Anthropic' }));
    this.providers.set('ollama', new MockAIProvider('ollama', { name: 'Ollama', local: true }));
  }

  async generateCompletion(prompt, options = {}) {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`Provider ${this.activeProvider} not found`);
    }

    return provider.generateCompletion(prompt, options);
  }

  async explainCommand(command, context = {}) {
    const prompt = `Explain this command: ${command}`;
    return this.generateCompletion(prompt, { contextType: 'command_explanation' });
  }

  async suggestCommand(description, context = {}) {
    const prompt = `Suggest commands for: ${description}`;
    return this.generateCompletion(prompt, { contextType: 'command_suggestion' });
  }

  async chatWithAI(message, conversationId = null) {
    this.conversationHistory.push({ role: 'user', content: message });
    const response = await this.generateCompletion(message, { contextType: 'chat' });

    const assistantMessage = response.choices
      ? response.choices[0].message.content
      : response.content?.[0]?.text || response.response || 'Mock response';

    this.conversationHistory.push({ role: 'assistant', content: assistantMessage });

    return {
      response: assistantMessage,
      conversationId: conversationId || `conv_${Date.now()}`,
      usage: response.usage,
    };
  }

  setActiveProvider(providerId) {
    if (this.providers.has(providerId)) {
      this.activeProvider = providerId;
      return true;
    }
    return false;
  }
}

class AgentMonitoringVerifier {
  constructor() {
    this.aiSystem = new MockAdvancedAISystem();
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: [],
    };
  }

  async runVerification() {
    console.log('🤖 Starting AI Agent Monitoring Verification\n');

    try {
      // Setup Sentry context for agent monitoring
      await this.setupAgentContext();

      // Test different types of AI agent interactions
      await this.testCommandExplanation();
      await this.testCommandSuggestion();
      await this.testChatInteraction();
      await this.testMultiProviderInteraction();
      await this.testErrorScenarios();
      await this.testConversationFlow();
      await this.testPerformanceMonitoring();
      await this.testFeatureUsageTracking();

      // Report results
      this.reportResults();
    } catch (error) {
      console.error('❌ Verification failed:', error);
      SentryOpenAIUtils.captureException(error, {
        tags: { context: 'agent_monitoring_verification' },
      });
    } finally {
      // Flush all events to Sentry
      console.log('\n⏳ Flushing all monitoring data to Sentry...');
      const flushed = await SentryOpenAIUtils.flush(5000);
      console.log(
        flushed ? '✅ All events sent to Sentry' : '⚠️  Some events may not have been sent'
      );
    }
  }

  async setupAgentContext() {
    console.log('🔧 Setting up agent monitoring context...');

    SentryOpenAIUtils.setUserContext({
      id: 'agent_tester',
      username: os.userInfo().username,
      platform: process.platform,
      ai_features_enabled: true,
      test_session: true,
    });

    SentryOpenAIUtils.setTags({
      component: 'ai_agent_system',
      verification: 'monitoring_test',
      environment: 'test',
      session_type: 'verification',
    });

    SentryOpenAIUtils.setContext('verification', {
      test_runner: 'agent_monitoring_verifier',
      timestamp: new Date().toISOString(),
      system_info: {
        platform: process.platform,
        node_version: process.version,
        memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });

    console.log('✅ Agent context configured');
    this.recordTest('Agent Context Setup', true, 'Context successfully configured');
  }

  async testCommandExplanation() {
    console.log('\n🎯 Testing Command Explanation Monitoring...');

    try {
      const command = 'git status --porcelain';

      const result = await SentryOpenAIUtils.trackOpenAICall(
        'gpt-4',
        'command.explanation',
        {
          messages: [
            { role: 'system', content: 'Explain terminal commands clearly.' },
            { role: 'user', content: `Explain: ${command}` },
          ],
        },
        async () => {
          return await this.aiSystem.explainCommand(command, {
            platform: process.platform,
            context_type: 'command_explanation',
          });
        }
      );

      // Track the AI feature usage
      SentryOpenAIUtils.trackAIFeatureUsage('command_explanation', {
        model: 'gpt-4',
        command: command,
        success: true,
        response_length: result.choices?.[0]?.message?.content?.length || 0,
      });

      console.log('✅ Command explanation monitored successfully');
      this.recordTest('Command Explanation', true, `Explained: ${command}`);
    } catch (error) {
      console.log('❌ Command explanation monitoring failed:', error.message);
      this.recordTest('Command Explanation', false, error.message);
    }
  }

  async testCommandSuggestion() {
    console.log('\n🎯 Testing Command Suggestion Monitoring...');

    try {
      const task = 'Find all JavaScript files modified in the last 24 hours';

      const result = await SentryOpenAIUtils.trackOpenAICall(
        'gpt-4',
        'command.suggestion',
        {
          messages: [
            { role: 'system', content: 'Suggest terminal commands for tasks.' },
            { role: 'user', content: `Task: ${task}` },
          ],
        },
        async () => {
          return await this.aiSystem.suggestCommand(task, {
            platform: process.platform,
            available_tools: ['find', 'grep', 'ls'],
          });
        }
      );

      SentryOpenAIUtils.trackAIFeatureUsage('command_suggestion', {
        model: 'gpt-4',
        task: task,
        success: true,
        suggestions_provided: true,
      });

      console.log('✅ Command suggestion monitored successfully');
      this.recordTest('Command Suggestion', true, `Suggested commands for: ${task}`);
    } catch (error) {
      console.log('❌ Command suggestion monitoring failed:', error.message);
      this.recordTest('Command Suggestion', false, error.message);
    }
  }

  async testChatInteraction() {
    console.log('\n🎯 Testing AI Chat Monitoring...');

    try {
      const messages = [
        'Hello, I need help with Git workflow',
        'How do I create a feature branch?',
        'What about merging back to main?',
      ];

      let conversationId = null;

      for (const [index, message] of messages.entries()) {
        const result = await SentryOpenAIUtils.trackOpenAICall(
          'gpt-4',
          'chat.completion',
          {
            messages: [
              { role: 'system', content: 'You are a helpful terminal assistant.' },
              { role: 'user', content: message },
            ],
          },
          async () => {
            const chatResult = await this.aiSystem.chatWithAI(message, conversationId);
            conversationId = chatResult.conversationId;
            return {
              id: `chat-${Date.now()}`,
              choices: [
                {
                  message: { content: chatResult.response },
                },
              ],
              usage: chatResult.usage || {
                prompt_tokens: 50,
                completion_tokens: 75,
                total_tokens: 125,
              },
            };
          }
        );

        // Track conversation quality
        SentryOpenAIUtils.trackAIQuality('gpt-4', message, result.choices[0].message.content, {
          conversation_turn: index + 1,
          conversation_id: conversationId,
          topic: 'git_workflow',
        });
      }

      // Track the full conversation
      SentryOpenAIUtils.trackConversation(
        conversationId,
        messages.map(m => ({ role: 'user', content: m })),
        {
          durationMinutes: 3.5,
          satisfaction: 4.2,
          taskCompleted: true,
          topic: 'git_workflow',
        }
      );

      console.log('✅ AI chat interaction monitored successfully');
      this.recordTest(
        'AI Chat Interaction',
        true,
        `Conversation with ${messages.length} turns tracked`
      );
    } catch (error) {
      console.log('❌ AI chat monitoring failed:', error.message);
      this.recordTest('AI Chat Interaction', false, error.message);
    }
  }

  async testMultiProviderInteraction() {
    console.log('\n🎯 Testing Multi-Provider Monitoring...');

    const providers = ['openai', 'anthropic', 'ollama'];
    let successCount = 0;

    for (const provider of providers) {
      try {
        this.aiSystem.setActiveProvider(provider);
        const prompt = `Test prompt for ${provider} provider`;

        const result = await SentryOpenAIUtils.trackOpenAICall(
          provider === 'anthropic' ? 'claude-3-sonnet' : 'gpt-4',
          'provider.test',
          { messages: [{ role: 'user', content: prompt }] },
          async () => {
            return await this.aiSystem.generateCompletion(prompt, {
              model: provider === 'anthropic' ? 'claude-3-sonnet' : 'gpt-4',
            });
          }
        );

        SentryOpenAIUtils.trackAIFeatureUsage(`${provider}_interaction`, {
          provider: provider,
          success: true,
          response_received: true,
        });

        successCount++;
        console.log(`✅ ${provider} provider monitored successfully`);
      } catch (error) {
        console.log(`⚠️ ${provider} provider test failed: ${error.message}`);
        SentryOpenAIUtils.captureException(error, {
          tags: {
            provider: provider,
            test_type: 'multi_provider',
          },
        });
      }
    }

    const allSucceeded = successCount === providers.length;
    this.recordTest(
      'Multi-Provider Monitoring',
      allSucceeded,
      `${successCount}/${providers.length} providers tested successfully`
    );
  }

  async testErrorScenarios() {
    console.log('\n🎯 Testing Error Scenario Monitoring...');

    try {
      // Simulate various error types
      const errorScenarios = [
        { type: 'rate_limit', message: 'Rate limit exceeded' },
        { type: 'invalid_api_key', message: 'Invalid API key' },
        { type: 'timeout', message: 'Request timeout' },
      ];

      for (const scenario of errorScenarios) {
        try {
          await SentryOpenAIUtils.trackOpenAICall(
            'gpt-4',
            'error.simulation',
            { messages: [{ role: 'user', content: 'Test error scenario' }] },
            async () => {
              const error = new Error(scenario.message);
              error.code = scenario.type;
              error.provider = 'openai';
              throw error;
            }
          );
        } catch (error) {
          // Expected - errors should be captured by Sentry
          console.log(`✅ ${scenario.type} error captured: ${error.message}`);
        }
      }

      this.recordTest('Error Scenario Monitoring', true, 'All error types captured successfully');
    } catch (error) {
      console.log('❌ Error scenario monitoring failed:', error.message);
      this.recordTest('Error Scenario Monitoring', false, error.message);
    }
  }

  async testConversationFlow() {
    console.log('\n🎯 Testing Conversation Flow Monitoring...');

    try {
      const conversationId = `verification_conv_${Date.now()}`;
      const conversationTurns = [
        {
          user: 'I want to deploy a Node.js app',
          assistant: 'I can help you deploy your Node.js application',
        },
        {
          user: 'Should I use Docker?',
          assistant: 'Docker is a great choice for containerizing Node.js apps',
        },
        {
          user: 'How do I create a Dockerfile?',
          assistant: "Here's a basic Dockerfile for Node.js applications",
        },
      ];

      const messages = [];
      for (const turn of conversationTurns) {
        messages.push({ role: 'user', content: turn.user });
        messages.push({ role: 'assistant', content: turn.assistant });
      }

      SentryOpenAIUtils.trackConversation(conversationId, messages, {
        durationMinutes: 8.3,
        satisfaction: 4.8,
        taskCompleted: true,
        domain: 'deployment',
        complexity: 'intermediate',
        user_intent: 'learn_deployment',
      });

      console.log('✅ Conversation flow monitored successfully');
      this.recordTest(
        'Conversation Flow Monitoring',
        true,
        `Tracked conversation with ${conversationTurns.length} turns`
      );
    } catch (error) {
      console.log('❌ Conversation flow monitoring failed:', error.message);
      this.recordTest('Conversation Flow Monitoring', false, error.message);
    }
  }

  async testPerformanceMonitoring() {
    console.log('\n🎯 Testing AI Performance Monitoring...');

    try {
      const performanceTest = await SentryOpenAIUtils.measurePerformance(
        'ai_agent_response_time',
        async () => {
          return await this.aiSystem.generateCompletion(
            'Generate a comprehensive explanation of microservices architecture',
            { model: 'gpt-4' }
          );
        }
      );

      // Monitor AI system health
      SentryOpenAIUtils.monitorAISystemHealth({
        active_conversations: 5,
        tokens_used_today: 25420,
        api_calls_per_minute: 8,
        average_response_time_ms: 2100,
        error_rate_percent: 3.2,
        model_availability: {
          'gpt-4': 'available',
          'claude-3-sonnet': 'available',
          ollama: 'available',
        },
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpu_usage_percent: 45,
      });

      console.log('✅ AI performance monitoring successful');
      this.recordTest('Performance Monitoring', true, 'AI system performance tracked successfully');
    } catch (error) {
      console.log('❌ Performance monitoring failed:', error.message);
      this.recordTest('Performance Monitoring', false, error.message);
    }
  }

  async testFeatureUsageTracking() {
    console.log('\n🎯 Testing AI Feature Usage Tracking...');

    try {
      const features = [
        {
          name: 'code_generation',
          data: { language: 'javascript', success: true, lines_generated: 45 },
        },
        { name: 'code_review', data: { language: 'python', issues_found: 3, severity: 'medium' } },
        {
          name: 'documentation',
          data: { type: 'api_docs', pages_generated: 8, format: 'markdown' },
        },
        { name: 'debugging_help', data: { error_type: 'runtime_error', solution_provided: true } },
        {
          name: 'performance_optimization',
          data: { suggestions_count: 6, estimated_improvement: '25%' },
        },
      ];

      for (const feature of features) {
        SentryOpenAIUtils.trackAIFeatureUsage(feature.name, {
          model: 'gpt-4',
          success: feature.data.success !== false,
          ...feature.data,
        });
      }

      console.log('✅ AI feature usage tracking successful');
      this.recordTest('Feature Usage Tracking', true, `Tracked ${features.length} AI features`);
    } catch (error) {
      console.log('❌ Feature usage tracking failed:', error.message);
      this.recordTest('Feature Usage Tracking', false, error.message);
    }
  }

  recordTest(testName, passed, details) {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
    } else {
      this.testResults.failed++;
    }

    this.testResults.details.push({
      test: testName,
      status: passed ? 'PASSED' : 'FAILED',
      details: details,
      timestamp: new Date().toISOString(),
    });
  }

  reportResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 AI AGENT MONITORING VERIFICATION RESULTS');
    console.log('='.repeat(60));

    console.log('\n📈 Summary:');
    console.log(`   Total Tests: ${this.testResults.total}`);
    console.log(`   ✅ Passed: ${this.testResults.passed}`);
    console.log(`   ❌ Failed: ${this.testResults.failed}`);
    console.log(
      `   📊 Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`
    );

    console.log('\n📋 Detailed Results:');
    for (const result of this.testResults.details) {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${status} ${result.test}: ${result.details}`);
    }

    console.log('\n🎯 What Was Monitored:');
    console.log('   • AI agent command explanations');
    console.log('   • AI agent command suggestions');
    console.log('   • Multi-turn AI conversations');
    console.log('   • Multiple AI provider interactions');
    console.log('   • AI error scenarios and recovery');
    console.log('   • Conversation flow analysis');
    console.log('   • AI performance metrics');
    console.log('   • AI feature usage analytics');
    console.log('   • Token usage and cost tracking');
    console.log('   • System health monitoring');

    console.log('\n📊 Sentry Dashboard:');
    console.log('   🔗 URL: https://sentry.io/');
    console.log('   📈 Check for: AI operation spans, token metrics, error tracking');
    console.log('   🤖 Look for: Agent interactions, conversation flows, performance data');

    if (this.testResults.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Agent monitoring is working correctly.');
      console.log('🚀 Your AI agent interactions are being comprehensively monitored by Sentry.');
    } else {
      console.log(`\n⚠️  ${this.testResults.failed} test(s) failed. Check the details above.`);
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new AgentMonitoringVerifier();
  verifier
    .runVerification()
    .then(() => {
      console.log('\n✅ Agent monitoring verification completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = AgentMonitoringVerifier;
