# Private Repository Authentication Configuration

This document outlines the authentication setup for CI/CD pipelines to ensure secure access to the private RinaWarp Terminal repository and its dependencies.

## 🔐 Required Secrets

### GitHub Repository Secrets
Configure these secrets in **Settings → Secrets and variables → Actions**:

#### Core Authentication
- `GH_TOKEN` - GitHub Personal Access Token with repository access
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions (fallback)
- `NPM_TOKEN` - NPM authentication token for private packages
- `NODE_AUTH_TOKEN` - Node.js authentication token (usually same as NPM_TOKEN)

#### Platform-Specific Secrets
- `VERCEL_TOKEN` - Vercel deployment authentication
- `VERCEL_ORG_ID` - Vercel organization identifier
- `VERCEL_PROJECT_ID` - Vercel project identifier
- `RAILWAY_TOKEN` - Railway deployment authentication
- `RAILWAY_PROJECT_ID` - Railway project identifier

#### Code Signing (Optional)
- `WINDOWS_CODESIGN_PASSWORD` - Windows code signing certificate password
- `MACOS_CERTIFICATE` - macOS code signing certificate
- `MACOS_CERTIFICATE_PASSWORD` - macOS certificate password
- `APPLE_ID` - Apple ID for notarization
- `APPLE_ID_PASSWORD` - Apple ID app-specific password
- `APPLE_TEAM_ID` - Apple Developer Team ID

## 🔧 Authentication Configuration

### 1. GitHub Actions Workflows

All workflows now include enhanced authentication:

```yaml
- name: Checkout code
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}
    submodules: recursive
```

### 2. Artifact Upload/Download

All artifact operations use authenticated tokens:

```yaml
- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: artifact-name
    path: ./path
  env:
    GITHUB_TOKEN: ${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}
```

### 3. NPM Dependencies

Private packages are authenticated via `.npmrc`:

```
@rinawarp:registry=https://npm.pkg.github.com/
@bigsgotchu:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

### 4. Docker Builds

Railway deployments include authentication:

```dockerfile
ARG GITHUB_TOKEN
ARG NODE_AUTH_TOKEN
ENV NODE_AUTH_TOKEN=${NODE_AUTH_TOKEN:-${GITHUB_TOKEN}}
RUN npm ci --only=production
```

## 🚀 Deployment Platforms

### Vercel
- Authenticates using `VERCEL_TOKEN`
- Syncs environment variables from Railway
- Builds and deploys documentation site

### Railway
- Authenticates using `RAILWAY_TOKEN`
- Handles Docker builds with private dependencies
- Provides backend API services

### GitHub Packages
- Uses `GH_TOKEN` for Electron app releases
- Publishes build artifacts to private repository
- Manages versioned releases

## 🔒 Security Best Practices

### Token Permissions
- Use fine-grained personal access tokens
- Limit scope to required repositories only
- Set appropriate expiration dates
- Regularly rotate authentication tokens

### Workflow Security
- All checkout actions use authenticated tokens
- Submodules are fetched recursively when needed
- Artifact operations include authentication
- No secrets are exposed in logs

### Environment Isolation
- Production deployments require manual approval
- Preview deployments use separate environment
- Secrets are environment-specific where possible

## 🔄 Maintenance Tasks

### Monthly
- [ ] Review and rotate authentication tokens
- [ ] Audit repository access permissions
- [ ] Update workflow dependencies
- [ ] Test deployment pipelines

### Weekly
- [ ] Monitor failed builds for auth issues
- [ ] Check artifact retention policies
- [ ] Verify secret availability across workflows

### As Needed
- [ ] Update authentication when team changes
- [ ] Reconfigure when adding new platforms
- [ ] Update documentation when processes change

## 🛠️ Troubleshooting

### Common Authentication Issues

#### Build Failures
1. Check if `GH_TOKEN` is properly configured
2. Verify token has required repository permissions
3. Ensure token hasn't expired

#### Artifact Upload Errors
1. Confirm `GITHUB_TOKEN` is available in workflow
2. Check repository permissions for Actions
3. Verify artifact size limits

#### NPM Installation Failures
1. Verify `NODE_AUTH_TOKEN` is set correctly
2. Check if private packages exist and are accessible
3. Confirm `.npmrc` configuration is correct

#### Deployment Issues
1. Validate platform-specific tokens (Vercel, Railway)
2. Check if environment variables are synced
3. Verify deployment permissions

### Debug Commands

Check authentication in workflows:
```bash
# Verify GitHub CLI authentication
gh auth status

# Test NPM authentication
npm whoami --registry=https://npm.pkg.github.com/

# Validate token permissions
gh api user
```

## 📞 Support

For authentication issues:
1. Check this documentation first
2. Review workflow logs for specific errors
3. Verify all required secrets are configured
4. Contact repository administrators for token issues

---

**Last Updated**: $(date)
**Next Review**: $(date -d "+1 month")
