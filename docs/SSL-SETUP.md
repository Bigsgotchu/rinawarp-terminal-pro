# SSL Certificate Setup Guide

## The Problem
You're getting `net::ERR_CERT_COMMON_NAME_INVALID` which means your SSL certificate doesn't match your domain name.

## Solutions

### For Development (Local Testing)

1. **Use localhost instead of the domain:**
   ```
   http://localhost:3000
   ```

2. **Create self-signed certificate for testing:**
   ```bash
   # Generate private key
   openssl genrsa -out localhost.key 2048
   
   # Create certificate signing request
   openssl req -new -key localhost.key -out localhost.csr
   
   # Generate self-signed certificate
   openssl x509 -req -days 365 -in localhost.csr -signkey localhost.key -out localhost.crt
   ```

### For Production (rinawarptech.com)

#### Option 1: Let's Encrypt (Free SSL)
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificate for your domain
sudo certbot certonly --standalone -d rinawarptech.com -d www.rinawarptech.com
```

#### Option 2: Cloudflare (Recommended)
1. Sign up for Cloudflare (free tier available)
2. Add your domain `rinawarptech.com`
3. Update your DNS nameservers to Cloudflare's
4. Enable "Always Use HTTPS" in Cloudflare settings
5. Set SSL/TLS mode to "Full"

#### Option 3: Your Hosting Provider
Most hosting providers offer free SSL certificates:
- **Vercel**: Automatic HTTPS
- **Netlify**: Automatic HTTPS  
- **Railway**: Custom domains with SSL
- **GitHub Pages**: Supports HTTPS for custom domains

## Quick Fix for Your Current Issue

### Check Your Current Setup
1. What hosting service are you using for `rinawarptech.com`?
2. Are you using a CDN like Cloudflare?
3. When did you set up the SSL certificate?

### Immediate Solutions
1. **Use HTTP for development:**
   ```
   http://rinawarptech.com (if HTTP is available)
   ```

2. **Check certificate details:**
   ```bash
   # Check what certificate is actually served
   openssl s_client -connect rinawarptech.com:443 -servername rinawarptech.com
   ```

3. **Browser bypass (temporary):**
   - Click "Advanced" on the error page
   - Click "Proceed to rinawarptech.com (unsafe)"
   - This is only for testing!

## For Your Railway App
Since you're using Railway (`rinawarp-terminal-production.up.railway.app`), you should:

1. **Use Railway's domain for API calls** (it has valid SSL):
   ```javascript
   // In your website, use the Railway domain for API calls
   const API_BASE = 'https://rinawarp-terminal-production.up.railway.app';
   ```

2. **Set up custom domain in Railway:**
   - Go to Railway dashboard
   - Add custom domain `api.rinawarptech.com`
   - Update your DNS settings
   - Railway will provide SSL automatically

## Next Steps
1. Tell me what hosting service you're using for `rinawarptech.com`
2. I'll provide specific instructions for your setup
3. We'll get proper SSL certificates configured
