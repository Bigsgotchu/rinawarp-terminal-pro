# PostHog Setup Guide

## Quick Setup (5 minutes)

1. **Sign up for PostHog**
   - Go to https://posthog.com/
   - Click "Get started - free"
   - Sign up with GitHub or email

2. **Create Organization & Project**
   - Organization: `RinaWarp Technologies`
   - Project Name: `RinaWarp Terminal`
   - Choose: US or EU cloud (US recommended for performance)

3. **Get Your Project API Key**
   - Go to Project Settings → Project API Key
   - Copy the key that starts with `phc_`
   - Example: `phc_1234567890abcdef...`

4. **Update .env.monitoring**
   ```bash
   POSTHOG_SDK_KEY=phc_1234567890abcdef...
   ```

## Features for Seer AI Debugger:
- Error tracking with AI insights
- Feature flags for gradual rollouts
- User behavior analytics
- A/B testing capabilities

## Free Tier Includes:
- 1 million events/month
- Unlimited team members
- All product analytics features
- 1 year data retention
