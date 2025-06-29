# 🌐 Domain Configuration Fix Guide

**Issue**: Google Tag Manager and other platforms may have old Netlify domain references  
**Solution**: Update all platforms to use `rinawarp-terminal.web.app`  
**Date**: June 28, 2025

---

## 🎯 **GOOGLE TAG MANAGER FIXES**

### **Container Settings (GTM-5LDNPV8Z)**

1. **Navigate to GTM Dashboard**: https://tagmanager.google.com
2. **Select Container**: GTM-5LDNPV8Z
3. **Go to Admin → Container Settings**

**Settings to Update:**

#### **Container Configuration**
- **Container Name**: Update if it references old domain
- **Container Notes**: Update any domain references

#### **Variables to Check & Update**

**Go to: Variables → Built-in Variables**
- ✅ **Page Hostname** - Should show `rinawarp-terminal.web.app`
- ✅ **Page URL** - Should show full `https://rinawarp-terminal.web.app/...`
- ✅ **Referrer** - Check for any domain filters

**Go to: Variables → User-Defined Variables**
Look for variables with these names and update domains:
- [ ] **Domain Name** variables
- [ ] **Base URL** variables  
- [ ] **Site URL** variables
- [ ] Any custom **Hostname** variables

#### **Triggers to Update**

**Go to: Triggers → All Triggers**
Check these trigger types for domain restrictions:

**Page View Triggers:**
- [ ] **All Pages** - Remove any domain filters if restrictive
- [ ] **Some Pages** - Update domain conditions from `.netlify.app` to `.web.app`

**Custom Event Triggers:**
- [ ] Check **Firing Conditions** for domain restrictions
- [ ] Update any **Page Hostname** conditions

#### **Tags to Review**

**Go to: Tags → All Tags**

**Google Analytics Tags:**
- [ ] **GA4 Configuration** - Verify tracking ID: `G-53W5ZBDPC5`
- [ ] **GA4 Event** tags - Check domain settings
- [ ] Remove any domain exclusions that might block `.web.app`

**Custom HTML Tags:**
- [ ] Search for hardcoded `.netlify.app` URLs
- [ ] Update to `rinawarp-terminal.web.app`

---

## 📊 **GOOGLE ANALYTICS FIXES**

### **Property Settings (G-53W5ZBDPC5)**

1. **Navigate to GA**: https://analytics.google.com
2. **Select Property**: RinaWarp Terminal (G-53W5ZBDPC5)

**Settings to Update:**

#### **Admin → Property Settings**
- [ ] **Property Name**: Verify references correct domain
- [ ] **Default URL**: Should be `https://rinawarp-terminal.web.app`
- [ ] **Industry Category**: Developer Tools
- [ ] **Time Zone**: Your local timezone

#### **Admin → Data Streams**
- [ ] **Web Stream URL**: Must be `https://rinawarp-terminal.web.app`
- [ ] **Enhanced Measurement**: Enable all relevant options
- [ ] **Cross-domain Tracking**: Remove any old domains

#### **Admin → Audience Definitions**
- [ ] Check **Custom Audiences** for domain filters
- [ ] Update any **Page/Screen** conditions with old domains

#### **Conversions & Goals**
- [ ] **Conversion Events**: Verify they track on correct domain
- [ ] **Custom Goals**: Update any URL-based goals

---

## 💳 **STRIPE DASHBOARD FIXES**

### **Account Settings**

1. **Navigate to Stripe**: https://dashboard.stripe.com
2. **Go to Settings → Account Details**

**Settings to Update:**

#### **Business Settings**
- [ ] **Website URL**: `https://rinawarp-terminal.web.app`
- [ ] **Support URL**: `https://rinawarp-terminal.web.app/support`
- [ ] **Privacy Policy**: `https://rinawarp-terminal.web.app/privacy`

#### **Webhook Endpoints**
- [ ] **Success URL**: Update to `https://rinawarp-terminal.web.app/success.html`
- [ ] **Cancel URL**: Update to `https://rinawarp-terminal.web.app/pricing.html`
- [ ] **Webhook URLs**: Update any that point to old domain

#### **Product Settings**
- [ ] **Product URLs**: Update product links in Stripe dashboard
- [ ] **Customer Portal**: Update return URLs
- [ ] **Email Templates**: Check for hardcoded domain links

---

## 🚀 **CODE UPDATES NEEDED**

### **Files to Update (Replace .netlify.app with .web.app)**

#### **Documentation Files:**
```
BETA_LAUNCH_CHECKLIST.md - Line 229
BETA_EXPECTATIONS_AND_KNOWN_ISSUES.md - Lines 205, 236
docs/LAUNCH_NOW_CHECKLIST.md - Lines 6, 51, 71, 91, 136
docs/TODAY_LAUNCH_CHECKLIST.md - Lines 36, 142
docs/APP_STORE_DEPLOYMENT.md - Lines 226, 244
docs/STRIPE_DOMAIN_SETUP.md - Lines 19, 24, 47
docs/STRIPE_DOMAIN_FIX.md - Lines 4, 16, 20
```

#### **JavaScript Files:**
```
src/renderer/workflow-automation.js - Line 1178
src/monitoring/ip-monitor.js - Lines 178, 263
src/renderer/renderer.js - Lines 3428, 3509
```

### **Quick Find & Replace Commands:**

```powershell
# Find all .netlify.app references
Get-ChildItem -Recurse -Include "*.md","*.js","*.html" | Select-String ".netlify.app"

# Replace in markdown files (run one at a time for safety)
(Get-Content "BETA_LAUNCH_CHECKLIST.md") -replace "rinawarp-terminal.netlify.app", "rinawarp-terminal.web.app" | Set-Content "BETA_LAUNCH_CHECKLIST.md"
```

---

## 🔍 **VERIFICATION CHECKLIST**

### **After Making All Updates:**

#### **GTM Verification**
- [ ] **Preview Mode**: Test on `rinawarp-terminal.web.app`
- [ ] **Real-time**: Check events fire correctly
- [ ] **Debug**: Use GTM Assistant browser extension
- [ ] **Publish**: Publish GTM container after testing

#### **GA Verification**  
- [ ] **Real-time Reports**: Visit site and check activity
- [ ] **Debug View**: Use GA Debugger extension
- [ ] **Events**: Test purchase flows and form submissions
- [ ] **Goals**: Verify conversion tracking

#### **Stripe Verification**
- [ ] **Test Payment**: Complete test transaction
- [ ] **Webhook Delivery**: Check webhook logs
- [ ] **Customer Portal**: Test customer experience
- [ ] **Email Flows**: Verify receipt emails

#### **Website Verification**
- [ ] **All Links**: Internal links work correctly
- [ ] **Forms**: Contact and feedback forms submit
- [ ] **Analytics**: All tracking codes load
- [ ] **Performance**: Site loads quickly

---

## 🚨 **IMMEDIATE PRIORITY ACTIONS**

### **HIGH PRIORITY (Do First)**
1. **Update GTM Domain Restrictions** in triggers
2. **Fix GA Data Stream URL** 
3. **Update Stripe Webhook URLs**

### **MEDIUM PRIORITY (Do Today)**
1. **Update all documentation** with correct domain
2. **Fix JavaScript references** in code
3. **Test all tracking** end-to-end

### **LOW PRIORITY (Do This Week)**
1. **Update external references** (social media, etc.)
2. **Clean up old documentation**
3. **Verify search console** settings

---

## 📞 **TESTING COMMANDS**

### **Check Domain Resolution:**
```powershell
nslookup rinawarp-terminal.web.app
```

### **Test Website Accessibility:**
```powershell
curl -I "https://rinawarp-terminal.web.app"
```

### **Verify GTM Loading:**
```javascript
// In browser console on your site:
window.dataLayer
```

### **Check GA Loading:**
```javascript
// In browser console:
window.gtag
```

---

## ✅ **SUCCESS CRITERIA**

**Domain Configuration Complete When:**
- [ ] GTM shows no `.netlify.app` references
- [ ] GA tracks correctly on `.web.app` domain  
- [ ] Stripe webhooks point to correct domain
- [ ] All internal links use correct domain
- [ ] Test payments complete successfully
- [ ] Analytics data flows correctly

---

**Created**: June 28, 2025  
**Priority**: HIGH  
**Status**: Ready to Execute  
**Estimated Time**: 45-60 minutes
