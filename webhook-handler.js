import express from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Enable JSON parsing for checkout session creation
app.use(express.json());

// Serve static files (for downloads)
app.use('/releases', express.static('releases'));
app.use(express.static('public'));

// Configure email transporter (fallback if no email service configured)
let transporter = null;
if (process.env.SENDGRID_API_KEY) {
  transporter = nodemailer.createTransport({
    service: 'SendGrid',
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
} else if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Download URLs mapping - Updated with latest Enhanced AI Edition builds
const DOWNLOAD_LINKS = {
  personal: {
    windows: '/releases/RinaWarp-Terminal-Windows-Portable.zip',
    macos: '/releases/rinawarp.zip',
    linux: '/releases/rinawarp.zip'
  },
  professional: {
    windows: '/releases/RinaWarp-Terminal-Windows-Portable.zip',
    macos: '/releases/rinawarp.zip', 
    linux: '/releases/rinawarp.zip'
  },
  team: {
    windows: '/releases/RinaWarp-Terminal-Windows-Portable.zip',
    macos: '/releases/rinawarp.zip',
    linux: '/releases/rinawarp.zip'
  }
};

// Simplified deployment - same binary for all tiers, license key controls features

function generateLicenseKey(plan, email) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  const planCode = {
    personal: 'PER',
    professional: 'PRO', 
    team: 'TEAM'
  }[plan] || 'UNK';
  
  return `RWT-${planCode}-${timestamp.toString(36).toUpperCase()}-${random.toUpperCase()}`;
}

function createDownloadEmail(customerEmail, customerName, plan, licenseKey) {
  const downloads = DOWNLOAD_LINKS[plan] || DOWNLOAD_LINKS.personal;
  
  return {
    from: process.env.FROM_EMAIL || 'sales@rinawarptech.com',
    to: customerEmail,
    subject: '🧜‍♀️ Your RinaWarp Terminal is Ready! License Key & Downloads Inside',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #2c3e50; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #20b2aa, #ff1493); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .license-key { background: #e3f2fd; border: 2px solid #2196f3; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; color: #1565c0; }
          .download-section { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .download-button { display: inline-block; background: linear-gradient(135deg, #20b2aa, #ff1493); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .mermaid-divider { text-align: center; font-size: 2rem; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧜‍♀️ Welcome to RinaWarp Terminal!</h1>
            <p>Your AI-Powered Terminal Experience Awaits</p>
          </div>
          
          <div class="content">
            <p>Dear ${customerName},</p>
            
            <p>🎉 <strong>Thank you for purchasing RinaWarp Terminal (${plan.toUpperCase()} Plan)!</strong></p>
            
            <div class="license-key">
              🔑 YOUR LICENSE KEY:<br>
              ${licenseKey}
            </div>
            
            <div class="mermaid-divider">🧜‍♀️ ≋≋≋ 🐚 ≋≋≋ 🌊</div>
            
            <div class="download-section">
              <h3>📥 Download Your Software</h3>
              <p>Choose your operating system:</p>
              
              ${downloads.windows ? `<a href="${downloads.windows}" class="download-button">🪟 Windows</a>` : '<span style="color: #666; margin: 5px; padding: 12px 24px; background: #f0f0f0; border-radius: 6px; display: inline-block;">🪟 Windows (Coming Soon)</span>'}
              ${downloads.macos ? `<a href="${downloads.macos}" class="download-button">🍎 macOS</a>` : '<span style="color: #666; margin: 5px; padding: 12px 24px; background: #f0f0f0; border-radius: 6px; display: inline-block;">🍎 macOS (Coming Soon)</span>'}
              ${downloads.linux ? `<a href="${downloads.linux}" class="download-button">🐧 Linux</a>` : '<span style="color: #666; margin: 5px; padding: 12px 24px; background: #f0f0f0; border-radius: 6px; display: inline-block;">🐧 Linux (Coming Soon)</span>'}
            </div>
            
            <div class="download-section">
              <h3>🚀 Quick Start Guide</h3>
              <ol>
                <li>Download the version for your operating system</li>
                <li>Install the application</li>
                <li>Launch RinaWarp Terminal</li>
                <li>Enter your license key: <code>${licenseKey}</code></li>
                <li>Start exploring the AI-powered features!</li>
              </ol>
            </div>
            
            <div class="download-section">
              <h3>✨ Key Features You'll Love</h3>
              <ul>
                <li>🤖 AI-powered command suggestions</li>
                <li>🎤 Voice control with "Hey Rina" commands</li>
                <li>🎨 Beautiful mermaid-inspired themes</li>
                <li>🔄 Git integration and workflows</li>
                <li>🌊 Session management and cloud sync</li>
                <li>🧜‍♀️ Rina's intelligent assistance</li>
              </ul>
            </div>
            
            <div class="mermaid-divider">🌊 ≋≋≋ 🐚 ≋≋≋ 🧜‍♀️</div>
            
            <p><strong>Need Help?</strong></p>
            <ul>
              <li>📖 <a href="https://github.com/Rinawarp-Terminal/rinawarp-terminal">Documentation</a></li>
              <li>💬 Support: <a href="mailto:rinawarptechnologies25@gmail.com">rinawarptechnologies25@gmail.com</a></li>
              <li>🎬 <a href="https://jumpstart-webapp-eb23gy3dlq-uc.a.run.app">Live Demo</a></li>
            </ul>
            
            <p>Welcome to the RinaWarp family! 🧜‍♀️✨</p>
            
            <p>Best regards,<br>
            The RinaWarp Team</p>
          </div>
          
          <div class="footer">
            <p>Order processed: ${new Date().toLocaleDateString()}<br>
            License Key: ${licenseKey}</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}

// Create checkout session endpoint
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan, price, email, name, company } = req.body;
    
    console.log(`🛒 Creating checkout session for ${plan} plan - ${email}`);
    
    // Plan configurations
    const planConfig = {
      personal: { name: '🏠 Personal License', description: 'RinaWarp Terminal Personal License with Enhanced AI Features' },
      professional: { name: '💼 Professional License', description: 'RinaWarp Terminal Professional License with Advanced AI & Commercial Rights' },
      team: { name: '👥 Team License', description: 'RinaWarp Terminal Team License for 5 Developers with Full Features' }
    };
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: planConfig[plan].name,
            description: planConfig[plan].description,
            images: ['https://github.com/Rinawarp-Terminal/rinawarp-terminal/raw/main/logo.png'],
          },
          unit_amount: price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      metadata: {
        plan: plan,
        customer_name: name,
        company: company || '',
        email: email
      },
      success_url: `${req.headers.origin || process.env.SITE_URL || 'http://localhost:3001'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || process.env.SITE_URL || 'http://localhost:3001'}/stripe-checkout.html`,
    });
    
    res.json({ id: session.id });
    
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'rinawarp-webhook-handler',
    timestamp: new Date().toISOString(),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    email: !!transporter
  });
});

// Webhook endpoint
app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    console.log(`✅ Payment completed for session: ${session.id}`);
    
    // Extract customer info from metadata and session
    const customerEmail = session.metadata.email || session.customer_details.email;
    const customerName = session.metadata.customer_name || session.customer_details.name || 'Valued Customer';
    const plan = session.metadata.plan || 'personal';
    
    console.log(`📦 Processing order: ${plan} plan for ${customerEmail}`);
    
    // Generate license key
    const licenseKey = generateLicenseKey(plan, customerEmail);
    
    // Send download email
    try {
      const emailData = createDownloadEmail(customerEmail, customerName, plan, licenseKey);
      await transporter.sendMail(emailData);
      console.log(`✅ Download email sent to ${customerEmail}`);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  response.json({received: true});
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🧜‍♀️ Webhook handler running on port ${PORT}`);
});

export default app;
