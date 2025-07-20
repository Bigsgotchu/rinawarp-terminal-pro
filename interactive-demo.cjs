#!/usr/bin/env node
/**
 * 🎮 Interactive Risk-Based Integration Demo
 * Run this to see the system in action!
 */

const { createFeatureFlags } = require('./src/core/featureFlags.cjs');
const BootProfileVisualizer = require('./src/tools/bootProfileVisualizer.cjs');

async function runInteractiveDemo() {
  console.log('🧜‍♀️ RinaWarp Terminal - Interactive Risk-Based Integration Demo');
  console.log('=' .repeat(70));
  console.log('This demo will show you:');
  console.log('• 🚦 Feature flag system with risk-based activation');
  console.log('• 🎛️ Real-time boot profile dashboard');
  console.log('• ⚡ Performance monitoring and health tracking');
  console.log('• 🎯 Risk-based decision making');
  console.log('');
  console.log('Press Ctrl+C to stop the demo at any time');
  console.log('=' .repeat(70));

  try {
    // Initialize feature flags
    const flags = createFeatureFlags({ 
      runtimeMode: 'development',
      userProfile: 'interactive-demo' 
    });
    
    await flags.initialize();
    
    // Show initial status
    console.log('\n📊 Initial System State:');
    const enabled = flags.getEnabledFeatures();
    enabled.forEach(feature => {
      console.log(`   ${feature.emoji} ${feature.displayName}`);
    });
    
    console.log('\n🎛️ Starting Boot Profile Visualizer...');
    
    // Create and start the visualizer
    const visualizer = new BootProfileVisualizer({ refreshInterval: 3000 });
    await visualizer.initialize();
    
    // Enable some features dynamically to show the system working
    setTimeout(async () => {
      try {
        console.log('\n⚡ Demo: Enabling experimental feature...');
        await flags.enableFeature('performanceMonitoring', { 
          approvedBy: 'demo-system' 
        });
      } catch (error) {
        console.log('Note:', error.message);
      }
    }, 5000);
    
    setTimeout(async () => {
      try {
        console.log('\n🔄 Demo: Attempting dangerous feature...');
        await flags.enableFeature('discordBot', { 
          approvedBy: 'demo-lead',
          reason: 'demonstration' 
        });
      } catch (error) {
        console.log('Note:', error.message);
      }
    }, 10000);
    
    setTimeout(async () => {
      try {
        console.log('\n🧠 Demo: Running performance check...');
        await flags.performanceCheck();
      } catch (error) {
        console.log('Note:', error.message);
      }
    }, 15000);
    
    // Start the real-time monitoring
    await visualizer.startRealTimeMonitoring();
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Thanks for trying the RinaWarp Terminal Risk-Based Integration System!');
  console.log('🎯 Key takeaways:');
  console.log('• Features are classified by risk level (STABLE, EXPERIMENTAL, DANGEROUS)');
  console.log('• System automatically monitors performance and prevents issues');
  console.log('• Real-time dashboard provides complete visibility');
  console.log('• CI/CD pipeline enforces safety constraints');
  console.log('\nTo run individual components:');
  console.log('• Feature demo: node demo-risk-system.cjs');
  console.log('• Pattern scanner: node migrationToolkit/deprecatedPatternsScanner.js ./src');
  console.log('• Boot visualizer: node src/tools/bootProfileVisualizer.cjs');
  process.exit(0);
});

// CLI execution
if (require.main === module) {
  runInteractiveDemo()
    .catch(error => {
      console.error('Interactive demo error:', error);
      process.exit(1);
    });
}

module.exports = { runInteractiveDemo };
