#!/usr/bin/env node

/**
 * Create Public Version from Creator Edition
 * Strips Creator-only features and creates standard version for public deployment
 */

const fs = require('fs-extra');
const path = require('path');

const CREATOR_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'RinaWarp-Terminal-Public');

console.log('🚀 Creating RinaWarp Terminal Public Version...');
console.log(`📁 Source: ${CREATOR_DIR}`);
console.log(`📁 Target: ${PUBLIC_DIR}`);

async function createPublicVersion() {
  try {
    // Clean and create public directory
    await fs.remove(PUBLIC_DIR);
    await fs.ensureDir(PUBLIC_DIR);

    // Copy base files
    console.log('📋 Copying base files...');
    await fs.copy(path.join(CREATOR_DIR, 'css'), path.join(PUBLIC_DIR, 'css'));
    await fs.copy(path.join(CREATOR_DIR, 'js'), path.join(PUBLIC_DIR, 'js'));
    await fs.copy(path.join(CREATOR_DIR, 'assets'), path.join(PUBLIC_DIR, 'assets'));
    await fs.copy(path.join(CREATOR_DIR, 'ai-core'), path.join(PUBLIC_DIR, 'ai-core'));
    await fs.copy(path.join(CREATOR_DIR, 'config'), path.join(PUBLIC_DIR, 'config'));

    // Copy core files
    await fs.copy(path.join(CREATOR_DIR, 'index.html'), path.join(PUBLIC_DIR, 'index.html'));
    await fs.copy(path.join(CREATOR_DIR, 'preload.js'), path.join(PUBLIC_DIR, 'preload.js'));

    // Create public version of main.js (without Creator features)
    console.log('🔧 Creating public main.js...');
    let mainContent = await fs.readFile(path.join(CREATOR_DIR, 'main.js'), 'utf8');

    // Remove Creator-specific features
    mainContent = mainContent.replace(
      'RinaWarp Terminal - Creator Edition v3.0',
      'RinaWarp Terminal v1.0'
    );

    mainContent = mainContent.replace(
      /Licensed to: kgilley\\nLicense: Personal Use Only\\nExpires: NEVER\\n\\n/g,
      ''
    );

    // Remove premium features from menu
    mainContent = mainContent.replace(/{\s*label: 'Cloud Sync'[\s\S]*?},/g, '');

    mainContent = mainContent.replace(/{\s*label: 'Analytics'[\s\S]*?},/g, '');

    mainContent = mainContent.replace(/{\s*label: 'Automation Builder'[\s\S]*?}/g, '');

    await fs.writeFile(path.join(PUBLIC_DIR, 'main.js'), mainContent);

    // Create public package.json
    console.log('📦 Creating public package.json...');
    const creatorPackage = await fs.readJSON(path.join(CREATOR_DIR, 'package.json'));

    const publicPackage = {
      ...creatorPackage,
      name: 'rinawarp-terminal',
      version: '1.0.0',
      description: 'RinaWarp Terminal - AI-Powered Terminal Assistant',
      build: {
        ...creatorPackage.build,
        appId: 'com.rinawarp.terminal',
        productName: 'RinaWarp Terminal',
        publish: {
          provider: 'github',
          owner: 'rinawarp',
          repo: 'terminal-public',
        },
      },
    };

    await fs.writeJSON(path.join(PUBLIC_DIR, 'package.json'), publicPackage, { spaces: 2 });

    // Create public README
    console.log('📖 Creating public README...');
    const publicReadme = `# 🧜‍♀️ RinaWarp Terminal

## AI-Powered Terminal Assistant

**RinaWarp Terminal** is an advanced terminal assistant powered by AI that helps developers and creators work more efficiently.

### ✨ Features

- 🤖 **AI Assistant**: Integrated AI help for commands and coding
- 💻 **Enhanced Terminal**: Modern terminal experience with advanced features  
- 🎨 **Beautiful UI**: Glassmorphism design with smooth animations
- ♿ **Accessible**: Full accessibility support with keyboard navigation
- 🔐 **Secure**: Built-in security features and encrypted storage
- 🌍 **Cross-Platform**: Available for macOS, Windows, and Linux

### 🚀 Getting Started

1. **Download** the latest version for your platform
2. **Install** and launch RinaWarp Terminal
3. **Set up AI** by adding your preferred AI provider API key
4. **Start coding** with AI-powered assistance

### 💡 AI Providers Supported

- **OpenAI GPT-4** - Most versatile AI assistant
- **Anthropic Claude** - Advanced reasoning and analysis
- **Google AI** - Multimodal AI capabilities
- **Local AI** - Privacy-focused local AI models

### 🛠️ Installation

#### macOS
\`\`\`bash
# Download the .dmg file and install
# Or use Homebrew (coming soon)
brew install --cask rinawarp-terminal
\`\`\`

#### Windows
\`\`\`bash
# Download the .exe installer
# Or use Chocolatey (coming soon)
choco install rinawarp-terminal
\`\`\`

#### Linux
\`\`\`bash
# Download the .AppImage or .deb package
# Or use snap (coming soon)
snap install rinawarp-terminal
\`\`\`

### 🎯 Why RinaWarp Terminal?

- **Boost Productivity**: AI-powered command suggestions and code generation
- **Learn Faster**: Get instant explanations for commands and errors
- **Work Smarter**: Automated tasks and intelligent workflows
- **Stay Secure**: Built-in security best practices and encrypted data

### 💰 Pricing

- **Free Version**: Core terminal features with basic AI integration
- **Pro Version**: Advanced AI features, unlimited usage, priority support
- **Team Version**: Collaboration features, shared AI models, team management

### 🔗 Links

- **Website**: https://rinawarp.com
- **Documentation**: https://docs.rinawarp.com
- **Support**: https://support.rinawarp.com
- **Discord**: https://discord.gg/rinawarp

### 📄 License

Copyright © 2024 RinaWarp Technologies. All rights reserved.

---

**Ready to supercharge your terminal experience?** Download RinaWarp Terminal today! 🚀
`;

    await fs.writeFile(path.join(PUBLIC_DIR, 'README.md'), publicReadme);

    // Create license limitations file
    console.log('⚖️ Creating license configuration...');
    const licenseConfig = {
      version: 'public',
      tier: 'free',
      features: {
        ai_integration: true,
        basic_terminal: true,
        themes: true,
        accessibility: true,
        cloud_sync: false,
        analytics: false,
        automation_builder: false,
        voice_control: false,
        collaboration: false,
        unlimited_ai_requests: false,
        priority_support: false,
      },
      limits: {
        ai_requests_per_day: 50,
        saved_sessions: 10,
        custom_themes: 3,
      },
    };

    await fs.writeJSON(path.join(PUBLIC_DIR, 'config', 'license.json'), licenseConfig, {
      spaces: 2,
    });

    // Create marketing assets
    console.log('🎨 Setting up marketing assets...');
    const marketingDir = path.join(PUBLIC_DIR, 'marketing');
    await fs.ensureDir(marketingDir);

    const landingPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RinaWarp Terminal - AI-Powered Terminal Assistant</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
            color: white;
        }
        .hero {
            text-align: center;
            padding: 100px 20px;
        }
        .hero h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, #ffd700, #ff6b6b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .hero p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .cta-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(45deg, #ffd700, #ff6b6b);
            color: black;
            text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            transition: transform 0.3s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .features {
            padding: 80px 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .pricing {
            padding: 80px 20px;
            text-align: center;
        }
        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
            max-width: 900px;
            margin: 0 auto;
        }
        .pricing-card {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .price {
            font-size: 2rem;
            color: #ffd700;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="hero">
        <h1>🧜‍♀️ RinaWarp Terminal</h1>
        <p>AI-Powered Terminal Assistant for Developers & Creators</p>
        <a href="#download" class="cta-button">Download Free</a>
    </div>

    <div class="features">
        <div class="feature-grid">
            <div class="feature">
                <h3>🤖 AI Assistant</h3>
                <p>Get instant help with commands, coding, and troubleshooting powered by advanced AI models.</p>
            </div>
            <div class="feature">
                <h3>💻 Enhanced Terminal</h3>
                <p>Modern terminal experience with beautiful UI, themes, and advanced productivity features.</p>
            </div>
            <div class="feature">
                <h3>🔐 Secure & Private</h3>
                <p>Built-in security features, encrypted storage, and privacy-first design.</p>
            </div>
            <div class="feature">
                <h3>♿ Fully Accessible</h3>
                <p>Complete accessibility support with keyboard navigation and screen reader compatibility.</p>
            </div>
            <div class="feature">
                <h3>🌍 Cross-Platform</h3>
                <p>Available for macOS, Windows, and Linux with native performance.</p>
            </div>
            <div class="feature">
                <h3>🎨 Customizable</h3>
                <p>Multiple themes, customizable interface, and personalization options.</p>
            </div>
        </div>
    </div>

    <div class="pricing">
        <h2>Choose Your Plan</h2>
        <div class="pricing-grid">
            <div class="pricing-card">
                <h3>Free</h3>
                <div class="price">$0</div>
                <ul style="text-align: left;">
                    <li>Basic AI Integration</li>
                    <li>50 AI Requests/Day</li>
                    <li>Core Terminal Features</li>
                    <li>3 Custom Themes</li>
                </ul>
            </div>
            <div class="pricing-card">
                <h3>Pro</h3>
                <div class="price">$9.99/mo</div>
                <ul style="text-align: left;">
                    <li>Unlimited AI Requests</li>
                    <li>Advanced AI Features</li>
                    <li>Cloud Sync</li>
                    <li>Priority Support</li>
                    <li>Unlimited Themes</li>
                </ul>
            </div>
            <div class="pricing-card">
                <h3>Team</h3>
                <div class="price">$29.99/mo</div>
                <ul style="text-align: left;">
                    <li>Everything in Pro</li>
                    <li>Team Collaboration</li>
                    <li>Shared AI Models</li>
                    <li>Team Management</li>
                    <li>Analytics Dashboard</li>
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`;

    await fs.writeFile(path.join(marketingDir, 'index.html'), landingPage);

    console.log('✅ Public version created successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('- Creator Edition: Full-featured version with all premium features');
    console.log('- Public Version: Free version with limited features and upgrade prompts');
    console.log('- License system: Configured for feature gating and monetization');
    console.log('- Marketing: Landing page and pricing structure ready');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Set up payment processing (Stripe/PayPal)');
    console.log('2. Configure license server for validation');
    console.log('3. Set up CI/CD for automated builds');
    console.log('4. Deploy to app stores and distribution channels');
  } catch (error) {
    console.error('❌ Error creating public version:', error);
    process.exit(1);
  }
}

// Run the script
createPublicVersion();
