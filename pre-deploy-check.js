#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log('🚀 RinaWarp Pre-Deployment Validation');
console.log('=====================================\n');

let totalChecks = 0;
let passedChecks = 0;
const criticalIssues = [];

// Helper function to check items
function check(description, condition, critical = false) {
  totalChecks++;
  const status = condition ? '✅' : '❌';
  console.log(`${status} ${description}`);

  if (condition) {
    passedChecks++;
  } else if (critical) {
    criticalIssues.push(description);
  }

  return condition;
}

// 1. Environment Configuration
console.log('1️⃣ ENVIRONMENT CONFIGURATION');
console.log('-----------------------------');

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
console.log('\n2️⃣ CORE FILES');
console.log('-------------');

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
console.log('\n3️⃣ CONTENT VALIDATION');
console.log('--------------------');

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
console.log('\n4️⃣ DEPENDENCIES');
console.log('---------------');

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
    } catch (e) {
      check('No high severity vulnerabilities', false);
    }
  }
} catch (e) {
  console.error('Error checking dependencies:', e.message);
}

// 5. Server Configuration
console.log('\n5️⃣ SERVER CONFIGURATION');
console.log('----------------------');

if (fs.existsSync('final-server.js')) {
  const serverContent = fs.readFileSync('final-server.js', 'utf8');
  check('Payment routes configured', serverContent.includes('/api/payment'));
  check('Download routes configured', serverContent.includes('/api/download'));
  check('Static file serving configured', serverContent.includes('express.static'));
  check('Error handling configured', serverContent.includes('app.use((err'));
}

// 6. Security Checks
console.log('\n6️⃣ SECURITY CHECKS');
console.log('------------------');

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
console.log('\n7️⃣ PERFORMANCE OPTIMIZATION');
console.log('---------------------------');

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
console.log('\n8️⃣ DOWNLOAD SYSTEM');
console.log('------------------');

check('releases directory exists', fs.existsSync('releases'));
check('Download redirect handler exists', fs.existsSync('src/api/download-redirect.js'));

if (fs.existsSync('src/api/download-redirect.js')) {
  const downloadContent = fs.readFileSync('src/api/download-redirect.js', 'utf8');
  check('GitHub release URLs configured', downloadContent.includes('github.com/Rinawarp-Terminal'));
}

// 9. Test Server Startup
console.log('\n9️⃣ SERVER STARTUP TEST');
console.log('----------------------');

console.log('Testing server startup (5 second timeout)...');
let serverWorks = false;

try {
  const testProcess = execSync('timeout 5 node final-server.js 2>&1 || true', { encoding: 'utf8' });

  serverWorks =
    testProcess.includes('RinaWarp Terminal Server running successfully') ||
    testProcess.includes('Starting RinaWarp Terminal');

  check('Server starts without errors', serverWorks, true);
} catch (e) {
  check('Server starts without errors', false, true);
  console.log('  Error:', e.message);
}

// Final Report
console.log('\n' + '='.repeat(50));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(50));
console.log(`Total Checks: ${totalChecks}`);
console.log(`Passed: ${passedChecks}`);
console.log(`Failed: ${totalChecks - passedChecks}`);
console.log(`Success Rate: ${Math.round((passedChecks / totalChecks) * 100)}%`);

if (criticalIssues.length > 0) {
  console.log('\n🚨 CRITICAL ISSUES THAT MUST BE FIXED:');
  criticalIssues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue}`);
  });
  console.log('\n❌ DEPLOYMENT BLOCKED - Fix critical issues first!');
  process.exit(1);
} else if (passedChecks === totalChecks) {
  console.log('\n✅ ALL CHECKS PASSED - Ready for deployment!');

  console.log('\n📋 DEPLOYMENT CHECKLIST:');
  console.log('   1. Run: npm run build:releases');
  console.log('   2. Test payment flow with Stripe test cards');
  console.log('   3. Deploy to production: npm run deploy:railway');
  console.log('   4. Test live site: node website-monitor.js');
  console.log('   5. Monitor logs for first 24 hours');
} else {
  console.log('\n⚠️  SOME CHECKS FAILED - Review and fix before deployment');
  console.log("   Non-critical issues won't block deployment but should be addressed");
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
console.log('\n📄 Detailed report saved to: deployment-readiness.json');
