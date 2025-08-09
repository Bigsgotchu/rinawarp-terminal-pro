# 🧜‍♀️ RinaWarp Terminal - Development to Release Workflow

This document outlines how to get your local fixes and improvements integrated into official releases that benefit all RinaWarp users.

## 🌊 Quick Start

To push your fixes through to a release, simply run:

```bash
npm run workflow:release
```

This interactive script will guide you through the entire process from development to production release.

## 📋 Release Types

### 1. 🐛 Bug Fix (Patch Release)
- Increments version: `1.0.0` → `1.0.1`
- Use for: Bug fixes, security patches, small improvements
- Command: `npm run workflow:patch`

### 2. ✨ Feature (Minor Release)
- Increments version: `1.0.0` → `1.1.0`
- Use for: New features, enhancements, CLI improvements
- Command: `npm run workflow:minor`

### 3. 🚀 Major Update (Major Release)
- Increments version: `1.0.0` → `2.0.0`
- Use for: Breaking changes, major architecture updates
- Command: `npm run workflow:major`

### 4. 🧪 Beta Release
- Version becomes: `1.0.1-beta.0`
- Use for: Testing new features before full release
- Command: `npm run workflow:release` and select beta

## 🛠️ Manual Process

If you prefer to handle releases manually:

### 1. Prepare Your Changes
```bash
# Ensure all changes are committed
git status
git add .
git commit -m "Your improvement description"
```

### 2. Test Your Changes
```bash
# Run all tests
npm test

# Test CLI functionality specifically
npm run test:cli-ai

# Run linting
npm run lint
```

### 3. Build and Release
```bash
# For a patch release
npm version patch

# Create and push the release
git push origin main --tags
```

### 4. GitHub Actions Takes Over
Once you push tags to GitHub, the CI/CD pipeline automatically:
- Runs comprehensive tests across Node.js versions
- Performs security audits
- Builds distributables for all platforms
- Creates GitHub releases with changelogs
- Publishes to NPM (if configured)

## 🔧 CI/CD Pipeline

The automated pipeline includes:

### Testing Phase
- ✅ Tests across Node.js 18.x, 20.x, 22.x
- ✅ Linting and code quality checks
- ✅ CLI functionality validation
- ✅ Security vulnerability scanning

### Build Phase
- 🏗️ Production builds
- 📦 Cross-platform executables (Linux, Windows, macOS)
- 📁 Distribution packaging

### Release Phase (for tagged releases)
- 🚀 GitHub release creation
- 📝 Automatic changelog generation
- 📦 Artifact uploads
- 🌊 Mermaid-themed release notes

## 🚨 Prerequisites

### Required Tools
- **Node.js 20+**: For running the workflow
- **Git**: For version control
- **GitHub CLI** (optional): For automated release creation
  ```bash
  # Install GitHub CLI
  brew install gh  # macOS
  # or follow: https://cli.github.com/manual/installation
  ```

### Repository Setup
Ensure your repository has:
- ✅ GitHub Actions enabled
- ✅ Proper branch protection rules
- ✅ Release permissions configured
- ✅ NPM publishing tokens (if desired)

## 🎯 Best Practices

### Commit Messages
Use descriptive commit messages:
```bash
git commit -m "🐛 Fix AI response timeout in CLI mode"
git commit -m "✨ Add mermaid personality responses to fallback mode"
git commit -m "🔧 Improve error handling in llm-api-client"
```

### Testing Before Release
Always run the full test suite:
```bash
# Quick validation
npm run qa:full

# Comprehensive testing
npm test && npm run test:cli-ai && npm run lint
```

### Version Strategy
- **Patch**: Bug fixes, typos, small improvements
- **Minor**: New features, CLI enhancements, API additions
- **Major**: Breaking changes, architecture overhauls

## 🧜‍♀️ Example Workflow

Here's a typical development-to-release cycle:

```bash
# 1. Make your improvements
vim src/api/ai.js  # Your fixes here

# 2. Test locally
./bin/rina ask "Test my changes"
npm run test:cli-ai

# 3. Commit changes
git add .
git commit -m "🐛 Fix AI integration timeout issues"

# 4. Run release workflow
npm run workflow:patch

# 5. The script guides you through:
#    - Version bumping
#    - Testing
#    - Building
#    - Git tagging
#    - Pushing to GitHub
#    - Creating releases

# 6. GitHub Actions completes the release automatically
```

## 🌊 Verification

After a successful release:

1. **Check GitHub Releases**: https://github.com/Bigsgotchu/rinawarp-terminal-pro/releases
2. **Verify Build Artifacts**: Download and test the built executables
3. **Monitor CI/CD**: Ensure all pipeline steps completed successfully
4. **User Communication**: Announce the release to users

## 🆘 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs in GitHub Actions
# Retry with clean environment
npm run clean:all && npm install
```

#### Test Failures
```bash
# Run tests in verbose mode
npm test -- --verbose

# Check specific test failures
npm run test:cli-ai
```

#### GitHub Actions Issues
- Verify repository permissions
- Check GitHub secrets configuration
- Ensure branch protection rules allow releases

### Getting Help

1. **Check Logs**: GitHub Actions provide detailed logs
2. **Test Locally**: Use `npm run workflow:release` to debug
3. **Manual Steps**: Fall back to manual versioning if needed

## 🎉 Success Metrics

A successful release should:
- ✅ Pass all automated tests
- ✅ Build successfully for all platforms
- ✅ Create proper GitHub release
- ✅ Generate meaningful changelog
- ✅ Maintain mermaid personality throughout
- ✅ Be available for all RinaWarp users

---

*May your releases flow like gentle tides, bringing improvements to all who sail these digital seas! 🌊✨*

## 📚 Additional Resources

- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Electron Builder](https://www.electron.build/)
- [NPM Publishing Guide](https://docs.npmjs.com/cli/v8/commands/npm-publish)
