# 🏷️ GTM Container Verification Checklist

**Container**: GTM-5LDNPV8Z  
**URL**: https://tagmanager.google.com/#/container/accounts/6301395727/containers/223517835/workspaces/2

## 📋 **What to Check in Your GTM Dashboard**

### **1. Container Overview**
- [ ] **Container Name**: Should reference RinaWarp Terminal
- [ ] **Container ID**: Verify it shows `GTM-5LDNPV8Z`
- [ ] **Website URL**: Should be `rinawarp-terminal.web.app`

### **2. Tags Section** 
Go to **Tags** in the left sidebar:

#### **Google Analytics Tags**
- [ ] **GA4 Configuration Tag**
  - Measurement ID: `G-53W5ZBDPC5`
  - Trigger: All Pages
  - Status: Active/Enabled

- [ ] **GA4 Event Tags** (if any)
  - Check they're firing on correct triggers
  - Verify no domain restrictions

#### **Custom Tags** (if any)
- [ ] Look for any hardcoded domain references
- [ ] Update any `.netlify.app` or `github.io` URLs to `.web.app`

### **3. Triggers Section**
Go to **Triggers** in the left sidebar:

#### **Built-in Triggers**
- [ ] **All Pages** - Should fire on all pages
- [ ] **Page View** - No domain restrictions

#### **Custom Triggers** (check each one)
- [ ] **Form Submissions** - No domain filters blocking `.web.app`
- [ ] **Click Events** - No hostname restrictions
- [ ] **Custom Events** - Check firing conditions

### **4. Variables Section**
Go to **Variables** in the left sidebar:

#### **Built-in Variables** (click Configure)
Enable these for better tracking:
- [ ] ✅ Page URL
- [ ] ✅ Page Hostname  
- [ ] ✅ Page Path
- [ ] ✅ Referrer
- [ ] ✅ Click Element
- [ ] ✅ Click URL

#### **User-Defined Variables**
Check for any that reference domains:
- [ ] **Domain/Hostname variables** - Should allow `rinawarp-terminal.web.app`
- [ ] **URL variables** - Update any hardcoded domains

### **5. Preview & Debug**
Click **Preview** button:

#### **Test Your Website**
1. Enter: `https://rinawarp-terminal.web.app`
2. Click **Connect**
3. Browse your site in the new tab

#### **Verify in Tag Assistant**
Check that these fire correctly:
- [ ] **GA4 Configuration** fires on page load
- [ ] **Page View** events are tracked
- [ ] No error messages in console
- [ ] Domain shows as `rinawarp-terminal.web.app`

### **6. Publishing**
After verification:
- [ ] Click **Submit** to publish changes
- [ ] Add version notes: "Updated domain configuration"
- [ ] Publish the container

## 🚨 **Common Issues to Fix**

### **Domain Restrictions**
Look for these problematic settings:

#### **In Triggers:**
```
❌ Page Hostname equals github.io
❌ Page Hostname contains netlify.app
❌ Page URL does not contain web.app

✅ No hostname restrictions (recommended)
✅ Page Hostname equals rinawarp-terminal.web.app
```

#### **In Variables:**
```
❌ Hardcoded: https://rinawarp-terminal.netlify.app
❌ Regex: .*github\.io.*

✅ Dynamic: {{Page Hostname}}
✅ Correct: rinawarp-terminal.web.app
```

### **GA4 Configuration Issues**
#### **Measurement ID**
- [ ] Should be: `G-53W5ZBDPC5`
- [ ] Not: Any old tracking IDs

#### **Enhanced Measurement**
- [ ] Enable **Page views** ✅
- [ ] Enable **Scrolls** ✅  
- [ ] Enable **File downloads** ✅
- [ ] Enable **Form interactions** ✅

## 🔧 **Quick Fixes**

### **If GA4 Not Firing:**
1. Go to **Tags → GA4 Configuration**
2. Check **Triggering**: Should be "All Pages"
3. Check **Measurement ID**: Should be `G-53W5ZBDPC5`

### **If Domain Issues:**
1. Go to **Triggers → All Pages**
2. Remove any **Page Hostname** filters
3. Set to fire on **All Pages** without conditions

### **If Variables Missing:**
1. Go to **Variables → Built-in Variables**
2. Click **Configure** 
3. Enable **Page URL**, **Page Hostname**, **Referrer**

## ✅ **Success Indicators**

After checking/fixing, you should see:

### **In Preview Mode:**
- ✅ GA4 Configuration tag fires immediately
- ✅ Page view events are captured
- ✅ Domain shows as `rinawarp-terminal.web.app`
- ✅ No errors in Tag Assistant

### **In Google Analytics (within 30 mins):**
- ✅ Real-time users show activity
- ✅ Page views are recorded
- ✅ Source shows correct referrers

## 🎯 **Expected GTM Setup**

Your container should have **minimal configuration**:

```
📦 Container: GTM-5LDNPV8Z
├── 🏷️ Tags
│   └── GA4 Configuration (G-53W5ZBDPC5)
├── ⚡ Triggers  
│   └── All Pages (no restrictions)
├── 📊 Variables
│   └── Built-in variables enabled
└── 🔍 No domain restrictions anywhere
```

## 📞 **Next Steps After Verification**

1. **Test on your website** - Visit rinawarp-terminal.web.app
2. **Check Google Analytics** - Verify data appears
3. **Monitor for 24 hours** - Ensure consistent tracking
4. **Document any issues** - Note for future reference

---

*Use this checklist while viewing your GTM dashboard*  
*Report back any issues found during verification*
