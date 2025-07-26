#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Proper Dependency Resolution Script');
console.log('=====================================\n');

// Read the resolution summary
const summaryPath = path.join(__dirname, 'dependency-resolution-summary.json');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

// Function to update package.json files
function updatePackageJson(filePath, updates) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return;
    }
    
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;
    
    Object.entries(updates).forEach(([dep, versions]) => {
        if (pkg.dependencies && pkg.dependencies[dep]) {
            console.log(`  📦 ${dep}: ${pkg.dependencies[dep]} → ${versions.new}`);
            pkg.dependencies[dep] = versions.new;
            modified = true;
        }
        if (pkg.devDependencies && pkg.devDependencies[dep]) {
            console.log(`  📦 ${dep}: ${pkg.devDependencies[dep]} → ${versions.new}`);
            pkg.devDependencies[dep] = versions.new;
            modified = true;
        }
    });
    
    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`  ✅ Updated ${filePath}`);
    } else {
        console.log(`  ℹ️  No changes needed for ${filePath}`);
    }
}

// Special handling for ESLint compatibility
function handleEslintCompatibility(filePath) {
    if (!fs.existsSync(filePath)) return;
    
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // If using TypeScript ESLint plugins with ESLint 9, we need to update them
    if (pkg.devDependencies) {
        if (pkg.devDependencies['@typescript-eslint/parser'] && 
            pkg.devDependencies['@typescript-eslint/parser'].startsWith('^5')) {
            console.log('  🔄 Updating TypeScript ESLint plugins for ESLint 9 compatibility...');
            pkg.devDependencies['@typescript-eslint/parser'] = '^8.0.0';
            pkg.devDependencies['@typescript-eslint/eslint-plugin'] = '^8.0.0';
            fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
        }
    }
}

console.log('📝 Updating package.json files...\n');

// Update each package.json
Object.entries(summary.updates).forEach(([file, updates]) => {
    const filePath = path.join(__dirname, file);
    console.log(`\n📦 Processing ${file}...`);
    updatePackageJson(filePath, updates);
});

// Handle ESLint compatibility issues
console.log('\n🔧 Handling ESLint compatibility...');
handleEslintCompatibility(path.join(__dirname, 'sdk/javascript/package.json'));

// Create monorepo configuration
console.log('\n📋 Creating monorepo configuration...\n');

const workspaceConfig = {
    name: "rinawarp-terminal-monorepo",
    private: true,
    workspaces: [
        ".",
        "cloud-ai-service",
        "sdk/javascript", 
        "tools/rinawarp-cleanup",
        "deprecated/email-testing-suite"
    ],
    scripts: {
        "install:all": "npm install --workspaces",
        "test:all": "npm test --workspaces",
        "build:all": "npm run build --workspaces --if-present",
        "audit:all": "npm audit --workspaces",
        "audit:fix": "npm audit fix --workspaces"
    }
};

// Check if root package.json has workspaces
const rootPkgPath = path.join(__dirname, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

if (!rootPkg.workspaces) {
    console.log('✅ Adding workspace configuration to root package.json...');
    rootPkg.workspaces = workspaceConfig.workspaces.slice(1); // Exclude "." from workspaces
    
    // Add workspace scripts
    Object.entries(workspaceConfig.scripts).forEach(([key, value]) => {
        if (!rootPkg.scripts[key]) {
            rootPkg.scripts[key] = value;
        }
    });
    
    fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
    console.log('✅ Workspace configuration added!');
} else {
    console.log('ℹ️  Workspace configuration already exists');
}

console.log('\n🎯 Next steps:');
console.log('1. Run: npm install (this will install all workspace dependencies)');
console.log('2. Run: npm audit fix --workspaces');
console.log('3. Run: npm test to verify everything works');
console.log('\n✅ Dependency updates complete!');
