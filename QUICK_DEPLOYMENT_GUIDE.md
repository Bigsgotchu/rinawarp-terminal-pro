# 🚀 Quick Deployment Guide - RinaWarp Terminal

## ⚡ Fast Track (30 minutes to live site)

### Step 1: Register Domain (5 minutes)
```bash
# Go to Namecheap or Cloudflare
# Register: rinawarp.com (or your preferred domain)
# Enable privacy protection
# Note your login details
```

### Step 2: Update Code (2 minutes)
```powershell
# Run the domain update script
.\update-domain.ps1 -NewDomain "yourdomain.com"
```

### Step 3: Setup Email (5 minutes)
```bash
# Option A: Use registrar email forwarding (free)
# Namecheap: Domain → Manage → Advanced DNS → Email Forwarding
# Add: sales@yourdomain.com → your@gmail.com

# Option B: Use Cloudflare Email Routing (free)
# Cloudflare: Email → Email Routing → Enable
# Add forwarding rules
```

### Step 4: Deploy Website (10 minutes)
```powershell
# Option A: Netlify (Recommended)
.\deploy-website.ps1 -Platform netlify -Domain "yourdomain.com"

# Option B: Manual Netlify
.\deploy-website.ps1 -Platform prepare-only
# Then drag 'deploy' folder to netlify.com

# Option C: Vercel
.\deploy-website.ps1 -Platform vercel -Domain "yourdomain.com"
```

### Step 5: Configure DNS (5 minutes)
```bash
# In your domain registrar:
# Add A record: @ → [hosting IP]
# Add CNAME: www → yourdomain.com

# For Netlify:
# Usually automatic with custom domain setup

# For Vercel:
# Follow their custom domain instructions
```

### Step 6: Test Everything (3 minutes)
```bash
# ✅ Visit https://yourdomain.com
# ✅ Test email: send to sales@yourdomain.com
# ✅ Check SSL certificate (should be automatic)
# ✅ Test pricing page functionality
```

---

## 🛠️ Commands Reference

### Update Domain References:
```powershell
.\update-domain.ps1 -NewDomain "rinawarp.com"
.\update-domain.ps1 -NewDomain "rinawarp.dev" -SalesEmail "contact@rinawarp.dev"
```

### Deploy Website:
```powershell
# Prepare files only
.\deploy-website.ps1

# Deploy to Netlify
.\deploy-website.ps1 -Platform netlify -Domain "rinawarp.com"

# Deploy to Vercel  
.\deploy-website.ps1 -Platform vercel -Domain "rinawarp.com"

# Prepare for GitHub Pages
.\deploy-website.ps1 -Platform github -Domain "rinawarp.com"
```

### Test Local Development:
```powershell
# Start the terminal app
npm start

# Test pricing page locally
# Open pricing.html in browser
```

---

## 📋 Pre-Deployment Checklist

### Before Starting:
- [ ] Domain name decided
- [ ] Hosting platform chosen
- [ ] Email plan selected
- [ ] Payment methods ready

### Files to Update:
- [ ] src/renderer/renderer.js
- [ ] pricing.html  
- [ ] package.json
- [ ] README.md

### Post-Deployment:
- [ ] Domain pointing correctly
- [ ] SSL certificate active
- [ ] Email forwarding working
- [ ] Website loading properly
- [ ] Forms submitting correctly
- [ ] Analytics setup (optional)

---

## 🆘 Troubleshooting

### Domain Not Working:
```bash
# Check DNS propagation
nslookup yourdomain.com

# Wait 24-48 hours for full propagation
# Use DNS checker: whatsmydns.net
```

### Email Not Working:
```bash
# Test email forwarding
# Send test email to sales@yourdomain.com
# Check spam folder
# Verify forwarding rules in registrar
```

### Website Not Loading:
```bash
# Check hosting platform status
# Verify SSL certificate
# Clear browser cache
# Try incognito/private browsing
```

### SSL Issues:
```bash
# Usually resolves automatically in 1-24 hours
# Force SSL renewal in hosting platform
# Check domain verification
```

---

## 💰 Cost Breakdown

### Minimal Setup (Recommended Start):
- **Domain**: $10-15/year
- **Hosting**: Free (Netlify/Vercel)
- **Email**: Free (registrar forwarding)
- **SSL**: Free (automatic)
- **Total**: ~$15/year

### Professional Setup:
- **Domain**: $10-15/year  
- **Hosting**: $19/month (Netlify Pro)
- **Email**: $6/month (Google Workspace)
- **Analytics**: Free (Google Analytics)
- **Total**: ~$315/year

### Enterprise Setup:
- **Domain**: $10-15/year
- **Hosting**: $20/month (Vercel Pro)
- **Email**: $6/month (Google Workspace)
- **CDN**: Included
- **Support**: Included
- **Total**: ~$325/year

---

## 🎯 Success Metrics

After deployment, you should have:
- ✅ Professional domain (yourdomain.com)
- ✅ Working website with pricing
- ✅ Professional email (sales@yourdomain.com)
- ✅ SSL certificate (https://)
- ✅ Fast loading (< 3 seconds)
- ✅ Mobile-friendly design
- ✅ Search engine ready (sitemap, robots.txt)

**🎉 Congratulations! Your RinaWarp Terminal is now live!**
