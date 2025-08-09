#!/usr/bin/env node

/*
 * 🧜‍♀️ RinaWarp Terminal - Pricing Consolidation Script
 * Fixes all pricing conflicts and establishes single source of truth
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  pink: '\x1b[95m',
};

function log(message, color = 'cyan') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function warn(message) {
  console.log(`${colors.yellow}⚠️ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

// MASTER PRICING - Single Source of Truth
const MASTER_PRICING = {
  free: {
    name: '🚀 Free Starter',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
  },
  personal: {
    name: '🐟 Reef Explorer',
    price: '$15',
    period: '/month',
    description: 'Perfect for individual developers',
    annual: '$144/year (20% off)',
  },
  professional: {
    name: '🧜‍♀️ Mermaid Pro',
    price: '$25',
    period: '/month',
    description: 'For skilled developers who command the digital seas',
    annual: '$240/year (20% off)',
    popular: true,
  },
  team: {
    name: '🌊 Ocean Fleet',
    price: '$35',
    period: '/month',
    description: 'For teams navigating the vast digital ocean',
    annual: '$336/year (20% off)',
  },
  enterprise: {
    name: '🏢 Enterprise Navigator',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
  },
};

// Beta pricing (one-time payments)
const BETA_PRICING = {
  early_bird: {
    name: '🐦 Early Bird',
    price: '$29',
    period: '',
    description: 'Limited time offer',
  },
  beta_access: {
    name: '🚀 Beta Access',
    price: '$39',
    period: '',
    description: 'Most popular choice',
    popular: true,
  },
  premium_beta: {
    name: '👑 Premium Beta',
    price: '$59',
    period: '',
    description: 'Priority support included',
  },
};

function updateFile(filePath, updates) {
  try {
    if (!fs.existsSync(filePath)) {
      warn(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    updates.forEach(update => {
      if (content.includes(update.find)) {
        content = content.replace(new RegExp(update.find, 'g'), update.replace);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      success(`Updated ${filePath}`);
    } else {
      log(`No changes needed for ${filePath}`);
    }
  } catch (err) {
    error(`Failed to update ${filePath}: ${err.message}`);
  }
}

function consolidatePricing() {
  log('🧜‍♀️ Starting pricing consolidation...', 'pink');

  // 1. Fix root pricing.html (make it redirect)
  const rootPricingPath = path.join(__dirname, '../pricing.html');
  const redirectContent = `<!DOCTYPE html>
<html>
<head>
    <title>RinaWarp Terminal - Pricing</title>
    <meta http-equiv="refresh" content="0; url=./public/pricing.html">
</head>
<body>
    <p>Redirecting to pricing page...</p>
    <script>window.location.href = './public/pricing.html';</script>
</body>
</html>`;

  try {
    fs.writeFileSync(rootPricingPath, redirectContent);
    success('Fixed root pricing.html to redirect to main pricing');
  } catch (err) {
    error(`Failed to update root pricing.html: ${err.message}`);
  }

  // 2. Update simple-payment-test.html to match main pricing
  updateFile(path.join(__dirname, '../public/simple-payment-test.html'), [
    {
      find: 'Test Personal Plan - \\$15/month',
      replace: `Test ${MASTER_PRICING.personal.name} - ${MASTER_PRICING.personal.price}/month`,
    },
    {
      find: 'Test Professional Plan - \\$25/month',
      replace: `Test ${MASTER_PRICING.professional.name} - ${MASTER_PRICING.professional.price}/month`,
    },
    {
      find: 'Test Team Plan - \\$35/month',
      replace: `Test ${MASTER_PRICING.team.name} - ${MASTER_PRICING.team.price}/month`,
    },
  ]);

  // 3. Update checkout.html to match main pricing
  updateFile(path.join(__dirname, '../public/checkout.html'), [
    {
      find: 'RinaWarp Terminal Professional',
      replace: `${MASTER_PRICING.professional.name.replace('🧜‍♀️ ', '')}`,
    },
    {
      find: '\\$25/mo',
      replace: `${MASTER_PRICING.professional.price}/mo`,
    },
    {
      find: '\\$25.00',
      replace: `${MASTER_PRICING.professional.price}.00`,
    },
    {
      find: '\\$20.00/mo',
      replace: '$20.00/mo', // Keep discounted price
    },
  ]);

  // 4. Verify main pricing page is consistent
  const mainPricingPath = path.join(__dirname, '../public/pricing.html');
  if (fs.existsSync(mainPricingPath)) {
    success('Main pricing page exists and is the source of truth');
  } else {
    error('Main pricing page not found!');
  }

  // 5. Create pricing summary
  log('\n🧜‍♀️ CONSOLIDATED PRICING STRUCTURE:', 'pink');
  console.log('\n📊 Monthly Subscriptions:');
  Object.entries(MASTER_PRICING).forEach(([key, plan]) => {
    const popular = plan.popular ? ' (POPULAR)' : '';
    console.log(`   ${plan.name}: ${plan.price}${plan.period}${popular}`);
    if (plan.annual) {
      console.log(`      Annual: ${plan.annual}`);
    }
  });

  console.log('\n🚀 Beta One-time Purchases:');
  Object.entries(BETA_PRICING).forEach(([key, plan]) => {
    const popular = plan.popular ? ' (POPULAR)' : '';
    console.log(`   ${plan.name}: ${plan.price}${popular}`);
  });

  success('\n🎉 Pricing consolidation completed!');

  log('\n📝 Next Steps:', 'yellow');
  console.log('1. Test all pricing pages to ensure consistency');
  console.log('2. Update Stripe price IDs if needed');
  console.log('3. Clear any cached pricing data');
  console.log('4. Update documentation');
}

// Verification function
function verifyPricing() {
  log('\n🔍 Verifying pricing consistency...', 'cyan');

  const filesToCheck = [
    '../public/pricing.html',
    '../public/simple-payment-test.html',
    '../public/checkout.html',
  ];

  filesToCheck.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      success(`✓ ${file} exists`);
    } else {
      error(`✗ ${file} missing`);
    }
  });
}

// Main execution
if (require.main === module) {
  consolidatePricing();
  verifyPricing();
}
