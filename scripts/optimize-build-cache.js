#!/usr/bin/env node

/**
 * RinaWarp Terminal - Build Cache Optimization
 * Implements intelligent caching strategies for faster builds and deployments
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

console.log('⚡ RinaWarp Terminal - Build Cache Optimization');
console.log('=============================================');

/**
 * Cache configuration
 */
const cacheConfig = {
  // NPM cache settings
  npm: {
    enabled: true,
    location: path.join(projectRoot, '.cache/npm'),
    maxSize: '500MB',
    ttl: '7d', // 7 days
  },

  // Webpack build cache
  webpack: {
    enabled: true,
    location: path.join(projectRoot, '.cache/webpack'),
    type: 'filesystem',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    compression: 'gzip',
  },

  // Electron rebuild cache
  electronRebuild: {
    enabled: true,
    location: path.join(projectRoot, '.cache/electron-rebuild'),
    cacheKey: 'electron-rebuild',
  },

  // Asset optimization cache
  assets: {
    enabled: true,
    location: path.join(projectRoot, '.cache/assets'),
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'],
    compression: true,
  },

  // Test cache
  jest: {
    enabled: true,
    location: path.join(projectRoot, '.cache/jest'),
    cacheDirectory: '.cache/jest',
  },

  // TypeScript compilation cache
  typescript: {
    enabled: true,
    location: path.join(projectRoot, '.cache/tsc'),
    incremental: true,
  },
};

/**
 * Create cache directories
 */
function createCacheDirectories() {
  logInfo('Creating cache directories...');

  Object.values(cacheConfig).forEach(config => {
    if (config.enabled && config.location) {
      if (!fs.existsSync(config.location)) {
        fs.mkdirSync(config.location, { recursive: true });
        logSuccess(`Created cache directory: ${path.relative(projectRoot, config.location)}`);
      }
    }
  });
}

/**
 * Update webpack configuration for better caching
 */
function optimizeWebpackCache() {
  logInfo('Optimizing webpack cache configuration...');

  const webpackConfigPath = path.join(projectRoot, 'webpack.config.js');
  if (!fs.existsSync(webpackConfigPath)) {
    logWarning('webpack.config.js not found, skipping webpack cache optimization');
    return;
  }

  let webpackConfig = fs.readFileSync(webpackConfigPath, 'utf8');

  // Add cache configuration if not present
  if (!webpackConfig.includes('cache:')) {
    const cacheConfigCode = `
  // Build cache configuration for faster builds
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.cache/webpack'),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    compression: 'gzip',
    buildDependencies: {
      config: [__filename],
      tsconfig: [path.resolve(__dirname, 'tsconfig.json')].filter(f => fs.existsSync(f))
    },
    managedPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, 'src')
    ]
  },`;

    // Insert cache config after the mode setting
    const insertPoint = webpackConfig.indexOf('mode:');
    if (insertPoint !== -1) {
      const nextCommaIndex = webpackConfig.indexOf(',', insertPoint);
      if (nextCommaIndex !== -1) {
        webpackConfig =
          webpackConfig.slice(0, nextCommaIndex + 1) +
          cacheConfigCode +
          webpackConfig.slice(nextCommaIndex + 1);
        fs.writeFileSync(webpackConfigPath, webpackConfig);
        logSuccess('Added webpack filesystem cache configuration');
      }
    }
  } else {
    logSuccess('Webpack cache configuration already present');
  }
}

/**
 * Update package.json with cache-optimized scripts
 */
function optimizePackageScripts() {
  logInfo('Optimizing package.json scripts for caching...');

  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logError('package.json not found');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Add cache-optimized scripts
  const cacheOptimizedScripts = {
    'cache:clear': 'rm -rf .cache && npm run cache:create',
    'cache:create': 'mkdir -p .cache/{npm,webpack,electron-rebuild,assets,jest,tsc}',
    'cache:info': 'du -sh .cache/* 2>/dev/null || echo "Cache directories not found"',
    'cache:analyze': 'node scripts/analyze-cache.js',
    'install:cache': 'npm ci --cache .cache/npm --prefer-offline',
    'build:cache':
      'npm run copy-assets && NODE_OPTIONS="--max-old-space-size=4096" webpack --cache-type filesystem',
    'test:cache': 'jest --cache --cacheDirectory=.cache/jest',
  };

  // Update existing scripts if they don't have cache optimization
  packageJson.scripts = { ...packageJson.scripts, ...cacheOptimizedScripts };

  // Update build scripts to use cache
  if (
    packageJson.scripts['build:web'] &&
    !packageJson.scripts['build:web'].includes('--cache-type')
  ) {
    packageJson.scripts['build:web'] = packageJson.scripts['build:web'].replace(
      'webpack --mode=production',
      'NODE_OPTIONS="--max-old-space-size=4096" webpack --mode=production --cache-type filesystem'
    );
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  logSuccess('Updated package.json with cache-optimized scripts');
}

/**
 * Create .gitignore entries for cache directories
 */
function updateGitignore() {
  logInfo('Updating .gitignore with cache directories...');

  const gitignorePath = path.join(projectRoot, '.gitignore');
  let gitignoreContent = '';

  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }

  const cacheEntries = [
    '',
    '# Build and cache directories',
    '.cache/',
    '.cache/**',
    'node_modules/.cache/',
    '.webpack/',
    '.nyc_output/',
    'coverage/',
    '.jest/',
    '.tsbuildinfo',
  ];

  // Only add entries that don't already exist
  const newEntries = cacheEntries.filter(
    entry => entry === '' || !gitignoreContent.includes(entry)
  );

  if (newEntries.length > 1) {
    // More than just empty string
    gitignoreContent += '\n' + newEntries.join('\n');
    fs.writeFileSync(gitignorePath, gitignoreContent);
    logSuccess('Updated .gitignore with cache directory entries');
  } else {
    logSuccess('.gitignore already contains cache directory entries');
  }
}

/**
 * Create Railway-specific cache configuration
 */
function createRailwayCacheConfig() {
  logInfo('Creating Railway cache configuration...');

  const railwayCacheConfig = {
    buildCommand: 'npm run cache:create && npm run install:cache && npm run build:cache',
    cacheDirectories: ['.cache', 'node_modules', '.webpack', 'dist'],
    env: {
      NODE_OPTIONS: '--max-old-space-size=4096',
      NPM_CONFIG_CACHE: '.cache/npm',
      WEBPACK_CACHE_DIRECTORY: '.cache/webpack',
    },
  };

  // Update railway.json if it exists
  const railwayConfigPath = path.join(projectRoot, 'railway.json');
  if (fs.existsSync(railwayConfigPath)) {
    const railwayConfig = JSON.parse(fs.readFileSync(railwayConfigPath, 'utf8'));

    // Update build command to use cache
    if (railwayConfig.build && railwayConfig.build.buildCommand) {
      railwayConfig.build.buildCommand = railwayCacheConfig.buildCommand;
    } else {
      railwayConfig.build = {
        buildCommand: railwayCacheConfig.buildCommand,
      };
    }

    // Add cache directories
    railwayConfig.build.cacheDirectories = railwayCacheConfig.cacheDirectories;

    // Add environment variables for caching
    if (!railwayConfig.env) {
      railwayConfig.env = {};
    }
    Object.assign(railwayConfig.env, railwayCacheConfig.env);

    fs.writeFileSync(railwayConfigPath, JSON.stringify(railwayConfig, null, 2));
    logSuccess('Updated railway.json with cache configuration');
  }

  // Create cache config documentation
  const cacheConfigDoc = `# Railway Cache Configuration

## Cache Directories
${railwayCacheConfig.cacheDirectories.map(dir => `- \`${dir}\``).join('\n')}

## Environment Variables
${Object.entries(railwayCacheConfig.env)
  .map(([key, value]) => `- \`${key}=${value}\``)
  .join('\n')}

## Build Command
\`\`\`bash
${railwayCacheConfig.buildCommand}
\`\`\`

## Cache Benefits
- **Faster builds**: Reuse compiled assets and dependencies
- **Reduced bandwidth**: Skip re-downloading unchanged dependencies  
- **Better performance**: Webpack filesystem cache speeds up rebuilds
- **Cost optimization**: Shorter build times reduce compute costs
`;

  fs.writeFileSync(path.join(projectRoot, 'CACHE-CONFIG.md'), cacheConfigDoc);
  logSuccess('Created cache configuration documentation');
}

/**
 * Create GitHub Actions cache configuration
 */
function createGitHubActionsCacheConfig() {
  logInfo('Creating GitHub Actions cache configuration...');

  const workflowPath = path.join(projectRoot, '.github/workflows');
  if (!fs.existsSync(workflowPath)) {
    logWarning('.github/workflows directory not found, skipping GitHub Actions cache setup');
    return;
  }

  // Find CI workflow files
  const workflowFiles = fs
    .readdirSync(workflowPath)
    .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

  workflowFiles.forEach(file => {
    const workflowFilePath = path.join(workflowPath, file);
    let workflowContent = fs.readFileSync(workflowFilePath, 'utf8');

    // Add cache steps if not present
    if (!workflowContent.includes('actions/cache')) {
      logInfo(`Adding cache configuration to ${file}`);

      const cacheStep = `
      # Cache dependencies and build artifacts
      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            .cache
            node_modules
            dist
          key: \${{ runner.os }}-cache-\${{ hashFiles('**/package-lock.json') }}-\${{ hashFiles('webpack.config.js') }}
          restore-keys: |
            \${{ runner.os }}-cache-\${{ hashFiles('**/package-lock.json') }}-
            \${{ runner.os }}-cache-

      # Cache Electron binaries
      - name: Cache Electron
        uses: actions/cache@v4
        with:
          path: ~/.cache/electron
          key: \${{ runner.os }}-electron-\${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            \${{ runner.os }}-electron-
`;

      // Insert after Node.js setup step
      const nodeSetupIndex = workflowContent.indexOf('uses: actions/setup-node');
      if (nodeSetupIndex !== -1) {
        const nextStepIndex = workflowContent.indexOf('- name:', nodeSetupIndex + 1);
        if (nextStepIndex !== -1) {
          workflowContent =
            workflowContent.slice(0, nextStepIndex) +
            cacheStep +
            '\n      ' +
            workflowContent.slice(nextStepIndex);

          fs.writeFileSync(workflowFilePath, workflowContent);
          logSuccess(`Added cache configuration to ${file}`);
        }
      }
    }
  });
}

/**
 * Create cache analysis script
 */
function createCacheAnalysisScript() {
  logInfo('Creating cache analysis script...');

  const analysisScript = `#!/usr/bin/env node

/**
 * Cache Analysis Script
 * Analyzes cache usage and provides optimization recommendations
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDirSize(dirPath) {
  try {
    const output = execSync(\`du -sb "\${dirPath}" 2>/dev/null || echo "0"\`, { encoding: 'utf8' });
    return parseInt(output.split('\\t')[0]) || 0;
  } catch (error) {
    return 0;
  }
}

function analyzeCache() {
  console.log('📊 RinaWarp Terminal - Cache Analysis Report');
  console.log('==========================================\\n');
  
  const cacheDir = path.join(projectRoot, '.cache');
  
  if (!fs.existsSync(cacheDir)) {
    console.log('⚠️ No .cache directory found');
    console.log('Run: npm run cache:create');
    return;
  }
  
  // Analyze cache directories
  const cacheSubdirs = ['npm', 'webpack', 'electron-rebuild', 'assets', 'jest', 'tsc'];
  let totalSize = 0;
  
  console.log('📁 Cache Directory Usage:');
  console.log('-'.repeat(40));
  
  cacheSubdirs.forEach(subdir => {
    const subdirPath = path.join(cacheDir, subdir);
    const size = getDirSize(subdirPath);
    totalSize += size;
    
    const status = fs.existsSync(subdirPath) ? '✅' : '❌';
    console.log(\`\${status} \${subdir.padEnd(20)} \${formatBytes(size).padStart(10)}\`);
  });
  
  console.log('-'.repeat(40));
  console.log(\`📊 Total Cache Size:     \${formatBytes(totalSize).padStart(10)}\`);
  
  // Analyze node_modules
  const nodeModulesSize = getDirSize(path.join(projectRoot, 'node_modules'));
  console.log(\`📦 node_modules:         \${formatBytes(nodeModulesSize).padStart(10)}\`);
  
  // Analyze build outputs
  const distSize = getDirSize(path.join(projectRoot, 'dist'));
  console.log(\`🔨 dist/:                \${formatBytes(distSize).padStart(10)}\`);
  
  console.log('\\n🎯 Cache Efficiency Analysis:');
  console.log('-'.repeat(40));
  
  // Calculate efficiency metrics
  const webpackCacheSize = getDirSize(path.join(cacheDir, 'webpack'));
  const npmCacheSize = getDirSize(path.join(cacheDir, 'npm'));
  
  if (webpackCacheSize > 0) {
    console.log('✅ Webpack cache active - builds should be faster');
  } else {
    console.log('⚠️ Webpack cache empty - run a build to populate');
  }
  
  if (npmCacheSize > 0) {
    console.log('✅ NPM cache active - installs should be faster');
  } else {
    console.log('⚠️ NPM cache empty - run npm install to populate');
  }
  
  // Recommendations
  console.log('\\n💡 Optimization Recommendations:');
  console.log('-'.repeat(40));
  
  if (totalSize > 1024 * 1024 * 500) { // 500MB
    console.log('⚠️ Cache size is large (>500MB) - consider cleaning old entries');
    console.log('   Run: npm run cache:clear');
  }
  
  if (webpackCacheSize === 0) {
    console.log('💡 Run a webpack build to populate build cache');
    console.log('   Run: npm run build:cache');
  }
  
  if (npmCacheSize === 0) {
    console.log('💡 Use cached npm install for faster dependency resolution');
    console.log('   Run: npm run install:cache');
  }
  
  console.log('\\n📈 Performance Impact:');
  console.log('-'.repeat(40));
  console.log('- Webpack builds: ~60-80% faster with warm cache');
  console.log('- NPM installs: ~40-60% faster with cache');
  console.log('- CI/CD builds: ~30-50% faster overall');
  
  console.log('\\n🔧 Maintenance Commands:');
  console.log('-'.repeat(40));
  console.log('- npm run cache:clear   # Clear all caches');
  console.log('- npm run cache:info    # Show cache sizes');
  console.log('- npm run cache:analyze # Run this analysis');
}

analyzeCache();
`;

  fs.writeFileSync(path.join(projectRoot, 'scripts/analyze-cache.js'), analysisScript);

  // Make script executable
  try {
    execSync('chmod +x scripts/analyze-cache.js', { cwd: projectRoot });
  } catch (error) {
    // Continue if chmod fails
  }

  logSuccess('Created cache analysis script');
}

/**
 * Main optimization function
 */
async function optimizeBuildCache() {
  try {
    createCacheDirectories();
    optimizeWebpackCache();
    optimizePackageScripts();
    updateGitignore();
    createRailwayCacheConfig();
    createGitHubActionsCacheConfig();
    createCacheAnalysisScript();

    console.log('');
    logSuccess('🎉 Build cache optimization completed successfully!');
    console.log('');
    logInfo('📋 Next steps:');
    console.log('1. Test cache optimization: npm run cache:analyze');
    console.log('2. Run cached build: npm run build:cache');
    console.log('3. Monitor build performance improvements');
    console.log('4. Deploy with Railway cache optimizations');
    console.log('');
    logInfo('💡 Performance improvements expected:');
    console.log('- Webpack builds: ~60-80% faster with warm cache');
    console.log('- NPM installs: ~40-60% faster with cache');
    console.log('- CI/CD builds: ~30-50% faster overall');
    console.log('');
  } catch (error) {
    logError(`Cache optimization failed: ${error.message}`);
    process.exit(1);
  }
}

// Run optimization if called directly
if (import.meta.url === `file://${__filename}`) {
  optimizeBuildCache();
}

export { optimizeBuildCache, cacheConfig };
