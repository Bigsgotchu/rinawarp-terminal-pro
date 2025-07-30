#!/usr/bin/env node
/**
 * Generate secure admin password hash for RinaWarp Terminal
 * Simple version with pre-set secure password for easy setup
 */

import bcrypt from 'bcrypt';

async function generateHash() {
  console.log('🔐 RinaWarp Terminal Admin Password Hash Generator\n');
  
  // Use a secure default password - change this in production!
  const defaultPassword = 'RinaWarp2025!Admin';
  
  console.log('🔄 Generating secure hash for default admin password...');
  console.log('📝 Default password: RinaWarp2025!Admin');
  console.log('⚠️  IMPORTANT: Change this password after first login!\n');
  
  const saltRounds = 12; // High security
  const hash = await bcrypt.hash(defaultPassword, saltRounds);
  
  console.log('✅ Admin password hash generated:');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('\n📝 Add this to your .env file:');
  console.log('---');
  console.log(`ADMIN_EMAIL=admin@rinawarptech.com`);
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('---');
  console.log('\n🔒 Login credentials for testing:');
  console.log('   Email: admin@rinawarptech.com');
  console.log('   Password: RinaWarp2025!Admin');
  console.log('\n⚠️  Remember to change this password in production!');
}

generateHash().catch(error => {
  console.error('❌ Error generating hash:', error);
  process.exit(1);
});
