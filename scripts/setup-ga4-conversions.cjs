#!/usr/bin/env node

/**
 * Google Analytics 4 Conversion Goals & Audiences Setup
 * Automated CLI tool to configure GA4 for RinaWarp Terminal
 */

console.log('🌊 RinaWarp Terminal - GA4 Conversion & Audience Setup');
console.log('======================================================');
console.log('');

const TRACKING_ID = 'G-SZK23HMCVP';
const WEBSITE_URL = 'https://rinawarptech.com';

console.log(`📊 Property ID: ${TRACKING_ID}`);
console.log(`🌐 Website: ${WEBSITE_URL}`);
console.log('');

// Conversion Events Configuration
const conversionEvents = [
  {
    name: 'download',
    description: 'App Download (Any Platform)',
    category: 'conversion',
    value: 5.0,
    parameters: ['platform', 'version'],
  },
  {
    name: 'purchase',
    description: 'Subscription Purchase',
    category: 'revenue',
    value: 'dynamic',
    parameters: ['plan_type', 'amount', 'currency', 'transaction_id'],
  },
  {
    name: 'begin_trial',
    description: 'Trial Signup',
    category: 'conversion',
    value: 15.0,
    parameters: ['trial_plan', 'trial_duration'],
  },
  {
    name: 'sign_up',
    description: 'User Registration',
    category: 'conversion',
    value: 2.0,
    parameters: ['signup_method'],
  },
  {
    name: 'feature_activation',
    description: 'Feature First Use',
    category: 'engagement',
    value: 1.0,
    parameters: ['feature_name'],
  },
];

// Audience Definitions
const audiences = [
  {
    name: 'High Value Users',
    description: 'Users who purchased Professional plan or spent >$50',
    criteria: ['purchase event with value >= 29', 'or total revenue >= 50'],
  },
  {
    name: 'Trial Users - Not Converted',
    description: "Users who started trial but haven't purchased",
    criteria: [
      'begin_trial event exists',
      'and purchase event does not exist',
      'within last 30 days',
    ],
  },
  {
    name: 'macOS Users',
    description: 'Users who downloaded macOS version',
    criteria: ['download event with platform = macOS'],
  },
  {
    name: 'Windows Users',
    description: 'Users who downloaded Windows version',
    criteria: ['download event with platform = Windows'],
  },
  {
    name: 'Linux Users',
    description: 'Users who downloaded Linux version',
    criteria: ['download event with platform = Linux'],
  },
  {
    name: 'Feature Power Users',
    description: 'Users who actively use advanced features',
    criteria: ['feature_activation events >= 3', 'within last 7 days'],
  },
];

// Revenue Attribution Setup
const attributionSettings = {
  channels: [
    'Organic Search',
    'Direct',
    'Social Media',
    'Email Marketing',
    'Paid Search',
    'Referral',
  ],
  conversionWindows: {
    click: 90,
    view: 1,
  },
};

function displayConversionSetup() {
  console.log('🎯 1. CONVERSION GOALS SETUP');
  console.log('============================');
  console.log('');
  console.log('The following conversion events are configured in your code:');
  console.log('');

  conversionEvents.forEach((event, i) => {
    console.log(`${i + 1}. 📊 ${event.description}`);
    console.log(`   Event Name: ${event.name}`);
    console.log(`   Category: ${event.category}`);
    console.log(
      `   Value: ${event.value === 'dynamic' ? 'Dynamic (from purchase)' : `$${event.value}`}`
    );
    console.log(`   Parameters: ${event.parameters.join(', ')}`);
    console.log('');
  });

  console.log('✅ TO ACTIVATE IN GA4:');
  console.log('1. Go to: https://analytics.google.com/analytics/web/');
  console.log('2. Admin → Events → Create Event');
  console.log('3. Mark each event above as "Conversion"');
  console.log('4. Set up Enhanced Ecommerce for purchase events');
  console.log('');
}

function displayAudienceSetup() {
  console.log('👥 2. AUDIENCE DEFINITIONS');
  console.log('==========================');
  console.log('');

  audiences.forEach((audience, i) => {
    console.log(`${i + 1}. 🎯 ${audience.name}`);
    console.log(`   Description: ${audience.description}`);
    console.log('   Criteria:');
    audience.criteria.forEach(criteria => {
      console.log(`   - ${criteria}`);
    });
    console.log('');
  });

  console.log('✅ TO CREATE IN GA4:');
  console.log('1. Go to: https://analytics.google.com/analytics/web/');
  console.log('2. Admin → Audiences → Create Audience');
  console.log('3. Use "Custom" audience type');
  console.log('4. Configure conditions based on criteria above');
  console.log('');
}

function displayAttributionSetup() {
  console.log('📈 3. REVENUE ATTRIBUTION');
  console.log('=========================');
  console.log('');
  console.log('📊 Channel Groupings:');
  attributionSettings.channels.forEach(channel => {
    console.log(`   - ${channel}`);
  });
  console.log('');
  console.log('⏱️  Attribution Windows:');
  console.log(`   - Click-through: ${attributionSettings.conversionWindows.click} days`);
  console.log(`   - View-through: ${attributionSettings.conversionWindows.view} day`);
  console.log('');

  console.log('✅ TO CONFIGURE IN GA4:');
  console.log('1. Admin → Attribution Settings → Attribution Models');
  console.log('2. Set up Data-Driven Attribution');
  console.log('3. Configure conversion windows');
  console.log('4. Enable Google Ads linking for paid traffic');
  console.log('');
}

function generateGA4URLs() {
  console.log('🔗 QUICK ACCESS LINKS');
  console.log('=====================');
  console.log('');
  console.log('📊 Real-Time Reports:');
  console.log('https://analytics.google.com/analytics/web/#/p0/realtime/overview');
  console.log('');
  console.log('🎯 Conversions Setup:');
  console.log('https://analytics.google.com/analytics/web/#/p0/admin/events');
  console.log('');
  console.log('👥 Audiences Setup:');
  console.log('https://analytics.google.com/analytics/web/#/p0/admin/audiences');
  console.log('');
  console.log('📈 Attribution Settings:');
  console.log('https://analytics.google.com/analytics/web/#/p0/admin/attribution-models');
  console.log('');
  console.log('💰 Ecommerce Reports:');
  console.log('https://analytics.google.com/analytics/web/#/p0/reports/ecommerce-purchases');
  console.log('');
}

function showTestingCommands() {
  console.log('🧪 TESTING COMMANDS');
  console.log('===================');
  console.log('');
  console.log('Test conversion tracking in your browser console:');
  console.log('');
  console.log('// Test app download');
  console.log('gtag("event", "download", {');
  console.log('  platform: "macOS",');
  console.log('  version: "1.3.1"');
  console.log('});');
  console.log('');
  console.log('// Test trial signup');
  console.log('gtag("event", "begin_trial", {');
  console.log('  trial_plan: "Professional",');
  console.log('  trial_duration: "14_days"');
  console.log('});');
  console.log('');
  console.log('// Test purchase');
  console.log('gtag("event", "purchase", {');
  console.log('  transaction_id: "test_123",');
  console.log('  value: 29.00,');
  console.log('  currency: "USD",');
  console.log('  items: [{');
  console.log('    item_id: "rinawarp_professional",');
  console.log('    item_name: "RinaWarp Terminal Professional",');
  console.log('    price: 29.00,');
  console.log('    quantity: 1');
  console.log('  }]');
  console.log('});');
  console.log('');
}

// Run the setup guide
console.log('🚀 This guide will help you configure advanced GA4 features');
console.log('   for maximum revenue tracking and user insights.');
console.log('');

displayConversionSetup();
displayAudienceSetup();
displayAttributionSetup();
generateGA4URLs();
showTestingCommands();

console.log('🧜‍♀️ Your RinaWarp Terminal is ready for advanced analytics!');
console.log('');
console.log('💡 PRO TIP: Set up these configurations in order:');
console.log('1. First configure conversion events');
console.log('2. Then create audiences');
console.log('3. Finally set up attribution models');
console.log('');
console.log('📊 Data will start appearing within 24-48 hours of setup.');
