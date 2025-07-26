#!/usr/bin/env node

/**
 * RinaWarp Terminal - Threat Management CLI
 * Quick command-line tool for managing the threat detection system
 */

import ThreatDetector from './src/security/ThreatDetector.js';

const threatDetector = new ThreatDetector();

// Parse command line arguments
const [, , command, ...args] = process.argv;

async function main() {
  console.log('🛡️ RinaWarp Terminal Threat Management CLI');
  console.log('='.repeat(50));

  switch (command) {
  case 'stats':
    showStats();
    break;

  case 'block':
    if (args.length < 2) {
      console.log('Usage: node manage-threats.js block <IP> <reason> [duration_hours]');
      console.log('Example: node manage-threats.js block 192.168.1.100 "WordPress scanner" 24');
      process.exit(1);
    }
    blockIP(args[0], args[1], args[2] ? parseInt(args[2]) : 1);
    break;

  case 'unblock':
    if (args.length < 1) {
      console.log('Usage: node manage-threats.js unblock <IP>');
      console.log('Example: node manage-threats.js unblock 192.168.1.100');
      process.exit(1);
    }
    unblockIP(args[0]);
    break;

  case 'list':
    listBlockedIPs();
    break;

  case 'whitelist':
    if (args.length < 1) {
      console.log('Usage: node manage-threats.js whitelist <IP>');
      console.log('Example: node manage-threats.js whitelist 192.168.1.100');
      process.exit(1);
    }
    addToWhitelist(args[0]);
    break;

  case 'test':
    if (args.length < 1) {
      console.log('Usage: node manage-threats.js test <URL> [user-agent]');
      console.log(
        'Example: node manage-threats.js test "/wp-admin/setup-config.php" "curl/7.68.0"'
      );
      process.exit(1);
    }
    testThreatDetection(args[0], args[1] || 'test-agent');
    break;

  case 'help':
  default:
    showHelp();
    break;
  }
}

function showStats() {
  const stats = threatDetector.getStats();

  console.log('📊 Current Statistics:');
  console.log(`   Active Blocks: ${stats.activeBlocks}`);
  console.log(`   Total Blocks: ${stats.totalBlocks}`);
  console.log(`   Tracked IPs: ${stats.trackedIPs}`);

  if (stats.topBlockReasons.length > 0) {
    console.log('\n🏆 Top Block Reasons:');
    stats.topBlockReasons.forEach((reason, index) => {
      console.log(`   ${index + 1}. ${reason.reason} (${reason.count})`);
    });
  }

  if (stats.recentActivity.length > 0) {
    console.log('\n⏰ Recent Activity (last hour):');
    stats.recentActivity.forEach((activity, index) => {
      const lastSeen = new Date(activity.lastSeen).toLocaleString();
      console.log(`   ${index + 1}. ${activity.ip} - ${activity.attempts} attempts (${lastSeen})`);
    });
  }
}

function blockIP(ip, reason, hours) {
  const duration = hours * 60 * 60 * 1000; // Convert hours to milliseconds
  threatDetector.manualBlock(ip, reason, duration);
  console.log(`✅ Blocked ${ip} for ${hours} hours: ${reason}`);

  // Immediately add those scanner IPs you mentioned
  if (ip === '172.70.250.24' || ip === '162.158.111.31') {
    console.log('🎯 Added known WordPress scanner to blocklist');
  }
}

function unblockIP(ip) {
  const success = threatDetector.unblockIP(ip);
  if (success) {
    console.log(`✅ Unblocked ${ip}`);
  } else {
    console.log(`❌ IP ${ip} was not found in blocklist`);
  }
}

function listBlockedIPs() {
  console.log('🚫 Currently Blocked IPs:');

  const now = Date.now();
  let activeBlocks = 0;

  for (const [ip, blockInfo] of threatDetector.blockedIPs.entries()) {
    if (blockInfo.expiresAt > now) {
      const expiresIn = Math.round((blockInfo.expiresAt - now) / (60 * 60 * 1000));
      const blockedAt = new Date(blockInfo.blockedAt).toLocaleString();

      console.log(`   🔒 ${ip}`);
      console.log(`      Reason: ${blockInfo.reason}`);
      console.log(`      Blocked: ${blockedAt}`);
      console.log(`      Expires: ${expiresIn}h`);
      console.log(`      Attempts: ${blockInfo.attempts}`);
      console.log('');

      activeBlocks++;
    }
  }

  if (activeBlocks === 0) {
    console.log('   No active blocks');
  }

  console.log(`Total: ${activeBlocks} active blocks`);
}

function addToWhitelist(ip) {
  threatDetector.whitelist.add(ip);
  console.log(`✅ Added ${ip} to whitelist (bypasses all threat detection)`);
  console.log('⚠️  Note: This is temporary. To make permanent, add to ThreatDetector config.');
}

function testThreatDetection(url, userAgent) {
  console.log('🧪 Testing Threat Detection:');
  console.log(`   URL: ${url}`);
  console.log(`   User-Agent: ${userAgent}`);

  const testIP = '192.168.1.999'; // Fake IP for testing
  const threatLevel = threatDetector.analyzeRequest(testIP, url, userAgent, 'GET');

  console.log('\n📊 Results:');
  console.log(`   Threat Level: ${threatLevel}`);

  if (threatLevel === 0) {
    console.log('   🟢 No threat detected');
  } else if (threatLevel < 2) {
    console.log('   🟡 Low threat - logged only');
  } else if (threatLevel < 3) {
    console.log('   🟠 Medium threat - would be blocked after repeat offenses');
  } else if (threatLevel < 5) {
    console.log('   🔴 High threat - would be blocked immediately');
  } else {
    console.log('   💀 Critical threat - would be blocked immediately with severe duration');
  }
}

function showHelp() {
  console.log('Available commands:');
  console.log('');
  console.log('  stats          - Show current threat detection statistics');
  console.log('  block <IP> <reason> [hours] - Manually block an IP');
  console.log('  unblock <IP>   - Remove IP from blocklist');
  console.log('  list           - List all currently blocked IPs');
  console.log('  whitelist <IP> - Add IP to whitelist (bypasses detection)');
  console.log('  test <URL> [UA] - Test threat detection on a URL');
  console.log('  help           - Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node manage-threats.js block 172.70.250.24 "WordPress scanner" 24');
  console.log('  node manage-threats.js test "/wp-admin/setup-config.php"');
  console.log('  node manage-threats.js stats');
  console.log('  node manage-threats.js list');
}

// Run the CLI
main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
