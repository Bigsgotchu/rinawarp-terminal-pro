# Email Service Provider Integration Guide

## Overview

This guide covers setting up and configuring email service provider integrations for the RinaWarp email template system. We support multiple providers to ensure reliability and flexibility.

## Supported Providers

### 1. SendGrid (Recommended)
- **Best for**: High-volume campaigns, advanced analytics
- **Pricing**: Free tier: 100 emails/day, Paid: $14.95/month for 40,000 emails
- **Features**: Advanced analytics, A/B testing, IP warming

### 2. Mailchimp
- **Best for**: Marketing campaigns, audience segmentation
- **Pricing**: Free tier: 500 contacts, Paid: $13/month for 500 contacts
- **Features**: Marketing automation, audience insights, landing pages

### 3. Amazon SES
- **Best for**: Large-scale transactional emails, cost-effective
- **Pricing**: $0.10 per 1,000 emails sent
- **Features**: High deliverability, AWS integration, scalable

### 4. Custom SMTP
- **Best for**: Existing infrastructure, specific requirements
- **Pricing**: Depends on provider
- **Features**: Full control, custom configuration

## Configuration Setup

### SendGrid Integration

1. **Create SendGrid Account**:
   ```bash
   # Sign up at https://sendgrid.com
   # Verify domain and set up authentication
   ```

2. **Generate API Key**:
   ```bash
   # Go to Settings > API Keys
   # Create new API key with full access
   # Store securely in environment variables
   ```

3. **Configuration**:
   ```json
   {
     "provider": "sendgrid",
     "apiKey": "SG.your-api-key-here",
     "fromEmail": "noreply@rinawarptech.com",
     "fromName": "RinaWarp Team",
     "replyTo": "support@rinawarptech.com",
     "trackingSettings": {
       "clickTracking": true,
       "openTracking": true,
       "subscriptionTracking": true
     },
     "templates": {
       "welcome": "d-1234567890abcdef",
       "update": "d-abcdef1234567890",
       "reminder": "d-567890abcdef1234"
     }
   }
   ```

4. **Setup Script**:
   ```javascript
   // integrations/sendgrid-setup.js
   const sgMail = require('@sendgrid/mail');
   
   function setupSendGrid(config) {
     sgMail.setApiKey(config.apiKey);
     
     // Set up IP warming
     sgMail.setIpPool('warming_pool');
     
     // Configure tracking
     sgMail.setTrackingSettings(config.trackingSettings);
     
     return sgMail;
   }
   ```

### Mailchimp Integration

1. **Create Mailchimp Account**:
   ```bash
   # Sign up at https://mailchimp.com
   # Set up audience and segments
   ```

2. **Generate API Key**:
   ```bash
   # Go to Account > Extras > API Keys
   # Create new API key
   ```

3. **Configuration**:
   ```json
   {
     "provider": "mailchimp",
     "apiKey": "your-api-key-here",
     "server": "us1",
     "listId": "your-list-id",
     "fromEmail": "noreply@rinawarptech.com",
     "fromName": "RinaWarp Team",
     "segments": {
       "developers": "segment-id-1",
       "early_adopters": "segment-id-2",
       "enterprise": "segment-id-3"
     }
   }
   ```

4. **Setup Script**:
   ```javascript
   // integrations/mailchimp-setup.js
   const mailchimp = require('@mailchimp/mailchimp_marketing');
   
   function setupMailchimp(config) {
     mailchimp.setConfig({
       apiKey: config.apiKey,
       server: config.server,
     });
     
     return mailchimp;
   }
   ```

### Amazon SES Integration

1. **Setup AWS Account**:
   ```bash
   # Create AWS account
   # Set up SES in desired region
   # Verify domain and email addresses
   ```

2. **Configuration**:
   ```json
   {
     "provider": "ses",
     "region": "us-east-1",
     "accessKeyId": "your-access-key",
     "secretAccessKey": "your-secret-key",
     "fromEmail": "noreply@rinawarptech.com",
     "fromName": "RinaWarp Team",
     "configurationSet": "rinawarp-config-set"
   }
   ```

3. **Setup Script**:
   ```javascript
   // integrations/ses-setup.js
   const AWS = require('aws-sdk');
   
   function setupSES(config) {
     const ses = new AWS.SES({
       region: config.region,
       accessKeyId: config.accessKeyId,
       secretAccessKey: config.secretAccessKey
     });
     
     return ses;
   }
   ```

## Integration Scripts

### Universal Email Sender

```javascript
// integrations/email-sender.js
const sendgridSender = require('./sendgrid-setup');
const mailchimpSender = require('./mailchimp-setup');
const sesSender = require('./ses-setup');

class EmailSender {
  constructor(config) {
    this.config = config;
    this.provider = this.initializeProvider(config.provider);
  }

  initializeProvider(providerName) {
    switch (providerName) {
      case 'sendgrid':
        return sendgridSender(this.config);
      case 'mailchimp':
        return mailchimpSender(this.config);
      case 'ses':
        return sesSender(this.config);
      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  async sendEmail(templateType, recipient, personalizations = {}) {
    const template = this.getTemplate(templateType);
    
    try {
      const result = await this.provider.send({
        to: recipient.email,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName
        },
        templateId: template.id,
        dynamicTemplateData: {
          ...personalizations,
          recipient_name: recipient.name,
          unsubscribe_url: this.generateUnsubscribeUrl(recipient.id)
        }
      });

      return {
        success: true,
        messageId: result.messageId,
        provider: this.config.provider
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: this.config.provider
      };
    }
  }

  getTemplate(templateType) {
    const templates = {
      welcome: {
        id: this.config.templates.welcome,
        subject: 'Welcome to RinaWarp Terminal Beta!'
      },
      update: {
        id: this.config.templates.update,
        subject: 'RinaWarp Terminal Update Available'
      },
      reminder: {
        id: this.config.templates.reminder,
        subject: 'Don\'t miss out on RinaWarp Terminal Beta'
      }
    };

    return templates[templateType] || templates.welcome;
  }

  generateUnsubscribeUrl(recipientId) {
    return `https://rinawarptech.com/unsubscribe?id=${recipientId}`;
  }
}

module.exports = EmailSender;
```

## Environment Configuration

Create a `.env` file for secure credential storage:

```bash
# .env
SENDGRID_API_KEY=SG.your-sendgrid-api-key
MAILCHIMP_API_KEY=your-mailchimp-api-key
MAILCHIMP_SERVER=us1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Email settings
FROM_EMAIL=noreply@rinawarptech.com
FROM_NAME=RinaWarp Team
REPLY_TO=support@rinawarptech.com

# Tracking
TRACKING_DOMAIN=track.rinawarptech.com
UNSUBSCRIBE_URL=https://rinawarptech.com/unsubscribe
```

## Testing Configuration

```javascript
// tests/email-integration.test.js
const EmailSender = require('../integrations/email-sender');
const config = require('../integrations/config.json');

describe('Email Provider Integration', () => {
  let emailSender;

  beforeEach(() => {
    emailSender = new EmailSender(config);
  });

  test('should send welcome email via SendGrid', async () => {
    const result = await emailSender.sendEmail('welcome', {
      email: 'test@example.com',
      name: 'Test User',
      id: 'test-123'
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('sendgrid');
  });

  test('should handle provider errors gracefully', async () => {
    // Mock provider failure
    const result = await emailSender.sendEmail('welcome', {
      email: 'invalid-email',
      name: 'Test User',
      id: 'test-123'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## Best Practices

### 1. Provider Selection
- **SendGrid**: Best for high-volume, technical teams
- **Mailchimp**: Best for marketing-focused campaigns
- **Amazon SES**: Best for cost-effective, large-scale sending
- **Custom SMTP**: Best for specific infrastructure requirements

### 2. Security
- Store API keys in environment variables
- Use least-privilege access principles
- Rotate keys regularly
- Monitor API usage and rate limits

### 3. Deliverability
- Implement SPF, DKIM, and DMARC records
- Use dedicated IP addresses for high volume
- Monitor bounce rates and feedback loops
- Maintain clean email lists

### 4. Monitoring
- Track delivery rates by provider
- Monitor open and click-through rates
- Set up alerts for delivery failures
- Regular performance reviews

## Troubleshooting

### Common Issues

1. **API Key Invalid**:
   ```bash
   # Check API key format and permissions
   # Verify key hasn't expired
   # Test with provider's API documentation
   ```

2. **Domain Not Verified**:
   ```bash
   # Complete domain verification process
   # Check DNS records are properly configured
   # Wait for propagation (up to 72 hours)
   ```

3. **Rate Limiting**:
   ```bash
   # Implement exponential backoff
   # Spread sending across time
   # Upgrade to higher tier if needed
   ```

## Migration Guide

### Switching Providers

1. **Backup Current Configuration**:
   ```bash
   cp integrations/config.json integrations/config.backup.json
   ```

2. **Update Configuration**:
   ```json
   {
     "provider": "new-provider",
     "fallback": "current-provider",
     "migration": {
       "enabled": true,
       "percentage": 10
     }
   }
   ```

3. **Gradual Migration**:
   ```javascript
   // Implement canary deployment
   const shouldUseMigration = Math.random() < config.migration.percentage;
   const provider = shouldUseMigration ? config.provider : config.fallback;
   ```

---

*Last updated: January 2025*
*Next review: April 2025*
