/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

import fs from 'fs/promises';
import path from 'path';
import { createTransport } from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SupportSystem {
  constructor(config = {}) {
    this.config = {
      dataDir: path.join(__dirname, '../../data/support'),
      autoResponseEnabled: true,
      businessHours: {
        start: 9, // 9 AM
        end: 17, // 5 PM
        timezone: 'UTC',
        weekdays: [1, 2, 3, 4, 5], // Monday to Friday
      },
      priorityLevels: {
        low: { name: 'Low', slaHours: 48, color: '#28a745' },
        medium: { name: 'Medium', slaHours: 24, color: '#ffc107' },
        high: { name: 'High', slaHours: 8, color: '#fd7e14' },
        urgent: { name: 'Urgent', slaHours: 2, color: '#dc3545' },
      },
      categories: {
        technical: 'Technical Issues',
        billing: 'Billing & Payments',
        feature: 'Feature Requests',
        bug: 'Bug Reports',
        general: 'General Questions',
      },
      webhookUrl: process.env.SUPPORT_WEBHOOK_URL,
      ...config,
    };

    this.setupEmailTransporter();
    this.initializeSystem();
  }

  setupAutoResponses() {
    // Auto-response system setup (placeholder)
  }

  async setupEmailTransporter() {
    if (process.env.SENDGRID_API_KEY) {
      this.transporter = createTransport({
        service: 'sendgrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    } else {
      console.warn('Support: Email transporter not configured - using mock mode');
      this.transporter = null;
    }
  }

  async initializeSystem() {
    try {
      await fs.mkdir(this.config.dataDir, { recursive: true });

      // Initialize data files
      const files = [
        'tickets.json',
        'responses.json',
        'knowledge_base.json',
        'auto_responses.json',
        'stats.json',
      ];

      for (const file of files) {
        const filePath = path.join(this.config.dataDir, file);
        try {
          await fs.access(filePath);
        } catch {
          if (file === 'knowledge_base.json') {
            await this.initializeKnowledgeBase(filePath);
          } else if (file === 'auto_responses.json') {
            await this.initializeAutoResponses(filePath);
          } else if (file === 'tickets.json') {
            await fs.writeFile(filePath, JSON.stringify([], null, 2));
          } else {
            await fs.writeFile(filePath, JSON.stringify({}, null, 2));
          }
        }
      }
    } catch (error) {
      console.error('Support: Failed to initialize system:', error);
    }
  }

  async initializeKnowledgeBase(filePath) {
    const knowledgeBase = {
      articles: [
        {
          id: 'kb001',
          title: 'Getting Started with RinaWarp Terminal',
          category: 'general',
          tags: ['setup', 'installation', 'quickstart'],
          content: `
                        # Getting Started with RinaWarp Terminal
                        
                        ## Installation
                        1. Download the installer from https://rinawarptech.com/download
                        2. Run the installer for your operating system
                        3. Launch RinaWarp Terminal
                        
                        ## First Steps
                        - Press Ctrl+A to activate AI Agent Mode
                        - Customize your theme in Settings
                        - Set up voice control if desired
                        
                        ## Need Help?
                        Contact our support team at support@rinawarptech.com
                    `,
          helpful: 0,
          notHelpful: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'kb002',
          title: 'AI Agent Mode Not Working',
          category: 'technical',
          tags: ['ai', 'agent', 'troubleshooting'],
          content: `
                        # AI Agent Mode Troubleshooting
                        
                        ## Common Issues
                        
                        ### Agent Mode doesn't activate
                        - Ensure you have an active internet connection
                        - Check if your API keys are configured correctly
                        - Try restarting the application
                        
                        ### Slow AI responses
                        - Check your internet connection speed
                        - Try switching to a different AI provider in settings
                        - Contact support if issues persist
                        
                        ## API Key Configuration
                        1. Go to Settings > AI Configuration
                        2. Enter your OpenAI or Anthropic API key
                        3. Test the connection
                    `,
          helpful: 0,
          notHelpful: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'kb003',
          title: 'Billing and Subscription Management',
          category: 'billing',
          tags: ['billing', 'subscription', 'payment'],
          content: `
                        # Billing and Subscription Management
                        
                        ## Viewing Your Subscription
                        - Log in to your account at https://rinawarptech.com/account
                        - View current plan and usage
                        - Download invoices
                        
                        ## Changing Your Plan
                        1. Go to Settings > Account
                        2. Click "Change Plan"
                        3. Select your new plan
                        4. Confirm the change
                        
                        ## Cancellation
                        You can cancel your subscription at any time from your account dashboard.
                        Your access will continue until the end of your current billing period.
                        
                        ## Refunds
                        We offer a 30-day money-back guarantee for all subscriptions.
                        Contact support@rinawarptech.com for refund requests.
                    `,
          helpful: 0,
          notHelpful: 0,
          createdAt: new Date().toISOString(),
        },
      ],
      faqs: [
        {
          question: 'What operating systems are supported?',
          answer: 'RinaWarp Terminal supports Windows 10+, macOS 10.14+, and Ubuntu 18.04+.',
          category: 'general',
        },
        {
          question: 'Can I use my own AI API keys?',
          answer:
            'Yes! You can configure your own OpenAI, Anthropic, or other supported AI provider keys in the settings.',
          category: 'technical',
        },
        {
          question: 'Is there a free trial?',
          answer:
            'Yes, we offer a free beta version with limited features. You can download it from our website.',
          category: 'billing',
        },
      ],
    };

    await fs.writeFile(filePath, JSON.stringify(knowledgeBase, null, 2));
  }

  async initializeAutoResponses(filePath) {
    const autoResponses = {
      acknowledgment: {
        subject: 'We received your support request - Ticket #{ticketId}',
        template: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #00D4FF;">Thank you for contacting RinaWarp Support!</h2>
                        
                        <p>Hi {customerName},</p>
                        
                        <p>We've received your support request and assigned it ticket ID <strong>#{ticketId}</strong>.</p>
                        
                        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>Ticket Details:</h3>
                            <ul>
                                <li><strong>Subject:</strong> {subject}</li>
                                <li><strong>Priority:</strong> {priority}</li>
                                <li><strong>Category:</strong> {category}</li>
                                <li><strong>Expected Response:</strong> Within {slaHours} hours</li>
                            </ul>
                        </div>
                        
                        <p>Our support team will respond to your request within {slaHours} hours during business hours (9 AM - 5 PM UTC, Monday-Friday).</p>
                        
                        <h3>Quick Help:</h3>
                        <p>While you wait, you might find answers in our <a href="https://rinawarptech.com/docs">documentation</a> or <a href="https://rinawarptech.com/support/kb">knowledge base</a>.</p>
                        
                        <p>Best regards,<br>The RinaWarp Support Team</p>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #666;">
                            Please do not reply to this email. To add information to your ticket, 
                            visit <a href="https://rinawarptech.com/support/ticket/{ticketId}">your ticket page</a>.
                        </p>
                    </div>
                `,
      },
      resolution: {
        subject: 'Your support ticket has been resolved - #{ticketId}',
        template: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #28a745;">Ticket Resolved: #{ticketId}</h2>
                        
                        <p>Hi {customerName},</p>
                        
                        <p>Great news! Your support ticket <strong>#{ticketId}</strong> has been resolved.</p>
                        
                        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>Resolution Summary:</h3>
                            <p>{resolutionSummary}</p>
                        </div>
                        
                        <h3>Was this helpful?</h3>
                        <p>Please take a moment to rate your support experience:</p>
                        <p>
                            <a href="https://rinawarptech.com/support/feedback/{ticketId}?rating=5" style="background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; margin-right: 10px;">😊 Excellent</a>
                            <a href="https://rinawarptech.com/support/feedback/{ticketId}?rating=3" style="background: #ffc107; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; margin-right: 10px;">😐 Okay</a>
                            <a href="https://rinawarptech.com/support/feedback/{ticketId}?rating=1" style="background: #dc3545; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">😞 Poor</a>
                        </p>
                        
                        <p>If you need further assistance, feel free to reply to this ticket or create a new one.</p>
                        
                        <p>Best regards,<br>The RinaWarp Support Team</p>
                    </div>
                `,
      },
      outOfHours: {
        subject: 'Out of Office - We\'ll respond soon! - Ticket #{ticketId}',
        template: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #00D4FF;">Thanks for your message!</h2>
                        
                        <p>Hi {customerName},</p>
                        
                        <p>We've received your support request (Ticket #{ticketId}) outside of our normal business hours.</p>
                        
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3><strong>Our Business Hours:</strong></h3>
                            <p>Monday - Friday: 9:00 AM - 5:00 PM UTC</p>
                            <p><strong>Next business day:</strong> {nextBusinessDay}</p>
                        </div>
                        
                        <p>We'll respond to your request during our next business hours. For urgent technical issues, please check our <a href="https://rinawarptech.com/status">status page</a>.</p>
                        
                        <p>Thank you for your patience!</p>
                        
                        <p>Best regards,<br>The RinaWarp Support Team</p>
                    </div>
                `,
      },
    };

    await fs.writeFile(filePath, JSON.stringify(autoResponses, null, 2));
  }

  async createTicket(ticketData) {
    const ticket = {
      id: this.generateTicketId(),
      subject: ticketData.subject,
      description: ticketData.description,
      customerName: ticketData.customerName,
      customerEmail: ticketData.customerEmail,
      category: ticketData.category || 'general',
      priority: this.determinePriority(ticketData),
      status: 'open',
      assignedTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ticketData.tags || [],
      attachments: ticketData.attachments || [],
      responses: [],
      metadata: {
        userAgent: ticketData.userAgent,
        ip: ticketData.ip,
        source: ticketData.source || 'web',
        version: ticketData.version,
      },
    };

    try {
      // Save ticket
      await this.saveTicket(ticket);

      // Send auto-acknowledgment
      if (this.config.autoResponseEnabled) {
        await this.sendAutoResponse(ticket, 'acknowledgment');
      }

      // Send webhook notification
      if (this.config.webhookUrl) {
        await this.sendWebhookNotification('ticket_created', ticket);
      }

      return { success: true, ticketId: ticket.id };
    } catch (error) {
      console.error('Support: Failed to create ticket:', error);
      return { success: false, error: error.message };
    }
  }

  async addResponse(ticketId, responseData) {
    try {
      const ticket = await this.getTicket(ticketId);
      if (!ticket) {
        throw new Error(new Error(new Error('Ticket not found')));
      }

      const response = {
        id: this.generateId(),
        ticketId,
        author: responseData.author,
        authorType: responseData.authorType || 'support', // 'support' or 'customer'
        message: responseData.message,
        isPublic: responseData.isPublic !== false,
        attachments: responseData.attachments || [],
        createdAt: new Date().toISOString(),
      };

      ticket.responses.push(response);
      ticket.updatedAt = new Date().toISOString();

      // Update status if this is a support response
      if (response.authorType === 'support' && ticket.status === 'open') {
        ticket.status = 'pending_customer';
      } else if (response.authorType === 'customer' && ticket.status === 'pending_customer') {
        ticket.status = 'open';
      }

      await this.saveTicket(ticket);

      // Send email notification
      if (response.authorType === 'support') {
        await this.sendResponseNotification(ticket, response);
      }

      return { success: true, responseId: response.id };
    } catch (error) {
      console.error('Support: Failed to add response:', error);
      return { success: false, error: error.message };
    }
  }

  async resolveTicket(ticketId, resolutionData) {
    try {
      const ticket = await this.getTicket(ticketId);
      if (!ticket) {
        throw new Error(new Error(new Error('Ticket not found')));
      }

      ticket.status = 'resolved';
      ticket.resolvedAt = new Date().toISOString();
      ticket.resolvedBy = resolutionData.resolvedBy;
      ticket.resolutionSummary = resolutionData.summary;
      ticket.updatedAt = new Date().toISOString();

      await this.saveTicket(ticket);

      // Send resolution email
      await this.sendAutoResponse(ticket, 'resolution');

      // Send webhook notification
      if (this.config.webhookUrl) {
        await this.sendWebhookNotification('ticket_resolved', ticket);
      }

      return { success: true };
    } catch (error) {
      console.error('Support: Failed to resolve ticket:', error);
      return { success: false, error: error.message };
    }
  }

  async searchKnowledgeBase(query) {
    try {
      const kbPath = path.join(this.config.dataDir, 'knowledge_base.json');
      const kb = JSON.parse(await fs.readFile(kbPath, 'utf8'));

      const results = [];
      const queryLower = query.toLowerCase();

      // Search articles
      for (const article of kb.articles) {
        let score = 0;

        // Title match (highest weight)
        if (article.title.toLowerCase().includes(queryLower)) {
          score += 10;
        }

        // Tag match
        for (const tag of article.tags) {
          if (tag.toLowerCase().includes(queryLower)) {
            score += 5;
          }
        }

        // Content match
        if (article.content.toLowerCase().includes(queryLower)) {
          score += 2;
        }

        if (score > 0) {
          results.push({ ...article, score, type: 'article' });
        }
      }

      // Search FAQs
      for (const faq of kb.faqs) {
        let score = 0;

        if (faq.question.toLowerCase().includes(queryLower)) {
          score += 8;
        }

        if (faq.answer.toLowerCase().includes(queryLower)) {
          score += 3;
        }

        if (score > 0) {
          results.push({ ...faq, score, type: 'faq' });
        }
      }

      return results.sort((a, b) => b.score - a.score).slice(0, 10);
    } catch (error) {
      console.error('Support: Knowledge base search failed:', error);
      return [];
    }
  }

  async getSupportStats() {
    try {
      const tickets = await this.getAllTickets();
      const now = new Date();
      const last24h = new Date(now - 24 * 60 * 60 * 1000);
      const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

      const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        pending: tickets.filter(t => t.status === 'pending_customer').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        closed: tickets.filter(t => t.status === 'closed').length,
        last24h: tickets.filter(t => new Date(t.createdAt) > last24h).length,
        last7d: tickets.filter(t => new Date(t.createdAt) > last7d).length,
        last30d: tickets.filter(t => new Date(t.createdAt) > last30d).length,
        byCategory: this.groupBy(tickets, 'category'),
        byPriority: this.groupBy(tickets, 'priority'),
        averageResponseTime: this.calculateAverageResponseTime(tickets),
        slaBreaches: this.calculateSLABreaches(tickets),
      };

      return stats;
    } catch (error) {
      console.error('Support: Failed to get stats:', error);
      return { error: error.message };
    }
  }

  determinePriority(ticketData) {
    const subject = (ticketData.subject || '').toLowerCase();
    const description = (ticketData.description || '').toLowerCase();
    const text = subject + ' ' + description;

    // Urgent keywords
    if (
      text.includes('urgent') ||
      text.includes('critical') ||
      text.includes('down') ||
      text.includes('not working') ||
      text.includes('broken') ||
      text.includes('can\'t login') ||
      text.includes('billing issue')
    ) {
      return 'urgent';
    }

    // High priority keywords
    if (
      text.includes('important') ||
      text.includes('asap') ||
      text.includes('payment') ||
      text.includes('subscription')
    ) {
      return 'high';
    }

    // Medium priority keywords
    if (text.includes('feature') || text.includes('improvement') || text.includes('suggestion')) {
      return 'medium';
    }

    return 'low';
  }

  async sendAutoResponse(ticket, responseType) {
    if (!this.transporter) return;

    try {
      const responsesPath = path.join(this.config.dataDir, 'auto_responses.json');
      const responses = JSON.parse(await fs.readFile(responsesPath, 'utf8'));
      const response = responses[responseType];

      if (!response) return;

      const template = this.replaceTemplatePlaceholders(response.template, ticket);
      const subject = this.replaceTemplatePlaceholders(response.subject, ticket);

      await this.transporter.sendMail({
        from: process.env.SENDGRID_FROM_EMAIL,
        to: ticket.customerEmail,
        subject,
        html: template,
        text: this.stripHtml(template),
      });
    } catch (error) {
      console.error('Support: Failed to send auto-response:', error);
    }
  }

  replaceTemplatePlaceholders(template, ticket) {
    return template
      .replace(/{ticketId}/g, ticket.id)
      .replace(/{customerName}/g, ticket.customerName || 'there')
      .replace(/{subject}/g, ticket.subject)
      .replace(/{priority}/g, this.config.priorityLevels[ticket.priority]?.name || ticket.priority)
      .replace(/{category}/g, this.config.categories[ticket.category] || ticket.category)
      .replace(/{slaHours}/g, this.config.priorityLevels[ticket.priority]?.slaHours || 24)
      .replace(/{resolutionSummary}/g, ticket.resolutionSummary || 'Your issue has been resolved.')
      .replace(/{nextBusinessDay}/g, this.getNextBusinessDay());
  }

  getNextBusinessDay() {
    const now = new Date();
    const nextDay = new Date(now);
    nextDay.setDate(now.getDate() + 1);

    while (!this.isBusinessDay(nextDay)) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay.toLocaleDateString();
  }

  isBusinessDay(date) {
    const day = date.getDay();
    return this.config.businessHours.weekdays.includes(day);
  }

  generateTicketId() {
    return (
      'TKT-' +
      Date.now().toString(36).toUpperCase() +
      '-' +
      Math.random().toString(36).substr(2, 3).toUpperCase()
    );
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  async saveTicket(ticket) {
    const ticketsPath = path.join(this.config.dataDir, 'tickets.json');
    const tickets = await this.getAllTickets();

    const existingIndex = tickets.findIndex(t => t.id === ticket.id);
    if (existingIndex >= 0) {
      tickets[existingIndex] = ticket;
    } else {
      tickets.push(ticket);
    }

    await fs.writeFile(ticketsPath, JSON.stringify(tickets, null, 2));
  }

  async getTicket(ticketId) {
    const tickets = await this.getAllTickets();
    return tickets.find(t => t.id === ticketId);
  }

  async getAllTickets() {
    try {
      const ticketsPath = path.join(this.config.dataDir, 'tickets.json');
      const data = await fs.readFile(ticketsPath, 'utf8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key];
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  calculateAverageResponseTime(tickets) {
    const responseTimes = [];

    tickets.forEach(ticket => {
      if (ticket.responses.length > 0) {
        const firstResponse = ticket.responses.find(r => r.authorType === 'support');
        if (firstResponse) {
          const responseTime = new Date(firstResponse.createdAt) - new Date(ticket.createdAt);
          responseTimes.push(responseTime);
        }
      }
    });

    if (responseTimes.length === 0) return 0;

    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(average / (1000 * 60 * 60)); // Convert to hours
  }

  calculateSLABreaches(tickets) {
    let breaches = 0;

    tickets.forEach(ticket => {
      const slaHours = this.config.priorityLevels[ticket.priority]?.slaHours || 24;
      const slaDeadline = new Date(ticket.createdAt);
      slaDeadline.setHours(slaDeadline.getHours() + slaHours);

      const firstResponse = ticket.responses.find(r => r.authorType === 'support');
      if (!firstResponse && new Date() > slaDeadline) {
        breaches++;
      } else if (firstResponse && new Date(firstResponse.createdAt) > slaDeadline) {
        breaches++;
      }
    });

    return breaches;
  }

  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Support: Webhook notification failed:', error);
    }
  }

  async sendResponseNotification(ticket, response) {
    if (!this.transporter) return;

    try {
      await this.transporter.sendMail({
        from: process.env.SENDGRID_FROM_EMAIL,
        to: ticket.customerEmail,
        subject: `Update on your ticket: ${ticket.subject} [#${ticket.id}]`,
        html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #00D4FF;">Ticket Update: #${ticket.id}</h2>
                        <p>Hi ${ticket.customerName || 'there'},</p>
                        <p>We've added a new response to your support ticket:</p>
                        <div style="background: #f8f9fa; border-left: 4px solid #00D4FF; padding: 20px; margin: 20px 0;">
                            ${response.message}
                        </div>
                        <p><a href="https://rinawarptech.com/support/ticket/${ticket.id}">View full ticket</a></p>
                        <p>Best regards,<br>The RinaWarp Support Team</p>
                    </div>
                `,
        text: `Ticket Update: #${ticket.id}\n\nHi ${ticket.customerName || 'there'},\n\nWe've added a new response to your support ticket:\n\n${response.message}\n\nView full ticket: https://rinawarptech.com/support/ticket/${ticket.id}\n\nBest regards,\nThe RinaWarp Support Team`,
      });
    } catch (error) {
      console.error('Support: Failed to send response notification:', error);
    }
  }
}

export default SupportSystem;
