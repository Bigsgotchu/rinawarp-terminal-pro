# Mailchimp CLI Setup Guide
## RinaWarp Terminal Contact Management

### 🚀 Quick Start (5 Minutes)

You now have a powerful CLI tool to manage your Mailchimp contacts directly from the terminal!

## 1. Get Your Mailchimp API Key

1. Log into your Mailchimp account
2. Go to **Account > Extras > API Keys**
3. Create a new API key
4. Copy the key (looks like: `abc123def456-us1`)

## 2. Setup the CLI

```bash
# Setup with your API key
./mailchimp-cli setup -k YOUR_API_KEY -s us1

# The server prefix (us1, us2, etc.) is usually at the end of your API key
```

## 3. Create Your Audience

```bash
# Create the main RinaWarp Terminal audience
./mailchimp-cli create-audience

# Or with custom settings
./mailchimp-cli create-audience -n "RinaWarp Terminal Users" -e "hello@rinawarptech.com"
```

## 4. Import Your Contacts

```bash
# Import from your prepared CSV file
./mailchimp-cli import-contacts -f ./marketing/master-contacts-for-mailchimp.csv

# Check the import worked
./mailchimp-cli list-contacts -l 20
```

## 🎯 Essential Commands

### Contact Management
```bash
# List all your audiences
./mailchimp-cli audiences

# View contacts (default shows 10)
./mailchimp-cli list-contacts
./mailchimp-cli list-contacts -l 50

# Export contacts to CSV
./mailchimp-cli export-contacts -o ./exports/backup-contacts.csv

# Add tags to specific contacts
./mailchimp-cli add-tags -t "launch-supporter,engaged-high" -e "user@example.com,friend@example.com"
```

### Campaign Management
```bash
# Create a campaign
./mailchimp-cli create-campaign -s "🚀 RinaWarp Terminal Launch Day!" -t "Launch Announcement"

# Get detailed help with examples
./mailchimp-cli help
```

## 📊 Complete Launch Workflow

### Step 1: Initial Setup (1 time)
```bash
./mailchimp-cli setup -k YOUR_API_KEY -s us1
./mailchimp-cli create-audience
```

### Step 2: Import Your Contacts
```bash
# First, edit your CSV with real contacts
# Then import
./mailchimp-cli import-contacts

# Verify import
./mailchimp-cli list-contacts -l 20
```

### Step 3: Organize with Tags
```bash
# Tag your VIP contacts (existing subscribers + high interest)
./mailchimp-cli add-tags -t "vip-early-supporters,launch-priority" -e "existing1@example.com,john@example.com"

# Tag your personal network
./mailchimp-cli add-tags -t "personal-network,high-conversion" -e "jane@example.com,mike@example.com"

# Tag beta interested users
./mailchimp-cli add-tags -t "beta-interested,engaged-high" -e "alex@example.com,taylor@example.com"
```

### Step 4: Launch Campaign
```bash
# Create launch campaign
./mailchimp-cli create-campaign -s "🚀 RinaWarp Terminal is Live!" -t "Launch Day Announcement"

# Export contacts for analysis
./mailchimp-cli export-contacts -o ./exports/pre-launch-contacts.csv
```

## 🔧 Advanced Usage

### Batch Contact Operations
```bash
# Export contacts, modify in spreadsheet, then re-import
./mailchimp-cli export-contacts -o ./temp/current-contacts.csv

# Edit the CSV file to add new columns or update data
# Then re-import (updates existing, adds new)
./mailchimp-cli import-contacts -f ./temp/updated-contacts.csv
```

### Monitoring & Analytics
```bash
# Regularly export for tracking growth
./mailchimp-cli export-contacts -o "./exports/contacts-$(date +%Y-%m-%d).csv"

# Check subscriber count across all audiences
./mailchimp-cli audiences
```

## 📈 Pro Tips

### Contact Quality Management
- **Export weekly** to track growth and engagement
- **Tag strategically** - use consistent naming (source-*, type-*, interest-*)
- **Segment for campaigns** - create targeted lists based on tags

### Automation Integration
```bash
# Add to your daily routine
echo "alias mc='./mailchimp-cli'" >> ~/.zshrc

# Quick contact count
alias mc-count='./mailchimp-cli list-contacts -l 1 | grep "of"'

# Quick export backup
alias mc-backup='./mailchimp-cli export-contacts -o "./backups/contacts-$(date +%Y-%m-%d).csv"'
```

### Launch Day Commands
```bash
# Morning of launch - check subscriber count
./mailchimp-cli audiences

# Create launch campaign
./mailchimp-cli create-campaign -s "🎉 RinaWarp Terminal Launch Day - Your AI Terminal is Here!" -t "Official Launch"

# After launch - export for analysis
./mailchimp-cli export-contacts -o "./analytics/launch-day-subscribers.csv"

# Tag launch day signups
./mailchimp-cli add-tags -t "launch-day,organic-signup" -e "newuser1@example.com,newuser2@example.com"
```

## 🚨 Troubleshooting

### Common Issues

**"Please run mailchimp-cli setup first"**
- You need to configure your API credentials first
- Run: `./mailchimp-cli setup -k YOUR_API_KEY -s us1`

**"CSV file not found"**
- Check the file path: `ls -la ./marketing/master-contacts-for-mailchimp.csv`
- Use absolute path if needed: `-f /full/path/to/file.csv`

**"Invalid API key format"**
- API key should contain a dash and server prefix: `abc123-us1`
- Get a new key from Mailchimp Account > API Keys

**"Batch import errors"**
- Check CSV format matches expected columns
- Remove any special characters from email addresses
- Ensure CSV is properly formatted (no extra commas, quotes)

### Rate Limits
- Mailchimp limits to 500 contacts per batch
- CLI automatically handles batching and rate limiting
- Large imports may take several minutes

## 🎯 Success Metrics to Track

After setup, use these commands to monitor success:

```bash
# Weekly growth check
./mailchimp-cli audiences | grep "Members:"

# Export for detailed analysis
./mailchimp-cli export-contacts -o "./analytics/weekly-$(date +%Y-%m-%d).csv"

# Track campaign performance (use Mailchimp web interface for detailed analytics)
```

### Target Numbers
- **Week 1**: 50+ subscribers
- **Month 1**: 100+ subscribers
- **Open Rate**: 25%+ (industry standard)
- **Click Rate**: 5%+ (industry standard)

## 🔐 Security Notes

- **API Key Storage**: Keys are stored in `.mailchimp-config.json` (excluded from git)
- **Backup**: Regularly export contacts to avoid data loss
- **Permissions**: CLI uses standard Mailchimp API permissions

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Run `./mailchimp-cli help` for examples
3. Verify API key is correct and active
4. Check Mailchimp API status

**Ready to build your email list like a pro!** 🚀

Your CLI tool is now ready to help you grow from 4 subscribers to 50+ engaged contacts for your RinaWarp Terminal launch!
