import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } from 'discord.js';

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Bot configuration
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const GUILD_ID = process.env.DISCORD_GUILD_ID || 'YOUR_GUILD_ID_HERE';

// Commands
const commands = [
  new SlashCommandBuilder()
    .setName('beta')
    .setDescription('Get the RinaWarp Terminal beta link'),
    
  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send a beta announcement (Admin only)')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Announcement message')
        .setRequired(true)
    ),
    
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show server statistics'),
    
  new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Submit feedback about RinaWarp Terminal')
    .addStringOption(option =>
      option.setName('feedback')
        .setDescription('Your feedback')
        .setRequired(true)
    ),
    
  new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get a server invite link to share with friends'),
    
  new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Get promotion materials for RinaWarp Terminal (Admin only)')
];

// Register slash commands
async function registerCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
        
    console.log('Started refreshing application (/) commands.');
        
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(command => command.toJSON()) }
    );
        
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// When the client is ready, run this code
client.once('ready', () => {
  console.log(`🧜‍♀️ RinaWarp Bot is ready! Logged in as ${client.user.tag}`);
  client.user.setActivity('🌊 Managing RinaWarp Terminal', { type: 'WATCHING' });
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
    case 'beta':
      const betaEmbed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('🧜‍♀️ RinaWarp Terminal Beta')
        .setDescription('Join the underwater coding revolution!')
        .addFields(
          { name: '🌊 What is RinaWarp Terminal?', value: 'The world\'s first mermaid-themed AI terminal with intelligent coding assistance!' },
          { name: '🆓 Beta Access', value: 'Free access to all premium features during beta' },
          { name: '⚡ Features', value: '• AI Mermaid Assistant\n• Oceanic Themes\n• Wave-Speed Performance\n• Cross-platform Support' }
        )
        .setURL('https://rinawarp-terminal.vercel.app/beta')
        .setFooter({ text: 'Click the link above to join!' })
        .setTimestamp();

      await interaction.reply({ embeds: [betaEmbed] });
      break;

    case 'announce':
      // Check if user has admin permissions
      if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        await interaction.reply({ content: '❌ You need admin permissions to use this command!', ephemeral: true });
        return;
      }

      const message = interaction.options.getString('message');
      const announceEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('📢 RinaWarp Terminal Announcement')
        .setDescription(message)
        .setFooter({ text: 'RinaWarp Terminal Team' })
        .setTimestamp();

      await interaction.reply({ embeds: [announceEmbed] });
      break;

    case 'stats':
      const guild = interaction.guild;
      const statsEmbed = new EmbedBuilder()
        .setColor('#4ecdc4')
        .setTitle('📊 Server Statistics')
        .addFields(
          { name: '👥 Members', value: guild.memberCount.toString(), inline: true },
          { name: '📁 Channels', value: guild.channels.cache.size.toString(), inline: true },
          { name: '🎭 Roles', value: guild.roles.cache.size.toString(), inline: true },
          { name: '🧜‍♀️ Server Created', value: guild.createdAt.toDateString(), inline: false }
        )
        .setThumbnail(guild.iconURL())
        .setTimestamp();

      await interaction.reply({ embeds: [statsEmbed] });
      break;

    case 'feedback':
      const feedback = interaction.options.getString('feedback');
      const feedbackEmbed = new EmbedBuilder()
        .setColor('#95e1d3')
        .setTitle('💬 Feedback Received')
        .setDescription('Thank you for your feedback! We\'ll review it and use it to improve RinaWarp Terminal.')
        .addFields(
          { name: '👤 From', value: interaction.user.tag, inline: true },
          { name: '📝 Feedback', value: feedback, inline: false }
        )
        .setTimestamp();

      // Send to feedback channel (you can set this up)
      const feedbackChannel = interaction.guild.channels.cache.find(channel => channel.name === 'feedback');
      if (feedbackChannel) {
        await feedbackChannel.send({ embeds: [feedbackEmbed] });
      }

      await interaction.reply({ content: '✅ Thank you for your feedback!', ephemeral: true });
      break;

    case 'invite':
      // Create an invite link for the server
      const channel = interaction.guild.channels.cache.find(ch => ch.type === 0); // Find first text channel
                
      if (!channel) {
        await interaction.reply({ content: '❌ Unable to find a text channel to create invite from.', ephemeral: true });
        break;
      }
                
      const invite = await channel.createInvite({
        maxAge: 0, // Never expires
        maxUses: 0, // Unlimited uses
        unique: false
      });
                
      const inviteEmbed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('🧜‍♀️ Invite Friends to RinaWarp Terminal!')
        .setDescription('Share this link to invite friends to our underwater coding community!')
        .addFields(
          { name: '🔗 Server Invite', value: `https://discord.gg/${invite.code}`, inline: false },
          { name: '🌊 What They\'ll Get', value: '• Access to RinaWarp Terminal beta\n• AI coding assistance community\n• Beautiful oceanic themes\n• Developer support' },
          { name: '📱 How to Share', value: 'Copy the invite link above and share it with friends, on social media, or in other communities!' }
        )
        .setFooter({ text: 'Help us grow our underwater coding community!' })
        .setTimestamp();
                
      await interaction.reply({ embeds: [inviteEmbed] });
      break;

    case 'promote':
      // Check if user has admin permissions
      if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        await interaction.reply({ content: '❌ You need admin permissions to use this command!', ephemeral: true });
        return;
      }
                
      const promoteEmbed = new EmbedBuilder()
        .setColor('#4ecdc4')
        .setTitle('🚀 RinaWarp Terminal Promotion Kit')
        .setDescription('Ready-to-use promotion materials for RinaWarp Terminal!')
        .addFields(
          { name: '📱 Social Media Copy', value: '"🧜‍♀️ Join the underwater coding revolution! RinaWarp Terminal - the world\'s first mermaid-themed AI terminal with intelligent coding assistance. Beta now available! #RinaWarp #AI #Terminal"' },
          { name: '🌊 Discord Message', value: 'Hey everyone! 🧜‍♀️ Check out RinaWarp Terminal - a magical AI terminal with oceanic themes and intelligent coding assistance. Free beta access available now!' },
          { name: '🔗 Links to Share', value: '• Beta Page: https://rinawarp-terminal.vercel.app/beta\n• Discord Server: Use `/invite` command\n• GitHub: https://github.com/Bigsgotchu/rinawarp-terminal' },
          { name: '🎯 Target Audience', value: '• Developers & Programmers\n• Terminal enthusiasts\n• AI/ML community\n• Open source contributors\n• Tech students & educators' }
        )
        .setFooter({ text: 'RinaWarp Terminal - Dive into the future of coding!' })
        .setTimestamp();
                
      await interaction.reply({ embeds: [promoteEmbed], ephemeral: true });
      break;

    default:
      await interaction.reply({ content: '❓ Unknown command!', ephemeral: true });
    }
  } catch (error) {
    console.error('Error handling command:', error);
        
    // Check if interaction has already been replied to
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ content: '❌ An error occurred while processing your command.', ephemeral: true });
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }
});

// Handle new members
client.on('guildMemberAdd', member => {
  const welcomeChannel = member.guild.channels.cache.find(channel => channel.name === 'welcome');
  if (welcomeChannel) {
    const welcomeEmbed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('🧜‍♀️ Welcome to RinaWarp Terminal!')
      .setDescription(`Welcome ${member.user.tag} to our underwater coding community!`)
      .addFields(
        { name: '🌊 Get Started', value: 'Use `/beta` to get the beta link' },
        { name: '💬 Need Help?', value: 'Ask questions in our support channels' },
        { name: '🐚 Feedback', value: 'Use `/feedback` to share your thoughts' }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    welcomeChannel.send({ embeds: [welcomeEmbed] });
  }
});

// Login to Discord
if (BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
  client.login(BOT_TOKEN);
  registerCommands();
} else {
  console.log('❌ Please set your Discord bot token in the environment variables or update the script.');
  console.log('📝 You need to set: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID');
}

export default client;
