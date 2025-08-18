
# 🌊 Google Analytics Setup Instructions

## Current Status
✅ **All files configured** with placeholder tracking ID: G-G424CV5GGT
⚠️  **Replace with your real GA tracking ID** to start collecting data

## 📋 Steps to Create Your Google Analytics Property

### 1. Create GA4 Property
1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon)
3. Click **Create Property**
4. Name: **"RinaWarp Terminal"**
5. Select your country/timezone
6. Choose **Business** for industry category
7. Click **Create**

### 2. Set Up Data Stream
1. Click **Add stream** → **Web**
2. Website URL: **https://rinawarptech.com**
3. Stream name: **"RinaWarp Terminal Website"**
4. Click **Create stream**
5. **Copy the Measurement ID** (format: G-ABC1234567)

### 3. Replace Placeholder ID
Run this command with your real tracking ID:
```bash
# Replace G-G424CV5GGT with your real tracking ID
find . -name "*.js" -o -name "*.html" -o -name "*.env*" | xargs sed -i '' 's/G-G424CV5GGT/G-YOURREALTID/g'
```

Or use the configuration script:
```bash
node scripts/configure-ga-complete.cjs
```

### 4. Deploy Changes
1. Rebuild your app: `npm run build`
2. Upload website changes to your server
3. Restart backend services
4. Test with Real-Time reports in GA

### 5. Configure Goals & Events
After setup, configure these in GA:
- **Conversions**: App downloads, subscriptions
- **Audiences**: Users by plan type, engagement level
- **Goals**: Trial signups, purchases, feature usage

## 🔍 Verification
Run the test script to verify everything is working:
```bash
node scripts/test-google-analytics.cjs
```

## 📊 What's Already Configured
- ✅ Marketing website tracking
- ✅ Desktop app analytics
- ✅ E-commerce conversion tracking
- ✅ Custom event tracking functions
- ✅ Privacy-compliant settings (IP anonymization)
- ✅ Environment variable support

## 🚀 Ready to Track
Once you replace the placeholder ID, you'll track:
- Page views and user sessions
- App downloads and installations
- Subscription purchases and upgrades
- Feature usage and engagement
- User behavior and retention

---
*Generated automatically by RinaWarp Terminal GA setup*
