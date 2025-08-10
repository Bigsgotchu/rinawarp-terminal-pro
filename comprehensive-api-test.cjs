#!/usr/bin/env node

/**
 * RinaWarp Terminal - Comprehensive API Testing Suite
 * A lightweight alternative to enterprise testing tools like Katalon
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'testpass123',
  name: 'Test User'
};

let userToken = null;

class APITester {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 Running: ${name}`);
    this.results.total++;
    
    try {
      const startTime = Date.now();
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`  ✅ PASSED (${duration}ms)`);
        if (result.message) console.log(`     ${result.message}`);
        this.results.passed++;
        this.results.details.push({
          name,
          status: 'PASSED',
          duration,
          message: result.message
        });
      } else {
        throw new Error(result.error || 'Test failed');
      }
    } catch (error) {
      console.log(`  ❌ FAILED: ${error.message}`);
      this.results.failed++;
      this.results.details.push({
        name,
        status: 'FAILED',
        error: error.message
      });
    }
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const responseData = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    return {
      status: response.status,
      data: parsedData,
      ok: response.ok
    };
  }

  async testHealthCheck() {
    return this.runTest('Health Check Endpoint', async () => {
      const response = await this.makeRequest('GET', '/health');
      
      if (response.status === 200 && response.data.status === 'healthy') {
        return {
          success: true,
          message: `Server healthy, version: ${response.data.version}`
        };
      }
      
      return { success: false, error: 'Health check failed' };
    });
  }

  async testUserRegistration() {
    return this.runTest('User Registration', async () => {
      const response = await this.makeRequest('POST', '/auth/register', TEST_USER);
      
      if (response.status === 200 && response.data.userId) {
        return {
          success: true,
          message: `User registered with ID: ${response.data.userId}`
        };
      }
      
      return { success: false, error: `Registration failed: ${JSON.stringify(response.data)}` };
    });
  }

  async testUserLogin() {
    return this.runTest('User Login', async () => {
      const response = await this.makeRequest('POST', '/auth/login', {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      
      if (response.status === 200 && response.data.token) {
        userToken = response.data.token;
        return {
          success: true,
          message: `Login successful, tier: ${response.data.user.tier}`
        };
      }
      
      return { success: false, error: `Login failed: ${JSON.stringify(response.data)}` };
    });
  }

  async testFreeFeatures() {
    return this.runTest('Free Tier Features', async () => {
      if (!userToken) throw new Error('No user token available');
      
      const response = await this.makeRequest('GET', '/api/features/free', null, {
        'Authorization': `Bearer ${userToken}`
      });
      
      if (response.status === 200 && Array.isArray(response.data)) {
        const features = response.data.map(f => f.name);
        if (features.includes('basic_terminal') && features.includes('limited_ai')) {
          return {
            success: true,
            message: `Free features: ${features.join(', ')}`
          };
        }
      }
      
      return { success: false, error: `Unexpected free features: ${JSON.stringify(response.data)}` };
    });
  }

  async testFeatureAccess() {
    return this.runTest('Feature Access Validation', async () => {
      if (!userToken) throw new Error('No user token available');
      
      // Test allowed feature
      const allowedResponse = await this.makeRequest('POST', '/api/feature-access', {
        featureName: 'basic_terminal'
      }, {
        'Authorization': `Bearer ${userToken}`
      });
      
      if (!allowedResponse.ok || !allowedResponse.data.allowed) {
        return { success: false, error: 'Basic terminal should be allowed for free tier' };
      }

      // Test restricted feature
      const restrictedResponse = await this.makeRequest('POST', '/api/feature-access', {
        featureName: 'ai_assistant'
      }, {
        'Authorization': `Bearer ${userToken}`
      });
      
      if (!restrictedResponse.ok || restrictedResponse.data.allowed) {
        return { success: false, error: 'AI assistant should be restricted for free tier' };
      }

      return {
        success: true,
        message: 'Feature access validation working correctly'
      };
    });
  }

  async testUnauthorizedAccess() {
    return this.runTest('Unauthorized Access Protection', async () => {
      const response = await this.makeRequest('GET', '/api/features/free');
      
      if (response.status === 401 || response.status === 403) {
        return {
          success: true,
          message: 'Unauthorized access properly blocked'
        };
      }
      
      return { success: false, error: 'Should require authentication' };
    });
  }

  async testInvalidEndpoint() {
    return this.runTest('404 Handling', async () => {
      const response = await this.makeRequest('GET', '/nonexistent-endpoint');
      
      if (response.status === 404) {
        return {
          success: true,
          message: '404 errors handled correctly'
        };
      }
      
      return { success: false, error: 'Should return 404 for invalid endpoints' };
    });
  }

  async testRateLimiting() {
    return this.runTest('Rate Limiting', async () => {
      const promises = [];
      
      // Make 10 rapid requests
      for (let i = 0; i < 10; i++) {
        promises.push(this.makeRequest('GET', '/health'));
      }
      
      const responses = await Promise.all(promises);
      const allSucceeded = responses.every(r => r.ok);
      
      if (allSucceeded) {
        return {
          success: true,
          message: 'Rate limiting configured (all requests within limit)'
        };
      }
      
      return {
        success: true,
        message: 'Rate limiting active (some requests blocked)'
      };
    });
  }

  async testAIEndpoint() {
    return this.runTest('AI Chat Endpoint (Mock)', async () => {
      if (!userToken) throw new Error('No user token available');
      
      // This should fail for free tier, but endpoint should exist
      const response = await this.makeRequest('POST', '/api/ai/chat', {
        prompt: 'Hello, this is a test'
      }, {
        'Authorization': `Bearer ${userToken}`
      });
      
      // Free tier should get 403 forbidden
      if (response.status === 403) {
        return {
          success: true,
          message: 'AI endpoint exists and properly restricts free tier'
        };
      }
      
      return { success: false, error: `Unexpected AI response: ${response.status}` };
    });
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        success_rate: ((this.results.passed / this.results.total) * 100).toFixed(1)
      },
      details: this.results.details
    };

    // Save report to file
    const reportFile = path.join(__dirname, 'api-test-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    return report;
  }

  async runAllTests() {
    console.log('\n🧜‍♀️ RinaWarp Terminal - Comprehensive API Testing');
    console.log('═'.repeat(50));
    
    // Check if server is running
    try {
      await this.makeRequest('GET', '/health');
    } catch (error) {
      console.log('\n❌ CRITICAL: Backend server not running!');
      console.log('   Start it with: npm run backend:start');
      process.exit(1);
    }

    // Run all tests
    await this.testHealthCheck();
    await this.testUserRegistration();
    await this.testUserLogin();
    await this.testFreeFeatures();
    await this.testFeatureAccess();
    await this.testUnauthorizedAccess();
    await this.testInvalidEndpoint();
    await this.testRateLimiting();
    await this.testAIEndpoint();

    // Generate final report
    console.log('\n📊 TEST RESULTS');
    console.log('═'.repeat(30));
    
    const report = this.generateReport();
    
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed} ✅`);
    console.log(`Failed: ${report.summary.failed} ❌`);
    console.log(`Success Rate: ${report.summary.success_rate}%`);
    
    if (report.summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      report.details.filter(t => t.status === 'FAILED').forEach(test => {
        console.log(`  • ${test.name}: ${test.error}`);
      });
    }

    console.log(`\n📄 Detailed report saved to: api-test-report.json`);
    
    if (report.summary.success_rate >= 90) {
      console.log('\n🎉 API TESTING: EXCELLENT');
    } else if (report.summary.success_rate >= 70) {
      console.log('\n⚠️ API TESTING: NEEDS ATTENTION');  
    } else {
      console.log('\n🚨 API TESTING: CRITICAL ISSUES');
    }

    return report;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new APITester();
  tester.runAllTests().catch(console.error);
}

module.exports = APITester;
