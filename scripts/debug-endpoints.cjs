#!/usr/bin/env node

const axios = require('axios');

class EndpointDebugger {
  constructor() {
    this.endpoints = [
      {
        name: 'Main Landing Page',
        url: 'https://rinawarp-terminal.web.app/',
        expected: 200,
        critical: true,
      },
      {
        name: 'Pricing Page',
        url: 'https://rinawarp-terminal.web.app/pricing.html',
        expected: 200,
        critical: true,
      },
      {
        name: 'Pricing Page (Clean URL)',
        url: 'https://rinawarp-terminal.web.app/pricing',
        expected: [200, 301, 302],
        critical: true,
      },
      {
        name: 'Downloads Page',
        url: 'https://rinawarp-terminal.web.app/downloads.html',
        expected: 200,
        critical: true,
      },
      {
        name: 'Downloads Page (Clean URL)',
        url: 'https://rinawarp-terminal.web.app/downloads',
        expected: [200, 301, 302],
        critical: true,
      },
      {
        name: 'API Health',
        url: 'https://rinawarp-terminal.web.app/api/health',
        expected: 200,
        critical: true,
      },
      {
        name: 'API Download',
        url: 'https://rinawarp-terminal.web.app/api/download',
        expected: [200, 301, 302],
        critical: true,
      },
      {
        name: 'Case Studies',
        url: 'https://rinawarp-terminal.web.app/case-studies.html',
        expected: 200,
        critical: false,
      },
      {
        name: 'Beta Download',
        url: 'https://rinawarp-terminal.web.app/beta-download.html',
        expected: 200,
        critical: true,
      },
      {
        name: 'Docs',
        url: 'https://rinawarp-terminal.web.app/docs.html',
        expected: 200,
        critical: false,
      },
    ];
  }

  async testEndpoint(endpoint) {
    try {
      const startTime = Date.now();
      const response = await axios.get(endpoint.url, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true, // Accept all status codes
      });
      const responseTime = Date.now() - startTime;

      const expectedStatuses = Array.isArray(endpoint.expected)
        ? endpoint.expected
        : [endpoint.expected];
      const isHealthy = expectedStatuses.includes(response.status);

      return {
        name: endpoint.name,
        url: endpoint.url,
        status: response.status,
        responseTime,
        healthy: isHealthy,
        critical: endpoint.critical,
        headers: response.headers,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        server: response.headers['server'],
        redirected: response.request.res.responseUrl !== endpoint.url,
      };
    } catch (error) {
      return {
        name: endpoint.name,
        url: endpoint.url,
        status: 0,
        responseTime: 0,
        healthy: false,
        critical: endpoint.critical,
        error: error.message,
      };
    }
  }

  async runDiagnostics() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                              🔍 FIREBASE ENDPOINT DIAGNOSTICS                         ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
`);

    const results = [];

    for (const endpoint of this.endpoints) {
      console.log(`Testing ${endpoint.name}...`);
      const result = await this.testEndpoint(endpoint);
      results.push(result);

      if (result.healthy) {
        const perfIcon =
          result.responseTime < 500 ? '🚀' : result.responseTime < 1000 ? '⚡' : '🐌';
        const criticalIcon = result.critical ? '🔴' : '🟡';
        console.log(
          `✅ ${perfIcon} ${criticalIcon} ${result.name} - ${result.status} (${result.responseTime}ms)`
        );

        if (result.redirected) {
          console.log(`   🔄 Redirected to: ${result.url}`);
        }
      } else {
        console.log(
          `❌ ${result.name} - ${result.status} ${result.error ? `(${result.error})` : ''}`
        );
      }
    }

    console.log('\n📊 SUMMARY');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );

    const total = results.length;
    const healthy = results.filter(r => r.healthy).length;
    const criticalFailed = results.filter(r => r.critical && !r.healthy).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / total;

    console.log(`Total Endpoints: ${total}`);
    console.log(`Healthy: ${healthy} (${Math.round((healthy / total) * 100)}%)`);
    console.log(`Failed: ${total - healthy}`);
    console.log(`Critical Failed: ${criticalFailed}`);
    console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);

    if (criticalFailed > 0) {
      console.log('\n🚨 CRITICAL ISSUES DETECTED');
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      );

      results
        .filter(r => r.critical && !r.healthy)
        .forEach(result => {
          console.log(
            `💥 ${result.name}: ${result.status} ${result.error ? `- ${result.error}` : ''}`
          );
        });
    }

    console.log('\n🔧 RECOMMENDATIONS');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );

    if (criticalFailed > 0) {
      console.log(`🔴 ${criticalFailed} critical endpoints are failing - revenue impact detected!`);
      console.log('   Run: firebase deploy --only hosting');
      console.log('   Then: npm run monitor:revenue:start');
    } else {
      console.log('✅ All critical endpoints are healthy!');
      console.log('   Revenue pipeline is operational 💸');
    }

    return results;
  }
}

// CLI interface
async function main() {
  const endpointDebugger = new EndpointDebugger();
  await endpointDebugger.runDiagnostics();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = EndpointDebugger;
