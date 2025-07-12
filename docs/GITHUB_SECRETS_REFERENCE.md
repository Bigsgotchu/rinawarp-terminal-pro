# 🔐 GitHub Secrets - Your Project Values

## Required Secrets for RinaWarp Terminal

Add these to your GitHub repository: **Settings → Secrets and variables → Actions**

### Core Secrets
| Secret Name | Your Value | Status |
|-------------|------------|--------|
| `VERCEL_TOKEN` | `{{YOUR_VERCEL_TOKEN}}` | ⏳ Get from [Vercel Account Settings](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `team_tjMjOqaKGVtAo5hUFbXVRpaC` | ✅ Retrieved from project |
| `VERCEL_PROJECT_ID` | `prj_cbSBHkl6Gt4hZdsdvXktOcVRPSvo` | ✅ Retrieved from project |

### Optional Secrets
| Secret Name | Your Value | When Needed |
|-------------|------------|-------------|
| `FIREBASE_TOKEN` | `{{YOUR_FIREBASE_TOKEN}}` | If using Firebase |
| `RAILWAY_TOKEN` | `{{YOUR_RAILWAY_TOKEN}}` | If syncing with Railway |

## ⚡ Quick Setup Steps

1. **Get your Vercel Token**:
   - Go to [Vercel Account Settings](https://vercel.com/account/tokens)
   - Click "Create Token"
   - Give it a name like "GitHub Actions - RinaWarp"
   - Copy the token value

2. **Add to GitHub Secrets**:
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add each secret from the table above

3. **Test the setup**:
   - The ORG_ID and PROJECT_ID are already correct for your project
   - Once you add the VERCEL_TOKEN, your pipeline will be ready!

---
🧜‍♀️ **Your project is linked and ready for deployment magic!** ✨
