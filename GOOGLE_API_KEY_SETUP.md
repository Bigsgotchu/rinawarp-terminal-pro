# 🔑 GOOGLE API KEY SETUP GUIDE

I've opened the Google Cloud Console API Credentials page for you.

## 🚨 **FIRST: DELETE THE EXPOSED KEY**

### Step 1: Find and Delete Old Key
Look for this exposed key: `AIzaSyAx4RY1Hw_5WFTbB-qpOHwk0bncKJm1m6o`

1. **Find the key** in your API credentials list
2. **Click the three dots menu** (⋮) next to it
3. **Select "Delete"**
4. **Confirm deletion**

---

## ✅ **CREATE NEW SECURE API KEY**

### Step 2: Create New API Key

1. **Click "+ CREATE CREDENTIALS"**
2. **Select "API key"**
3. **Copy the new key immediately** (starts with `AIzaSy...`)

### Step 3: IMMEDIATELY Restrict the Key 🔒

**CRITICAL**: Click **"RESTRICT KEY"** right after creating it:

#### **Application restrictions** (choose one):
- **HTTP referrers (recommended for web)**: 
  ```
  https://rinawarptech.com/*
  https://*.rinawarptech.com/*
  ```
- **IP addresses (for server-side)**: Add your server IPs
- **Android apps**: If using in mobile app
- **iOS apps**: If using in iOS app

#### **API restrictions** (IMPORTANT - restrict to only what you need):
Select **"Restrict key"** and enable only the APIs you actually use:

**Common APIs for SaaS:**
- ✅ **Maps JavaScript API** (if using Google Maps)
- ✅ **Places API** (if using location services)
- ✅ **Geocoding API** (if converting addresses)
- ✅ **YouTube Data API v3** (if embedding videos)
- ✅ **Gmail API** (if sending emails via Gmail)
- ✅ **Google Drive API** (if accessing Drive files)
- ✅ **Google Sheets API** (if using spreadsheets)

**DON'T enable** everything - only what you actually use!

### Step 4: Save and Test

1. **Click "SAVE"**
2. **Copy your new API key**
3. **Add to your .env file**

---

## 🛠️ **ADD TO YOUR .ENV FILE**

### Option 1: Manual Edit
```bash
# Open your .env file
code .env

# Add this line:
GOOGLE_API_KEY=AIzaSy_YOUR_NEW_SECURE_API_KEY_HERE
```

### Option 2: Quick Script
```bash
# Replace YOUR_NEW_KEY with your actual key
echo "GOOGLE_API_KEY=AIzaSy_YOUR_NEW_SECURE_API_KEY_HERE" >> .env
```

---

## 🧪 **TEST YOUR SETUP**

```bash
# Verify all your API keys are loaded
node test-env.cjs

# Should show:
# ✅ Google API Key: Loaded
```

---

## 🔍 **WHICH APIS DO YOU NEED?**

**Tell me what Google services your RinaWarp app uses:**

- 📍 **Maps/Location services?** → Enable Maps JavaScript API, Places API
- 📧 **Email integration?** → Enable Gmail API
- 📊 **Google Sheets integration?** → Enable Google Sheets API
- 🎥 **YouTube videos?** → Enable YouTube Data API v3
- ☁️ **Google Drive files?** → Enable Google Drive API
- 🗺️ **Address validation?** → Enable Geocoding API

**If you're not sure, check your code for:**
```bash
# Search for Google API usage in your code
grep -r "google" --include="*.js" --include="*.ts" .
grep -r "maps" --include="*.js" --include="*.ts" .
grep -r "youtube" --include="*.js" --include="*.ts" .
```

---

## 🛡️ **SECURITY BEST PRACTICES**

### ✅ DO:
- **Always restrict keys** immediately after creation
- **Use minimum required permissions** (least privilege)
- **Set HTTP referrer restrictions** for web apps
- **Monitor API usage** in Google Cloud Console
- **Rotate keys periodically** (every 90 days)

### ❌ DON'T:
- **Never use unrestricted keys** in production
- **Don't enable all APIs** - only what you need
- **Don't commit keys to git** (use .env files)
- **Don't use the same key** for multiple environments

---

## 🔄 **KEY ROTATION SCHEDULE**

Set a reminder to rotate your Google API keys every 90 days:

1. **Create new restricted key**
2. **Update .env file**
3. **Deploy to production**
4. **Delete old key after verification**

---

## 📋 **QUICK CHECKLIST**

- [ ] ✅ Old exposed key deleted
- [ ] ✅ New API key created
- [ ] ✅ Key restrictions applied (HTTP referrers + specific APIs)
- [ ] ✅ Key added to .env file
- [ ] ✅ Key tested with `node test-env.cjs`
- [ ] ✅ No Google API key visible in git repository

---

**🎯 Complete these steps in the Google Cloud Console, then let me know which APIs you need enabled!**
