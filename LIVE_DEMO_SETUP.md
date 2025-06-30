# 🎬 RinaWarp Terminal - Live Demo Setup Guide

## 🚀 **QUICK START - YOU'RE READY TO DEMO!**

### ✅ **Current Status:**
- **RinaWarp Terminal is BUILT** ✅
- **Application is RUNNING** ✅ 
- **Ready for live demos** ✅

---

## 🎮 **LAUNCHING RINAWARP FOR DEMOS**

### **Option 1: Use Built Version (Recommended for Demos)**
```powershell
# Quick launch
.\launch-rinawarp.ps1

# Or manual launch
Start-Process "dist\win-unpacked\RinaWarp Terminal.exe"
```

### **Option 2: Development Mode (For Testing)**
```powershell
# Development launch
.\launch-dev.ps1

# Or manual dev mode
npm run dev
```

### **Option 3: Direct Executable**
**File Location:** `dist\win-unpacked\RinaWarp Terminal.exe`
- Double-click to run
- Perfect for demos

---

## 🎬 **DEMO RECORDING SETUP**

### **Pre-Demo Checklist:**
- [ ] RinaWarp Terminal is running
- [ ] Choose attractive theme for recording
- [ ] Close other applications
- [ ] Test screen recording (Windows + G)
- [ ] Have demo script ready

### **Recording Commands:**
```
Windows + G           → Open Xbox Game Bar
Windows + Alt + R     → Start/Stop recording
Windows + Alt + G     → Record last 30 seconds
```

---

## 🎯 **LIVE DEMO FEATURES TO SHOWCASE**

### **1. Terminal Interface (30 seconds)**
- Show beautiful themes
- Demonstrate smooth performance
- Highlight clean UI design

### **2. AI Features (2-3 minutes)**
```bash
# Demo commands to try:
git st          # Show AI completing to 'git status'
npm i           # Show AI suggesting 'npm install'
docker          # Show contextual suggestions
ls -l | grep    # Show AI helping with pipe commands
```

### **3. Theme Switching (1 minute)**
- Cycle through different themes
- Show real-time switching
- Highlight customization options

### **4. Performance Demo (1 minute)**
```bash
# Show fast operations:
ls -la
cat package.json
git log --oneline
npm list
```

### **5. Developer Workflow (2 minutes)**
```bash
# Demo a real workflow:
mkdir demo-project
cd demo-project
git init
echo "console.log('Hello RinaWarp!');" > app.js
git add .
git commit -m "Initial demo"
npm init -y
```

---

## 🛠️ **DEMO ENVIRONMENT SETUP**

### **Create Demo Workspace:**
```powershell
# Create a clean demo environment
mkdir C:\demo-workspace
cd C:\demo-workspace

# Create sample files
echo "console.log('RinaWarp Demo');" > demo.js
echo "# Demo Project" > README.md
echo "node_modules/" > .gitignore

# Initialize git
git init
git add .
git commit -m "Demo project setup"
```

### **Prepare Sample Commands:**
```bash
# Navigation
cd ~
ls -la
pwd

# File operations
cat demo.js
grep "Demo" *.md
find . -name "*.js"

# Git operations
git status
git log --oneline
git diff

# Package management
npm list
npm search express
```

---

## 🎨 **OPTIMIZING FOR RECORDING**

### **Visual Settings for Demos:**
1. **Font Size:** 16pt or larger
2. **Theme:** High contrast (cyberpunk, ocean, or matrix)
3. **Window Size:** Full screen or large window
4. **Cursor:** Make sure it's visible and blinking

### **Audio Settings:**
- Test microphone before recording
- Reduce background noise
- Speak clearly and at moderate pace

---

## 📱 **QUICK DEMO SCRIPTS**

### **5-Minute Quick Demo:**
```
0:00-0:30  → "Welcome to RinaWarp Terminal"
0:30-2:00  → AI features demonstration
2:00-3:30  → Theme and customization
3:30-4:30  → Performance showcase
4:30-5:00  → "Download and try it yourself"
```

### **Live Streaming Setup:**
```
1. Open RinaWarp Terminal
2. Set attractive theme
3. Prepare sample project
4. Start streaming software (OBS/etc)
5. Follow demo script
6. Engage with audience questions
```

---

## 🔧 **TROUBLESHOOTING**

### **If RinaWarp Won't Start:**
```powershell
# Rebuild if needed
npm run build:dir

# Check for errors
npm test

# Try development mode
npm run dev
```

### **If Demo Lags:**
- Close other applications
- Use built version (not dev mode)
- Restart RinaWarp Terminal
- Check available RAM/CPU

### **If Recording Issues:**
- Test Xbox Game Bar before demo
- Check audio levels
- Ensure good lighting
- Use backup recording method

---

## 🎬 **DEMO FLOW EXAMPLE**

### **Opening (30 seconds):**
```
"Hi everyone! Welcome to this RinaWarp Terminal demo. 
I'm going to show you how this revolutionary terminal 
can transform your development workflow. Let's dive in!"
```

### **Feature Demo (3-4 minutes):**
```
1. Open RinaWarp Terminal
2. Show theme switching
3. Demonstrate AI command completion
4. Show real development workflow
5. Highlight performance benefits
```

### **Closing (30 seconds):**
```
"That's RinaWarp Terminal in action! Download your free trial 
at rinawarp-terminal.web.app. Thanks for watching!"
```

---

## 📂 **DEMO ASSETS READY**

### **Available Now:**
- ✅ **Built Application:** `dist\win-unpacked\RinaWarp Terminal.exe`
- ✅ **Launch Scripts:** `launch-rinawarp.ps1`, `launch-dev.ps1`
- ✅ **Demo Scripts:** `recordings/scripts/30min-demo-script.md`
- ✅ **Recording Guide:** `docs/SCREEN_RECORDING_GUIDE.md`
- ✅ **This Setup Guide:** `LIVE_DEMO_SETUP.md`

### **Quick Commands:**
```powershell
# Launch for demo
.\launch-rinawarp.ps1

# Start recording
# Press Windows + G, then record button

# Follow demo script
# recordings/scripts/30min-demo-script.md
```

---

## 🚀 **YOU'RE READY TO DEMO!**

**RinaWarp Terminal is running and ready for live demonstrations.**

**Next steps:**
1. **Press Windows + G** to start recording
2. **Open the running RinaWarp Terminal**
3. **Follow your demo script**
4. **Show off those amazing features!**

**Break a leg! 🎬**

---

*Live Demo Setup Guide for RinaWarp Terminal*
*Created: June 30, 2025*
