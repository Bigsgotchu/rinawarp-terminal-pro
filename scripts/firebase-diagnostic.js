#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class FirebaseDiagnostic {
  constructor() {
    this.projectId = 'rinawarp-terminal';
    this.customDomain = 'rinawarptech.com';
    this.results = {};
  }

  async runCommand(command, description) {
    console.log(`\n🔍 ${description}`);
    console.log(`   Command: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command);
      console.log('✅ Success');
      if (stdout.trim()) {
        console.log(`   Output: ${stdout.trim()}`);
      }
      return { success: true, output: stdout.trim(), error: null };
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      return { success: false, output: null, error: error.message };
    }
  }

  async checkFirebaseAuth() {
    return await this.runCommand('firebase projects:list', 'Checking Firebase Authentication');
  }

  async checkProjectStatus() {
    return await this.runCommand(`firebase use ${this.projectId}`, 'Setting Active Project');
  }

  async checkHostingSites() {
    return await this.runCommand('firebase hosting:sites:list', 'Listing Hosting Sites');
  }

  async checkRecentDeployments() {
    return await this.runCommand('firebase hosting:channel:list', 'Checking Recent Deployments');
  }

  async checkDomainStatus() {
    console.log('\n🔍 Checking Custom Domain Status');
    console.log(`   Domain: ${this.customDomain}`);

    try {
      const { stdout } = await execAsync(`nslookup ${this.customDomain}`);
      console.log('✅ DNS Resolution Successful');
      console.log(`   ${stdout.trim()}`);
      return { success: true, output: stdout.trim() };
    } catch (error) {
      console.log(`❌ DNS Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async checkFirebaseConfig() {
    console.log('\n🔍 Checking Firebase Configuration');

    try {
      const fs = require('fs');
      const firebaseConfig = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
      console.log('✅ Firebase Config Found');
      console.log(`   Site: ${firebaseConfig.hosting.site}`);
      console.log(`   Public: ${firebaseConfig.hosting.public}`);
      console.log(
        `   Rewrites: ${firebaseConfig.hosting.rewrites ? firebaseConfig.hosting.rewrites.length : 0} rules`
      );
      return { success: true, config: firebaseConfig };
    } catch (error) {
      console.log(`❌ Config Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async checkBillingStatus() {
    return await this.runCommand('firebase projects:list', 'Checking Project Billing Status');
  }

  async generateDiagnosticReport() {
    console.log('📊 Generating Diagnostic Report...');

    const report = {
      timestamp: new Date().toISOString(),
      projectId: this.projectId,
      customDomain: this.customDomain,
      checks: this.results,
      recommendations: [],
    };

    // Add recommendations based on results
    if (!this.results.auth?.success) {
      report.recommendations.push('❌ Firebase authentication failed - run "firebase login"');
    }

    if (!this.results.config?.success) {
      report.recommendations.push('❌ Firebase config missing or invalid - check firebase.json');
    }

    if (!this.results.domain?.success) {
      report.recommendations.push('❌ Custom domain DNS issues - check domain configuration');
    }

    if (this.results.auth?.success && this.results.config?.success) {
      report.recommendations.push(
        '✅ Basic configuration looks good - check Firebase Console for hosting issues'
      );
      report.recommendations.push(
        '🔗 Firebase Console: https://console.firebase.google.com/project/rinawarp-terminal/hosting'
      );
    }

    require('fs').writeFileSync('firebase-diagnostic-report.json', JSON.stringify(report, null, 2));
    console.log('📁 Diagnostic report saved to firebase-diagnostic-report.json');

    return report;
  }

  async runFullDiagnostic() {
    console.log('🚀 Firebase Deployment Diagnostic');
    console.log('=====================================\n');

    // Run all checks
    this.results.auth = await this.checkFirebaseAuth();
    this.results.project = await this.checkProjectStatus();
    this.results.sites = await this.checkHostingSites();
    this.results.deployments = await this.checkRecentDeployments();
    this.results.domain = await this.checkDomainStatus();
    this.results.config = await this.checkFirebaseConfig();
    this.results.billing = await this.checkBillingStatus();

    // Generate report
    const report = await this.generateDiagnosticReport();

    console.log('\n📋 DIAGNOSTIC SUMMARY');
    console.log('=====================================');

    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   ${rec}`));
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Review the diagnostic report: firebase-diagnostic-report.json');
    console.log(
      '2. Check Firebase Console: https://console.firebase.google.com/project/rinawarp-terminal/hosting'
    );
    console.log('3. Look for any warnings or errors in the hosting section');
    console.log('4. Verify custom domain is properly connected');
    console.log('5. Run the monitoring script to track when deployment goes live');

    return report;
  }
}

// Run diagnostic
const diagnostic = new FirebaseDiagnostic();
diagnostic.runFullDiagnostic().catch(console.error);
