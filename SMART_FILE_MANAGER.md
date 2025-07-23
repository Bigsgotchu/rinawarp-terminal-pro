# RinaWarp Smart File Manager

## Overview

The Smart File Manager is an intelligent file cleanup system designed to automatically maintain project cleanliness by detecting and removing broken, duplicate, and temporary files while preserving clean versions.

## Key Features

- **🧠 Intelligent Pattern Recognition**: Automatically detects broken files based on naming patterns
- **🔄 Real-time Monitoring**: Watches for file changes and cleans up automatically
- **💾 Safe Backup System**: Creates backups before removing any files
- **🎯 Duplicate Detection**: Finds and removes identical files
- **🧹 Orphan Cleanup**: Removes broken files that have no clean counterparts
- **⚙️ Configurable**: Fully customizable patterns and behavior

## Quick Start

### 1. Setup
```bash
# Run the setup script to initialize everything
node scripts/setup-smart-cleanup.js

# Or run with initial cleanup
node scripts/setup-smart-cleanup.js --run-cleanup
```

### 2. Basic Usage
```bash
# Run cleanup once
npm run clean:smart

# Preview what would be cleaned (dry run)
npm run clean:smart:dry

# Interactive mode (prompts for each action)
npm run clean:smart:interactive

# Start file watcher for real-time cleanup
npm run clean:smart:watch

# Run both smart and legacy cleanup
npm run clean:all
```

### 3. Launcher Script
```bash
# Use the convenient launcher script
./smart-clean.sh help        # Show help
./smart-clean.sh clean       # Run cleanup
./smart-clean.sh watch       # Start watcher
./smart-clean.sh dry-run     # Preview mode
./smart-clean.sh interactive # Interactive mode
./smart-clean.sh status      # Check project status
```

## How It Works

### Pattern Detection
The system identifies problematic files using configurable patterns:

**Broken File Patterns:**
- `.backup`, `.old`, `.tmp`, `.temp`
- `-broken`, `-copy`, `-duplicate`
- `-conflict`, `.orig`, `~`
- Editor temp files (`.swp`, `.swo`, `#file#`)

**Versioned File Patterns:**
- `-v1`, `-v2`, etc.
- `-2025-01-23` (date stamps)
- `-1234567890123` (timestamps)
- `-version-1`, `-rev-2`, `-build-3`

### Cleanup Process
1. **Scan**: Recursively scans configured directories
2. **Map**: Builds relationships between clean and broken files
3. **Analyze**: Identifies duplicates and orphans
4. **Backup**: Creates safety backups
5. **Clean**: Removes problematic files
6. **Watch**: Monitors for new files (optional)

### Real-time Watching
When a clean file is created/updated, the system:
1. Detects the file change
2. Checks for broken variants of the same file
3. Prompts (if interactive) or automatically removes broken versions
4. Logs all actions

## Configuration

### `.smartcleanrc.js`
Customize behavior by editing the configuration file:

```javascript
module.exports = {
  // Directories to monitor
  watchPaths: ['src/', 'public/', 'scripts/'],
  
  // File types to watch
  fileTypes: ['.js', '.css', '.html', '.json'],
  
  // Custom broken patterns
  brokenPatterns: [/\.backup$/, /\.old$/],
  
  // Cleanup behavior
  cleanup: {
    removeDuplicates: true,
    removeOrphans: true,
    createBackups: true,
    maxTempFileAge: 7 // days
  }
};
```

### Project-Specific Patterns
Add custom patterns for your specific needs:

```javascript
customPatterns: {
  rinawarp: [
    /deployment-monitor-.*\.log$/,
    /test-.*\.cjs$/,
    /debug-.*\.js$/
  ]
}
```

## Git Integration

The system automatically integrates with Git:
- **Pre-commit Hook**: Runs cleanup before each commit
- **Husky Integration**: Uses existing Husky setup
- **Automatic Setup**: Configures hooks during setup

## Safety Features

### Backup System
- All removed files are backed up to `.smart-backup/`
- Timestamped backups prevent conflicts
- Easy recovery if needed

### Protected Files
Important files are never touched:
- `package.json`, `package-lock.json`
- `.gitignore`, `README.md`, `LICENSE`
- Environment files (`.env*`)

### Dry Run Mode
Preview changes without making them:
```bash
npm run clean:smart:dry
```

## Monitoring & Logs

### Log Files
- `smart-file-manager.log` - All operations
- `smart-file-manager-report-*.json` - Detailed reports

### Report Contents
```json
{
  "timestamp": "2025-01-23T10:30:00Z",
  "mode": "ACTIVE",
  "summary": {
    "totalFileGroups": 150,
    "cleanFiles": 145,
    "brokenFiles": 8,
    "duplicates": 3,
    "orphans": 2
  },
  "actions": ["Removed: src/component.backup", "..."]
}
```

## Common Use Cases

### 1. After Merging Branches
```bash
# Clean up any merge artifacts
./smart-clean.sh clean
```

### 2. Before Important Commits
```bash
# Ensure project is clean
./smart-clean.sh status
```

### 3. During Development
```bash
# Start watching for real-time cleanup
./smart-clean.sh watch
```

### 4. Project Maintenance
```bash
# Full cleanup including legacy script
./smart-clean.sh full
```

## Command Reference

| Command | Description |
|---------|-------------|
| `npm run clean:smart` | Run cleanup once |
| `npm run clean:smart:dry` | Preview cleanup |
| `npm run clean:smart:interactive` | Interactive mode |
| `npm run clean:smart:watch` | Start file watcher |
| `npm run clean:all` | Smart + legacy cleanup |
| `./smart-clean.sh [cmd]` | Launcher script |

## Troubleshooting

### File Not Removed
- Check if file matches protected patterns
- Verify file permissions
- Check backup directory for conflicts

### False Positives
- Update patterns in `.smartcleanrc.js`
- Use interactive mode to review actions
- Add to protected files list

### Performance Issues
- Reduce watch paths scope
- Increase debounce timing
- Disable real-time watching

## Integration with Existing Tools

The Smart File Manager works alongside:
- **Existing Cleanup Script**: `scripts/cleanup-old-files.js`
- **RinaWarp Cleanup Tools**: `tools/rinawarp-cleanup/`
- **Git Hooks**: Husky pre-commit integration
- **Build Process**: Optional pre-build cleanup

## Development

### Extending Patterns
Add new detection patterns:
```javascript
// In .smartcleanrc.js
brokenPatterns: [
  ...existingPatterns,
  /your-custom-pattern$/
]
```

### Custom Actions
Extend the SmartFileManager class:
```javascript
const SmartFileManager = require('./scripts/smart-file-manager');

class CustomManager extends SmartFileManager {
  // Add custom logic
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new patterns
4. Update documentation
5. Submit a pull request

## License

Part of the RinaWarp Terminal project - Proprietary License
