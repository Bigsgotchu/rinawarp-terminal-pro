# 🔒 Workflow Security Best Practices Guide

This document outlines the security best practices implemented in our GitHub Actions workflows and provides guidance for maintaining secure CI/CD pipelines.

## 📋 Table of Contents

- [Secrets Management](#secrets-management)
- [Permissions Restrictions](#permissions-restrictions)
- [Artifact Security](#artifact-security)
- [Workflow Triggers](#workflow-triggers)
- [File Security](#file-security)
- [Security Monitoring](#security-monitoring)

## 🔐 Secrets Management

### ✅ Proper Secret Usage

**Always use the proper GitHub Actions secrets syntax:**

```yaml
# ✅ CORRECT - Using secrets properly
env:
  API_KEY: ${{ secrets.API_KEY }}
  DB_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
  SIGNING_CERT: ${{ secrets.CODE_SIGNING_CERTIFICATE }}
```

```yaml
# ❌ WRONG - Hardcoded secrets
env:
  API_KEY: "sk-1234567890abcdef"  # Never do this!
  DB_PASSWORD: "mypassword123"    # Never do this!
```

### 🛡️ Environment-Specific Secrets

Use different secrets for different environments:

```yaml
# Production secrets
- PROD_API_KEY
- PROD_DATABASE_URL
- PROD_SIGNING_CERTIFICATE

# Staging secrets  
- STAGING_API_KEY
- STAGING_DATABASE_URL

# Development secrets (if needed)
- DEV_API_KEY
```

### 🔄 Secret Rotation

- Rotate secrets regularly (quarterly minimum)
- Use GitHub's secret scanning to detect exposed secrets
- Monitor secret usage in workflow runs
- Remove unused secrets immediately

## 🛡️ Permissions Restrictions

### 📊 Workflow-Level Permissions

All workflows now include restrictive permissions blocks:

```yaml
# Minimal permissions example
permissions:
  contents: read
  actions: read

# Specific job permissions example  
permissions:
  contents: read
  actions: read
  checks: write
  pull-requests: write
  packages: write
  security-events: write  # Only for security workflows
```

### 🎯 Job-Level Permissions

For jobs requiring elevated permissions:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    # Override workflow permissions for this specific job
    permissions:
      contents: write  # Only for release creation
      packages: write  # Only for package publishing
    steps:
      # ... deployment steps
```

### 🚫 Forbidden Permissions

Never grant these permissions unless absolutely necessary:

- `write-all` or `*`
- `admin` level access
- `secrets` access (GitHub doesn't allow this anyway)

## 📦 Artifact Security

### 🎯 Restricted Artifact Access

Artifacts are now restricted to specific job types:

```yaml
# ✅ ALLOWED - Build and release jobs can upload artifacts
- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  # Only in build/release jobs

# ❌ RESTRICTED - Other jobs cannot access artifacts unnecessarily
# Lint, test, and security jobs have minimal artifact access
```

### ⏰ Artifact Retention

Different retention periods based on artifact type:

- **Test results**: 7 days
- **Security reports**: 14 days  
- **Coverage reports**: 7 days
- **Build artifacts**: 14 days (7 days for nightly)
- **Quick build artifacts**: 7 days

### 🧹 Automatic Cleanup

The `cleanup-artifacts.yml` workflow automatically removes old artifacts to:

- Prevent storage quota issues
- Reduce security exposure of old builds
- Maintain clean artifact storage

## ⚡ Workflow Triggers

### 🎯 Secure Trigger Configuration

```yaml
# ✅ SECURE - Only specific branches and events
on:
  push:
    branches: [ main ]  # Only main branch for production
  pull_request:
    branches: [ main, develop ]  # PRs for validation only
  schedule:
    - cron: '0 2 * * *'  # Automated schedules only

# ❌ INSECURE - Removed for security
# workflow_dispatch:  # Manual triggers removed to prevent abuse
```

### 🚫 Removed Manual Triggers

Manual workflow triggers (`workflow_dispatch`) have been removed from:

- Production deployment workflows
- Artifact cleanup workflows  
- Security scanning workflows

This prevents unauthorized executions and maintains audit trails.

### 🔒 Branch Protection

Only these branches can trigger production deployments:

- `main` - Production releases
- Version tags (`v*.*.*`) - Official releases

## 📁 File Security

### 🛡️ Enhanced .gitignore

Our `.gitignore` now includes comprehensive patterns for:

```bash
# Certificates and signing keys
*.p12
*.pfx  
*.pem
*.crt
*.cer
*.key
private-key*
code-signing*

# Service account files
service-account*.json
gcloud-service-key.json
aws-credentials*.json

# SSH and GPG keys
id_rsa*
*.gpg
*.asc

# Environment files
.env*
!.env.example
!.env.template
```

### 📋 File Validation

Automated checks ensure:

- No hardcoded secrets in source code
- No production certificates committed
- No sensitive environment files tracked
- Proper `.gitignore` coverage

## 🔍 Security Monitoring

### 🛡️ Automated Security Scans

Multiple security scans run automatically:

1. **TruffleHog** - Secrets detection
2. **CodeQL** - Code security analysis  
3. **npm audit** - Dependency vulnerabilities
4. **Custom scripts** - Workflow security validation

### 📊 Security Reporting

Security scan results are:

- Uploaded as artifacts (14-day retention)
- Reported in workflow summaries
- Used to fail builds if critical issues found

### 🚨 Incident Response

When security issues are detected:

1. **Immediate** - Workflow fails to prevent deployment
2. **Notification** - Security team alerted via GitHub issues
3. **Investigation** - Review and remediation required
4. **Documentation** - Update this guide with lessons learned

## 🎯 Implementation Checklist

### ✅ For New Workflows

- [ ] Add restrictive `permissions:` block
- [ ] Use only `${{ secrets.SECRET_NAME }}` syntax
- [ ] Remove `workflow_dispatch` triggers
- [ ] Limit branch triggers to `main` and version tags
- [ ] Set appropriate artifact retention periods
- [ ] Include security validation steps

### ✅ For Existing Workflows

- [ ] Review and restrict permissions
- [ ] Audit secret usage patterns
- [ ] Remove manual trigger capabilities
- [ ] Update artifact handling
- [ ] Add security scan integration

### ✅ For Secret Management

- [ ] Rotate all production secrets
- [ ] Remove unused secrets from repository settings
- [ ] Document secret purposes and owners
- [ ] Set up secret expiration reminders
- [ ] Enable GitHub secret scanning

## 📚 Additional Resources

- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Managing encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Workflow Security Best Practices](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/)

## 🆘 Getting Help

If you need assistance with workflow security:

1. Review this guide thoroughly
2. Check existing workflow implementations for examples
3. Consult the security team for sensitive operations
4. Test changes in development branches first

---

**Remember**: Security is everyone's responsibility. When in doubt, choose the more restrictive option and consult the security team.

*Last updated: December 2024*
