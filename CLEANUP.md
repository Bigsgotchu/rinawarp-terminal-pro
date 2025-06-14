# 🧹 RinaWarp Terminal - Cleanup Scripts

This project includes several automated cleanup scripts to help maintain a clean development environment and free up disk space.

## 📁 Available Scripts

### 1. Quick Cleanup (`quick-clean.ps1`)
**Fast cleanup for daily development**
- Removes build artifacts (`dist`, `build`, `app-extracted`)
- Clears development caches
- Removes temporary files
- **Runtime**: ~2-5 seconds

```powershell
# Quick cleanup
.\quick-clean.ps1

# With verbose output
.\quick-clean.ps1 -Verbose

# Using npm script
npm run clean
```

### 2. Full Cleanup (`cleanup.ps1`)
**Comprehensive cleanup with multiple options**

#### Basic Usage
```powershell
# Show help and options
.\cleanup.ps1

# Clean everything (recommended for deep cleanup)
.\cleanup.ps1 -All

# Preview what would be cleaned (safe)
.\cleanup.ps1 -All -DryRun
```

#### Targeted Cleanup
```powershell
# Clean only cache directories
.\cleanup.ps1 -Cache
npm run clean:cache

# Clean only log and temporary files
.\cleanup.ps1 -Logs
npm run clean:logs

# Deep clean (build artifacts + dev files)
.\cleanup.ps1 -Deep
npm run clean:deep

# Clean node_modules and lock files
.\cleanup.ps1 -NodeModules
```

#### NPM Script Shortcuts
```bash
npm run clean           # Quick cleanup
npm run clean:cache     # Cache cleanup only
npm run clean:logs      # Logs cleanup only
npm run clean:deep      # Deep cleanup
npm run clean:all       # Full cleanup
npm run clean:dry-run   # Preview full cleanup
```

### 3. Scheduled Cleanup (`setup-scheduled-cleanup.ps1`)
**Automate cleanup with Windows Task Scheduler**

#### Setup Automatic Cleanup
```powershell
# Weekly cache cleanup at 2 AM (default)
.\setup-scheduled-cleanup.ps1

# Daily cache cleanup
.\setup-scheduled-cleanup.ps1 -Frequency Daily

# Weekly full cleanup at 3 AM
.\setup-scheduled-cleanup.ps1 -Frequency Weekly -Time "03:00" -CleanupLevel All

# Monthly deep cleanup
.\setup-scheduled-cleanup.ps1 -Frequency Monthly -CleanupLevel Deep
```

#### Manage Scheduled Tasks
```powershell
# View current scheduled tasks
.\setup-scheduled-cleanup.ps1

# Preview what would be scheduled
.\setup-scheduled-cleanup.ps1 -DryRun

# Remove scheduled cleanup
.\setup-scheduled-cleanup.ps1 -Remove
```

## 📊 What Gets Cleaned

### Build Artifacts
- `dist/` - Distribution files
- `build/` - Build output
- `out/` - Alternative output directory
- `app-extracted/` - Extracted application files
- `electron-dist/` - Electron distribution
- `release/` - Release builds

### Node.js/NPM
- `node_modules/` - Dependencies (with `-NodeModules` or `-All`)
- `package-lock.json` - Lock file (with `-NodeModules` or `-All`)
- `yarn.lock`, `pnpm-lock.yaml` - Alternative lock files
- `.npm/` - NPM cache
- `.yarn/` - Yarn cache
- `.pnpm-store/` - PNPM store
- `node_modules/.cache/` - Node modules cache

### Temporary Files
- `*.log` - Log files
- `*.tmp`, `*.temp` - Temporary files
- `Thumbs.db` - Windows thumbnails
- `desktop.ini` - Windows folder settings
- `.DS_Store` - macOS metadata

### Development Files
- `coverage/` - Test coverage reports
- `*.swp`, `*.swo` - Vim files
- `*~` - Editor backup files
- `.vscode/settings.json.bak` - VSCode backups

## 🛡️ Safety Features

### Dry Run Mode
Always test cleanup operations safely:
```powershell
.\cleanup.ps1 -All -DryRun
```

### Size Reporting
All scripts show how much space will be freed:
```
📁 Distribution directory (45.2 MB)
📁 Node modules (234.1 MB)
✨ Cleanup completed!
📊 Freed up 279.3 MB
```

### Error Handling
- Scripts continue on errors
- Failed operations are reported clearly
- No data loss on permission errors

## ⚡ Quick Reference

| Task | Command | Use Case |
|------|---------|----------|
| **Quick daily cleanup** | `npm run clean` | After development sessions |
| **Full project reset** | `npm run clean:all` | Before major changes |
| **Preview cleanup** | `npm run clean:dry-run` | Check what will be removed |
| **Cache cleanup only** | `npm run clean:cache` | Performance issues |
| **Setup automation** | `.\setup-scheduled-cleanup.ps1` | Set-and-forget maintenance |

## 🔧 Customization

All scripts can be modified to suit your needs:

1. **Add custom paths** - Edit the `$cleanupItems` arrays
2. **Change file patterns** - Modify the `$tempPatterns` arrays  
3. **Adjust scheduling** - Change frequency and cleanup levels
4. **Add new cleanup types** - Extend the parameter sets

## 💡 Best Practices

1. **Start with dry runs** to understand what will be cleaned
2. **Use quick cleanup daily** during active development
3. **Schedule weekly cache cleanup** to maintain performance
4. **Run full cleanup monthly** or before major releases
5. **Always backup important data** before deep cleaning

## 🚨 Important Notes

- **Node modules cleanup** requires `npm install` afterwards
- **Lock file removal** may change dependency versions
- **Scheduled tasks** require appropriate Windows permissions
- **Always commit changes** before running cleanup scripts

---

*Need help? Run any script without parameters to see detailed usage information.*

