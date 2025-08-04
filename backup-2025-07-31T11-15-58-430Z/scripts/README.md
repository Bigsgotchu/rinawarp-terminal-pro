# 🧰 Dev Tools - Lint & Fix Automation

This directory contains development utilities for batch renaming and ESLint autofix operations.

## 📁 Files

- `dev-tools.ps1` - Main PowerShell script for batch operations
- `fix-github-conflicts.ps1` - Simple script for github variable conflicts

## 🚀 Usage

### PowerShell Scripts (Direct)

```powershell
# Full cleanup (rename + lint)
.\scripts\dev-tools.ps1

# Just rename github variables
.\scripts\dev-tools.ps1 rename-github

# Just run ESLint autofix
.\scripts\dev-tools.ps1 lint-fix
```

### NPM Scripts (Recommended)

```bash
# Full cleanup (rename + lint)
npm run lint:full-clean

# Just rename github variables
npm run lint:rename-github

# Just run ESLint autofix
npm run lint:fix
```

## 🔧 What These Scripts Do

### `rename-github`
- Scans all `.js`, `.cjs`, `.mjs`, and `.ts` files
- Renames `const github` to `const githubApi`
- Prevents variable name conflicts with global `github` objects

### `lint-fix`
- Runs ESLint with autofix enabled
- Fixes all auto-fixable lint issues
- Uses your project's ESLint configuration

### `full-clean`
- Combines both operations above
- Rename conflicting variables first, then lint
- One-command solution for cleaning up your repo

## 🪼 Pre-Commit Automation

These scripts integrate with your existing husky + lint-staged setup. The `lint:full-clean` command can be added to your pre-commit hook for automatic cleanup.

## 🎯 Perfect For

- ✅ Fixing ESLint variable conflicts
- ✅ Batch renaming operations
- ✅ Automated code cleanup
- ✅ CI/CD pipeline integration
- ✅ Pre-commit hooks

Your repo will be smoother than a jellyfish in warm current! 🪼✨
