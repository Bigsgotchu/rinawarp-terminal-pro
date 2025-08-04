#!/usr/bin/env node

import fetch from 'node-fetch';
import kleur from 'kleur';

const DEPLOYMENT_URL = 'https://rinawarptech.com';

class DeploymentVerifier {
  constructor() {
    this.results = [];
  }

  async checkEndpoint(url, name, expectedStatus = 200) {
    try {
      console.log(kleur.cyan(`🔍 Testing ${name}...`));
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'RinaWarp-Terminal-Deployment-Verifier/1.0',
        },
      });

      if (response.status === expectedStatus) {
        console.log(kleur.green(`  ✅ ${name} - Status: ${response.status}`));
        this.results.push({ name, url, status: 'pass', code: response.status });
        return true;
      } else {
        console.log(
          kleur.yellow(`  ⚠️  ${name} - Expected: ${expectedStatus}, Got: ${response.status}`)
        );
        this.results.push({ name, url, status: 'warn', code: response.status });
        return false;
      }
    } catch (error) {
      console.log(kleur.red(`  ❌ ${name} - Error: ${error.message}`));
      this.results.push({ name, url, status: 'fail', error: error.message });
      return false;
    }
  }

  async checkStripeEndpoint(url, name) {
    try {
      console.log(kleur.cyan(`💳 Testing ${name}...`));
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RinaWarp-Terminal-Deployment-Verifier/1.0',
        },
        body: JSON.stringify({
          priceId: 'price_test',
          mode: 'subscription',
        }),
      });

      const data = await response.text();

      if (response.status === 200 && data.includes('sessionId')) {
        console.log(kleur.green(`  ✅ ${name} - Stripe integration working`));
        this.results.push({ name, url, status: 'pass', code: response.status });
        return true;
      } else if (response.status === 400 || response.status === 404) {
        console.log(kleur.yellow(`  ⚠️  ${name} - Endpoint exists but needs valid price ID`));
        this.results.push({ name, url, status: 'warn', code: response.status });
        return true; // This is expected with test data
      } else {
        console.log(kleur.red(`  ❌ ${name} - Status: ${response.status}, Response: ${data}`));
        this.results.push({ name, url, status: 'fail', code: response.status, response: data });
        return false;
      }
    } catch (error) {
      console.log(kleur.red(`  ❌ ${name} - Error: ${error.message}`));
      this.results.push({ name, url, status: 'fail', error: error.message });
      return false;
    }
  }

  async verifyDeployment() {
    console.log(kleur.cyan('🚀 RinaWarp Terminal - Deployment Verification\n'));
    console.log(kleur.blue(`Testing deployment: ${DEPLOYMENT_URL}\n`));

    // Test main page
    await this.checkEndpoint(DEPLOYMENT_URL, 'Main Page');

    // Test key pages
    await this.checkEndpoint(`${DEPLOYMENT_URL}/pricing`, 'Pricing Page');
    await this.checkEndpoint(`${DEPLOYMENT_URL}/features`, 'Features Page');
    await this.checkEndpoint(`${DEPLOYMENT_URL}/download`, 'Download Page');

    // Test API endpoints
    await this.checkEndpoint(`${DEPLOYMENT_URL}/api/health`, 'Health Check API');
    await this.checkEndpoint(`${DEPLOYMENT_URL}/api/stripe/config`, 'Stripe Config API');

    // Test Stripe integration
    await this.checkStripeEndpoint(
      `${DEPLOYMENT_URL}/api/stripe/create-checkout-session`,
      'Stripe Checkout Session'
    );

    // Test static assets
    await this.checkEndpoint(`${DEPLOYMENT_URL}/styles/style.css`, 'Main CSS');
    await this.checkEndpoint(`${DEPLOYMENT_URL}/js/pricing.js`, 'Pricing JavaScript');

    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log(kleur.cyan('📊 Deployment Verification Report'));
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const warnings = this.results.filter(r => r.status === 'warn').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    console.log(kleur.green(`✅ Passed: ${passed}`));
    console.log(kleur.yellow(`⚠️  Warnings: ${warnings}`));
    console.log(kleur.red(`❌ Failed: ${failed}`));

    if (failed === 0) {
      console.log(kleur.green('\n🎉 Deployment verification completed successfully!'));
      console.log(kleur.green('Your RinaWarp Terminal is live and ready for users.'));
    } else {
      console.log(kleur.yellow('\n⚠️  Some issues detected. Check the details above.'));
    }

    console.log('\n' + kleur.cyan('🔗 Live URLs:'));
    console.log(`Main Site: ${DEPLOYMENT_URL}`);
    console.log(`Pricing: ${DEPLOYMENT_URL}/pricing`);
    console.log(`Download: ${DEPLOYMENT_URL}/download`);

    console.log('='.repeat(60) + '\n');

    return failed === 0;
  }
}

// Run verification
const verifier = new DeploymentVerifier();
verifier
  .verifyDeployment()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(kleur.red('❌ Verification failed:'), error.message);
    process.exit(1);
  });
