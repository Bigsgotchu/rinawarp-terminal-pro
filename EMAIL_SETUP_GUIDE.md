# Email Setup Guide for RinaWarp Terminal

## Option 1: Domain Registrar Email Forwarding (Recommended for Start)

Most domain registrars offer free email forwarding:

### Namecheap:
1. Login to Namecheap account
2. Go to Domain List → Manage
3. Click "Advanced DNS"
4. Add email forwarding:
   - `sales@yourdomain.com` → your personal email
   - `support@yourdomain.com` → your personal email
   - `info@yourdomain.com` → your personal email

### Cloudflare:
1. Add your domain to Cloudflare
2. Go to Email → Email Routing
3. Enable email routing (free)
4. Add forwarding rules:
   - `sales@yourdomain.com` → your@gmail.com
   - `*@yourdomain.com` → your@gmail.com (catch-all)

## Option 2: Professional Email Services

### Google Workspace (Recommended for Business)
- **Cost**: $6/user/month
- **Features**: Full Gmail interface, calendar, drive
- **Setup**: https://workspace.google.com

### Microsoft 365
- **Cost**: $5-6/user/month  
- **Features**: Outlook, OneDrive, Office apps
- **Setup**: https://www.microsoft.com/microsoft-365

### Zoho Mail (Budget Option)
- **Cost**: Free for 5 users, $1/user/month for more
- **Features**: Professional email, basic apps
- **Setup**: https://www.zoho.com/mail

## Option 3: Simple SMTP Services

### SendGrid (For automated emails)
- **Use**: Transactional emails (password resets, receipts)
- **Cost**: Free for 100 emails/day
- **Setup**: https://sendgrid.com

### Mailgun
- **Use**: Transactional emails
- **Cost**: Free for 5,000 emails/month
- **Setup**: https://www.mailgun.com

## Email Setup Steps:

1. **Choose your email solution** (Start with registrar forwarding)
2. **Set up forwarding rules**:
   - `sales@yourdomain.com` → your personal email
   - `support@yourdomain.com` → your personal email
   - `noreply@yourdomain.com` → (for system emails)
3. **Test email forwarding** by sending test emails
4. **Update your domain records** (MX records if using full email hosting)
5. **Configure spam filtering**

## Professional Email Templates

### Auto-Reply for Sales Inquiries:
```
Subject: Thank you for your interest in RinaWarp Terminal

Hi there,

Thank you for reaching out about RinaWarp Terminal Enterprise!

I've received your inquiry and will get back to you within 24 hours with detailed information about our enterprise solutions.

In the meantime, feel free to:
- Try our 30-day free trial at https://yourdomain.com
- Check out our documentation at https://yourdomain.com/docs
- View our feature comparison at https://yourdomain.com/pricing

Best regards,
The RinaWarp Team
sales@yourdomain.com
```

## DNS Records You'll Need:

### For Email Forwarding (Registrar):
- Usually handled automatically

### For Google Workspace:
```
MX Records:
1. ASPMX.L.GOOGLE.COM (Priority: 1)
2. ALT1.ASPMX.L.GOOGLE.COM (Priority: 5)
3. ALT2.ASPMX.L.GOOGLE.COM (Priority: 5)
4. ALT3.ASPMX.L.GOOGLE.COM (Priority: 10)
5. ALT4.ASPMX.L.GOOGLE.COM (Priority: 10)
```

### For Microsoft 365:
```
MX Record:
yourdomain-com.mail.protection.outlook.com (Priority: 0)
```
