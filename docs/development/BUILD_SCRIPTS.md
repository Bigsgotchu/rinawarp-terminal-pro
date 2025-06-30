# 🔧 Build Scripts for RinaWarp Terminal

## Overview
This guide covers comprehensive build scripts for packaging RinaWarp Terminal across all platforms and distribution channels.

## 📦 **Updated Package.json Scripts**

Let's enhance your package.json with comprehensive build scripts:

```json
{
  "name": "rinawarp-terminal",
  "version": "1.0.2",
  "description": "AI-Powered Terminal Emulator for Modern Developers",
  "main": "src/main.js",
  "type": "module",
  "scripts": {
    "start": "electron src/main.js",
    "dev": "electron src/main.js --dev",
    "test": "jest",
    "lint": "eslint src/**/*.js",
    "format": "prettier --write src/**/*.js",
    
    "build": "electron-builder",
    "build:dir": "electron-builder --dir",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux",
    
    "build:all": "npm run build:win && npm run build:mac && npm run build:linux",
    "build:portable": "electron-builder --win portable",
    "build:nsis": "electron-builder --win nsis",
    "build:dmg": "electron-builder --mac dmg",
    "build:pkg": "electron-builder --mac pkg",
    "build:mas": "electron-builder --mac mas",
    "build:appimage": "electron-builder --linux AppImage",
    "build:snap": "electron-builder --linux snap",
    "build:deb": "electron-builder --linux deb",
    "build:rpm": "electron-builder --linux rpm",
    "build:tar.gz": "electron-builder --linux tar.gz",
    "build:appx": "electron-builder --win appx",
    
    "publish": "electron-builder --publish=always",
    "publish:github": "electron-builder --publish=always --config.publish.provider=github",
    "publish:s3": "electron-builder --publish=always --config.publish.provider=s3",
    
    "dist": "npm run build && npm run publish",
    "dist:win": "npm run build:win && npm run publish",
    "dist:mac": "npm run build:mac && npm run publish",
    "dist:linux": "npm run build:linux && npm run publish",
    
    "prepack": "npm run lint && npm run test",
    "postinstall": "electron-builder install-app-deps",
    "clean": "rimraf dist build node_modules/.cache",
    "rebuild": "npm run clean && npm install && npm run build",
    
    "release": "npm run prepack && npm run build:all && npm run publish",
    "release:patch": "npm version patch && npm run release",
    "release:minor": "npm version minor && npm run release",
    "release:major": "npm version major && npm run release"
  }
}
```

## 🏗️ **Build Configuration Scripts**

### Windows Build Script (build-win.ps1)
```powershell
#!/usr/bin/env pwsh
# Windows Build Script for RinaWarp Terminal

Write-Host "🚀 Building RinaWarp Terminal for Windows..." -ForegroundColor Green

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed. Please install Node.js first."
    exit 1
}

# Check if npm is installed
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not installed. Please install npm first."
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install dependencies"
    exit 1
}

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Error "Tests failed"
    exit 1
}

# Lint code
Write-Host "🔍 Linting code..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Error "Linting failed"
    exit 1
}

# Build for Windows
Write-Host "🔨 Building Windows executable..." -ForegroundColor Yellow
npm run build:win
if ($LASTEXITCODE -ne 0) {
    Write-Error "Windows build failed"
    exit 1
}

# Build Windows Store package
Write-Host "🏪 Building Windows Store package..." -ForegroundColor Yellow
npm run build:appx
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Windows Store build failed, continuing..."
}

# Build portable version
Write-Host "💾 Building portable version..." -ForegroundColor Yellow
npm run build:portable
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Portable build failed, continuing..."
}

Write-Host "✅ Windows build completed successfully!" -ForegroundColor Green
Write-Host "📁 Build artifacts are in the 'dist' directory" -ForegroundColor Cyan

# List build artifacts
if (Test-Path "dist") {
    Write-Host "📋 Build artifacts:" -ForegroundColor Cyan
    Get-ChildItem -Path "dist" -Recurse -File | Select-Object Name, Length, LastWriteTime | Format-Table
}
```

### macOS Build Script (build-mac.sh)
```bash
#!/bin/bash
# macOS Build Script for RinaWarp Terminal

set -e

echo "🚀 Building RinaWarp Terminal for macOS..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm test

# Lint code
echo "🔍 Linting code..."
npm run lint

# Build for macOS
echo "🔨 Building macOS application..."
npm run build:mac

# Build DMG
echo "💿 Building DMG installer..."
npm run build:dmg

# Build PKG
echo "📦 Building PKG installer..."
npm run build:pkg

# Build for Mac App Store (if certificates are available)
echo "🏪 Building for Mac App Store..."
if npm run build:mas 2>/dev/null; then
    echo "✅ Mac App Store build completed"
else
    echo "⚠️  Mac App Store build failed (certificates may not be configured)"
fi

echo "✅ macOS build completed successfully!"
echo "📁 Build artifacts are in the 'dist' directory"

# List build artifacts
if [ -d "dist" ]; then
    echo "📋 Build artifacts:"
    ls -la dist/
fi

# Check code signing (if available)
echo "🔐 Checking code signing..."
if [ -f "dist/mac/RinaWarp Terminal.app" ]; then
    codesign -dv --verbose=4 "dist/mac/RinaWarp Terminal.app" 2>&1 || echo "⚠️  App is not code signed"
fi
```

### Linux Build Script (build-linux.sh)
```bash
#!/bin/bash
# Linux Build Script for RinaWarp Terminal

set -e

echo "🚀 Building RinaWarp Terminal for Linux..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm test

# Lint code
echo "🔍 Linting code..."
npm run lint

# Build AppImage
echo "📱 Building AppImage..."
npm run build:appimage

# Build DEB package
echo "📦 Building DEB package..."
npm run build:deb

# Build RPM package
echo "📦 Building RPM package..."
npm run build:rpm

# Build TAR.GZ archive
echo "🗜️  Building TAR.GZ archive..."
npm run build:tar.gz

# Build Snap package (if snapcraft is available)
echo "📱 Building Snap package..."
if command -v snapcraft &> /dev/null; then
    npm run build:snap
else
    echo "⚠️  Snapcraft not available, skipping Snap build"
fi

echo "✅ Linux build completed successfully!"
echo "📁 Build artifacts are in the 'dist' directory"

# List build artifacts
if [ -d "dist" ]; then
    echo "📋 Build artifacts:"
    ls -la dist/
fi
```

## 🤖 **Automated CI/CD Build Scripts**

### GitHub Actions Workflow (.github/workflows/build.yml)
```yaml
name: Build and Release

on:
  push:
    branches: [ main, develop ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm install
      
    - name: Run tests
      run: npm test
      
    - name: Run linting
      run: npm run lint

  build-windows:
    needs: test
    runs-on: windows-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build Windows
      run: npm run build:win
      
    - name: Build Windows Store
      run: npm run build:appx
      
    - name: Upload Windows artifacts
      uses: actions/upload-artifact@v3
      with:
        name: windows-builds
        path: dist/*.exe

  build-macos:
    needs: test
    runs-on: macos-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build macOS
      run: npm run build:mac
      
    - name: Upload macOS artifacts
      uses: actions/upload-artifact@v3
      with:
        name: macos-builds
        path: dist/*.dmg

  build-linux:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build Linux
      run: npm run build:linux
      
    - name: Upload Linux artifacts
      uses: actions/upload-artifact@v3
      with:
        name: linux-builds
        path: dist/*.{AppImage,deb,rpm}

  release:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: [build-windows, build-macos, build-linux]
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Download all artifacts
      uses: actions/download-artifact@v3
      
    - name: Create Release
      uses: softprops/action-gh-release@v1
      with:
        files: |
          windows-builds/*
          macos-builds/*
          linux-builds/*
        draft: false
        prerelease: false
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 🧹 **Utility Scripts**

### Clean Build Script (clean.js)
```javascript
#!/usr/bin/env node
// Clean build artifacts and cache

import fs from 'fs-extra';
import path from 'path';

const dirsToClean = [
  'dist',
  'build',
  'node_modules/.cache',
  '.cache',
  'coverage'
];

async function clean() {
  console.log('🧹 Cleaning build artifacts...');
  
  for (const dir of dirsToClean) {
    try {
      if (await fs.pathExists(dir)) {
        await fs.remove(dir);
        console.log(`✅ Removed: ${dir}`);
      }
    } catch (error) {
      console.error(`❌ Failed to remove ${dir}:`, error.message);
    }
  }
  
  console.log('✨ Clean completed!');
}

clean().catch(console.error);
```

### Pre-build Validation Script (validate.js)
```javascript
#!/usr/bin/env node
// Validate project before building

import fs from 'fs-extra';
import path from 'path';

async function validate() {
  console.log('🔍 Validating project...');
  
  const checks = [
    {
      name: 'package.json exists',
      check: () => fs.pathExists('package.json')
    },
    {
      name: 'main entry point exists',
      check: async () => {
        const pkg = await fs.readJson('package.json');
        return fs.pathExists(pkg.main || 'src/main.js');
      }
    },
    {
      name: 'assets directory exists',
      check: () => fs.pathExists('assets')
    },
    {
      name: 'version is valid',
      check: async () => {
        const pkg = await fs.readJson('package.json');
        return /^\d+\.\d+\.\d+/.test(pkg.version);
      }
    }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const passed = await check.check();
      if (passed) {
        console.log(`✅ ${check.name}`);
      } else {
        console.log(`❌ ${check.name}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('✨ All validations passed!');
    process.exit(0);
  } else {
    console.log('💥 Some validations failed!');
    process.exit(1);
  }
}

validate().catch(console.error);
```

### Post-build Verification Script (verify.js)
```javascript
#!/usr/bin/env node
// Verify build artifacts

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

async function verify() {
  console.log('🔍 Verifying build artifacts...');
  
  const distDir = 'dist';
  
  if (!await fs.pathExists(distDir)) {
    console.error('❌ Dist directory not found');
    process.exit(1);
  }
  
  const files = await fs.readdir(distDir);
  const artifacts = files.filter(file => 
    file.endsWith('.exe') || 
    file.endsWith('.dmg') || 
    file.endsWith('.AppImage') ||
    file.endsWith('.deb') ||
    file.endsWith('.rpm')
  );
  
  if (artifacts.length === 0) {
    console.error('❌ No build artifacts found');
    process.exit(1);
  }
  
  console.log('📋 Found artifacts:');
  
  for (const artifact of artifacts) {
    const filePath = path.join(distDir, artifact);
    const stats = await fs.stat(filePath);
    const hash = await getFileHash(filePath);
    
    console.log(`  ${artifact}`);
    console.log(`    Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`    SHA256: ${hash}`);
    console.log();
  }
  
  console.log('✅ Build verification completed!');
}

async function getFileHash(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  
  return new Promise((resolve, reject) => {
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

verify().catch(console.error);
```

## 📋 **Build Environment Setup**

### Environment Variables (.env.build)
```bash
# Build Environment Configuration

# App Information
APP_NAME=RinaWarp Terminal
APP_ID=com.rinawarp.terminal
APP_VERSION=1.0.2

# Build Configuration
NODE_ENV=production
ELECTRON_CACHE=/tmp/electron-cache
ELECTRON_BUILDER_CACHE=/tmp/electron-builder-cache

# Code Signing (Windows)
WIN_CSC_LINK=path/to/certificate.p12
WIN_CSC_KEY_PASSWORD=certificate_password

# Code Signing (macOS)
CSC_LINK=path/to/certificate.p12
CSC_KEY_PASSWORD=certificate_password
APPLE_ID=developer@rinawarp.com
APPLE_ID_PASSWORD=app_specific_password
APPLE_TEAM_ID=team_id

# Publishing
GH_TOKEN=github_token
AWS_ACCESS_KEY_ID=aws_access_key
AWS_SECRET_ACCESS_KEY=aws_secret_key
S3_BUCKET=releases-bucket
```

### Docker Build Environment
```dockerfile
# Dockerfile for cross-platform builds
FROM node:18-alpine

# Install dependencies for Electron
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libx11-dev \
    libxkbfile-dev \
    libsecret-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application
CMD ["npm", "run", "build"]
```

## 🔧 **Build Optimization**

### Webpack Configuration (webpack.config.js)
```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  target: 'electron-main',
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js'
  },
  externals: {
    'electron': 'commonjs electron'
  },
  optimization: {
    minimize: true
  },
  resolve: {
    extensions: ['.js', '.json']
  }
};
```

### Performance Monitoring
```javascript
// performance.js - Build performance monitoring
import { performance } from 'perf_hooks';

class BuildTimer {
  constructor() {
    this.timers = new Map();
  }
  
  start(name) {
    this.timers.set(name, performance.now());
  }
  
  end(name) {
    const start = this.timers.get(name);
    if (start) {
      const duration = performance.now() - start;
      console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`);
      return duration;
    }
  }
}

export const buildTimer = new BuildTimer();
```

## 🚀 **Quick Build Commands**

### Development Builds
```bash
# Quick development build
npm run build:dir

# Development with auto-reload
npm run dev

# Test build without packaging
npm run build --dir
```

### Production Builds
```bash
# Build for current platform
npm run build

# Build for all platforms
npm run build:all

# Build and publish
npm run release
```

### Platform-Specific Builds
```bash
# Windows only
npm run build:win

# macOS only  
npm run build:mac

# Linux only
npm run build:linux
```

Your build system is now fully configured for multi-platform deployment! These scripts handle everything from development builds to production releases across all supported platforms.
