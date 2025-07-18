# 🔧 Netlify Dashboard Configuration Fix

## Steps to Fix Your Current Site

### 1. **Go to Site Settings**
From your current dashboard, click on **"Site Settings"** (should be in the sidebar or top menu)

### 2. **Build & Deploy Settings**
Navigate to **"Build & Deploy"** → **"Build settings"**

### 3. **Update Build Configuration**
Change the following settings:

**Build command:** 
```
echo "Static site - no build needed"
```

**Publish directory:**
```
public
```

**Base directory:** 
```
(leave empty)
```

### 4. **Environment Variables**
Go to **"Build & Deploy"** → **"Environment variables"**

Add these variables:
- `NETLIFY_NEXT_PLUGIN_SKIP` = `true`
- `DISABLE_PLUGINS` = `true`

### 5. **Save Settings**
Click **"Save"** to apply all changes

### 6. **Deploy Again**
After saving, trigger a new deploy by either:
- Using the dashboard "Deploy" button
- Or running from terminal: `netlify deploy --prod --dir=public`

## What This Fixes
- ✅ Stops Next.js plugin from interfering
- ✅ Serves files directly from your `public` directory
- ✅ Handles large download files (200MB+) properly
- ✅ No build system conflicts
- ✅ Direct file serving for downloads

## Expected Result
After these changes, your downloads should work at:
- `https://rinawarptech.com/releases/RinaWarp-Terminal-Setup-Windows.exe`
- `https://rinawarptech.com/releases/RinaWarp-Terminal-macOS.dmg`
- etc.
