import { createTransport } from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LeadCaptureSystem {
  constructor(config = {}) {
    this.config = {
      emailProvider: process.env.EMAIL_PROVIDER || 'sendgrid',
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL,
      webhookUrl: process.env.MARKETING_WEBHOOK_URL,
      leadsFile: path.join(__dirname, '../../data/leads.json'),
      campaignsFile: path.join(__dirname, '../../data/campaigns.json'),
      ...config
    };
        
    this.setupEmailTransporter();
    this.initializeDataFiles();
  }

  async setupEmailTransporter() {
    if (this.config.emailProvider === 'sendgrid' && this.config.sendgridApiKey) {
      this.transporter = createTransport({
        service: 'sendgrid',
        auth: {
          user: 'apikey',
          pass: this.config.sendgridApiKey
        }
      });
    } else {
      console.warn('Marketing: Email transporter not configured - using mock mode');
      this.transporter = null;
    }
  }

  async initializeDataFiles() {
    try {
      await fs.mkdir(path.dirname(this.config.leadsFile), { recursive: true });
            
      // Initialize leads file
      try {
        await fs.access(this.config.leadsFile);
      } catch {
        await fs.writeFile(this.config.leadsFile, JSON.stringify([], null, 2));
      }
            
      // Initialize campaigns file
      try {
        await fs.access(this.config.campaignsFile);
      } catch {
        await fs.writeFile(this.config.campaignsFile, JSON.stringify({
          welcome_series: {
            name: 'Welcome Series',
            emails: [
              {
                delay: 0,
                subject: 'Welcome to RinaWarp Terminal! 🚀',
                template: 'welcome'
              },
              {
                delay: 24 * 60 * 60 * 1000, // 24 hours
                subject: 'Quick Start Guide - Get Up and Running in 5 Minutes',
                template: 'quickstart'
              },
              {
                delay: 3 * 24 * 60 * 60 * 1000, // 3 days
                subject: 'Advanced Features You\'ll Love ⚡',
                template: 'features'
              },
              {
                delay: 7 * 24 * 60 * 60 * 1000, // 7 days
                subject: 'Special Launch Offer - 30% Off Pro Plans',
                template: 'discount'
              }
            ]
          }
        }, null, 2));
      }
    } catch (error) {
      console.error('Marketing: Failed to initialize data files:', error);
    }
  }

  async captureLead(leadData) {
    const lead = {
      id: this.generateId(),
      email: leadData.email,
      name: leadData.name || '',
      source: leadData.source || 'website',
      interests: leadData.interests || [],
      metadata: leadData.metadata || {},
      capturedAt: new Date().toISOString(),
      status: 'active',
      tags: leadData.tags || []
    };

    try {
      // Save lead to file
      const leads = await this.getLeads();
            
      // Check for duplicates
      const existingLead = leads.find(l => l.email === lead.email);
      if (existingLead) {
        // Update existing lead
        Object.assign(existingLead, {
          ...lead,
          id: existingLead.id,
          capturedAt: existingLead.capturedAt,
          updatedAt: new Date().toISOString()
        });
      } else {
        leads.push(lead);
      }
            
      await fs.writeFile(this.config.leadsFile, JSON.stringify(leads, null, 2));
            
      // Start welcome email series
      await this.startCampaign(lead.email, 'welcome_series');
            
      // Send webhook notification
      if (this.config.webhookUrl) {
        await this.sendWebhookNotification('lead_captured', lead);
      }
            
      console.log(`Marketing: Lead captured - ${lead.email} from ${lead.source}`);
      return { success: true, leadId: lead.id };
            
    } catch (error) {
      console.error('Marketing: Failed to capture lead:', error);
      return { success: false, error: error.message };
    }
  }

  async startCampaign(email, campaignId) {
    try {
      const campaigns = JSON.parse(await fs.readFile(this.config.campaignsFile, 'utf8'));
      const campaign = campaigns[campaignId];
            
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }
            
      // Schedule emails
      for (const emailConfig of campaign.emails) {
        setTimeout(async () => {
          await this.sendCampaignEmail(email, emailConfig);
        }, emailConfig.delay);
      }
            
      console.log(`Marketing: Started campaign ${campaignId} for ${email}`);
            
    } catch (error) {
      console.error('Marketing: Failed to start campaign:', error);
    }
  }

  async sendCampaignEmail(email, emailConfig) {
    if (!this.transporter) {
      console.log(`Marketing: Mock email sent to ${email} - ${emailConfig.subject}`);
      return;
    }

    try {
      const template = await this.getEmailTemplate(emailConfig.template);
            
      const mailOptions = {
        from: this.config.sendgridFromEmail,
        to: email,
        subject: emailConfig.subject,
        html: template,
        text: this.stripHtml(template)
      };
            
      await this.transporter.sendMail(mailOptions);
      console.log(`Marketing: Campaign email sent to ${email} - ${emailConfig.subject}`);
            
    } catch (error) {
      console.error('Marketing: Failed to send campaign email:', error);
    }
  }

  async getEmailTemplate(templateName) {
    const templates = {
      welcome: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #00D4FF;">Welcome to RinaWarp Terminal! 🚀</h1>
                    <p>Thank you for joining thousands of developers who've chosen RinaWarp Terminal as their AI-powered development environment.</p>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>What's Next?</h3>
                        <ul>
                            <li>📥 <a href="https://rinawarptech.com/download">Download RinaWarp Terminal</a></li>
                            <li>📖 <a href="https://rinawarptech.com/docs">Read the Quick Start Guide</a></li>
                            <li>💬 <a href="https://discord.gg/rinawarp">Join our Discord Community</a></li>
                        </ul>
                    </div>
                    
                    <p>Questions? Just reply to this email - we're here to help!</p>
                    
                    <p>Best,<br>The RinaWarp Team</p>
                </div>
            `,
      quickstart: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #00D4FF;">Get Started in 5 Minutes ⚡</h1>
                    <p>Ready to supercharge your terminal experience? Here's how to get up and running quickly:</p>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Step 1: Install & Setup</h3>
                        <code style="background: #e0e0e0; padding: 4px 8px; border-radius: 4px;">
                            Download → Install → Launch
                        </code>
                    </div>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Step 2: Enable AI Assistant</h3>
                        <p>Press <strong>Ctrl+A</strong> to activate Agent Mode and start coding with AI assistance.</p>
                    </div>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Step 3: Explore Features</h3>
                        <ul>
                            <li>🎨 Modern themes and customization</li>
                            <li>🔊 Voice control integration</li>
                            <li>🚀 Advanced terminal operations</li>
                        </ul>
                    </div>
                    
                    <p><a href="https://rinawarptech.com/docs/quickstart" style="background: #00D4FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Full Quick Start Guide</a></p>
                </div>
            `,
      features: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #00D4FF;">Advanced Features You'll Love ⚡</h1>
                    <p>Now that you've had a chance to try RinaWarp Terminal, let's explore some powerful features that will boost your productivity:</p>
                    
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>🤖 AI Agent Mode</h3>
                        <p>Your intelligent coding companion that understands context and helps with complex tasks.</p>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>🎨 Modern Themes</h3>
                        <p>Beautiful, customizable themes that adapt to your workflow and preferences.</p>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>🔊 Voice Control</h3>
                        <p>Control your terminal with natural voice commands powered by ElevenLabs.</p>
                    </div>
                    
                    <p><a href="https://rinawarptech.com/features" style="background: #00D4FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Explore All Features</a></p>
                </div>
            `,
      discount: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #FF6B6B;">Special Launch Offer - 30% Off! 🎉</h1>
                    <p>As one of our early adopters, we're excited to offer you an exclusive discount on our Pro plans:</p>
                    
                    <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%); color: white; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center;">
                        <h2 style="margin: 0;">30% OFF</h2>
                        <p style="font-size: 18px; margin: 10px 0;">All Pro Plans</p>
                        <code style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 6px; font-size: 20px;">LAUNCH30</code>
                    </div>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Pro Features Include:</h3>
                        <ul>
                            <li>✨ Advanced AI capabilities</li>
                            <li>🎯 Priority support</li>
                            <li>🔧 Custom integrations</li>
                            <li>📊 Usage analytics</li>
                            <li>🎨 Premium themes</li>
                        </ul>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="https://rinawarptech.com/pricing?code=LAUNCH30" style="background: #FF6B6B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px;">Claim Your Discount</a>
                    </p>
                    
                    <p style="font-size: 14px; color: #666;">Offer expires in 48 hours. Use code LAUNCH30 at checkout.</p>
                </div>
            `
    };
        
    return templates[templateName] || templates.welcome;
  }

  async getLeads() {
    try {
      const data = await fs.readFile(this.config.leadsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async getLeadStats() {
    const leads = await this.getLeads();
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);
        
    return {
      total: leads.length,
      last24h: leads.filter(l => new Date(l.capturedAt) > last24h).length,
      last7d: leads.filter(l => new Date(l.capturedAt) > last7d).length,
      last30d: leads.filter(l => new Date(l.capturedAt) > last30d).length,
      sources: this.groupBy(leads, 'source'),
      tags: this.groupBy(leads.flatMap(l => l.tags)),
      conversionFunnel: await this.getConversionFunnel()
    };
  }

  async getConversionFunnel() {
    // This would integrate with your analytics system
    return {
      visitors: 1000,
      signups: 250,
      downloads: 180,
      activations: 120,
      conversions: 45
    };
  }

  async sendWebhookNotification(event, data) {
    if (!this.config.webhookUrl) return;
        
    try {
      const fetch = await import('node-fetch');
      await fetch.default(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          data,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Marketing: Webhook notification failed:', error);
    }
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = typeof key === 'function' ? key(item) : item[key];
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

export default LeadCaptureSystem;
