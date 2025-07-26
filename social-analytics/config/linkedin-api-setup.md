# LinkedIn API Setup Guide for RinaWarp Social Analytics

## Step 1: Create LinkedIn Developer Account

1. **Go to LinkedIn Developers**: https://developer.linkedin.com/
2. **Sign in** with your LinkedIn account
3. **Create a LinkedIn Developer Account** if you haven't already

## Step 2: Create a LinkedIn App

1. **Click "Create App"** on the developer dashboard
2. **Fill in app details**:
   - App Name: `RinaWarp Social Analytics`
   - LinkedIn Company Page: Select your RinaWarp Technologies page
   - Privacy Policy URL: Your privacy policy URL
   - App Logo: Upload your RinaWarp logo
3. **Accept Terms** and create the app

## Step 3: Configure App Products

1. **In your app dashboard**, go to the "Products" tab
2. **Request access to**:
   - **Sign In with LinkedIn using OpenID Connect** (for authentication)
   - **Share on LinkedIn** (for posting content)
   - **Marketing Developer Platform** (for detailed analytics - requires approval)

## Step 4: Get Your API Credentials

1. **Go to the "Auth" tab** in your app dashboard
2. **Copy your credentials**:
   - Client ID (public)
   - Client Secret (keep secure!)
3. **Set OAuth 2.0 Redirect URLs**:
   - Add: `https://your-domain.com/auth/linkedin/callback`

## Step 5: Required Scopes

For RinaWarp Social Analytics, request these scopes:

### Basic Scopes:
- `openid` - OpenID Connect authentication
- `profile` - Basic profile information
- `email` - Email address

### Company/Organization Scopes:
- `w_compliance` - Compliance and legal data access
- `r_organization_social` - Read organization's social content
- `rw_organization_admin` - Manage organization pages

### Content Scopes:
- `w_member_social` - Post content on behalf of members
- `r_member_social` - Read member's social content

## Step 6: Authentication Flow

LinkedIn uses OAuth 2.0 for authentication:

1. **Authorization URL**:
   ```
   https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&scope={scopes}
   ```

2. **Token Exchange**:
   ```bash
   POST https://www.linkedin.com/oauth/v2/accessToken
   Content-Type: application/x-www-form-urlencoded
   
   grant_type=authorization_code&code={authorization_code}&client_id={client_id}&client_secret={client_secret}&redirect_uri={redirect_uri}
   ```

## Step 7: Environment Variables

Save these securely:

```bash
# LinkedIn API Credentials
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_ACCESS_TOKEN=your_access_token_here
LINKEDIN_COMPANY_ID=your_company_id_here
```

## Step 8: Important API Endpoints

```bash
# Get company info
GET https://api.linkedin.com/v2/organizations/{company-id}

# Get company posts
GET https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:organization:{company-id}

# Get post analytics
GET https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:{company-id}

# Get follower statistics
GET https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:{company-id}
```

## Step 9: Rate Limits

- **Throttle limits**: LinkedIn has complex rate limiting
- **Daily limits**: Vary by product and approval status
- **Best practice**: Implement exponential backoff and respect rate limit headers

## Step 10: App Review Process

For production features:

1. **Go to "Products" tab** in your app dashboard
2. **Click "Request Access"** for each product you need
3. **Provide detailed use case** explaining how you'll use the data
4. **Submit for review** (can take 7-14 days)

## Important Notes:

⚠️ **LinkedIn API Changes**:
- LinkedIn frequently updates their API
- Some endpoints require partner status
- Marketing API access is limited

🔒 **Security**:
- Use HTTPS for all API calls
- Store tokens securely
- Implement proper token refresh logic

📊 **Data Access**:
- Personal profiles: Limited access
- Company pages: Better access if you're an admin
- Analytics: Requires Marketing Developer Platform approval

## Next Steps:

1. Create your LinkedIn app following these steps
2. Request necessary product access
3. Get approved for required scopes
4. Implement OAuth flow for token generation
5. Test API access with your company page

For detailed documentation:
https://docs.microsoft.com/en-us/linkedin/
