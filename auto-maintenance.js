#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 RinaWarp Auto-Maintenance System');
console.log('===================================\n');

const fixes = [];

// 1. Fix common file issues
console.log('1️⃣ Checking file integrity...');

// Ensure critical directories exist
const requiredDirs = ['releases', 'logs', 'public', 'src/api', 'src/payment'];
requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    fixes.push(`Created missing directory: ${dir}`);
  }
});

// 2. Fix pricing consistency
console.log('\n2️⃣ Checking pricing consistency...');

const checkPricing = () => {
  const correctPrices = {
    basic: 29,
    pro: 99,
    enterprise: 299,
  };

  // Check payment handler
  if (fs.existsSync('src/payment/stripe-checkout.js')) {
    let paymentContent = fs.readFileSync('src/payment/stripe-checkout.js', 'utf8');
    let updated = false;

    // Fix any mismatched prices
    if (paymentContent.includes('price: 9.99')) {
      paymentContent = paymentContent.replace('price: 9.99,', 'price: 29.00,');
      updated = true;
    }
    if (paymentContent.includes('price: 19.99')) {
      paymentContent = paymentContent.replace('price: 19.99,', 'price: 99.00,');
      updated = true;
    }
    if (paymentContent.includes('price: 49.99')) {
      paymentContent = paymentContent.replace('price: 49.99,', 'price: 299.00,');
      updated = true;
    }

    if (updated) {
      fs.writeFileSync('src/payment/stripe-checkout.js', paymentContent);
      fixes.push('Fixed pricing in payment handler');
    }
  }
};

checkPricing();

// 3. Validate and fix HTML files
console.log('\n3️⃣ Validating HTML files...');

const validateHTML = filePath => {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Fix common HTML issues
  if (!content.includes('<!DOCTYPE html>')) {
    content = '<!DOCTYPE html>\n' + content;
    updated = true;
  }

  if (!content.includes('<meta charset="UTF-8">')) {
    content = content.replace('<head>', '<head>\n    <meta charset="UTF-8">');
    updated = true;
  }

  if (!content.includes('viewport')) {
    content = content.replace(
      '<head>',
      '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">'
    );
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, content);
    fixes.push(`Fixed HTML structure in ${filePath}`);
  }
};

['index.html', 'pricing.html', 'public/success.html'].forEach(validateHTML);

// 4. Clean up temporary files
console.log('\n4️⃣ Cleaning temporary files...');

const cleanupPatterns = ['*.tmp', '*.log.old', '.DS_Store', 'npm-debug.log*', 'yarn-error.log*'];

const cleanup = (dir = '.') => {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        cleanup(filePath);
      } else if (stat.isFile()) {
        cleanupPatterns.forEach(pattern => {
          if (file.match(new RegExp(pattern.replace('*', '.*')))) {
            fs.unlinkSync(filePath);
            fixes.push(`Cleaned up: ${filePath}`);
          }
        });
      }
    });
  } catch (e) {
    // Ignore errors
  }
};

cleanup();

// 5. Optimize package.json
console.log('\n5️⃣ Optimizing package.json...');

if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  let updated = false;

  // Add missing scripts
  const requiredScripts = {
    'pre-deploy': 'node pre-deploy-check.js',
    monitor: 'node website-monitor.js',
    maintenance: 'node auto-maintenance.js',
    health: 'curl -s http://localhost:3000/health | jq .',
  };

  Object.entries(requiredScripts).forEach(([key, value]) => {
    if (!pkg.scripts[key]) {
      pkg.scripts[key] = value;
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    fixes.push('Added missing npm scripts');
  }
}

// 6. Create/Update .env.example
console.log('\n6️⃣ Updating .env.example...');

const envExample = `# RinaWarp Terminal Environment Variables
# Copy this file to .env and fill in your values

# Stripe Configuration (Required)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Price IDs (Get these from Stripe Dashboard)
STRIPE_PRICE_BASIC=price_basic_monthly_id
STRIPE_PRICE_PRO=price_pro_monthly_id
STRIPE_PRICE_ENTERPRISE=price_enterprise_monthly_id

# Server Configuration
PORT=3000
NODE_ENV=production
SITE_URL=https://rinawarptech.com

# Session Secret (Generate a random string)
SESSION_SECRET=your_random_session_secret_here

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Analytics (Optional)
GA_TRACKING_ID=G-G424CV5GGT

# Monitoring (Optional)
MONITOR_WEBHOOK_URL=your_webhook_url_for_alerts
MONITOR_EMAIL=admin@rinawarptech.com
`;

fs.writeFileSync('.env.example', envExample);
fixes.push('Updated .env.example with all required variables');

// 7. Fix permissions
console.log('\n7️⃣ Fixing file permissions...');

try {
  // Make scripts executable
  const scripts = [
    'final-server.js',
    'website-monitor.js',
    'pre-deploy-check.js',
    'auto-maintenance.js',
  ];
  scripts.forEach(script => {
    if (fs.existsSync(script)) {
      execSync(`chmod +x ${script}`);
    }
  });
  fixes.push('Fixed script permissions');
} catch (e) {
  // Ignore on Windows
}

// 8. Validate server endpoints
console.log('\n8️⃣ Validating server endpoints...');

if (fs.existsSync('final-server.js')) {
  const serverContent = fs.readFileSync('final-server.js', 'utf8');
  const requiredEndpoints = [
    { route: '/api/payment/config', desc: 'Stripe config endpoint' },
    { route: '/api/payment/create-checkout-session', desc: 'Checkout endpoint' },
    { route: '/health', desc: 'Health check endpoint' },
    { route: '/api/download', desc: 'Download redirect' },
  ];

  const missingEndpoints = requiredEndpoints.filter(ep => !serverContent.includes(ep.route));

  if (missingEndpoints.length > 0) {
    console.log('⚠️  Missing endpoints detected:');
    missingEndpoints.forEach(ep => {
      console.log(`   - ${ep.route} (${ep.desc})`);
    });
  }
}

// 9. Create maintenance report
console.log('\n9️⃣ Generating maintenance report...');

const report = {
  timestamp: new Date().toISOString(),
  fixes: fixes.length,
  details: fixes,
  nextMaintenance: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

fs.writeFileSync(
  path.join('logs', `maintenance-${new Date().toISOString().split('T')[0]}.json`),
  JSON.stringify(report, null, 2)
);

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 MAINTENANCE SUMMARY');
console.log('='.repeat(50));

if (fixes.length === 0) {
  console.log('✅ No issues found - system is healthy!');
} else {
  console.log(`🔧 Applied ${fixes.length} fixes:`);
  fixes.forEach((fix, i) => {
    console.log(`   ${i + 1}. ${fix}`);
  });
}

console.log('\n💡 RECOMMENDATIONS:');
console.log('   1. Run pre-deploy-check.js before each deployment');
console.log('   2. Set up cron job for auto-maintenance.js (daily)');
console.log('   3. Monitor website-health.log for issues');
console.log('   4. Keep .env file updated with production values');
console.log('   5. Regular backups of database and user data');

// Create systemd service file for Linux
const systemdService = `[Unit]
Description=RinaWarp Website Monitor
After=network.target

[Service]
Type=simple
User=rinawarp
WorkingDirectory=/home/rinawarp/rinawarp-terminal
ExecStart=/usr/bin/node /home/rinawarp/rinawarp-terminal/website-monitor.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`;

fs.writeFileSync('rinawarp-monitor.service', systemdService);
console.log('\n📝 Created systemd service file: rinawarp-monitor.service');
console.log('   Install with: sudo cp rinawarp-monitor.service /etc/systemd/system/');
console.log('   Enable with: sudo systemctl enable rinawarp-monitor');
console.log('   Start with: sudo systemctl start rinawarp-monitor');
