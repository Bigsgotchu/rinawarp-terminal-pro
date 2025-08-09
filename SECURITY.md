# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.3.x   | :white_check_mark: |
| 1.2.x   | :white_check_mark: |
| < 1.2   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in RinaWarp Terminal, please:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to: security@rinawarp.com
3. Include detailed information about the vulnerability
4. Allow 48 hours for initial response

## Security Features

- ✅ Private repository with controlled access
- ✅ Enhanced AI features gated by subscription tiers
- ✅ Encrypted API keys and sensitive data
- ✅ Secure payment processing through Stripe
- ✅ No sensitive data stored in browser localStorage

## Tier Gating Protection

Enhanced AI features are restricted to Professional+ tiers:
- Code analysis and debugging requires `ai_advanced` feature flag
- Tier validation happens both client and server-side
- Free tier users see upgrade prompts instead of advanced features

Thank you for helping keep RinaWarp Terminal secure!