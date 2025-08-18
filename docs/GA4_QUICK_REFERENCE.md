# 🎯 GA4 Setup Quick Reference Card

## ✅ **YOUR SETUP CHECKLIST** (20 minutes total)

### 🎯 **STEP 1: Mark Conversion Events** (5 min)
**URL**: https://analytics.google.com/analytics/web/#/p0/admin/events

**Toggle "Mark as conversion" for these events:**
- ✅ `download` - App downloads ($5 value)
- ✅ `purchase` - Subscriptions (dynamic value)  
- ✅ `begin_trial` - Trial signups ($15 value)
- ✅ `sign_up` - User registrations ($2 value)
- ✅ `feature_activation` - Feature usage ($1 value)

> **Note**: Events appear only after firing once. Test on your website first!

---

### 👥 **STEP 2: Create Revenue Audiences** (10 min)  
**URL**: https://analytics.google.com/analytics/web/#/p0/admin/audiences

**Click "New Audience" → "Create Custom Audience"**

| Audience Name | Condition | Lookback Window |
|---------------|-----------|-----------------|
| **High Value Users** | purchase ≥ $29 | 30 days |
| **Trial Non-Converters** | begin_trial exists, purchase doesn't | 30 days |
| **macOS Users** | download platform = "macOS" | 90 days |
| **Windows Users** | download platform = "Windows" | 90 days |  
| **Linux Users** | download platform = "Linux" | 90 days |
| **Feature Power Users** | feature_activation ≥ 3 events | 7 days |

---

### 📈 **STEP 3: Configure Attribution** (5 min)
**URL**: https://analytics.google.com/analytics/web/#/p0/admin/attribution-settings

**Set these values:**
- **Attribution Model**: Data-driven
- **Click Window**: 90 days
- **View Window**: 1 day  
- **Google Ads**: Enable

---

## 🧪 **TEST YOUR SETUP**

### **Visit your website and run in console:**
```javascript
// Test download event
gtag("event", "download", {
  platform: "macOS",
  version: "1.3.1"
});

// Test trial event  
gtag("event", "begin_trial", {
  trial_plan: "Professional",
  trial_duration: "14_days"
});
```

### **Check results:**
**Real-Time Reports**: https://analytics.google.com/analytics/web/#/p0/realtime/overview

---

## 🎯 **SUCCESS CHECKLIST**

- [ ] **5 conversion events** marked in GA4
- [ ] **6 revenue audiences** created  
- [ ] **Attribution model** set to data-driven
- [ ] **Test events** fired successfully
- [ ] **Real-time data** visible in dashboard

---

## 💰 **EXPECTED RESULTS**

- **24 hours**: Revenue tracking active
- **1 week**: Conversion insights available
- **1 month**: 25%+ revenue optimization

---

🧜‍♀️ **Complete setup now for immediate revenue insights!**
