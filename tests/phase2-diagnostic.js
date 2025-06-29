/**
 * RinaWarp Terminal - Phase2 Diagnostic
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
console.log('\n🔧 RinaWarp Phase 2 Diagnostic Tool');
console.log('=====================================\n');

// Function to check and fix Phase 2 integration
function diagnoseAndFixPhase2() {
  console.log('🔍 Starting Phase 2 diagnostic...\n');

  // 1. Check if Phase 2 global instance exists
  if (window.RinaWarpPhase2) {
    console.log('✅ Phase 2 global instance found');
    console.log(`   - Initialized: ${window.RinaWarpPhase2.isReady()}`);
    console.log(`   - Active: ${window.RinaWarpPhase2.isActive()}`);

    // Check UI Manager
    const uiManager = window.RinaWarpPhase2.getUIManager();
    if (uiManager) {
      console.log('✅ UI Manager available');
      console.log(`   - Current Mode: ${uiManager.getCurrentMode()}`);
    } else {
      console.log('❌ UI Manager not available');
    }
  } else {
    console.log('❌ Phase 2 global instance not found');
    return false;
  }

  // 2. Check RinaWarp integration system
  if (window.rinaWarpIntegration) {
    console.log('✅ RinaWarp integration system found');

    if (window.rinaWarpIntegration.hub) {
      console.log('✅ Integration hub available');

      const status = window.rinaWarpIntegration.getSystemStatus();
      console.log('📊 Integration Status:');
      console.log(`   - Features: ${status.integration.featuresCount || 0}`);
      console.log(`   - Hub Initialized: ${status.hub.isInitialized}`);

      // Check if Phase 2 is registered
      const features = status.features || {};
      const phase2Features = Object.keys(features).filter(key => key.includes('phase2'));

      if (phase2Features.length > 0) {
        console.log('✅ Phase 2 features registered:');
        phase2Features.forEach(feature => {
          console.log(`   - ${feature}`);
        });
      } else {
        console.log('⚠️ No Phase 2 features registered - attempting to register...');

        // Force registration
        if (window.RinaWarpPhase2.registerWithIntegrationSystem) {
          window.RinaWarpPhase2.registerWithIntegrationSystem();
        } else {
          console.log('❌ Registration method not available');
        }
      }
    } else {
      console.log('❌ Integration hub not available');
    }
  } else {
    console.log('❌ RinaWarp integration system not found');
  }

  // 3. Check Phase 2 UI elements
  const phase2Container = document.querySelector('.phase2-ui-container');
  if (phase2Container) {
    console.log('✅ Phase 2 UI container found');
    console.log(`   - Display: ${getComputedStyle(phase2Container).display}`);
    console.log(`   - Visibility: ${getComputedStyle(phase2Container).visibility}`);
  } else {
    console.log('❌ Phase 2 UI container not found');
  }

  // 4. Check CSS
  const phase2CSS = document.querySelector('link[href*="phase2-ui.css"]');
  if (phase2CSS) {
    console.log('✅ Phase 2 CSS loaded');
  } else {
    console.log('❌ Phase 2 CSS not loaded');
  }

  console.log('\n🎯 Recommendations:');

  if (!window.RinaWarpPhase2) {
    console.log('❗ Phase 2 not loaded - check if phase2-integration.js is included');
  } else if (!window.RinaWarpPhase2.isReady()) {
    console.log('❗ Phase 2 not initialized - trying to initialize...');
    window.RinaWarpPhase2.initialize()
      .then(() => {
        console.log('✅ Phase 2 initialization attempted');
      })
      .catch(error => {
        console.error('❌ Phase 2 initialization failed:', error);
      });
  } else if (!window.RinaWarpPhase2.isActive()) {
    console.log('❗ Phase 2 not active - trying to activate...');
    window.RinaWarpPhase2.activate()
      .then(() => {
        console.log('✅ Phase 2 activation attempted');
      })
      .catch(error => {
        console.error('❌ Phase 2 activation failed:', error);
      });
  } else {
    console.log('✅ Phase 2 appears to be working correctly!');
  }

  return true;
}

// Function to manually register Phase 2 features with integration system
function forcePhase2Registration() {
  console.log('\n🔧 Forcing Phase 2 registration...\n');

  if (window.rinaWarpIntegration && window.rinaWarpIntegration.hub && window.RinaWarpPhase2) {
    const hub = window.rinaWarpIntegration.hub;

    try {
      // Register Phase 2 as a unified feature
      hub.registerFeature('phase2-system', {
        name: 'Phase 2 Next-Generation UI System',
        version: '2.0.0',
        status: 'active',
        instance: window.RinaWarpPhase2,
        capabilities: [
          'adaptive-interface',
          'multimodal-interaction',
          'context-awareness',
          'accessibility-compliance',
          'collaboration-support',
          'performance-monitoring',
        ],
      });

      console.log('✅ Phase 2 system registered successfully');

      // Register UI Manager separately
      const uiManager = window.RinaWarpPhase2.getUIManager();
      if (uiManager) {
        hub.registerFeature('phase2-ui-manager', {
          name: 'Phase 2 UI Manager',
          version: '2.0.0',
          status: 'active',
          instance: uiManager,
        });
        console.log('✅ Phase 2 UI Manager registered');
      }

      // Check the registration worked
      const status = window.rinaWarpIntegration.getSystemStatus();
      console.log(`📊 New feature count: ${status.integration.featuresCount}`);
    } catch (error) {
      console.error('❌ Failed to register Phase 2:', error);
    }
  } else {
    console.log('❌ Required systems not available for registration');
  }
}

// Function to activate Phase 2 with debugging
function debugActivatePhase2() {
  console.log('\n🚀 Debug activation of Phase 2...\n');

  if (window.RinaWarpPhase2) {
    console.log('📊 Current status:');
    console.log(`   - Ready: ${window.RinaWarpPhase2.isReady()}`);
    console.log(`   - Active: ${window.RinaWarpPhase2.isActive()}`);

    if (!window.RinaWarpPhase2.isReady()) {
      console.log('🔧 Initializing Phase 2...');
      window.RinaWarpPhase2.initialize()
        .then(() => {
          console.log('✅ Phase 2 initialized');
          console.log('🚀 Now activating...');
          return window.RinaWarpPhase2.activate();
        })
        .then(() => {
          console.log('✅ Phase 2 activated successfully!');
          showPhase2Features();
        })
        .catch(error => {
          console.error('❌ Error during Phase 2 setup:', error);
        });
    } else if (!window.RinaWarpPhase2.isActive()) {
      console.log('🚀 Activating Phase 2...');
      window.RinaWarpPhase2.activate()
        .then(() => {
          console.log('✅ Phase 2 activated successfully!');
          showPhase2Features();
        })
        .catch(error => {
          console.error('❌ Error during Phase 2 activation:', error);
        });
    } else {
      console.log('✅ Phase 2 already active!');
      showPhase2Features();
    }
  } else {
    console.log('❌ Phase 2 not found');
  }
}

// Function to show Phase 2 features
function showPhase2Features() {
  console.log('\n🌟 Phase 2 Features Available:');
  console.log('- Press F1 for help system');
  console.log('- Press Ctrl+Shift+P for quick action palette');
  console.log('- Press Alt+1 for Guided Mode');
  console.log('- Press Alt+2 for Visual Mode');
  console.log('- Press Alt+3 for Traditional Mode');
  console.log('- Press Alt+4 for Expert Mode');

  // Try to show the Phase 2 container
  const container = document.querySelector('.phase2-ui-container');
  if (container) {
    container.style.display = 'flex';
    container.style.visibility = 'visible';
    console.log('✅ Phase 2 UI container made visible');
  }
}

// Run the diagnostic automatically
console.log('🔍 Running automatic diagnostic...\n');
diagnoseAndFixPhase2();

console.log('\n💡 Available functions:');
console.log('- diagnoseAndFixPhase2() - Run full diagnostic');
console.log('- forcePhase2Registration() - Force register with integration system');
console.log('- debugActivatePhase2() - Debug activation process');
console.log('- showPhase2Features() - Show available features');

// Export functions to global scope for easy access
window.diagnoseAndFixPhase2 = diagnoseAndFixPhase2;
window.forcePhase2Registration = forcePhase2Registration;
window.debugActivatePhase2 = debugActivatePhase2;
window.showPhase2Features = showPhase2Features;
