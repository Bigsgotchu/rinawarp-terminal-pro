# 🔑 **RinaWarp Terminal - Complete API Keys Setup Guide**

**Your Current Status:** ✅ **Stripe keys already configured!**

Based on your current setup, here's what you have and what you still need:

## 📋 **Current Keys Status**

### ✅ **ALREADY CONFIGURED**
- **Stripe Secret Key:** ✅ `sk_live_...` (Production ready!)
- **Stripe Publishable Key:** ✅ `pk_live_...` (Production ready!)
- **Stripe Webhook Secret:** ✅ `whsec_...` (Configured)
- **Stripe Price IDs:** ✅ All plans configured (Personal, Professional, Team, Beta)
- **Sentry DSN:** ✅ Error tracking configured

### ❌ **MISSING KEYS TO GET**
1. **Email Service** (REQUIRED for license delivery)
2. **Security Keys** (REQUIRED for encryption)
3. **AI Service Keys** (OPTIONAL but recommended)
4. **Analytics Keys** (OPTIONAL for tracking)

---

## 🚀 **STEP-BY-STEP KEY ACQUISITION**

### **1. 📧 EMAIL SERVICE SETUP (REQUIRED)**

**Choose Option A OR Option B:**

#### **Option A: SendGrid (Recommended - Easier Setup)**

1. **Create SendGrid Account:**
   - Go to: https://sendgrid.com/
   - Click "Start for Free"
   - Complete signup with your email

2. **Get API Key:**
   ```
   - Login to SendGrid Dashboard
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name it: "RinaWarp Terminal Production"
   - Select "Restricted Access"
   - Enable: Mail Send permissions
   - Copy the API key (starts with SG....)
   ```

3. **Verify Sender Email:**
   ```
   - Go to Settings → Sender Authentication
   - Click "Authenticate Your Domain" or "Single Sender Verification"
   - Add: noreply@rinawarptech.com
   - Complete verification process
   ```

**Your SendGrid Keys:**
```bash
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@rinawarptech.com
```

#### **Option B: Gmail SMTP (Alternative)**

1. **Enable 2-Factor Authentication:**
   - Go to: https://myaccount.google.com/security
   - Enable 2FA if not already enabled

2. **Generate App Password:**
   ```
   - Go to Google Account settings
   - Security → App passwords
   - Generate password for "RinaWarp Terminal"
   - Copy the 16-character password
   ```

**Your SMTP Keys:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16_character_app_password
SMTP_FROM_EMAIL=noreply@rinawarptech.com
```

### **2. 🔐 SECURITY KEYS (REQUIRED)**

Generate these securely using OpenSSL:

```bash
# Run these commands in your terminal:
openssl rand -hex 32  # For ENCRYPTION_KEY
openssl rand -hex 16  # For ENCRYPTION_SALT  
openssl rand -hex 32  # For JWT_SECRET
```

**Your Security Keys:**
```bash
ENCRYPTION_KEY=your_32_byte_hex_key_here
ENCRYPTION_SALT=your_16_byte_hex_salt_here
JWT_SECRET=your_32_byte_jwt_secret_here
```

### **3. 🤖 AI SERVICE KEYS (OPTIONAL)**

#### **ElevenLabs Voice AI (Recommended)**

1. **Create ElevenLabs Account:**
   - Go to: https://elevenlabs.io/
   - Sign up for free account
   - Verify your email

2. **Get API Key:**
   ```
   - Login to ElevenLabs
   - Go to Profile → API Keys
   - Copy your API key
   ```

**Your ElevenLabs Key:**
```bash
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL  # Bella voice (default)
```

#### **OpenAI API (Optional)**

1. **Create OpenAI Account:**
   - Go to: https://platform.openai.com/
   - Sign up or login
   - Add payment method (required for API access)

2. **Get API Key:**
   ```
   - Go to API Keys section
   - Create new secret key
   - Copy the key (starts with sk-)
   ```

**Your OpenAI Key:**
```bash
OPENAI_API_KEY=sk-your_openai_key_here
```

### **4. 📊 ANALYTICS KEYS (OPTIONAL)**

#### **Google Analytics 4**

1. **Create GA4 Property:**
   - Go to: https://analytics.google.com/
   - Create new property for rinawarptech.com
   - Get Measurement ID (starts with G-)

2. **Create API Secret:**
   ```
   - In GA4, go to Admin → Data Streams
   - Click your web stream
   - Go to Measurement Protocol API secrets
   - Create new secret
   ```

**Your GA4 Keys:**
```bash
GA_MEASUREMENT_ID=G-YOUR_MEASUREMENT_ID
GA_API_SECRET=your_api_secret_here
```

---

## 🛠️ **AUTOMATED SETUP SCRIPT**

I'll create a script that generates your security keys and helps you configure everything:

