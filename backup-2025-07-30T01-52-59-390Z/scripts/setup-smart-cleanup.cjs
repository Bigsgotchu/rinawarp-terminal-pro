#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SmartCleanupSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.huskyDir = path.join(this.projectRoot, '.husky');
  }

  log(message, level = 'info') {
    const colors = {
      info: '\x1b[36m',    // cyan
      success: '\x1b[32m', // green
      warning: '\x1b[33m', // yellow
      error: '\x1b[31m',   // red
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[level] || colors.info}${message}${colors.reset}`);
  }

  async checkExistingSetup() {
    this.log('🔍 Checking existing setup...');
    
    const files = {
      smartManager: path.join(this.projectRoot, 'scripts', 'smart-file-manager.cjs'),
      config: path.join(this.projectRoot, '.smartcleanrc.js'),
      huskyHook: path.join(this.huskyDir, 'smart-cleanup'),
      packageJson: path.join(this.projectRoot, 'package.json')
    };
    
    const status = {};
    for (const [key, filePath] of Object.entries(files)) {
      status[key] = fs.existsSync(filePath);
      this.log(`  ${status[key] ? '✅' : '❌'} ${key}: ${filePath}`, status[key] ? 'success' : 'warning');
    }
    
    return status;
  }

  async makeExecutable(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.chmodSync(filePath, '755');
        this.log(`  Made executable: ${filePath}`, 'success');
      }
    } catch (error) {
      this.log(`  Error making executable: ${error.message}`, 'error');
    }
  }

  async setupGitHooks() {
    this.log('🎣 Setting up Git hooks...');
    
    if (!fs.existsSync(this.huskyDir)) {
      this.log('  Husky directory not found. Make sure husky is installed.', 'warning');
      return;
    }
    
    // Make the smart-cleanup hook executable
    const hookPath = path.join(this.huskyDir, 'smart-cleanup');
    await this.makeExecutable(hookPath);
    
    // Update pre-commit hook to include smart cleanup
    const preCommitPath = path.join(this.huskyDir, 'pre-commit');
    
    if (fs.existsSync(preCommitPath)) {
      let content = fs.readFileSync(preCommitPath, 'utf8');
      
      if (!content.includes('smart-cleanup')) {
        content += '\n# Smart File Manager cleanup\n.husky/smart-cleanup\n';
        fs.writeFileSync(preCommitPath, content);
        await this.makeExecutable(preCommitPath);
        this.log('  ✅ Updated pre-commit hook', 'success');
      } else {
        this.log('  ℹ️  Pre-commit hook already includes smart cleanup', 'info');
      }
    } else {
      // Create new pre-commit hook
      const preCommitContent = '#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\n# Smart File Manager cleanup\n.husky/smart-cleanup\n';
      fs.writeFileSync(preCommitPath, preCommitContent);
      await this.makeExecutable(preCommitPath);
      this.log('  ✅ Created new pre-commit hook', 'success');
    }
  }

  async createLaunchScript() {
    this.log('🚀 Creating launch script...');
    
    const launchScript = `#!/bin/bash

# RinaWarp Smart File Manager Launcher
# This script provides convenient ways to run the smart file manager

case "$1" in
  "watch")
    echo "🔍 Starting Smart File Manager in watch mode..."
    npm run clean:smart:watch
    ;;
  "clean")
    echo "🧹 Running one-time cleanup..."
    npm run clean:smart
    ;;
  "dry-run")
    echo "🔍 Running dry-run to see what would be cleaned..."
    npm run clean:smart:dry
    ;;
  "interactive")
    echo "🤔 Running in interactive mode..."
    npm run clean:smart:interactive
    ;;
  "full")
    echo "🧹 Running full cleanup (smart + legacy)..."
    npm run clean:all
    ;;
  "status")
    echo "📊 Checking project status..."
    node scripts/smart-file-manager.cjs --dry-run --verbose --no-watch
    ;;
  "help"|"")
    echo "RinaWarp Smart File Manager"
    echo ""
    echo "Usage: ./smart-clean.sh [command]"
    echo ""
    echo "Commands:"
    echo "  watch       - Start file watcher for real-time cleanup"
    echo "  clean       - Run one-time cleanup"
    echo "  dry-run     - Show what would be cleaned without doing it"
    echo "  interactive - Run with prompts for each action"
    echo "  full        - Run both smart and legacy cleanup"
    echo "  status      - Check current project status"
    echo "  help        - Show this help message"
    ;;
  *)
    echo "Unknown command: $1"
    echo "Use './smart-clean.sh help' for usage information"
    exit 1
    ;;
esac
`;

    const scriptPath = path.join(this.projectRoot, 'smart-clean.sh');
    fs.writeFileSync(scriptPath, launchScript);
    await this.makeExecutable(scriptPath);
    
    this.log('  ✅ Created smart-clean.sh launcher script', 'success');
  }

  async createGitIgnoreEntries() {
    this.log('📝 Updating .gitignore...');
    
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    const entriesToAdd = [
      '',
      '# Smart File Manager',
      '.smart-backup/',
      'smart-file-manager.log',
      'smart-file-manager-report-*.json',
      'cleanup-report-*.json'
    ];
    
    if (fs.existsSync(gitignorePath)) {
      let content = fs.readFileSync(gitignorePath, 'utf8');
      let modified = false;
      
      for (const entry of entriesToAdd) {
        if (entry && !content.includes(entry)) {
          content += `\n${entry}`;
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(gitignorePath, content);
        this.log('  ✅ Updated .gitignore', 'success');
      } else {
        this.log('  ℹ️  .gitignore already up to date', 'info');
      }
    } else {
      fs.writeFileSync(gitignorePath, entriesToAdd.join('\n'));
      this.log('  ✅ Created .gitignore', 'success');
    }
  }

  async runInitialCleanup() {
    const shouldRun = process.argv.includes('--run-cleanup') || process.argv.includes('--initial-cleanup');
    
    if (shouldRun) {
      this.log('🧹 Running initial cleanup...');
      
      try {
        const { spawn } = require('child_process');
        const cleanup = spawn('node', ['scripts/smart-file-manager.cjs', '--verbose', '--no-watch'], {
          stdio: 'inherit',
          cwd: this.projectRoot
        });
        
        cleanup.on('close', (code) => {
          if (code === 0) {
            this.log('  ✅ Initial cleanup completed', 'success');
          } else {
            this.log('  ⚠️  Initial cleanup finished with warnings', 'warning');
          }
        });
      } catch (error) {
        this.log(`  ❌ Error running initial cleanup: ${error.message}`, 'error');
      }
    } else {
      this.log('  ℹ️  Skipping initial cleanup (use --run-cleanup to enable)', 'info');
    }
  }

  async run() {
    console.clear();
    this.log('🧠 RinaWarp Smart File Manager Setup', 'info');
    this.log('=====================================', 'info');
    
    try {
      // Check existing setup
      const status = await this.checkExistingSetup();
      
      // Setup Git hooks
      await this.setupGitHooks();
      
      // Create launch script
      await this.createLaunchScript();
      
      // Update .gitignore
      await this.createGitIgnoreEntries();
      
      // Optional initial cleanup
      await this.runInitialCleanup();
      
      this.log('', 'info');
      this.log('🎉 Smart File Manager setup complete!', 'success');
      this.log('', 'info');
      this.log('Available commands:', 'info');
      this.log('  npm run clean:smart              - Run cleanup once', 'info');
      this.log('  npm run clean:smart:watch        - Start file watcher', 'info');
      this.log('  npm run clean:smart:dry          - Preview cleanup', 'info');
      this.log('  npm run clean:smart:interactive  - Interactive mode', 'info');
      this.log('  ./smart-clean.sh help            - Launcher script help', 'info');
      this.log('', 'info');
      this.log('The system will now automatically:', 'info');
      this.log('  ✅ Clean up broken/duplicate files before commits', 'success');
      this.log('  ✅ Watch for new clean files and remove broken variants', 'success');
      this.log('  ✅ Maintain project cleanliness', 'success');
      this.log('', 'info');
      this.log('Configuration file: .smartcleanrc.js', 'info');
      this.log('Logs: smart-file-manager.log', 'info');
      this.log('Backups: .smart-backup/', 'info');
      
    } catch (error) {
      this.log(`❌ Setup failed: ${error.message}`, 'error');
      console.error(error);
      process.exit(1);
    }
  }
}

// Run setup
if (require.main === module) {
  const setup = new SmartCleanupSetup();
  setup.run().catch(console.error);
}

module.exports = SmartCleanupSetup;
