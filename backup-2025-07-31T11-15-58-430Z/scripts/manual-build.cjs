#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🛠️  Manual RinaWarp Terminal Build');

const appName = 'RinaWarp Terminal';
const outputDir = 'dist-manual';
const appDir = path.join(outputDir, `${appName}.app`);

// Clean output directory
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
fs.mkdirSync(outputDir, { recursive: true });

// Create app bundle structure
const contentsDir = path.join(appDir, 'Contents');
const macosDir = path.join(contentsDir, 'MacOS');
const resourcesDir = path.join(contentsDir, 'Resources');

fs.mkdirSync(macosDir, { recursive: true });
fs.mkdirSync(resourcesDir, { recursive: true });

// Copy Electron binary from node_modules
const electronBinary = 'node_modules/electron/dist/Electron.app';
if (fs.existsSync(electronBinary)) {
  console.log('📦 Copying Electron framework...');
  execSync(`cp -R "${electronBinary}/"* "${appDir}/"`);
} else {
  console.error('❌ Electron not found in node_modules');
  process.exit(1);
}

// Copy your application files
console.log('📁 Copying application source...');
const filesToCopy = ['src', 'public', 'styles', 'package.json', 'server.js', '.env'];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    const isDir = fs.statSync(file).isDirectory();
    if (isDir) {
      execSync(`cp -R "${file}" "${resourcesDir}/"`);
    } else {
      execSync(`cp "${file}" "${resourcesDir}/"`);
    }
    console.log(`  ✅ Copied ${file}`);
  } else {
    console.log(`  ⚠️  Skipped ${file} (not found)`);
  }
});

// Copy node_modules (essential ones only)
console.log('📦 Copying essential dependencies...');
const essentialDeps = ['@xterm', 'express', 'ws', 'dotenv', 'cors'];

const nodeModulesDir = path.join(resourcesDir, 'node_modules');
fs.mkdirSync(nodeModulesDir, { recursive: true });

essentialDeps.forEach(dep => {
  const depPath = path.join('node_modules', dep);
  if (fs.existsSync(depPath)) {
    execSync(`cp -R "${depPath}" "${nodeModulesDir}/"`);
    console.log(`  ✅ Copied ${dep}`);
  }
});

// Create package.json in Resources to tell Electron where main is
const appPackageJson = {
  name: 'rinawarp-terminal',
  version: '1.0.19',
  main: 'src/main.cjs',
};
fs.writeFileSync(path.join(resourcesDir, 'package.json'), JSON.stringify(appPackageJson, null, 2));
console.log('✅ Created app package.json');

// Create Info.plist
const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>${appName}</string>
    <key>CFBundleExecutable</key>
    <string>Electron</string>
    <key>CFBundleIconFile</key>
    <string>app.icns</string>
    <key>CFBundleIdentifier</key>
    <string>com.rinawarp.terminal</string>
    <key>CFBundleName</key>
    <string>${appName}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.19</string>
    <key>CFBundleVersion</key>
    <string>1.0.19</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
</dict>
</plist>`;

fs.writeFileSync(path.join(contentsDir, 'Info.plist'), infoPlist);
console.log('✅ Created Info.plist');

// Copy icon if it exists
const iconPath = 'assets/icns/rinawarp-mermaid-icon.icns';
if (fs.existsSync(iconPath)) {
  execSync(`cp "${iconPath}" "${resourcesDir}/app.icns"`);
  console.log('✅ Copied app icon');
}

// Set permissions
console.log('🔒 Setting permissions...');
execSync(`chmod +x "${path.join(macosDir, 'Electron')}"`);

console.log(`🎉 Build complete! App created at: ${appDir}`);
console.log('📱 To install, run: cp -R "' + appDir + '" /Applications/');
console.log('🚀 The app will now launch correctly when double-clicked!');
