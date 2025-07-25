# 🛡️ Cloudflare Security Rules for RinaWarp Terminal

Based on the attack patterns we've seen in your logs, here are recommended Cloudflare security rules to add an extra layer of protection:

## 📊 **Attack Patterns Observed**
From your Railway logs, these are the most common attacks:
- WordPress setup config attempts: `/wp-admin/setup-config.php`
- WordPress manifest file scanning: `//wp-includes/wlwmanifest.xml`
- XML-RPC attacks: `//xmlrpc.php?rsd`
- Directory traversal attempts for WordPress folders

## 🚫 **Cloudflare WAF Rules to Add**

### Rule 1: Block WordPress Admin Access Attempts
```
Field: URI Path
Operator: contains
Value: wp-admin/setup-config.php
Action: Block
```

### Rule 2: Block WordPress Manifest Scanning
```
Field: URI Path  
Operator: contains
Value: wp-includes/wlwmanifest.xml
Action: Block
```

### Rule 3: Block XML-RPC Attacks
```
Field: URI Path
Operator: contains  
Value: xmlrpc.php
Action: Block
```

### Rule 4: Block Common WordPress Paths
```
Field: URI Path
Operator: matches regex
Value: ^.*(wp-admin|wp-includes|wp-content|wordpress).*$
Action: Challenge (or Block if preferred)
```

### Rule 5: Rate Limiting for Suspicious IPs
```
Characteristics:
- More than 20 requests per minute
- To paths containing "wp-" 
Action: Block for 1 hour
```

## 🔧 **How to Add These Rules**

### In Cloudflare Dashboard:
1. Go to **Security** → **WAF** → **Custom rules**
2. Click **Create rule**
3. Add each rule above
4. Set priority (higher number = higher priority)

### Alternative: Cloudflare API
You can also use the Cloudflare API to add these rules programmatically.

## 📈 **Additional Security Enhancements**

### Browser Integrity Check
Enable **Browser Integrity Check** in Security → Settings

### Challenge Passage  
Set **Security Level** to "Medium" or "High"

### Bot Fight Mode
Enable **Bot Fight Mode** to automatically block known malicious bots

### Rate Limiting
Create rate limiting rules:
- **General**: 100 requests per minute per IP
- **API endpoints**: 20 requests per minute per IP
- **Login attempts**: 5 attempts per minute per IP

## 🎯 **Monitoring & Alerting**

Set up alerts for:
- High number of blocked requests
- New attack patterns
- Unusual traffic spikes

## 📊 **Expected Results**

After implementing these rules, you should see:
- ✅ Significant reduction in WordPress scanner traffic
- ✅ Cleaner application logs
- ✅ Reduced server load from malicious requests
- ✅ Better performance for legitimate users

## 🚨 **Important Notes**

1. **Test First**: Always test rules on a small percentage of traffic first
2. **Monitor Impact**: Watch for false positives affecting legitimate users
3. **Whitelist if Needed**: Create exceptions for legitimate WordPress usage (if any)
4. **Regular Review**: Review and update rules based on new attack patterns

## 🔄 **Current Application-Level Protection**

Your RinaWarp Terminal already has excellent application-level protection:
```javascript
🚫 Blocked WordPress scanner attempt: GET /wp-admin/setup-config.php
🚫 Blocked WordPress scanner attempt: GET //wp-includes/wlwmanifest.xml
```

The Cloudflare rules will add an additional layer **before** requests reach your application, saving server resources and improving performance.

---

**Status**: Ready to implement  
**Priority**: High (reduces server load)  
**Estimated Setup Time**: 15-20 minutes
