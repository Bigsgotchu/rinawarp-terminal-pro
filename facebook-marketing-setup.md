# Facebook Marketing API CLI Setup Guide

## 🚀 Installation Complete!

Your Facebook Marketing API CLI is now installed and ready to use.

## 📋 Quick Start

### 1. Get Your Access Token

To use the Facebook Marketing API, you need an access token:

1. Go to [Facebook Developers Console](https://developers.facebook.com/)
2. Create an app or use an existing one
3. Add the **Marketing API** product to your app
4. Generate a User Access Token with these permissions:
   - `ads_management`
   - `ads_read`
   - `pages_read_engagement`
   - `pages_manage_posts` (if you want to post to pages)

### 2. Find Your Ad Account ID

1. Go to [Facebook Ads Manager](https://business.facebook.com/adsmanager/)
2. Look at the URL or account switcher for your Ad Account ID
3. It will be a number like `123456789` (the CLI will automatically add `act_` prefix)

### 3. Setup Your CLI

```bash
# Setup with access token only (will show available ad accounts)
./fb-marketing setup YOUR_ACCESS_TOKEN

# Setup with access token and ad account ID
./fb-marketing setup YOUR_ACCESS_TOKEN 123456789
```

## 🎯 Usage Examples

```bash
# List all campaigns
./fb-marketing campaigns

# List all ad sets
./fb-marketing adsets

# List ad sets for a specific campaign
./fb-marketing adsets CAMPAIGN_ID

# Get campaign insights for last 7 days
./fb-marketing insights CAMPAIGN_ID campaign last_7_days

# Get account insights for last 30 days
./fb-marketing insights act_123456789 account last_30_days

# List your Facebook pages
./fb-marketing pages

# Show help
./fb-marketing help
```

## 📊 Available Metrics

The CLI provides these key performance metrics:
- **Spend**: Total amount spent
- **Impressions**: Number of times ads were shown
- **Clicks**: Number of clicks on ads
- **Reach**: Number of unique people who saw ads
- **CTR**: Click-through rate (%)
- **CPC**: Cost per click ($)
- **CPM**: Cost per thousand impressions ($)

## 🔐 Security

- Your access token is stored securely in `~/.facebook-marketing-config.json`
- Never share your access token with others
- Use short-lived tokens when possible
- Regenerate tokens regularly for security

## 🆘 Troubleshooting

### Common Issues:

1. **"Invalid access token"**
   - Make sure your token hasn't expired
   - Verify the token has the correct permissions

2. **"Ad account not found"**
   - Check your ad account ID is correct
   - Ensure you have access to the ad account

3. **"No data available"**
   - The date range might not have any data
   - Try a different date range (last_30_days, yesterday, etc.)

### Getting Help:

Run `./fb-marketing help` to see all available commands and examples.

## 📈 Advanced Usage

You can extend this CLI by modifying `facebook-marketing-cli.cjs` to add:
- Campaign creation/editing
- Ad creation/editing
- Audience management
- Creative management
- Automated reporting
- Budget optimization

Happy marketing! 🎉
