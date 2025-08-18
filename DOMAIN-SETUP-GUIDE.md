# 🌐 Domain Setup Guide: rinawarptech.com → RinaWarp API

## 📍 Current Status
- **Your Current Site:** https://rinawarptech.com (on Cloudflare)
- **New API Server:** `18.212.105.169` (ready and configured)
- **Action Required:** Point domain to new server

---

## Step 1: 🔄 Update DNS Settings

### If using Cloudflare (recommended):
1. **Login to Cloudflare Dashboard**
2. **Select rinawarptech.com domain**
3. **Go to DNS Records**
4. **Update A Record:**
   - **Type:** A
   - **Name:** @ (for root domain)
   - **IPv4 address:** `18.212.105.169`
   - **Proxy status:** ✅ Proxied (Orange Cloud) - Keep this ON
   - **TTL:** Auto

5. **Update WWW Record:**
   - **Type:** A  
   - **Name:** www
   - **IPv4 address:** `18.212.105.169`
   - **Proxy status:** ✅ Proxied (Orange Cloud)
   - **TTL:** Auto

### Alternative: Direct DNS (if not using Cloudflare):
```
A    @    18.212.105.169
A    www  18.212.105.169
```

---

## Step 2: ⏱️ Wait for DNS Propagation

After updating DNS, wait 5-15 minutes, then test:

```bash
# Test DNS propagation
dig +short rinawarptech.com

# Should return either:
# - 18.212.105.169 (direct)
# - Cloudflare IPs (if proxied)
```

**Test the API is accessible:**
```bash
# Test your live domain
curl -s https://rinawarptech.com/api/health
```

---

## Step 3: 🔒 Set Up SSL Certificate

Once DNS is pointed to the new server, run this command:

```bash
# SSH to server
ssh -i ~/.ssh/rinawarp-key.pem ubuntu@18.212.105.169

# Get SSL certificate
sudo certbot --nginx -d rinawarptech.com -d www.rinawarptech.com

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service
# - Choose whether to share email (your choice)
# - Select option 2 (redirect HTTP to HTTPS)
```

---

## Step 4: 🛡️ Apply Full HTTPS Configuration

After SSL certificate is obtained, apply the full configuration:

```bash
# On the server
sudo systemctl reload nginx

# Test HTTPS
curl -s https://rinawarptech.com/api/health
```

---

## Step 5: ✅ Verify Everything Works

### Test All Endpoints:
```bash
# Health check
curl https://rinawarptech.com/api/health

# License validation
curl -X POST https://rinawarptech.com/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey": "test123", "deviceId": "device123"}'

# AI chat
curl -X POST https://rinawarptech.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "provider": "openai"}'

# Website
curl https://rinawarptech.com/
```

---

## 🚨 Important Notes

### Cloudflare Settings (if using):
- ✅ **Keep Proxy ON** (Orange Cloud) - This provides DDoS protection
- ⚙️ **SSL/TLS Mode:** Set to "Full (Strict)" for best security
- 🔄 **Always Use HTTPS:** Enable in SSL/TLS > Edge Certificates

### If You Get SSL Errors:
1. **Wait longer** - DNS changes can take up to 48 hours
2. **Check propagation:** Use https://whatsmydns.net/
3. **Verify server access:** Ensure port 80/443 are accessible

---

## 🎯 Production Environment Setup

After domain and SSL are working, configure production settings:

### 1. Environment Variables
```bash
# SSH to server
ssh -i ~/.ssh/rinawarp-key.pem ubuntu@18.212.105.169

# Edit environment
cd /home/ubuntu/backend
nano .env

# Add your production settings:
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
SMTP_HOST=smtp.yourprovider.com
SMTP_USER=noreply@rinawarptech.com
SMTP_PASS=your_email_password
```

### 2. Restart Services
```bash
pm2 restart rinawarp-api
```

---

## 🎉 Success Checklist

Once complete, you should have:

- ✅ **Domain pointing** to new server  
- ✅ **SSL certificate** installed and auto-renewing
- ✅ **API accessible** via https://rinawarptech.com/api/
- ✅ **Website serving** from https://rinawarptech.com/
- ✅ **Production config** with real Stripe keys
- ✅ **Auto-restart** enabled for high availability

---

## 🆘 Troubleshooting

### DNS Not Propagating?
```bash
# Check current DNS
dig rinawarptech.com
nslookup rinawarptech.com
```

### SSL Certificate Issues?
```bash
# Check SSL status
sudo certbot certificates

# Renew manually if needed
sudo certbot renew --dry-run
```

### API Not Responding?
```bash
# Check server status
ssh -i ~/.ssh/rinawarp-key.pem ubuntu@18.212.105.169
pm2 status
sudo systemctl status nginx
```

---

## 📞 Ready to Go Live!

After completing these steps, your rinawarptech.com will be:

🚀 **Serving your existing website** (from /var/www/rinawarp/)  
🔌 **Providing API endpoints** for RinaWarp Terminal app  
🔒 **Secured with SSL** and modern security headers  
📈 **Production ready** with monitoring and auto-restart  

**Time to launch your API integration!** 🎯
