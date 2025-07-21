# macOS Code Signing Setup Guide

## Step 1: Create Apple Developer Account

1. Visit https://developer.apple.com
2. Click "Account" in the top navigation
3. Sign in with your Apple ID or create a new one
4. Enroll in the Apple Developer Program ($99/year)
   - Choose "Individual" or "Organization" based on your needs
   - Complete the enrollment process

## Step 2: Create Developer ID Application Certificate

1. Once enrolled, go to https://developer.apple.com/account/resources/certificates/list
2. Click the "+" button to create a new certificate
3. Select "Developer ID Application" under "Software"
4. Follow the Certificate Signing Request (CSR) instructions:
   
   ### Creating a CSR on macOS:
   ```bash
   # Open Keychain Access
   open -a "Keychain Access"
   ```
   
   - In Keychain Access: Certificate Assistant > Request a Certificate from a Certificate Authority
   - Enter your email and name
   - Select "Saved to disk"
   - Save the CSR file

5. Upload the CSR file to Apple Developer portal
6. Download the generated certificate
7. Double-click to install it in Keychain Access

## Step 3: Export Certificate as .p12

1. Open Keychain Access
2. Find your "Developer ID Application" certificate
3. Right-click > Export
4. Choose .p12 format
5. Set a strong password (you'll need this for CSC_KEY_PASSWORD)
6. Save to a secure location

## Step 4: Get Your Team ID

1. Visit https://developer.apple.com/account
2. Your Team ID is displayed in the membership section
3. It's a 10-character alphanumeric string (e.g., "ABC1234567")

## Step 5: Create App-Specific Password

1. Visit https://appleid.apple.com
2. Sign in and go to "Security"
3. Under "App-Specific Passwords", click "Generate Password"
4. Name it "RinaWarp Terminal Notarization"
5. Save the generated password securely

## Step 6: Update .env.local

Update your .env.local file with the actual values:

```env
# macOS Code Signing
CSC_LINK=/path/to/your/certificate.p12
CSC_KEY_PASSWORD=your_p12_password
APPLE_ID=your.email@example.com
APPLE_ID_PASSWORD=xxxx-xxxx-xxxx-xxxx  # App-specific password
APPLE_TEAM_ID=ABC1234567  # Your 10-character Team ID
```

## Important Notes:

- Keep your certificate and passwords secure
- The certificate expires after 5 years
- You'll need to notarize your app for macOS 10.15+ (Catalina and later)
- The app-specific password is different from your Apple ID password
