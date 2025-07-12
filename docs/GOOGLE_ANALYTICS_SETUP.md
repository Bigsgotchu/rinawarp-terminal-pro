# 🌊 Google Analytics Setup for RinaWarp Terminal

## 📊 Current Status
✅ **Google Analytics is properly configured** with dynamic tracking ID support  
⚠️ **Currently disabled** - Needs your actual GA tracking ID to activate

## 🔧 Quick Setup

### Option 1: Replace Tracking ID Directly
1. Open `public/index.html`
2. Find line 12: `const trackingId = window.GA_TRACKING_ID || 'G-XXXXXXXXXX';`
3. Replace `'G-XXXXXXXXXX'` with your actual Google Analytics tracking ID
4. Example: `const trackingId = window.GA_TRACKING_ID || 'G-ABC123XYZ';`

### Option 2: Use Environment Variables (Recommended)
1. Add to your `.env` file:
   ```
   GA_TRACKING_ID=G-ABC123XYZ
   ```
2. Set the environment variable in your deployment platform:
   - **Vercel**: Project Settings → Environment Variables
   - **Railway**: Project Settings → Variables
   - **Netlify**: Site Settings → Environment Variables

### Option 3: Set via JavaScript
Add this script before the Google Analytics code:
```html
<script>
    window.GA_TRACKING_ID = 'G-ABC123XYZ';
</script>
```

## 🚀 Getting Your Google Analytics Tracking ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property (if you don't have one)
3. Set up a data stream for your website
4. Copy your **Measurement ID** (format: G-XXXXXXXXXX)

## 🔍 Verification

After setup, Google Analytics will:
- ✅ Load automatically when a valid tracking ID is detected
- ⚠️ Show a warning in console if no valid tracking ID is found
- 📊 Start tracking page views, events, and user behavior

## 🛠️ Advanced Configuration

### Environment-Based Tracking
```javascript
// Different tracking IDs for different environments
const trackingId = window.GA_TRACKING_ID || 
  (window.location.hostname === 'localhost' ? null : 'G-PROD-ID');
```

### Conditional Loading
```javascript
// Only load in production
if (window.location.hostname !== 'localhost') {
    window.GA_TRACKING_ID = 'G-ABC123XYZ';
}
```

## 📱 Vercel Integration

Add to your `vercel.json`:
```json
{
  "env": {
    "GA_TRACKING_ID": "G-ABC123XYZ"
  }
}
```

## 🐛 Troubleshooting

**Q: Google Analytics isn't loading**
- Check console for "GA disabled" message
- Ensure tracking ID format is correct (starts with G-)
- Verify tracking ID is not the placeholder 'G-XXXXXXXXXX'

**Q: Tracking ID not being set**
- Check environment variables are properly configured
- Ensure `window.GA_TRACKING_ID` is set before the GA script runs
- Verify your deployment platform is injecting the environment variable

**Q: Analytics not showing data**
- Allow 24-48 hours for data to appear in GA dashboard
- Check that GA property is properly configured
- Verify tracking ID matches exactly

## 🎯 Features

- 🔄 **Dynamic Loading**: Only loads when valid tracking ID is provided
- 🌍 **Environment Support**: Works with environment variables
- 🛡️ **Privacy Friendly**: Disabled by default, no tracking without explicit configuration
- 📊 **Standard GA4**: Uses latest Google Analytics 4 implementation
- 🔍 **Debug Friendly**: Clear console messages for troubleshooting

---

Ready to track your mermaid magic! 🧜‍♀️📈
