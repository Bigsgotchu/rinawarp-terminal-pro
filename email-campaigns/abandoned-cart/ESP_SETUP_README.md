# Email Campaign ESP Integration & Monitoring Setup

## 🚀 Quick Start Guide

This guide will help you connect your optimized abandoned cart email campaign to your Email Service Provider (ESP) and set up performance monitoring.

## 📧 Step 1: Configure Your ESP

### Option A: SendGrid
1. Get your API key from [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
2. Copy `esp_config_template.json` to `esp_config.json`
3. Update with your credentials:
```json
{
  "provider": "sendgrid",
  "credentials": {
    "api_key": "SG.your-actual-api-key-here",
    "webhook_url": "https://your-domain.com/webhooks"
  }
}
```

### Option B: Mailgun
1. Get your API key from [Mailgun Dashboard](https://app.mailgun.com/app/account/security/api_keys)
2. Update `esp_config.json`:
```json
{
  "provider": "mailgun",
  "credentials": {
    "api_key": "key-your-actual-key-here",
    "domain": "mg.your-domain.com",
    "webhook_url": "https://your-domain.com/webhooks"
  }
}
```

### Option C: AWS SES
1. Get credentials from AWS IAM console
2. Update `esp_config.json`:
```json
{
  "provider": "aws_ses",
  "credentials": {
    "access_key_id": "AKIA...",
    "secret_access_key": "your-secret-key",
    "region": "us-east-1",
    "webhook_url": "https://your-domain.com/webhooks"
  }
}
```

### Option D: SMTP (Gmail, Outlook, etc.)
1. Enable 2FA and create app password
2. Update `esp_config.json`:
```json
{
  "provider": "smtp",
  "credentials": {
    "host": "smtp.gmail.com",
    "port": "587",
    "username": "your-email@gmail.com",
    "password": "your-app-password",
    "webhook_url": "https://your-domain.com/webhooks"
  }
}
```

## 📊 Step 2: Set Up Webhook Tracking

### Local Development
```bash
# Install Flask if needed
pip install flask requests

# Start webhook handler
python webhook_handler.py
```

### Production Deployment
Deploy `webhook_handler.py` to your server (Heroku, AWS, etc.) and update the webhook URL in your ESP config.

Example with ngrok for testing:
```bash
# Install ngrok
brew install ngrok  # macOS

# Expose local webhook handler
ngrok http 5000

# Update esp_config.json with ngrok URL
# "webhook_url": "https://abc123.ngrok.io/webhooks"
```

## 🚀 Step 3: Deploy Email Campaign

```bash
# Deploy with real ESP (emails will be sent!)
./deploy-optimized-campaign.py
```

## 📈 Step 4: Monitor Performance

### Real-time Dashboard
```bash
# In terminal 1: Start webhook handler
python webhook_handler.py

# In terminal 2: Start performance monitor
python monitor_performance.py
```

### Web Dashboard
Open `ab-testing-dashboard.html` in your browser for visual analytics.

### API Endpoints
- **Campaign Metrics**: `GET http://localhost:5000/metrics/rinawarp-cart-recovery-optimized-001`
- **Real-time Events**: `GET http://localhost:5000/report/realtime`
- **Track Conversion**: `POST http://localhost:5000/track/conversion`

## 📋 Step 5: Scale Gradually

### Enable Soft Launch
Edit `optimized-campaign-config.json`:
```json
"testing": {
  "enable_soft_launch": true,
  "soft_launch_percent": 10,  // Start with 10%
  "monitor_duration_hours": 48
}
```

### Scaling Schedule
1. **10% (Day 1-2)**: Monitor key metrics
2. **25% (Day 3-4)**: If performance is good
3. **50% (Day 5-6)**: Continue monitoring
4. **100% (Day 7+)**: Full deployment

## 🔧 Troubleshooting

### Emails Not Sending
- Check ESP credentials in `esp_config.json`
- Verify ESP account is active and has sending credits
- Check deployment log: `deployment-log.json`

### Tracking Not Working
- Ensure webhook handler is running
- Check webhook URL is accessible from internet
- Verify tracking pixel and links are properly formatted

### Database Errors
- Delete `email_tracking.db` and restart webhook handler
- Check SQLite is installed: `sqlite3 --version`

## 📊 Key Metrics to Monitor

1. **Open Rate**: Target 20-30% for abandoned cart
2. **Click Rate**: Target 2-5% of sent emails
3. **Conversion Rate**: Target 10-15% of opens
4. **Revenue per Email**: Track ROI

## 🛡️ Security Best Practices

1. **Never commit `esp_config.json`** - Add to `.gitignore`
2. **Use environment variables** in production:
   ```bash
   export ESP_PROVIDER=sendgrid
   export ESP_API_KEY=your-key-here
   ```
3. **Secure webhook endpoints** with authentication
4. **Rate limit** API endpoints to prevent abuse

## 📞 Support

- ESP Documentation:
  - [SendGrid Docs](https://docs.sendgrid.com/)
  - [Mailgun Docs](https://documentation.mailgun.com/)
  - [AWS SES Docs](https://docs.aws.amazon.com/ses/)
  
- Common Issues:
  - Spam folder: Add SPF/DKIM records
  - Bounces: Clean email list regularly
  - Low engagement: A/B test subject lines

## 🎯 Next Steps

1. Set up domain authentication (SPF, DKIM, DMARC)
2. Create customer segments based on behavior
3. Implement dynamic product recommendations
4. Set up automated win-back campaigns
5. Integrate with your e-commerce platform

---

Remember: Start small, monitor closely, and scale based on performance data!
