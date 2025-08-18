# RinaWarp Terminal - Payment & Distribution System

A complete payment and download system for RinaWarp Terminal with Stripe integration, user dashboard, email notifications, and secure license management.

## 🚀 Quick Start

### Development
```bash
# Start local development servers
./start-dev.sh

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Production Deployment
```bash
# 1. Update configuration for your domain
./update-config.sh

# 2. Configure environment variables
cp .env.production.template .env.sentry
# Edit .env.sentry with your actual values

# 3. Deploy to production
./deploy.sh production
```

## 📁 Project Structure

```
RinaWarp-Production-Final/
├── website/                  # Frontend files
│   ├── index.html           # Main landing page
│   ├── dashboard.html       # User dashboard
│   ├── main.js              # Landing page logic
│   ├── dashboard.js         # Dashboard functionality
│   ├── styles.css           # Landing page styles
│   └── dashboard.css        # Dashboard styles
├── backend/                 # Backend API server
│   ├── server.js           # Main API server
│   ├── email-service.js    # Email notifications
│   ├── logger.js           # Logging utilities
│   └── sentry-backend.js   # Error monitoring
├── dist/                   # Application binaries (you need to add these)
├── deploy.sh              # Production deployment script
├── update-config.sh       # Configuration update script
├── start-dev.sh          # Development server script
└── .env.sentry           # Environment variables
```

## 🔧 Features

### 💳 Payment Processing
- **Stripe Integration**: Secure payment processing with subscription management
- **Multiple Tiers**: Free, Pro ($9.99/month), Team ($29.99/month)
- **Free Trials**: 7-day free trial for Pro tier
- **Secure Downloads**: License-validated download links

### 👤 User Dashboard
- **License Management**: View license details, expiration, and status
- **Download Center**: Access to platform-specific downloads
- **Billing Portal**: Subscription management via Stripe
- **Support System**: Integrated support ticket system

### 📧 Email Notifications
- Purchase confirmations
- Download ready notifications
- License information emails
- Trial started notifications
- Payment failed alerts
- Support ticket confirmations

### 🔐 Security
- Token-based secure downloads
- License validation
- Rate limiting
- CORS protection
- SSL/TLS encryption
- Error monitoring with Sentry

## 🎪 **AI Features**

### **🚀 Ultra-Fast & FREE**
- **6,000 requests/minute** completely free
- **10x faster** than GPT-4 responses
- **No usage limits** or hidden costs

### **🧠 Smart Coding Assistant**
- **Instant code help** - Write, debug, explain code
- **Terminal expertise** - Perfect for command-line tasks  
- **Context aware** - Remembers your conversation
- **Multi-language** - Python, JavaScript, Go, Rust, and more

### **💡 Perfect For:**
- **Debugging errors** and understanding output
- **Learning new commands** and tools
- **Writing code** and scripts quickly
- **Explaining complex** technical concepts
- **Terminal automation** and productivity

## 📊 **Available Models**

| Model | Speed | Best For | Context |
|-------|-------|----------|---------|
| **llama-3.3-70b-versatile** | Fast | General coding, debugging | 131K tokens |
| **llama-3.1-8b-instant** | Ultra Fast | Quick questions | 131K tokens |
| **deepseek-r1-distill-llama-70b** | Fast | Code analysis | 131K tokens |

## 🎯 **Why Developers Love RinaWarp**

> *"Finally, a terminal that actually understands what I'm trying to do!"*  
> — Sarah, Full-Stack Developer

> *"The AI responses are incredibly fast and accurate. Game changer!"*  
> — Mike, DevOps Engineer  

> *"Beautiful interface + powerful AI = productivity boost!"*  
> — Lisa, Python Developer

## 🛠️ **System Requirements**

- **macOS**: 10.14+ (Intel & Apple Silicon)
- **Windows**: Windows 10+ (64-bit)  
- **Linux**: Ubuntu 18.04+ / Similar distros
- **Memory**: 4GB RAM minimum
- **Disk**: 200MB free space

## 🆘 **Need Help?**

### **Quick Troubleshooting**
- **AI not responding?** Check your Groq API key in settings
- **App won't start?** Try running as administrator (Windows) or with sudo (Linux)
- **Slow performance?** Switch to `llama-3.1-8b-instant` model for speed

### **Support Channels**
- 📧 **Email**: support@rinawarptech.com
- 💬 **Discord**: [RinaWarp Community](https://discord.gg/rinawarp)
- 📖 **Docs**: [Full Documentation](https://rinawarptech.com/docs)
- 🐛 **Issues**: [GitHub Issues](https://github.com/rinawarp/rinawarp-terminal/issues)

## 🎁 **What's Included**

✅ **Full AI Integration** - Free Groq Llama models  
✅ **Modern Terminal** - Beautiful, responsive interface  
✅ **Smart Features** - Tab completion, history, themes  
✅ **Cross-Platform** - Works on Mac, Windows, Linux  
✅ **Auto-Updates** - Always get the latest features  
✅ **Free Forever** - No subscriptions or hidden costs  

## 🚀 **Ready to Get Started?**

1. **[Download RinaWarp Terminal](https://github.com/rinawarp/rinawarp-terminal/releases/latest)**
2. **[Get FREE Groq API Key](https://console.groq.com)**  
3. **Start coding with AI assistance!**

---

**Made with 🧜‍♀️ by RinaWarp Technologies**  
*Building the future of developer tools, one terminal at a time.*

[Website](https://rinawarptech.com) • [Twitter](https://twitter.com/rinawarp) • [GitHub](https://github.com/rinawarp)
