# 🛡️ SENTRY CLI SETUP GUIDE

I've installed Sentry CLI (v2.52.0) and opened your Sentry dashboard. Let's get you set up with a new secure DSN!

## 🚨 **FIRST: REVOKE EXPOSED DSN**

The old exposed DSN was:
```
https://4c22d2c576b2d0ebbeda9941d59fff95@o4509759638536192.ingest.us.sentry.io/4509759649087488
```

### Step 1: Delete/Regenerate Old DSN
1. **Go to your RinaWarp project** in Sentry dashboard (already open)
2. **Click "Settings" → "Client Keys (DSN)"**
3. **Find the exposed DSN** and either:
   - **Delete it** (recommended)
   - **Regenerate it** (creates new one)

---

## ✅ **CREATE NEW SECURE SENTRY PROJECT**

### Step 2: Create New Project (Recommended)
1. **Click "Create Project"** in Sentry dashboard
2. **Select platform**: "Node.js" or "JavaScript"
3. **Project name**: `rinawarp-production`
4. **Team**: Select your team or create new one
5. **Click "Create Project"**

### Step 3: Get Your New DSN
After creating the project, you'll see:
```
SENTRY_DSN=https://YOUR_NEW_SECURE_DSN_HERE
```

---

## 🔧 **SENTRY CLI SETUP**

### Step 4: Login to Sentry CLI
```bash
# Login to Sentry (will open browser for authentication)
sentry-cli login

# Or use auth token (more secure for automation)
sentry-cli login --auth-token YOUR_AUTH_TOKEN
```

### Step 5: Create Sentry Configuration
```bash
# Create .sentryclirc file for project settings
cat > .sentryclirc << EOF
[defaults]
url=https://sentry.io/
org=YOUR_ORG_SLUG
project=rinawarp-production

[auth]
token=YOUR_AUTH_TOKEN_HERE
EOF

# Add to .gitignore (contains sensitive token)
echo ".sentryclirc" >> .gitignore
```

---

## 🛠️ **ADD DSN TO YOUR ENVIRONMENT**

### Option 1: Manual Addition
```bash
# Add new Sentry DSN to .env
echo "SENTRY_DSN=https://YOUR_NEW_DSN_FROM_SENTRY_DASHBOARD" >> .env
```

### Option 2: Interactive Script
```bash
# I'll create a script to help you add it interactively
./update-sentry-dsn.sh
```

---

## 🧪 **SENTRY CLI COMMANDS**

### Useful Commands:
```bash
# Test your Sentry connection
sentry-cli info

# List your projects
sentry-cli projects list

# Send test event
sentry-cli send-event -m "Test message from CLI"

# Upload source maps (for debugging)
sentry-cli sourcemaps upload ./dist

# Create release
sentry-cli releases new "v1.0.0"

# Associate commits with release
sentry-cli releases set-commits "v1.0.0" --auto

# Deploy release
sentry-cli releases deploys "v1.0.0" new -e production
```

---

## 📝 **INTEGRATE SENTRY IN YOUR CODE**

### Node.js Integration:
```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 1.0,
  release: "rinawarp@1.0.0",
});

// Capture exception
try {
  // Your code here
} catch (error) {
  Sentry.captureException(error);
}

// Add breadcrumb
Sentry.addBreadcrumb({
  message: 'User clicked button',
  category: 'ui',
  level: 'info',
});
```

### Browser Integration:
```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR_PUBLIC_DSN_HERE", // Can be different from server DSN
  environment: "production",
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
});
```

---

## 🔄 **RELEASE MANAGEMENT**

### Automate Releases:
```bash
#!/bin/bash
# deploy-with-sentry.sh

VERSION=$(node -p "require('./package.json').version")

# Create release
sentry-cli releases new "$VERSION"

# Upload source maps
sentry-cli sourcemaps upload ./dist --release "$VERSION"

# Associate commits
sentry-cli releases set-commits "$VERSION" --auto

# Deploy
sentry-cli releases deploys "$VERSION" new -e production

# Finalize release
sentry-cli releases finalize "$VERSION"

echo "✅ Release $VERSION deployed with Sentry tracking"
```

---

## 🛡️ **SECURITY BEST PRACTICES**

### ✅ DO:
- **Use separate DSNs** for different environments
- **Restrict DSN to specific domains** in project settings
- **Use auth tokens** instead of storing credentials
- **Keep .sentryclirc in .gitignore**
- **Use environment variables** for DSNs
- **Set up alerts** for critical errors

### ❌ DON'T:
- **Don't commit .sentryclirc** with auth tokens
- **Don't use same DSN** for dev/staging/prod
- **Don't track sensitive data** in error reports
- **Don't ignore data scrubbing** settings

---

## 📊 **TESTING YOUR SETUP**

### Test Sentry Integration:
```bash
# Test CLI connection
sentry-cli info

# Send test error
node -e "
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
Sentry.captureException(new Error('Test error from CLI setup'));
setTimeout(() => process.exit(0), 1000);
"

# Run your environment test
node test-env.cjs
```

---

## 🎯 **QUICK SETUP STEPS**

1. **In Sentry Dashboard** (already open):
   - Delete old DSN or create new project
   - Copy new DSN

2. **Add DSN to .env**:
   ```bash
   echo "SENTRY_DSN=https://your-new-dsn" >> .env
   ```

3. **Login to Sentry CLI**:
   ```bash
   sentry-cli login
   ```

4. **Test everything**:
   ```bash
   node test-env.cjs
   sentry-cli info
   ```

---

## 🚀 **ADVANCED FEATURES**

- **Performance Monitoring**: Track slow queries and requests
- **Release Health**: Monitor crash-free sessions
- **Alerts**: Get notified of critical errors
- **Issue Assignment**: Automatically assign bugs to team members
- **Custom Dashboards**: Create metrics specific to your app

---

**🎯 Complete the dashboard steps first, then run the CLI commands to set up comprehensive error tracking for RinaWarp!**
