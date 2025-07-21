# AI Provider API Keys Configuration Guide

## Overview
This guide will help you obtain and configure API keys for the AI providers supported by RinaWarp AI Cloud Service.

## Supported Providers

### 1. OpenAI (GPT-3.5, GPT-4)
1. **Sign up** at https://platform.openai.com/signup
2. **Navigate** to API Keys: https://platform.openai.com/api-keys
3. **Create** a new API key
4. **Copy** the key (you won't be able to see it again!)
5. **Add** to your `.env` file:
   ```
   OPENAI_API_KEY=sk-...your-key-here...
   ```

**Pricing**: https://openai.com/pricing
- GPT-3.5-turbo: ~$0.002 per 1K tokens
- GPT-4: ~$0.03 per 1K tokens

### 2. Anthropic (Claude)
1. **Sign up** at https://console.anthropic.com/
2. **Navigate** to API Keys in your account settings
3. **Create** a new API key
4. **Copy** the key
5. **Add** to your `.env` file:
   ```
   ANTHROPIC_API_KEY=sk-ant-...your-key-here...
   ```

**Pricing**: https://www.anthropic.com/pricing
- Claude 3 Sonnet: ~$0.003 per 1K input tokens

### 3. Google AI (Gemini) - Coming Soon
Currently not implemented but reserved for future use:
```
GOOGLE_API_KEY=your-google-key
```

## Testing Your Configuration

1. **Stop** your server if it's running (Ctrl+C)

2. **Update** your `.env` file with at least one valid API key

3. **Restart** the server:
   ```bash
   npm start
   ```

4. **Check** the logs for successful initialization:
   ```
   ✅ OpenAI provider ready
   ✅ Anthropic provider ready
   ```

5. **Test** with the client:
   ```bash
   node test-client.js
   ```

## Using Different Providers

### Via REST API
```javascript
// Use default provider
const response = await fetch('http://localhost:3000/api/ai/completion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Hello, AI!"
  })
});

// Use specific provider
const response = await fetch('http://localhost:3000/api/ai/completion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Hello, AI!",
    provider: "anthropic",  // or "openai"
    model: "claude-3-sonnet-20240229"  // optional
  })
});
```

### Via WebSocket
```javascript
socket.emit('ai:prompt', {
  prompt: "Tell me a story",
  options: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.8
  }
});
```

## Troubleshooting

### No providers available
- Check that your API keys are correctly set in `.env`
- Ensure you've restarted the server after updating `.env`
- Look for initialization errors in the server logs

### Rate limits
- Both OpenAI and Anthropic have rate limits
- The service will automatically fallback to another provider if available
- Consider implementing caching for frequently requested prompts

### Invalid API key errors
- Double-check that you've copied the entire key
- Ensure there are no extra spaces or quotes
- Verify your account has API access enabled

## Security Notes
- **Never** commit your `.env` file to version control
- **Never** expose API keys in client-side code
- Consider using environment-specific keys (dev/staging/production)
- Monitor your API usage to prevent unexpected charges
