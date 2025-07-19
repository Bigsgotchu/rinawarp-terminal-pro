#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

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

function checkNetlifySetup() {
  log('🔍 Checking Netlify setup...', 'info');

  // Check if Netlify CLI is installed
  try {
    const version = execSync('netlify --version', { encoding: 'utf8' }).trim();
    log(`✅ Netlify CLI installed: ${version}`, 'success');
  } catch (error) {
    log('❌ Netlify CLI not found. Installing...', 'warning');
    try {
      execSync('npm install -g netlify-cli', { stdio: 'inherit' });
      log('✅ Netlify CLI installed successfully', 'success');
    } catch (_installError) {
      log('❌ Failed to install Netlify CLI', 'error');
      return false;
    }
  }

  // Check login status
  try {
    const auth = execSync('netlify status', { encoding: 'utf8' });
    if (auth.includes('Logged in')) {
      log('✅ Already logged in to Netlify', 'success');
      return true;
    }
  } catch (error) {
    log('🔐 Need to login to Netlify...', 'warning');
    try {
      execSync('netlify login', { stdio: 'inherit' });
      log('✅ Logged in to Netlify successfully', 'success');
      return true;
    } catch (_loginError) {
      log('❌ Failed to login to Netlify', 'error');
      return false;
    }
  }

  return true;
}

function createNetlifyConfig() {
  log('⚙️ Creating Netlify configuration...', 'info');

  const _netlifyConfig = {
    build: {
      command: 'echo "Static site - no build needed"',
      publish: 'public',
    },
    headers: [
      {
        for: '/releases/*',
        values: {
          'Cache-Control': 'public, max-age=86400',
          'Content-Disposition': 'attachment',
          'Access-Control-Allow-Origin': '*',
        },
      },
      {
        for: '/*',
        values: {
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'X-Content-Type-Options': 'nosniff',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        },
      },
    ],
    redirects: [
      {
        from: '/api/*',
        to: 'https://api.rinawarp-terminal.com/:splat',
        status: 200,
        force: true,
      },
    ],
  };

  fs.writeFileSync(
    'netlify.toml',
    `[build]
  command = "echo 'Static site - no build needed'"
  publish = "public"

[[headers]]
  for = "/releases/*"
  [headers.values]
    Cache-Control = "public, max-age=86400"
    Content-Disposition = "attachment"
    Access-Control-Allow-Origin = "*"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"

[[redirects]]
  from = "/api/*"
  to = "https://api.rinawarp-terminal.com/:splat"
  status = 200
  force = true
`
  );

  log('✅ Netlify configuration created: netlify.toml', 'success');
}

function analyzeFiles() {
  log('📦 Analyzing files for deployment...', 'info');

  const downloadFiles = [
    'public/releases/RinaWarp-Terminal-Setup-Windows.exe',
    'public/releases/RinaWarp-Terminal-Portable-Windows.exe',
    'public/releases/RinaWarp-Terminal-Linux.tar.gz',
    'public/releases/RinaWarp-Terminal-macOS.dmg',
  ];

  let totalSize = 0;
  downloadFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      totalSize += stats.size;
      log(`  ✅ ${file.split('/').pop()}: ${sizeInMB}MB`, 'success');
    } else {
      log(`  ❌ ${file}: Missing`, 'error');
    }
  });

  const totalSizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
  log(`📊 Total download size: ${totalSizeInMB}MB`, 'info');

  // Check if index.html exists
  if (fs.existsSync('public/index.html')) {
    log('✅ Main index.html found', 'success');
  } else {
    log('❌ Main index.html missing', 'error');
  }

  return totalSize;
}

function deployToNetlify() {
  log('🚀 Deploying to Netlify...', 'info');

  try {
    // Deploy to production
    const _result = execSync('netlify deploy --prod --dir=public', {
      encoding: 'utf8',
      stdio: 'inherit',
    });

    log('✅ Deployed to Netlify successfully!', 'success');

    // Get site info
    try {
      const siteInfo = execSync('netlify status', { encoding: 'utf8' });
      const urlMatch = siteInfo.match(/URL:\s*(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        log(`🌐 Site URL: ${urlMatch[1]}`, 'info');
      }
    } catch (error) {
      log('⚠️ Could not get site URL', 'warning');
    }

    return true;
  } catch (error) {
    log('❌ Deployment failed', 'error');
    console.error(error.message);
    return false;
  }
}

function testDeployment() {
  log('🧪 Testing deployment...', 'info');

  // Get site URL
  try {
    const siteInfo = execSync('netlify status', { encoding: 'utf8' });
    const urlMatch = siteInfo.match(/URL:\s*(https?:\/\/[^\s]+)/);

    if (urlMatch) {
      const siteUrl = urlMatch[1];

      // Test main site
      try {
        const result = execSync(`curl -I -s "${siteUrl}"`, { encoding: 'utf8' });
        if (result.includes('200 OK')) {
          log('✅ Main site is live', 'success');
        } else {
          log('⚠️ Main site response unclear', 'warning');
        }
      } catch (error) {
        log('❌ Could not test main site', 'error');
      }

      // Test download links
      const testUrls = [
        `${siteUrl}/releases/RinaWarp-Terminal-Setup-Windows.exe`,
        `${siteUrl}/releases/RinaWarp-Terminal-macOS.dmg`,
      ];

      testUrls.forEach(url => {
        try {
          const result = execSync(`curl -I -s "${url}"`, { encoding: 'utf8' });
          if (result.includes('200 OK')) {
            log(`✅ Download working: ${url.split('/').pop()}`, 'success');
          } else {
            log(`⚠️ Download may have issues: ${url.split('/').pop()}`, 'warning');
          }
        } catch (error) {
          log(`❌ Could not test: ${url.split('/').pop()}`, 'error');
        }
      });

      return siteUrl;
    }
  } catch (error) {
    log('❌ Could not get site status', 'error');
  }

  return null;
}

function main() {
  console.log(colors.bold(colors.cyan('🚀 Netlify Migration Script')));
  console.log(colors.cyan('='.repeat(60)));

  log('🎯 Starting migration to Netlify...', 'info');

  // Step 1: Check Netlify setup
  if (!checkNetlifySetup()) {
    log('❌ Netlify setup failed', 'error');
    return;
  }

  // Step 2: Create Netlify configuration
  createNetlifyConfig();

  // Step 3: Analyze files
  const _totalSize = analyzeFiles();

  // Step 4: Deploy to Netlify
  if (!deployToNetlify()) {
    log('❌ Deployment failed', 'error');
    return;
  }

  // Step 5: Test deployment
  const siteUrl = testDeployment();

  // Step 6: Summary
  console.log(colors.cyan('\n' + '='.repeat(60)));
  log('🎉 Migration to Netlify completed!', 'success');

  if (siteUrl) {
    log(`🌐 Your site is live at: ${siteUrl}`, 'info');
  }

  log('🔧 Next steps:', 'info');
  console.log(colors.yellow('  1. Set up custom domain in Netlify dashboard'));
  console.log(colors.yellow('  2. Update DNS records to point to Netlify'));
  console.log(colors.yellow('  3. Test all download links'));
  console.log(colors.yellow('  4. Clean up old hosting platforms'));

  console.log(colors.green('\n✅ No more build system conflicts!'));
  console.log(colors.green('✅ No more file size limits!'));
  console.log(colors.green('✅ Simple, reliable hosting!'));
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
