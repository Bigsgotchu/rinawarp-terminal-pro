# RinaWarp Terminal - Secrets Management Guide

## Overview

This guide provides comprehensive instructions for managing secrets and sensitive information securely in the RinaWarp Terminal project.

## Table of Contents

1. [Security Principles](#security-principles)
2. [Environment Variables](#environment-variables)
3. [Encryption Keys](#encryption-keys)
4. [Service Credentials](#service-credentials)
5. [Git Security](#git-security)
6. [Tools and Scripts](#tools-and-scripts)
7. [Best Practices](#best-practices)
8. [Emergency Response](#emergency-response)

## Security Principles

1. **Never commit secrets** - No passwords, API keys, or tokens in code
2. **Use environment variables** - All secrets should be in `.env` files
3. **Encrypt sensitive data** - Use proper encryption for stored secrets
4. **Rotate regularly** - Change credentials periodically
5. **Principle of least privilege** - Only grant necessary permissions

## Environment Variables

### Setting Up `.env` Files

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values:
   ```env
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_your_actual_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
   
   # Encryption Keys (generate with: npm run generate-keys)
   ENCRYPTION_KEY=your_32_byte_hex_key_here
   ENCRYPTION_SALT=your_unique_salt_here
   
   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_specific_password
   ```

### Environment-Specific Files

- `.env` - Default/development environment
- `.env.production` - Production environment
- `.env.staging` - Staging environment
- `.env.test` - Test environment

## Encryption Keys

### Generating Encryption Keys

Run the provided script to generate secure encryption keys:

```bash
npm run generate-keys
# or
node scripts/generate-encryption-keys.js
```

This will:
- Generate a 32-byte encryption key
- Generate a unique salt
- Optionally update your `.env` file

### Key Storage Best Practices

1. **Development**: Store in `.env` file (never commit)
2. **Production**: Use a secret management service:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

## Service Credentials

### Stripe

1. Get your keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Use test keys for development:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
3. Use live keys for production (store securely)

### SendGrid

1. Generate API key from [SendGrid Settings](https://app.sendgrid.com/settings/api_keys)
2. Set in environment:
   ```env
   SENDGRID_API_KEY=SG.actual_key_here
   ```

### SMTP Configuration

For Gmail:
1. Enable 2-factor authentication
2. Generate app-specific password
3. Configure:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

## Git Security

### Pre-commit Hook

A pre-commit hook is installed to prevent accidental commits of secrets:

```bash
# The hook is automatically installed at:
.git/hooks/pre-commit

# To bypass in emergencies (use with caution):
git commit --no-verify
```

### Cleaning Git History

If secrets were accidentally committed:

1. **Using BFG Repo Cleaner** (recommended):
   ```bash
   # Install BFG (requires Java)
   brew install bfg  # macOS
   
   # Create a backup
   git clone --mirror git@github.com:user/repo.git repo-backup.git
   
   # Remove secrets
   bfg --delete-files .env repo.git
   bfg --replace-text passwords.txt repo.git
   
   # Clean and push
   cd repo.git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

2. **Using git-filter-branch**:
   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch path/to/secret/file' \
     --prune-empty --tag-name-filter cat -- --all
   ```

### `.gitignore` Configuration

Ensure these entries are in `.gitignore`:
```gitignore
# Environment files
.env
.env.*
!.env.example

# Config files with secrets
config/ai-providers.json
config/secrets.json

# Temporary files
*.tmp
*.log

# IDE
.vscode/settings.json
.idea/
```

## Tools and Scripts

### 1. Generate Encryption Keys
```bash
node scripts/generate-encryption-keys.js
```

### 2. Scan for Secrets
```bash
node scripts/scan-secrets.js
```

### 3. Security Check
```bash
./scripts/security-check.sh
```

### 4. Add API Keys Securely
```bash
node add-api-key.js
```

## Best Practices

### Development

1. **Use placeholder values** in committed files
2. **Document required variables** in `.env.example`
3. **Use mock services** when possible
4. **Never log sensitive values**

### Code Patterns

❌ **BAD**:
```javascript
const apiKey = "sk_test_1234567890";
const password = "mypassword123";
```

✅ **GOOD**:
```javascript
const apiKey = process.env.STRIPE_SECRET_KEY;
const password = process.env.DB_PASSWORD;

if (!apiKey) {
  throw new Error('STRIPE_SECRET_KEY not configured');
}
```

### Testing

1. Use separate test credentials
2. Mock external services in tests
3. Never use production credentials in tests

### Deployment

1. **Use environment variables** in deployment platform
2. **Encrypt secrets at rest**
3. **Use secure communication** (HTTPS/TLS)
4. **Limit access** to production secrets
5. **Audit access** regularly

## Emergency Response

### If Secrets Are Exposed

1. **Immediately rotate** all affected credentials
2. **Check logs** for unauthorized access
3. **Notify** affected services/users if necessary
4. **Clean git history** if committed
5. **Update** security measures

### Credential Rotation Checklist

- [ ] Generate new credentials
- [ ] Update in all environments
- [ ] Test new credentials
- [ ] Revoke old credentials
- [ ] Update documentation
- [ ] Notify team members

## Security Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Git Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [12 Factor App - Config](https://12factor.net/config)

## Questions or Issues?

If you have questions about secrets management or discover a security issue:

1. **Do not** create a public issue
2. Contact the security team privately
3. Follow responsible disclosure practices

---

Remember: **Security is everyone's responsibility!**
