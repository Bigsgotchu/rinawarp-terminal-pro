#!/usr/bin/env node

/**
 * Google Analytics Audience Helper
 * Provides templates and guidance for creating audiences
 */

const audienceTemplates = {
  engaged: {
    name: 'Engaged Users',
    description: 'Users who spent meaningful time on site',
    conditions: ['Session duration > 30 seconds', 'AND Page views per session ≥ 2'],
    membershipDays: 30,
    useCase: 'Target users who showed genuine interest',
  },

  highIntent: {
    name: 'High Intent Users',
    description: 'Users who viewed key conversion pages',
    conditions: [
      "Page path contains 'pricing'",
      "OR Page path contains 'download'",
      "OR Page path contains 'features'",
      "OR Page path contains 'beta'",
    ],
    membershipDays: 30,
    useCase: 'Target users ready to convert',
  },

  returning: {
    name: 'Returning Visitors',
    description: 'Users who came back to the site',
    conditions: ['Sessions ≥ 2', 'AND First visit date > 1 day ago'],
    membershipDays: 30,
    useCase: 'Target loyal/interested users',
  },

  newUsers: {
    name: 'New Users',
    description: 'First-time visitors',
    conditions: ['Sessions = 1'],
    membershipDays: 7,
    useCase: 'Target fresh prospects',
  },

  mobileUsers: {
    name: 'Mobile Users',
    description: 'Users primarily on mobile devices',
    conditions: ['Device category = mobile'],
    membershipDays: 30,
    useCase: 'Target mobile-optimized campaigns',
  },

  organicTraffic: {
    name: 'Organic Traffic',
    description: 'Users from search engines',
    conditions: ['Default channel grouping = Organic Search'],
    membershipDays: 30,
    useCase: 'Target SEO-driven users',
  },
};

function showAudienceTemplate(type) {
  const template = audienceTemplates[type];
  if (!template) {
    console.log(`❌ Unknown audience type: ${type}`);
    return;
  }

  console.log(`🎯 ${template.name} Audience Template`);
  console.log('='.repeat(50));
  console.log(`Name: ${template.name}`);
  console.log(`Description: ${template.description}`);
  console.log(`Membership Duration: ${template.membershipDays} days`);
  console.log(`Use Case: ${template.useCase}`);
  console.log('');
  console.log('Conditions:');
  template.conditions.forEach(condition => {
    console.log(`  • ${condition}`);
  });
  console.log('');
}

function showAllTemplates() {
  console.log('🎯 Available Audience Templates');
  console.log('='.repeat(50));

  Object.keys(audienceTemplates).forEach((key, index) => {
    const template = audienceTemplates[key];
    console.log(`${index + 1}. ${template.name}`);
    console.log(`   ${template.description}`);
    console.log(`   Use: node audience-helper.js ${key}`);
    console.log('');
  });
}

function showGAInstructions() {
  console.log('📋 Google Analytics Audience Creation Steps');
  console.log('='.repeat(50));
  console.log('1. Open Google Analytics 4');
  console.log('2. Navigate to Admin > Audiences');
  console.log('3. Click "New Audience"');
  console.log('4. Choose "Create a custom audience"');
  console.log('5. Add conditions based on the templates above');
  console.log('6. Set membership duration (typically 30 days)');
  console.log('7. Save the audience');
  console.log('');
  console.log('💡 Pro Tips:');
  console.log('• Start with 2-3 key audiences');
  console.log('• Use descriptive names');
  console.log('• Test conditions with smaller date ranges first');
  console.log('• Monitor audience size - aim for 100+ users minimum');
  console.log('');
}

function generateAudienceConfig() {
  console.log('📄 Audience Configuration Export');
  console.log('='.repeat(50));
  console.log('Copy this configuration to your Google Analytics:');
  console.log('');

  Object.keys(audienceTemplates).forEach(key => {
    const template = audienceTemplates[key];
    console.log(`## ${template.name}`);
    console.log(`Description: ${template.description}`);
    console.log(`Conditions: ${template.conditions.join(' ')}`);
    console.log(`Duration: ${template.membershipDays} days`);
    console.log('---');
  });
}

// Main CLI
const command = process.argv[2];

console.log('🔍 RinaWarp Analytics Audience Helper\n');

switch (command) {
  case 'engaged':
  case 'highIntent':
  case 'returning':
  case 'newUsers':
  case 'mobileUsers':
  case 'organicTraffic':
    showAudienceTemplate(command);
    break;

  case 'all':
  case 'list':
    showAllTemplates();
    break;

  case 'instructions':
  case 'help':
    showGAInstructions();
    break;

  case 'config':
  case 'export':
    generateAudienceConfig();
    break;

  default:
    console.log('Usage: node audience-helper.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  engaged          - Engaged Users template');
    console.log('  highIntent       - High Intent Users template');
    console.log('  returning        - Returning Visitors template');
    console.log('  newUsers         - New Users template');
    console.log('  mobileUsers      - Mobile Users template');
    console.log('  organicTraffic   - Organic Traffic template');
    console.log('  all              - Show all templates');
    console.log('  instructions     - GA setup instructions');
    console.log('  config           - Export configuration');
    console.log('');
    console.log('Examples:');
    console.log('  node audience-helper.js engaged');
    console.log('  node audience-helper.js instructions');
}
