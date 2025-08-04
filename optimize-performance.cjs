#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Performance Optimization Analysis...\n');

// 1. Analyze current bundle sizes
console.log('📊 Analyzing bundle sizes...');
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  const bundleFiles = files.filter(f => f.endsWith('.js'));
  
  console.log('Current bundles:');
  bundleFiles.forEach(file => {
    const stats = fs.statSync(path.join(distPath, file));
    const sizeInKB = (stats.size / 1024).toFixed(2);
    console.log(`  - ${file}: ${sizeInKB} KB`);
  });
} else {
  console.log('  No dist directory found. Run npm run build:web first.');
}

// 2. Identify large dependencies
console.log('\n📦 Analyzing large dependencies...');
try {
  const packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  const packages = packageLock.packages || {};
  
  const largeDeps = [];
  Object.entries(packages).forEach(([name, info]) => {
    if (name && info.resolved) {
      // Estimate size based on common large packages
      const knownLargePackages = {
        'monaco-editor': 10000,
        '@xterm/xterm': 500,
        'electron': 50000,
        'puppeteer': 20000,
        'webpack': 5000,
        '@sentry': 1000,
        'react': 300,
        'react-dom': 800
      };
      
      Object.entries(knownLargePackages).forEach(([pkg, size]) => {
        if (name.includes(pkg)) {
          largeDeps.push({ name: name.replace('node_modules/', ''), estimatedSize: size });
        }
      });
    }
  });
  
  console.log('Large dependencies found:');
  largeDeps.sort((a, b) => b.estimatedSize - a.estimatedSize)
    .slice(0, 10)
    .forEach(dep => {
      console.log(`  - ${dep.name}: ~${dep.estimatedSize} KB`);
    });
} catch (error) {
  console.log('  Could not analyze package-lock.json');
}

// 3. Create optimized webpack config
console.log('\n⚡ Creating optimized webpack configuration...');

const optimizedConfig = `const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: 'production',
  target: 'electron-renderer',
  entry: {
    renderer: './src/renderer/renderer.js',
    'ai-integration': './src/ai-integration.js',
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
          },
          mangle: true,
        },
      }),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Split vendor chunks by size
        vendorLarge: {
          test: /[\\\\/]node_modules[\\\\/](monaco-editor|@xterm|puppeteer)[\\\\/]/,
          name: 'vendor-large',
          priority: 20,
        },
        vendorReact: {
          test: /[\\\\/]node_modules[\\\\/](react|react-dom)[\\\\/]/,
          name: 'vendor-react',
          priority: 15,
        },
        vendorCommon: {
          test: /[\\\\/]node_modules[\\\\/]/,
          name: 'vendor-common',
          priority: 10,
        },
        // Async chunks for code splitting
        asyncCommon: {
          chunks: 'async',
          minChunks: 2,
          name: 'async-common',
        },
      },
    },
    runtimeChunk: 'single',
  },
  module: {
    rules: [
      {
        test: /\\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                modules: false,
                targets: {
                  electron: '37'
                }
              }]
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-transform-modules-commonjs'
            ],
          },
        },
      },
    ],
  },
  plugins: [
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
    }),
  ].filter(Boolean),
};
`;

fs.writeFileSync('webpack.config.optimized.cjs', optimizedConfig);
console.log('  Created webpack.config.optimized.cjs');

// 4. Generate startup optimization recommendations
console.log('\n💡 Startup Optimization Recommendations:\n');

const recommendations = [
  {
    title: 'Lazy Load AI Components',
    description: 'Load AI assistant only when first accessed',
    impact: 'High',
    implementation: `// In src/renderer/renderer.js
let aiAssistant;
async function getAIAssistant() {
  if (!aiAssistant) {
    const { AIAssistant } = await import('./ai-assistant.js');
    aiAssistant = new AIAssistant();
  }
  return aiAssistant;
}`
  },
  {
    title: 'Defer Theme Loading',
    description: 'Load themes asynchronously after initial render',
    impact: 'Medium',
    implementation: `// Load themes after terminal is visible
setTimeout(() => {
  import('./themes/theme-loader.js').then(({ loadTheme }) => {
    loadTheme(userPreferredTheme);
  });
}, 100);`
  },
  {
    title: 'Use Web Workers for Heavy Processing',
    description: 'Move AI processing to background threads',
    impact: 'High',
    implementation: `// Create AI worker
const aiWorker = new Worker('./ai-worker.js');
aiWorker.postMessage({ command: 'process', data });`
  },
  {
    title: 'Implement Module Preloading',
    description: 'Preload critical modules in main process',
    impact: 'Medium',
    implementation: `// In main process
app.on('ready', () => {
  require('v8').setFlagsFromString('--max-old-space-size=4096');
  // Preload critical modules
  require('./preload-modules.js');
});`
  },
  {
    title: 'Enable Electron Context Isolation',
    description: 'Improve security and performance',
    impact: 'Low',
    implementation: `// In main.cjs
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  preload: path.join(__dirname, 'preload.cjs')
}`
  }
];

recommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec.title}`);
  console.log(`   Impact: ${rec.impact}`);
  console.log(`   ${rec.description}`);
  console.log('   Implementation:');
  console.log(rec.implementation.split('\n').map(line => '     ' + line).join('\n'));
  console.log();
});

// 5. Create performance monitoring setup
console.log('📈 Setting up performance monitoring...\n');

const perfMonitorCode = `// Performance Monitor for RinaWarp Terminal
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startupTime: 0,
      firstRenderTime: 0,
      aiLoadTime: 0,
      terminalReadyTime: 0
    };
    this.startTime = performance.now();
  }

  mark(name) {
    performance.mark(name);
    const time = performance.now() - this.startTime;
    console.log(\`Performance: \${name} at \${time.toFixed(2)}ms\`);
    
    switch(name) {
      case 'firstRender':
        this.metrics.firstRenderTime = time;
        break;
      case 'aiLoaded':
        this.metrics.aiLoadTime = time;
        break;
      case 'terminalReady':
        this.metrics.terminalReadyTime = time;
        this.reportMetrics();
        break;
    }
  }

  reportMetrics() {
    console.log('=== Performance Report ===');
    Object.entries(this.metrics).forEach(([key, value]) => {
      if (value > 0) {
        console.log(\`\${key}: \${value.toFixed(2)}ms\`);
      }
    });
  }
}

module.exports = PerformanceMonitor;
`;

fs.writeFileSync('src/utilities/performance-monitor.js', perfMonitorCode);
console.log('  Created src/utilities/performance-monitor.js');

console.log('\n✅ Performance optimization analysis complete!');
console.log('\nNext steps:');
console.log('1. Run: npm run build:web to test current bundle');
console.log('2. Use: webpack --config webpack.config.optimized.cjs to build optimized version');
console.log('3. Implement the recommendations above');
console.log('4. Add performance monitoring to track improvements');
