# Google Cloud Monitoring Setup for RinaWarp Terminal

This directory contains the Google Cloud Monitoring integration for RinaWarp Terminal, providing comprehensive monitoring, metrics collection, and alerting capabilities.

## 🚀 Quick Start

### 1. Install Dependencies

The required Google Cloud client libraries are already installed:
- `@google-cloud/monitoring` - For metrics and alerting
- `@google-cloud/logging` - For log management

### 2. Set Up Google Cloud Project

Run the automated setup script:

```bash
npm run setup:monitoring
```

Or follow the manual setup instructions:

```bash
npm run setup:monitoring:manual
```

### 3. Configure Environment Variables

Copy and update the monitoring configuration:

```bash
cp .env.monitoring.template .env.monitoring
```

Update the following variables in `.env.monitoring`:

```env
GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id
GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-service-account-key.json
GCP_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
```

### 4. Test the Setup

```bash
npm run test:monitoring
```

## 📊 Components

### Configuration Module (`config/gcp-monitoring-config.js`)

Centralizes Google Cloud Monitoring setup and authentication:

- **Environment validation**: Checks for required environment variables
- **Client initialization**: Sets up Monitoring and Logging clients
- **Connection testing**: Verifies connectivity to Google Cloud services
- **Health checks**: Provides monitoring service status

### Metrics Service (`metrics-service.js`)

Handles custom metric creation and data collection:

- **Default metrics**: Creates standard metrics for terminal monitoring
- **Buffer management**: Handles offline metric buffering
- **Metric recording**: Provides convenient methods for metric collection
- **Command tracking**: Categorizes and tracks command execution

### Alert Manager (`alert-manager.js`)

Manages alert policies and notification channels:

- **Alert policies**: Creates and manages alerting rules
- **Notification channels**: Sets up email, webhook, and other notifications
- **Threshold monitoring**: Monitors metrics against defined thresholds
- **Auto-recovery**: Handles alert policy updates and management

## 📈 Default Metrics

The system automatically creates and tracks these metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `rinawarp/terminal/active_sessions` | GAUGE | Number of active terminal sessions |
| `rinawarp/terminal/commands_executed` | CUMULATIVE | Total commands executed |
| `rinawarp/terminal/memory_usage` | GAUGE | Memory usage in MB |
| `rinawarp/terminal/cpu_usage` | GAUGE | CPU usage percentage |
| `rinawarp/terminal/errors` | CUMULATIVE | Number of terminal errors |
| `rinawarp/ai/requests` | CUMULATIVE | AI assistance requests |
| `rinawarp/ai/response_time` | GAUGE | AI response time in milliseconds |

## 🚨 Default Alerts

The system creates these alert policies:

- **High Memory Usage**: Triggers when memory usage > 80% for 5 minutes
- **High CPU Usage**: Triggers when CPU usage > 85% for 5 minutes
- **Terminal Errors Spike**: Triggers when error rate > 10/minute
- **AI Response Time High**: Triggers when AI response time > 5 seconds

## 🔧 Usage Examples

### Recording Metrics

```javascript
import metricsService from './metrics-service.js';

// Record a command execution
await metricsService.recordCommandExecution('git status', true);

// Record system metrics
await metricsService.recordSystemMetrics(512, 75); // 512MB memory, 75% CPU

// Record an AI request
await metricsService.recordAIRequest('code_completion', 1500); // 1.5 second response
```

### Creating Custom Metrics

```javascript
import monitoringConfig from './config/gcp-monitoring-config.js';

await monitoringConfig.createCustomMetric(
  'rinawarp/custom/feature_usage',
  'Feature Usage',
  'Tracks usage of custom features',
  'CUMULATIVE',
  'INT64'
);
```

### Managing Alerts

```javascript
import alertManager from './alert-manager.js';

// Create email notification
await alertManager.createEmailNotificationChannel(
  'admin@yourcompany.com',
  'Admin Email'
);

// Create custom alert
await alertManager.createAlertPolicy({
  name: 'Custom Alert',
  condition: {
    displayName: 'Custom condition',
    metricFilter: 'resource.type="global" AND metric.type="custom.googleapis.com/rinawarp/custom/feature_usage"',
    threshold: 100,
    comparison: 'GREATER_THAN',
    duration: '300s'
  },
  documentation: 'Alert when custom feature usage exceeds threshold'
});
```

## 🔐 Security

### Service Account Permissions

The service account requires these IAM roles:

- `roles/monitoring.metricWriter` - Write custom metrics
- `roles/monitoring.dashboardEditor` - Create and edit dashboards
- `roles/monitoring.alertPolicyEditor` - Manage alert policies
- `roles/logging.logWriter` - Write logs

### Environment Variables

- Keep `.env.monitoring` secure and never commit it to version control
- Store the service account key file in the `secrets/` directory
- Use environment-specific configurations for different deployments

## 📚 Manual Setup

If the automated setup doesn't work, follow these manual steps:

### 1. Create Google Cloud Project

```bash
gcloud projects create rinawarp-terminal-monitoring
gcloud config set project rinawarp-terminal-monitoring
```

### 2. Enable APIs

```bash
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

### 3. Create Service Account

```bash
gcloud iam service-accounts create rinawarp-monitoring \
  --display-name="RinaWarp Terminal Monitoring"
```

### 4. Assign IAM Roles

```bash
gcloud projects add-iam-policy-binding rinawarp-terminal-monitoring \
  --member="serviceAccount:rinawarp-monitoring@rinawarp-terminal-monitoring.iam.gserviceaccount.com" \
  --role="roles/monitoring.metricWriter"

gcloud projects add-iam-policy-binding rinawarp-terminal-monitoring \
  --member="serviceAccount:rinawarp-monitoring@rinawarp-terminal-monitoring.iam.gserviceaccount.com" \
  --role="roles/monitoring.dashboardEditor"

gcloud projects add-iam-policy-binding rinawarp-terminal-monitoring \
  --member="serviceAccount:rinawarp-monitoring@rinawarp-terminal-monitoring.iam.gserviceaccount.com" \
  --role="roles/monitoring.alertPolicyEditor"

gcloud projects add-iam-policy-binding rinawarp-terminal-monitoring \
  --member="serviceAccount:rinawarp-monitoring@rinawarp-terminal-monitoring.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

### 5. Create Service Account Key

```bash
gcloud iam service-accounts keys create ./secrets/gcp-service-account-key.json \
  --iam-account=rinawarp-monitoring@rinawarp-terminal-monitoring.iam.gserviceaccount.com
```

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Error**: Ensure the service account key file exists and has correct permissions
2. **Project Not Found**: Verify the project ID is correct and you have access
3. **API Not Enabled**: Make sure all required APIs are enabled in your project
4. **Insufficient Permissions**: Check that the service account has all required IAM roles

### Debug Mode

Enable debug logging by setting:

```env
MONITORING_LOG_LEVEL=debug
```

### Health Check

Check the monitoring service status:

```javascript
import monitoringConfig from './config/gcp-monitoring-config.js';

const health = await monitoringConfig.healthCheck();
console.log('Monitoring Health:', health);
```

## 📊 Monitoring Dashboard

Visit the [Google Cloud Console](https://console.cloud.google.com/monitoring) to:

- View real-time metrics
- Create custom dashboards
- Set up additional alerts
- Monitor system performance

## 🔄 Next Steps

1. **Custom Dashboards**: Create dashboards in Google Cloud Console
2. **Log Analysis**: Set up log-based metrics and alerts
3. **Integration**: Connect with external monitoring tools
4. **Automation**: Set up automated responses to alerts

## 📞 Support

For issues with the monitoring setup:

1. Check the troubleshooting section above
2. Review the Google Cloud Monitoring documentation
3. Contact the development team

---

*This monitoring setup provides enterprise-grade observability for RinaWarp Terminal, ensuring optimal performance and reliability.*
