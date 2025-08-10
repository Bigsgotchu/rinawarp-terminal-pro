#!/usr/bin/env node

/**
 * Backend Installation Script
 * Sets up the backend server with all dependencies and configuration
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Installing RinaWarp Terminal Backend...\n');

async function installBackend() {
  try {
    // 1. Install dependencies
    await installDependencies();
    
    // 2. Setup environment
    await setupEnvironment();
    
    // 3. Create start scripts
    await createStartScripts();
    
    // 4. Test installation
    await testInstallation();
    
    console.log('\n✅ Backend installation complete!');
    console.log('🔧 Next steps:');
    console.log('1. Update your .env file with actual API keys');
    console.log('2. Run "npm run start:backend" to start the server');
    console.log('3. Backend will be available at http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Backend installation failed:', error.message);
    process.exit(1);
  }
}

async function installDependencies() {
  console.log('📦 Installing backend dependencies...');
  
  try {
    // Change to backend directory
    process.chdir('src/backend');
    
    // Install dependencies
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    throw new Error(`Failed to install dependencies: ${error.message}`);
  } finally {
    // Change back to project root
    process.chdir('../..');
  }
}

async function setupEnvironment() {
  console.log('⚙️ Setting up environment configuration...');
  
  const envPath = 'src/backend/.env';
  const envExamplePath = 'src/backend/.env.example';
  
  try {
    // Check if .env already exists
    try {
      await fs.access(envPath);
      console.log('⚠️ .env file already exists, skipping creation');
      return;
    } catch {
      // File doesn't exist, create it
    }
    
    // Read the example file
    const exampleContent = await fs.readFile(envExamplePath, 'utf8');
    
    // Generate secure secrets
    const jwtSecret = crypto.randomBytes(64).toString('hex');
    const cookieSecret = crypto.randomBytes(32).toString('hex');
    
    // Replace placeholder values
    let envContent = exampleContent
      .replace('your-super-secret-jwt-key-change-this-in-production', jwtSecret)
      .replace('your-cookie-secret-key-here', cookieSecret);
    
    // Write the .env file
    await fs.writeFile(envPath, envContent, 'utf8');
    
    console.log('✅ Environment file created with secure secrets');
    console.log('⚠️ Remember to update Stripe keys and other API keys in .env');
    
  } catch (error) {
    throw new Error(`Failed to setup environment: ${error.message}`);
  }
}

async function createStartScripts() {
  console.log('📝 Creating start scripts...');
  
  try {
    // Read current package.json
    const packageJsonPath = 'package.json';
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    // Add backend scripts if they don't exist
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    packageJson.scripts['start:backend'] = 'cd src/backend && npm start';
    packageJson.scripts['dev:backend'] = 'cd src/backend && npm run dev';
    packageJson.scripts['install:backend'] = 'cd src/backend && npm install';
    
    // Write updated package.json
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    
    console.log('✅ Start scripts added to package.json');
    
  } catch (error) {
    throw new Error(`Failed to create start scripts: ${error.message}`);
  }
}

async function testInstallation() {
  console.log('🧪 Testing installation...');
  
  try {
    // Test that all files exist
    const requiredFiles = [
      'src/backend/server.js',
      'src/backend/package.json',
      'src/backend/.env',
      'src/backend/api/subscription.js',
      'src/backend/middleware/auth.js',
      'src/backend/auth/AuthManager.js',
      'src/backend/features/FeatureManager.js',
      'src/backend/webhooks/stripe.js'
    ];
    
    for (const file of requiredFiles) {
      await fs.access(file);
    }
    
    console.log('✅ All required files are present');
    
    // Test that node_modules exists in backend
    await fs.access('src/backend/node_modules');
    console.log('✅ Backend dependencies are installed');
    
  } catch (error) {
    throw new Error(`Installation test failed: ${error.message}`);
  }
}

// Run installation if called directly
if (process.argv.includes('--install')) {
  installBackend();
} else {
  console.log('🔧 Backend Installation Script');
  console.log('\\nThis will install and configure the RinaWarp Terminal backend server.');
  console.log('\\n📋 What this script does:');
  console.log('1. Installs all backend dependencies via npm');
  console.log('2. Creates .env file with secure default secrets');
  console.log('3. Adds backend start scripts to main package.json');
  console.log('4. Tests the installation');
  console.log('\\n🚀 To install: node scripts/install-backend.cjs --install');
}
