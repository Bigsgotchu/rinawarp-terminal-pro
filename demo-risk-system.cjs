#!/usr/bin/env node
/**
 * 🎯 Risk-Based Integration System Demo
 * Shows the complete workflow in action
 */

const { createFeatureFlags } = require('./src/core/featureFlags.cjs');

async function demoRiskBasedIntegration() {
  console.log('🧜‍♀️ RinaWarp Terminal - Risk-Based Integration Demo');
  console.log('=' .repeat(60));
  
  try {
    // Initialize feature flags system
    console.log('\n🚦 Step 1: Initializing Feature Flag System');
    const flags = createFeatureFlags({ 
      runtimeMode: 'development',
      userProfile: 'demo' 
    });
    
    await flags.initialize();
    
    // Show initial status
    console.log('\n📊 Initial Feature Status:');
    const enabledFeatures = flags.getEnabledFeatures();
    enabledFeatures.forEach(feature => {
      console.log(`   ${feature.emoji} ${feature.displayName} (${feature.risk})`);
    });
    
    // Demonstrate risk-based feature enabling
    console.log('\n🎛️ Step 2: Testing Risk-Based Feature Activation');
    
    // Try to enable an experimental feature
    try {
      console.log('\n⚠️ Attempting to enable experimental feature: advancedThemes');
      await flags.enableFeature('advancedThemes', { 
        approvedBy: 'demo-user',
        reason: 'testing-integration' 
      });
      console.log('✅ Advanced themes enabled successfully');
    } catch (error) {
      console.log(`❌ Failed to enable: ${error.message}`);
    }
    
    // Try to enable a dangerous feature (should require approval)
    try {
      console.log('\n🔴 Attempting to enable dangerous feature: aiAssistant (without approval)');
      await flags.enableFeature('aiAssistant');
      console.log('✅ AI Assistant enabled');
    } catch (error) {
      console.log(`❌ Blocked as expected: ${error.message}`);
    }
    
    // Enable with approval
    try {
      console.log('\n🔴 Attempting to enable dangerous feature: aiAssistant (with approval)');
      await flags.enableFeature('aiAssistant', { 
        approvedBy: 'tech-lead',
        force: false 
      });
      console.log('✅ AI Assistant enabled with approval');
    } catch (error) {
      console.log(`⚠️ Still blocked: ${error.message}`);
    }
    
    // Show risk summary
    console.log('\n📊 Current Risk Summary:');
    const riskSummary = flags.getRiskSummary();
    console.log(`   🟢 STABLE: ${riskSummary.STABLE} features`);
    console.log(`   🟡 EXPERIMENTAL: ${riskSummary.EXPERIMENTAL} features`);
    console.log(`   🔴 DANGEROUS: ${riskSummary.DANGEROUS} features`);
    
    // Test performance monitoring
    console.log('\n⚡ Step 3: Performance Monitoring Demo');
    await flags.performanceCheck();
    
    const memUsage = process.memoryUsage();
    const heapMB = Math.round(memUsage.heapUsed / (1024 * 1024));
    console.log(`   🧠 Current memory usage: ${heapMB}MB`);
    console.log('   ⚡ Memory limit: 200MB');
    console.log(`   📊 Status: ${heapMB < 200 ? '✅ Within limits' : '⚠️ Approaching limit'}`);
    
    // Show all enabled features
    console.log('\n🎯 Final Feature Status:');
    const finalFeatures = flags.getEnabledFeatures();
    if (finalFeatures.length === 0) {
      console.log('   No features currently enabled');
    } else {
      finalFeatures.forEach(feature => {
        console.log(`   ${feature.emoji} ${feature.displayName}`);
      });
    }
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   • Run pattern scanner: node migrationToolkit/deprecatedPatternsScanner.js ./src');
    console.log('   • Start boot visualizer: node src/tools/bootProfileVisualizer.cjs');
    console.log('   • Check deployment workflow: .github/workflows/risk-based-deployment.yml');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  demoRiskBasedIntegration()
    .then(() => {
      console.log('\n✨ Demo finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('Demo error:', error);
      process.exit(1);
    });
}

module.exports = { demoRiskBasedIntegration };
