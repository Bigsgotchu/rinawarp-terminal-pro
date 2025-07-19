# Google Analytics Audience Creation CLI Tool

This document provides comprehensive instructions for creating and managing Google Analytics audiences programmatically using our CLI tool.

## Overview

The Google Analytics Audience Creator allows you to:
- Create custom audiences based on user behavior
- Use predefined templates for common user segments
- List and manage existing audiences
- Integrate with Google Analytics Management API

## Prerequisites

1. **Google Analytics Account**: You need a Google Analytics account with admin access
2. **Google Cloud Console Access**: For creating service account credentials
3. **Node.js**: Version 20 or higher
4. **googleapis Package**: Will be installed automatically by the setup script

## Quick Start

### 1. Run Initial Setup

```bash
npm run ga:setup
```

This command will:
- Check for required dependencies
- Guide you through credential setup
- Create the necessary directory structure
- Display your next steps

### 2. Set Up Service Account Authentication

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Analytics Reporting API and Google Analytics Management API
4. Go to IAM & Admin > Service Accounts
5. Create a new service account with the following permissions:
   - Google Analytics Edit
   - Google Analytics Manage Users
6. Download the JSON key file
7. Save it as `config/ga-service-account.json`

### 3. Get Your Google Analytics IDs

1. Go to [Google Analytics](https://analytics.google.com/)
2. Navigate to Admin (gear icon)
3. Note down:
   - **Account ID**: Found in the Account column
   - **Property ID**: Found in the Property column (UA-XXXXXX-X or G-XXXXXXXXXX)
   - **View ID**: Found in the View column

### 4. Configure Environment Variables

Update your `.env` file with the following:

```env
# Google Analytics Configuration
GA_ACCOUNT_ID=123456789
GA_PROPERTY_ID=UA-123456789-1
GA_VIEW_ID=198765432
GOOGLE_APPLICATION_CREDENTIALS=./config/ga-service-account.json
```

### 5. Test the Connection

```bash
npm run ga:test
```

## Available Commands

### Setup and Testing
```bash
npm run ga:setup        # Run initial setup
npm run ga:test         # Test API connection
```

### Audience Management
```bash
npm run ga:audiences    # List existing audiences
npm run ga:templates    # Show available templates
```

### Create Predefined Audiences
```bash
npm run ga:create-power-users       # Create power users audience
npm run ga:create-new-users         # Create new users audience
npm run ga:create-voice-users       # Create voice command users audience
npm run ga:create-enterprise        # Create enterprise prospects audience
npm run ga:create-conversion-ready  # Create conversion-ready users audience
```

### Direct Script Usage

For more advanced usage, you can run the scripts directly:

```bash
# List all available templates
node scripts/create-ga-audience.js templates

# Create a specific audience
node scripts/create-ga-audience.js create power-users

# Create custom audience with specific name and description
node scripts/create-ga-audience.js create-custom "High Value Users" "Users with premium behavior patterns"

# Delete an audience (use with caution)
node scripts/create-ga-audience.js delete AUDIENCE_ID
```

## Predefined Audience Templates

### 1. Power Users (`power-users`)
- **Name**: RinaWarp Power Users
- **Description**: Users who frequently use advanced terminal features
- **Criteria**: 
  - More than 10 sessions
  - More than 5 AI usage events

### 2. New Users (`new-users`)
- **Name**: RinaWarp New Users
- **Description**: Users who recently started using the terminal
- **Criteria**: 
  - Less than 3 sessions
  - Less than 7 days since first session

### 3. Voice Users (`voice-users`)
- **Name**: Voice Command Users
- **Description**: Users who actively use voice commands
- **Criteria**: 
  - At least 1 voice command event

### 4. Enterprise Prospects (`enterprise-prospects`)
- **Name**: Enterprise Prospects
- **Description**: Users showing enterprise-level usage patterns
- **Criteria**: 
  - More than 20 sessions
  - More than 15 feature usage events

### 5. Conversion Ready (`conversion-ready`)
- **Name**: Conversion Ready Users
- **Description**: Users likely to convert to paid plans
- **Criteria**: 
  - More than 5 sessions
  - More than 3 premium feature attempt events

## Creating Custom Audiences

To create completely custom audiences, you can modify the script or create new templates:

1. Edit `scripts/create-ga-audience.js`
2. Add new templates to the `audienceTemplates` object
3. Define custom conditions based on your analytics events

### Example Custom Template

```javascript
'custom-segment': {
  name: 'Custom User Segment',
  description: 'Users matching specific criteria',
  conditions: {
    sessions: { operator: 'GREATER_THAN', value: 15 },
    events: { eventName: 'custom_event', operator: 'GREATER_THAN', value: 10 }
  }
}
```

## Supported Condition Types

### Session-based Conditions
- `sessions`: Number of user sessions
- `daysSinceFirstSession`: Days since user's first session

### Event-based Conditions
- `events`: Specific event occurrences with event name

### Operators
- `GREATER_THAN`: Greater than specified value
- `LESS_THAN`: Less than specified value
- `EQUAL`: Equal to specified value
- `EXACT`: Exact match (for dimensions)

## Troubleshooting

### Common Issues

1. **"Missing environment variables"**
   - Ensure GA_ACCOUNT_ID, GA_PROPERTY_ID, and GA_VIEW_ID are set
   - Check your .env file formatting

2. **"Failed to initialize Google Analytics API"**
   - Verify your service account JSON file exists at the correct path
   - Ensure the service account has proper permissions
   - Check that the APIs are enabled in Google Cloud Console

3. **"HTTP 403: Forbidden"**
   - Add your service account email to your GA property with "Edit" permissions
   - Go to GA Admin > Property > Property Access Management
   - Add the service account email with "Editor" role

4. **"Audience creation failed"**
   - Ensure your GA property supports remarketing audiences
   - Check that you have sufficient permissions
   - Verify the audience definition is valid

### Service Account Permissions

Your service account needs these Google Analytics permissions:
- **Edit**: Required for creating and modifying audiences
- **Collaborate**: For accessing audience data
- **Read & Analyze**: For listing existing audiences

## Advanced Usage

### Batch Audience Creation

You can create multiple audiences at once:

```bash
#!/bin/bash
npm run ga:create-power-users
npm run ga:create-new-users  
npm run ga:create-voice-users
npm run ga:create-enterprise
npm run ga:create-conversion-ready
```

### Integration with Marketing Automation

Once audiences are created, you can:
1. Export them to Google Ads for remarketing
2. Use them for targeted email campaigns
3. Create custom reports based on audience segments
4. Set up automated alerts for audience size changes

### Monitoring Audience Performance

```bash
# Check current audiences
npm run ga:audiences

# Monitor audience size and changes
node scripts/create-ga-audience.js list | grep "Members:"
```

## Security Considerations

1. **Service Account Key**: Keep your service account JSON file secure
2. **Environment Variables**: Never commit .env files to version control
3. **Access Control**: Limit service account permissions to minimum required
4. **Regular Rotation**: Rotate service account keys periodically

## API Limits and Best Practices

- **Rate Limiting**: Google Analytics Management API has daily quotas
- **Batch Operations**: Create audiences in batches rather than individually
- **Error Handling**: Always check for API errors and implement retry logic
- **Monitoring**: Set up alerts for failed audience creation attempts

## Support and Resources

- [Google Analytics Management API Documentation](https://developers.google.com/analytics/devguides/config/mgmt/v3)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Analytics Help Center](https://support.google.com/analytics/)

For project-specific issues, check the logs or create an issue in the repository.
