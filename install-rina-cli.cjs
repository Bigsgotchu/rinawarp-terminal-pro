#!/usr/bin/env node

/**
 * Rina CLI Installer
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Installs the Rina CLI globally for command-line access
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('\n🧜‍♀️ Rina CLI Installer');
console.log('═══════════════════════');
console.log('Installing Rina CLI for global access...\n');

try {
  // Get the path to the rina CLI script
  const rinaCliPath = path.join(__dirname, 'bin', 'rina');

  if (!fs.existsSync(rinaCliPath)) {
    console.error('❌ Rina CLI script not found at:', rinaCliPath);
    process.exit(1);
  }

  // Make the CLI executable
  console.log('🔧 Making Rina CLI executable...');
  execSync(`chmod +x "${rinaCliPath}"`);

  // Determine the target directory based on platform
  let targetDir;
  let binPath;

  if (process.platform === 'win32') {
    // Windows: Use npm global directory
    try {
      const npmGlobalDir = execSync('npm root -g', { encoding: 'utf8' }).trim();
      targetDir = path.join(npmGlobalDir, '..', 'bin');
      binPath = path.join(targetDir, 'rina.cmd');

      // Create a Windows batch file
      const batchContent = `@echo off\nnode "${rinaCliPath}" %*`;
      fs.writeFileSync(binPath, batchContent);
    } catch (error) {
      console.error('❌ Failed to install on Windows:', error.message);
      console.log('💡 Try running: npm install -g rina-cli');
      process.exit(1);
    }
  } else {
    // macOS/Linux: Use /usr/local/bin
    targetDir = '/usr/local/bin';
    binPath = path.join(targetDir, 'rina');

    try {
      // Create the target directory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        execSync(`sudo mkdir -p "${targetDir}"`);
      }

      // Create a symlink or copy the script
      if (fs.existsSync(binPath)) {
        execSync(`sudo rm "${binPath}"`);
      }

      execSync(`sudo ln -s "${rinaCliPath}" "${binPath}"`);
    } catch (error) {
      // Try user-local installation if sudo fails
      console.log('⚠️  Sudo access not available, trying user-local installation...');

      const userBinDir = path.join(os.homedir(), '.local', 'bin');
      if (!fs.existsSync(userBinDir)) {
        fs.mkdirSync(userBinDir, { recursive: true });
      }

      binPath = path.join(userBinDir, 'rina');

      if (fs.existsSync(binPath)) {
        fs.unlinkSync(binPath);
      }

      fs.symlinkSync(rinaCliPath, binPath);
      targetDir = userBinDir;

      console.log(`📁 Installed to user directory: ${targetDir}`);
      console.log(`💡 Add ${userBinDir} to your PATH if it's not already there:`);
      console.log('   echo \'export PATH="$HOME/.local/bin:$PATH"\' >> ~/.zshrc');
      console.log('   echo \'export PATH="$HOME/.local/bin:$PATH"\' >> ~/.bashrc');
    }
  }

  console.log('✅ Rina CLI installed successfully!');
  console.log(`📍 Installed to: ${binPath}`);

  // Test the installation
  console.log('\n🧪 Testing installation...');

  try {
    const _testOutput = execSync('rina version', { encoding: 'utf8', timeout: 5000 });
    console.log('✅ Installation test passed!');
    console.log('🧜‍♀️ Rina CLI is ready to use!');
  } catch (_testError) {
    console.log('⚠️  Installation completed but test failed');
    console.log('💡 You may need to restart your terminal or update your PATH');
  }

  console.log('\n🚀 Quick Start:');
  console.log('  rina help           # Show available commands');
  console.log('  rina status         # Check RinaWarp Terminal status');
  console.log('  rina start          # Start RinaWarp Terminal');
  console.log('  rina ask "help me"  # Ask Rina anything');
  console.log('  rina cmd "ls -la"   # Execute commands with Rina');

  console.log('\n🧜‍♀️ Happy commanding with Rina!');
} catch (error) {
  console.error('❌ Installation failed:', error.message);
  console.log('\n🔧 Manual Installation:');
  console.log(`1. Make executable: chmod +x ${path.join(__dirname, 'bin', 'rina')}`);
  console.log('2. Add to PATH or create symlink:');
  console.log(`   ln -s ${path.join(__dirname, 'bin', 'rina')} /usr/local/bin/rina`);
  process.exit(1);
}
