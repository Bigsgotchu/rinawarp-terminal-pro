#!/usr/bin/env node

/**
 * RinaWarp Terminal Build Validation
 * Checks if all critical build issues have been resolved
 */

import { promises as fs } from 'fs';
import { execSync } from 'child_process';

const checks = [];

async function validateAuthMiddleware() {
  try {
    const content = await fs.readFile('./src/middleware/auth_old.js', 'utf8');

    if (content.includes('REFRESH_SECRET')) {
      checks.push('✅ REFRESH_SECRET is defined');
    } else {
      checks.push('❌ REFRESH_SECRET still missing');
    }

    if (content.includes('ROLE_PERMISSIONS')) {
      checks.push('✅ ROLE_PERMISSIONS is defined');
    } else {
      checks.push('❌ ROLE_PERMISSIONS still missing');
    }

    // Test syntax
    execSync('node -c ./src/middleware/auth_old.js', { stdio: 'pipe' });
    checks.push('✅ Auth middleware syntax is valid');
  } catch (error) {
    checks.push(`❌ Auth middleware validation failed: ${error.message}`);
  }
}

async function validateEnvironment() {
  try {
    if (
      await fs
        .access('.env')
        .then(() => true)
        .catch(() => false)
    ) {
      checks.push('✅ .env file exists');
    } else {
      checks.push('⚠️ .env file missing (using .env.template)');
    }

    if (
      await fs
        .access('.env.template')
        .then(() => true)
        .catch(() => false)
    ) {
      checks.push('✅ .env.template exists');
    } else {
      checks.push('❌ .env.template missing');
    }
  } catch (error) {
    checks.push(`❌ Environment validation failed: ${error.message}`);
  }
}

async function validateAssets() {
  try {
    const assetFiles = ['assets/icon.icns', 'assets/icon.ico', 'assets/icon.png'];
    let allExist = true;

    for (const file of assetFiles) {
      if (
        await fs
          .access(file)
          .then(() => true)
          .catch(() => false)
      ) {
        // File exists, but check if it's just a placeholder
        const content = await fs.readFile(file, 'utf8');
        if (content.includes('Placeholder')) {
          checks.push(`⚠️ ${file} exists but is placeholder`);
        } else {
          checks.push(`✅ ${file} exists and has content`);
        }
      } else {
        checks.push(`❌ ${file} missing`);
        allExist = false;
      }
    }

    if (allExist) {
      checks.push('✅ All asset files present');
    }
  } catch (error) {
    checks.push(`❌ Asset validation failed: ${error.message}`);
  }
}

async function validatePackageJson() {
  try {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));

    if (packageJson.build) {
      checks.push('✅ Electron-builder config exists');

      if (packageJson.build.appId && packageJson.build.productName) {
        checks.push('✅ App metadata configured');
      } else {
        checks.push('⚠️ App metadata incomplete');
      }
    } else {
      checks.push('❌ Electron-builder config missing');
    }

    // Check for essential scripts
    if (packageJson.scripts && packageJson.scripts.build) {
      checks.push('✅ Build script exists');
    } else {
      checks.push('⚠️ Build script missing');
    }
  } catch (error) {
    checks.push(`❌ Package.json validation failed: ${error.message}`);
  }
}

async function validateBuildSystem() {
  try {
    if (
      await fs
        .access('./build.sh')
        .then(() => true)
        .catch(() => false)
    ) {
      checks.push('✅ Build script exists');

      // Check if executable
      const stats = await fs.stat('./build.sh');
      if (stats.mode & parseInt('111', 8)) {
        checks.push('✅ Build script is executable');
      } else {
        checks.push('⚠️ Build script not executable');
      }
    } else {
      checks.push('❌ Build script missing');
    }
  } catch (error) {
    checks.push(`❌ Build system validation failed: ${error.message}`);
  }
}

async function testBasicBuild() {
  try {
    console.log('🧪 Testing basic Node.js syntax validation...');

    // Test key files for syntax errors
    const testFiles = [
      './src/middleware/auth_old.js',
      './fix-csp-violations.js',
      './final-server.js',
    ];

    for (const file of testFiles) {
      try {
        if (
          await fs
            .access(file)
            .then(() => true)
            .catch(() => false)
        ) {
          execSync(`node -c "${file}"`, { stdio: 'pipe' });
          checks.push(`✅ ${file} syntax valid`);
        }
      } catch (syntaxError) {
        checks.push(`❌ ${file} syntax error: ${syntaxError.message}`);
      }
    }
  } catch (error) {
    checks.push(`❌ Build test failed: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 RinaWarp Terminal Build Validation');
  console.log('=====================================');
  console.log('');

  await validateAuthMiddleware();
  await validateEnvironment();
  await validateAssets();
  await validatePackageJson();
  await validateBuildSystem();
  await testBasicBuild();

  console.log('📊 VALIDATION RESULTS:');
  console.log('======================');

  let passed = 0;
  let warnings = 0;
  let failed = 0;

  checks.forEach(check => {
    console.log(check);
    if (check.startsWith('✅')) passed++;
    else if (check.startsWith('⚠️')) warnings++;
    else if (check.startsWith('❌')) failed++;
  });

  console.log('');
  console.log('📈 SUMMARY:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ⚠️ Warnings: ${warnings}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('');
    console.log('🎉 BUILD READY!');
    console.log('===============');
    console.log('✅ All critical issues resolved');
    console.log('🚀 Ready to run: npm run build');
    console.log('🏗️ Ready to run: ./build.sh (full multi-platform)');

    if (warnings > 0) {
      console.log('');
      console.log('💡 Optional improvements:');
      console.log('• Replace placeholder icons with actual RinaWarp icons');
      console.log('• Configure any missing environment variables');
    }
  } else {
    console.log('');
    console.log('⚠️ BUILD ISSUES REMAIN');
    console.log('======================');
    console.log('Please fix the failed checks above before building');
  }
}

main().catch(console.error);
