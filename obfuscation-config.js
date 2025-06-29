/**
 * RinaWarp Terminal - Code Obfuscation Configuration
 * Protects sensitive commercial code from reverse engineering
 */

import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';
import path from 'path';

const obfuscationConfig = {
  // Maximum security settings for commercial protection
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1.0, // Increased from 0.8
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.8, // Increased from 0.4
  debugProtection: true,
  debugProtectionInterval: 1000, // More frequent checks
  disableConsoleOutput: true,
  identifierNamesGenerator: 'mangled', // Changed from 'hexadecimal'
  log: false,
  numbersToExpressions: true,
  renameGlobals: true, // Changed from false
  renameProperties: true, // Added for property renaming
  reservedNames: [], // Don't reserve any names
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5, // Smaller chunks for better obfuscation
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 1.0, // Increased from 0.8
  stringArrayEncoding: ['base64', 'rc4'], // Added rc4 encoding
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 5, // Increased from 2
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 8, // Increased from 4
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 1.0, // Increased from 0.8
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
};

// Files to obfuscate (protected commercial modules)
const protectedFiles = [
  'src/licensing/protected/license-validator.js',
  'src/core/protected/',
  'src/enterprise/protected/',
  'src/ai/protected/',
  'src/payment/protected/',
];

// Files to exclude from obfuscation
const excludedFiles = [
  'node_modules/',
  'test/',
  'tests/',
  '.git/',
  'dist/',
  'build/',
  'src/main.js', // Keep main entry point readable for debugging
  'src/renderer/renderer.js', // Keep UI readable for maintenance
];

/**
 * Obfuscate a single JavaScript file
 */
function obfuscateFile(inputPath, outputPath) {
  try {
    const sourceCode = fs.readFileSync(inputPath, 'utf8');
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationConfig);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, obfuscatedCode.getObfuscatedCode());
    console.log(`✅ Obfuscated: ${inputPath} -> ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error obfuscating ${inputPath}:`, error.message);
  }
}

/**
 * Recursively obfuscate all JS files in a directory
 */
function obfuscateDirectory(inputDir, outputDir) {
  if (!fs.existsSync(inputDir)) {
    console.warn(`⚠️  Directory not found: ${inputDir}`);
    return;
  }

  const files = fs.readdirSync(inputDir);

  files.forEach(file => {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);
    const stat = fs.statSync(inputPath);

    if (stat.isDirectory()) {
      obfuscateDirectory(inputPath, outputPath);
    } else if (path.extname(file) === '.js') {
      obfuscateFile(inputPath, outputPath);
    } else {
      // Copy non-JS files as-is
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }
      fs.copyFileSync(inputPath, outputPath);
    }
  });
}

/**
 * Main obfuscation process
 */
function obfuscateProtectedModules() {
  console.log('🔒 Starting RinaWarp Terminal code obfuscation...');

  const outputBase = 'dist/obfuscated';

  // Clean output directory
  if (fs.existsSync(outputBase)) {
    fs.rmSync(outputBase, { recursive: true, force: true });
  }
  fs.mkdirSync(outputBase, { recursive: true });

  protectedFiles.forEach(filePath => {
    const fullInputPath = path.resolve(filePath);
    const relativePath = path.relative(process.cwd(), fullInputPath);
    const outputPath = path.join(outputBase, relativePath);

    if (fs.existsSync(fullInputPath)) {
      const stat = fs.statSync(fullInputPath);

      if (stat.isDirectory()) {
        console.log(`📁 Obfuscating directory: ${filePath}`);
        obfuscateDirectory(fullInputPath, outputPath);
      } else {
        console.log(`📄 Obfuscating file: ${filePath}`);
        obfuscateFile(fullInputPath, outputPath);
      }
    } else {
      console.warn(`⚠️  Protected file not found: ${filePath}`);
    }
  });

  console.log('✅ Code obfuscation completed!');
  console.log(`📦 Obfuscated files saved to: ${outputBase}`);
}

/**
 * Verify obfuscation integrity
 */
function verifyObfuscation() {
  console.log('🔍 Verifying obfuscation integrity...');

  const outputBase = 'dist/obfuscated';
  let verificationPassed = true;

  protectedFiles.forEach(filePath => {
    const relativePath = path.relative(process.cwd(), path.resolve(filePath));
    const obfuscatedPath = path.join(outputBase, relativePath);

    if (fs.existsSync(obfuscatedPath)) {
      const stat = fs.statSync(obfuscatedPath);

      if (stat.isFile()) {
        const obfuscatedCode = fs.readFileSync(obfuscatedPath, 'utf8');

        // Check for common unobfuscated patterns
        const sensitivePatterns = [
          'license-validator',
          'validateLicense',
          'LicenseValidator',
          'rinawarp-terminal.web.app',
          'getMachineId',
        ];

        const foundPatterns = sensitivePatterns.filter(pattern => obfuscatedCode.includes(pattern));

        if (foundPatterns.length > 0) {
          console.warn(`⚠️  Potential obfuscation issue in ${obfuscatedPath}:`);
          console.warn(`   Found unobfuscated patterns: ${foundPatterns.join(', ')}`);
          verificationPassed = false;
        }
      }
    }
  });

  if (verificationPassed) {
    console.log('✅ Obfuscation verification passed!');
  } else {
    console.error('❌ Obfuscation verification failed - review configuration');
  }

  return verificationPassed;
}

// Export for use in build scripts
export {
  obfuscationConfig,
  obfuscateProtectedModules,
  verifyObfuscation,
  obfuscateFile,
  obfuscateDirectory,
};

// Run if called directly
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const command = process.argv[2];

  switch (command) {
    case 'obfuscate':
      obfuscateProtectedModules();
      break;
    case 'verify':
      verifyObfuscation();
      break;
    case 'all':
      obfuscateProtectedModules();
      verifyObfuscation();
      break;
    default:
      console.log('Usage: node obfuscation-config.js [obfuscate|verify|all]');
      break;
  }
}
