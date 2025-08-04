#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import kleur from 'kleur';
import os from 'os';

// ANSI escape sequences for terminal effects
const ANSI = {
  // Border styles
  BORDER_NORMAL: '\x1b[38;2;48;54;61m', // Default border color
  BORDER_ERROR: '\x1b[38;2;255;0;0m', // Error border color
  BORDER_WARNING: '\x1b[38;2;255;171;0m', // Warning border color

  // Glow effects
  GLOW_RED: '\x1b[38;2;255;0;0m\x1b[48;2;40;0;0m',
  GLOW_RED_INTENSE: '\x1b[38;2;255;0;0m\x1b[48;2;60;0;0m',
  GLOW_NORMAL: '\x1b[0m',

  // Reset
  RESET: '\x1b[0m',
};

// Platform-specific terminal compatibility
const PLATFORM_SUPPORT = {
  win32: {
    glowEffects: process.env.TERM_PROGRAM === 'Windows Terminal', // New Windows Terminal supports effects
    borderEffects: true,
    escapeSequences: true,
  },
  darwin: {
    glowEffects: true,
    borderEffects: true,
    escapeSequences: true,
  },
  linux: {
    glowEffects: process.env.COLORTERM === 'truecolor',
    borderEffects: true,
    escapeSequences: true,
  },
};

class CLIAnimationGenerator {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'marketing', 'assets');
    this.frames = [];
    this.currentFrame = 0;

    // Check platform compatibility
    this.platformSupport = PLATFORM_SUPPORT[os.platform()] || {
      glowEffects: false,
      borderEffects: true,
      escapeSequences: true,
    };
  }

  // Format frame with border effects and optional error glow
  formatFrame(content, { isError = false, isWarning = false, pulseGlow = false } = {}) {
    // Skip effects if platform doesn't support them
    if (!this.platformSupport.escapeSequences) {
      return content;
    }

    const borderColor = isError
      ? ANSI.BORDER_ERROR
      : isWarning
        ? ANSI.BORDER_WARNING
        : ANSI.BORDER_NORMAL;

    const glowEffect =
      isError && pulseGlow && this.platformSupport.glowEffects
        ? ANSI.GLOW_RED_INTENSE
        : isError && this.platformSupport.glowEffects
          ? ANSI.GLOW_RED
          : ANSI.GLOW_NORMAL;

    // Add color and effects to each line
    return content
      .split('\n')
      .map(line => {
        if (line.startsWith('┌') || line.startsWith('└') || line.startsWith('├')) {
          return `${borderColor}${glowEffect}${line}${ANSI.RESET}`;
        }
        if (line.startsWith('│')) {
          return `${borderColor}${line}${ANSI.RESET}`;
        }
        return line;
      })
      .join('\n');
  }

  // Create frame for F500 fatal error
  createF500FatalFrame(errorCode, message) {
    const frame = `
┌────────────────────────────────────────────────────────────┐
│ ⚠️  FATAL ERROR F500 - SYSTEM INTEGRITY COMPROMISED        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Error Code: ${errorCode}                                   │
│ Severity: CRITICAL                                         │
│                                                            │
│ ${message}                                                 │
│                                                            │
│ 🚨 Immediate action required:                              │
│   • System shutdown initiated                              │
│   • Notifying system administrators                        │
│   • Initiating emergency protocols                         │
│                                                            │
│ ⚡ DO NOT ATTEMPT TO RESTART THE SYSTEM                    │
│                                                            │
└────────────────────────────────────────────────────────────┘`;

    return this.formatFrame(frame, {
      isError: true,
      pulseGlow: true,
    });
  }

  // Create frame for error resolution
  createErrorResolutionFrame() {
    const frame = `
┌────────────────────────────────────────────────────────────┐
│ ✅ SYSTEM RECOVERY COMPLETE                                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ • Error condition resolved                                 │
│ • System integrity restored                               │
│ • All security protocols active                           │
│                                                            │
│ 📊 System Status: OPERATIONAL                             │
│                                                            │
│ Resuming normal operations...                              │
│                                                            │
└────────────────────────────────────────────────────────────┘`;

    return this.formatFrame(frame);
  }

  // Generate ASCII art terminal frames
  generateFrames(includeErrors = false) {
    const frames = [
      this.createFrame1_Intro(),
      this.createFrame2_SecretSync(),
      this.createFrame3_Deployment(),
      this.createFrame4_Success(),
    ];

    // Include error sequence if requested
    if (includeErrors) {
      frames.push(
        this.createF500FatalFrame('F500-0x1A', 'Critical system integrity violation detected'),
        this.createF500FatalFrame('F500-0x1B', 'Initiating emergency system protection protocols'),
        this.createErrorResolutionFrame()
      );
    }

    return frames;
  }

  createFrame1_Intro() {
    return `
┌────────────────────────────────────────────────────────────┐
│ 🚀 RinaWarp Terminal - Smart Deploy                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ $ npm run sync:platform:full                              │
│                                                            │
│ 🔐 RinaWarp Terminal - Cross-Platform Secret Sync         │
│                                                            │
│ 📁 Loading secrets from local files...                    │
│   Reading .env.local... ⏳                               │
│   Reading .env... ⏳                                      │
│                                                            │
└────────────────────────────────────────────────────────────┘`;
  }

  createFrame2_SecretSync() {
    return `
┌────────────────────────────────────────────────────────────┐
│ 🚀 RinaWarp Terminal - Smart Deploy                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ $ npm run sync:platform:full                              │
│                                                            │
│ 🔐 RinaWarp Terminal - Cross-Platform Secret Sync         │
│                                                            │
│ ✅ Found 8 secrets in local files                         │
│ ☁️  Checking Vercel environment variables...              │
│                                                            │
│ 🚀 Starting intelligent secret synchronization...         │
│   🔄 STRIPE_SECRET_KEY → production ✅                    │
│   🔄 STRIPE_PUBLISHABLE_KEY → production ✅              │
│   🔄 SENDGRID_API_KEY → production ✅                     │
│                                                            │
└────────────────────────────────────────────────────────────┘`;
  }

  createFrame3_Deployment() {
    return `
┌────────────────────────────────────────────────────────────┐
│ 🚀 RinaWarp Terminal - Smart Deploy                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ $ vercel --prod                                            │
│                                                            │
│ 🔍 Inspect: https://vercel.com/rinawarp-tech/terminal     │
│ ✅ Production: https://rinawarptech.com                   │
│                                                            │
│ 🔍 Validating secret consistency...                       │
│   ✅ STRIPE_SECRET_KEY - Fully synchronized               │
│   ✅ STRIPE_PUBLISHABLE_KEY - Fully synchronized         │
│   ✅ SENDGRID_API_KEY - Fully synchronized               │
│                                                            │
│ 📊 All secrets synchronized across platforms!             │
│                                                            │
└────────────────────────────────────────────────────────────┘`;
  }

  createFrame4_Success() {
    return `
┌────────────────────────────────────────────────────────────┐
│ 🎉 DEPLOYMENT SUCCESSFUL                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ✅ Site is live at https://rinawarptech.com              │
│ ✅ Payment processing ready (Stripe)                      │
│ ✅ Download delivery automated                             │
│ ✅ Enterprise security enabled                            │
│ ✅ Global CDN active                                       │
│                                                            │
│ 💰 Ready to accept customers!                             │
│ 📊 Revenue tracking: npm run monitor:revenue              │
│                                                            │
│ 🚀 RinaWarp Terminal is officially LIVE! 🚀              │
│                                                            │
└────────────────────────────────────────────────────────────┘`;
  }

  // Generate HTML version for web display
  generateHTML() {
    // Generate normal and error frames
    const frames = this.generateFrames(true);

    // Helper to determine frame classes
    const getFrameClasses = (frame, index) => {
      const classes = [index === 0 ? 'active' : ''];

      if (frame.includes('FATAL ERROR F500')) {
        classes.push('error-frame', 'error');
      } else if (frame.includes('SYSTEM RECOVERY COMPLETE')) {
        classes.push('fade-out');
      }

      return classes.filter(Boolean).join(' ');
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RinaWarp Terminal - Deploy Animation</title>
    <style>
        body {
            background: #0d1117;
            color: #00ff88;
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        
        .terminal {
            background: #161b22;
            border: 2px solid #30363d;
            border-radius: 8px;
            padding: 20px;
            width: 800px;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }
        
        .frame {
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.2;
            display: none;
            text-shadow: 0 0 10px currentColor;
        }
        
        .frame.active {
            display: block;
            animation: glow 0.5s ease-in;
        }
        
        @keyframes glow {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .success {
            color: #00ff88;
            text-shadow: 0 0 15px #00ff88;
        }
        
        .warning {
            color: #ffab00;
            text-shadow: 0 0 15px #ffab00;
        }
        
        .error {
            color: #ff0000;
            text-shadow: 0 0 15px #ff0000;
            animation: errorPulse 2s infinite;
        }
        
        .error-frame {
            border-color: #ff0000 !important;
            box-shadow: 0 0 30px rgba(255, 0, 0, 0.3);
            animation: errorGlow 2s infinite;
        }
        
        .fade-out {
            animation: fadeOut 1s forwards;
        }
        
        @keyframes errorPulse {
            0% { text-shadow: 0 0 15px #ff0000; }
            50% { text-shadow: 0 0 30px #ff0000; }
            100% { text-shadow: 0 0 15px #ff0000; }
        }
        
        @keyframes errorGlow {
            0% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.3); }
            50% { box-shadow: 0 0 40px rgba(255, 0, 0, 0.5); }
            100% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.3); }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        .info {
            color: #00d4ff;
            text-shadow: 0 0 15px #00d4ff;
        }
    </style>
</head>
<body>
    <div class="terminal">
        ${frames
    .map(
      (frame, index) =>
        `<div class="frame ${getFrameClasses(frame, index)}" id="frame${index}">${frame}</div>`
    )
    .join('')}
    </div>
    
    <script>
        let currentFrame = 0;
        const totalFrames = ${frames.length};
        
        function nextFrame() {
            document.getElementById(\`frame\${currentFrame}\`).classList.remove('active');
            currentFrame = (currentFrame + 1) % totalFrames;
            document.getElementById(\`frame\${currentFrame}\`).classList.add('active');
        }
        
        // Auto-advance frames
        setInterval(nextFrame, 3000);
        
        // Click to advance
        document.addEventListener('click', nextFrame);
    </script>
</body>
</html>`;

    return html;
  }

  // Generate markdown version for README/docs
  generateMarkdown() {
    const frames = this.generateFrames();

    return `# 🚀 RinaWarp Terminal - Deploy Animation

## CLI Demo Sequence

${frames
    .map(
      (frame, index) => `
### Step ${index + 1}
\`\`\`
${frame}
\`\`\`
`
    )
    .join('')}

## Usage
This animation demonstrates the RinaWarp Terminal deployment process:

1. **Secret Synchronization** - Cross-platform environment variable sync
2. **Deployment Validation** - Vercel production deployment  
3. **System Verification** - All services operational
4. **Launch Success** - Live site ready for customers

**Live Site**: https://rinawarptech.com
**Payment Processing**: Stripe integration active
**Download Delivery**: Automated multi-platform delivery
`;
  }

  // Generate social media copy
  generateSocialCopy() {
    return {
      twitter: `🚀 Just deployed RinaWarp Terminal to production!

✅ Cross-platform secret sync
✅ Automated Stripe integration  
✅ Global CDN deployment
✅ Enterprise security enabled

Live at https://rinawarptech.com 

Built with modern DevOps practices. The future of terminal software is here! 🔥

#AI #Terminal #DevOps #Stripe #SaaS`,

      linkedIn: `🚀 Successfully launched RinaWarp Terminal - an AI-powered terminal with enterprise features.

Key achievements:
• Automated deployment pipeline with secret synchronization
• Live payment processing with Stripe integration
• Global CDN distribution for optimal performance  
• Enterprise-grade security and compliance
• Multi-platform download delivery

The product is now live and ready to serve developers worldwide.

Technical highlights:
- Cross-platform environment variable management
- Automated CI/CD with Vercel
- Real-time monitoring and analytics
- Scalable SaaS architecture

Check it out: https://rinawarptech.com

#SoftwareDevelopment #AI #Terminal #Enterprise #SaaS #DevOps`,

      reddit: `🚀 [Launch] RinaWarp Terminal - AI-powered terminal with commercial deployment

Just went live with a commercial terminal application after 6 months of development. Here's what we built:

**Technical Stack:**
- Frontend: Modern web technologies with AI integration
- Backend: Node.js with enterprise security
- Payment: Stripe subscription processing
- Deployment: Vercel with automated CI/CD
- Monitoring: Real-time analytics and error tracking

**Business Features:**
- Three-tier subscription model (Personal/Pro/Team)
- Automated download delivery
- Cross-platform installers (Windows/macOS/Linux)
- Enterprise security and compliance

**DevOps Highlights:**
- Automated secret synchronization across environments
- One-command deployment with verification
- Global CDN distribution
- Real-time monitoring dashboards

Live at: https://rinawarptech.com

AMA about the technical challenges, business model, or deployment process!`,
    };
  }

  // Main generation method
  async generate() {
    console.log(kleur.cyan('🎬 Generating CLI Animation Assets...'));

    // Create output directory
    fs.mkdirSync(this.outputDir, { recursive: true });

    // Generate HTML demo
    const html = this.generateHTML();
    fs.writeFileSync(path.join(this.outputDir, 'cli-animation.html'), html);
    console.log(kleur.green('✅ Created HTML animation demo'));

    // Generate Markdown documentation
    const markdown = this.generateMarkdown();
    fs.writeFileSync(path.join(this.outputDir, 'deploy-animation.md'), markdown);
    console.log(kleur.green('✅ Created Markdown documentation'));

    // Generate social media copy
    const socialCopy = this.generateSocialCopy();
    fs.writeFileSync(
      path.join(this.outputDir, 'social-copy.json'),
      JSON.stringify(socialCopy, null, 2)
    );
    console.log(kleur.green('✅ Created social media copy'));

    // Generate frames as individual text files
    const frames = this.generateFrames();
    frames.forEach((frame, index) => {
      fs.writeFileSync(path.join(this.outputDir, `frame-${index + 1}.txt`), frame);
    });
    console.log(kleur.green(`✅ Created ${frames.length} animation frames`));

    console.log(kleur.magenta('\n🎉 Marketing assets generated successfully!'));
    console.log(kleur.blue(`📁 Output directory: ${this.outputDir}`));
    console.log(
      kleur.blue(`🌐 View demo: file://${path.join(this.outputDir, 'cli-animation.html')}`)
    );

    return {
      outputDir: this.outputDir,
      files: [
        'cli-animation.html',
        'deploy-animation.md',
        'social-copy.json',
        ...frames.map((_, i) => `frame-${i + 1}.txt`),
      ],
    };
  }
}

// CLI interface
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🎬 CLI Animation Generator

Usage:
  node scripts/create-cli-animation.js [options]

Options:
  --help, -h     Show this help message

Generates:
  • HTML animation demo
  • Markdown documentation
  • Social media copy
  • Individual frame text files

Output: ./marketing/assets/
`);
  process.exit(0);
}

// Run generator
const generator = new CLIAnimationGenerator();
generator
  .generate()
  .then(result => {
    console.log(kleur.green('\n🚀 Ready for social media launch!'));
    process.exit(0);
  })
  .catch(error => {
    console.error(kleur.red('❌ Generation failed:'), error.message);
    process.exit(1);
  });
