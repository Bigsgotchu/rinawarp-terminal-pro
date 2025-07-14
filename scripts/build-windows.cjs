#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function buildWindows() {
  try {
    console.log('🔄 Starting Windows build process...');

    // Clean dist directory
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true });
    }

    // Run prebuild steps
    console.log('📦 Running prebuild steps...');
    await runCommand('npm', ['run', 'prebuild']);

    // Run electron-builder for Windows
    console.log('📱 Packaging Electron app for Windows...');
    await runCommand('npx', ['electron-builder', '--win']);

    // Check if installer was created and rename if needed
    const files = fs.readdirSync('dist');
    const installerFile = files.find(file => file.endsWith('.exe'));

    if (installerFile) {
      // Generate better filename with version and timestamp
      const packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const version = packageInfo.version;
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const newInstallerName = `RinaWarp-Terminal-${version}-win-x64-${timestamp}.exe`;
      const oldPath = path.join('dist', installerFile);
      const newPath = path.join('dist', newInstallerName);

      // Rename the installer
      fs.renameSync(oldPath, newPath);

      console.log(`✅ Windows build completed: dist/${newInstallerName}`);
      const size = (fs.statSync(newPath).size / 1024 / 1024).toFixed(2);
      console.log(`📏 Installer size: ${size} MB`);
    } else {
      console.log('⚠️  No installer found, checking for other artifacts...');
      const artifacts = files.filter(
        file =>
          file.endsWith('.msi') ||
          file.endsWith('.zip') ||
          fs.statSync(path.join('dist', file)).isDirectory()
      );
      console.log('📦 Found artifacts:', artifacts);
    }
  } catch (error) {
    console.error('❌ Windows build failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  buildWindows();
}

module.exports = buildWindows;
