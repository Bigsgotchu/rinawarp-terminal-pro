# 📋 RinaWarp Terminal Setup Guide

**Complete setup instructions for RinaWarp Terminal with AI integration**

## 🎯 **Overview**
This guide will walk you through setting up RinaWarp Terminal with FREE Groq AI integration in under 5 minutes.

---

## 📦 **Step 1: Installation**

### **macOS Users**
1. Download `RinaWarp-Terminal-3.0.0.dmg`
2. Open the DMG file
3. Drag RinaWarp Terminal to Applications folder
4. Open Applications → Right-click RinaWarp Terminal → "Open"
5. Click "Open" when macOS asks about unidentified developer

### **Windows Users**  
1. Download `RinaWarp-Terminal-3.0.0.exe`
2. Right-click the installer → "Run as administrator"
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

### **Linux Users**
1. Download `RinaWarp-Terminal-3.0.0.AppImage`
2. Make it executable: `chmod +x RinaWarp-Terminal-3.0.0.AppImage`
3. Run: `./RinaWarp-Terminal-3.0.0.AppImage`

---

## 🤖 **Step 2: Get FREE Groq API Key**

### **Why Groq?**
- **Completely FREE** - No credit card required
- **Ultra-fast** - 10x faster responses than ChatGPT
- **High limits** - 6,000 requests per minute
- **Best models** - Latest Llama 3.3 70B

### **Get Your API Key:**
1. **Visit**: [console.groq.com](https://console.groq.com)
2. **Sign Up**: Create free account (email + password)
3. **Create Key**: 
   - Go to "API Keys" section
   - Click "Create API Key" 
   - Name it "RinaWarp Terminal"
   - **Copy the key** (starts with `gsk_`)
   
⚠️ **Important**: Save your API key immediately - you can't see it again!

---

## ⚙️ **Step 3: Configure AI in RinaWarp**

### **Method 1: Quick Setup (Recommended)**
1. **Open RinaWarp Terminal**
2. **Type**: `groq` (press Enter)
3. **Follow the setup instructions** displayed
4. **Click**: "Configure AI Provider" in the sidebar
5. **Enter your API key** and save

### **Method 2: Manual Configuration**
1. **Open Settings**: Click gear icon in sidebar
2. **Go to**: "AI Provider" section
3. **Select**: "Groq" from dropdown
4. **API Key**: Paste your `gsk_...` key
5. **Model**: Leave as `llama-3.3-70b-versatile` (recommended)
6. **Click**: "Save Configuration"

---

## ✅ **Step 4: Test Your Setup**

### **Basic AI Commands**
```bash
# Test basic AI
ai hello

# Get coding help  
ai how do I create a Python virtual environment?

# Quick help with / prefix
/explain what is Docker?
```

### **Expected Results**
- ✅ **Fast responses** (1-3 seconds)
- ✅ **Helpful, detailed answers**  
- ✅ **No errors or timeouts**

### **If Something's Wrong**
- **No response?** → Check API key in settings
- **Error message?** → Try typing `groq` for troubleshooting
- **Slow responses?** → Switch to `llama-3.1-8b-instant` model

---

## 🎪 **Step 5: Explore AI Features**

### **Available Commands**
| Command | Purpose | Example |
|---------|---------|---------|
| `ai [question]` | General AI assistance | `ai write a bash script` |
| `ask [question]` | Same as ai command | `ask debug this error` |
| `/[question]` | Quick AI query | `/what is kubernetes?` |
| `groq` | Show Groq setup help | `groq` |

### **Pro Tips**
- **Be specific**: "Write a Python function to parse JSON" > "Help with Python"
- **Include context**: "Debug this React error: [paste error]" 
- **Ask follow-ups**: AI remembers your conversation
- **Use code blocks**: AI will format code properly

---

## 🔧 **Advanced Configuration**

### **Switch AI Models**
Different models for different needs:

| Model | Speed | Best For |
|-------|-------|----------|
| `llama-3.3-70b-versatile` | Fast | General coding, complex questions |
| `llama-3.1-8b-instant` | Ultra Fast | Quick answers, simple tasks |
| `deepseek-r1-distill-llama-70b` | Fast | Code analysis, debugging |

**To change model:**
1. Settings → AI Provider → Model → Select new model

### **Keyboard Shortcuts**
- **Ctrl/Cmd + ,** → Open Settings
- **Ctrl/Cmd + K** → Focus command input
- **↑/↓ arrows** → Browse command history
- **Tab** → Auto-complete commands

### **Theme Customization**
1. Settings → Appearance → Theme
2. Choose from: Ocean, Dark, Light, Mermaid

---

## 🆘 **Troubleshooting**

### **Common Issues**

#### **"AI is not configured" Error**
- **Solution**: Type `groq` and follow setup steps
- **Check**: Settings → AI Provider → API key is entered

#### **"Rate limit exceeded" Error**  
- **Cause**: Too many requests (rare with Groq's high limits)
- **Solution**: Wait 1 minute, then try again

#### **App won't start**
- **Windows**: Run as administrator
- **Linux**: Check file permissions (`chmod +x`)
- **macOS**: Right-click → Open (bypass Gatekeeper)

#### **Slow AI responses**
- **Solution**: Switch to faster model (`llama-3.1-8b-instant`)
- **Check**: Internet connection speed

### **Still Need Help?**
- **Type**: `help` in terminal for built-in help
- **Email**: support@rinawarptech.com  
- **Community**: [Discord](https://discord.gg/rinawarp)

---

## 🎉 **You're All Set!**

**Congratulations!** Your RinaWarp Terminal is now powered by AI. 

### **What's Next?**
- **Try the example commands** above
- **Explore different AI models** 
- **Join our community** for tips and tricks
- **Share feedback** to help us improve

### **Happy Coding!** 🚀

---

*Last updated: January 2025*  
*Need help? Contact support@rinawarptech.com*
