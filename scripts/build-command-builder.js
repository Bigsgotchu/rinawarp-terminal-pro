#!/usr/bin/env node

/**
 * Production Build Script for Visual Command Builder
 * Bundles, optimizes, and prepares for deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log(chalk.cyan.bold('🧜‍♀️ Building Visual Command Builder for Production\n'));

// Build steps
const buildSteps = [
  {
    name: 'Clean previous builds',
    command: 'rm -rf dist/renderer dist/public dist/styles',
    description: 'Removing old build artifacts',
  },
  {
    name: 'Bundle JavaScript and CSS',
    command: 'NODE_ENV=production webpack --config webpack.command-builder.config.js --progress',
    description: 'Optimizing and bundling assets',
  },
  {
    name: 'Analyze bundle size',
    command: 'ANALYZE=true NODE_ENV=production webpack --config webpack.command-builder.config.js',
    description: 'Generating bundle analysis report',
  },
  {
    name: 'Compress assets',
    command: 'node scripts/compress-assets.js',
    description: 'Applying gzip compression',
    optional: true,
  },
  {
    name: 'Generate manifest',
    command: 'node scripts/generate-build-manifest.js',
    description: 'Creating deployment manifest',
  },
];

const totalStartTime = Date.now();
let allStepsSuccessful = true;

for (const step of buildSteps) {
  console.log(chalk.blue(`📦 ${step.name}`));
  console.log(chalk.gray(`   ${step.description}`));

  const startTime = Date.now();

  try {
    execSync(step.command, {
      cwd: rootDir,
      stdio: step.name.includes('Analyze') ? 'pipe' : 'inherit',
    });

    const duration = Date.now() - startTime;
    console.log(chalk.green(`   ✅ Completed in ${duration}ms\n`));
  } catch (error) {
    if (step.optional) {
      console.log(chalk.yellow(`   ⚠️  Optional step failed (continuing): ${error.message}\n`));
    } else {
      console.log(chalk.red(`   ❌ Failed: ${error.message}\n`));
      allStepsSuccessful = false;
      break;
    }
  }
}

// Generate build report
if (allStepsSuccessful) {
  const totalDuration = Date.now() - totalStartTime;

  console.log(chalk.green.bold('🎉 Build completed successfully!'));
  console.log(chalk.gray(`   Total time: ${Math.round(totalDuration / 1000)}s`));

  // Check output sizes
  try {
    const distPath = path.join(rootDir, 'dist', 'renderer');
    const files = fs
      .readdirSync(distPath)
      .filter(f => f.includes('command-builder') && (f.endsWith('.js') || f.endsWith('.css')));

    if (files.length > 0) {
      console.log(chalk.cyan('\n📊 Command Builder Assets:'));

      let totalSize = 0;
      files.forEach(file => {
        const filePath = path.join(distPath, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round((stats.size / 1024) * 100) / 100;
        totalSize += stats.size;

        const sizeColor = sizeKB > 100 ? 'red' : sizeKB > 50 ? 'yellow' : 'green';
        console.log(`   ${chalk[sizeColor](`${sizeKB}KB`)} ${file}`);
      });

      const totalSizeKB = Math.round((totalSize / 1024) * 100) / 100;
      console.log(`   ${chalk.bold(`${totalSizeKB}KB`)} total`);
    }

    // Check for bundle analysis report
    const analysisPath = path.join(rootDir, 'dist', 'bundle-analysis.html');
    if (fs.existsSync(analysisPath)) {
      console.log(chalk.blue(`\n🔍 Bundle analysis: file://${analysisPath}`));
    }
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not analyze output: ${error.message}`));
  }

  console.log(chalk.green('\n✨ Ready for deployment!'));
  console.log(chalk.gray('   Run: npm run deploy or npm run start:production'));
} else {
  console.log(chalk.red.bold('\n❌ Build failed'));
  console.log(chalk.gray('   Check the errors above and try again'));
  process.exit(1);
}

console.log(chalk.cyan('\n🧜‍♀️ Visual Command Builder build complete!'));
