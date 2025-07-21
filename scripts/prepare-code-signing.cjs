#!/usr/bin/env node

/**
 * Prepare Code Signing Environment
 * This script helps set up the code signing process
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if we're on the right platform
const platform = process.platform;

console.log('🔐 Preparing Code Signing Environment\n');

// Create necessary directories
const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
  console.log('✅ Created build directory');
}

// Create entitlements file for macOS
if (platform === 'darwin' || process.argv.includes('--all')) {
  const entitlementsPath = path.join(buildDir, 'entitlements.mac.plist');
  const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.device.microphone</key>
    <true/>
    <key>com.apple.security.device.camera</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
</dict>
</plist>`;

  fs.writeFileSync(entitlementsPath, entitlementsContent);
  console.log('✅ Created macOS entitlements file');
}

// Create electron-builder environment template
const envTemplatePath = path.join(buildDir, 'electron-builder.env.template');
const envTemplate = `# Code Signing Environment Variables
# Copy this to .env.local and fill in your values

# macOS Code Signing
CSC_LINK=path/to/your/certificate.p12
CSC_KEY_PASSWORD=your_certificate_password
APPLE_ID=your.email@example.com
APPLE_ID_PASSWORD=your_app_specific_password
APPLE_TEAM_ID=YOUR_TEAM_ID

# Windows Code Signing
WIN_CSC_LINK=path/to/your/certificate.pfx
WIN_CSC_KEY_PASSWORD=your_certificate_password

# Auto-update Configuration
GH_TOKEN=your_github_personal_access_token
`;

fs.writeFileSync(envTemplatePath, envTemplate);
console.log('✅ Created environment template file');

// Update package.json with signing configuration
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Ensure build configuration exists
if (!packageJson.build) {
  packageJson.build = {};
}

// Update macOS configuration
packageJson.build.mac = {
  ...packageJson.build.mac,
  hardenedRuntime: true,
  gatekeeperAssess: false,
  entitlements: 'build/entitlements.mac.plist',
  entitlementsInherit: 'build/entitlements.mac.plist',
  category: 'public.app-category.developer-tools',
  notarize: {
    teamId: '${env.APPLE_TEAM_ID}',
  },
};

// Update Windows configuration
packageJson.build.win = {
  ...packageJson.build.win,
  signingHashAlgorithms: ['sha256'],
  sign: './build/windowsSign.js',
  verifyUpdateCodeSignature: true,
};

// Add publish configuration for auto-updates
packageJson.build.publish = [
  {
    provider: 'github',
    owner: 'Rinawarp-Terminal',
    repo: 'rinawarp-terminal',
  },
];

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json with signing configuration');

// Create Windows signing script
const winSignPath = path.join(buildDir, 'windowsSign.js');
const winSignContent = `exports.default = async function(configuration) {
  // Windows signing will be handled by electron-builder
  // This is a placeholder for custom signing logic if needed
  console.log('Signing', configuration.path);
  
  // You can add custom signing logic here
  // For example, using signtool.exe with specific parameters
};
`;

fs.writeFileSync(winSignPath, winSignContent);
console.log('✅ Created Windows signing script');

// Create signing verification script
const verifyScriptPath = path.join(__dirname, 'verify-signing.cjs');
const verifyScriptContent = `#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Verifying Code Signing\\n');

const platform = process.platform;

if (platform === 'darwin') {
  // macOS verification
  const appPath = path.join(__dirname, '..', 'dist', 'mac', 'RinaWarp Terminal.app');
  
  if (fs.existsSync(appPath)) {
    try {
      console.log('Verifying signature...');
      const result = execSync(\`codesign --verify --deep --strict --verbose=2 "\${appPath}"\`, { encoding: 'utf8' });
      console.log('✅ Signature verified successfully');
      
      console.log('\\nChecking notarization...');
      const spctl = execSync(\`spctl -a -t exec -vvv "\${appPath}"\`, { encoding: 'utf8' });
      console.log('✅ Notarization verified successfully');
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
    }
  } else {
    console.log('❌ App not found. Build the app first.');
  }
} else if (platform === 'win32') {
  // Windows verification
  const exePath = path.join(__dirname, '..', 'dist', 'RinaWarp Terminal Setup.exe');
  
  if (fs.existsSync(exePath)) {
    try {
      console.log('Verifying signature...');
      const result = execSync(\`powershell "Get-AuthenticodeSignature '\${exePath}'"\`, { encoding: 'utf8' });
      console.log(result);
      
      if (result.includes('Valid')) {
        console.log('✅ Signature verified successfully');
      } else {
        console.log('❌ Signature verification failed');
      }
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
    }
  } else {
    console.log('❌ Installer not found. Build the app first.');
  }
}
`;

fs.writeFileSync(verifyScriptPath, verifyScriptContent);
fs.chmodSync(verifyScriptPath, '755');
console.log('✅ Created signing verification script');

console.log('\n📋 Next Steps:');
console.log('1. For macOS:');
console.log('   - Create Apple Developer account at https://developer.apple.com');
console.log('   - Create Developer ID Application certificate');
console.log('   - Export certificate as .p12 file');
console.log('   - Create app-specific password at https://appleid.apple.com');
console.log('\n2. For Windows:');
console.log('   - Purchase code signing certificate from DigiCert or Sectigo');
console.log('   - Export certificate as .pfx file');
console.log('\n3. Copy build/electron-builder.env.template to .env.local');
console.log('4. Fill in your certificate paths and passwords');
console.log('5. Run: npm run build:dev to test signing');
console.log('6. Run: node scripts/verify-signing.cjs to verify');
