# Domain Setup Guide for RinaWarp Terminal

## Current Status
- **Project**: rinawarp-terminal
- **Current URL**: https://rinawarp-terminal-rinawarptechnologies25-8115-rinawarp-tech.vercel.app
- **Target Domain**: rinawarptech.com
- **Status**: Domain needs to be configured

## Steps to Configure Custom Domain

### 1. Add Domain to Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to the `rinawarp-terminal` project
3. Go to Settings → Domains
4. Add `rinawarptech.com` as a custom domain

### 2. DNS Configuration
Once the domain is added, you'll need to configure DNS records:

**Option A: Using Vercel DNS (Recommended)**
1. Update your domain's nameservers to point to Vercel:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

**Option B: Using Custom DNS**
Add the following DNS records to your domain registrar:
```
Type: A
Name: @
Value: 76.76.19.19

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3. SSL Certificate
- Vercel automatically provisions SSL certificates for custom domains
- This process typically takes 5-10 minutes after DNS propagation

### 4. Domain Verification
1. Wait for DNS propagation (up to 24 hours)
2. Verify the domain is working at https://rinawarptech.com
3. Ensure www.rinawarptech.com redirects to rinawarptech.com

## Testing Checklist
- [ ] Domain resolves to Vercel
- [ ] SSL certificate is active
- [ ] www redirect works
- [ ] All pages load correctly
- [ ] API endpoints work
- [ ] Download links function properly

## Troubleshooting
If the domain doesn't work:
1. Check DNS propagation: https://dnschecker.org/
2. Verify DNS records are correct
3. Check Vercel deployment logs
4. Contact Vercel support if needed

## Environment Variables for Custom Domain
Update these in Vercel project settings:
- `VERCEL_URL`: rinawarptech.com
- `NEXT_PUBLIC_SITE_URL`: https://rinawarptech.com
- Any hardcoded URLs in the application
