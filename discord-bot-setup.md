# 🧜‍♀️ RinaWarp Discord Bot Setup Guide

## 🚀 Quick Start

This bot is **Discord-approved** and safe to use! It helps manage your RinaWarp Terminal server with commands like `/beta`, `/announce`, `/stats`, and `/feedback`.

## 📋 Prerequisites

- Node.js installed ✅ (You already have this)
- Discord.js installed ✅ (Just installed)
- A Discord server where you have admin permissions

## 🔧 Setup Steps

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "RinaWarp Terminal Bot"
4. Click "Create"

### 2. Create a Bot

1. Go to the "Bot" section in your application
2. Click "Add Bot"
3. Copy the **Bot Token** (keep this secret!)
4. Enable these bot permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Read Message History
   - Manage Messages (optional)

### 3. Get Your IDs

**Client ID:**
- Go to "General Information" tab
- Copy the "Application ID"

**Guild ID (Server ID):**
- In Discord, right-click your server name
- Click "Copy Server ID" (enable Developer Mode if needed)

### 4. Set Environment Variables

Create a `.env` file in your project directory:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here
```

### 5. Invite Bot to Server

1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot` and `applications.commands`
3. Select permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`
4. Copy the generated URL and visit it
5. Select your server and authorize

### 6. Run the Bot

```bash
node discord-bot.js
```

## 🎮 Available Commands

### `/beta`
- Shows beautiful embed with beta link
- Perfect for promoting your terminal

### `/announce <message>`
- Admin-only command
- Sends styled announcements

### `/stats`
- Shows server statistics
- Member count, channels, roles, etc.

### `/feedback <feedback>`
- Collects user feedback
- Sends to feedback channel

## 🏗️ Server Setup Recommendations

Create these channels for best experience:
- `#welcome` - For new member welcomes
- `#announcements` - For bot announcements
- `#feedback` - For feedback collection
- `#beta-testing` - For beta discussions
- `#support` - For help and questions

## 🛠️ Advanced Features

### Auto-Welcome Messages
- Automatically welcomes new members
- Provides helpful getting-started info

### Feedback System
- Collects and organizes user feedback
- Helps improve your terminal

### Statistics Tracking
- Monitor server growth
- Track engagement

## 🔒 Security Notes

- Never share your bot token publicly
- Use environment variables for sensitive data
- This bot follows Discord's Terms of Service
- No user account automation (which is banned)

## 🚨 Alternative CLI Tools (Safe Options)

### 2. Discord Webhooks
```bash
# Send messages via webhook (no bot needed)
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content": "🧜‍♀️ New beta update available!"}'
```

### 3. Discord API Direct
```bash
# Using curl with Discord API
curl -X POST "https://discord.com/api/v10/channels/CHANNEL_ID/messages" \
  -H "Authorization: Bot YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from CLI!"}'
```

## 🎯 Growing Your Server

1. **Engage regularly** with your bot commands
2. **Share the beta link** frequently using `/beta`
3. **Post updates** using `/announce`
4. **Collect feedback** to improve your terminal
5. **Monitor stats** to track growth

## 🆘 Troubleshooting

**Bot not responding?**
- Check if bot token is correct
- Ensure bot has proper permissions
- Verify bot is online in Discord

**Commands not showing?**
- Wait up to 1 hour for slash commands to sync
- Check if bot has `applications.commands` scope

**Need help?**
- Check Discord.js documentation
- Join Discord.js support server
- Review bot permissions

## 📈 Next Steps

1. Set up your Discord server
2. Configure the bot with your tokens
3. Run the bot and test commands
4. Start promoting your beta!
5. Monitor growth and engagement

Your Discord bot is now ready to help grow your RinaWarp Terminal community! 🌊
