/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 16 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

/**
 * RinaWarp Terminal - Comprehensive Live Site Testing
 * Tests all public endpoints and functionality
 */

const https = require('https');
const http = require('http');
const fs = require('node:fs');

console.log('🧜‍♀️ RinaWarp Terminal - Live Site Testing\n');

// Configuration
const config = {
  baseUrl: 'https://rinawarptech.com',
  timeout: 10000,
  userAgent: 'RinaWarp-Test-Suite/1.0'
};

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// HTTP request helper
function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestModule = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'User-Agent': config.userAgent
      },
      timeout: config.timeout
    };
    
    const req = requestModule.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime: Date.now() - startTime
        });
      });
    });
    
    const startTime = Date.now();
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

// Test function
async function runTest(name, testFn) {
  process.stdout.write(`🧪 Testing ${name}... `);
  
  try {
    const result = await testFn();
    console.log('✅ PASS');
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASS', details: result });
    return true;
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAIL', error: error.message });
    return false;
  }
}

// Individual test functions
const tests = {
  async testMainPage() {
    const response = await makeRequest(config.baseUrl);
    if (response.statusCode !== 200) {
      throw new Error(new Error(`Expected 200, got ${response.statusCode}`));
    }
    if (!response.body.includes('RinaWarp')) {
      throw new Error(new Error('Page does not contain RinaWarp branding'));
    }
    return `Main page loads (${response.responseTime}ms)`;
  },

  async testBetaDownloadPage() {
    const response = await makeRequest(`${config.baseUrl}/beta-download.html`);
    if (response.statusCode !== 200) {
      throw new Error(new Error(`Expected 200, got ${response.statusCode}`));
    }
    if (!response.body.includes('Beta Testing')) {
      throw new Error(new Error('Page does not contain beta testing content'));
    }
    return `Beta download page accessible (${response.responseTime}ms)`;
  },

  async testSSLCertificate() {
    const response = await makeRequest(config.baseUrl);
    if (!response.headers['strict-transport-security']) {
      throw new Error(new Error('HSTS header not found'));
    }
    return 'SSL certificate and security headers valid';
  },

  async testResponseTimes() {
    const response = await makeRequest(config.baseUrl);
    if (response.responseTime > 5000) {
      throw new Error(new Error(`Page load too slow: ${response.responseTime}ms`));
    }
    return `Fast response time: ${response.responseTime}ms`;
  },

  async testMobileResponsive() {
    const response = await makeRequest(config.baseUrl);
    if (!response.body.includes('viewport')) {
      throw new Error(new Error('Mobile viewport meta tag not found'));
    }
    if (!response.body.includes('responsive') && !response.body.includes('mobile')) {
      // This is a soft check - many sites don't explicitly mention mobile
    }
    return 'Mobile viewport configuration detected';
  },

  async testMetaTags() {
    const response = await makeRequest(config.baseUrl);
    const body = response.body;
    
    const checks = [
      { tag: 'title', required: true },
      { tag: 'description', required: true },
      { tag: 'viewport', required: true }
    ];
    
    const missing = checks.filter(check => {
      if (check.tag === 'title') return !body.includes('<title>');
      return !body.includes(`name="${check.tag}"`);
    });
    
    if (missing.length > 0) {
      throw new Error(new Error(`Missing meta tags: ${missing.map(m => m.tag).join(', ')}`));
    }
    return 'Essential meta tags present';
  },

  async testFavicon() {
    try {
      const response = await makeRequest(`${config.baseUrl}/favicon.ico`);
      if (response.statusCode === 404) {
        throw new Error(new Error('Favicon not found'));
      }
      return 'Favicon accessible';
    } catch {
      // Try alternative paths
      const response = await makeRequest(`${config.baseUrl}/public/favicon.ico`);
      if (response.statusCode === 404) {
        throw new Error(new Error('Favicon not found in common locations'));
      }
      return 'Favicon accessible (alternative path)';
    }
  },

  async testRobotsTxt() {
    try {
      const response = await makeRequest(`${config.baseUrl}/robots.txt`);
      if (response.statusCode === 404) {
        throw new Error(new Error('robots.txt not found'));
      }
      return 'robots.txt accessible';
    } catch (error) {
      // robots.txt is optional but recommended
      throw new Error(new Error('robots.txt not accessible'));
    }
  },

  async testSitemap() {
    try {
      const response = await makeRequest(`${config.baseUrl}/sitemap.xml`);
      if (response.statusCode === 404) {
        throw new Error(new Error('sitemap.xml not found'));
      }
      return 'sitemap.xml accessible';
    } catch (error) {
      throw new Error(new Error('sitemap.xml not accessible'));
    }
  },

  async testContentIntegrity() {
    const response = await makeRequest(config.baseUrl);
    const body = response.body;
    
    const criticalContent = [
      'RinaWarp',
      'Terminal',
      'AI',
      'beta'
    ];
    
    const missing = criticalContent.filter(content => 
      !body.toLowerCase().includes(content.toLowerCase())
    );
    
    if (missing.length > 0) {
      throw new Error(new Error(`Missing critical content: ${missing.join(', ')}`));
    }
    return 'Critical content elements present';
  }
};

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive live site tests...\n');
  
  const testNames = Object.keys(tests);
  for (const testName of testNames) {
    await runTest(testName.replace('test', ''), tests[testName]);
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${testResults.passed}`);
  console.log(`   ❌ Failed: ${testResults.failed}`);
  console.log(`   📝 Total:  ${testResults.passed + testResults.failed}`);
  
  const successRate = (testResults.passed / (testResults.passed + testResults.failed) * 100).toFixed(1);
  console.log(`   📈 Success Rate: ${successRate}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(test => test.status === 'FAIL')
      .forEach(test => console.log(`   • ${test.name}: ${test.error}`));
  }
  
  if (testResults.passed > 0) {
    console.log('\n✅ Passed Tests:');
    testResults.tests
      .filter(test => test.status === 'PASS')
      .forEach(test => console.log(`   • ${test.name}: ${test.details}`));
  }
  
  // Overall status
  console.log('\n🎯 Overall Status:');
  if (testResults.failed === 0) {
    console.log('🌟 All tests passed! Live site is fully operational.');
  } else if (successRate >= 80) {
    console.log('✅ Site is operational with minor issues.');
  } else {
    console.log('⚠️  Site has significant issues that should be addressed.');
  }
  
  return testResults.failed === 0;
}

// Export for external use
module.exports = { runAllTests, config, testResults };

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
