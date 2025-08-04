#!/usr/bin/env node
/**
 * Generate secure admin password hash for RinaWarp Terminal
 * Simple version with pre-set secure password for easy setup
 */

import bcrypt from 'bcrypt';

async function generateHash() {
  // Use a secure default password - change this in production!
  const defaultPassword = 'RinaWarp2025!Admin';

  console.log('⚠️  IMPORTANT: Change this password after first login!\n');

  const saltRounds = 12; // High security
  const hash = await bcrypt.hash(defaultPassword, saltRounds);

  console.log('✅ Admin password hash generated:');
}

generateHash().catch(error => {
  console.error('❌ Error generating hash:', error);
  process.exit(1);
});
