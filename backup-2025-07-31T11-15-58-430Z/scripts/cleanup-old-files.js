#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const fs = require('node:fs');
const path = require('node:path');

class ProjectCleanup {
  constructor() {
    this.cleanupLog = [];
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
  }

  log(message) {
    if (this.verbose) {
      console.log(message);
    }
    this.cleanupLog.push(message);
  }

  removeFile(filePath) {
    if (this.dryRun) {
      this.log(`[DRY RUN] Would remove: ${filePath}`);
      return;
    }

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.log(`✅ Removed: ${filePath}`);
      }
    } catch (error) {
      this.log(`❌ Error removing ${filePath}: ${error.message}`);
    }
  }

  removeDirectory(dirPath) {
    if (this.dryRun) {
      this.log(`[DRY RUN] Would remove directory: ${dirPath}`);
      return;
    }

    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        this.log(`✅ Removed directory: ${dirPath}`);
      }
    } catch (error) {
      this.log(`❌ Error removing directory ${dirPath}: ${error.message}`);
    }
  }

  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  cleanupLogFiles() {
    console.log('\n🧹 Cleaning up log files...');
    let totalSize = 0;
    let fileCount = 0;

    const _logPatterns = [
      'deployment-monitor-*.log',
      'dns-migration-*.log',
      'firebase-diagnostic-*.log',
      'alerts.log',
      'revenue-alerts.log',
      'logs/**/*.log',
      'monitoring-logs/**/*.log',
      'monitoring/**/*.log',
    ];

    // Clean specific log files
    const logFiles = [
      'deployment-monitor-2025-07-18.log',
      'dns-migration-2025-07-18.log',
      'alerts.log',
      'revenue-alerts.log',
    ];

    logFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const size = this.getFileSize(file);
        totalSize += size;
        fileCount++;
        this.removeFile(file);
      }
    });

    // Clean logs directory
    if (fs.existsSync('logs')) {
      const logDir = fs.readdirSync('logs');
      logDir.forEach(file => {
        const filePath = path.join('logs', file);
        if (file.endsWith('.log')) {
          const size = this.getFileSize(filePath);
          totalSize += size;
          fileCount++;
          this.removeFile(filePath);
        }
      });
    }

    // Clean monitoring-logs directory
    if (fs.existsSync('monitoring-logs')) {
      const monitoringDir = fs.readdirSync('monitoring-logs');
      monitoringDir.forEach(file => {
        const filePath = path.join('monitoring-logs', file);
        if (file.endsWith('.log')) {
          const size = this.getFileSize(filePath);
          totalSize += size;
          fileCount++;
          this.removeFile(filePath);
        }
      });
    }

    console.log(`📊 Log files: ${fileCount} files, ${this.formatBytes(totalSize)} freed`);
  }

  cleanupTempFiles() {
    console.log('\n🧹 Cleaning up temporary files...');
    let totalSize = 0;
    let fileCount = 0;

    const tempFiles = [
      'firebase-diagnostic-report.json',
      'deployment-status.json',
      'monitoring-state.json',
      'revenue-monitoring-state.json',
      'test-results.json',
      'netlify.toml.bak',
    ];

    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const size = this.getFileSize(file);
        totalSize += size;
        fileCount++;
        this.removeFile(file);
      }
    });

    // Clean temp directories
    const tempDirs = ['temp', 'tmp', 'test-public'];
    tempDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const dirSize = this.getDirSize(dir);
        totalSize += dirSize;
        fileCount++;
        this.removeDirectory(dir);
      }
    });

    console.log(`📊 Temp files: ${fileCount} items, ${this.formatBytes(totalSize)} freed`);
  }

  getDirSize(dirPath) {
    let totalSize = 0;
    try {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          totalSize += this.getDirSize(filePath);
        } else {
          totalSize += stat.size;
        }
      });
    } catch (error) {
      // Ignore errors
    }
    return totalSize;
  }

  cleanupOldTestFiles() {
    console.log('\n🧹 Cleaning up old test files...');
    let totalSize = 0;
    let fileCount = 0;

    const testFiles = [
      'test-basic-jest.config.js',
      'test-branch-protection.md',
      'test-deploy.md',
      'test-verification-summary.md',
      'test_welcome.json',
      'force-push-test.md',
      'integration-test-plan.md',
      'manual-webhook-test.js',
      'test-monitoring-simple.cjs',
      'test-monitoring.js',
      'test-webhook-debug.js',
      'test-stripe-payment.js',
      'test-stripe.js',
      'test-ipc-communication.js',
      'test-ipc-electron.js',
      'test-electron-comprehensive.js',
      'test-speech.html',
    ];

    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const size = this.getFileSize(file);
        totalSize += size;
        fileCount++;
        this.removeFile(file);
      }
    });

    console.log(`📊 Test files: ${fileCount} files, ${this.formatBytes(totalSize)} freed`);
  }

  cleanupOldDebugFiles() {
    console.log('\n🧹 Cleaning up debug files...');
    let totalSize = 0;
    let fileCount = 0;

    const debugFiles = [
      'debug-checkbox.js',
      'debug-endpoints.cjs',
      'debug-start.sh',
      'firebase-debug.js',
    ];

    debugFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const size = this.getFileSize(file);
        totalSize += size;
        fileCount++;
        this.removeFile(file);
      }
    });

    console.log(`📊 Debug files: ${fileCount} files, ${this.formatBytes(totalSize)} freed`);
  }

  cleanupEmailTestFiles() {
    console.log('\n🧹 Cleaning up email test files...');
    let totalSize = 0;
    let fileCount = 0;

    // Clean email testing reports
    if (fs.existsSync('email-templates/testing')) {
      const testingDir = fs.readdirSync('email-templates/testing');
      testingDir.forEach(file => {
        if (file.startsWith('test-report-') && file.endsWith('.json')) {
          const filePath = path.join('email-templates/testing', file);
          const size = this.getFileSize(filePath);
          totalSize += size;
          fileCount++;
          this.removeFile(filePath);
        }
      });
    }

    const emailTestFiles = ['beta-email-template.txt', 'beta-testing-email.html'];

    emailTestFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const size = this.getFileSize(file);
        totalSize += size;
        fileCount++;
        this.removeFile(file);
      }
    });

    console.log(`📊 Email test files: ${fileCount} files, ${this.formatBytes(totalSize)} freed`);
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      action: this.dryRun ? 'DRY_RUN' : 'CLEANUP',
      summary: {
        totalFiles: this.cleanupLog.length,
        actions: this.cleanupLog,
      },
    };

    const reportFile = `cleanup-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📊 Cleanup report saved: ${reportFile}`);
  }

  async run() {
    console.log('🧹 Starting Project Cleanup...');
    if (this.dryRun) {
      console.log('🔍 Running in DRY RUN mode - no files will be deleted');
    }

    console.log('\n' + '='.repeat(50));

    this.cleanupLogFiles();
    this.cleanupTempFiles();
    this.cleanupOldTestFiles();
    this.cleanupOldDebugFiles();
    this.cleanupEmailTestFiles();

    console.log('\n' + '='.repeat(50));
    console.log(`\n✅ Cleanup complete! Total actions: ${this.cleanupLog.length}`);

    if (!this.dryRun) {
      this.generateReport();
    }

    console.log('\n🎉 Project cleanup finished!');
  }
}

// Run cleanup
const cleanup = new ProjectCleanup();
cleanup.run().catch(console.error);
