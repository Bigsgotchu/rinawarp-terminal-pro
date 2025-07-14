#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function buildMac() {
  try {
    console.log('🛠️  Starting macOS build...');

    // Clean dist directory
    if (fs.existsSync('dist')) {
      console.log('🧹 Cleaning dist directory...');
      fs.rmSync('dist', { recursive: true });
    }

    // Set up environment variables for electron-builder
    process.env.DEBUG = 'electron-builder';
    process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
    process.env.CSC_LINK = '';
    process.env.CSC_KEY_PASSWORD = '';
    process.env.APPLE_ID = '';
    process.env.APPLE_ID_PASSWORD = '';
    process.env.APPLE_TEAM_ID = '';
    process.env.ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES = 'true';
    process.env.CI = 'true';
    process.env.NOTARIZE = 'false';
    process.env.SIGN = 'false';

    // Run prebuild steps
    console.log('📦 Running prebuild steps...');
    execSync('npm run prebuild', {
      stdio: 'inherit',
      env: process.env,
    });

    console.log('✅ Prebuild completed successfully');

    // Run electron-builder with --dir flag to avoid packaging
    console.log('📱 Building macOS app with electron-builder...');
    execSync('npx electron-builder --mac --dir', {
      stdio: 'inherit',
      env: process.env,
    });

    console.log('✅ Electron-builder completed successfully');

    // Check output directory - electron-builder creates arch-specific directories
    const distDir = path.resolve('dist');
    const macDirs = fs.readdirSync(distDir).filter(name => name.startsWith('mac'));

    if (macDirs.length === 0) {
      console.error('❌ No macOS build output directory found!');
      console.log('📁 dist contents:', fs.readdirSync(distDir));
      process.exit(1);
    }

    const buildOutput = path.join(distDir, macDirs[0]); // e.g., dist/mac-arm64
    console.log(`📁 Found macOS build output: ${buildOutput}`);

    const files = fs.readdirSync(buildOutput);
    console.log('📦 Files found in build output:', files);

    // Look for .app file
    const appFile = files.find(f => f.endsWith('.app'));
    if (!appFile) {
      console.error('❌ Electron app was not created in dist/mac');
      console.log('📦 All files found:', files);
      process.exit(1);
    }

    console.log(`✅ Found app: ${appFile}`);
    const appPath = path.join(buildOutput, appFile);

    // Generate dynamic ZIP filename with architecture and timestamp
    const packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageInfo.version;
    const arch = macDirs[0].includes('arm64') ? 'arm64' : 'x64';
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const zipName = `RinaWarp-Terminal-${version}-mac-${arch}-${timestamp}.zip`;
    const zipPath = path.resolve('dist', zipName);

    // Manually create ZIP
    console.log('🗁️  Creating ZIP archive...');
    console.log(`📝 ZIP filename: ${zipName}`);

    // Use ditto with absolute paths for better CI compatibility
    const absoluteAppPath = path.resolve(appPath);

    execSync(`ditto -c -k --sequesterRsrc --keepParent "${absoluteAppPath}" "${zipPath}"`, {
      stdio: 'inherit',
      env: process.env,
    });

    // Verify the ZIP was created
    if (!fs.existsSync(zipPath)) {
      throw new Error(`ZIP file was not created at ${zipPath}`);
    }

    console.log(`✅ macOS build completed: ${zipPath}`);
    console.log(`📏 ZIP size: ${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(2)} MB`);

    // List final contents for debugging
    console.log('📁 Final dist directory contents:');
    if (fs.existsSync('dist')) {
      const distFiles = fs.readdirSync('dist');
      distFiles.forEach(file => {
        const fullPath = path.join('dist', file);
        const stats = fs.statSync(fullPath);
        console.log(`  ${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
      });
    }
  } catch (error) {
    console.error('❌ macOS build failed with error:');
    if (error.stdout) console.error('STDOUT:', error.stdout.toString());
    if (error.stderr) console.error('STDERR:', error.stderr.toString());
    else console.error('ERROR:', error.message);

    // Additional debugging info
    console.log('🔍 Debug info:');
    console.log('  - Working directory:', process.cwd());
    console.log('  - Node version:', process.version);
    console.log('  - Platform:', process.platform);

    if (fs.existsSync('dist')) {
      console.log('  - Dist directory exists');
      const distFiles = fs.readdirSync('dist');
      console.log('  - Dist contents:', distFiles);
    } else {
      console.log('  - Dist directory does not exist');
    }

    process.exit(1);
  }
}

if (require.main === module) {
  buildMac();
}

module.exports = buildMac;
