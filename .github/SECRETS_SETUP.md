# 🔒 GitHub Tokens and Secrets Setup Guide

This comprehensive guide will help you regenerate your GitHub token with appropriate fine-grained permissions and set up all required repository secrets for the RinaWarp Terminal private enterprise repository.

## 📋 Prerequisites

- Access to the `Bigsgotchu/rinawarp-terminal` repository
- Administrator permissions on the repository
- GitHub CLI (`gh`) installed and authenticated

## 🔐 Step 1: Generate New GitHub Token with Fine-Grained Permissions

### Required Token Permissions

1. **Go to GitHub Token Settings:**
   - Visit: https://github.com/settings/tokens?type=beta
   - Click "Generate new token" → "Fine-grained personal access token"

2. **Configure Token:**
   - **Name:** `RinaWarp Terminal CI/CD Token`
   - **Expiration:** 90 days (recommended for security)
   - **Repository access:** Selected repositories → `Bigsgotchu/rinawarp-terminal`

3. **Repository Permissions:**
   ```
   ✅ Actions: Write
   ✅ Checks: Write  
   ✅ Contents: Write
   ✅ Issues: Write
   ✅ Metadata: Read
   ✅ Packages: Write
   ✅ Pull requests: Write
   ✅ Security events: Write
   ✅ Secrets: Write (if managing org secrets)
   ```

4. **Organization Permissions (if applicable):**
   ```
   ✅ Members: Read
   ✅ Secrets: Write
   ```

## 🔐 Required Secrets

### 🚀 Core Deployment Secrets (Required)

#### `VERCEL_TOKEN` (Required)
- **Type**: Repository Secret
- **Description**: Vercel API token for deployments
- **Usage**: Used in `deploy-vercel.yml` for Vercel deployments
- **Format**: String
- **How to get**: Vercel Dashboard → Settings → Tokens
- **Example**: `vercel_token_abc123...`

#### `VERCEL_ORG_ID` (Required)
- **Type**: Repository Secret
- **Description**: Vercel organization ID
- **Usage**: Used in `deploy-vercel.yml` for project identification
- **Format**: String
- **How to get**: Vercel project settings → General
- **Example**: `team_abc123def456`

#### `VERCEL_PROJECT_ID` (Required)
- **Type**: Repository Secret
- **Description**: Vercel project ID for rinawarp-terminal
- **Usage**: Used in `deploy-vercel.yml` for deployment targeting
- **Format**: String
- **How to get**: Vercel project settings → General
- **Example**: `prj_abc123def456ghi789`

#### `RAILWAY_TOKEN` (Required)
- **Type**: Repository Secret
- **Description**: Railway API token for deployments
- **Usage**: Used in `deploy-vercel.yml` for Railway variable syncing
- **Format**: String
- **How to get**: Railway Dashboard → Account Settings → Tokens
- **Example**: `railway_token_xyz789...`

#### `RAILWAY_PROJECT_ID` (Required)
- **Type**: Repository Secret
- **Description**: Railway project ID
- **Usage**: Used in `deploy-vercel.yml` for project linking
- **Format**: String
- **How to get**: Railway project URL or settings
- **Example**: `proj_abc123def456`

### 🔏 Code Signing Secrets

#### `WINDOWS_CODESIGN_PASSWORD` (Required)
- **Type**: Repository Secret
- **Description**: Password for Windows code signing certificate
- **Usage**: Used in `main-pipeline.yml` for signing Windows executables
- **Format**: String (minimum 8 characters recommended)
- **Example**: `MySecurePassword123!`

### 📦 Publishing Secrets

#### `NPM_TOKEN` (Optional)
- **Type**: Repository Secret
- **Description**: NPM token for package publishing
- **Usage**: For future npm package publishing if needed
- **Format**: String
- **How to get**: npm.com → Access Tokens
- **Example**: `npm_token_abc123...`

### 🍎 macOS Code Signing (Future Use)

#### `MACOS_CERTIFICATE` (Optional)
- **Type**: Repository Secret
- **Description**: Base64 encoded macOS certificate (.p12)
- **Usage**: Future macOS code signing
- **Format**: Base64 string
- **How to get**: Apple Developer Account → Certificates

#### `MACOS_CERTIFICATE_PASSWORD` (Optional)
- **Type**: Repository Secret
- **Description**: Password for macOS certificate
- **Usage**: Future macOS code signing
- **Format**: String

#### `APPLE_ID` (Optional)
- **Type**: Repository Secret
- **Description**: Apple ID for notarization
- **Usage**: Future macOS notarization
- **Format**: Email address

#### `APPLE_ID_PASSWORD` (Optional)
- **Type**: Repository Secret
- **Description**: App-specific password for Apple ID
- **Usage**: Future macOS notarization
- **Format**: String

#### `APPLE_TEAM_ID` (Optional)
- **Type**: Repository Secret
- **Description**: Apple Team ID
- **Usage**: Future macOS code signing
- **Format**: String (10 characters)

### Optional Telemetry Secrets (for development environments)

#### Development Environment Secrets

The following secrets are used to populate development environment files and should be configured if you want to test telemetry features:

#### `SENTRY_DSN_DEV`
- **Type**: Repository Secret
- **Description**: Sentry DSN for development error tracking
- **Format**: `https://[key]@[orgId].ingest.sentry.io/[projectId]`
- **Example**: `https://abcd1234@o123456.ingest.sentry.io/654321`

#### `APPINSIGHTS_INSTRUMENTATIONKEY_DEV`
- **Type**: Repository Secret  
- **Description**: Azure Application Insights instrumentation key for development
- **Format**: GUID
- **Example**: `12345678-1234-1234-1234-123456789012`

#### `APPLICATIONINSIGHTS_CONNECTION_STRING_DEV`
- **Type**: Repository Secret
- **Description**: Azure Application Insights connection string for development
- **Format**: Connection string
- **Example**: `InstrumentationKey=12345678-1234-1234-1234-123456789012;IngestionEndpoint=https://region.in.applicationinsights.azure.com/`

#### `GA_MEASUREMENT_ID_DEV`
- **Type**: Repository Secret
- **Description**: Google Analytics 4 measurement ID for development
- **Format**: G-XXXXXXXXXX
- **Example**: `G-ABC123DEF4`

#### `GA_API_SECRET_DEV`
- **Type**: Repository Secret
- **Description**: Google Analytics 4 API secret for development
- **Format**: String
- **Example**: `abc123def456ghi789`

#### `TELEMETRY_ENDPOINT_DEV`
- **Type**: Repository Secret
- **Description**: Custom telemetry endpoint for development testing
- **Format**: URL
- **Example**: `https://telemetry-dev.example.com/api/events`

#### `TELEMETRY_API_KEY_DEV`
- **Type**: Repository Secret
- **Description**: API key for custom telemetry endpoint (development)
- **Format**: String
- **Example**: `dev-api-key-123456789`

#### `ANALYTICS_ENDPOINT_DEV`
- **Type**: Repository Secret
- **Description**: Custom analytics endpoint for development testing
- **Format**: URL
- **Example**: `https://analytics-dev.example.com/api/events`

#### `ANALYTICS_API_KEY_DEV`
- **Type**: Repository Secret
- **Description**: API key for custom analytics endpoint (development)
- **Format**: String
- **Example**: `dev-analytics-key-987654321`

## 🛠️ Step 2: Set Up Repository Secrets

### Method A: Using the PowerShell Setup Script (Recommended)

1. **Run the setup script:**
   ```powershell
   # Test run first (recommended)
   .\setup-secrets.ps1 -GitHubToken "your_new_token_here" -DryRun
   
   # Actual setup
   .\setup-secrets.ps1 -GitHubToken "your_new_token_here"
   ```

### Method B: GitHub CLI (Manual)

```powershell
# Set environment variable for GitHub token
$env:GH_TOKEN = "your_new_github_token_here"

# Core deployment secrets
gh secret set VERCEL_TOKEN --repo Bigsgotchu/rinawarp-terminal
gh secret set VERCEL_ORG_ID --repo Bigsgotchu/rinawarp-terminal  
gh secret set VERCEL_PROJECT_ID --repo Bigsgotchu/rinawarp-terminal
gh secret set RAILWAY_TOKEN --repo Bigsgotchu/rinawarp-terminal
gh secret set RAILWAY_PROJECT_ID --repo Bigsgotchu/rinawarp-terminal

# Code signing secrets
gh secret set WINDOWS_CODESIGN_PASSWORD --repo Bigsgotchu/rinawarp-terminal

# Publishing secrets (optional)
gh secret set NPM_TOKEN --repo Bigsgotchu/rinawarp-terminal

# List all secrets
gh secret list --repo Bigsgotchu/rinawarp-terminal
```

### Method C: GitHub Web Interface

1. Go to: https://github.com/Bigsgotchu/rinawarp-terminal/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret from the required list above

## 🔍 Step 3: Obtain Required Token Values

### Vercel Tokens

1. **Vercel Token:**
   - Go to: https://vercel.com/account/tokens
   - Create new token with scope: Full Account

2. **Vercel Org & Project IDs:**
   ```powershell
   # Install Vercel CLI if not already installed
   npm i -g vercel
   
   # Login and get project info
   vercel login
   vercel ls
   ```

### Railway Tokens

1. **Railway Token:**
   - Go to: https://railway.app/account/tokens
   - Create new token

2. **Railway Project ID:**
   ```powershell
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login and get project info
   railway login
   railway status
   ```

### NPM Token (Optional)

1. Go to: https://www.npmjs.com/settings/tokens
2. Generate new token with "Automation" scope

## ✅ Step 4: Verify Setup

### Test Token Permissions
```powershell
# Check if new token works
gh auth status

# List repository secrets
gh secret list --repo Bigsgotchu/rinawarp-terminal

# Test workflow trigger (creates a test PR)
gh pr create --title "Test: Verify CI/CD Setup" --body "Testing secrets and workflows"
```

### Monitor Workflows
1. Go to: https://github.com/Bigsgotchu/rinawarp-terminal/actions
2. Check that workflows run without secret-related errors
3. Verify deployments work correctly

## 🛡️ Step 5: Security Best Practices

### 1. Token Management
- ✅ Use fine-grained tokens with minimal required permissions
- ✅ Set reasonable expiration dates (30-90 days)
- ✅ Rotate tokens regularly
- ✅ Revoke unused tokens immediately

### 2. Secrets Management  
- ✅ Use environment-specific secrets for different deployment stages
- ✅ Never log or expose secret values
- ✅ Use secret scanning to detect accidental exposure
- ✅ Implement approval workflows for production deployments

### 3. Access Control
- ✅ Limit repository admin access
- ✅ Use branch protection rules
- ✅ Require signed commits for releases
- ✅ Enable audit logging

## 🚔 Emergency Procedures

### If Tokens Are Compromised
1. **Immediately revoke compromised tokens:**
   - GitHub: https://github.com/settings/tokens
   - Vercel: https://vercel.com/account/tokens
   - Railway: https://railway.app/account/tokens

2. **Generate new tokens with different names**

3. **Update repository secrets**

4. **Check audit logs for unauthorized access**

5. **Notify team members if applicable**

## 🛡️ Security Best Practices

### Secret Naming Convention
- Use `UPPER_SNAKE_CASE` for all secret names
- Include environment suffix for environment-specific secrets (`_DEV`, `_STAGING`, `_PROD`)
- Use descriptive names that indicate the secret's purpose

### Secret Management
- **Never commit secrets to repository**: All secrets should be stored in GitHub Actions secrets
- **Use separate secrets for different environments**: Don't reuse production secrets in development
- **Rotate secrets regularly**: Update secrets periodically, especially after team member changes
- **Principle of least privilege**: Only grant access to secrets that are actually needed
- **Use environment protection rules**: Protect production secrets with environment-specific rules

### Environment Files Security
- **Template approach**: Use placeholder syntax `{{SECRET_NAME}}` in committed environment files
- **Local development**: Copy `.env.example` to `.env` and populate with your own values
- **Never commit `.env` files**: Add all `.env*` files to `.gitignore` except `.env.example` and `.env.template`

## 📝 Development Setup

### For Local Development

1. Copy the environment template:
   ```bash
   cp .env.example .env.development.local
   ```

2. Replace all `{{SECRET_NAME}}` placeholders with actual values:
   ```bash
   # Instead of: SENTRY_DSN={{SENTRY_DSN_DEV}}
   # Use actual value: SENTRY_DSN=https://your-actual-key@your-org.ingest.sentry.io/your-project
   ```

3. **Never commit your local `.env*` files**

### Environment File Hierarchy

The application loads environment variables in this order (later values override earlier ones):

1. `.env.template` (committed, contains structure)
2. `.env.example` (committed, contains examples)
3. `.env.development` (committed, uses placeholders)
4. `.env.development.local` (local only, contains actual secrets)
5. Process environment variables
6. GitHub Actions secrets (in CI/CD)

## 🚨 Security Incident Response

If a secret is accidentally committed or exposed:

1. **Immediately rotate the secret** at the source (API provider, certificate authority, etc.)
2. **Update the GitHub Actions secret** with the new value
3. **Remove the secret from git history** using tools like `git-filter-branch` or BFG Repo-Cleaner
4. **Force push the cleaned history** (coordinate with team members)
5. **Review access logs** at the API provider to check for unauthorized usage
6. **Update any dependent systems** that might be using the old secret

## 📊 Secret Usage in Workflows

Secrets are automatically available in workflow runs as environment variables when referenced with the `${{ secrets.SECRET_NAME }}` syntax:

```yaml
steps:
  - name: Build with secrets
    env:
      SENTRY_DSN: ${{ secrets.SENTRY_DSN_DEV }}
      API_KEY: ${{ secrets.API_KEY }}
    run: npm run build
```

## 🔍 Auditing and Monitoring

### Regular Audits
- Review all configured secrets monthly
- Remove unused secrets
- Verify secret rotation schedules
- Check team member access

### Monitoring
- Monitor workflow logs for secret-related errors
- Set up alerts for failed secret retrievals
- Track secret usage in build logs (without exposing values)

## ❓ Troubleshooting

### Common Issues

1. **Secret not found error**:
   - Verify secret name matches exactly (case-sensitive)
   - Check if secret is set in the correct repository
   - Verify workflow has access to the secret

2. **Invalid secret format**:
   - Check secret format requirements for the specific service
   - Verify no extra whitespace or characters

3. **Secret masking in logs**:
   - GitHub automatically masks secret values in logs
   - Use `echo "::add-mask::your-secret"` to mask additional values

### Debug Commands

```yaml
# Check if secret is available (value will be masked in logs)
- name: Debug secret availability
  run: |
    if [ -z "${{ secrets.SECRET_NAME }}" ]; then
      echo "Secret not found"
    else
      echo "Secret is available"
    fi
```

## 📞 Support

For issues with this setup:
1. Check GitHub Actions logs for specific error messages
2. Verify token permissions match requirements
3. Ensure all required secrets are properly set
4. Test with a simple workflow first

## 🔗 Useful Links

- [GitHub Fine-grained Tokens Documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#creating-a-fine-grained-personal-access-token)
- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Railway CLI Documentation](https://docs.railway.app/develop/cli)
- [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/encrypted-secrets#using-encrypted-secrets-in-a-workflow)
