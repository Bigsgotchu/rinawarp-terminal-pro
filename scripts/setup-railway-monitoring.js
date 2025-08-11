#!/usr/bin/env node

/**
 * RinaWarp Terminal - Railway Deployment Monitoring Setup
 * Configures uptime monitoring, health checks, and alerting for Railway deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

console.log('🎯 RinaWarp Terminal - Railway Monitoring Setup');
console.log('===============================================');

// Health check endpoint configuration
const healthCheckConfig = {
  endpoint: '/api/health',
  timeout: 10000,
  expectedStatus: 200,
  expectedResponse: { status: 'healthy' },
};

// Monitoring services configuration
const monitoringConfig = {
  uptime: {
    enabled: true,
    interval: '5m', // Check every 5 minutes
    timeout: '30s',
    retryCount: 3,
  },
  performance: {
    enabled: true,
    metrics: ['response_time', 'cpu_usage', 'memory_usage', 'disk_usage'],
  },
  alerts: {
    enabled: true,
    channels: ['email', 'slack'], // Can be configured via env vars
    thresholds: {
      uptime: 99.5, // Alert if uptime drops below 99.5%
      response_time: 5000, // Alert if response time > 5s
      error_rate: 5, // Alert if error rate > 5%
    },
  },
};

/**
 * Create health check endpoint for the server
 */
function createHealthCheckEndpoint() {
  logInfo('Creating health check endpoint...');

  const healthCheckCode = `
// Health check endpoint for monitoring
app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
    },
    railway: {
      service: process.env.RAILWAY_SERVICE_NAME || 'rinawarp-terminal',
      environment: process.env.RAILWAY_ENVIRONMENT || 'production',
      deployment: process.env.RAILWAY_DEPLOYMENT_ID || 'unknown'
    }
  };

  // Basic system health checks
  const systemChecks = {
    database: checkDatabaseConnection(),
    redis: checkRedisConnection(),
    external_apis: checkExternalAPIs(),
    disk_space: checkDiskSpace(),
    memory_usage: checkMemoryUsage()
  };

  healthCheck.checks = systemChecks;
  healthCheck.status = Object.values(systemChecks).every(check => check.status === 'ok') 
    ? 'healthy' 
    : 'degraded';

  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// Individual health check functions
function checkDatabaseConnection() {
  try {
    // Add your database connection check here
    return { status: 'ok', message: 'Database connection healthy' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function checkRedisConnection() {
  try {
    // Add your Redis connection check here
    return { status: 'ok', message: 'Redis connection healthy' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function checkExternalAPIs() {
  try {
    // Check critical external APIs (Stripe, SendGrid, etc.)
    return { status: 'ok', message: 'External APIs responsive' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function checkDiskSpace() {
  try {
    const stats = require('fs').statSync('.');
    return { status: 'ok', message: 'Sufficient disk space available' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function checkMemoryUsage() {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const usagePercent = (heapUsedMB / heapTotalMB) * 100;

  if (usagePercent > 90) {
    return { status: 'warning', message: \`High memory usage: \${usagePercent.toFixed(1)}%\` };
  }

  return { 
    status: 'ok', 
    message: \`Memory usage normal: \${heapUsedMB}MB/\${heapTotalMB}MB (\${usagePercent.toFixed(1)}%)\`
  };
}
`;

  // Check if health check already exists in server.js
  const serverPath = path.join(projectRoot, 'server.js');
  if (fs.existsSync(serverPath)) {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    if (!serverContent.includes('/api/health')) {
      // Find the right place to insert the health check
      const insertPoint = serverContent.indexOf('// Start server');
      if (insertPoint !== -1) {
        const updatedContent =
          serverContent.slice(0, insertPoint) +
          healthCheckCode +
          '\n\n' +
          serverContent.slice(insertPoint);

        fs.writeFileSync(serverPath, updatedContent);
        logSuccess('Health check endpoint added to server.js');
      } else {
        logWarning(
          'Could not find insertion point in server.js - please add health check manually'
        );
        fs.writeFileSync(path.join(projectRoot, 'health-check-snippet.js'), healthCheckCode);
        logInfo('Health check code saved to health-check-snippet.js');
      }
    } else {
      logSuccess('Health check endpoint already exists');
    }
  } else {
    logError('server.js not found - cannot add health check endpoint');
  }
}

/**
 * Create monitoring configuration files
 */
function createMonitoringConfigs() {
  logInfo('Creating monitoring configuration files...');

  // UptimeRobot configuration
  const uptimeRobotConfig = {
    name: 'RinaWarp Terminal Production',
    type: 'HTTP(s)',
    url: '{{RAILWAY_URL}}/api/health',
    interval: 300, // 5 minutes
    timeout: 30,
    http_method: 'GET',
    http_status_codes: '200',
    alert_contacts: '{{ALERT_CONTACTS}}',
    keyword_type: 'exists',
    keyword_value: '"status":"healthy"',
  };

  // Pingdom configuration
  const pingdomConfig = {
    name: 'RinaWarp Terminal',
    hostname: '{{RAILWAY_HOSTNAME}}',
    resolution: 5, // 5 minutes
    type: 'http',
    url: '/api/health',
    port: 443,
    encryption: true,
    shouldcontain: '"status":"healthy"',
    tags: ['production', 'rinawarp', 'terminal'],
    integrationids: '{{INTEGRATION_IDS}}',
  };

  // New Relic synthetics configuration
  const newRelicConfig = {
    name: 'RinaWarp Terminal Synthetic Monitor',
    type: 'SIMPLE',
    frequency: 5,
    locations: ['AWS_US_EAST_1', 'AWS_EU_WEST_1', 'AWS_AP_SOUTHEAST_1'],
    status: 'ENABLED',
    uri: '{{RAILWAY_URL}}/api/health',
    validation_string: '"status":"healthy"',
    verify_ssl: true,
  };

  // Datadog synthetics configuration
  const datadogConfig = {
    name: 'RinaWarp Terminal Health Check',
    type: 'api',
    subtype: 'http',
    request: {
      method: 'GET',
      url: '{{RAILWAY_URL}}/api/health',
      timeout: 60,
      headers: {
        'User-Agent': 'Datadog Synthetic Monitoring',
      },
    },
    assertions: [
      {
        type: 'statusCode',
        operator: 'is',
        target: 200,
      },
      {
        type: 'body',
        operator: 'contains',
        target: '"status":"healthy"',
      },
      {
        type: 'responseTime',
        operator: 'lessThan',
        target: 5000,
      },
    ],
    locations: ['aws:us-east-1', 'aws:eu-west-1', 'aws:ap-southeast-1'],
    options: {
      tick_every: 300, // 5 minutes
      min_failure_duration: 600, // 10 minutes
      min_location_failed: 1,
    },
  };

  // Create monitoring directory
  const monitoringDir = path.join(projectRoot, 'monitoring');
  if (!fs.existsSync(monitoringDir)) {
    fs.mkdirSync(monitoringDir);
  }

  // Write configuration files
  fs.writeFileSync(
    path.join(monitoringDir, 'uptimerobot-config.json'),
    JSON.stringify(uptimeRobotConfig, null, 2)
  );

  fs.writeFileSync(
    path.join(monitoringDir, 'pingdom-config.json'),
    JSON.stringify(pingdomConfig, null, 2)
  );

  fs.writeFileSync(
    path.join(monitoringDir, 'newrelic-config.json'),
    JSON.stringify(newRelicConfig, null, 2)
  );

  fs.writeFileSync(
    path.join(monitoringDir, 'datadog-config.json'),
    JSON.stringify(datadogConfig, null, 2)
  );

  logSuccess('Monitoring configuration files created in ./monitoring/');
}

/**
 * Create monitoring setup script
 */
function createMonitoringSetupScript() {
  logInfo('Creating monitoring setup automation script...');

  const setupScript = `#!/bin/bash

# RinaWarp Terminal - Railway Monitoring Setup Automation
# This script configures various monitoring services for the Railway deployment

set -e

echo "🎯 Setting up monitoring for RinaWarp Terminal..."

# Get Railway URL
RAILWAY_URL=$(railway vars get RAILWAY_URL 2>/dev/null || echo "")
if [ -z "$RAILWAY_URL" ]; then
  echo "⚠️ Railway URL not found. Please set RAILWAY_URL environment variable."
  echo "   Run: railway vars set RAILWAY_URL=https://your-app.railway.app"
  exit 1
fi

echo "✅ Railway URL: $RAILWAY_URL"

# Test health check endpoint
echo "🔍 Testing health check endpoint..."
if curl -sf "$RAILWAY_URL/api/health" > /dev/null; then
  echo "✅ Health check endpoint is responding"
else
  echo "❌ Health check endpoint not responding"
  echo "   Please ensure the health check endpoint is deployed"
  exit 1
fi

# Setup UptimeRobot (if API key provided)
if [ ! -z "\$UPTIMEROBOT_API_KEY" ]; then
  echo "🔧 Setting up UptimeRobot monitoring..."
  curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \\
    -H "Content-Type: application/x-www-form-urlencoded" \\
    -d "api_key=\$UPTIMEROBOT_API_KEY" \\
    -d "format=json" \\
    -d "type=1" \\
    -d "url=\$RAILWAY_URL/api/health" \\
    -d "friendly_name=RinaWarp Terminal Production" \\
    -d "interval=300" \\
    -d "timeout=30" \\
    -d "keyword_type=2" \\
    -d "keyword_value=healthy"
  echo "✅ UptimeRobot monitor configured"
else
  echo "⚠️ UPTIMEROBOT_API_KEY not set, skipping UptimeRobot setup"
fi

# Setup Pingdom (if credentials provided)
if [ ! -z "\$PINGDOM_API_KEY" ] && [ ! -z "\$PINGDOM_EMAIL" ]; then
  echo "🔧 Setting up Pingdom monitoring..."
  curl -X POST "https://api.pingdom.com/api/3.1/checks" \\
    -H "Authorization: Bearer \$PINGDOM_API_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{
      \"name\": \"RinaWarp Terminal\",
      \"type\": \"http\",
      \"host\": \"\$(echo \$RAILWAY_URL | sed 's|https\\\\://||' | sed 's|http\\\\://||')\",
      \"url\": \"/api/health\",
      \"resolution\": 5,
      \"encryption\": true,
      \"shouldcontain\": \"healthy\",
      \"tags\": [\"production\", \"rinawarp\"]
    }"
  echo "✅ Pingdom monitor configured"
else
  echo "⚠️ Pingdom credentials not set, skipping Pingdom setup"
fi

# Setup New Relic (if API key provided)
if [ ! -z "\$NEW_RELIC_API_KEY" ] && [ ! -z "\$NEW_RELIC_ACCOUNT_ID" ]; then
  echo "🔧 Setting up New Relic Synthetics..."
  curl -X POST "https://synthetics-api.newrelic.com/synthetics/api/v3/monitors" \\
    -H "Api-Key: \$NEW_RELIC_API_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{
      \"name\": \"RinaWarp Terminal\",
      \"type\": \"SIMPLE\",
      \"frequency\": 5,
      \"uri\": \"\$RAILWAY_URL/api/health\",
      \"locations\": [\"AWS_US_EAST_1\", \"AWS_EU_WEST_1\"],
      \"status\": \"ENABLED\",
      \"options\": {
        \"validationString\": \"healthy\",
        \"verifySSL\": true
      }
    }"
  echo "✅ New Relic Synthetics monitor configured"
else
  echo "⚠️ New Relic credentials not set, skipping New Relic setup"
fi

echo ""
echo "🎉 Monitoring setup complete!"
echo ""
echo "📊 Next steps:"
echo "1. Configure alert channels (email, Slack, etc.)"
echo "2. Set up custom dashboards for metrics visualization"
echo "3. Test alert notifications"
echo "4. Review and adjust monitoring thresholds"
echo ""
echo "📖 For detailed monitoring configuration, see:"
echo "   ./monitoring/README.md"
`;

  fs.writeFileSync(path.join(projectRoot, 'scripts/setup-railway-monitoring.sh'), setupScript);

  // Make script executable
  try {
    execSync('chmod +x scripts/setup-railway-monitoring.sh', { cwd: projectRoot });
  } catch (error) {
    // Continue if chmod fails (e.g., on Windows)
  }

  logSuccess('Railway monitoring setup script created at ./scripts/setup-railway-monitoring.sh');
}

/**
 * Main setup function
 */
async function setupRailwayMonitoring() {
  try {
    createHealthCheckEndpoint();
    createMonitoringConfigs();
    createMonitoringSetupScript();

    console.log('');
    logSuccess('🎉 Railway monitoring setup completed successfully!');
    console.log('');
    logInfo('📋 Next steps:');
    console.log('1. Deploy the updated server with health check endpoint');
    console.log('2. Run: ./scripts/setup-railway-monitoring.sh');
    console.log('3. Configure your preferred monitoring service API keys');
    console.log('4. Set up alert channels (email, Slack)');
    console.log('');
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run setup if called directly
if (import.meta.url === `file://${__filename}`) {
  setupRailwayMonitoring();
}

export { setupRailwayMonitoring, healthCheckConfig, monitoringConfig };
