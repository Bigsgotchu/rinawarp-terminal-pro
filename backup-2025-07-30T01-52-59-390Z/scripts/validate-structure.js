#!/usr/bin/env node

/**
 * Directory Structure Validation Script
 * Validates that all required directories and files exist
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_DIRECTORIES = [
  'src',
  'public',
  'styles',
  'scripts',
  'tests',
  'docs',
  'docs/guides',
  'build',
  'releases',
  'reports',
  'tmp',
  'temp',
];

const REQUIRED_FILES = [
  'package.json',
  'README.md',
  'CONTRIBUTING.md',
  'docs/guides/QUICKSTART.md',
  'docs/guides/SETUP.md',
  'docs/guides/INSTALL.md',
  'docs/API.md',
  'src/main.cjs',
  'src/preload.js',
];

const OPTIONAL_FILES = [
  '.env.example',
  '.gitignore',
  '.eslintrc.json',
  '.prettierrc',
  'jest.config.cjs',
  'tailwind.config.js',
  'postcss.config.js',
];

function validateDirectories() {
  console.log('🔍 Validating directory structure...\n');

  let valid = true;

  for (const dir of REQUIRED_DIRECTORIES) {
    const fullPath = path.join(process.cwd(), dir);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      console.log(`✅ ${dir}`);
    } else {
      console.log(`❌ ${dir} - Missing directory`);
      valid = false;
    }
  }

  return valid;
}

function validateFiles() {
  console.log('\n📄 Validating required files...\n');

  let valid = true;

  for (const file of REQUIRED_FILES) {
    const fullPath = path.join(process.cwd(), file);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - Missing file`);
      valid = false;
    }
  }

  return valid;
}

function validateOptionalFiles() {
  console.log('\n📋 Checking optional files...\n');

  for (const file of OPTIONAL_FILES) {
    const fullPath = path.join(process.cwd(), file);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`⚠️  ${file} - Optional file not found`);
    }
  }
}

function validatePackageJson() {
  console.log('\n📦 Validating package.json...\n');

  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Check required fields
    const requiredFields = ['name', 'version', 'description', 'main', 'scripts'];
    let valid = true;

    for (const field of requiredFields) {
      if (packageJson[field]) {
        console.log(
          `✅ ${field}: ${typeof packageJson[field] === 'object' ? '[object]' : packageJson[field]}`
        );
      } else {
        console.log(`❌ ${field}: Missing required field`);
        valid = false;
      }
    }

    // Check important scripts
    const requiredScripts = ['start', 'dev', 'test', 'lint', 'build'];
    for (const script of requiredScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        console.log(`✅ Script: ${script}`);
      } else {
        console.log(`❌ Script: ${script} - Missing required script`);
        valid = false;
      }
    }

    return valid;
  } catch (error) {
    console.log(`❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

function validateDocumentation() {
  console.log('\n📚 Validating documentation structure...\n');

  try {
    const readmePath = path.join(process.cwd(), 'README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf8');

    // Check for essential README sections
    const requiredSections = ['Installation', 'Features', 'Usage', 'Documentation'];

    const valid = true;

    for (const section of requiredSections) {
      if (readmeContent.includes(section)) {
        console.log(`✅ README section: ${section}`);
      } else {
        console.log(`⚠️  README section: ${section} - Not found`);
      }
    }

    return valid;
  } catch (error) {
    console.log(`❌ Error reading README.md: ${error.message}`);
    return false;
  }
}

function generateReport() {
  console.log('\n📊 Generating structure report...\n');

  const report = {
    timestamp: new Date().toISOString(),
    directories: {},
    files: {},
    validation: {
      passed: true,
      errors: [],
      warnings: [],
    },
  };

  // Check directories
  for (const dir of REQUIRED_DIRECTORIES) {
    const fullPath = path.join(process.cwd(), dir);
    report.directories[dir] = {
      exists: fs.existsSync(fullPath),
      isDirectory: fs.existsSync(fullPath) ? fs.statSync(fullPath).isDirectory() : false,
    };

    if (!report.directories[dir].exists || !report.directories[dir].isDirectory) {
      report.validation.passed = false;
      report.validation.errors.push(`Missing directory: ${dir}`);
    }
  }

  // Check files
  for (const file of REQUIRED_FILES) {
    const fullPath = path.join(process.cwd(), file);
    report.files[file] = {
      exists: fs.existsSync(fullPath),
      isFile: fs.existsSync(fullPath) ? fs.statSync(fullPath).isFile() : false,
    };

    if (!report.files[file].exists || !report.files[file].isFile) {
      report.validation.passed = false;
      report.validation.errors.push(`Missing file: ${file}`);
    }
  }

  // Save report
  const reportPath = path.join(process.cwd(), 'reports', 'structure-validation.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`📄 Report saved to: ${reportPath}`);

  return report;
}

function main() {
  console.log('🚀 RinaWarp Terminal - Structure Validation\n');
  console.log('=========================================\n');

  const directoriesValid = validateDirectories();
  const filesValid = validateFiles();
  const packageValid = validatePackageJson();
  const docsValid = validateDocumentation();

  validateOptionalFiles();

  const report = generateReport();

  console.log('\n📈 Summary:\n');
  console.log(`Directories: ${directoriesValid ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`Files: ${filesValid ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`Package.json: ${packageValid ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`Documentation: ${docsValid ? '✅ Valid' : '⚠️  Could be improved'}`);

  const overallValid = directoriesValid && filesValid && packageValid;

  if (overallValid) {
    console.log('\n🎉 Project structure is valid!');
    process.exit(0);
  } else {
    console.log('\n❌ Project structure validation failed!');
    console.log('\nErrors:');
    report.validation.errors.forEach(error => console.log(`  - ${error}`));
    process.exit(1);
  }
}

// Run if called directly
main();

export {
  validateDirectories,
  validateFiles,
  validatePackageJson,
  validateDocumentation,
  generateReport,
};
