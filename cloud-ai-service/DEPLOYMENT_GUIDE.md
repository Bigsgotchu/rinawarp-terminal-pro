# RinaWarp AI Cloud Service Deployment Guide

## Deployment Options

### Option 1: Deploy to Render (Free Tier Available)
Render offers a free tier that's perfect for testing.

1. **Create a Render account** at https://render.com

2. **Prepare your service**:
   ```bash
   # Create a production .env file (don't commit this!)
   cp .env .env.production
   
   # Update package.json start script if needed
   ```

3. **Create a `render.yaml`** in your project root:
   ```yaml
   services:
     - type: web
       name: rinawarp-ai-cloud
       env: node
       buildCommand: npm install
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: OPENAI_API_KEY
           sync: false
         - key: ANTHROPIC_API_KEY
           sync: false
   ```

4. **Push to GitHub** and connect to Render

5. **Set environment variables** in Render dashboard

### Option 2: Deploy to Railway (Simple & Fast)
Railway is very developer-friendly with automatic deployments.

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and create project**:
   ```bash
   railway login
   railway init
   ```

3. **Deploy**:
   ```bash
   railway up
   ```

4. **Add environment variables**:
   ```bash
   railway variables set OPENAI_API_KEY=your-key
   railway variables set ANTHROPIC_API_KEY=your-key
   ```

### Option 3: Deploy to Fly.io (Global Edge Network)
Fly.io runs your app close to users globally.

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create Fly app**:
   ```bash
   fly launch
   ```

3. **Set secrets**:
   ```bash
   fly secrets set OPENAI_API_KEY=your-key
   fly secrets set ANTHROPIC_API_KEY=your-key
   ```

4. **Deploy**:
   ```bash
   fly deploy
   ```

### Option 4: Deploy to Google Cloud Run (Serverless)
Good for scaling automatically based on traffic.

1. **Install gcloud CLI** from https://cloud.google.com/sdk/docs/install

2. **Create Dockerfile**:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

3. **Build and deploy**:
   ```bash
   gcloud run deploy rinawarp-ai \
     --source . \
     --region us-central1 \
     --allow-unauthenticated
   ```

### Option 5: Deploy to Vercel (Serverless Functions)
Best for Next.js integration later.

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Add environment variables** in Vercel dashboard

## Production Checklist

### Security
- [ ] Use strong JWT_SECRET in production
- [ ] Enable HTTPS only
- [ ] Set proper CORS origins
- [ ] Use environment-specific API keys
- [ ] Enable rate limiting
- [ ] Add request logging

### Performance
- [ ] Enable Redis for caching (optional)
- [ ] Set up CDN for static assets
- [ ] Configure auto-scaling
- [ ] Add health check endpoints

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Add performance monitoring
- [ ] Configure alerts for downtime
- [ ] Track API usage and costs

### Database (if needed)
- [ ] Use MongoDB Atlas for production
- [ ] Enable database backups
- [ ] Set up proper indexes

## Environment Variables for Production

```env
# Required
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate-strong-secret>

# AI Providers (at least one required)
OPENAI_API_KEY=<your-production-key>
ANTHROPIC_API_KEY=<your-production-key>

# Security
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Optional Services
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

# Monitoring (optional)
SENTRY_DSN=https://...
```

## Post-Deployment

1. **Test all endpoints**:
   ```bash
   curl https://your-app.com/api/health
   curl -X POST https://your-app.com/api/ai/completion \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-token" \
     -d '{"prompt": "Hello AI!"}'
   ```

2. **Monitor logs** for any errors

3. **Set up custom domain** if needed

4. **Configure auto-deployment** from GitHub

## Cost Considerations

- **Render**: Free tier includes 750 hours/month
- **Railway**: $5/month credit on free tier
- **Fly.io**: Free tier includes 3 shared VMs
- **Google Cloud Run**: Free tier includes 2M requests/month
- **Vercel**: Free tier includes 100GB bandwidth/month

## Need Help?

- Check logs: Most platforms provide easy log access
- Review environment variables: Ensure all are set correctly
- Test locally first: `NODE_ENV=production npm start`
- Check API key quotas: Ensure your keys have available credits
