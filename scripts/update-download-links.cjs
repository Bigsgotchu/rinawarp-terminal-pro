#!/usr/bin/env node

/*
 * 🧜‍♀️ RinaWarp Terminal - Auto-update Download Links
 * Updates website download links when new releases are created
 */

const fs = require('fs');
const path = require('path');

function updateDownloadPage(version) {
  const downloadPath = path.join(__dirname, '../public/download.html');
  const websiteDownloadPath = path.join(__dirname, '../website/public/download.html');

  try {
    // Read current content
    let content = fs.readFileSync(downloadPath, 'utf8');

    // Update version in header
    content = content.replace(
      /<h2 id="version-header">🌊 Available Downloads - v[\d.]+(-\w+)? Enhanced AI Edition<\/h2>/,
      `<h2 id="version-header">🌊 Available Downloads - v${version} Enhanced AI Edition</h2>`
    );

    // Update download links to point to latest release
    content = content.replace(
      /href="releases\//g,
      `href="https://github.com/Bigsgotchu/rinawarp-terminal-pro/releases/download/v${version}/`
    );

    // Update build info
    const buildDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    content = content.replace(
      /<strong>Build Information:<\/strong> v[\d.]+(-\w+)? • Built: [^•]+ •/,
      `<strong>Build Information:</strong> v${version} • Built: ${buildDate} •`
    );

    // Write updated content
    fs.writeFileSync(downloadPath, content);
    console.log(`✅ Updated ${downloadPath} to version ${version}`);

    // Also update website version if it exists
    if (fs.existsSync(websiteDownloadPath)) {
      fs.writeFileSync(websiteDownloadPath, content);
      console.log(`✅ Updated ${websiteDownloadPath} to version ${version}`);
    }

    // Update package.json references
    updatePackageJson(version);
  } catch (error) {
    console.error(`❌ Failed to update download links: ${error.message}`);
  }
}

function updatePackageJson(version) {
  const packagePath = path.join(__dirname, '../package.json');

  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Update version if it's different (shouldn't be, but just in case)
    if (packageData.version !== version) {
      console.log(`📝 Package.json version mismatch: ${packageData.version} vs ${version}`);
    }

    console.log(`✅ Package.json version: ${packageData.version}`);
  } catch (error) {
    console.error(`❌ Failed to check package.json: ${error.message}`);
  }
}

function getCurrentVersion() {
  try {
    const packagePath = path.join(__dirname, '../package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageData.version;
  } catch (error) {
    console.error(`❌ Failed to get current version: ${error.message}`);
    return '1.0.0';
  }
}

// Main execution
if (require.main === module) {
  const version = process.argv[2] || getCurrentVersion();

  console.log(`🧜‍♀️ Updating download links for version ${version}...`);
  updateDownloadPage(version);
  console.log('🌊 Download links updated successfully!');
}

module.exports = { updateDownloadPage, getCurrentVersion };
