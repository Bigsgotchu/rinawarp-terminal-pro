# RinaWarp Terminal Beta Testing Guide

Welcome to the RinaWarp Terminal beta program! Thank you for helping us test and improve our AI-powered terminal.

## Installation

### macOS
1. Download the .dmg file from the provided link
2. Open the .dmg and drag RinaWarp Terminal to Applications
3. Right-click and select "Open" (first time only)
4. If prompted about an unidentified developer, click "Open"

### Windows
1. Download the .exe installer
2. Run the installer
3. If Windows Defender warns about an unknown app, click "More info" then "Run anyway"

### Linux
1. Download the AppImage file
2. Make it executable: `chmod +x RinaWarp-Terminal-*.AppImage`
3. Run the AppImage

## Initial Setup

### 1. Configure AI Providers
- Click the "Configure AI" button in the terminal
- Enter your API keys:
  - OpenAI API Key (optional)
  - Anthropic API Key (recommended)
  - ElevenLabs API Key (for voice features)

### 2. Enable Developer Features
- All features are unlocked in the beta version
- Access developer tools via View menu or Cmd/Ctrl+Option+I

### 3. Voice Setup
- Select voice mode from the dropdown in the top-right
- Options: System, Rina, Hybrid, or ElevenLabs
- Test voice with: "Hey Rina, introduce yourself"

## Features to Test

### 1. AI Command Interpretation
- Try natural language commands:
  - "Show me all JavaScript files"
  - "How much disk space do I have?"
  - "Create a new Python script called test.py"

### 2. Voice Features
- Voice commands (with microphone permission)
- Text-to-speech responses
- Mood-based voice modulation

### 3. Terminal Features
- Standard terminal commands
- Multiple tabs/panes
- Theme customization
- Command history and autocomplete

### 4. AI Integration
- Code suggestions
- Error explanations
- Command corrections

## Providing Feedback

### In-App Feedback
- Click the feedback button (bottom-right)
- Select issue type
- Provide detailed description
- Include steps to reproduce

### Manual Feedback
Email: beta@rinawarp.com
Include:
- OS and version
- Issue description
- Steps to reproduce
- Screenshots if applicable
- Log files (found in ~/Library/Logs/RinaWarp Terminal/ on macOS)

## Debug Information

### Collecting Logs
- macOS: ~/Library/Logs/RinaWarp Terminal/
- Windows: %APPDATA%\RinaWarp Terminal\logs\
- Linux: ~/.config/RinaWarp Terminal/logs/

### Developer Tools
- Open with Cmd/Ctrl+Option+I
- Check Console for errors
- Network tab for API issues

## Beta Features

These features are experimental and may change:
1. ElevenLabs voice integration
2. Multi-provider AI support
3. Advanced mood detection
4. Shell harness fallback mode

## Privacy & Security

- API keys are stored locally and encrypted
- No telemetry is collected without consent
- All AI processing uses your own API keys
- Voice data is processed locally or via your API

## Common Issues & Solutions

### "API Key Invalid"
- Check your API key is correct
- Ensure you have credits/quota remaining
- Try regenerating the key

### Voice Not Working
- Check microphone permissions
- Ensure audio output is not muted
- Try different voice modes

### Commands Not Executing
- Ensure you're in a valid directory
- Check shell permissions
- Try fallback mode (Settings > Enable Shell Harness)

## Thank You!

Your feedback helps us build a better terminal for everyone. We appreciate your time and effort in testing RinaWarp Terminal!

For urgent issues: support@rinawarp.com
Discord: discord.gg/rinawarp
