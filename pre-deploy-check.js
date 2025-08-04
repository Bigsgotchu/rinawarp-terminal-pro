#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

let totalChecks = 0;
let passedChecks = 0;
const criticalIssues = [];

// Helper function to check items
function check(description, condition, critical = false) {
  totalChecks++;
  const _status = condition ? '✅' : '❌';

  if (condition) {
    passedChecks++;
  } else if (critical) {
    criticalIssues.push(description);
  }

  return condition;
}

// 1. Environment Configuration

check('.env file exists', fs.existsSync('.env'), true);
check('.env.example exists', fs.existsSync('.env.example'));

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  check(
    'STRIPE_SECRET_KEY configured',
    envContent.includes('STRIPE_SECRET_KEY=') &&
      !envContent.includes('STRIPE_SECRET_KEY=sk_test_your'),
    true
  );
  check(
    'STRIPE_PUBLISHABLE_KEY configured',
    envContent.includes('STRIPE_PUBLISHABLE_KEY=') &&
      !envContent.includes('STRIPE_PUBLISHABLE_KEY=pk_test_your'),
    true
  );
  check('PORT configured', envContent.includes('PORT='));
  check('NODE_ENV configured', envContent.includes('NODE_ENV='));
}

// 2. Core Files

const coreFiles = [
  { file: 'index.html', critical: true },
  { file: 'pricing.html', critical: true },
  { file: 'final-server.js', critical: true },
  { file: 'package.json', critical: true },
  { file: 'public/success.html', critical: true },
  { file: 'public/checkout.html', critical: true },
  { file: 'public/privacy.html', critical: true },
  { file: 'public/terms.html', critical: true },
  { file: 'src/payment/stripe-checkout.js', critical: true },
  { file: 'src/api/download-redirect.js', critical: false },
];

coreFiles.forEach(({ file, critical }) => {
  check(`${file} exists`, fs.existsSync(file), critical);
});

// 3. Content Validation

if (fs.existsSync('index.html')) {
  const indexContent = fs.readFileSync('index.html', 'utf8');
  check('No placeholder Stripe keys', !indexContent.includes('pk_test_51OX1234567890abcdef'));
  check('Google Analytics configured', indexContent.includes('G-G424CV5GGT'));
  check(
    'Pricing consistent ($29, $99, $299)',
    indexContent.includes('$29') && indexContent.includes('$99') && indexContent.includes('$299')
  );
  check('No TODO/FIXME/PLACEHOLDER content', !indexContent.match(/TODO|FIXME|PLACEHOLDER/i));
}

if (fs.existsSync('src/payment/stripe-checkout.js')) {
  const paymentContent = fs.readFileSync('src/payment/stripe-checkout.js', 'utf8');
  check(
    'Payment prices match landing page',
    paymentContent.includes('price: 29') &&
      paymentContent.includes('price: 99') &&
      paymentContent.includes('price: 299')
  );
  check('Config endpoint exists', paymentContent.includes('/config'));
}

// 4. Dependencies

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['express', 'stripe', 'dotenv'];

  requiredDeps.forEach(dep => {
    check(
      `${dep} in dependencies`,
      packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
    );
  });

  // Check if node_modules exists
  check('node_modules exists', fs.existsSync('node_modules'));

  // Check for security vulnerabilities
  if (fs.existsSync('node_modules')) {
    try {
      execSync('npm audit --audit-level=high', { stdio: 'pipe' });
      check('No high severity vulnerabilities', true);
    } catch (_e) {
      check('No high severity vulnerabilities', false);
    }
  }
} catch (error) {
  console.error('Error checking dependencies:', error.message);
}

// 5. Server Configuration

if (fs.existsSync('final-server.js')) {
  const serverContent = fs.readFileSync('final-server.js', 'utf8');
  check('Payment routes configured', serverContent.includes('/api/payment'));
  check('Download routes configured', serverContent.includes('/api/download'));
  check('Static file serving configured', serverContent.includes('express.static'));
  check('Error handling configured', serverContent.includes('app.use((err'));
}

// 6. Security Checks

check(
  'No hardcoded secrets in index.html',
  !fs.readFileSync('index.html', 'utf8').match(/sk_test_|sk_live_/)
);
check('.gitignore exists', fs.existsSync('.gitignore'));

if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  check('.env in .gitignore', gitignore.includes('.env'));
  check('node_modules in .gitignore', gitignore.includes('node_modules'));
}

// 7. Performance Optimization

if (fs.existsSync('index.html')) {
  const indexContent = fs.readFileSync('index.html', 'utf8');
  check(
    'CSS is inline or optimized',
    indexContent.includes('<style>') || indexContent.includes('main.css')
  );
  check(
    'JavaScript is deferred/async',
    indexContent.includes('defer') || indexContent.includes('async')
  );
}

// 8. Download System

check('releases directory exists', fs.existsSync('releases'));
check('Download redirect handler exists', fs.existsSync('src/api/download-redirect.js'));

if (fs.existsSync('src/api/download-redirect.js')) {
  const downloadContent = fs.readFileSync('src/api/download-redirect.js', 'utf8');
  check('GitHub release URLs configured', downloadContent.includes('github.com/Rinawarp-Terminal'));
}

// 9. Test Server Startup

let serverWorks = false;

try {
  const testProcess = execSync('timeout 5 node final-server.js 2>&1 || true', { encoding: 'utf8' });

  serverWorks =
    testProcess.includes('RinaWarp Terminal Server running successfully') ||
    testProcess.includes('Starting RinaWarp Terminal');

  check('Server starts without errors', serverWorks, true);
} catch (_e) {
  check('Server starts without errors', false, true);
}

// Final Report
console.log('📊 VALIDATION SUMMARY');

if (criticalIssues.length > 0) {
  criticalIssues.forEach((_issue, _i) => {
    // TODO: Log critical issues
  });
  process.exit(1);
} else if (passedChecks === totalChecks) {
} else {
}

// Generate deployment readiness report
const report = {
  timestamp: new Date().toISOString(),
  checks: {
    total: totalChecks,
    passed: passedChecks,
    failed: totalChecks - passedChecks,
  },
  criticalIssues,
  readyForDeployment: criticalIssues.length === 0,
  successRate: Math.round((passedChecks / totalChecks) * 100),
};

fs.writeFileSync('deployment-readiness.json', JSON.stringify(report, null, 2));
