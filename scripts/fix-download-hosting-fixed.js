/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  releasesDir: './public/releases',
  vercelConfigPath: './vercel.json',
  targetFiles: [
    'RinaWarp-Terminal-Setup-Windows.exe',
    'RinaWarp-Terminal-Portable-Windows.exe',
    'RinaWarp-Terminal-Linux.tar.gz',
    'RinaWarp-Terminal-macOS.dmg',
  ],
  maxFileSize: 200 * 1024 * 1024, // 200MB Vercel limit
  fallbackCDN: 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download',
};

// Color utilities
const colors = {
  green: text => `\x1b[32m${text}\x1b[0m`,
  red: text => `\x1b[31m${text}\x1b[0m`,
  yellow: text => `\x1b[33m${text}\x1b[0m`,
  blue: text => `\x1b[34m${text}\x1b[0m`,
  cyan: text => `\x1b[36m${text}\x1b[0m`,
  bold: text => `\x1b[1m${text}\x1b[0m`,
};

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
  };

  console.log(colorMap[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`));
}

// Check file sizes and availability
function analyzeDownloadFiles() {
  log('🔍 Analyzing download files...', 'info');

  const fileAnalysis = [];

  for (const filename of CONFIG.targetFiles) {
    const filePath = path.join(CONFIG.releasesDir, filename);

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      const tooLarge = stats.size > CONFIG.maxFileSize;

      fileAnalysis.push({
        filename,
        exists: true,
        size: stats.size,
        sizeInMB,
        tooLarge,
        status: tooLarge ? 'TOO_LARGE_FOR_VERCEL' : 'VERCEL_COMPATIBLE',
      });

      log(
        `  📦 ${filename}: ${sizeInMB}MB ${tooLarge ? colors.red('(TOO LARGE)') : colors.green('(OK)')}`,
        'info'
      );
    } else {
      fileAnalysis.push({
        filename,
        exists: false,
        status: 'MISSING',
      });

      log(`  ❌ ${filename}: Missing`, 'error');
    }
  }

  return fileAnalysis;
}

// Create optimized Vercel configuration
function createVercelConfig(fileAnalysis) {
  log('⚙️ Creating optimized Vercel configuration...', 'info');

  const vercelConfig = {
    version: 2,
    builds: [
      {
        src: 'public/**/*',
        use: '@vercel/static',
      },
    ],
    routes: [
      {
        src: '/releases/(.*)',
        dest: '/public/releases/$1',
      },
      {
        src: '/(.*)',
        dest: '/public/$1',
      },
    ],
    headers: [
      {
        source: '/releases/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
          {
            key: 'Content-Disposition',
            value: 'attachment',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ],
    functions: {},
    cleanUrls: true,
    trailingSlash: false,
  };

  // Add redirects for large files to GitHub releases
  const redirects = [];

  fileAnalysis.forEach(file => {
    if (file.exists && file.tooLarge) {
      redirects.push({
        source: `/releases/${file.filename}`,
        destination: `${CONFIG.fallbackCDN}/${file.filename}`,
        permanent: false,
      });

      log(`  🔄 Redirect: ${file.filename} -> GitHub Releases (${file.sizeInMB}MB)`, 'warning');
    }
  });

  if (redirects.length > 0) {
    vercelConfig.redirects = redirects;
  }

  // Write configuration
  fs.writeFileSync(CONFIG.vercelConfigPath, JSON.stringify(vercelConfig, null, 2));
  log(`✅ Vercel configuration updated: ${CONFIG.vercelConfigPath}`, 'success');

  return vercelConfig;
}

// Update index.html download links
function updateDownloadLinks(fileAnalysis) {
  log('🔗 Updating download links in index.html...', 'info');

  const indexPath = './public/index.html';
  if (!fs.existsSync(indexPath)) {
    log('❌ index.html not found', 'error');
    return;
  }

  let html = fs.readFileSync(indexPath, 'utf8');

  // Update download links based on file analysis
  fileAnalysis.forEach(file => {
    if (file.exists) {
      const downloadUrl = file.tooLarge
        ? `${CONFIG.fallbackCDN}/${file.filename}`
        : `/releases/${file.filename}`;

      // Simple string replacement - find existing href with filename
      const oldHrefPattern = new RegExp(
        `href="[^"]*${file.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`,
        'g'
      );
      html = html.replace(oldHrefPattern, `href="${downloadUrl}"`);

      log(`  🔗 Updated link: ${file.filename} -> ${downloadUrl}`, 'info');
    }
  });

  fs.writeFileSync(indexPath, html);
  log('✅ Download links updated in index.html', 'success');
}

// Create GitHub release if needed
function createGitHubRelease() {
  log('🚀 Checking GitHub release...', 'info');

  try {
    // Check if gh CLI is available
    execSync('gh --version', { stdio: 'ignore' });

    // Check if release exists
    const _releaseCheck = execSync('gh release view latest', { encoding: 'utf8' });
    log('✅ GitHub release exists', 'success');

    // Upload large files to release
    const largeFiles = fs
      .readdirSync(CONFIG.releasesDir)
      .filter(file => CONFIG.targetFiles.includes(file))
      .filter(file => {
        const filePath = path.join(CONFIG.releasesDir, file);
        return fs.statSync(filePath).size > CONFIG.maxFileSize;
      });

    if (largeFiles.length > 0) {
      log(`📤 Uploading ${largeFiles.length} large files to GitHub release...`, 'info');

      largeFiles.forEach(file => {
        const filePath = path.join(CONFIG.releasesDir, file);
        try {
          execSync(`gh release upload latest "${filePath}" --clobber`, { stdio: 'inherit' });
          log(`  ✅ Uploaded: ${file}`, 'success');
        } catch (error) {
          log(`  ❌ Failed to upload ${file}: ${error.message}`, 'error');
        }
      });
    }
  } catch (error) {
    log('⚠️ GitHub CLI not available or release not found', 'warning');
    log('💡 You may need to manually create a GitHub release for large files', 'info');
  }
}

// Test download links
function testDownloadLinks() {
  log('🧪 Testing download links...', 'info');

  const testUrls = [
    'https://rinawarptech.com/releases/RinaWarp-Terminal-Setup-Windows.exe',
    'https://rinawarptech.com/releases/RinaWarp-Terminal-Portable-Windows.exe',
    'https://rinawarptech.com/releases/RinaWarp-Terminal-Linux.tar.gz',
    'https://rinawarptech.com/releases/RinaWarp-Terminal-macOS.dmg',
  ];

  testUrls.forEach(url => {
    try {
      const result = execSync(`curl -I -s "${url}"`, { encoding: 'utf8', timeout: 10000 });
      const statusMatch = result.match(/HTTP\/[12]\.[01] (\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;

      if (status >= 200 && status < 400) {
        log(`  ✅ ${url.split('/').pop()}: ${status}`, 'success');
      } else {
        log(`  ❌ ${url.split('/').pop()}: ${status}`, 'error');
      }
    } catch (error) {
      log(`  ❌ ${url.split('/').pop()}: ${error.message}`, 'error');
    }
  });
}

// Main execution
function main() {
  console.log(colors.bold(colors.cyan('🔧 RinaWarp Terminal Download Hosting Fix')));
  console.log(colors.cyan('='.repeat(60)));

  try {
    // Step 1: Analyze files
    const fileAnalysis = analyzeDownloadFiles();

    // Step 2: Create Vercel config
    const _vercelConfig = createVercelConfig(fileAnalysis);

    // Step 3: Update download links
    updateDownloadLinks(fileAnalysis);

    // Step 4: Create GitHub release for large files
    createGitHubRelease();

    console.log(colors.cyan('\n' + '='.repeat(60)));
    log('🎉 Download hosting fix completed!', 'success');
    log('💡 Next steps:', 'info');
    log('  1. Run "vercel --prod" to deploy the updated configuration', 'info');
    log('  2. Test the download links after deployment', 'info');
  } catch (error) {
    log(`💥 Error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Export functions for testing
module.exports = {
  analyzeDownloadFiles,
  createVercelConfig,
  updateDownloadLinks,
  testDownloadLinks,
  main,
};

// Run if executed directly
if (require.main === module) {
  main();
}
