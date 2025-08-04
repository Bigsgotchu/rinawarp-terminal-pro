#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

class SmartFileManager {
  constructor() {
    this.config = {
      watchPaths: ['src/', 'public/', 'styles/', 'scripts/', 'components/', 'assets/'],
      fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html', '.json'],
      backupDir: '.smart-backup',
      logFile: 'smart-file-manager.log',
      patterns: {
        // Common patterns that indicate broken/temp files
        broken: [
          /\.backup$/,
          /\.old$/,
          /\.tmp$/,
          /\.temp$/,
          /\-broken$/,
          /\-copy$/,
          /\-duplicate$/,
          /\-conflict.*$/,
          /\.orig$/,
          /~$/,
        ],
        // Patterns for versioned files
        versioned: [
          /\-v\d+$/,
          /\-\d{4}-\d{2}-\d{2}$/,
          /\-\d{13}$/, // timestamps
        ],
      },
      dryRun: process.argv.includes('--dry-run'),
      verbose: process.argv.includes('--verbose'),
      interactive: process.argv.includes('--interactive'),
    };

    this.actionsLog = [];
    this.fileMap = new Map(); // Track file relationships
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (this.config.verbose || level === 'error') {
      console.log(logEntry);
    }

    this.actionsLog.push(logEntry);

    // Write to log file
    fs.appendFileSync(this.config.logFile, logEntry + '\n');
  }

  async calculateFileHash(filePath) {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      this.log(`Error calculating hash for ${filePath}: ${error.message}`, 'error');
      return null;
    }
  }

  isFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.config.fileTypes.includes(ext);
  }

  isBrokenFile(fileName) {
    return this.config.patterns.broken.some(pattern => pattern.test(fileName));
  }

  isVersionedFile(fileName) {
    return this.config.patterns.versioned.some(pattern => pattern.test(fileName));
  }

  getCleanFileName(filePath) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    let baseName = path.basename(filePath, ext);

    // Remove known broken patterns
    for (const pattern of this.config.patterns.broken) {
      baseName = baseName.replace(pattern, '');
    }

    // Remove versioning patterns
    for (const pattern of this.config.patterns.versioned) {
      baseName = baseName.replace(pattern, '');
    }

    return path.join(dir, baseName + ext);
  }

  async scanDirectory(dirPath) {
    const files = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, .git, and other common ignore dirs
          if (!['node_modules', '.git', 'dist', 'build', '.smart-backup'].includes(entry.name)) {
            files.push(...(await this.scanDirectory(fullPath)));
          }
        } else if (entry.isFile() && this.isFileType(fullPath)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.log(`Error scanning directory ${dirPath}: ${error.message}`, 'error');
    }

    return files;
  }

  async buildFileMap() {
    this.log('Building file relationship map...');

    for (const watchPath of this.config.watchPaths) {
      if (fs.existsSync(watchPath)) {
        const files = await this.scanDirectory(watchPath);

        for (const filePath of files) {
          const cleanPath = this.getCleanFileName(filePath);

          if (!this.fileMap.has(cleanPath)) {
            this.fileMap.set(cleanPath, {
              clean: null,
              variants: [],
            });
          }

          const entry = this.fileMap.get(cleanPath);

          if (filePath === cleanPath) {
            entry.clean = filePath;
          } else {
            entry.variants.push(filePath);
          }
        }
      }
    }

    this.log(`Built file map with ${this.fileMap.size} file groups`);
  }

  async backupFile(filePath) {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }

    const timestamp = Date.now();
    const backupName = `${path.basename(filePath)}.${timestamp}.backup`;
    const backupPath = path.join(this.config.backupDir, backupName);

    try {
      fs.copyFileSync(filePath, backupPath);
      this.log(`Backed up ${filePath} to ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.log(`Error backing up ${filePath}: ${error.message}`, 'error');
      return null;
    }
  }

  async removeFile(filePath) {
    if (this.config.dryRun) {
      this.log(`[DRY RUN] Would remove: ${filePath}`);
      return true;
    }

    try {
      // Backup before removing
      await this.backupFile(filePath);

      fs.unlinkSync(filePath);
      this.log(`✅ Removed broken file: ${filePath}`);
      return true;
    } catch (error) {
      this.log(`❌ Error removing ${filePath}: ${error.message}`, 'error');
      return false;
    }
  }

  async promptUser(message) {
    if (!this.config.interactive) {
      return true; // Auto-approve in non-interactive mode
    }

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      rl.question(`${message} (y/n): `, answer => {
        rl.close();
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }

  async findDuplicates() {
    this.log('Finding duplicate files...');
    const duplicates = [];

    for (const [_cleanPath, entry] of this.fileMap.entries()) {
      if (entry.clean && entry.variants.length > 0) {
        // Check if variants are actual duplicates (same content)
        const cleanHash = await this.calculateFileHash(entry.clean);

        for (const variant of entry.variants) {
          const variantHash = await this.calculateFileHash(variant);

          if (cleanHash && variantHash && cleanHash === variantHash) {
            duplicates.push({
              clean: entry.clean,
              duplicate: variant,
              reason: 'identical_content',
            });
          } else if (this.isBrokenFile(path.basename(variant))) {
            duplicates.push({
              clean: entry.clean,
              duplicate: variant,
              reason: 'broken_pattern',
            });
          }
        }
      }
    }

    return duplicates;
  }

  async findOrphans() {
    this.log('Finding orphaned broken files...');
    const orphans = [];

    for (const [cleanPath, entry] of this.fileMap.entries()) {
      if (!entry.clean && entry.variants.length > 0) {
        // No clean version exists, but broken variants do
        orphans.push(
          ...entry.variants.map(variant => ({
            file: variant,
            expectedClean: cleanPath,
            reason: 'no_clean_version',
          }))
        );
      }
    }

    return orphans;
  }

  async cleanupDuplicates() {
    const duplicates = await this.findDuplicates();

    if (duplicates.length === 0) {
      this.log('No duplicate files found');
      return;
    }

    this.log(`Found ${duplicates.length} duplicate files to clean up`);

    for (const duplicate of duplicates) {
      const shouldRemove = await this.promptUser(
        `Remove duplicate: ${duplicate.duplicate} (clean version: ${duplicate.clean}, reason: ${duplicate.reason})?`
      );

      if (shouldRemove) {
        await this.removeFile(duplicate.duplicate);
      }
    }
  }

  async cleanupOrphans() {
    const orphans = await this.findOrphans();

    if (orphans.length === 0) {
      this.log('No orphaned broken files found');
      return;
    }

    this.log(`Found ${orphans.length} orphaned broken files`);

    for (const orphan of orphans) {
      const shouldRemove = await this.promptUser(
        `Remove orphaned broken file: ${orphan.file} (expected clean: ${orphan.expectedClean})?`
      );

      if (shouldRemove) {
        await this.removeFile(orphan.file);
      }
    }
  }

  async setupFileWatcher() {
    if (process.argv.includes('--no-watch')) {
      return;
    }

    this.log('Setting up file system watcher...');

    for (const watchPath of this.config.watchPaths) {
      if (fs.existsSync(watchPath)) {
        fs.watch(watchPath, { recursive: true }, async (eventType, filename) => {
          if (eventType === 'rename' && filename && this.isFileType(filename)) {
            const fullPath = path.join(watchPath, filename);

            if (fs.existsSync(fullPath)) {
              // File was created/renamed
              this.log(`File created/renamed: ${fullPath}`);

              // Check if this is a clean version of an existing broken file
              const cleanPath = this.getCleanFileName(fullPath);

              if (fullPath === cleanPath) {
                // This is a clean file, check for broken variants
                await this.buildFileMap(); // Rebuild map
                const entry = this.fileMap.get(cleanPath);

                if (entry && entry.variants.length > 0) {
                  this.log(`Clean version created: ${fullPath}, checking for broken variants...`);

                  for (const variant of entry.variants) {
                    if (this.isBrokenFile(path.basename(variant))) {
                      const shouldRemove = await this.promptUser(
                        `Clean version created. Remove broken variant: ${variant}?`
                      );

                      if (shouldRemove) {
                        await this.removeFile(variant);
                      }
                    }
                  }
                }
              }
            }
          }
        });

        this.log(`Watching ${watchPath} for file changes`);
      }
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      mode: this.config.dryRun ? 'DRY_RUN' : 'ACTIVE',
      summary: {
        totalFileGroups: this.fileMap.size,
        cleanFiles: 0,
        brokenFiles: 0,
        duplicates: 0,
        orphans: 0,
      },
      actions: this.actionsLog,
      fileMap: Object.fromEntries(this.fileMap),
    };

    // Calculate summary statistics
    for (const [_, entry] of this.fileMap.entries()) {
      if (entry.clean) report.summary.cleanFiles++;
      report.summary.brokenFiles += entry.variants.length;
    }

    const duplicates = await this.findDuplicates();
    const orphans = await this.findOrphans();

    report.summary.duplicates = duplicates.length;
    report.summary.orphans = orphans.length;

    const reportFile = `smart-file-manager-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    this.log(`📊 Report generated: ${reportFile}`);
    return report;
  }

  async run() {
    console.log('🧠 Smart File Manager - Keeping your project clean!');

    if (this.config.dryRun) {
      console.log('🔍 Running in DRY RUN mode - no files will be modified');
    }

    if (this.config.interactive) {
      console.log('🤔 Running in INTERACTIVE mode - you will be prompted for each action');
    }

    console.log('\n' + '='.repeat(60));

    try {
      // Build the file relationship map
      await this.buildFileMap();

      // Cleanup duplicates and orphans
      await this.cleanupDuplicates();
      await this.cleanupOrphans();

      // Set up file watcher for real-time cleanup
      await this.setupFileWatcher();

      // Generate final report
      const report = await this.generateReport();

      console.log('\n' + '='.repeat(60));
      console.log('✅ Smart cleanup complete!');
      console.log(
        `📊 Stats: ${report.summary.cleanFiles} clean files, ${report.summary.brokenFiles} variants found`
      );
      console.log(
        `🗑️  Cleaned up: ${report.summary.duplicates} duplicates, ${report.summary.orphans} orphans`
      );

      if (!process.argv.includes('--no-watch')) {
        console.log('👀 File watcher is active. Press Ctrl+C to stop.');

        // Keep the process alive for file watching
        process.on('SIGINT', () => {
          console.log('\n👋 Smart File Manager stopped.');
          process.exit(0);
        });

        // Keep alive
        setInterval(() => {}, 10000);
      }
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      console.error('❌ Smart File Manager encountered an error:', error.message);
      process.exit(1);
    }
  }
}

// Run the smart file manager
if (require.main === module) {
  const manager = new SmartFileManager();
  manager.run().catch(console.error);
}

module.exports = SmartFileManager;
