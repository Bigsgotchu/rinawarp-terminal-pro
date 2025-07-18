# 🚀 RinaWarp Terminal Deployment Setup Guide

This guide will help you configure the GitHub secrets and environments needed for your CI/CD pipeline to work perfectly.

## 🔐 Required GitHub Secrets

Navigate to your repository → Settings → Secrets and variables → Actions

### Core Secrets
| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `VERCEL_TOKEN` | Vercel deployment token | [Vercel Account Settings](https://vercel.com/account/tokens) → Create Token |
| `VERCEL_ORG_ID` | Your Vercel organization ID | Run `vercel link` in your project, then check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | Same as above - found in `.vercel/project.json` |

### Optional Secrets
| Secret Name | Description | When Needed |
|-------------|-------------|-------------|
| `FIREBASE_TOKEN` | Firebase deployment token | If using Firebase functions/hosting |
| `RAILWAY_TOKEN` | Railway deployment token | If syncing with Railway |

## 🌐 GitHub Environments Setup

### 1. Create Preview Environment
1. Go to Settings → Environments
2. Click "New environment"
3. Name: `preview`
4. Add protection rules (optional):
   - ✅ Required reviewers (for manual approval)
   - ✅ Wait timer (delay deployments)

### 2. Create Production Environment
1. Name: `production`
2. Add protection rules (recommended):
   - ✅ Required reviewers
   - ✅ Restrict to protected branches (`main`, `v*` tags)
   - ✅ Wait timer: 5 minutes

## 🔧 Vercel Project Setup

### 1. Link Your Project
```bash
# In your project directory
vercel link
```

### 2. Configure Build Settings
In your Vercel dashboard:
- **Build Command**: `npm run build`
- **Output Directory**: `dist` (or `.next` for Next.js)
- **Install Command**: `npm ci`

### 3. Environment Variables
Add these in Vercel dashboard → Project Settings → Environment Variables:
- `NEXT_PUBLIC_ENV` → `production` (for production)
- `NEXT_PUBLIC_ENV` → `preview` (for preview)

## 🧪 Testing Your Setup

### 1. Test Preview Deploy
```bash
# Create a feature branch
git checkout -b feature/test-deploy
git push origin feature/test-deploy
```

### 2. Test Production Deploy
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

## 📊 Expected Workflow Behavior

### On Feature Branch Push
- ✅ Builds and tests your code
- ✅ Deploys to preview environment
- ✅ Generates URL like: `rinawarp-feature-test-deploy.vercel.app`

### On Pull Request
- ✅ All of the above
- ✅ Comments on PR with preview URL
- ✅ URL format: `rinawarp-pr-123.vercel.app`

### On Version Tag Push
- ✅ Builds and tests your code
- ✅ Deploys to production environment
- ✅ Available at: `rinawarptech.com`
- ✅ API endpoints: `api.rinawarp-terminal.com`

## 🔍 Troubleshooting

### Common Issues

**❌ "VERCEL_TOKEN not found"**
- Ensure you've added the token to GitHub Secrets
- Check token permissions in Vercel dashboard

**❌ "Project not found"**
- Run `vercel link` to connect your project
- Verify `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct

**❌ "Build failed"**
- Check your `package.json` has `build` and `test` scripts
- Verify Node.js version compatibility

**❌ "Environment protection rules blocking deploy"**
- Check GitHub Environments settings
- Ensure you have proper permissions

### Debug Commands
```bash
# Check Vercel project info
vercel --debug

# List your deployments
vercel list

# Check project settings
cat .vercel/project.json
```

## 🎯 Next Steps

1. **Set up secrets** using the table above
2. **Configure environments** for better deployment control
3. **Test the pipeline** with a feature branch
4. **Create your first release** with a version tag
5. **Monitor deployments** in GitHub Actions and Vercel dashboard

## 🌊 Advanced Features

### Custom Domain Setup
```bash
# Add custom domain in Vercel
vercel domains add your-domain.com
```

### Deployment Notifications
Add Slack/Discord webhooks in GitHub repository settings → Webhooks

### Performance Monitoring
- Enable Vercel Analytics
- Set up error tracking with Sentry
- Configure performance budgets

---

🧜‍♀️ **Ready to deploy some terminal magic?** ✨

Your CI/CD pipeline is now configured to automatically:
- 🔄 Deploy every feature branch for testing
- 🚀 Release tagged versions to production
- 🔐 Manage secrets securely across environments
- 📊 Provide detailed deployment summaries

Happy surfing the deployment waves! 🏄‍♀️🌊
