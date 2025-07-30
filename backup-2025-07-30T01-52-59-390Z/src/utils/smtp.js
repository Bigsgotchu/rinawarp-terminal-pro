/**
 * RinaWarp Terminal - SMTP Utility
 * Handles email functionality with mock support for development
 */

import nodemailer from 'nodemailer';
import EmailPersonalizationEngine from '../../email-templates/beta-campaign/personalization-engine.js';

class SMTPService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.personalizationEngine = new EmailPersonalizationEngine();
    this.init();
  }

  init() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Real SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('✅ Real SMTP transporter configured');
      this.initialized = true;
    } else if (process.env.SENDGRID_API_KEY) {
      // SendGrid SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
      console.log('✅ SendGrid SMTP transporter configured');
      this.initialized = true;
    } else if (process.env.NODE_ENV === 'development') {
      // Mock transporter for development
      this.transporter = {
        sendMail: async mailOptions => {
          console.log('📧 [MOCK EMAIL] Simulating email send:');
          console.log('   To:', mailOptions.to);
          console.log('   Subject:', mailOptions.subject);
          console.log('   From:', mailOptions.from);
          console.log('   Text Preview:', mailOptions.text?.substring(0, 200) + '...');

          // Simulate email processing delay
          await new Promise(resolve => setTimeout(resolve, 100));

          return {
            messageId: 'mock-' + Date.now(),
            accepted: [mailOptions.to],
            rejected: [],
            response: '250 Mock email sent successfully',
          };
        },
      };
      console.log('✅ Mock SMTP transporter configured for development');
      this.initialized = true;
    } else {
      console.log(
        '⚠️ No email service configured (neither SMTP nor SendGrid) and not in development mode'
      );
      this.initialized = false;
    }
  }

  async sendPersonalizedEmail(recipient, template) {
    if (!this.initialized) {
      throw new Error('SMTP service not initialized');
    }

    // Personalize the email
    const personalizedContent = this.personalizationEngine.personalizeEmail(recipient, template);

    const fromEmail =
      process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'noreply@rinawarp.com';
    const mailOptions = {
      from: `RinaWarp Terminal <${fromEmail}>`,
      to: recipient.email,
      subject: personalizedContent.subject,
      html: personalizedContent.content,
      // Optionally include a text version
      text: personalizedContent.content.replace(/(\<([^\>]+)\>)/gi, ''), // Strip HTML for text version
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Personalized email sent successfully:', {
        to: recipient.email,
        subject: personalizedContent.subject,
        messageId: info.messageId,
        abTestVariant: personalizedContent.abTestVariant,
        audienceSegment: personalizedContent.audienceSegment,
        discountCode: personalizedContent.discountCode,
      });
      return {
        ...info,
        personalizedContent: personalizedContent,
      };
    } catch (error) {
      console.error('❌ Error sending personalized email:', error);
      throw error;
    }
  }

  async sendEmail(options) {
    if (!this.initialized) {
      throw new Error('SMTP service not initialized');
    }

    const fromEmail =
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.SMTP_FROM_EMAIL ||
      process.env.SMTP_USER ||
      'noreply@rinawarp.com';
    const mailOptions = {
      from: options.from || `"RinaWarp Terminal" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      ...options,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', {
        to: options.to,
        subject: options.subject,
        messageId: info.messageId,
      });
      return info;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  }

  async sendLicenseEmail(customerEmail, licenseKey, licenseType) {
    const licenseTypeFormatted = licenseType.charAt(0).toUpperCase() + licenseType.slice(1);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #1a1a1a; padding: 30px; border-radius: 10px; color: white; text-align: center;">
          <h1 style="color: #00ff88; margin-bottom: 20px;">🎉 Welcome to RinaWarp Terminal!</h1>
          <p style="font-size: 18px; margin-bottom: 30px;">Thank you for purchasing RinaWarp Terminal ${licenseTypeFormatted}!</p>
          
          <div style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #00ff88; margin-bottom: 15px;">Your License Key</h2>
            <div style="background-color: #000; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 16px; word-break: break-all; color: #00ff88; border: 2px solid #00ff88;">
              ${licenseKey}
            </div>
          </div>
          
          <div style="text-align: left; margin-top: 30px;">
            <h3 style="color: #00ff88;">Getting Started:</h3>
            <ol style="color: #cccccc; line-height: 1.6;">
              <li>Download RinaWarp Terminal from <a href="https://rinawarptech.com/" style="color: #00ff88;">our website</a></li>
              <li>Install and launch the application</li>
              <li>Go to Settings → License</li>
              <li>Enter your license key above</li>
              <li>Enjoy your ${licenseTypeFormatted} features!</li>
            </ol>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #444;">
            <p style="color: #888; font-size: 14px;">Need help? Contact us at support@rinawarp.com</p>
            <p style="color: #888; font-size: 14px;">License Type: ${licenseTypeFormatted}</p>
          </div>
        </div>
      </div>
    `;

    const textContent = `
      Welcome to RinaWarp Terminal!
      
      Thank you for purchasing RinaWarp Terminal ${licenseTypeFormatted}!
      
      Your License Key: ${licenseKey}
      
      Getting Started:
      1. Download RinaWarp Terminal from https://rinawarptech.com/
      2. Install and launch the application
      3. Go to Settings → License
      4. Enter your license key above
      5. Enjoy your ${licenseTypeFormatted} features!
      
      Need help? Contact us at support@rinawarp.com
      License Type: ${licenseTypeFormatted}
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: `🎉 Your RinaWarp Terminal ${licenseTypeFormatted} License Key`,
      text: textContent,
      html: htmlContent,
    });
  }

  isInitialized() {
    return this.initialized;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      mode: process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST ? 'mock' : 'real',
      configured: !!process.env.SMTP_HOST,
    };
  }

  reinitialize() {
    console.log('🔄 Reinitializing SMTP service...');
    this.init();
  }
}

// Export singleton instance
export default new SMTPService();
