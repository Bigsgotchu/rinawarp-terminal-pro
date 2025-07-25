# Railway Deployment Guide for RinaWarp Terminal

This guide walks you through deploying RinaWarp Terminal to Railway, a modern cloud platform for deploying applications.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install the Railway CLI tool
3. **Environment Variables**: Prepare your production environment variables
4. **Domain** (Optional): Custom domain for your application

## 1. Install Railway CLI

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Login to Railway
railway login
```

## 2. Initialize Railway Project

```bash
# In your project directory
railway init

# Link to existing Railway project (if you have one)
railway link [project-id]
```

## 3. Configure Environment Variables

### Option A: Using Railway Dashboard
1. Go to your Railway dashboard
2. Select your project
3. Go to Variables tab
4. Add the following variables:

### Option B: Using Railway CLI
```bash
# Set environment variables via CLI
railway variables set NODE_ENV=production
railway variables set STRIPE_SECRET_KEY=sk_live_your_key
railway variables set STRIPE_PUBLISHABLE_KEY=pk_live_your_key
# ... add all other variables
```

### Required Environment Variables

```env
# Core Configuration
NODE_ENV=production
APP_VERSION=1.1.0-beta.1
LOG_LEVEL=info

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_PERSONAL=price_your_personal_plan_id
STRIPE_PRICE_PROFESSIONAL=price_your_professional_plan_id
STRIPE_PRICE_TEAM=price_your_team_plan_id

# Email Configuration (Choose SendGrid for Railway)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Security
ENCRYPTION_KEY=your_32_byte_hex_key
JWT_SECRET=your_jwt_secret

# Feature Flags
ENABLE_CLOUD_SYNC=false
ENABLE_ANALYTICS=true
ENABLE_TELEMETRY=true
```

See `.env.railway` for a complete list of environment variables.

## 4. Configure Google Cloud Monitoring (Optional)

If you want to keep Google Cloud Monitoring:

1. **Create Service Account**: In Google Cloud Console, create a service account with Monitoring permissions
2. **Download Key**: Download the JSON key file
3. **Add to Railway**: 
   ```bash
   # Upload service account key
   railway variables set GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-service-account.json
   railway variables set GOOGLE_CLOUD_PROJECT_ID=your-project-id
   railway variables set GCP_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   ```
4. **Upload Key File**: Add the JSON key content as a variable or use Railway's file upload feature

## 5. Deploy to Railway

### Option A: Using Our Deployment Script (Recommended)
```bash
# Run our custom deployment script
npm run deploy:railway

# For help
npm run deploy:railway:help
```

### Option B: Manual Deployment
```bash
# Deploy manually
railway up

# Watch logs
railway logs
```

### Option C: Connect GitHub Repository
1. Go to Railway dashboard
2. Create new project from GitHub
3. Connect your repository
4. Railway will auto-deploy on git pushes

## 6. Post-Deployment Configuration

### Custom Domain Setup
```bash
# Add custom domain
railway domain add yourdomain.com

# Check domain status
railway domain list
```

### SSL Certificate
Railway automatically provides SSL certificates for custom domains.

### Health Checks
Railway will monitor your application using the `/health` endpoint defined in your server.

## 7. Monitoring and Maintenance

### View Logs
```bash
# Real-time logs
railway logs

# Logs with follow
railway logs --follow
```

### Check Status
```bash
# Service status
railway status

# Project info
railway info
```

### Environment Management
```bash
# List variables
railway variables

# Update variable
railway variables set KEY=value

# Delete variable
railway variables delete KEY
```

## 8. Stripe Webhook Configuration

1. **Add Webhook Endpoint**: In Stripe Dashboard, add:
   ```
   https://your-railway-app.railway.app/webhook
   ```

2. **Configure Events**: Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`

3. **Get Webhook Secret**: Copy the webhook secret and add to Railway variables:
   ```bash
   railway variables set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

## 9. Testing Your Deployment

### Health Check Endpoints
- `https://your-app.railway.app/health` - Basic health check
- `https://your-app.railway.app/api/status/health` - Detailed health status
- `https://your-app.railway.app/api/ping` - Simple ping test

### Stripe Integration Test
- `https://your-app.railway.app/api/stripe-config` - Verify Stripe configuration

### Email Test
- `https://your-app.railway.app/api/test/email-ping` - Test email connectivity

## 10. Troubleshooting

### Common Issues

#### 1. Port Configuration
Railway automatically sets the `PORT` environment variable. Make sure your `server.js` uses:
```javascript
const PORT = process.env.PORT || 8080;
```

#### 2. Build Failures
If build fails, check:
- All dependencies are in `package.json`
- Build scripts are correct
- Environment variables are set

#### 3. Memory Issues
Railway provides 512MB RAM by default. If you need more:
```bash
# Check current usage
railway status

# Upgrade plan if needed
```

#### 4. Database Connection
If using external databases, ensure:
- Connection strings are correct
- Firewall allows Railway IPs
- SSL is properly configured

### Debug Commands
```bash
# Check Railway configuration
cat railway.json

# Validate environment
node -e "console.log(process.env)"

# Test local build
npm run copy-assets && npm run build:web
```

## 11. Scaling and Performance

### Horizontal Scaling
Railway supports horizontal scaling. Configure in your dashboard or via CLI.

### Vertical Scaling
Upgrade your Railway plan for more CPU/RAM resources.

### CDN Configuration
For static assets, consider using Railway's CDN or external CDN like Cloudflare.

## 12. Backup and Recovery

### Database Backups
If using Railway's database services, they provide automatic backups.

### Environment Variables Backup
```bash
# Export all variables
railway variables > backup-env-vars.txt
```

### Application Backup
Your code is backed up in your Git repository. Railway deployments are also versioned.

## 13. Cost Optimization

### Monitor Usage
- Check Railway dashboard for resource usage
- Monitor bandwidth and compute hours
- Review monthly costs

### Optimization Tips
- Use Railway's sleep feature for non-production environments
- Optimize Docker image size
- Enable gzip compression
- Use caching strategies

## Support and Resources

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: Join the Railway community
- **Railway Status**: [status.railway.app](https://status.railway.app)
- **RinaWarp Support**: support@rinawarp.com

## Quick Reference Commands

```bash
# Essential Railway commands
railway login                    # Authenticate with Railway
railway init                     # Initialize new project
railway up                       # Deploy application
railway logs                     # View logs
railway status                   # Check service status
railway variables               # Manage environment variables
railway domain add <domain>     # Add custom domain
railway open                    # Open Railway dashboard
railway help                    # Get help

# RinaWarp-specific commands
npm run deploy:railway          # Deploy with our script
npm run railway:logs           # View Railway logs
npm run railway:status         # Check Railway status
npm run railway:open           # Open Railway dashboard
```

---

**Note**: This deployment removes Firebase dependencies and uses Railway's infrastructure instead. Google Cloud Monitoring is optional and can be configured separately if needed.
