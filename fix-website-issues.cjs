#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing RinaWarp Website Issues...\n');

// 1. Fix pricing inconsistency
console.log('💰 Fixing pricing inconsistency...');
// The index.html shows $29, $99, $299 but the payment handler has $9.99, $19.99, $49.99
// Let's update the payment handler to match the landing page prices

if (fs.existsSync('src/payment/stripe-checkout.js')) {
  let paymentContent = fs.readFileSync('src/payment/stripe-checkout.js', 'utf8');

  // Update prices to match landing page
  paymentContent = paymentContent
    .replace('price: 9.99,', 'price: 29.00,')
    .replace('price: 19.99,', 'price: 99.00,')
    .replace('price: 49.99,', 'price: 299.00,');

  fs.writeFileSync('src/payment/stripe-checkout.js', paymentContent);
  console.log('   ✅ Updated payment handler prices to match landing page');
}

// 2. Create release files directory
console.log('\n📁 Creating release files directory...');
if (!fs.existsSync('releases')) {
  fs.mkdirSync('releases', { recursive: true });
  console.log('   ✅ Created releases directory');
}

// Create placeholder download files
const downloadFiles = [
  {
    name: 'RinaWarp-Terminal-macOS.zip',
    content: 'Download the actual release from GitHub Releases',
  },
  {
    name: 'RinaWarp-Terminal-Setup-Windows.exe',
    content: 'Download the actual release from GitHub Releases',
  },
  {
    name: 'RinaWarp-Terminal-Linux.tar.gz',
    content: 'Download the actual release from GitHub Releases',
  },
];

downloadFiles.forEach(file => {
  const filePath = path.join('releases', file.name + '.txt');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, file.content);
    console.log(`   ✅ Created placeholder for ${file.name}`);
  }
});

// 3. Fix success page
console.log('\n📄 Fixing success page...');
const successPageContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You! - RinaWarp Terminal</title>
    
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-G424CV5GGT"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-G424CV5GGT');
    </script>
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #0a1628;
            background: linear-gradient(135deg, #ff1493 0%, #00ced1 15%, #1e90ff 30%, #ff69b4 45%, #20b2aa 60%);
            background-size: 400% 400%;
            animation: gradientShift 8s ease infinite;
            min-height: 100vh;
        }
        
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 60px 20px;
            text-align: center;
        }
        
        .success-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 25px;
            padding: 60px 40px;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(15px);
        }
        
        .success-icon {
            font-size: 80px;
            margin-bottom: 30px;
            animation: bounce 1s ease-out;
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-30px); }
            60% { transform: translateY(-15px); }
        }
        
        h1 {
            font-size: 3rem;
            margin-bottom: 20px;
            background: linear-gradient(45deg, #ff1493, #00ffff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .order-details {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            text-align: left;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .detail-row:last-child {
            border-bottom: none;
        }
        
        .next-steps {
            margin-top: 40px;
        }
        
        .button {
            display: inline-block;
            background: linear-gradient(45deg, #ff1493, #00ffff);
            color: white;
            padding: 15px 30px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            margin: 10px;
            transition: transform 0.3s ease;
        }
        
        .button:hover {
            transform: translateY(-2px);
        }
        
        .support-info {
            margin-top: 40px;
            padding: 20px;
            background: #e8f4f8;
            border-radius: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-card">
            <div class="success-icon">🎉</div>
            <h1>Thank You for Your Purchase!</h1>
            <p style="font-size: 1.2rem; color: #666; margin-bottom: 30px;">
                Welcome to the RinaWarp Terminal family! Your subscription is now active.
            </p>
            
            <div class="order-details" id="orderDetails">
                <h3 style="margin-bottom: 20px;">Order Details</h3>
                <div class="detail-row">
                    <span>Product:</span>
                    <strong id="productName">RinaWarp Terminal</strong>
                </div>
                <div class="detail-row">
                    <span>Plan:</span>
                    <strong id="planName">Loading...</strong>
                </div>
                <div class="detail-row">
                    <span>Status:</span>
                    <strong style="color: #00c853;">Active</strong>
                </div>
                <div class="detail-row">
                    <span>Order ID:</span>
                    <strong id="orderId">Loading...</strong>
                </div>
            </div>
            
            <div class="next-steps">
                <h3 style="margin-bottom: 20px;">🚀 Next Steps</h3>
                <a href="/download" class="button">📥 Download RinaWarp Terminal</a>
                <a href="/docs" class="button">📚 View Documentation</a>
            </div>
            
            <div class="support-info">
                <h4>Need Help?</h4>
                <p>Our support team is here to help you get started.</p>
                <p>Email: <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a></p>
            </div>
        </div>
    </div>
    
    <script>
        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const plan = urlParams.get('plan');
        
        // Update order details
        if (plan) {
            const planNames = {
                'basic': 'Basic Plan ($29/month)',
                'pro': 'Professional Plan ($99/month)',
                'enterprise': 'Enterprise Plan ($299/month)'
            };
            document.getElementById('planName').textContent = planNames[plan] || plan;
        }
        
        if (sessionId) {
            document.getElementById('orderId').textContent = sessionId.substring(0, 16) + '...';
        }
        
        // Track conversion
        if (typeof gtag !== 'undefined') {
            gtag('event', 'purchase', {
                transaction_id: sessionId,
                value: plan === 'basic' ? 29 : plan === 'pro' ? 99 : 299,
                currency: 'USD',
                items: [{
                    item_name: 'RinaWarp Terminal',
                    item_category: 'Software',
                    item_variant: plan,
                    quantity: 1
                }]
            });
        }
    </script>
</body>
</html>`;

fs.writeFileSync('public/success.html', successPageContent);
console.log('   ✅ Updated success page with proper content');

// 4. Fix Stripe key loading in index.html
console.log('\n🔑 Fixing Stripe key loading...');
if (fs.existsSync('index.html')) {
  let indexContent = fs.readFileSync('index.html', 'utf8');

  // Update the Stripe initialization to load key from server
  const stripeInitCode = `        // Initialize Stripe
        async function initStripe() {
            try {
                // Load Stripe configuration from server
                const response = await fetch('/api/payment/config');
                const config = await response.json();
                
                if (config.publishableKey) {
                    stripe = Stripe(config.publishableKey);
                    console.log('Stripe initialized successfully');
                } else {
                    console.error('No Stripe publishable key available');
                }
            } catch (error) {
                console.error('Error initializing Stripe:', error);
            }
        }`;

  // Replace the existing initStripe function
  indexContent = indexContent.replace(/async function initStripe\(\) {[\s\S]*?}/, stripeInitCode);

  fs.writeFileSync('index.html', indexContent);
  console.log('   ✅ Updated Stripe initialization to load from server');
}

// 5. Add Stripe config endpoint to payment handler
console.log('\n🔧 Adding Stripe config endpoint...');
if (fs.existsSync('src/payment/stripe-checkout.js')) {
  let paymentContent = fs.readFileSync('src/payment/stripe-checkout.js', 'utf8');

  // Add config endpoint if it doesn't exist
  if (!paymentContent.includes('/config')) {
    const configEndpoint = `
// Get Stripe configuration endpoint
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    success: true
  });
});
`;

    // Insert before the webhook endpoint
    paymentContent = paymentContent.replace(
      '// Webhook endpoint for Stripe events',
      configEndpoint + '\n// Webhook endpoint for Stripe events'
    );

    fs.writeFileSync('src/payment/stripe-checkout.js', paymentContent);
    console.log('   ✅ Added Stripe config endpoint');
  }
}

// 6. Create a proper download page redirect
console.log('\n📥 Creating download redirect handler...');
const downloadRedirectContent = `import express from 'express';
const router = express.Router();

// GitHub release URLs (update these with actual release URLs)
const DOWNLOAD_URLS = {
  'macos': 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-macOS.zip',
  'windows': 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Setup-Windows.exe',
  'linux': 'https://github.com/Rinawarp-Terminal/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal-Linux.tar.gz'
};

router.get('/:platform', (req, res) => {
  const platform = req.params.platform.toLowerCase();
  const downloadUrl = DOWNLOAD_URLS[platform];
  
  if (downloadUrl) {
    // Track download
    console.log(\`📥 Download initiated for \${platform}\`);
    res.redirect(downloadUrl);
  } else {
    res.status(404).json({ error: 'Invalid platform' });
  }
});

export default router;`;

if (!fs.existsSync('src/api/download-redirect.js')) {
  fs.writeFileSync('src/api/download-redirect.js', downloadRedirectContent);
  console.log('   ✅ Created download redirect handler');
}

console.log('\n✅ All issues fixed! Next steps:');
console.log('   1. Update the GitHub release URLs in src/api/download-redirect.js');
console.log('   2. Add download redirect route to final-server.js');
console.log('   3. Test the payment flow with real Stripe test keys');
console.log('   4. Deploy the updates to production');
