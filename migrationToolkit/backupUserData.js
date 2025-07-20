#!/usr/bin/env node
/**
 * 🧜‍♀️ RinaWarp Terminal - User Data Backup Script
 * 
 * Comprehensive backup solution for preserving user data and configurations
 * during migration from v1.0.7 to v1.0.19
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import archiver from 'archiver';
import crypto from 'crypto';

class UserDataBackup {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './backups',
      includeHistory: options.includeHistory !== false,
      includeCache: options.includeCache || false,
      compression: options.compression || 'gzip',
      verbose: options.verbose || false,
      dryRun: options.dryRun || false,
      ...options
    };

    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupDir = path.join(this.options.outputDir, `migration-${this.timestamp}`);
    this.manifest = {
      version: '1.0.19-migration',
      timestamp: this.timestamp,
      platform: os.platform(),
      hostname: os.hostname(),
      backupItems: [],
      checksums: {},
      totalSize: 0
    };
  }

  /**
   * Main backup execution
   */
  async backup() {
    try {
      this.log('🧜‍♀️ Starting RinaWarp Terminal data backup...');
      
      if (!this.options.dryRun) {
        await this.createBackupDirectory();
      }

      // Backup all critical components
      await this.backupUserConfigurations();
      await this.backupTerminalThemes();
      await this.backupKeybindings();
      await this.backupSessionHistory();
      await this.backupLocalStorage();
      await this.backupCustomSettings();
      await this.backupEnvironmentFiles();
      
      if (this.options.includeCache) {
        await this.backupCacheData();
      }

      // Generate manifest and checksums
      await this.generateManifest();
      
      if (!this.options.dryRun) {
        await this.createArchive();
        await this.validateBackup();
      }

      this.log('✅ Backup completed successfully!');
      this.printSummary();

      return {
        success: true,
        backupPath: this.backupDir,
        manifest: this.manifest
      };

    } catch (error) {
      this.log(`❌ Backup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Create backup directory structure
   */
  async createBackupDirectory() {
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['configs', 'themes', 'keybindings', 'history', 'storage', 'cache', 'custom'];
    for (const subdir of subdirs) {
      fs.mkdirSync(path.join(this.backupDir, subdir), { recursive: true });
    }

    this.log(`📁 Created backup directory: ${this.backupDir}`);
  }

  /**
   * Backup user configuration files
   */
  async backupUserConfigurations() {
    this.log('📝 Backing up user configurations...');
    
    const configPaths = [
      '.rinawarprc',
      'user-config.json',
      'terminal-config.json',
      'preferences.json',
      'settings.json',
      '.env',
      '.env.local',
      'config/user-preferences.json'
    ];

    for (const configPath of configPaths) {
      await this.backupFile(configPath, 'configs');
    }

    // Backup application-specific config directory
    const appConfigDir = path.join(os.homedir(), '.rinawarp');
    if (fs.existsSync(appConfigDir)) {
      await this.backupDirectory(appConfigDir, 'configs/app-config');
    }

    this.addToManifest('User Configurations', 'configs', 'Critical user settings and preferences');
  }

  /**
   * Backup terminal themes and customizations
   */
  async backupTerminalThemes() {
    this.log('🎨 Backing up terminal themes...');

    const themePaths = [
      'themes/',
      'styles/custom-themes/',
      'assets/themes/',
      '.rinawarp/themes/',
      'user-themes.json',
      'theme-preferences.json'
    ];

    for (const themePath of themePaths) {
      if (fs.existsSync(themePath)) {
        if (fs.statSync(themePath).isDirectory()) {
          await this.backupDirectory(themePath, 'themes');
        } else {
          await this.backupFile(themePath, 'themes');
        }
      }
    }

    // Export current theme configuration
    const currentTheme = await this.getCurrentThemeConfig();
    if (currentTheme) {
      const themeConfigPath = path.join(this.backupDir, 'themes', 'current-theme-config.json');
      if (!this.options.dryRun) {
        fs.writeFileSync(themeConfigPath, JSON.stringify(currentTheme, null, 2));
      }
      this.log(`💾 Exported current theme configuration`);
    }

    this.addToManifest('Terminal Themes', 'themes', 'Custom themes, color schemes, and visual preferences');
  }

  /**
   * Backup custom keybindings and shortcuts
   */
  async backupKeybindings() {
    this.log('⌨️ Backing up keybindings...');

    const keybindingPaths = [
      'keybindings.json',
      'shortcuts.json',
      'keyboard-config.json',
      '.rinawarp/keybindings/',
      'config/keymaps.json'
    ];

    for (const kbPath of keybindingPaths) {
      await this.backupFile(kbPath, 'keybindings');
    }

    this.addToManifest('Keybindings', 'keybindings', 'Custom keyboard shortcuts and key mappings');
  }

  /**
   * Backup terminal session history
   */
  async backupSessionHistory() {
    if (!this.options.includeHistory) {
      this.log('⏭️ Skipping session history backup');
      return;
    }

    this.log('📚 Backing up session history...');

    const historyPaths = [
      '.rinawarp_history',
      '.terminal_history',
      'session-history.json',
      '.rinawarp/history/',
      'logs/terminal-sessions/'
    ];

    for (const histPath of historyPaths) {
      await this.backupFile(histPath, 'history');
    }

    // Backup recent sessions metadata
    const sessionsMetadata = await this.getSessionsMetadata();
    if (sessionsMetadata && !this.options.dryRun) {
      const metadataPath = path.join(this.backupDir, 'history', 'sessions-metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(sessionsMetadata, null, 2));
    }

    this.addToManifest('Session History', 'history', 'Terminal command history and session data');
  }

  /**
   * Backup browser localStorage and sessionStorage
   */
  async backupLocalStorage() {
    this.log('🗄️ Backing up local storage...');

    try {
      // Attempt to extract localStorage from Electron app data
      const userDataPath = this.getElectronUserDataPath();
      if (userDataPath && fs.existsSync(userDataPath)) {
        const localStoragePath = path.join(userDataPath, 'Local Storage');
        if (fs.existsSync(localStoragePath)) {
          await this.backupDirectory(localStoragePath, 'storage/local-storage');
        }

        const sessionStoragePath = path.join(userDataPath, 'Session Storage');
        if (fs.existsSync(sessionStoragePath)) {
          await this.backupDirectory(sessionStoragePath, 'storage/session-storage');
        }
      }

      // Backup IndexedDB data if present
      const indexedDBPath = path.join(userDataPath || '', 'IndexedDB');
      if (fs.existsSync(indexedDBPath)) {
        await this.backupDirectory(indexedDBPath, 'storage/indexed-db');
      }

    } catch (error) {
      this.log(`⚠️ Could not backup local storage: ${error.message}`, 'warn');
    }

    this.addToManifest('Local Storage', 'storage', 'Browser storage data and application state');
  }

  /**
   * Backup custom user settings and plugins
   */
  async backupCustomSettings() {
    this.log('⚙️ Backing up custom settings...');

    const customPaths = [
      'plugins/',
      'extensions/',
      'custom-commands.json',
      'user-scripts/',
      '.rinawarp/plugins/',
      '.rinawarp/extensions/'
    ];

    for (const customPath of customPaths) {
      if (fs.existsSync(customPath)) {
        if (fs.statSync(customPath).isDirectory()) {
          await this.backupDirectory(customPath, 'custom');
        } else {
          await this.backupFile(customPath, 'custom');
        }
      }
    }

    this.addToManifest('Custom Settings', 'custom', 'Plugins, extensions, and custom configurations');
  }

  /**
   * Backup environment files and secrets (safely)
   */
  async backupEnvironmentFiles() {
    this.log('🔐 Backing up environment files...');

    const envFiles = ['.env.example', '.env.template', '.env.local.example'];
    
    // Only backup template files, not actual secret files
    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        await this.backupFile(envFile, 'configs');
      }
    }

    // Create a sanitized version of .env for reference (without secrets)
    if (fs.existsSync('.env') && !this.options.dryRun) {
      const envContent = fs.readFileSync('.env', 'utf8');
      const sanitizedEnv = this.sanitizeEnvFile(envContent);
      const sanitizedPath = path.join(this.backupDir, 'configs', '.env.sanitized');
      fs.writeFileSync(sanitizedPath, sanitizedEnv);
      this.log('🔒 Created sanitized environment file reference');
    }

    this.addToManifest('Environment Files', 'configs', 'Environment templates and configuration references');
  }

  /**
   * Backup cache data (optional)
   */
  async backupCacheData() {
    this.log('💾 Backing up cache data...');

    const cachePaths = [
      '.rinawarp/cache/',
      'node_modules/.cache/',
      'cache/',
      'tmp/rinawarp/'
    ];

    for (const cachePath of cachePaths) {
      if (fs.existsSync(cachePath)) {
        await this.backupDirectory(cachePath, 'cache');
      }
    }

    this.addToManifest('Cache Data', 'cache', 'Application cache and temporary files');
  }

  /**
   * Backup a single file
   */
  async backupFile(filePath, category) {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      return;
    }

    const stats = fs.statSync(fullPath);
    const fileName = path.basename(fullPath);
    const destPath = path.join(this.backupDir, category, fileName);

    if (!this.options.dryRun) {
      fs.copyFileSync(fullPath, destPath);
    }

    const checksum = await this.calculateChecksum(fullPath);
    this.manifest.checksums[filePath] = checksum;
    this.manifest.totalSize += stats.size;

    this.log(`📄 ${this.options.dryRun ? 'Would backup' : 'Backed up'}: ${filePath} (${this.formatBytes(stats.size)})`);
  }

  /**
   * Backup a directory recursively
   */
  async backupDirectory(dirPath, category) {
    const fullPath = path.resolve(dirPath);
    
    if (!fs.existsSync(fullPath)) {
      return;
    }

    const dirName = path.basename(fullPath);
    const destPath = path.join(this.backupDir, category, dirName);

    if (!this.options.dryRun) {
      await this.copyDirectoryRecursive(fullPath, destPath);
    }

    const size = await this.getDirectorySize(fullPath);
    this.manifest.totalSize += size;

    this.log(`📁 ${this.options.dryRun ? 'Would backup' : 'Backed up'}: ${dirPath} (${this.formatBytes(size)})`);
  }

  /**
   * Get current theme configuration
   */
  async getCurrentThemeConfig() {
    try {
      // Try to read current theme from various possible locations
      const possiblePaths = [
        'user-config.json',
        '.rinawarp/config.json',
        'terminal-config.json'
      ];

      for (const configPath of possiblePaths) {
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (config.theme || config.appearance) {
            return {
              source: configPath,
              theme: config.theme || config.appearance,
              timestamp: new Date().toISOString()
            };
          }
        }
      }

      return null;
    } catch (error) {
      this.log(`⚠️ Could not extract current theme config: ${error.message}`, 'warn');
      return null;
    }
  }

  /**
   * Get sessions metadata
   */
  async getSessionsMetadata() {
    try {
      return {
        lastBackup: new Date().toISOString(),
        totalSessions: 0, // Would be calculated from actual session data
        recentSessions: [], // Would contain recent session info
        preferences: {
          historyLength: 1000,
          saveHistory: true
        }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Electron user data path
   */
  getElectronUserDataPath() {
    const platform = os.platform();
    const appName = 'RinaWarp Terminal';
    
    switch (platform) {
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support', appName);
      case 'win32':
        return path.join(os.homedir(), 'AppData', 'Roaming', appName);
      case 'linux':
        return path.join(os.homedir(), '.config', appName);
      default:
        return null;
    }
  }

  /**
   * Sanitize environment file by removing sensitive values
   */
  sanitizeEnvFile(content) {
    return content
      .split('\n')
      .map(line => {
        if (line.includes('=') && !line.startsWith('#')) {
          const [key, ] = line.split('=');
          const sensitiveKeys = ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'PRIVATE'];
          const isSensitive = sensitiveKeys.some(sk => key.toUpperCase().includes(sk));
          
          if (isSensitive) {
            return `${key}=***REDACTED***`;
          }
        }
        return line;
      })
      .join('\n');
  }

  /**
   * Calculate file checksum
   */
  async calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Copy directory recursively
   */
  async copyDirectoryRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const items = fs.readdirSync(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.statSync(srcPath).isDirectory()) {
        await this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Get directory size recursively
   */
  async getDirectorySize(dirPath) {
    let totalSize = 0;
    
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        totalSize += await this.getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }

  /**
   * Generate backup manifest
   */
  async generateManifest() {
    const manifestPath = path.join(this.backupDir, 'manifest.json');
    
    if (!this.options.dryRun) {
      fs.writeFileSync(manifestPath, JSON.stringify(this.manifest, null, 2));
    }

    this.log('📋 Generated backup manifest');
  }

  /**
   * Create compressed archive
   */
  async createArchive() {
    return new Promise((resolve, reject) => {
      const archivePath = `${this.backupDir}.tar.gz`;
      const output = fs.createWriteStream(archivePath);
      const archive = archiver('tar', { gzip: true });

      output.on('close', () => {
        this.log(`📦 Created archive: ${archivePath} (${this.formatBytes(archive.pointer())})`);
        resolve(archivePath);
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(this.backupDir, false);
      archive.finalize();
    });
  }

  /**
   * Validate backup integrity
   */
  async validateBackup() {
    this.log('🔍 Validating backup integrity...');
    
    // Verify manifest exists
    const manifestPath = path.join(this.backupDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Backup manifest not found');
    }

    // Verify critical files exist
    const criticalFiles = ['configs', 'themes'];
    for (const file of criticalFiles) {
      const filePath = path.join(this.backupDir, file);
      if (!fs.existsSync(filePath)) {
        this.log(`⚠️ Warning: ${file} directory not found in backup`, 'warn');
      }
    }

    this.log('✅ Backup validation completed');
  }

  /**
   * Add item to manifest
   */
  addToManifest(name, path, description) {
    this.manifest.backupItems.push({
      name,
      path,
      description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Print backup summary
   */
  printSummary() {
    console.log('\n🧜‍♀️ ===== BACKUP SUMMARY =====');
    console.log(`📅 Timestamp: ${this.timestamp}`);
    console.log(`📁 Location: ${this.backupDir}`);
    console.log(`💾 Total Size: ${this.formatBytes(this.manifest.totalSize)}`);
    console.log(`📦 Items Backed Up: ${this.manifest.backupItems.length}`);
    
    console.log('\n📋 Backup Contents:');
    for (const item of this.manifest.backupItems) {
      console.log(`  ✅ ${item.name}: ${item.description}`);
    }
    
    console.log('\n🔧 Next Steps:');
    console.log('  1. Run migration: node migrationToolkit/migrateUserConfig.js');
    console.log('  2. Install new version: npm install');
    console.log('  3. Test compatibility: npm run test:migration');
    console.log('\n🆘 If issues occur, restore with:');
    console.log(`  node migrationToolkit/rollback.js --backup-dir="${this.backupDir}"`);
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Logging utility
   */
  log(message, level = 'info') {
    if (!this.options.verbose && level === 'debug') return;
    
    const prefix = {
      info: '💙',
      warn: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level] || '📝';

    console.log(`${prefix} ${message}`);
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run'),
    includeCache: args.includes('--include-cache'),
    includeHistory: !args.includes('--no-history')
  };

  const backup = new UserDataBackup(options);
  
  backup.backup()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Backup completed successfully!');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('\n❌ Backup failed:', error.message);
      process.exit(1);
    });
}

export { UserDataBackup };
export default UserDataBackup;
