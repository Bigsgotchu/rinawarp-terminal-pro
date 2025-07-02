# GitHub Actions CI/CD Workflows

This directory contains the automated CI/CD workflows for RinaWarp Terminal. The workflows are designed to ensure code quality, security, and reliable deployments.

## Workflow Overview

### 🔄 Main Pipeline: `ci-cd.yml`
The orchestrating workflow that runs all quality gates and deployment processes in the correct order.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Flow:**
1. **Quality Gates** (run in parallel):
   - Linting
   - Testing  
   - Security checks
2. **Build & Deploy** (only after quality gates pass)
3. **Status Report**

### 🧹 Linting: `lint.yml` 
Ensures code quality and consistency.

**What it does:**
- Runs `eslint .` to check for code issues
- Validates code formatting with Prettier
- Provides clear error messages for failures

**Commands used:**
- `eslint .`
- `npm run format:check`

### 🧪 Testing: `test.yml`
Runs the test suite and generates coverage reports.

**What it does:**
- Executes `npm test`
- Generates test coverage reports
- Uploads coverage artifacts for review
- Provides detailed failure reporting

**Commands used:**
- `npm test`
- `npm test -- --coverage --watchAll=false`

### 🔒 Security: `security.yml`
Comprehensive security and vulnerability scanning.

**What it does:**
- Runs `npm run security:check` (audit + security lint)
- Scans for vulnerable dependencies with Retire.js
- Checks for secrets in code with TruffleHog
- Analyzes dependencies and package sizes
- Scheduled daily runs at 2 AM UTC

**Commands used:**
- `npm run security:check`
- `npm outdated`
- `retire --path . --outputformat json`
- `npx eslint . --config .eslintrc.security.json`

### 🚀 Build & Deploy: `build-deploy.yml`
Multi-platform builds and deployment automation.

**What it does:**
- Builds for Linux, Windows, and macOS
- Code signing support (when secrets are configured)
- Preview deployments for PRs
- Automatic releases for tags
- Artifact management

**Commands used:**
- `npm run build:linux`
- `npm run build:win` 
- `npm run build:mac`

## Status Badges

Add these badges to your README.md to show workflow status:

```markdown
[![CI/CD Pipeline](https://github.com/Bigsgotchu/rinawarp-terminal/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Bigsgotchu/rinawarp-terminal/actions/workflows/ci-cd.yml)
[![Lint](https://github.com/Bigsgotchu/rinawarp-terminal/actions/workflows/lint.yml/badge.svg)](https://github.com/Bigsgotchu/rinawarp-terminal/actions/workflows/lint.yml)
[![Test](https://github.com/Bigsgotchu/rinawarp-terminal/actions/workflows/test.yml/badge.svg)](https://github.com/Bigsgotchu/rinawarp-terminal/actions/workflows/test.yml)
[![Security](https://github.com/Bigsgotchu/rinawarp-terminal/actions/workflows/security.yml/badge.svg)](https://github.com/Bigsgotchu/rinawarp-terminal/actions/workflows/security.yml)
```

## Required Secrets (Optional)

For advanced features, configure these secrets in your repository settings:

### Code Signing
- `CSC_LINK`: Certificate file for Windows/macOS code signing
- `CSC_KEY_PASSWORD`: Password for the certificate

### macOS Notarization  
- `APPLE_ID`: Apple ID for notarization
- `APPLE_ID_PASS`: App-specific password for Apple ID

## Workflow Features

### ✅ Quality Gates
- **Fail Fast**: Build only runs if all quality checks pass
- **Parallel Execution**: Lint, test, and security run simultaneously
- **Clear Reporting**: Detailed error messages for quick debugging

### 🔄 Smart Triggers
- **PR Builds**: Generate preview builds for testing
- **Main Branch**: Deploy to production
- **Tags**: Create GitHub releases automatically
- **Scheduled Security**: Daily vulnerability scans

### 📊 Artifacts & Reports
- **Build Artifacts**: Cross-platform binaries (30-day retention)
- **Test Coverage**: Coverage reports for analysis
- **Security Reports**: Vulnerability and audit reports
- **Dependency Analysis**: Package size and dependency reports

### 🚦 Status Reporting
- **PR Comments**: Automatic preview build notifications
- **Failure Notifications**: Clear error messages with remediation steps
- **Success Confirmations**: Confirmation of successful deployments

## Local Development

Run the same checks locally before pushing:

```bash
# Lint code
npm run lint

# Run tests  
npm test

# Security checks
npm run security:check

# Build locally
npm run build:linux    # Linux
npm run build:win      # Windows  
npm run build:mac      # macOS
```

## Troubleshooting

### Common Issues

1. **Lint Failures**: Run `npm run format` to auto-fix formatting issues
2. **Test Failures**: Check test output and run `npm test` locally
3. **Security Issues**: Run `npm audit fix` to resolve some vulnerabilities
4. **Build Failures**: Ensure all dependencies are properly installed

### Getting Help

- Check the [Actions tab](https://github.com/Bigsgotchu/rinawarp-terminal/actions) for detailed logs
- Review artifact downloads for build outputs
- Examine security reports for vulnerability details

## Workflow Maintenance

These workflows are designed to be:
- **Self-documenting**: Clear step names and error messages
- **Maintainable**: Modular design with reusable components
- **Scalable**: Easy to add new quality gates or deployment targets
- **Secure**: Secret management and artifact handling best practices
