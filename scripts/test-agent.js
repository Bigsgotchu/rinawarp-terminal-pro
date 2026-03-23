#!/usr/bin/env node

/**
 * Test script for RinaWarp Terminal Pro Agent
 * 
 * Tests the real GPT-5.1 agent executor with various commands
 */

const { RealAgentExecutor } = require('../dist/electron/agentd/real-executor');
const path = require('path');

async function testAgent() {
  console.log('🧪 Testing RinaWarp Terminal Pro Agent\n');
  
  const executor = new RealAgentExecutor();
  await executor.initialize();
  
  const tests = [
    {
      name: 'Self-Check',
      prompt: 'Run a self-check to verify my environment',
      id: 'test-self-check',
    },
    {
      name: 'Build Detection',
      prompt: 'Detect what build system I have and show me how to build',
      id: 'test-build-detect',
    },
    {
      name: 'Code Generation',
      prompt: 'Generate a simple Hello World function in TypeScript',
      id: 'test-code-gen',
    },
  ];
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Test: ${test.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Prompt: "${test.prompt}"\n`);
    
    const receipts = [];
    
    try {
      const result = await executor.execute({
        id: test.id,
        prompt: test.prompt,
        mode: 'local',
        onReceipt: (receipt) => {
          receipts.push(receipt);
          console.log(`📄 Receipt: ${receipt.action} - ${receipt.status}`);
        },
        onProgress: (progress) => {
          console.log(`⚡ Progress: ${progress}`);
        },
      });
      
      console.log(`\n✅ Success`);
      console.log(`\n📤 Output:\n${result.output}`);
      console.log(`\n🧾 Receipts: ${receipts.length}`);
      
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
    }
  }
  
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('🎉 Testing Complete');
  console.log(`${'='.repeat(60)}\n`);
  
  // Get diagnostics
  const diag = await executor.diagnostic();
  console.log('📊 Diagnostics:');
  console.log(JSON.stringify(diag, null, 2));
}

// Run tests
testAgent().catch(console.error);
