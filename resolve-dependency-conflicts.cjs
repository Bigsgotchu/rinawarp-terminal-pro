/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

console.log('🔧 Dependency Conflict Resolution Helper');
console.log('=======================================\n');

// Read the conflict report
const reportPath = path.join(__dirname, 'dependency-conflicts-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('❌ No dependency-conflicts-report.json found. Run fix-duplicates-and-conflicts.cjs first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Strategy: Use the latest version from main package.json as the standard
console.log('📋 Analyzing dependency conflicts...\n');

const resolutions = {};
const updates = {};

report.conflicts.forEach(conflict => {
  const { dependency, versions } = conflict;
    
  // Find the version in main package.json
  const mainVersion = versions.find(v => v.file === 'package.json');
    
  if (mainVersion) {
    resolutions[dependency] = mainVersion.version;
    console.log(`✅ ${dependency}: Will standardize to ${mainVersion.version} (from main package.json)`);
        
    // Track which files need updates
    versions.forEach(v => {
      if (v.file !== 'package.json' && v.version !== mainVersion.version) {
        if (!updates[v.file]) {
          updates[v.file] = {};
        }
        updates[v.file][dependency] = {
          old: v.version,
          new: mainVersion.version
        };
      }
    });
  } else {
    // If not in main package.json, use the most recent version
    const sortedVersions = versions.map(v => v.version).sort().reverse();
    resolutions[dependency] = sortedVersions[0];
    console.log(`⚠️  ${dependency}: No main version found, using latest: ${sortedVersions[0]}`);
  }
});

console.log('\n📝 Creating resolution script...\n');

// Generate update commands
const updateScript = `#!/bin/bash
# Dependency Resolution Script
# Generated on ${new Date().toISOString()}

echo "🔄 Updating dependency versions..."

`;

let scriptContent = updateScript;

// Add package.json updates
Object.entries(updates).forEach(([file, deps]) => {
  scriptContent += `\n# Updating ${file}\n`;
  scriptContent += `echo "📦 Updating ${file}..."\n`;
    
  Object.entries(deps).forEach(([dep, versions]) => {
    scriptContent += `sed -i '' 's/"${dep}": "${versions.old}"/"${dep}": "${versions.new}"/g' "${file}"\n`;
  });
});

// Add npm install commands
scriptContent += `
# Run npm install in all directories
echo "🔧 Running npm install in all package directories..."

# Main directory
echo "📌 Installing in main directory..."
npm install

# Cloud AI service
if [ -d "cloud-ai-service" ]; then
    echo "📌 Installing in cloud-ai-service..."
    cd cloud-ai-service && npm install && cd ..
fi

# SDK
if [ -d "sdk/javascript" ]; then
    echo "📌 Installing in sdk/javascript..."
    cd sdk/javascript && npm install && cd ../..
fi

# Cleanup tool
if [ -d "tools/rinawarp-cleanup" ]; then
    echo "📌 Installing in tools/rinawarp-cleanup..."
    cd tools/rinawarp-cleanup && npm install && cd ../..
fi

echo "✅ Dependency resolution complete!"
`;

// Save the script
const scriptPath = path.join(__dirname, 'apply-dependency-resolutions.sh');
fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

console.log(`✅ Resolution script created: ${scriptPath}`);
console.log('\n📋 Summary of resolutions:');
console.log('==========================');

Object.entries(resolutions).forEach(([dep, version]) => {
  console.log(`  ${dep}: ${version}`);
});

console.log('\n🎯 Next steps:');
console.log('1. Review the resolutions above');
console.log('2. Run: chmod +x apply-dependency-resolutions.sh');
console.log('3. Run: ./apply-dependency-resolutions.sh');
console.log('4. Test your application thoroughly');

// Create a summary report
const summaryReport = {
  timestamp: new Date().toISOString(),
  resolutions,
  updates,
  recommendedActions: [
    'Update all package.json files to use consistent versions',
    'Consider using a monorepo tool like Lerna or Nx for better dependency management',
    'Add a root package.json with workspaces configuration',
    'Use npm audit fix after updating dependencies'
  ]
};

fs.writeFileSync(
  path.join(__dirname, 'dependency-resolution-summary.json'),
  JSON.stringify(summaryReport, null, 2)
);

console.log('\n📄 Summary report saved to: dependency-resolution-summary.json');
