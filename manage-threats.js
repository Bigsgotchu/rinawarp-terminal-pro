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
  switch (command) {
    case 'stats':
      showStats();
      break;

    case 'block':
      if (args.length < 2) {
        process.exit(1);
      }
      blockIP(args[0], args[1], args[2] ? parseInt(args[2]) : 1);
      break;

    case 'unblock':
      if (args.length < 1) {
        process.exit(1);
      }
      unblockIP(args[0]);
      break;

    case 'list':
      listBlockedIPs();
      break;

    case 'whitelist':
      if (args.length < 1) {
        process.exit(1);
      }
      addToWhitelist(args[0]);
      break;

    case 'test':
      if (args.length < 1) {
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

  if (stats.topBlockReasons.length > 0) {
    stats.topBlockReasons.forEach((_reason, _index) => {
      // TODO: Display block reasons
    });
  }

  if (stats.recentActivity.length > 0) {
    stats.recentActivity.forEach((activity, _index) => {
      const _lastSeen = new Date(activity.lastSeen).toLocaleString();
    });
  }
}

function blockIP(ip, reason, hours) {
  const duration = hours * 60 * 60 * 1000; // Convert hours to milliseconds
  threatDetector.manualBlock(ip, reason, duration);
  console.log(`✅ Blocked ${ip} for ${hours} hours: ${reason}`);

  // Immediately add those scanner IPs you mentioned
  if (ip === '172.70.250.24' || ip === '162.158.111.31') {
  }
}

function unblockIP(ip) {
  const success = threatDetector.unblockIP(ip);
  if (success) {
  } else {
    console.log(`❌ IP ${ip} was not found in blocklist`);
  }
}

function listBlockedIPs() {
  const now = Date.now();
  let activeBlocks = 0;

  for (const [_ip, blockInfo] of threatDetector.blockedIPs.entries()) {
    if (blockInfo.expiresAt > now) {
      const _expiresIn = Math.round((blockInfo.expiresAt - now) / (60 * 60 * 1000));
      const _blockedAt = new Date(blockInfo.blockedAt).toLocaleString();

      activeBlocks++;
    }
  }

  if (activeBlocks === 0) {
  }
}

function addToWhitelist(ip) {
  threatDetector.whitelist.add(ip);
  console.log(`✅ Added ${ip} to whitelist (bypasses all threat detection)`);
  console.log('⚠️  Note: This is temporary. To make permanent, add to ThreatDetector config.');
}

function testThreatDetection(url, userAgent) {
  const testIP = '192.168.1.999'; // Fake IP for testing
  const threatLevel = threatDetector.analyzeRequest(testIP, url, userAgent, 'GET');

  if (threatLevel === 0) {
  } else if (threatLevel < 2) {
  } else if (threatLevel < 3) {
  } else if (threatLevel < 5) {
  } else {
  }
}

function showHelp() {}

// Run the CLI
main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
