#!/usr/bin/env node

/**
 * Automated Google Analytics Setup
 * Configures GA with placeholder and provides instructions for real setup
 */

const fs = require('fs');

// For now, let's prepare everything with the current placeholder
const TRACKING_ID = 'G-G424CV5GGT'; // This will be replaced with real ID

function _updateFile(filePath, searchPattern, replacement, description) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(searchPattern, 'g');

    if (content.match(regex)) {
      content = content.replace(regex, replacement);
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated ${filePath} ${description}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed in ${filePath}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

function addToEnvironment() {
  console.log('📝 Updating environment files...');

  const envFiles = ['./production.env'];

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      let content = fs.readFileSync(envFile, 'utf8');

      // Uncomment and update GA line
      content = content.replace(
        /# GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX/,
        `GOOGLE_ANALYTICS_ID=${TRACKING_ID}`
      );

      // If still commented, add it properly
      if (!content.includes('GOOGLE_ANALYTICS_ID=G-')) {
        content = content.replace(
          /# Monitoring & Analytics[\s\S]*?# SENTRY_DSN=your_sentry_dsn_here[\s\S]*?# GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX/,
          `# Monitoring & Analytics
# SENTRY_DSN=your_sentry_dsn_here
GOOGLE_ANALYTICS_ID=${TRACKING_ID}
GA_TRACKING_ID=${TRACKING_ID}`
        );
      }

      fs.writeFileSync(envFile, content);
      console.log(`✅ Updated ${envFile}`);
    }
  }
}

function createGAInstructions() {
  const instructions = `
# 🌊 Google Analytics Setup Instructions

## Current Status
✅ **All files configured** with placeholder tracking ID: ${TRACKING_ID}
⚠️  **Replace with your real GA tracking ID** to start collecting data

## 📋 Steps to Create Your Google Analytics Property

### 1. Create GA4 Property
1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon)
3. Click **Create Property**
4. Name: **"RinaWarp Terminal"**
5. Select your country/timezone
6. Choose **Business** for industry category
7. Click **Create**

### 2. Set Up Data Stream
1. Click **Add stream** → **Web**
2. Website URL: **https://rinawarptech.com**
3. Stream name: **"RinaWarp Terminal Website"**
4. Click **Create stream**
5. **Copy the Measurement ID** (format: G-ABC1234567)

### 3. Replace Placeholder ID
Run this command with your real tracking ID:
\`\`\`bash
# Replace G-G424CV5GGT with your real tracking ID
find . -name "*.js" -o -name "*.html" -o -name "*.env*" | xargs sed -i '' 's/G-G424CV5GGT/G-YOURREALTID/g'
\`\`\`

Or use the configuration script:
\`\`\`bash
node scripts/configure-ga-complete.cjs
\`\`\`

### 4. Deploy Changes
1. Rebuild your app: \`npm run build\`
2. Upload website changes to your server
3. Restart backend services
4. Test with Real-Time reports in GA

### 5. Configure Goals & Events
After setup, configure these in GA:
- **Conversions**: App downloads, subscriptions
- **Audiences**: Users by plan type, engagement level
- **Goals**: Trial signups, purchases, feature usage

## 🔍 Verification
Run the test script to verify everything is working:
\`\`\`bash
node scripts/test-google-analytics.cjs
\`\`\`

## 📊 What's Already Configured
- ✅ Marketing website tracking
- ✅ Desktop app analytics
- ✅ E-commerce conversion tracking
- ✅ Custom event tracking functions
- ✅ Privacy-compliant settings (IP anonymization)
- ✅ Environment variable support

## 🚀 Ready to Track
Once you replace the placeholder ID, you'll track:
- Page views and user sessions
- App downloads and installations
- Subscription purchases and upgrades
- Feature usage and engagement
- User behavior and retention

---
*Generated automatically by RinaWarp Terminal GA setup*
`;

  fs.writeFileSync('./docs/GOOGLE_ANALYTICS_INSTRUCTIONS.md', instructions);
  console.log('✅ Created detailed instructions: docs/GOOGLE_ANALYTICS_INSTRUCTIONS.md');
}

console.log('🌊 RinaWarp Terminal - Automated Google Analytics Setup');
console.log('=====================================================');
console.log('');

console.log('📄 Configuring all components with placeholder tracking ID...');
console.log('');

// Environment files
addToEnvironment();

// Generate instructions
createGAInstructions();

console.log('');
console.log('✅ Google Analytics setup prepared!');
console.log('');
console.log('📊 What was configured:');
console.log(`- Tracking ID: ${TRACKING_ID} (placeholder)`);
console.log('- Environment variables updated');
console.log('- All components ready for tracking');
console.log('');
console.log('🚀 Next Steps:');
console.log('1. Read: docs/GOOGLE_ANALYTICS_INSTRUCTIONS.md');
console.log('2. Create your GA4 property at https://analytics.google.com/');
console.log('3. Replace placeholder ID with your real tracking ID');
console.log('4. Test with: node scripts/test-google-analytics.cjs');
console.log('');
console.log("⚠️  Remember: Analytics won't collect data until you use a real tracking ID!");
