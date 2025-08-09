import 'dotenv/config';
import { readFileSync } from 'fs';

// Check if .env file exists and has correct format
try {
  const _envFile = readFileSync('.env', 'utf8');
  console.log('✅ .env file found');

  // Check for required environment variables
  const requiredVars = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'];
  let allSet = true;

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (
      !value ||
      value === 'your_bot_token_here' ||
      value === 'your_client_id_here' ||
      value === 'your_guild_id_here'
    ) {
      console.log(`❌ ${varName} not set or using placeholder value`);
      allSet = false;
    } else {
      console.log(`✅ ${varName} is set (${value.substring(0, 10)}...)`);
    }
  });

  if (allSet) {
  } else {
    console.log('⚠️  Please complete the Discord setup:');
  }
} catch (error) {
  console.log('❌ .env file not found or not readable');
}

// Check if required packages are installed
try {
  await import('discord.js');
  console.log('✅ discord.js is installed');
} catch (error) {}

try {
  await import('dotenv/config');
  console.log('✅ dotenv is installed');
} catch (error) {}
