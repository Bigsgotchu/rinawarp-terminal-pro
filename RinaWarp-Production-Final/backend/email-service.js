/**
 * Email Notification Service for RinaWarp Terminal
 * Handles purchase confirmations, download links, and license information
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.templates = new Map();
  }

  // Initialize email service
  async initialize() {
    try {
      // Create transporter based on configuration
      if (process.env.SENDGRID_API_KEY) {
        this.transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });
      } else if (process.env.SMTP_HOST) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      } else {
        // Development mode - use Ethereal Email (fake SMTP)
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        logger.info('Using Ethereal Email for testing', {
          user: testAccount.user,
          pass: testAccount.pass,
        });
      }

      // Verify transporter configuration
      await this.transporter.verify();

      // Load email templates
      await this.loadTemplates();

      this.initialized = true;
      logger.info('✅ Email service initialized');
    } catch (error) {
      logger.error('Failed to initialize email service', { error: error.message });
      throw error;
    }
  }

  // Load email templates
  async loadTemplates() {
    const templatesDir = path.join(__dirname, 'email-templates');

    try {
      // Create templates directory if it doesn't exist
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
        await this.createDefaultTemplates();
      }

      // Load existing templates
      const templateFiles = fs.readdirSync(templatesDir).filter(file => file.endsWith('.html'));

      for (const file of templateFiles) {
        const templateName = path.basename(file, '.html');
        const templatePath = path.join(templatesDir, file);
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        this.templates.set(templateName, templateContent);
      }

      logger.info(`Loaded ${templateFiles.length} email templates`);
    } catch (error) {
      logger.error('Failed to load email templates', { error: error.message });
    }
  }

  // Create default email templates
  async createDefaultTemplates() {
    const templatesDir = path.join(__dirname, 'email-templates');

    const templates = {
      'purchase-confirmation': this.getPurchaseConfirmationTemplate(),
      'download-ready': this.getDownloadReadyTemplate(),
      'license-info': this.getLicenseInfoTemplate(),
      'trial-started': this.getTrialStartedTemplate(),
      'payment-failed': this.getPaymentFailedTemplate(),
      'support-ticket': this.getSupportTicketTemplate(),
    };

    for (const [name, content] of Object.entries(templates)) {
      const filePath = path.join(templatesDir, `${name}.html`);
      fs.writeFileSync(filePath, content, 'utf-8');
    }

    logger.info('Created default email templates');
  }

  // Send purchase confirmation email
  async sendPurchaseConfirmation(license) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      const template = this.templates.get('purchase-confirmation');
      if (!template) {
        throw new Error('Purchase confirmation template not found');
      }

      const emailContent = this.replacePlaceholders(template, {
        customerName: license.email.split('@')[0],
        customerEmail: license.email,
        planName: `${license.tier.charAt(0).toUpperCase() + license.tier.slice(1)} Plan`,
        licenseId: license.id,
        purchaseDate: new Date(license.createdAt).toLocaleDateString(),
        expiryDate: new Date(license.expires).toLocaleDateString(),
        downloadLink: `https://rinawarptech.com/dashboard.html#downloads`,
        supportEmail: 'support@rinawarptech.com',
      });

      const mailOptions = {
        from: `"RinaWarp Technologies" <${process.env.FROM_EMAIL || 'noreply@rinawarptech.com'}>`,
        to: license.email,
        subject: 'Welcome to RinaWarp Terminal! Your Purchase Confirmation',
        html: emailContent,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Purchase confirmation email sent', {
        licenseId: license.id,
        email: license.email,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send purchase confirmation email', {
        licenseId: license?.id,
        email: license?.email,
        error: error.message,
      });
      throw error;
    }
  }

  // Send download ready notification
  async sendDownloadReady(license, platform) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      const template = this.templates.get('download-ready');
      if (!template) {
        throw new Error('Download ready template not found');
      }

      const emailContent = this.replacePlaceholders(template, {
        customerName: license.email.split('@')[0],
        planName: `${license.tier.charAt(0).toUpperCase() + license.tier.slice(1)} Plan`,
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        downloadLink: `https://rinawarptech.com/dashboard.html#downloads`,
        setupGuideLink: 'https://rinawarptech.com/setup-guide',
        supportEmail: 'support@rinawarptech.com',
      });

      const mailOptions = {
        from: `"RinaWarp Technologies" <${process.env.FROM_EMAIL || 'noreply@rinawarptech.com'}>`,
        to: license.email,
        subject: `Your RinaWarp Terminal download for ${platform} is ready!`,
        html: emailContent,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Download ready email sent', {
        licenseId: license.id,
        email: license.email,
        platform: platform,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send download ready email', {
        licenseId: license?.id,
        email: license?.email,
        platform: platform,
        error: error.message,
      });
      throw error;
    }
  }

  // Send license information email
  async sendLicenseInfo(license) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      const template = this.templates.get('license-info');
      if (!template) {
        throw new Error('License info template not found');
      }

      const emailContent = this.replacePlaceholders(template, {
        customerName: license.email.split('@')[0],
        planName: `${license.tier.charAt(0).toUpperCase() + license.tier.slice(1)} Plan`,
        licenseId: license.id,
        status: license.status.charAt(0).toUpperCase() + license.status.slice(1),
        expiryDate: new Date(license.expires).toLocaleDateString(),
        dashboardLink: 'https://rinawarptech.com/dashboard.html',
        supportEmail: 'support@rinawarptech.com',
      });

      const mailOptions = {
        from: `"RinaWarp Technologies" <${process.env.FROM_EMAIL || 'noreply@rinawarptech.com'}>`,
        to: license.email,
        subject: 'Your RinaWarp Terminal License Information',
        html: emailContent,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('License info email sent', {
        licenseId: license.id,
        email: license.email,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send license info email', {
        licenseId: license?.id,
        email: license?.email,
        error: error.message,
      });
      throw error;
    }
  }

  // Send trial started notification
  async sendTrialStarted(license) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      const template = this.templates.get('trial-started');
      if (!template) {
        throw new Error('Trial started template not found');
      }

      const emailContent = this.replacePlaceholders(template, {
        customerName: license.email.split('@')[0],
        planName: `${license.tier.charAt(0).toUpperCase() + license.tier.slice(1)} Plan`,
        trialDays: Math.ceil((new Date(license.expires) - new Date()) / (1000 * 60 * 60 * 24)),
        downloadLink: 'https://rinawarptech.com/dashboard.html#downloads',
        upgradeLink: 'https://rinawarptech.com/#pricing',
        supportEmail: 'support@rinawarptech.com',
      });

      const mailOptions = {
        from: `"RinaWarp Technologies" <${process.env.FROM_EMAIL || 'noreply@rinawarptech.com'}>`,
        to: license.email,
        subject: 'Your RinaWarp Terminal trial has started!',
        html: emailContent,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Trial started email sent', {
        licenseId: license.id,
        email: license.email,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send trial started email', {
        licenseId: license?.id,
        email: license?.email,
        error: error.message,
      });
      throw error;
    }
  }

  // Send payment failed notification
  async sendPaymentFailed(license) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      const template = this.templates.get('payment-failed');
      if (!template) {
        throw new Error('Payment failed template not found');
      }

      const emailContent = this.replacePlaceholders(template, {
        customerName: license.email.split('@')[0],
        planName: `${license.tier.charAt(0).toUpperCase() + license.tier.slice(1)} Plan`,
        billingPortalLink: 'https://rinawarptech.com/dashboard.html#billing',
        supportEmail: 'support@rinawarptech.com',
      });

      const mailOptions = {
        from: `"RinaWarp Technologies" <${process.env.FROM_EMAIL || 'noreply@rinawarptech.com'}>`,
        to: license.email,
        subject: 'Action Required: Payment Issue with Your RinaWarp Terminal Subscription',
        html: emailContent,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Payment failed email sent', {
        licenseId: license.id,
        email: license.email,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send payment failed email', {
        licenseId: license?.id,
        email: license?.email,
        error: error.message,
      });
      throw error;
    }
  }

  // Send support ticket confirmation
  async sendSupportTicket(ticketData) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      const template = this.templates.get('support-ticket');
      if (!template) {
        throw new Error('Support ticket template not found');
      }

      const emailContent = this.replacePlaceholders(template, {
        customerName: ticketData.email.split('@')[0],
        ticketId: ticketData.ticketId || 'N/A',
        subject: ticketData.subject,
        message: ticketData.message,
        supportEmail: 'support@rinawarptech.com',
      });

      const mailOptions = {
        from: `"RinaWarp Technologies" <${process.env.FROM_EMAIL || 'noreply@rinawarptech.com'}>`,
        to: ticketData.email,
        subject: `Support Ticket Received: ${ticketData.subject}`,
        html: emailContent,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Support ticket email sent', {
        email: ticketData.email,
        subject: ticketData.subject,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send support ticket email', {
        email: ticketData?.email,
        error: error.message,
      });
      throw error;
    }
  }

  // Replace placeholders in template
  replacePlaceholders(template, data) {
    let result = template;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, value || '');
    }

    return result;
  }

  // Get purchase confirmation template
  getPurchaseConfirmationTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to RinaWarp Terminal!</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #00d4ff, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; }
        .footer { background: #1a1a1b; color: #a0a0a0; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #00d4ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧜‍♀️ Welcome to RinaWarp Terminal!</h1>
            <p>Thank you for your purchase, {{customerName}}!</p>
        </div>
        
        <div class="content">
            <h2>🎉 Purchase Confirmation</h2>
            <p>Your purchase has been successfully processed. You now have access to the {{planName}} with all its amazing features!</p>
            
            <div class="info-box">
                <h3>📄 License Details</h3>
                <p><strong>License ID:</strong> {{licenseId}}</p>
                <p><strong>Plan:</strong> {{planName}}</p>
                <p><strong>Purchase Date:</strong> {{purchaseDate}}</p>
                <p><strong>Valid Until:</strong> {{expiryDate}}</p>
            </div>
            
            <h3>🚀 What's Next?</h3>
            <ol>
                <li><strong>Download RinaWarp Terminal</strong> for your platform</li>
                <li><strong>Follow our setup guide</strong> to get started quickly</li>
                <li><strong>Explore AI features</strong> and boost your productivity</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{downloadLink}}" class="button">📥 Download Now</a>
            </div>
            
            <h3>💡 Getting Started Tips</h3>
            <ul>
                <li>Try the <code>ai</code> command for instant coding help</li>
                <li>Use <code>/</code> prefix for quick AI queries</li>
                <li>Explore different themes in settings</li>
                <li>Join our Discord community for tips and tricks</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Need help? Email us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
            <p>&copy; 2025 RinaWarp Technologies. Made with 🧜‍♀️ by developers, for developers.</p>
        </div>
    </div>
</body>
</html>
        `;
  }

  // Get download ready template
  getDownloadReadyTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your Download is Ready!</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #00d4ff, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; }
        .footer { background: #1a1a1b; color: #a0a0a0; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #00d4ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .platform-icon { font-size: 48px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="platform-icon">📥</div>
            <h1>Your {{platform}} Download is Ready!</h1>
            <p>Hello {{customerName}}, your RinaWarp Terminal download is waiting for you.</p>
        </div>
        
        <div class="content">
            <h2>🚀 Ready to Download</h2>
            <p>Your {{planName}} license gives you access to RinaWarp Terminal for {{platform}} and all other platforms.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{downloadLink}}" class="button">📥 Download for {{platform}}</a>
                <a href="{{setupGuideLink}}" class="button">📖 Setup Guide</a>
            </div>
            
            <h3>⚡ What You Get</h3>
            <ul>
                <li>🤖 <strong>FREE AI Integration</strong> - Ultra-fast Groq Llama models</li>
                <li>⚡ <strong>Lightning Speed</strong> - 10x faster than ChatGPT</li>
                <li>🎨 <strong>Beautiful Interface</strong> - Modern mermaid-themed UI</li>
                <li>🔒 <strong>Secure & Private</strong> - Your data stays on your machine</li>
                <li>🌍 <strong>Cross-Platform</strong> - Works on Mac, Windows, Linux</li>
            </ul>
            
            <h3>🎯 Quick Start</h3>
            <ol>
                <li>Download and install RinaWarp Terminal</li>
                <li>Get a FREE Groq API key from console.groq.com</li>
                <li>Configure AI in the app settings</li>
                <li>Start using AI with <code>ai your question here</code></li>
            </ol>
        </div>
        
        <div class="footer">
            <p>Need help? Email us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
            <p>&copy; 2025 RinaWarp Technologies. Building the future of developer tools.</p>
        </div>
    </div>
</body>
</html>
        `;
  }

  // Get license info template
  getLicenseInfoTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your RinaWarp Terminal License</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #00d4ff, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; }
        .footer { background: #1a1a1b; color: #a0a0a0; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #00d4ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0; font-family: monospace; }
        .status-active { color: #10b981; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔑 Your License Information</h1>
            <p>License details for {{customerName}}</p>
        </div>
        
        <div class="content">
            <div class="info-box">
                <h3>📄 License Details</h3>
                <p><strong>License ID:</strong> {{licenseId}}</p>
                <p><strong>Plan:</strong> {{planName}}</p>
                <p><strong>Status:</strong> <span class="status-active">{{status}}</span></p>
                <p><strong>Valid Until:</strong> {{expiryDate}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboardLink}}" class="button">🎛️ Manage License</a>
            </div>
            
            <h3>💡 Important Notes</h3>
            <ul>
                <li>Keep your license ID safe - you'll need it for support</li>
                <li>Your license works on all platforms (Mac, Windows, Linux)</li>
                <li>You can download the software anytime from your dashboard</li>
                <li>Contact support if you have any questions</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Need help? Email us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
            <p>&copy; 2025 RinaWarp Technologies</p>
        </div>
    </div>
</body>
</html>
        `;
  }

  // Get trial started template
  getTrialStartedTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your Trial Has Started!</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; }
        .footer { background: #1a1a1b; color: #a0a0a0; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #00d4ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .trial-badge { background: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Your {{trialDays}}-Day Trial Has Started!</h1>
            <p>Welcome to {{planName}}, {{customerName}}!</p>
            <div class="trial-badge">TRIAL ACTIVE</div>
        </div>
        
        <div class="content">
            <h2>🎉 You're All Set!</h2>
            <p>Your {{planName}} trial is now active and you have access to all premium features for the next {{trialDays}} days.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{downloadLink}}" class="button">📥 Download Now</a>
                <a href="{{upgradeLink}}" class="button">💎 Upgrade to Full</a>
            </div>
            
            <h3>✨ Trial Features Unlocked</h3>
            <ul>
                <li>🤖 <strong>Unlimited AI Requests</strong> - No daily limits</li>
                <li>🧠 <strong>All AI Models</strong> - Llama 3.3, Claude, GPT</li>
                <li>🎨 <strong>Unlimited Themes</strong> - Customize your experience</li>
                <li>☁️ <strong>Cloud Sync</strong> - Access your settings anywhere</li>
                <li>🏆 <strong>Priority Support</strong> - Get help when you need it</li>
            </ul>
            
            <h3>🎯 Make the Most of Your Trial</h3>
            <ol>
                <li>Download and install RinaWarp Terminal</li>
                <li>Set up your AI providers (we'll guide you)</li>
                <li>Try advanced AI commands and features</li>
                <li>Explore all the themes and customizations</li>
                <li>Join our community for tips and tricks</li>
            </ol>
            
            <p><strong>Remember:</strong> Your trial expires in {{trialDays}} days. Upgrade anytime to continue enjoying all these amazing features!</p>
        </div>
        
        <div class="footer">
            <p>Questions about your trial? Email us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
            <p>&copy; 2025 RinaWarp Technologies</p>
        </div>
    </div>
</body>
</html>
        `;
  }

  // Get payment failed template
  getPaymentFailedTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Issue - Action Required</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; }
        .footer { background: #1a1a1b; color: #a0a0a0; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Payment Issue</h1>
            <p>Action required for your {{planName}} subscription</p>
        </div>
        
        <div class="content">
            <div class="warning-box">
                <h3>🚨 Immediate Action Required</h3>
                <p>Hello {{customerName}}, we were unable to process your payment for your RinaWarp Terminal {{planName}} subscription.</p>
            </div>
            
            <h3>What This Means</h3>
            <ul>
                <li>Your subscription is currently past due</li>
                <li>Access to premium features may be limited soon</li>
                <li>Your account will remain active for a few more days</li>
            </ul>
            
            <h3>How to Fix This</h3>
            <ol>
                <li>Click the button below to update your payment method</li>
                <li>Ensure your card has sufficient funds</li>
                <li>Check that your billing information is current</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{billingPortalLink}}" class="button">💳 Update Payment Method</a>
            </div>
            
            <h3>Need Help?</h3>
            <p>If you're experiencing issues or have questions about your subscription, please don't hesitate to contact our support team. We're here to help!</p>
            
            <p><strong>Important:</strong> If we don't receive payment within the next few days, your subscription will be cancelled and access to premium features will be removed.</p>
        </div>
        
        <div class="footer">
            <p>Need immediate help? Email us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
            <p>&copy; 2025 RinaWarp Technologies</p>
        </div>
    </div>
</body>
</html>
        `;
  }

  // Get support ticket template
  getSupportTicketTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Support Ticket Received</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #00d4ff, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; }
        .footer { background: #1a1a1b; color: #a0a0a0; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .message-box { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Support Ticket Received</h1>
            <p>We've received your message, {{customerName}}</p>
        </div>
        
        <div class="content">
            <h2>📨 Thank You for Contacting Us</h2>
            <p>We've received your support request and our team will get back to you as soon as possible, usually within 24 hours.</p>
            
            <div class="message-box">
                <h3>Your Message</h3>
                <p><strong>Subject:</strong> {{subject}}</p>
                <p><strong>Ticket ID:</strong> {{ticketId}}</p>
                <div style="background: #f9fafb; padding: 15px; border-radius: 4px; margin-top: 10px;">
                    {{message}}
                </div>
            </div>
            
            <h3>What Happens Next</h3>
            <ol>
                <li>Our support team will review your message</li>
                <li>You'll receive a detailed response via email</li>
                <li>If needed, we may ask for additional information</li>
                <li>We'll work together to resolve your issue</li>
            </ol>
            
            <h3>💡 In the Meantime</h3>
            <ul>
                <li>Check our documentation for common solutions</li>
                <li>Join our Discord community for peer support</li>
                <li>Browse our FAQ section</li>
            </ul>
            
            <p><strong>Response Time:</strong> We typically respond within 24 hours during business days. Premium customers receive priority support.</p>
        </div>
        
        <div class="footer">
            <p>Urgent issue? Email us directly at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
            <p>&copy; 2025 RinaWarp Technologies. We're here to help!</p>
        </div>
    </div>
</body>
</html>
        `;
  }
}

// Create and export singleton instance
const emailService = new EmailService();

module.exports = emailService;
