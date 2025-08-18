# 🎯 Google Tag Manager Configuration Guide
**Container: GTM-5LDNPV8Z | GA4 Property: G-SZK23HMCVP**

## 🚀 Quick Setup Checklist

### Step 1: Access GTM Dashboard
1. Go to [Google Tag Manager](https://tagmanager.google.com)
2. Find your container **GTM-5LDNPV8Z**
3. Click to open the workspace

---

## 📊 Step 2: Configure Google Analytics 4

### 2.1 Create GA4 Configuration Tag
1. **Click "New Tag"**
2. **Tag Configuration:**
   - Click tag configuration area
   - Select **"Google Analytics: GA4 Configuration"**
   - **Measurement ID:** `G-SZK23HMCVP`
   
3. **Advanced Settings (Optional):**
   - Fields to Set:
     - `anonymize_ip` = `true`
     - `allow_google_signals` = `false`
     - `send_page_view` = `true`

4. **Triggering:**
   - Click "Triggering"
   - Select **"All Pages"**

5. **Name & Save:**
   - Name: `GA4 - Configuration`
   - Click **"Save"**

---

## 🛒 Step 3: E-commerce Event Tags

### 3.1 Purchase Event
1. **New Tag**
2. **Tag Configuration:**
   - Select **"Google Analytics: GA4 Event"**
   - **Event Name:** `purchase`

3. **Parameters:**
   - `currency` = `{{Event - currency}}` (create variable if needed)
   - `transaction_id` = `{{Event - transaction_id}}`
   - `value` = `{{Event - value}}`

4. **Triggering:**
   - Create Custom Event trigger
   - **Event name:** `purchase`
   - Name trigger: `Purchase Event`

5. **Save as:** `GA4 - Purchase Event`

### 3.2 Begin Checkout Event
1. **New Tag**
2. **Tag Configuration:**
   - **Event Name:** `begin_checkout`

3. **Parameters:**
   - `currency` = `{{Event - currency}}`
   - `value` = `{{Event - value}}`

4. **Triggering:**
   - Custom Event: `begin_checkout`

5. **Save as:** `GA4 - Begin Checkout`

---

## 📥 Step 4: Download Tracking

### 4.1 Download Event Tag
1. **New Tag**
2. **Event Name:** `file_download`
3. **Parameters:**
   - `file_name` = `{{Event - file_name}}`
   - `link_url` = `{{Event - link_url}}`

4. **Trigger:** Custom Event `download`
5. **Save as:** `GA4 - File Download`

---

## 📝 Step 5: Form Submission Tracking

### 5.1 Form Submit Tag
1. **New Tag**
2. **Event Name:** `form_submit`
3. **Parameters:**
   - `form_id` = `{{Event - form_id}}`
   - `form_type` = `{{Event - form_type}}`

4. **Trigger:** Custom Event `form_submit`
5. **Save as:** `GA4 - Form Submit`

---

## 🎯 Step 6: Custom RinaWarp Events

### 6.1 Pricing Plan Selected
1. **New Tag**
2. **Event Name:** `pricing_plan_selected`
3. **Parameters:**
   - `plan_type` = `{{Event - plan_type}}`

4. **Trigger:** Custom Event `pricing_plan_selected`
5. **Save as:** `GA4 - Pricing Plan Selected`

### 6.2 Feature Usage
1. **New Tag**
2. **Event Name:** `feature_use`
3. **Parameters:**
   - `feature_name` = `{{Event - feature_name}}`
   - `context` = `{{Event - context}}`

4. **Trigger:** Custom Event `feature_use`
5. **Save as:** `GA4 - Feature Use`

---

## 🔧 Step 7: Variables Setup

### 7.1 Built-in Variables
Enable these built-in variables:
- Click **"Variables"** → **"Configure"**
- Enable:
  - ✅ Page URL
  - ✅ Page Title  
  - ✅ Referrer
  - ✅ Event (for dataLayer events)

### 7.2 Custom Variables
Create these dataLayer variables:

1. **Event - currency**
   - Variable Type: Data Layer Variable
   - Data Layer Variable Name: `currency`

2. **Event - transaction_id**
   - Variable Type: Data Layer Variable  
   - Data Layer Variable Name: `transaction_id`

3. **Event - value**
   - Variable Type: Data Layer Variable
   - Data Layer Variable Name: `value`

4. **Event - file_name**
   - Variable Type: Data Layer Variable
   - Data Layer Variable Name: `file_name`

5. **Event - plan_type**
   - Variable Type: Data Layer Variable
   - Data Layer Variable Name: `plan_type`

---

## 🚀 Step 8: Publish Container

1. **Click "Submit" (top right)**
2. **Version Name:** `GTM Setup - RinaWarp Terminal Analytics`
3. **Version Description:** 
   ```
   Initial GTM setup for RinaWarp Terminal:
   - GA4 configuration (G-SZK23HMCVP)
   - E-commerce tracking (purchase, checkout)
   - Download tracking
   - Form submission tracking
   - Custom RinaWarp events
   ```
4. **Click "Publish"**

---

## 🧪 Step 9: Test Your Setup

### 9.1 Preview Mode
1. **Click "Preview"** in GTM
2. **Enter your website URL**
3. **Navigate and test:**
   - Page views fire
   - Button clicks tracked
   - Download events work
   - Form submissions tracked

### 9.2 Live Testing
1. **Visit:** `https://yoursite.railway.app/gtm-test.html`
2. **Test event buttons**
3. **Check dataLayer contents**

### 9.3 GA4 Real-time
1. **Open GA4 dashboard**
2. **Go to:** Reports → Real-time
3. **Navigate your site**
4. **Verify events appear in real-time**

---

## 🔍 Quick Troubleshooting

### GTM Not Loading:
- Check browser console for errors
- Verify GTM container is published
- Check CSP headers allow googletagmanager.com

### Events Not Firing:
- Use GTM Preview mode
- Check dataLayer in browser console: `console.log(window.dataLayer)`
- Verify trigger conditions match event names

### GA4 Not Receiving Data:
- Confirm GA4 Configuration tag fires on All Pages
- Check GA4 real-time reports
- Verify Measurement ID is correct

---

## 📈 Advanced Configuration (Optional)

### Enhanced E-commerce
Add these parameters to purchase/checkout events:
- `items` array with product details
- `item_id`, `item_name`, `item_category`
- `quantity`, `price`

### Conversion Tracking
1. **In GA4:** Admin → Conversions
2. **Mark events as conversions:**
   - `purchase` (auto-converted)
   - `begin_checkout`
   - `file_download`
   - Custom goals

### Google Ads Integration
1. **Link GA4 to Google Ads**
2. **Import conversions from GA4**
3. **Set up remarketing audiences**

---

## ✅ Success Checklist

After configuration, verify:

- [ ] GTM container published and live
- [ ] GA4 Configuration tag firing on all pages
- [ ] Purchase events tracked in GA4
- [ ] Download events working
- [ ] Form submissions tracked
- [ ] Real-time data flowing to GA4
- [ ] No console errors on website

---

## 🆘 Need Help?

**Common Issues:**
- **Container not published:** Click "Submit" then "Publish"
- **Events not firing:** Check trigger event names match dataLayer
- **GA4 no data:** Verify Measurement ID and configuration tag

**Testing Tools:**
- GTM Preview Mode
- Browser Developer Tools
- GA4 Real-time reports
- GA4 DebugView (if available)

---

## 📝 Your Configuration Summary

- **GTM Container:** GTM-5LDNPV8Z
- **GA4 Property:** G-SZK23HMCVP
- **Events Tracked:** purchase, begin_checkout, download, form_submit, pricing_plan_selected, feature_use
- **Deployment:** Railway (Node.js server)
- **Test Page:** /gtm-test.html
