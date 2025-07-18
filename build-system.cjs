#!/usr/bin/env node

/**
 * RinaWarp Terminal - Enhanced Build System
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

class BuildSystem {
  constructor() {
    this.rootDir = process.cwd();
    this.srcDir = path.join(this.rootDir, 'src');
    this.distDir = path.join(this.rootDir, 'dist');
    this.buildConfig = {
      mode: process.env.NODE_ENV || 'development',
      target: 'electron-renderer',
      minify: process.env.NODE_ENV === 'production',
      sourceMap: process.env.NODE_ENV !== 'production',
    };
  }

  async build() {
    console.log('🚀 Starting RinaWarp Terminal build process...');

    try {
      // Clean dist directory
      await this.cleanDist();

      // Run webpack build
      await this.webpackBuild();

      // Copy static assets
      await this.copyAssets();

      // Generate build report
      await this.generateBuildReport();

      console.log('✅ Build completed successfully!');
      console.log(`📦 Output: ${this.distDir}`);
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  async cleanDist() {
    console.log('🧹 Cleaning dist directory...');
    if (fs.existsSync(this.distDir)) {
      fs.rmSync(this.distDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.distDir, { recursive: true });
  }

  async webpackBuild() {
    console.log('📦 Running webpack build...');
    try {
      const webpackCommand = `npx webpack --config webpack.config.cjs --mode ${this.buildConfig.mode}`;
      execSync(webpackCommand, { stdio: 'inherit' });
    } catch (error) {
      throw new Error(`Webpack build failed: ${error.message}`);
    }
  }

  async copyAssets() {
    console.log('📋 Copying static assets...');

    const assetDirs = ['public', 'styles', 'assets'];

    for (const dir of assetDirs) {
      const srcPath = path.join(this.rootDir, dir);
      const destPath = path.join(this.distDir, dir);

      if (fs.existsSync(srcPath)) {
        this.copyRecursively(srcPath, destPath);
        console.log(`✅ Copied ${dir}/`);
      }
    }
  }

  copyRecursively(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyRecursively(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async generateBuildReport() {
    console.log('📊 Generating build report...');

    const report = {
      timestamp: new Date().toISOString(),
      mode: this.buildConfig.mode,
      files: this.getDistFiles(),
      bundleSize: this.getBundleSize(),
      sourceMap: this.buildConfig.sourceMap,
    };

    fs.writeFileSync(path.join(this.distDir, 'build-report.json'), JSON.stringify(report, null, 2));
  }

  getDistFiles() {
    const files = [];

    function scanDir(dir, prefix = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(prefix, entry.name);

        if (entry.isDirectory()) {
          scanDir(fullPath, relativePath);
        } else {
          const stats = fs.statSync(fullPath);
          files.push({
            path: relativePath,
            size: stats.size,
            modified: stats.mtime.toISOString(),
          });
        }
      }
    }

    if (fs.existsSync(this.distDir)) {
      scanDir(this.distDir);
    }

    return files;
  }

  getBundleSize() {
    const bundleFiles = this.getDistFiles().filter(f => f.path.endsWith('.js'));
    return bundleFiles.reduce((total, file) => total + file.size, 0);
  }

  async watch() {
    console.log('👀 Starting watch mode...');

    const webpackCommand = 'npx webpack --config webpack.config.cjs --mode development --watch';
    execSync(webpackCommand, { stdio: 'inherit' });
  }

  async serve() {
    console.log('🌐 Starting development server...');

    const webpackCommand = 'npx webpack serve --config webpack.config.cjs --mode development';
    execSync(webpackCommand, { stdio: 'inherit' });
  }
}

// CLI Interface
const command = process.argv[2];
const buildSystem = new BuildSystem();

switch (command) {
  case 'build':
    buildSystem.build();
    break;
  case 'watch':
    buildSystem.watch();
    break;
  case 'serve':
    buildSystem.serve();
    break;
  default:
    console.log('Usage: node build-system.js [build|watch|serve]');
    process.exit(1);
}
