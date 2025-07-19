# Quick Start: Google Analytics Audience Creation CLI

## 🚀 Get Started in 5 Minutes

### 1. Run Setup
```bash
npm run ga:setup
```

### 2. Set Up Google Cloud Service Account
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable Google Analytics Reporting API and Google Analytics Management API
4. Create Service Account with Analytics Editor permissions
5. Download JSON key file
6. Save as `config/ga-service-account.json`

### 3. Get Your Google Analytics IDs
1. Go to [Google Analytics](https://analytics.google.com/)
2. Click Admin (⚙️) → Note the IDs from each column:
   - Account ID (e.g., `123456789`)
   - Property ID (e.g., `UA-123456789-1` or `G-XXXXXXXXXX`)
   - View ID (e.g., `198765432`)

### 4. Update Environment Variables
Add to your `.env` file:
```env
GA_ACCOUNT_ID=123456789
GA_PROPERTY_ID=UA-123456789-1
GA_VIEW_ID=198765432
GOOGLE_APPLICATION_CREDENTIALS=./config/ga-service-account.json
```

### 5. Test Connection
```bash
npm run ga:test
```

### 6. Create Your First Audience
```bash
npm run ga:create-power-users
```

## Available Commands

### Quick Commands
```bash
npm run ga:audiences          # List existing audiences
npm run ga:templates          # Show available templates
npm run ga:create-power-users      # Create power users audience
npm run ga:create-new-users        # Create new users audience
npm run ga:create-voice-users      # Create voice command users
npm run ga:create-enterprise       # Create enterprise prospects
npm run ga:create-conversion-ready # Create conversion-ready users
```

### Direct Script Usage
```bash
# Show help
node scripts/create-ga-audience.js

# List audiences
node scripts/create-ga-audience.js list

# Create from template
node scripts/create-ga-audience.js create power-users

# Create custom audience
node scripts/create-ga-audience.js create-custom "My Custom Audience" "Description here"

# Delete audience (use with caution)
node scripts/create-ga-audience.js delete AUDIENCE_ID
```

## Troubleshooting

### "Missing environment variables"
- Check your `.env` file has the correct GA IDs
- Verify no typos in variable names

### "Failed to initialize Google Analytics API"
- Ensure service account JSON file exists at `config/ga-service-account.json`
- Check the service account has proper permissions

### "HTTP 403: Forbidden"
- Add service account email to your GA property with Editor role:
  1. GA Admin → Property → Property Access Management
  2. Add service account email with "Editor" permissions

### "Audience creation failed"
- Verify your GA property supports remarketing audiences
- Ensure you have sufficient permissions
- Check audience definition is valid

## What Each Audience Template Does

- **Power Users**: Users with 10+ sessions and 5+ AI interactions
- **New Users**: Users with <3 sessions and <7 days since first visit
- **Voice Users**: Users who have used voice commands
- **Enterprise Prospects**: Heavy users (20+ sessions, 15+ features used)
- **Conversion Ready**: Active users likely to upgrade (5+ sessions, tried premium features)

## Next Steps

Once audiences are created, you can:
1. Use them for Google Ads remarketing campaigns
2. Create targeted email campaigns
3. Analyze user behavior patterns
4. Set up automated alerts for audience changes

For detailed documentation, see `docs/GOOGLE_ANALYTICS_AUDIENCES.md`
