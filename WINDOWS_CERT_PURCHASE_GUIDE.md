# Windows Code Signing Certificate Purchase Guide

## Recommended Providers & Pricing

### 1. **Sectigo (Recommended - Best Value)**
- **Standard Code Signing**: $199/year
- **EV Code Signing**: $359/year
- **Link**: https://sectigo.com/ssl-certificates-tls/code-signing
- **Benefits**: Good reputation, affordable, quick issuance

### 2. **DigiCert (Premium Option)**
- **Standard Code Signing**: $474/year
- **EV Code Signing**: $574/year
- **Link**: https://www.digicert.com/code-signing/
- **Benefits**: Industry leader, excellent support, fastest trust building

### 3. **SSL.com (Budget Option)**
- **Standard Code Signing**: $159/year
- **EV Code Signing**: $299/year
- **Link**: https://www.ssl.com/certificates/code-signing/
- **Benefits**: Lowest cost, same security level

## Certificate Type Recommendation

**For RinaWarp Terminal: Choose EV (Extended Validation) Code Signing**

### Why EV is Better:
- **Immediate SmartScreen Trust**: No "Unknown Publisher" warnings
- **Faster Reputation Building**: Windows recognizes it immediately
- **Better User Experience**: Users see green checkmarks and company name
- **Professional Appearance**: Shows as verified publisher

## Required Information for Purchase

### Business Information:
- **Company Name**: RinaWarp Technologies (or your registered business name)
- **Business Address**: Your registered business address
- **Phone Number**: Business phone number
- **Business Registration**: May need business license or incorporation docs

### Technical Contact:
- **Name**: Your name
- **Email**: rinawarptechnologies25@gmail.com
- **Phone**: Your phone number

### Certificate Details:
- **Common Name**: RinaWarp Technologies
- **Organization**: RinaWarp Technologies
- **Country**: Your country
- **State/Province**: Your state/province
- **City**: Your city

## Purchase Process Steps

### Step 1: Choose Provider and Certificate Type
1. Visit recommended provider website
2. Select "EV Code Signing Certificate"
3. Choose 1-year term initially

### Step 2: Complete Application
1. Fill out organization details
2. Provide contact information
3. Submit business verification documents

### Step 3: Validation Process (2-7 days)
1. **Document Verification**: Business license, incorporation papers
2. **Phone Verification**: Provider calls your business number
3. **Email Verification**: Confirm email addresses
4. **Address Verification**: May send physical mail

### Step 4: Certificate Generation
1. Generate CSR (Certificate Signing Request)
2. Complete certificate issuance
3. Download certificate files

### Step 5: Hardware Token (EV Only)
- EV certificates require USB hardware token
- Provider ships token to verified address
- Token contains private key for security

## Immediate Action Items

### 1. **Sectigo EV Code Signing** (Recommended)
- **Cost**: $359/year
- **Link**: https://sectigo.com/ssl-certificates-tls/code-signing
- **Timeline**: 3-5 business days after validation

### 2. **Prepare Business Documents**
- Business license or incorporation certificate
- Utility bill or bank statement (address verification)
- Government-issued ID (personal verification)

### 3. **Set Up Business Phone**
- Ensure business phone number is active
- Provider will call this number for verification

## Next Steps After Purchase

1. **Generate CSR** (we'll do this together)
2. **Complete validation process**
3. **Receive hardware token** (EV certificates)
4. **Install certificate** in development environment
5. **Test signing process** with sample files
6. **Configure CI/CD pipeline** for automated signing

## Emergency Backup Plan

If you need to release quickly before EV validation:
1. **Purchase Standard Certificate** first ($199 from Sectigo)
2. **Use it temporarily** while EV processes
3. **Switch to EV** once available
4. **Standard builds trust over time** but starts with warnings

Would you like me to help you start the purchase process with Sectigo?
