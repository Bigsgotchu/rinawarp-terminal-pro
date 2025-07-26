# Facebook API Setup Guide for RinaWarp Social Analytics

## Step 1: Create Facebook Developer Account

1. **Go to Facebook Developers**: https://developers.facebook.com/
2. **Sign in** with your Facebook account (the one associated with your business page)
3. **Click "Get Started"** if you're new to Facebook for Developers

## Step 2: Create a Facebook App

1. **Click "Create App"** on the developer dashboard
2. **Select "Business"** as the app type
3. **Fill in app details**:
   - App Name: `RinaWarp Social Analytics`
   - App Contact Email: Your business email
   - Business Account: Select your business account if you have one

## Step 3: Add Facebook Login Product

1. **In your app dashboard**, click "Add Product"
2. **Find "Facebook Login"** and click "Set Up"
3. **Configure Settings**:
   - Valid OAuth Redirect URIs: `https://your-domain.com/auth/facebook/callback`
   - Client OAuth Login: Yes
   - Web OAuth Login: Yes

## Step 4: Add Pages API Product

1. **Click "Add Product"** again
2. **Find "Pages API"** and click "Set Up"
3. This allows you to read your page's posts, comments, and engagement data

## Step 5: Get Your API Credentials

### App ID and App Secret:
1. **Go to Settings > Basic** in your app dashboard
2. **Copy your App ID** (this is public)
3. **Copy your App Secret** (keep this secure!)

### Access Token:
1. **Go to Tools > Graph API Explorer**
2. **Select your app** from the dropdown
3. **Add permissions**:
   - `pages_read_engagement` - Read page posts and engagement
   - `pages_show_list` - Access your pages
   - `public_profile` - Basic profile info
4. **Generate Access Token**
5. **Convert to Long-lived Token** (expires in 60 days instead of 1 hour)

## Step 6: Get Page Access Token

1. **Use the Graph API Explorer** or make this API call:
   ```
   GET /me/accounts?access_token={your-user-access-token}
   ```
2. **Find your page** in the response
3. **Copy the page access token** - this is what you'll use for data collection

## Step 7: Required Permissions

For RinaWarp Social Analytics, you'll need these permissions:

### Page Permissions:
- `pages_read_engagement` - Read post engagement metrics
- `pages_show_list` - List pages you manage
- `pages_read_user_content` - Read posts on your page

### User Permissions:
- `public_profile` - Basic profile information
- `email` - Email address (optional)

## Step 8: App Review Process

For production use, you'll need to submit your app for review:

1. **Go to App Review** in your dashboard
2. **Request the permissions** you need
3. **Provide detailed use case** for each permission
4. **Show how data will be used** (for testimonials and analytics)
5. **Submit for review** (can take 1-7 days)

## Step 9: Environment Variables

Save these securely:

```bash
# Facebook API Credentials
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_token_here
FACEBOOK_PAGE_ID=your_page_id_here
```

## Step 10: Test Your Setup

Use Facebook's Graph API Explorer to test:

1. **Go to**: https://developers.facebook.com/tools/explorer/
2. **Test endpoint**: `/YOUR_PAGE_ID/posts`
3. **Should return** your page's recent posts

## Important Notes:

⚠️ **Development vs Production**:
- Development mode: Only you can use the app
- Live mode: Requires app review for most permissions

🔒 **Security**:
- Never commit API secrets to version control
- Use environment variables or secret management
- Rotate tokens regularly

📊 **Rate Limits**:
- Facebook has rate limits on API calls
- Standard rate: 200 calls per hour per user
- Business verification can increase limits

🔄 **Token Expiration**:
- User tokens expire (1 hour default, 60 days for long-lived)
- Page tokens don't expire but depend on user token
- Set up token refresh logic

## Useful API Endpoints:

```bash
# Get page posts
GET /{page-id}/posts?fields=message,created_time,likes.summary(true),comments.summary(true),shares

# Get post details
GET /{post-id}?fields=message,created_time,likes.summary(true),comments.summary(true)

# Get page info
GET /{page-id}?fields=name,followers_count,fan_count

# Get comments on a post
GET /{post-id}/comments?fields=message,created_time,from,like_count
```

## Next Steps:

1. Create your Facebook app following these steps
2. Save your credentials securely
3. Test API access with Graph API Explorer
4. Deploy the Cloud Functions with your credentials
5. Set up automated data collection

For help with any step, check Facebook's developer documentation at:
https://developers.facebook.com/docs/
