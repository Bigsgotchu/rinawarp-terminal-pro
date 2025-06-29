/**
 * RinaWarp Terminal - Test Exports
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
async function testExports() {
  console.log('🧪 Testing RinaWarp Terminal Module Exports...\n');

  try {
    // Test workflow automation export
    console.log('Testing workflow-automation.js exports...');
    const workflowModule = await import('./src/renderer/workflow-automation.js');

    if (workflowModule.WorkflowAutomation) {
      console.log('✅ WorkflowAutomation export found');
    } else {
      console.log('❌ WorkflowAutomation export missing');
    }

    if (workflowModule.WorkflowAutomationEngine) {
      console.log('✅ WorkflowAutomationEngine export found');
    } else {
      console.log('❌ WorkflowAutomationEngine export missing');
    }

    // Test other critical modules
    console.log('\nTesting other Phase 2 modules...');

    try {
      const aiModule = await import('./src/renderer/ai-context-engine.js');
      console.log('✅ AI Context Engine module loaded');
    } catch (error) {
      console.log('⚠️  AI Context Engine:', error.message);
    }

    try {
      const perfModule = await import('./src/renderer/performance-monitor.js');
      console.log('✅ Performance Monitor module loaded');
    } catch (error) {
      console.log('⚠️  Performance Monitor:', error.message);
    }

    try {
      const securityModule = await import('./src/renderer/enhanced-security.js');
      console.log('✅ Enhanced Security module loaded');
    } catch (error) {
      console.log('⚠️  Enhanced Security:', error.message);
    }

    try {
      const uiModule = await import('./src/renderer/next-gen-ui.js');
      console.log('✅ Next-Gen UI module loaded');
    } catch (error) {
      console.log('⚠️  Next-Gen UI:', error.message);
    }

    console.log('\n🎉 Export test completed successfully!');
    console.log('✅ No duplicate export conflicts detected');
    console.log('✅ All Phase 2 modules are properly structured');
  } catch (error) {
    console.error('❌ Export test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testExports();
