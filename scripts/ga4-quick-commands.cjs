#!/usr/bin/env node

/**
 * GA4 Quick Commands - Fast Reference
 * One-command access to all GA4 setup tools
 */

const { exec } = require('child_process');

const command = process.argv[2];

const commands = {
  events: {
    description: 'Open GA4 Events page to mark conversions',
    url: 'https://analytics.google.com/analytics/web/#/p0/admin/events',
  },
  audiences: {
    description: 'Open GA4 Audiences page to create segments',
    url: 'https://analytics.google.com/analytics/web/#/p0/admin/audiences',
  },
  attribution: {
    description: 'Open GA4 Attribution settings',
    url: 'https://analytics.google.com/analytics/web/#/p0/admin/attribution-settings',
  },
  realtime: {
    description: 'Open GA4 Real-Time reports',
    url: 'https://analytics.google.com/analytics/web/#/p0/realtime/overview',
  },
  revenue: {
    description: 'Open GA4 Ecommerce reports',
    url: 'https://analytics.google.com/analytics/web/#/p0/reports/ecommerce-purchases',
  },
  all: {
    description: 'Open all GA4 setup pages',
    action: 'multiple',
  },
};

if (!command || !commands[command]) {
  console.log('🎯 GA4 Quick Commands - RinaWarp Terminal');
  console.log('=========================================');
  console.log('');
  console.log('Usage: node scripts/ga4-quick-commands.cjs [command]');
  console.log('');
  console.log('Available commands:');
  console.log('');

  Object.entries(commands).forEach(([cmd, info]) => {
    console.log(`  ${cmd.padEnd(12)} - ${info.description}`);
  });

  console.log('');
  console.log('Examples:');
  console.log('  node scripts/ga4-quick-commands.cjs events     # Open events page');
  console.log('  node scripts/ga4-quick-commands.cjs all       # Open all setup pages');
  console.log('  node scripts/ga4-quick-commands.cjs realtime  # Check real-time data');
  console.log('');
  process.exit(0);
}

console.log(`🎯 Opening GA4 ${command}...`);

if (command === 'all') {
  // Open all setup pages with delays
  const pages = ['events', 'audiences', 'attribution', 'realtime'];
  pages.forEach((page, index) => {
    setTimeout(() => {
      exec(`open "${commands[page].url}"`);
      console.log(`✅ Opened ${page} page`);
    }, index * 2000); // 2 second delays
  });
  console.log('Opening all GA4 setup pages with 2-second intervals...');
} else {
  exec(`open "${commands[command].url}"`);
  console.log(`✅ Opened ${commands[command].description}`);
}

console.log('');
console.log('💡 Quick Tips:');
console.log('• Mark events as conversions for revenue tracking');
console.log('• Create audiences for targeted analysis');
console.log('• Set attribution to "data-driven" for accuracy');
console.log('• Monitor real-time to verify events are firing');
