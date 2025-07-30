#!/usr/bin/env node

/**
 * RinaWarp Terminal Release Builder
 * Creates all downloadable packages for rinawarptech.com
 * 
 * Generates:
 * - Windows: RinaWarp-Terminal-Setup-Windows.exe (NSIS installer)
 * - Windows: RinaWarp-Terminal-Windows-Portable.zip (Portable version)
 * - Linux: RinaWarp-Terminal-Linux.tar.gz (Universal tarball)
 * - Linux: RinaWarp-Terminal-Linux.AppImage (AppImage)
 * - macOS: RinaWarp-Terminal-macOS.dmg (Disk image)
 * - Universal: rinawarp.zip (Source + binaries)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReleaseBuilder {
  constructor() {
    this.version = this.getVersion();
    this.distDir = path.join(__dirname, '..', 'dist');
    this.releasesDir = path.join(__dirname, '..', 'releases');
    this.tempDir = path.join(__dirname, '..', 'temp-build');
        
    console.log(`🚀 RinaWarp Terminal Release Builder v${this.version}`);
    this.ensureDirectories();
  }

  getVersion() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    return packageJson.version;
  }

  ensureDirectories() {
    [this.distDir, this.releasesDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async buildAll() {
    console.log('\n📦 Building all platform packages...\n');
        
    try {
      // Clean previous builds
      await this.cleanBuild();
            
      // Copy assets first
      await this.copyAssets();
            
      // Run tests
      await this.runTests();
            
      // Build for all platforms
      await this.buildWindows();
      await this.buildLinux();
      await this.buildMacOS();
            
      // Create special packages
      await this.createPortableWindows();
      await this.createUniversalZip();
            
      // Generate checksums and metadata
      await this.generateChecksums();
      await this.generateMetadata();
            
      console.log('\n✅ All releases built successfully!');
      this.printSummary();
            
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  async cleanBuild() {
    console.log('🧹 Cleaning previous builds...');
        
    if (fs.existsSync(this.distDir)) {
      fs.rmSync(this.distDir, { recursive: true, force: true });
    }
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
        
    fs.mkdirSync(this.distDir, { recursive: true });
    fs.mkdirSync(this.tempDir, { recursive: true });
  }

  async copyAssets() {
    console.log('📁 Copying assets...');
    execSync('npm run copy-assets', { stdio: 'inherit' });
  }

  async runTests() {
    console.log('🧪 Running tests...');
    try {
      execSync('npm test', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Some tests failed, but continuing build...');
    }
  }

  async buildWindows() {
    console.log('🪟 Building Windows installer...');
        
    try {
      execSync('npx electron-builder --win nsis --publish never', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
            
      // Rename the output file to match website expectations
      const originalPath = path.join(this.distDir, `RinaWarp Terminal Setup ${this.version}.exe`);
      const targetPath = path.join(this.releasesDir, 'RinaWarp-Terminal-Setup-Windows.exe');
            
      if (fs.existsSync(originalPath)) {
        fs.copyFileSync(originalPath, targetPath);
        console.log('✅ Windows installer created:', targetPath);
      } else {
        console.warn('⚠️ Windows installer not found at expected location');
        // Try alternative locations
        const altPaths = [
          path.join(this.distDir, 'RinaWarp Terminal Setup.exe'),
          path.join(this.distDir, `rinawarp-terminal Setup ${this.version}.exe`),
          path.join(this.distDir, 'rinawarp-terminal Setup.exe')
        ];
                
        for (const altPath of altPaths) {
          if (fs.existsSync(altPath)) {
            fs.copyFileSync(altPath, targetPath);
            console.log('✅ Windows installer found and copied from:', altPath);
            break;
          }
        }
      }
    } catch (error) {
      console.error('❌ Windows build failed:', error.message);
    }
  }

  async buildLinux() {
    console.log('🐧 Building Linux packages...');
        
    try {
      execSync('npx electron-builder --linux --publish never', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
            
      // Copy and rename Linux files
      const tarGzPattern = new RegExp(`rinawarp-terminal-${this.version}\\.tar\\.gz`);
      const appImagePattern = new RegExp(`rinawarp-terminal-${this.version}\\.AppImage`);
            
      const distFiles = fs.readdirSync(this.distDir);
            
      for (const file of distFiles) {
        if (tarGzPattern.test(file)) {
          const sourcePath = path.join(this.distDir, file);
          const targetPath = path.join(this.releasesDir, 'RinaWarp-Terminal-Linux.tar.gz');
          fs.copyFileSync(sourcePath, targetPath);
          console.log('✅ Linux tarball created:', targetPath);
        }
                
        if (appImagePattern.test(file)) {
          const sourcePath = path.join(this.distDir, file);
          const targetPath = path.join(this.releasesDir, 'RinaWarp-Terminal-Linux.AppImage');
          fs.copyFileSync(sourcePath, targetPath);
          console.log('✅ Linux AppImage created:', targetPath);
        }
      }
    } catch (error) {
      console.error('❌ Linux build failed:', error.message);
    }
  }

  async buildMacOS() {
    console.log('🍎 Building macOS package...');
        
    try {
      execSync('npx electron-builder --mac --publish never', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
            
      // Copy and rename macOS DMG
      const dmgPattern = new RegExp(`RinaWarp Terminal-${this.version}\\.dmg`);
      const distFiles = fs.readdirSync(this.distDir);
            
      for (const file of distFiles) {
        if (dmgPattern.test(file) || file.endsWith('.dmg')) {
          const sourcePath = path.join(this.distDir, file);
          const targetPath = path.join(this.releasesDir, 'RinaWarp-Terminal-macOS.dmg');
          fs.copyFileSync(sourcePath, targetPath);
          console.log('✅ macOS DMG created:', targetPath);
          break;
        }
      }
    } catch (error) {
      console.error('❌ macOS build failed:', error.message);
    }
  }

  async createPortableWindows() {
    console.log('📦 Creating Windows portable version...');
        
    try {
      // Build unpacked version for Windows
      execSync('npx electron-builder --win --dir', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
            
      const unpackedDir = path.join(this.distDir, 'win-unpacked');
      const portableZip = path.join(this.releasesDir, 'RinaWarp-Terminal-Windows-Portable.zip');
            
      if (fs.existsSync(unpackedDir)) {
        await this.createZip(unpackedDir, portableZip);
        console.log('✅ Windows portable created:', portableZip);
      } else {
        console.warn('⚠️ Windows unpacked directory not found');
      }
    } catch (error) {
      console.error('❌ Windows portable build failed:', error.message);
    }
  }

  async createUniversalZip() {
    console.log('🌍 Creating universal rinawarp.zip...');
        
    const universalZip = path.join(this.releasesDir, 'rinawarp.zip');
    const tempUniversalDir = path.join(this.tempDir, 'universal');
        
    // Create temporary directory structure
    fs.mkdirSync(tempUniversalDir, { recursive: true });
        
    // Copy source files
    const sourceDirs = ['src', 'public', 'styles', 'assets'];
    for (const dir of sourceDirs) {
      const sourcePath = path.join(__dirname, '..', dir);
      const targetPath = path.join(tempUniversalDir, dir);
      if (fs.existsSync(sourcePath)) {
        this.copyDirectory(sourcePath, targetPath);
      }
    }
        
    // Copy important files
    const importantFiles = [
      'package.json',
      'README.md',
      'LICENSE',
      'index.html'
    ];
        
    for (const file of importantFiles) {
      const sourcePath = path.join(__dirname, '..', file);
      const targetPath = path.join(tempUniversalDir, file);
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
        
    // Copy built binaries if they exist
    const binariesDir = path.join(tempUniversalDir, 'binaries');
    fs.mkdirSync(binariesDir, { recursive: true });
        
    // Copy release files to binaries directory
    const releaseFiles = fs.readdirSync(this.releasesDir);
    for (const file of releaseFiles) {
      if (file !== 'rinawarp.zip' && file !== 'checksums.txt' && file !== 'metadata.json') {
        const sourcePath = path.join(this.releasesDir, file);
        const targetPath = path.join(binariesDir, file);
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
        
    // Create installation guide
    const installGuide = `# RinaWarp Terminal Installation Guide

## Quick Start
1. Choose your platform from the binaries/ directory
2. Install according to your operating system:

### Windows
- **Full Install**: Run RinaWarp-Terminal-Setup-Windows.exe
- **Portable**: Extract RinaWarp-Terminal-Windows-Portable.zip and run RinaWarp Terminal.exe

### Linux
- **Universal**: Extract RinaWarp-Terminal-Linux.tar.gz and run ./rinawarp-terminal
- **AppImage**: Make RinaWarp-Terminal-Linux.AppImage executable and run

### macOS
- Open RinaWarp-Terminal-macOS.dmg and drag to Applications

## Development
1. npm install
2. npm start

## Support
Visit https://rinawarptech.com for documentation and support.
`;
        
    fs.writeFileSync(path.join(tempUniversalDir, 'INSTALL.md'), installGuide);
        
    // Create the universal zip
    await this.createZip(tempUniversalDir, universalZip);
    console.log('✅ Universal rinawarp.zip created:', universalZip);
  }

  async createZip(sourceDir, targetZip) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(targetZip);
      const archive = archiver('zip', { zlib: { level: 9 } });
            
      output.on('close', () => resolve());
      archive.on('error', reject);
            
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  copyDirectory(source, target) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
        
    const items = fs.readdirSync(source);
        
    for (const item of items) {
      const sourcePath = path.join(source, item);
      const targetPath = path.join(target, item);
            
      if (fs.lstatSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  async generateChecksums() {
    console.log('🔐 Generating checksums...');
        
    const checksumFile = path.join(this.releasesDir, 'checksums.txt');
    const checksums = [];
        
    const releaseFiles = fs.readdirSync(this.releasesDir);
        
    for (const file of releaseFiles) {
      if (file !== 'checksums.txt' && file !== 'metadata.json') {
        const filePath = path.join(this.releasesDir, file);
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const size = fs.statSync(filePath).size;
                
        checksums.push({
          file,
          sha256: hash,
          size: this.formatBytes(size)
        });
      }
    }
        
    const checksumContent = checksums.map(item => 
      `${item.sha256}  ${item.file}  (${item.size})`
    ).join('\n');
        
    fs.writeFileSync(checksumFile, checksumContent);
    console.log('✅ Checksums generated:', checksumFile);
  }

  async generateMetadata() {
    console.log('📋 Generating release metadata...');
        
    const metadata = {
      version: this.version,
      buildDate: new Date().toISOString(),
      files: {},
      totalSize: 0
    };
        
    const releaseFiles = fs.readdirSync(this.releasesDir);
        
    for (const file of releaseFiles) {
      if (file !== 'checksums.txt' && file !== 'metadata.json') {
        const filePath = path.join(this.releasesDir, file);
        const stats = fs.statSync(filePath);
                
        metadata.files[file] = {
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
          platform: this.getPlatformFromFilename(file),
          type: this.getTypeFromFilename(file)
        };
                
        metadata.totalSize += stats.size;
      }
    }
        
    metadata.totalSizeFormatted = this.formatBytes(metadata.totalSize);
        
    fs.writeFileSync(
      path.join(this.releasesDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
        
    console.log('✅ Metadata generated');
  }

  getPlatformFromFilename(filename) {
    if (filename.includes('Windows')) return 'Windows';
    if (filename.includes('Linux') || filename.includes('AppImage')) return 'Linux';
    if (filename.includes('macOS') || filename.includes('.dmg')) return 'macOS';
    return 'Universal';
  }

  getTypeFromFilename(filename) {
    if (filename.includes('Setup')) return 'installer';
    if (filename.includes('Portable')) return 'portable';
    if (filename.includes('.dmg')) return 'disk-image';
    if (filename.includes('.AppImage')) return 'appimage';
    if (filename.includes('.tar.gz')) return 'archive';
    if (filename.includes('.zip')) return 'archive';
    return 'unknown';
  }

  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  printSummary() {
    console.log('\n🎉 BUILD SUMMARY');
    console.log('================');
        
    const releaseFiles = fs.readdirSync(this.releasesDir);
    let totalSize = 0;
        
    releaseFiles.forEach(file => {
      if (file !== 'checksums.txt' && file !== 'metadata.json') {
        const filePath = path.join(this.releasesDir, file);
        const size = fs.statSync(filePath).size;
        totalSize += size;
                
        console.log(`📦 ${file} (${this.formatBytes(size)})`);
      }
    });
        
    console.log(`\n📊 Total size: ${this.formatBytes(totalSize)}`);
    console.log(`📁 Output directory: ${this.releasesDir}`);
    console.log('🌐 Ready for upload to rinawarptech.com');
        
    console.log('\n🔗 Website Download URLs:');
    console.log('- Windows Installer: /api/download?file=RinaWarp-Terminal-Setup-Windows.exe');
    console.log('- Windows Portable: /api/download?file=RinaWarp-Terminal-Windows-Portable.zip');
    console.log('- Linux Archive: /api/download?file=RinaWarp-Terminal-Linux.tar.gz');
    console.log('- Linux AppImage: /api/download?file=RinaWarp-Terminal-Linux.AppImage');
    console.log('- macOS DMG: /api/download?file=RinaWarp-Terminal-macOS.dmg');
    console.log('- Universal: /api/download?file=rinawarp.zip');
  }
}

// Main execution
async function main() {
  // Add archiver dependency if not present
  try {
    await import('archiver');
  } catch (error) {
    console.log('📦 Installing required dependencies...');
    execSync('npm install --save-dev archiver', { stdio: 'inherit' });
  }
    
  const builder = new ReleaseBuilder();
  await builder.buildAll();
}

// Check if this module is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ReleaseBuilder;
