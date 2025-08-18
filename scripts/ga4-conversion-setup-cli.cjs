#!/usr/bin/env node

/**
 * GA4 Conversion Setup CLI Guide
 * Interactive step-by-step conversion configuration
 */

const readline = require('readline');
const { exec } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

console.log('🎯 GA4 CONVERSION SETUP - Interactive CLI Guide');
console.log('===============================================');
console.log('');
console.log('Property: G-SZK23HMCVP');
console.log('Website: https://rinawarptech.com');
console.log('');

// Step 1: Mark Conversions
async function markConversionsAsSteps() {
  console.log('✅ STEP 1: MARK EVENTS AS CONVERSIONS (5 minutes)');
  console.log('=================================================');
  console.log('');

  const conversions = [
    { name: 'download', description: 'App Download', value: '$5.00' },
    { name: 'purchase', description: 'Subscription Purchase', value: 'Dynamic' },
    { name: 'begin_trial', description: 'Trial Signup', value: '$15.00' },
    { name: 'sign_up', description: 'User Registration', value: '$2.00' },
    { name: 'feature_activation', description: 'Feature First Use', value: '$1.00' },
  ];

  console.log('🔗 Opening GA4 Events page...');
  exec('open "https://analytics.google.com/analytics/web/#/p0/admin/events"');

  await ask('\nPress ENTER when GA4 Events page is loaded...');
  console.log('');

  console.log('📋 CONVERSION EVENTS CHECKLIST:');
  console.log('================================');
  console.log('');

  for (let i = 0; i < conversions.length; i++) {
    const conv = conversions[i];
    console.log(`${i + 1}. 🎯 Event: "${conv.name}"`);
    console.log(`   Description: ${conv.description}`);
    console.log(`   Value: ${conv.value}`);
    console.log('');
    console.log('   INSTRUCTIONS:');
    console.log(`   • Look for "${conv.name}" in the Events list`);
    console.log('   • If you see it, click the toggle to "Mark as conversion"');
    console.log("   • If you don't see it, the event hasn't fired yet (normal)");
    console.log('');

    const completed = await ask(
      `   ✅ Found and marked "${conv.name}" as conversion? (y/n/skip): `
    );

    if (completed.toLowerCase() === 'y') {
      console.log(`   ✅ SUCCESS: "${conv.name}" marked as conversion!`);
    } else if (completed.toLowerCase() === 'skip') {
      console.log(`   ⏭️  SKIPPED: "${conv.name}" - will appear after first event fires`);
    } else {
      console.log(`   ⏳ PENDING: "${conv.name}" - check again after events fire`);
    }
    console.log('');
  }

  console.log('💡 NOTE: Events only appear in this list AFTER they fire once.');
  console.log('   Run test events on your website to see them appear here.');
  console.log('');

  const allDone = await ask('🎯 All available events marked as conversions? (y/n): ');
  if (allDone.toLowerCase() === 'y') {
    console.log('✅ STEP 1 COMPLETE: Conversion events configured!');
  } else {
    console.log('📝 STEP 1 PARTIAL: Continue marking events as they appear');
  }
  console.log('');
}

// Step 2: Create Audiences
async function createAudiencesSteps() {
  console.log('✅ STEP 2: CREATE REVENUE AUDIENCES (10 minutes)');
  console.log('================================================');
  console.log('');

  const audiences = [
    {
      name: 'High Value Users',
      description: 'Professional plan subscribers ($29+)',
      condition: 'Include users when: Event > purchase > value >= 29',
      lookback: '30 days',
    },
    {
      name: 'Trial Non-Converters',
      description: 'Started trial but no purchase',
      condition: 'Include: begin_trial exists, Exclude: purchase exists',
      lookback: '30 days',
    },
    {
      name: 'macOS Users',
      description: 'Downloaded macOS version',
      condition: 'Include users when: Event > download > platform = macOS',
      lookback: '90 days',
    },
    {
      name: 'Windows Users',
      description: 'Downloaded Windows version',
      condition: 'Include users when: Event > download > platform = Windows',
      lookback: '90 days',
    },
    {
      name: 'Linux Users',
      description: 'Downloaded Linux version',
      condition: 'Include users when: Event > download > platform = Linux',
      lookback: '90 days',
    },
    {
      name: 'Feature Power Users',
      description: 'Heavy feature usage',
      condition: 'Include users when: Event > feature_activation > count >= 3',
      lookback: '7 days',
    },
  ];

  console.log('🔗 Opening GA4 Audiences page...');
  exec('open "https://analytics.google.com/analytics/web/#/p0/admin/audiences"');

  await ask('\nPress ENTER when GA4 Audiences page is loaded...');
  console.log('');

  for (let i = 0; i < audiences.length; i++) {
    const aud = audiences[i];
    console.log(`${i + 1}. 👥 Creating: "${aud.name}"`);
    console.log(`   Description: ${aud.description}`);
    console.log('');
    console.log('   STEP-BY-STEP INSTRUCTIONS:');
    console.log('   1. Click "New audience" button');
    console.log('   2. Click "Create a custom audience"');
    console.log(`   3. Name: "${aud.name}"`);
    console.log(`   4. Description: "${aud.description}"`);
    console.log(`   5. Membership duration: ${aud.lookback}`);
    console.log('   6. Add condition:');
    console.log(`      ${aud.condition}`);
    console.log('   7. Click "Save"');
    console.log('');

    await ask('   Press ENTER to start creating this audience...');

    const created = await ask(`   ✅ Successfully created "${aud.name}" audience? (y/n): `);

    if (created.toLowerCase() === 'y') {
      console.log(`   ✅ SUCCESS: "${aud.name}" audience created!`);
    } else {
      console.log(`   ⏳ RETRY: "${aud.name}" - try again if needed`);
    }
    console.log('');
  }

  const allAudiencesDone = await ask('👥 All 6 audiences created successfully? (y/n): ');
  if (allAudiencesDone.toLowerCase() === 'y') {
    console.log('✅ STEP 2 COMPLETE: Revenue audiences configured!');
  } else {
    console.log('📝 STEP 2 PARTIAL: Continue creating remaining audiences');
  }
  console.log('');
}

// Step 3: Attribution Models
async function configureAttributionSteps() {
  console.log('✅ STEP 3: CONFIGURE ATTRIBUTION MODELS (5 minutes)');
  console.log('===================================================');
  console.log('');

  const settings = [
    {
      setting: 'Attribution model',
      value: 'Data-driven',
      instruction: 'Select "Data-driven" from dropdown',
    },
    {
      setting: 'Lookback window - Clicks',
      value: '90 days',
      instruction: 'Set clicks lookback to 90 days',
    },
    {
      setting: 'Lookback window - Views',
      value: '1 day',
      instruction: 'Set views lookback to 1 day',
    },
  ];

  console.log('🔗 Opening GA4 Attribution Settings...');
  exec('open "https://analytics.google.com/analytics/web/#/p0/admin/attribution-settings"');

  await ask('\nPress ENTER when Attribution Settings page is loaded...');
  console.log('');

  console.log('🎯 ATTRIBUTION CONFIGURATION:');
  console.log('=============================');
  console.log('');

  for (let i = 0; i < settings.length; i++) {
    const setting = settings[i];
    console.log(`${i + 1}. ⚙️  ${setting.setting}`);
    console.log(`   Set to: ${setting.value}`);
    console.log(`   How: ${setting.instruction}`);
    console.log('');

    const configured = await ask(
      `   ✅ Configured "${setting.setting}" to "${setting.value}"? (y/n): `
    );

    if (configured.toLowerCase() === 'y') {
      console.log(`   ✅ SUCCESS: ${setting.setting} configured!`);
    } else {
      console.log(`   ⏳ PENDING: ${setting.setting} - please configure`);
    }
    console.log('');
  }

  const saveSettings = await ask(
    '💾 Click "Save" in GA4 to save attribution settings (y when done): '
  );
  if (saveSettings.toLowerCase() === 'y') {
    console.log('✅ STEP 3 COMPLETE: Attribution models configured!');
  }
  console.log('');
}

// Final verification
async function finalVerification() {
  console.log('🎉 SETUP COMPLETION VERIFICATION');
  console.log('================================');
  console.log('');

  const checks = [
    'Conversion events marked (those that have fired)',
    'Revenue audiences created (6 total)',
    'Attribution model set to data-driven',
    'Lookback windows configured (90 days clicks, 1 day views)',
  ];

  console.log('📋 Final Checklist:');
  checks.forEach((check, i) => {
    console.log(`${i + 1}. ${check}`);
  });
  console.log('');

  const allComplete = await ask('✅ All steps completed successfully? (y/n): ');

  if (allComplete.toLowerCase() === 'y') {
    console.log('');
    console.log('🎉 CONGRATULATIONS! GA4 SETUP COMPLETE!');
    console.log('=======================================');
    console.log('');
    console.log('🚀 Your RinaWarp Terminal now has:');
    console.log('✅ Professional conversion tracking');
    console.log('✅ Revenue-focused audience segments');
    console.log('✅ Accurate attribution modeling');
    console.log('✅ Real-time revenue analytics');
    console.log('');
    console.log('💰 Expected Results:');
    console.log('📈 Revenue insights within 24-48 hours');
    console.log('📈 Conversion optimization within 1 week');
    console.log('📈 25%+ revenue growth within 1 month');
    console.log('');
    console.log('🧜‍♀️ Ready to make serious money with data-driven decisions!');
  } else {
    console.log('');
    console.log('📝 PARTIAL COMPLETION');
    console.log('=====================');
    console.log('Continue configuring remaining items when GA4 shows more events.');
    console.log('Check back daily as your events populate the interface.');
  }

  console.log('');
  console.log('🔗 Monitor your success at:');
  console.log('📊 Real-time: https://analytics.google.com/analytics/web/#/p0/realtime/overview');
  console.log(
    '💰 Revenue: https://analytics.google.com/analytics/web/#/p0/reports/ecommerce-purchases'
  );
}

// Main execution
async function runSetup() {
  try {
    await markConversionsAsSteps();
    await createAudiencesSteps();
    await configureAttributionSteps();
    await finalVerification();
  } catch (error) {
    console.error('Setup interrupted:', error);
  } finally {
    rl.close();
  }
}

// Start the interactive setup
runSetup();
