#!/usr/bin/env node

/**
 * Deploy DMG to GitHub Release
 * Creates a GitHub release and uploads the DMG file
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 Deploying DMG to GitHub Release');
console.log('==================================');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

// Get package version
function getPackageVersion() {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

// Check if GitHub CLI is available
function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    logSuccess('GitHub CLI is available');
    return true;
  } catch (error) {
    logError('GitHub CLI not found');
    logInfo('Install with: brew install gh (macOS) or visit https://cli.github.com/');
    logInfo('Then authenticate with: gh auth login');
    return false;
  }
}

// Check if authenticated with GitHub
function checkGitHubAuth() {
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    logSuccess('Authenticated with GitHub');
    return true;
  } catch (error) {
    logError('Not authenticated with GitHub');
    logInfo('Run: gh auth login');
    return false;
  }
}

// Check if DMG file exists
function checkDMGFile() {
  const dmgPaths = [
    path.join(projectRoot, 'dist', 'RinaWarp-Terminal-macOS.dmg'),
    path.join(projectRoot, 'public', 'releases', 'RinaWarp-Terminal-macOS.dmg'),
  ];

  for (const dmgPath of dmgPaths) {
    if (fs.existsSync(dmgPath)) {
      const stats = fs.statSync(dmgPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
      logSuccess(`Found DMG file: ${dmgPath} (${sizeMB} MB)`);
      return dmgPath;
    }
  }

  logError('DMG file not found');
  logInfo('Run: npm run build:mac to generate the DMG file');
  return null;
}

// Create or update GitHub release
function createGitHubRelease(version, dmgPath) {
  logInfo(`Creating GitHub release v${version}...`);

  try {
    // Check if release already exists
    try {
      execSync(`gh release view v${version}`, { stdio: 'ignore' });
      logInfo(`Release v${version} already exists, updating...`);
      
      // Delete existing asset if it exists
      try {
        execSync(`gh release delete-asset v${version} RinaWarp-Terminal-macOS.dmg --yes`, { stdio: 'ignore' });
        logInfo('Removed existing DMG asset');
      } catch (error) {
        // Asset doesn't exist, that's fine
      }
      
      // Upload new asset
      execSync(`gh release upload v${version} "${dmgPath}" --clobber`, { stdio: 'inherit' });
      logSuccess('DMG uploaded to existing release');
      
    } catch (error) {
      // Release doesn't exist, create it
      logInfo('Creating new release...');
      
      const releaseNotes = `# RinaWarp Terminal v${version}

🌊 **Advanced Terminal Emulator with AI Assistance**

## What's New
- 🧠 AI-powered command analysis and suggestions
- 🎤 Voice control system with natural language processing
- 🎨 Beautiful themes including Mermaid and Car Dashboard
- 🛡️ Enhanced security with threat detection
- ⚡ Performance optimizations

## Download
- **macOS**: RinaWarp-Terminal-macOS.dmg
- **Windows**: Available at rinawarptech.com
- **Linux**: Available at rinawarptech.com

## Installation
1. Download the DMG file
2. Open and drag RinaWarp Terminal to Applications
3. Launch and enjoy!

Visit [rinawarptech.com](https://rinawarptech.com) for full documentation and support.`;

      execSync(
        `gh release create v${version} "${dmgPath}" --title "RinaWarp Terminal v${version}" --notes "${releaseNotes}"`,
        { stdio: 'inherit' }
      );
      logSuccess('GitHub release created with DMG');
    }

    // Get the download URL
    const releaseInfo = execSync(`gh release view v${version} --json assets`, { encoding: 'utf8' });
    const release = JSON.parse(releaseInfo);
    
    const dmgAsset = release.assets.find(asset => asset.name === 'RinaWarp-Terminal-macOS.dmg');
    if (dmgAsset) {
      logSuccess('🎉 DMG is now available at:');
      logSuccess(`   ${dmgAsset.url}`);
      return dmgAsset.url;
    }

  } catch (error) {
    logError('Failed to create GitHub release');
    console.error(error.message);
    return null;
  }
}

// Update website download configuration
function updateWebsiteConfig(downloadUrl) {
  logInfo('Updating website download configuration...');
  
  // Update the download redirect script
  const downloadScriptPath = path.join(projectRoot, 'src', 'api', 'download-redirect.js');
  
  if (fs.existsSync(downloadScriptPath)) {
    let downloadScript = fs.readFileSync(downloadScriptPath, 'utf8');
    
    // Update the macOS download URL
    const macOSPattern = /(RinaWarp-Terminal-macOS\.dmg['"]?\s*:\s*['"])[^'"]*(['"])/;
    if (macOSPattern.test(downloadScript)) {
      downloadScript = downloadScript.replace(macOSPattern, `$1${downloadUrl}$2`);
      fs.writeFileSync(downloadScriptPath, downloadScript);
      logSuccess('Updated download redirect configuration');
    } else {
      logWarning('Could not find macOS download URL pattern in download script');
    }
  } else {
    logWarning('Download redirect script not found');
  }
  
  // Create a simple redirect file
  const redirectHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Downloading RinaWarp Terminal for macOS...</title>
    <meta http-equiv="refresh" content="0;url=${downloadUrl}">
</head>
<body>
    <h1>🌊 RinaWarp Terminal</h1>
    <p>Your download should start automatically...</p>
    <p>If not, <a href="${downloadUrl}">click here to download</a></p>
</body>
</html>`;

  fs.writeFileSync(path.join(projectRoot, 'public', 'download-macos.html'), redirectHTML);
  logSuccess('Created macOS download redirect page');
}

// Deploy website updates (without large files)
function deployWebsiteUpdates() {
  logInfo('Deploying website updates to Railway...');
  
  try {
    // First, let's exclude the large DMG files from deployment
    const gitignorePath = path.join(projectRoot, '.railwayignore');
    const ignoreContent = `
# Exclude large files from Railway deployment
public/releases/*.dmg
public/releases/*.exe
public/releases/*.tar.gz
public/releases/*.AppImage
dist/
*.dmg
*.exe
*.tar.gz
*.AppImage
`;
    
    fs.writeFileSync(gitignorePath, ignoreContent);
    logInfo('Created .railwayignore to exclude large files');
    
    // Check authentication
    execSync('railway whoami', { stdio: 'ignore' });
    
    // Deploy
    execSync('railway up', { stdio: 'inherit', cwd: projectRoot });
    logSuccess('Website updates deployed to Railway');
    
  } catch (error) {
    logError('Failed to deploy website updates');
    console.error(error.message);
  }
}

// Main function
async function main() {
  try {
    // Check prerequisites
    if (!checkGitHubCLI()) {
      process.exit(1);
    }
    
    if (!checkGitHubAuth()) {
      process.exit(1);
    }
    
    // Check for DMG file
    const dmgPath = checkDMGFile();
    if (!dmgPath) {
      process.exit(1);
    }
    
    // Get version
    const version = getPackageVersion();
    logInfo(`Package version: ${version}`);
    
    // Create GitHub release and upload DMG
    const downloadUrl = createGitHubRelease(version, dmgPath);
    if (!downloadUrl) {
      process.exit(1);
    }
    
    // Update website configuration
    updateWebsiteConfig(downloadUrl);
    
    // Deploy website updates (without large files)
    deployWebsiteUpdates();
    
    logSuccess('');
    logSuccess('🎉 Deployment completed successfully!');
    logSuccess('');
    logSuccess('Your DMG is now available via:');
    logSuccess(`1. Direct GitHub release: ${downloadUrl}`);
    logSuccess('2. Website redirect: https://rinawarptech.com/download-macos.html');
    logSuccess('3. API endpoint: https://rinawarptech.com/api/download?file=RinaWarp-Terminal-macOS.dmg');
    logSuccess('');
    
  } catch (error) {
    logError('Deployment failed');
    console.error(error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;
