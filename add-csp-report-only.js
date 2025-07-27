#!/usr/bin/env node

import { promises as fs } from 'fs';

async function addCSPReportOnly() {
  console.log('🔍 Adding CSP Report-Only header for testing...\n');

  const serverPath = './server.js';

  try {
    let content = await fs.readFile(serverPath, 'utf8');

    // Find the helmet configuration
    const helmetStart = content.indexOf('app.use(\n  helmet({');
    if (helmetStart === -1) {
      console.error('❌ Could not find helmet configuration');
      return;
    }

    // Add report-only middleware before helmet
    const reportOnlyMiddleware = `
// CSP Report-Only for testing strict policy
app.use((req, res, next) => {
  // Test strict CSP without breaking functionality
  const strictCSP = [
    "default-src 'self'",
    "script-src 'self' https://js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com",
    "style-src 'self' https://fonts.googleapis.com", // Testing without unsafe-inline for styles
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://analytics.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
    "form-action 'self' https://checkout.stripe.com",
    "report-uri /api/csp-report"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy-Report-Only', strictCSP);
  next();
});

// Apply helmet security headers with comprehensive protection`;

    // Insert the report-only middleware
    content = content.replace(
      '// Apply helmet security headers with comprehensive protection',
      reportOnlyMiddleware
    );

    // Add CSP report endpoint
    const reportEndpoint = `
// CSP Violation Report Endpoint
app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  const report = req.body['csp-report'];
  if (report) {
    console.log('🚨 CSP Violation Report:');
    console.log('  - Document:', report['document-uri']);
    console.log('  - Blocked:', report['blocked-uri']);
    console.log('  - Directive:', report['violated-directive']);
    console.log('  - Line:', report['line-number']);
    console.log('  - Column:', report['column-number']);
    
    // Log to file for analysis
    const logEntry = {
      timestamp: new Date().toISOString(),
      report: report,
      userAgent: req.headers['user-agent']
    };
    
    fs.appendFile('./logs/csp-violations.log', JSON.stringify(logEntry) + '\\n').catch(() => {});
  }
  
  res.status(204).end();
});
`;

    // Find a good place to insert the report endpoint (after other API routes)
    const apiHealthIndex = content.indexOf("app.get('/api/health'");
    if (apiHealthIndex !== -1) {
      const insertPoint = content.indexOf('});', apiHealthIndex) + 3;
      content = content.slice(0, insertPoint) + '\n' + reportEndpoint + content.slice(insertPoint);
    }

    // Create backup
    await fs.writeFile(
      `${serverPath}.backup-reportonly-${Date.now()}`,
      await fs.readFile(serverPath, 'utf8'),
      'utf8'
    );

    // Write updated content
    await fs.writeFile(serverPath, content, 'utf8');

    console.log('✅ Added CSP Report-Only header');
    console.log('✅ Added CSP violation report endpoint at /api/csp-report');

    // Create logs directory if it doesn't exist
    await fs.mkdir('./logs', { recursive: true });

    console.log('\n📋 What this does:');
    console.log('1. Sends Content-Security-Policy-Report-Only header with strict policy');
    console.log('2. Browser will report violations but NOT block anything');
    console.log('3. Violations logged to console and ./logs/csp-violations.log');
    console.log('4. Test all functionality and check for violations');

    console.log('\n🧪 Testing checklist:');
    console.log('- [ ] Visit all pages');
    console.log('- [ ] Click all buttons');
    console.log('- [ ] Test payment flow');
    console.log('- [ ] Check browser console for CSP reports');
    console.log('- [ ] Review ./logs/csp-violations.log');

    console.log('\n📈 Once testing is complete:');
    console.log('1. If no violations: Remove report-only and enforce strict CSP');
    console.log('2. If violations found: Fix issues before enforcing');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
addCSPReportOnly().catch(console.error);
