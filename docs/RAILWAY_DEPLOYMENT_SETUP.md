# 🚀 RinaWarp Terminal Railway Deployment Setup Guide

This guide covers the complete deployment setup using Railway.

## 🔐 Required Environment Variables

Navigate to your Railway project → Variables tab

### Core Variables
| Variable Name | Description | Required |
|--------------|-------------|----------|
| `NODE_ENV` | Set to `production` | ✅ |
| `PORT` | Auto-set by Railway | ✅ |
| `STRIPE_SECRET_KEY` | Your Stripe secret key | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ✅ |
| `STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key | ✅ |
| `SENDGRID_API_KEY` | SendGrid API key for emails | Optional |

### Stripe Price IDs
| Variable Name | Description |
|--------------|-------------|
| `STRIPE_PRICE_PERSONAL_MONTHLY` | Personal plan monthly price ID |
| `STRIPE_PRICE_PERSONAL_YEARLY` | Personal plan yearly price ID |
| `STRIPE_PRICE_PROFESSIONAL_MONTHLY` | Professional plan monthly price ID |
| `STRIPE_PRICE_PROFESSIONAL_YEARLY` | Professional plan yearly price ID |
| `STRIPE_PRICE_TEAM_MONTHLY` | Team plan monthly price ID |
| `STRIPE_PRICE_TEAM_YEARLY` | Team plan yearly price ID |

## 🔧 Railway Project Setup

### 1. Connect Your Repository
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link your project
railway link
```

### 2. Deploy to Railway
```bash
# Deploy current directory
railway up

# Or use GitHub integration for auto-deploy
```

### 3. Custom Domain Configuration
In Railway dashboard:
1. Go to Settings → Domains
2. Add custom domain: `rinawarptech.com`
3. Update DNS records as shown by Railway

## 🧪 Testing Your Deployment

### 1. Test Local Development
```bash
# Run locally with Railway environment
railway run npm start
```

### 2. Test Production Deploy
```bash
# Deploy to production
railway up

# Check deployment logs
railway logs
```

## 📊 Deployment Workflow

### Automatic Deployments
Railway automatically deploys when:
- ✅ Code pushed to main branch
- ✅ Pull request merged
- ✅ Manual trigger via CLI or dashboard

### Environment Management
- **Production**: Connected to main branch
- **Preview**: Auto-created for PRs
- **Development**: Use `railway run` locally

## 🔍 Monitoring & Debugging

### View Logs
```bash
# Stream live logs
railway logs --tail

# View recent logs
railway logs
```

### Check Status
```bash
# View deployment status
railway status

# List all deployments
railway deployments
```

### Environment Variables
```bash
# List all variables
railway variables

# Set a variable
railway variables set KEY=value
```

## 🎯 CI/CD with GitHub Actions

### Basic Railway Deploy Action
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - uses: berviantoleo/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

## 🌊 Advanced Features

### Database Setup
```bash
# Add PostgreSQL to your project
railway add postgresql

# Connect to database
railway connect postgresql
```

### Custom Start Command
In `package.json`:
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

### Health Checks
Railway automatically monitors:
- Application uptime
- Resource usage
- Response times

## 📱 Mobile & API Access

### API Endpoints
All APIs available at:
- Production: `https://rinawarptech.com/api/*`
- Health check: `https://rinawarptech.com/health`

### CORS Configuration
Already configured for:
- `https://rinawarptech.com`
- Local development origins

---

🧜‍♀️ **Your Railway deployment is configured!** ✨

Key features enabled:
- 🔄 Automatic deployments from GitHub
- 🌐 Custom domain with SSL
- 📊 Built-in monitoring and logs
- 🚀 Zero-downtime deployments
- 🔐 Secure environment variables

Happy deploying! 🚂🌊
