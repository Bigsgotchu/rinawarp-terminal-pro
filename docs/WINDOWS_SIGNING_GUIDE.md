# Windows Code Signing Setup Guide

## Step 1: Purchase a Code Signing Certificate

### Recommended Certificate Authorities:
- **DigiCert**: https://www.digicert.com/code-signing
- **Sectigo (formerly Comodo)**: https://sectigo.com/ssl-certificates/code-signing
- **GlobalSign**: https://www.globalsign.com/en/code-signing-certificate

### Certificate Types:
- **Standard Code Signing**: ~$200-400/year
- **EV Code Signing**: ~$400-700/year (recommended for better reputation)

## Step 2: Certificate Validation Process

1. **Complete purchase** and provide required documentation:
   - Business registration documents (for organizations)
   - Phone number for verification
   - Email address for domain validation

2. **Validation call**: The CA will call to verify your identity

3. **Certificate issuance**: Usually takes 1-5 business days

## Step 3: Certificate Installation

### For Standard Code Signing:
1. Download the certificate from the CA
2. Install it in Windows Certificate Store:
   ```powershell
   # Run as Administrator
   certutil -importpfx "your-certificate.pfx"
   ```

### For EV Code Signing:
- Usually comes on a USB token
- Install the token drivers provided by the CA

## Step 4: Export as PFX (if needed)

If you received separate .crt and .key files:

```powershell
# Using OpenSSL (install from https://slproweb.com/products/Win32OpenSSL.html)
openssl pkcs12 -export -out certificate.pfx -inkey private.key -in certificate.crt
```

## Step 5: Test Certificate

```powershell
# View certificate details
certutil -dump certificate.pfx

# Test signing a file
signtool sign /f certificate.pfx /p "your_password" /t http://timestamp.digicert.com test.exe
```

## Step 6: Update .env.local

```env
# Windows Code Signing
WIN_CSC_LINK=/path/to/your/certificate.pfx
WIN_CSC_KEY_PASSWORD=your_pfx_password
```

## Cross-Platform Development Note

If you're developing on macOS but need to sign for Windows:

1. You can still purchase and use a Windows certificate
2. Store the .pfx file securely on your macOS machine
3. Electron-builder will handle cross-platform signing

## Important Security Notes:

- **Never commit** certificates to version control
- Store certificates in a secure location
- Use strong passwords for PFX files
- Consider using a hardware token for EV certificates
- Renew certificates before expiration (usually 1-3 years)

## Timestamp Servers:

Always use a timestamp server when signing:
- DigiCert: http://timestamp.digicert.com
- Sectigo: http://timestamp.sectigo.com
- GlobalSign: http://timestamp.globalsign.com/scripts/timstamp.dll

This ensures your signed apps remain valid even after certificate expiration.
