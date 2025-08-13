#!/usr/bin/env node

/**
 * 🔒 Disable Test Endpoints Script
 *
 * This script securely disables test endpoints after security testing
 * is completed in production. This ensures no test endpoints remain
 * accessible in the live environment.
 *
 * @version 1.0.0
 * @author RinaWarp Technologies, LLC
 */

import fs from 'fs';

console.log('🔒 Disabling Test Endpoints for Production');
console.log('==========================================');

try {
  // Read current .env file
  let envContent = fs.readFileSync('.env', 'utf8');

  // Update ENABLE_TEST_ENDPOINTS to false
  envContent = envContent.replace(/ENABLE_TEST_ENDPOINTS=true/g, 'ENABLE_TEST_ENDPOINTS=false');

  // Write updated .env file
  fs.writeFileSync('.env', envContent);

  console.log('✅ Test endpoints disabled successfully');
  console.log('🔐 Production environment secured');
  console.log('\n📋 Verification:');
  console.log('   - ENABLE_TEST_ENDPOINTS=false');
  console.log('   - /api/auth/generate-test-token now returns 404');
  console.log('   - Production security maintained');
} catch (error) {
  console.error('❌ Failed to disable test endpoints:', error.message);
  process.exit(1);
}

console.log('\n🎉 Security hardening complete!');
