#!/usr/bin/env node

const mailchimp = require('@mailchimp/mailchimp_marketing');
const { program } = require('commander');
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

// CLI Configuration
program
  .version('1.0.0')
  .description('RinaWarp Terminal - Mailchimp Contact Management CLI');

// Global variables
let config = {};
const configPath = path.join(__dirname, '..', '.mailchimp-config.json');

// Load configuration
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.apiKey && config.serverPrefix) {
        mailchimp.setConfig({
          apiKey: config.apiKey,
          server: config.serverPrefix
        });
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ Error loading config:', error.message);
    return false;
  }
}

// Save configuration
function saveConfig(apiKey, serverPrefix) {
  config = { apiKey, serverPrefix };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Setup command
program
  .command('setup')
  .description('Setup Mailchimp API credentials')
  .option('-k, --api-key <key>', 'Mailchimp API key')
  .option('-s, --server <prefix>', 'Server prefix (e.g., us1, us2)')
  .action(async (options) => {
    console.log('🔧 Setting up Mailchimp CLI...\n');
    
    let apiKey = options.apiKey;
    let serverPrefix = options.server;
    
    // Interactive setup if not provided
    if (!apiKey || !serverPrefix) {
      console.log('📝 Get your API key from: https://mailchimp.com/help/about-api-keys/');
      console.log('📝 Server prefix is in your API key (e.g., if key ends with "-us1", server is "us1")');
      console.log('\n⚠️  Run: mailchimp-cli setup -k YOUR_API_KEY -s SERVER_PREFIX\n');
      process.exit(1);
    }
    
    // Validate API key format
    if (!apiKey.includes('-')) {
      console.error('❌ Invalid API key format. Should contain server prefix (e.g., abc123-us1)');
      process.exit(1);
    }
    
    // Extract server prefix if not provided
    if (!serverPrefix) {
      serverPrefix = apiKey.split('-').pop();
    }
    
    saveConfig(apiKey, serverPrefix);
    
    try {
      mailchimp.setConfig({
        apiKey: apiKey,
        server: serverPrefix
      });
      
      // Test the connection
      const response = await mailchimp.ping.get();
      console.log('✅ Successfully connected to Mailchimp!');
      console.log('📊 Health status:', response.health_status);
      console.log('🔑 Config saved to:', configPath);
    } catch (error) {
      console.error('❌ Failed to connect to Mailchimp:', error.message);
      process.exit(1);
    }
  });

// List audiences command
program
  .command('audiences')
  .description('List all audiences')
  .action(async () => {
    if (!loadConfig()) {
      console.error('❌ Please run "mailchimp-cli setup" first');
      process.exit(1);
    }
    
    try {
      const response = await mailchimp.lists.getAllLists();
      console.log('📋 Your Mailchimp Audiences:\n');
      
      response.lists.forEach((list, index) => {
        console.log(`${index + 1}. ${list.name}`);
        console.log(`   ID: ${list.id}`);
        console.log(`   Members: ${list.stats.member_count}`);
        console.log(`   Created: ${new Date(list.date_created).toLocaleDateString()}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Error fetching audiences:', error.message);
      process.exit(1);
    }
  });

// Create audience command
program
  .command('create-audience')
  .description('Create a new audience for RinaWarp Terminal')
  .option('-n, --name <name>', 'Audience name', 'RinaWarp Terminal Users & Prospects')
  .option('-e, --email <email>', 'From email address', 'hello@rinawarptech.com')
  .option('-f, --from-name <name>', 'From name', 'RinaWarp Terminal')
  .action(async (options) => {
    if (!loadConfig()) {
      console.error('❌ Please run "mailchimp-cli setup" first');
      process.exit(1);
    }
    
    try {
      const audienceData = {
        name: options.name,
        contact: {
          company: 'RinaWarp Technologies',
          address1: '',
          city: '',
          state: '',
          zip: '',
          country: 'US'
        },
        permission_reminder: 'You subscribed to receive updates about RinaWarp Terminal.',
        campaign_defaults: {
          from_name: options.fromName,
          from_email: options.email,
          subject: 'RinaWarp Terminal Update',
          language: 'en'
        },
        email_type_option: true
      };
      
      const response = await mailchimp.lists.createList(audienceData);
      console.log('✅ Audience created successfully!');
      console.log('📋 Audience ID:', response.id);
      console.log('📧 Name:', response.name);
      
      // Save audience ID for future use
      config.audienceId = response.id;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
    } catch (error) {
      console.error('❌ Error creating audience:', error.message);
      process.exit(1);
    }
  });

// Import contacts command
program
  .command('import-contacts')
  .description('Import contacts from CSV file')
  .option('-f, --file <path>', 'CSV file path', './marketing/master-contacts-for-mailchimp.csv')
  .option('-a, --audience-id <id>', 'Audience ID (optional if saved)')
  .action(async (options) => {
    if (!loadConfig()) {
      console.error('❌ Please run "mailchimp-cli setup" first');
      process.exit(1);
    }
    
    const audienceId = options.audienceId || config.audienceId;
    if (!audienceId) {
      console.error('❌ Please provide audience ID or create an audience first');
      process.exit(1);
    }
    
    if (!fs.existsSync(options.file)) {
      console.error('❌ CSV file not found:', options.file);
      process.exit(1);
    }
    
    console.log('📤 Importing contacts from:', options.file);
    console.log('📋 Target audience ID:', audienceId);
    
    const contacts = [];
    
    // Read CSV file
    fs.createReadStream(options.file)
      .pipe(csv())
      .on('data', (row) => {
        if (row.email) {
          const contact = {
            email_address: row.email,
            status: 'subscribed',
            merge_fields: {
              FNAME: row.first_name || '',
              LNAME: row.last_name || ''
            },
            tags: []
          };
          
          // Add merge fields
          if (row.company) contact.merge_fields.COMPANY = row.company;
          if (row.job_title) contact.merge_fields.JOB_TITLE = row.job_title;
          
          // Add tags based on data
          if (row.source) contact.tags.push(`source-${row.source}`);
          if (row.interest_level) contact.tags.push(`interest-${row.interest_level}`);
          if (row.user_type) contact.tags.push(`type-${row.user_type}`);
          if (row.company_size) contact.tags.push(`company-${row.company_size}`);
          
          contacts.push(contact);
        }
      })
      .on('end', async () => {
        console.log(`📊 Found ${contacts.length} contacts to import`);
        
        try {
          // Import in batches of 500 (Mailchimp limit)
          const batchSize = 500;
          let imported = 0;
          let errors = 0;
          
          for (let i = 0; i < contacts.length; i += batchSize) {
            const batch = contacts.slice(i, i + batchSize);
            console.log(`⏳ Importing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(contacts.length/batchSize)}...`);
            
            try {
              const response = await mailchimp.lists.batchListMembers(audienceId, {
                members: batch,
                update_existing: true
              });
              
              imported += response.new_members.length + response.updated_members.length;
              errors += response.errors.length;
              
              if (response.errors.length > 0) {
                console.log('⚠️  Some errors occurred:');
                response.errors.forEach(error => {
                  console.log(`   - ${error.email_address}: ${error.error}`);
                });
              }
              
              // Wait between batches to respect rate limits
              if (i + batchSize < contacts.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              
            } catch (batchError) {
              console.error(`❌ Batch error:`, batchError.message);
              errors += batch.length;
            }
          }
          
          console.log('\n✅ Import completed!');
          console.log(`📊 Successfully imported/updated: ${imported} contacts`);
          console.log(`❌ Errors: ${errors} contacts`);
          
        } catch (error) {
          console.error('❌ Import failed:', error.message);
          process.exit(1);
        }
      });
  });

// List contacts command  
program
  .command('list-contacts')
  .description('List contacts in an audience')
  .option('-a, --audience-id <id>', 'Audience ID')
  .option('-l, --limit <number>', 'Number of contacts to show', '10')
  .action(async (options) => {
    if (!loadConfig()) {
      console.error('❌ Please run "mailchimp-cli setup" first');
      process.exit(1);
    }
    
    const audienceId = options.audienceId || config.audienceId;
    if (!audienceId) {
      console.error('❌ Please provide audience ID');
      process.exit(1);
    }
    
    try {
      const response = await mailchimp.lists.getListMembersInfo(audienceId, {
        count: parseInt(options.limit),
        offset: 0
      });
      
      console.log(`📋 Contacts in audience (showing ${response.members.length} of ${response.total_items}):\n`);
      
      response.members.forEach((member, index) => {
        console.log(`${index + 1}. ${member.merge_fields.FNAME} ${member.merge_fields.LNAME}`);
        console.log(`   Email: ${member.email_address}`);
        console.log(`   Status: ${member.status}`);
        console.log(`   Joined: ${new Date(member.timestamp_signup).toLocaleDateString()}`);
        if (member.tags && member.tags.length > 0) {
          console.log(`   Tags: ${member.tags.map(tag => tag.name).join(', ')}`);
        }
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Error fetching contacts:', error.message);
      process.exit(1);
    }
  });

// Add tags command
program
  .command('add-tags')
  .description('Add tags to contacts based on CSV data')
  .option('-a, --audience-id <id>', 'Audience ID')
  .option('-t, --tags <tags>', 'Comma-separated tags to add')
  .option('-e, --emails <emails>', 'Comma-separated emails to tag')
  .action(async (options) => {
    if (!loadConfig()) {
      console.error('❌ Please run "mailchimp-cli setup" first');
      process.exit(1);
    }
    
    const audienceId = options.audienceId || config.audienceId;
    if (!audienceId || !options.tags) {
      console.error('❌ Please provide audience ID and tags');
      process.exit(1);
    }
    
    const tags = options.tags.split(',').map(tag => tag.trim());
    const emails = options.emails ? options.emails.split(',').map(email => email.trim()) : [];
    
    try {
      if (emails.length > 0) {
        // Tag specific emails
        for (const email of emails) {
          await mailchimp.lists.updateListMemberTags(audienceId, email, {
            tags: tags.map(tag => ({ name: tag, status: 'active' }))
          });
        }
        console.log(`✅ Tagged ${emails.length} contacts with: ${tags.join(', ')}`);
      } else {
        console.log('❌ Please provide emails to tag with -e option');
      }
      
    } catch (error) {
      console.error('❌ Error adding tags:', error.message);
      process.exit(1);
    }
  });

// Create campaign command
program
  .command('create-campaign')
  .description('Create an email campaign')
  .option('-a, --audience-id <id>', 'Audience ID')
  .option('-s, --subject <subject>', 'Email subject')
  .option('-t, --title <title>', 'Campaign title')
  .option('-f, --from-name <name>', 'From name', 'RinaWarp Terminal')
  .option('-e, --from-email <email>', 'From email', 'hello@rinawarptech.com')
  .action(async (options) => {
    if (!loadConfig()) {
      console.error('❌ Please run "mailchimp-cli setup" first');
      process.exit(1);
    }
    
    const audienceId = options.audienceId || config.audienceId;
    if (!audienceId || !options.subject || !options.title) {
      console.error('❌ Please provide audience ID, subject, and title');
      process.exit(1);
    }
    
    try {
      const campaignData = {
        type: 'regular',
        recipients: {
          list_id: audienceId
        },
        settings: {
          subject_line: options.subject,
          title: options.title,
          from_name: options.fromName,
          reply_to: options.fromEmail
        }
      };
      
      const response = await mailchimp.campaigns.create(campaignData);
      console.log('✅ Campaign created successfully!');
      console.log('📧 Campaign ID:', response.id);
      console.log('📋 Title:', response.settings.title);
      console.log('📝 Subject:', response.settings.subject_line);
      
    } catch (error) {
      console.error('❌ Error creating campaign:', error.message);
      process.exit(1);
    }
  });

// Export contacts command
program
  .command('export-contacts')
  .description('Export contacts to CSV file')
  .option('-a, --audience-id <id>', 'Audience ID')
  .option('-o, --output <file>', 'Output CSV file', './exports/mailchimp-contacts.csv')
  .action(async (options) => {
    if (!loadConfig()) {
      console.error('❌ Please run "mailchimp-cli setup" first');
      process.exit(1);
    }
    
    const audienceId = options.audienceId || config.audienceId;
    if (!audienceId) {
      console.error('❌ Please provide audience ID');
      process.exit(1);
    }
    
    try {
      // Create output directory
      const outputDir = path.dirname(options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      console.log('📤 Exporting contacts...');
      
      const allMembers = [];
      let offset = 0;
      const count = 1000;
      
      while (true) {
        const response = await mailchimp.lists.getListMembersInfo(audienceId, {
          count: count,
          offset: offset
        });
        
        allMembers.push(...response.members);
        offset += count;
        
        console.log(`📊 Fetched ${allMembers.length} of ${response.total_items} contacts...`);
        
        if (response.members.length < count) {
          break;
        }
      }
      
      // Convert to CSV format
      const csvWriter = createCsvWriter({
        path: options.output,
        header: [
          { id: 'email', title: 'email' },
          { id: 'first_name', title: 'first_name' },
          { id: 'last_name', title: 'last_name' },
          { id: 'status', title: 'status' },
          { id: 'company', title: 'company' },
          { id: 'job_title', title: 'job_title' },
          { id: 'signup_date', title: 'signup_date' },
          { id: 'tags', title: 'tags' }
        ]
      });
      
      const csvData = allMembers.map(member => ({
        email: member.email_address,
        first_name: member.merge_fields.FNAME || '',
        last_name: member.merge_fields.LNAME || '',
        status: member.status,
        company: member.merge_fields.COMPANY || '',
        job_title: member.merge_fields.JOB_TITLE || '',
        signup_date: member.timestamp_signup ? new Date(member.timestamp_signup).toISOString().split('T')[0] : '',
        tags: member.tags ? member.tags.map(tag => tag.name).join(';') : ''
      }));
      
      await csvWriter.writeRecords(csvData);
      
      console.log('✅ Export completed!');
      console.log('📁 File saved:', options.output);
      console.log('📊 Total contacts exported:', csvData.length);
      
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      process.exit(1);
    }
  });

// Help command
program
  .command('help')
  .description('Show detailed help and examples')
  .action(() => {
    console.log('🚀 RinaWarp Terminal - Mailchimp CLI Help\n');
    console.log('📋 Quick Start:');
    console.log('1. mailchimp-cli setup -k YOUR_API_KEY -s us1');
    console.log('2. mailchimp-cli create-audience');
    console.log('3. mailchimp-cli import-contacts -f ./marketing/master-contacts-for-mailchimp.csv');
    console.log('4. mailchimp-cli list-contacts\n');
    
    console.log('📧 Campaign Management:');
    console.log('• mailchimp-cli create-campaign -s "Launch Day!" -t "RinaWarp Launch"');
    console.log('• mailchimp-cli add-tags -t "launch-supporter,engaged-high" -e "user@example.com"\n');
    
    console.log('📊 Data Management:');
    console.log('• mailchimp-cli export-contacts -o ./exports/current-subscribers.csv');
    console.log('• mailchimp-cli audiences (list all audiences)\n');
    
    console.log('🔧 Configuration:');
    console.log('• API Key: Get from https://mailchimp.com/help/about-api-keys/');
    console.log('• Server Prefix: Last part of your API key (e.g., us1, us2)');
    console.log('• Config stored in: .mailchimp-config.json\n');
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
