#!/usr/bin/env node

/**
 * Example: How to integrate Sentry monitoring into your RinaWarp Terminal application
 * This file demonstrates best practices for error monitoring and performance tracking
 */

const SentryUtils = require('./src/utilities/sentry-utils.cjs');
const os = require('os');

// Example 1: Setting up user context
async function setupUserContext() {
  console.log('🔧 Setting up user context...');

  SentryUtils.setUserContext({
    username: os.userInfo().username,
    platform: process.platform,
    nodeVersion: process.version,
  });

  // Add application tags
  SentryUtils.setTags({
    application: 'rinawarp-terminal',
    version: '1.3.0',
    environment: process.env.NODE_ENV || 'development',
  });

  console.log('✅ User context configured');
}

// Example 2: Tracking command execution
async function executeCommandWithTracking(command, args = []) {
  console.log(`\n🎯 Executing command: ${command} ${args.join(' ')}`);

  return SentryUtils.trackCommand(command, async () => {
    // Simulate command execution
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      let output = '';
      let error = '';

      process.stdout.on('data', data => {
        output += data.toString();
      });

      process.stderr.on('data', data => {
        error += data.toString();
      });

      process.on('close', code => {
        if (code === 0) {
          resolve({ code, output: output.trim() });
        } else {
          reject(new Error(`Command failed with code ${code}: ${error}`));
        }
      });

      process.on('error', err => {
        reject(err);
      });
    });
  });
}

// Example 3: API call tracking
async function trackAPICall() {
  console.log('\n🌐 Making API call with tracking...');

  return SentryUtils.trackApiCall('github', 'https://api.github.com/user', async () => {
    // Simulate API call (don't actually call without auth)
    await new Promise(resolve => setTimeout(resolve, 100));
    return { user: 'example', data: 'success' };
  });
}

// Example 4: Performance measurement
async function measurePerformance() {
  console.log('\n📊 Measuring performance...');

  return SentryUtils.measurePerformance('file_processing', async () => {
    // Simulate heavy operation
    const fs = require('fs').promises;

    try {
      // Read package.json as example
      const data = await fs.readFile('./package.json', 'utf8');
      const parsed = JSON.parse(data);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 50));

      return { processed: true, size: data.length, name: parsed.name };
    } catch (error) {
      throw new Error(`File processing failed: ${error.message}`);
    }
  });
}

// Example 5: Feature usage tracking
function trackFeatureUsage() {
  console.log('\n📝 Tracking feature usage...');

  SentryUtils.trackFeatureUsage('terminal_theme_change', {
    theme: 'dark',
    source: 'user_preference',
    timestamp: new Date().toISOString(),
  });

  SentryUtils.trackFeatureUsage('command_autocomplete', {
    suggestion_count: 5,
    accepted: true,
    command_prefix: 'git',
  });

  console.log('✅ Feature usage tracked');
}

// Example 6: Error boundary usage
async function demonstrateErrorBoundary() {
  console.log('\n🛡️  Testing error boundary...');

  try {
    await SentryUtils.withErrorBoundary(async () => {
      // This will throw an error to demonstrate error tracking
      throw new Error('This is a test error for demonstration');
    }, 'demo_operation');
  } catch (error) {
    console.log(`Expected error caught: ${error.message}`);
    console.log('✅ Error was tracked by Sentry');
  }
}

// Example 7: Custom exception with context
function demonstrateCustomException() {
  console.log('\n🚨 Capturing custom exception...');

  try {
    // Simulate an error condition
    const config = null;
    if (!config) {
      throw new Error('Configuration not loaded');
    }
  } catch (error) {
    SentryUtils.captureException(error, {
      tags: {
        errorType: 'configuration_error',
        component: 'app_initialization',
      },
      contexts: {
        config: {
          attempted_file: './config.json',
          fallback_available: false,
          initialization_stage: 'early_startup',
        },
      },
      level: 'error',
    });

    console.log('✅ Custom exception captured with rich context');
  }
}

// Main execution
async function runExamples() {
  console.log('🚀 RinaWarp Terminal - Sentry Integration Examples\n');

  try {
    // Setup user context
    await setupUserContext();

    // Track some commands
    try {
      await executeCommandWithTracking('echo', ['Hello, Sentry!']);
      console.log('✅ Command tracking successful');
    } catch (error) {
      console.log(`Command failed: ${error.message}`);
    }

    // Track API call
    try {
      const apiResult = await trackAPICall();
      console.log('✅ API call tracking successful:', apiResult);
    } catch (error) {
      console.log(`API call failed: ${error.message}`);
    }

    // Measure performance
    try {
      const perfResult = await measurePerformance();
      console.log('✅ Performance measurement successful:', perfResult);
    } catch (error) {
      console.log(`Performance measurement failed: ${error.message}`);
    }

    // Track feature usage
    trackFeatureUsage();

    // Demonstrate error boundary
    await demonstrateErrorBoundary();

    // Demonstrate custom exception
    demonstrateCustomException();

    console.log('\n🎉 All examples completed successfully!');
    console.log('\n📊 Check your Sentry dashboard at: https://sentry.io/');
    console.log('🔗 You should see errors, performance data, and user insights');

    // Flush events to ensure they're sent
    console.log('\n⏳ Flushing events to Sentry...');
    const flushed = await SentryUtils.flush(3000);
    console.log(
      flushed ? '✅ Events flushed successfully' : '⚠️  Some events may not have been sent'
    );
  } catch (error) {
    console.error('❌ Example execution failed:', error);
    SentryUtils.captureException(error, {
      tags: { context: 'example_execution' },
    });
  }
}

// Integration tips
function showIntegrationTips() {
  console.log(`
📝 Integration Tips:

1. 🏁 Initialize Early: 
   - Import Sentry utilities at the top of your main files
   - Set up user context as soon as user info is available

2. 🎯 Track Key Operations:
   - Wrap command execution with SentryUtils.trackCommand()
   - Monitor API calls with SentryUtils.trackApiCall()
   - Measure performance of critical paths

3. 🔍 Add Rich Context:
   - Use tags for grouping similar errors
   - Add contexts for detailed debugging information
   - Track feature usage to understand user behavior

4. 🛡️  Error Boundaries:
   - Wrap risky operations with withErrorBoundary()
   - Provide meaningful operation names for better tracking

5. 📊 Performance Monitoring:
   - Use measurePerformance() for slow operations
   - Track metrics that matter to your users
   - Monitor memory usage and system resources

6. 🧹 Environment Configuration:
   - Set different sample rates for dev/prod
   - Filter out noise in development
   - Configure PII settings based on privacy requirements

7. 💾 Data Management:
   - Flush events before app shutdown
   - Handle network failures gracefully
   - Monitor quota usage in your Sentry dashboard
  `);
}

if (require.main === module) {
  runExamples()
    .then(() => {
      showIntegrationTips();
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  setupUserContext,
  executeCommandWithTracking,
  trackAPICall,
  measurePerformance,
  trackFeatureUsage,
  demonstrateErrorBoundary,
  demonstrateCustomException,
};
