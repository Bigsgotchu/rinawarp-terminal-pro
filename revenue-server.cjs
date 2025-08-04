#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - Revenue Server
 * Simple, focused server for immediate revenue generation
 */

const express = require('express');
const stripe = require('stripe');
const nodemailer = require('nodemailer');
const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Stripe
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// PRICING TIERS (Start with these proven price points)
const PRICING = {
  basic: {
    price: 29,
    priceId: 'price_basic',
    name: 'RinaWarp Terminal Basic',
    features: [
      'Desktop Terminal Application',
      'Basic Shell Integration',
      'File Management',
      'Email Support',
    ],
  },
  pro: {
    price: 79,
    priceId: 'price_pro',
    name: 'RinaWarp Terminal Pro',
    features: [
      'Everything in Basic',
      'AI-Powered Command Assistance',
      'Advanced Security Features',
      'Priority Support',
      'Cloud Sync',
    ],
  },
  enterprise: {
    price: 199,
    priceId: 'price_enterprise',
    name: 'RinaWarp Terminal Enterprise',
    features: [
      'Everything in Pro',
      'Team Management',
      'Advanced Analytics',
      'Custom Integrations',
      'Phone Support',
      'SLA Guarantee',
    ],
  },
};

// LANDING PAGE
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RinaWarp Terminal - Professional Terminal for Developers</title>
    <script src="https://js.stripe.com/v3/"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 80px 20px; }
        .hero h1 { font-size: 3rem; margin-bottom: 20px; }
        .hero p { font-size: 1.3rem; margin-bottom: 30px; max-width: 600px; margin-left: auto; margin-right: auto; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .pricing { padding: 80px 20px; background: #f8f9fa; }
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 50px; }
        .pricing-card { background: white; border-radius: 10px; padding: 40px 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; position: relative; }
        .pricing-card.featured { border: 3px solid #667eea; transform: scale(1.05); }
        .pricing-card h3 { font-size: 1.5rem; margin-bottom: 10px; }
        .pricing-card .price { font-size: 3rem; font-weight: bold; color: #667eea; margin: 20px 0; }
        .pricing-card ul { list-style: none; margin: 30px 0; }
        .pricing-card ul li { padding: 10px 0; border-bottom: 1px solid #eee; }
        .btn { background: #667eea; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 1.1rem; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 20px; }
        .btn:hover { background: #5a6fd8; }
        .features { padding: 80px 20px; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 40px; margin-top: 50px; }
        .feature { text-align: center; }
        .feature h3 { margin: 20px 0; }
        .social-proof { background: #2c3e50; color: white; padding: 60px 20px; text-align: center; }
        .download-section { padding: 60px 20px; background: #ecf0f1; text-align: center; }
        .download-btn { background: #27ae60; color: white; padding: 20px 40px; font-size: 1.2rem; border: none; border-radius: 8px; text-decoration: none; display: inline-block; margin: 10px; }
        .download-btn:hover { background: #219a52; }
    </style>
</head>
<body>
    <div class="hero">
        <div class="container">
            <h1>🚀 RinaWarp Terminal</h1>
            <p>The professional terminal that supercharges your development workflow with AI assistance, advanced security, and seamless integrations.</p>
            <a href="#pricing" class="btn">Get Started Today</a>
        </div>
    </div>

    <div class="features">
        <div class="container">
            <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 20px;">Why Developers Choose RinaWarp</h2>
            <div class="features-grid">
                <div class="feature">
                    <div style="font-size: 3rem;">🤖</div>
                    <h3>AI-Powered Assistance</h3>
                    <p>Get intelligent command suggestions, error explanations, and code generation directly in your terminal.</p>
                </div>
                <div class="feature">
                    <div style="font-size: 3rem;">🛡️</div>
                    <h3>Advanced Security</h3>
                    <p>Built-in threat detection, IP blocking, and secure session management keep your development environment safe.</p>
                </div>
                <div class="feature">
                    <div style="font-size: 3rem;">⚡</div>
                    <h3>Lightning Fast</h3>
                    <p>Optimized performance with intelligent caching and predictive loading for instant responsiveness.</p>
                </div>
                <div class="feature">
                    <div style="font-size: 3rem;">🎨</div>
                    <h3>Beautiful Interface</h3>
                    <p>Modern, customizable themes with smooth animations and an intuitive user experience.</p>
                </div>
            </div>
        </div>
    </div>

    <div id="pricing" class="pricing">
        <div class="container">
            <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 20px;">Simple, Transparent Pricing</h2>
            <p style="text-align: center; font-size: 1.2rem; color: #666;">Choose the plan that fits your needs. Upgrade or downgrade anytime.</p>
            
            <div class="pricing-grid">
                <div class="pricing-card">
                    <h3>Basic</h3>
                    <div class="price">$29</div>
                    <p>Perfect for individual developers</p>
                    <ul>
                        <li>✅ Desktop Terminal Application</li>
                        <li>✅ Basic Shell Integration</li>
                        <li>✅ File Management</li>
                        <li>✅ Email Support</li>
                        <li>✅ 30-Day Money Back Guarantee</li>
                    </ul>
                    <button class="btn" onclick="checkout('basic')">Get Basic - $29</button>
                </div>

                <div class="pricing-card featured">
                    <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: #667eea; color: white; padding: 5px 20px; border-radius: 20px; font-size: 0.9rem;">MOST POPULAR</div>
                    <h3>Pro</h3>
                    <div class="price">$79</div>
                    <p>For professional developers</p>
                    <ul>
                        <li>✅ Everything in Basic</li>
                        <li>✅ AI-Powered Command Assistance</li>
                        <li>✅ Advanced Security Features</li>
                        <li>✅ Priority Support</li>
                        <li>✅ Cloud Sync</li>
                        <li>✅ Custom Themes</li>
                    </ul>
                    <button class="btn" onclick="checkout('pro')">Get Pro - $79</button>
                </div>

                <div class="pricing-card">
                    <h3>Enterprise</h3>
                    <div class="price">$199</div>
                    <p>For teams and organizations</p>
                    <ul>
                        <li>✅ Everything in Pro</li>
                        <li>✅ Team Management</li>
                        <li>✅ Advanced Analytics</li>
                        <li>✅ Custom Integrations</li>
                        <li>✅ Phone Support</li>
                        <li>✅ SLA Guarantee</li>
                    </ul>
                    <button class="btn" onclick="checkout('enterprise')">Get Enterprise - $199</button>
                </div>
            </div>
        </div>
    </div>

    <div class="social-proof">
        <div class="container">
            <h2>Trusted by Developers Worldwide</h2>
            <p style="font-size: 1.2rem; margin-top: 20px;">"RinaWarp Terminal has completely transformed my development workflow. The AI assistance saves me hours every day!"</p>
            <p style="margin-top: 10px; opacity: 0.8;">- Senior Developer at Tech Startup</p>
        </div>
    </div>

    <div class="download-section">
        <div class="container">
            <h2>Ready to Download?</h2>
            <p style="margin: 20px 0;">Try our free demo version or purchase a license above</p>
            <a href="/releases/RinaWarp-Terminal-Setup-Windows.exe" class="download-btn">📥 Download for Windows</a>
            <a href="/releases/RinaWarp-Terminal-Setup-macOS.dmg" class="download-btn">📥 Download for macOS</a>
            <a href="/releases/RinaWarp-Terminal-Setup-Linux.AppImage" class="download-btn">📥 Download for Linux</a>
        </div>
    </div>

    <script>
        const stripe = Stripe('${process.env.STRIPE_PUBLISHABLE_KEY}');
        
        async function checkout(tier) {
            try {
                const response = await fetch('/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ tier }),
                });
                
                const session = await response.json();
                
                if (session.error) {
                    alert('Error: ' + session.error);
                    return;
                }
                
                // Redirect to Stripe Checkout
                const result = await stripe.redirectToCheckout({
                    sessionId: session.id
                });
                
                if (result.error) {
                    alert('Error: ' + result.error.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Something went wrong. Please try again.');
            }
        }
    </script>
</body>
</html>
  `);
});

// CREATE CHECKOUT SESSION
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { tier } = req.body;
    const pricing = PRICING[tier];

    if (!pricing) {
      return res.status(400).json({ error: 'Invalid pricing tier' });
    }

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: pricing.name,
              description: pricing.features.join(', '),
            },
            unit_amount: pricing.price * 100, // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
      metadata: {
        tier: tier,
        product: 'rinawarp-terminal',
      },
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// SUCCESS PAGE
app.get('/success', async (req, res) => {
  const sessionId = req.query.session_id;

  try {
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    // Generate license key
    const licenseKey = generateLicenseKey();

    // Send license email
    await sendLicenseEmail(session.customer_details.email, licenseKey, session.metadata.tier);

    res.send(`
      <html>
        <head><title>Purchase Successful!</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h1 style="color: #27ae60;">🎉 Purchase Successful!</h1>
          <p>Thank you for purchasing RinaWarp Terminal!</p>
          <p><strong>Your License Key:</strong> <code style="background: #f1f1f1; padding: 5px 10px; border-radius: 3px;">${licenseKey}</code></p>
          <p>A confirmation email with your license key and download links has been sent to: <strong>${session.customer_details.email}</strong></p>
          <p><a href="/releases/RinaWarp-Terminal-Setup-Windows.exe" style="background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px;">Download for Windows</a></p>
          <p><a href="/releases/RinaWarp-Terminal-Setup-macOS.dmg" style="background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px;">Download for macOS</a></p>
          <p><a href="/releases/RinaWarp-Terminal-Setup-Linux.AppImage" style="background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px;">Download for Linux</a></p>
          <hr>
          <p><small>Need help? Contact us at support@rinawarptech.com</small></p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).send('Error processing your purchase. Please contact support.');
  }
});

// DOWNLOAD ENDPOINTS (Fixed from your original issue)
app.get('/releases/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'public', 'releases', filename);

  // Validate file path and existence
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Set proper headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  // Send the file
  res.sendFile(filePath);
});

// WEBHOOK FOR STRIPE EVENTS
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
  case 'checkout.session.completed':
    const session = event.data.object;
    console.log('Payment successful:', session.id);
    // Additional fulfillment logic here
    break;
  default:
    console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// UTILITY FUNCTIONS
function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    if (i > 0 && i % 5 === 0) result += '-';
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function sendLicenseEmail(email, licenseKey, tier) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your RinaWarp Terminal License Key',
    html: `
      <h2>Welcome to RinaWarp Terminal!</h2>
      <p>Thank you for your purchase of RinaWarp Terminal ${tier.toUpperCase()}.</p>
      <p><strong>Your License Key:</strong> <code style="background: #f1f1f1; padding: 5px 10px; border-radius: 3px; font-size: 16px;">${licenseKey}</code></p>
      
      <h3>Download Links:</h3>
      <p>
        <a href="https://rinawarptech.com/releases/RinaWarp-Terminal-Setup-Windows.exe">Download for Windows</a><br>
        <a href="https://rinawarptech.com/releases/RinaWarp-Terminal-Setup-macOS.dmg">Download for macOS</a><br>
        <a href="https://rinawarptech.com/releases/RinaWarp-Terminal-Setup-Linux.AppImage">Download for Linux</a>
      </p>
      
      <h3>Getting Started:</h3>
      <ol>
        <li>Download the appropriate version for your operating system</li>
        <li>Install the application</li>
        <li>Enter your license key when prompted</li>
        <li>Enjoy your enhanced terminal experience!</li>
      </ol>
      
      <p>Need help? Reply to this email or contact us at support@rinawarptech.com</p>
      
      <p>Best regards,<br>The RinaWarp Team</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// CANCEL PAGE
app.get('/cancel', (req, res) => {
  res.send(`
    <html>
      <head><title>Purchase Cancelled</title></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
        <h1>Purchase Cancelled</h1>
        <p>No worries! You can always come back when you're ready.</p>
        <a href="/" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Back to Home</a>
      </body>
    </html>
  `);
});

// START SERVER
app.listen(PORT, () => {
  console.log(`💰 Revenue Server running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
  console.log(`💳 Stripe configured: ${!!process.env.STRIPE_SECRET_KEY}`);
  console.log(`📧 Email configured: ${!!process.env.EMAIL_USER}`);
});
