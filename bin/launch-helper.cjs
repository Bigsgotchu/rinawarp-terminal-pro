#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs');
const { execSync } = require('child_process');

program
  .version('1.0.0')
  .description('RinaWarp Terminal Launch Helper CLI');

// Generate social media posts
program
  .command('generate-posts')
  .description('Generate social media post templates')
  .action(() => {
    console.log('🚀 SOCIAL MEDIA POST GENERATOR');
    console.log('===============================\n');

    const posts = {
      linkedin: `🚀 LAUNCH DAY! 

After months of development, I'm thrilled to announce RinaWarp Terminal is now live!

🎯 What it does:
• AI-powered terminal with voice commands
• Intelligent automation for developers
• Transforms how you interact with your terminal

💡 Why I built it:
Every developer knows the frustration of repetitive terminal tasks. RinaWarp changes that with AI that understands your intent.

🔗 Free download: https://rinawarptech.com

Special thanks to everyone who provided feedback during development. This is just the beginning!

#AI #Developer #Terminal #Launch #Innovation #Startup`,

      twitter: [
        "🚀 LAUNCH DAY! RinaWarp Terminal is now live! \n\nAI-powered terminal that understands voice commands and automates your workflow. \n\n✨ Free download: https://rinawarptech.com \n\n🧵 Thread about the journey... 1/4",
        "2/4 What makes RinaWarp special:\n• Voice-to-command translation\n• Context-aware automation  \n• Cross-platform compatibility\n• Built for developers who want to code at the speed of thought",
        "3/4 Why I built this:\n\nTired of typing the same git commands? Frustrated with remembering complex syntax? \n\nRinaWarp Terminal bridges the gap between what you want to do and how to do it.",
        "4/4 This is just the beginning! \n\nNext up: Advanced AI integrations, team features, plugin ecosystem.\n\nTry it out and let me know what you think! 🙏\n\nhttps://rinawarptech.com"
      ],

      reddit: `**[LAUNCH] RinaWarp Terminal - AI-powered terminal with voice commands**

Hey r/programming! 

Just launched my AI terminal app after months of development. It brings voice commands and intelligent automation to your terminal workflow.

**Key features:**
• Voice-to-command translation
• Context-aware automation
• Cross-platform compatibility (macOS, Windows, Linux)
• Smart project understanding

**Free download:** https://rinawarptech.com

Would love feedback from fellow developers! Any suggestions for features or improvements?

Built this because I was tired of repetitive terminal tasks. RinaWarp understands your intent and helps you work faster.

What do you think? Does this solve a pain point for you?`,

      discord: `Hey everyone! 👋

Just launched my side project - RinaWarp Terminal! 🚀

It's an AI-powered terminal that understands voice commands and automates repetitive tasks. Think of it as having an AI assistant for your command line.

Free download: https://rinawarptech.com

Would love your feedback if anyone wants to try it out! Built it because I got tired of typing the same git/npm/docker commands over and over.

Features:
• Voice commands → terminal actions  
• Smart automation suggestions
• Cross-platform support

Still early days but excited to share with the dev community! 🎉`
    };

    // Save posts to files
    fs.writeFileSync('./marketing/generated-linkedin-post.txt', posts.linkedin);
    fs.writeFileSync('./marketing/generated-twitter-thread.txt', posts.twitter.join('\n\n'));
    fs.writeFileSync('./marketing/generated-reddit-post.txt', posts.reddit);
    fs.writeFileSync('./marketing/generated-discord-post.txt', posts.discord);

    console.log('✅ LinkedIn post saved to: marketing/generated-linkedin-post.txt');
    console.log('✅ Twitter thread saved to: marketing/generated-twitter-thread.txt');
    console.log('✅ Reddit post saved to: marketing/generated-reddit-post.txt');
    console.log('✅ Discord post saved to: marketing/generated-discord-post.txt\n');

    console.log('📱 Quick Actions:');
    console.log('• Copy LinkedIn post and paste to LinkedIn');
    console.log('• Copy Twitter thread and post as thread');
    console.log('• Share Reddit post in r/SideProject, r/programming');
    console.log('• Share Discord post in dev communities\n');
  });

// Quick contact adder
program
  .command('add-contact')
  .description('Quickly add a contact and import to Mailchimp')
  .option('-e, --email <email>', 'Contact email')
  .option('-n, --name <name>', 'Contact name')
  .option('-s, --source <source>', 'Contact source', 'manual')
  .option('-l, --level <level>', 'Interest level', 'medium')
  .option('-t, --type <type>', 'User type', 'developer')
  .action(async (options) => {
    if (!options.email || !options.name) {
      console.error('❌ Please provide email and name');
      console.log('Usage: launch-helper add-contact -e "user@example.com" -n "John Doe"');
      process.exit(1);
    }

    const [firstName, ...lastNameParts] = options.name.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    const contactCsv = `email,first_name,last_name,source,interest_level,user_type,company_size
${options.email},${firstName},${lastName},${options.source},${options.level},${options.type},startup`;

    // Save to temp file
    const tempFile = './temp-contact.csv';
    fs.writeFileSync(tempFile, contactCsv);

    console.log(`📝 Adding contact: ${options.name} (${options.email})`);

    try {
      execSync(`./mailchimp-cli import-contacts -f ${tempFile}`, { stdio: 'inherit' });
      fs.unlinkSync(tempFile); // Clean up
      
      // Tag the contact
      execSync(`./mailchimp-cli add-tags -t "source-${options.source},type-${options.type},interest-${options.level}" -e "${options.email}"`, { stdio: 'inherit' });
      
      console.log('✅ Contact added and tagged successfully!');
    } catch (error) {
      console.error('❌ Error adding contact:', error.message);
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  });

// Launch progress tracker
program
  .command('track')
  .description('Track launch progress and show next actions')
  .action(async () => {
    console.log('🚀 LAUNCH PROGRESS TRACKER');
    console.log('==========================\n');

    try {
      // Get current subscriber count
      const audienceOutput = execSync('./mailchimp-cli audiences', { encoding: 'utf8' });
      const memberMatch = audienceOutput.match(/Members: (\d+)/);
      const currentMembers = memberMatch ? parseInt(memberMatch[1]) : 0;

      console.log(`📊 Current Subscribers: ${currentMembers}`);
      
      // Calculate progress
      const targets = {
        hour1: 10,
        hour6: 25, 
        day1: 50
      };

      console.log(`🎯 Progress toward goals:`);
      console.log(`   Hour 1 target (10): ${Math.min(100, Math.round(currentMembers/targets.hour1 * 100))}% (${currentMembers}/${targets.hour1})`);
      console.log(`   Hour 6 target (25): ${Math.min(100, Math.round(currentMembers/targets.hour6 * 100))}% (${currentMembers}/${targets.hour6})`);
      console.log(`   Day 1 target (50): ${Math.min(100, Math.round(currentMembers/targets.day1 * 100))}% (${currentMembers}/${targets.day1})\n`);

      // Show next actions based on progress
      if (currentMembers < 5) {
        console.log('⚡ PRIORITY ACTIONS:');
        console.log('1. Text 3 developer friends RIGHT NOW');
        console.log('2. Post on LinkedIn (highest conversion)');
        console.log('3. Share in Discord communities you\'re active in\n');
      } else if (currentMembers < 15) {
        console.log('🔥 KEEP THE MOMENTUM:');
        console.log('1. Twitter thread about your launch');
        console.log('2. Reddit posts in r/SideProject, r/programming');
        console.log('3. Email your professional network\n');
      } else if (currentMembers < 30) {
        console.log('🌟 SCALING UP:');
        console.log('1. Send launch email to current subscribers');
        console.log('2. Ask early users to share with friends');
        console.log('3. Post in more specialized communities\n');
      } else {
        console.log('🎉 AMAZING PROGRESS!');
        console.log('1. Send thank you email to early supporters');
        console.log('2. Collect feedback and testimonials');
        console.log('3. Plan follow-up campaigns\n');
      }

      // Export current contacts
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
      execSync(`./mailchimp-cli export-contacts -o "./analytics/progress-${timestamp}.csv"`, { stdio: 'pipe' });
      console.log(`💾 Progress snapshot saved to analytics/progress-${timestamp}.csv`);

    } catch (error) {
      console.error('❌ Error tracking progress:', error.message);
    }
  });

// Bulk contact importer from simple format
program
  .command('bulk-add')
  .description('Add multiple contacts from a simple text file')
  .option('-f, --file <file>', 'File with contacts (email,name per line)')
  .action(async (options) => {
    if (!options.file) {
      console.error('❌ Please provide a file with contacts');
      console.log('File format: email,name per line');
      console.log('Example: john@example.com,John Doe');
      process.exit(1);
    }

    if (!fs.existsSync(options.file)) {
      console.error(`❌ File not found: ${options.file}`);
      process.exit(1);
    }

    console.log(`📂 Reading contacts from: ${options.file}`);

    try {
      const content = fs.readFileSync(options.file, 'utf8');
      const lines = content.trim().split('\n');
      
      let csvContent = 'email,first_name,last_name,source,interest_level,user_type,company_size\n';
      
      lines.forEach(line => {
        const [email, name] = line.split(',').map(s => s.trim());
        if (email && name) {
          const [firstName, ...lastNameParts] = name.split(' ');
          const lastName = lastNameParts.join(' ') || '';
          csvContent += `${email},${firstName},${lastName},personal-network,medium,developer,startup\n`;
        }
      });

      const tempFile = './temp-bulk-contacts.csv';
      fs.writeFileSync(tempFile, csvContent);

      console.log(`📊 Found ${lines.length} contacts to import`);
      
      execSync(`./mailchimp-cli import-contacts -f ${tempFile}`, { stdio: 'inherit' });
      fs.unlinkSync(tempFile);

      console.log('✅ Bulk import completed!');
      
    } catch (error) {
      console.error('❌ Error with bulk import:', error.message);
    }
  });

// Open launch materials
program
  .command('open-materials')
  .description('Open all launch materials for easy copying')
  .action(() => {
    console.log('📂 Opening launch materials...\n');
    
    try {
      execSync('open ./marketing/generated-linkedin-post.txt', { stdio: 'pipe' });
      execSync('open ./marketing/generated-twitter-thread.txt', { stdio: 'pipe' });
      execSync('open ./LAUNCH-NOW-CHECKLIST.md', { stdio: 'pipe' });
      
      console.log('✅ Launch materials opened in text editor');
      console.log('📋 Copy and paste to social media platforms');
    } catch (error) {
      console.log('📁 Files available at:');
      console.log('• marketing/generated-linkedin-post.txt');
      console.log('• marketing/generated-twitter-thread.txt');
      console.log('• LAUNCH-NOW-CHECKLIST.md');
    }
  });

// Show quick stats
program
  .command('stats')
  .description('Show quick launch statistics')
  .action(async () => {
    console.log('📊 LAUNCH STATISTICS');
    console.log('====================\n');

    try {
      // Subscriber count
      const audienceOutput = execSync('./mailchimp-cli audiences', { encoding: 'utf8' });
      const memberMatch = audienceOutput.match(/Members: (\d+)/);
      const currentMembers = memberMatch ? parseInt(memberMatch[1]) : 0;

      // List recent contacts
      const contactsOutput = execSync('./mailchimp-cli list-contacts -l 5', { encoding: 'utf8' });
      
      console.log(`📈 Total Subscribers: ${currentMembers}`);
      console.log(`🚀 Launch Day Goal: 50 subscribers`);
      console.log(`📊 Progress: ${Math.round(currentMembers/50 * 100)}%\n`);
      
      console.log('👥 Recent Contacts:');
      console.log(contactsOutput.split('\n').slice(2, -1).join('\n'));

    } catch (error) {
      console.error('❌ Error getting stats:', error.message);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  console.log('🚀 RinaWarp Terminal Launch Helper');
  console.log('==================================\n');
  console.log('Quick Commands:');
  console.log('• launch-helper generate-posts    - Create social media posts');
  console.log('• launch-helper track            - Check launch progress');
  console.log('• launch-helper add-contact      - Add single contact');
  console.log('• launch-helper bulk-add         - Add multiple contacts');
  console.log('• launch-helper stats            - Show quick statistics');
  console.log('• launch-helper open-materials   - Open launch templates\n');
  console.log('For detailed help: launch-helper --help');
}
