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

async function buildLinux() {
  try {
    console.log('🔄 Starting Linux build process...');

    // Clean dist directory
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true });
    }

    // Run prebuild steps
    console.log('📦 Running prebuild steps...');
    await runCommand('npm', ['run', 'prebuild']);

    // Run electron-builder for Linux
    console.log('📱 Packaging Electron app for Linux...');
    await runCommand('npx', ['electron-builder', '--linux']);

    // Check if AppImage was created and rename if needed
    const files = fs.readdirSync('dist');
    const appImageFile = files.find(file => file.endsWith('.AppImage'));
    const tarGzFile = files.find(file => file.endsWith('.tar.gz'));

    if (appImageFile) {
      // Generate better filename with version and timestamp
      const packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const version = packageInfo.version;
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const newAppImageName = `RinaWarp-Terminal-${version}-linux-x64-${timestamp}.AppImage`;
      const oldPath = path.join('dist', appImageFile);
      const newPath = path.join('dist', newAppImageName);

      // Rename the AppImage
      fs.renameSync(oldPath, newPath);

      console.log(`✅ Linux build completed: dist/${newAppImageName}`);
      const size = (fs.statSync(newPath).size / 1024 / 1024).toFixed(2);
      console.log(`📏 AppImage size: ${size} MB`);
    } else if (tarGzFile) {
      // Rename the tar.gz file
      const packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const version = packageInfo.version;
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const newTarGzName = `RinaWarp-Terminal-${version}-linux-x64-${timestamp}.tar.gz`;
      const oldPath = path.join('dist', tarGzFile);
      const newPath = path.join('dist', newTarGzName);

      // Rename the tar.gz
      fs.renameSync(oldPath, newPath);

      console.log(`✅ Linux build completed: dist/${newTarGzName}`);
      const size = (fs.statSync(newPath).size / 1024 / 1024).toFixed(2);
      console.log(`📏 tar.gz size: ${size} MB`);
    } else {
      // Create tar.gz from unpacked directory if no package was created
      const unpackedDir = path.join('dist', 'linux-unpacked');
      if (fs.existsSync(unpackedDir)) {
        const packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const version = packageInfo.version;
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const tarGzName = `RinaWarp-Terminal-${version}-linux-x64-${timestamp}.tar.gz`;
        const tarPath = path.join('dist', tarGzName);

        console.log('📦 Creating tar.gz from unpacked directory...');
        await runCommand('tar', ['-czf', tarPath, '-C', 'dist', 'linux-unpacked']);
        
        if (fs.existsSync(tarPath)) {
          console.log(`✅ Linux build completed: dist/${tarGzName}`);
          const size = (fs.statSync(tarPath).size / 1024 / 1024).toFixed(2);
          console.log(`📏 tar.gz size: ${size} MB`);
        } else {
          console.log('❌ Failed to create tar.gz file');
        }
      } else {
        console.log('⚠️  No AppImage, tar.gz, or unpacked directory found');
        const artifacts = files.filter(
          file =>
            file.endsWith('.deb') ||
            file.endsWith('.rpm') ||
            file.endsWith('.tar.gz') ||
            fs.statSync(path.join('dist', file)).isDirectory()
        );
        console.log('📦 Found artifacts:', artifacts);
      }
    }
  } catch (error) {
    console.error('❌ Linux build failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  buildLinux();
}

module.exports = buildLinux;
