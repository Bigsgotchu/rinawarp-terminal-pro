import 'dotenv/config';
import { readFileSync } from 'fs';

console.log('🧜‍♀️ RinaWarp Terminal Discord Bot Setup Checker');
console.log('=================================================');
console.log('');

// Check if .env file exists and has correct format
try {
  const envFile = readFileSync('.env', 'utf8');
  console.log('✅ .env file found');
    
  // Check for required environment variables
  const requiredVars = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'];
  let allSet = true;
    
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value === 'your_bot_token_here' || value === 'your_client_id_here' || value === 'your_guild_id_here') {
      console.log(`❌ ${varName} not set or using placeholder value`);
      allSet = false;
    } else {
      console.log(`✅ ${varName} is set (${value.substring(0, 10)}...)`);
    }
  });
    
  if (allSet) {
    console.log('');
    console.log('🎉 All environment variables are set! Your bot is ready to run.');
    console.log('Run: node discord-bot.js');
  } else {
    console.log('');
    console.log('⚠️  Please complete the Discord setup:');
    console.log('1. Go to https://discord.com/developers/applications');
    console.log('2. Create a new application');
    console.log('3. Create a bot and copy the token');
    console.log('4. Update the .env file with your actual values');
    console.log('5. Invite the bot to your server');
  }
    
} catch (error) {
  console.log('❌ .env file not found or not readable');
  console.log('Please make sure the .env file exists in the current directory');
}

console.log('');
console.log('📋 Current directory:', process.cwd());
console.log('📋 Node.js version:', process.version);

// Check if required packages are installed
console.log('');
console.log('📦 Checking packages...');
try {
  await import('discord.js');
  console.log('✅ discord.js is installed');
} catch (error) {
  console.log('❌ discord.js is not installed');
}

try {
  await import('dotenv/config');
  console.log('✅ dotenv is installed');
} catch (error) {
  console.log('❌ dotenv is not installed');
}

console.log('');
console.log('🚀 Setup complete! Ready to create your Discord bot.');
console.log('📖 Check discord-bot-setup.md for detailed instructions.');
