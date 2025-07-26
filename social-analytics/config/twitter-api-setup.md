# Twitter/X API Setup Guide for RinaWarp Social Analytics

## Step 1: Create Twitter Developer Account

1. **Go to Twitter Developer Platform**: https://developer.twitter.com/
2. **Log in** with your Twitter account
3. **Apply for a Developer Account**, if you haven't already

## Step 2: Create a Twitter/X App

1. **Go to the Developer Dashboard**
2. **Click "Create App"**
3. **Fill in app details**:
   - App Name: `RinaWarp Social Analytics`
   - Description: "Analytics for Twitter engagement and posts"
   - Website URL: Your company's website

## Step 3: Set App Permissions

1. **Go to "Apps"** in your Twitter Developer Dashboard
2. **Click your app**
3. **Set App Permissions**:
   - **Read and Write** for most applications
   - **Read, Write, and Direct Messages** if needed

## Step 4: Generate API Keys and Tokens

1. **In your app settings**, go to the "Keys and Tokens" tab
2. **Generate keys**:
   - **Consumer API Key and Secret**
   - **Access Token and Secret**

3. **Create Bearer Token**:
   - **OAuth 2.0 Bearer Token** for application-only authentication

## Step 5: Required API Scopes

For RinaWarp Social Analytics, the following APIs are required:

### Standard APIs:
- **Tweets and Engagement**: For reading tweets, likes, retweets, and replies
- **User Profile**: To get user's profile metadata

### Premium APIs (Optional):
- **Search Tweets**: For searching historical tweets
- **Account Activity API**: To get real-time updates (webhooks required)

## Step 6: Environment Variables

Save these securely in a config file or secret manager:

```bash
# Twitter/X API Keys
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_SECRET=your_access_secret_here
TWITTER_BEARER_TOKEN=your_bearer_token_here
```

## Step 7: Important API Endpoints

```bash
# Get user's tweets
GET https://api.twitter.com/2/tweets?ids={ids}

# Search tweets
GET https://api.twitter.com/2/tweets/search/recent?query={query}

# Get user profile
GET https://api.twitter.com/2/users/{user_id}

# Get tweet metrics
GET https://api.twitter.com/2/tweets?ids={ids}&tweet.fields=public_metrics
```

## Step 8: Rate Limits

- **Standard Rate Limits**: 900 requests per 15-minute window
- **Premium Rate Limits**: Varies by endpoint and subscription

### Tips:
- Use application-only authentication or user authentication as needed
- Implement exponential backoff for rate limits
- Monitor rate limits with the response headers

## Step 9: Advanced Setup

1. **Webhooks**: Use Account Activity API for real-time updates
2. **Streaming**: Use filtered stream for ongoing data collection
3. **Data Enrichment**: Use Premium APIs for richer data

## Important Notes:

⚠️ **Security**:
- Never share your keys publicly
- Use environment variables or encrypted storage

🛠️ **Tooling**:
- Use libraries like `tweepy`, `twitter4j`, or `Twython` for common tasks

📑 **Documentation**:
- Twitter API Documentation: https://developer.twitter.com/en/docs/twitter-api

## Next Steps:

1. Create your Twitter/X app and generate API keys
2. Save your credentials securely following the steps
3. Implement API calls using the authenticated client
4. Test API access on your Twitter account

For support, consult Twitter's developer forums or documentation.
