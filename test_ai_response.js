#!/usr/bin/env node

/**
 * Quick test to verify AI responses are working
 */

import { OllamaClient } from './src/ai-assistant/core/ollama-client.js';

async function testAI() {
  console.log('🧪 Testing AI Response System');
  console.log('='.repeat(40));

  try {
    const client = new OllamaClient();

    // Test connection
    console.log('🔗 Testing connection to Ollama...');
    const connection = await client.testConnection();
    console.log('✅ Connected successfully!');
    console.log(`📊 Available models: ${connection.models.join(', ')}`);

    // Test simple response
    console.log('\n🤖 Testing simple AI response...');
    const prompt = 'Explain what Node.js is in one sentence.';
    console.log(`❓ Question: ${prompt}`);

    const startTime = Date.now();
    const response = await client.generateResponse(prompt, {
      model: 'deepseek-coder:1.3b',
      temperature: 0.7,
    });
    const endTime = Date.now();

    console.log('\n💡 AI Response:');
    console.log('-'.repeat(40));
    console.log(response);
    console.log('-'.repeat(40));
    console.log(`⚡ Response time: ${endTime - startTime}ms`);

    // Test code generation
    console.log('\n💻 Testing code generation...');
    const codePrompt = 'Generate a simple JavaScript function that adds two numbers.';
    console.log(`❓ Request: ${codePrompt}`);

    const startTime2 = Date.now();
    const codeResponse = await client.generateResponse(codePrompt, {
      model: 'deepseek-coder:1.3b',
      temperature: 0.3,
    });
    const endTime2 = Date.now();

    console.log('\n📝 Generated Code:');
    console.log('-'.repeat(40));
    console.log(codeResponse);
    console.log('-'.repeat(40));
    console.log(`⚡ Response time: ${endTime2 - startTime2}ms`);

    console.log('\n✨ All tests passed! Your AI is ready to use.');
    console.log('🚀 Try the interactive shell: node ai_testing_shell.js');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('• Make sure Ollama is running: ollama serve');
    console.log('• Check available models: ollama list');
    console.log('• Install DeepSeek Coder: ollama pull deepseek-coder:1.3b');
  }
}

testAI();
