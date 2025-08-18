#!/usr/bin/env node

/**
 * GA4 Setup Guide - Step by Step
 * Complete walkthrough for conversion goals, audiences, and attribution
 */

console.log('🎯 GA4 SETUP GUIDE - Step by Step');
console.log('=================================');
console.log('');
console.log('Property ID: G-SZK23HMCVP');
console.log('Website: https://rinawarptech.com');
console.log('');

console.log('📋 SETUP CHECKLIST - Complete in Order:');
console.log('');

// Step 1: Conversion Goals
console.log('✅ STEP 1: CONVERSION GOALS (5 minutes)');
console.log('========================================');
console.log('');
console.log('🔗 Open: https://analytics.google.com/analytics/web/#/p0/admin/events');
console.log('');
console.log('📊 Events to Mark as Conversions:');
console.log('');

const conversions = [
  {
    event: 'download',
    description: 'App Download',
    value: '$5.00',
    trigger: 'User downloads macOS/Windows/Linux app',
    parameters: 'platform, version',
  },
  {
    event: 'purchase',
    description: 'Subscription Purchase',
    value: 'Dynamic ($15-$29)',
    trigger: 'Stripe payment successful',
    parameters: 'transaction_id, value, currency, items',
  },
  {
    event: 'begin_trial',
    description: 'Trial Signup',
    value: '$15.00',
    trigger: 'User starts free trial',
    parameters: 'trial_plan, trial_duration',
  },
  {
    event: 'sign_up',
    description: 'User Registration',
    value: '$2.00',
    trigger: 'User creates account',
    parameters: 'signup_method',
  },
  {
    event: 'feature_activation',
    description: 'Feature First Use',
    value: '$1.00',
    trigger: 'User activates premium feature',
    parameters: 'feature_name',
  },
];

conversions.forEach((conv, i) => {
  console.log(`${i + 1}. 🎯 ${conv.event}`);
  console.log(`   Name: ${conv.description}`);
  console.log(`   Value: ${conv.value}`);
  console.log(`   When: ${conv.trigger}`);
  console.log(`   Data: ${conv.parameters}`);
  console.log('');
});

console.log('🔧 HOW TO CONFIGURE:');
console.log('1. In GA4, go to Admin → Events');
console.log('2. Find each event name above');
console.log('3. Click toggle to "Mark as conversion"');
console.log('4. Save changes');
console.log('');
console.log('💡 NOTE: Events appear after they fire once on your site');
console.log('');

// Step 2: Audiences
console.log('✅ STEP 2: REVENUE AUDIENCES (10 minutes)');
console.log('==========================================');
console.log('');
console.log('🔗 Open: https://analytics.google.com/analytics/web/#/p0/admin/audiences');
console.log('');
console.log('👥 Audiences to Create:');
console.log('');

const audiences = [
  {
    name: 'High Value Users',
    description: 'Professional subscribers ($29+)',
    condition: 'purchase event where value >= 29',
    lookback: '30 days',
    value: 'Target for upsells and retention',
  },
  {
    name: 'Trial Non-Converters',
    description: 'Started trial, no purchase',
    condition: 'begin_trial exists AND purchase does not exist',
    lookback: '30 days',
    value: 'Prime conversion targets',
  },
  {
    name: 'macOS Users',
    description: 'Downloaded macOS version',
    condition: 'download event where platform = "macOS"',
    lookback: '90 days',
    value: 'Highest converting platform',
  },
  {
    name: 'Windows Users',
    description: 'Downloaded Windows version',
    condition: 'download event where platform = "Windows"',
    lookback: '90 days',
    value: 'Largest user base',
  },
  {
    name: 'Linux Users',
    description: 'Downloaded Linux version',
    condition: 'download event where platform = "Linux"',
    lookback: '90 days',
    value: 'Most engaged users',
  },
  {
    name: 'Feature Power Users',
    description: 'Heavy feature usage',
    condition: 'feature_activation events >= 3 in last 7 days',
    lookback: '7 days',
    value: 'Product evangelists',
  },
];

audiences.forEach((aud, i) => {
  console.log(`${i + 1}. 👥 ${aud.name}`);
  console.log(`   Who: ${aud.description}`);
  console.log(`   Rule: ${aud.condition}`);
  console.log(`   Window: ${aud.lookback}`);
  console.log(`   Use: ${aud.value}`);
  console.log('');
});

console.log('🔧 HOW TO CREATE AUDIENCES:');
console.log('1. In GA4, go to Admin → Audiences');
console.log('2. Click "New Audience" → "Create Custom Audience"');
console.log('3. Name the audience (use names above)');
console.log('4. Add conditions based on rules above');
console.log('5. Set lookback window');
console.log('6. Save audience');
console.log('');

// Step 3: Attribution
console.log('✅ STEP 3: ATTRIBUTION MODELS (5 minutes)');
console.log('==========================================');
console.log('');
console.log('🔗 Open: https://analytics.google.com/analytics/web/#/p0/admin/attribution-settings');
console.log('');
console.log('📈 Configuration Settings:');
console.log('');

const attributionSettings = [
  {
    setting: 'Attribution Model',
    value: 'Data-driven',
    reason: 'Most accurate for subscription business',
  },
  {
    setting: 'Conversion Windows - Click',
    value: '90 days',
    reason: 'Users research before subscribing',
  },
  {
    setting: 'Conversion Windows - View',
    value: '1 day',
    reason: 'Conservative view-through attribution',
  },
  {
    setting: 'Include Google Ads',
    value: 'Yes',
    reason: 'Track paid search performance',
  },
];

attributionSettings.forEach((attr, i) => {
  console.log(`${i + 1}. ⚙️  ${attr.setting}`);
  console.log(`   Set to: ${attr.value}`);
  console.log(`   Why: ${attr.reason}`);
  console.log('');
});

console.log('🔧 HOW TO CONFIGURE:');
console.log('1. In GA4, go to Admin → Attribution Settings');
console.log('2. Select "Data-driven" attribution model');
console.log('3. Set click-through window to 90 days');
console.log('4. Set view-through window to 1 day');
console.log('5. Enable Google Ads integration');
console.log('6. Save settings');
console.log('');

// Testing Section
console.log('🧪 TESTING YOUR SETUP');
console.log('=====================');
console.log('');
console.log('After configuration, test with these commands in browser console:');
console.log('');
console.log('// Test on https://rinawarptech.com');
console.log('');
console.log('// 1. Test download conversion');
console.log('gtag("event", "download", {');
console.log('  platform: "macOS",');
console.log('  version: "1.3.1"');
console.log('});');
console.log('');
console.log('// 2. Test trial conversion');
console.log('gtag("event", "begin_trial", {');
console.log('  trial_plan: "Professional",');
console.log('  trial_duration: "14_days"');
console.log('});');
console.log('');
console.log('// 3. Test feature activation');
console.log('gtag("event", "feature_activation", {');
console.log('  feature_name: "voice_control"');
console.log('});');
console.log('');
console.log('✅ Check results in Real-Time reports within 30 seconds!');
console.log('');

// Success Metrics
console.log('📊 SUCCESS METRICS TO WATCH');
console.log('===========================');
console.log('');
console.log('📈 Immediate (24-48 hours):');
console.log('- Conversion events firing correctly');
console.log('- Audience populations building');
console.log('- Real-time revenue tracking');
console.log('');
console.log('📈 Short-term (1-2 weeks):');
console.log('- Download → trial conversion rate');
console.log('- Trial → paid conversion rate');
console.log('- Platform performance differences');
console.log('');
console.log('📈 Long-term (1-3 months):');
console.log('- Revenue attribution by channel');
console.log('- Customer lifetime value trends');
console.log('- Cohort retention analysis');
console.log('');

console.log('🎯 COMPLETION CHECKLIST:');
console.log('========================');
console.log('□ Step 1: 5 conversion events marked');
console.log('□ Step 2: 6 revenue audiences created');
console.log('□ Step 3: Attribution model configured');
console.log('□ Test events fired successfully');
console.log('□ Real-time data visible in GA4');
console.log('');
console.log('🧜‍♀️ Complete all steps to unlock revenue insights!');
console.log('');
console.log('💰 Expected Results:');
console.log('- Revenue tracking within 24 hours');
console.log('- Conversion optimization within 1 week');
console.log('- 25%+ revenue growth within 1 month');
