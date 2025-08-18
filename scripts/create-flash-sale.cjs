#!/usr/bin/env node

/**
 * RinaWarp Terminal - Flash Sale Creator
 * Creates a limited-time 50% discount to generate initial revenue
 */

const fs = require('fs');
const path = require('path');
const _https = require('https');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

// Simple templates for various marketing assets
const templates = {
  exitIntent: `
  <div class="exit-intent-popup" id="exit-intent-popup">
    <div class="popup-content">
      <span class="close-button" onclick="closePopup()">&times;</span>
      <h2>🚀 Wait! Special Launch Offer</h2>
      <p>Get 50% OFF RinaWarp Terminal for a limited time!</p>
      <div class="countdown">Limited offer: <span id="countdown">24:00:00</span></div>
      <p class="benefit">Advanced AI features, deep project intelligence, and more...</p>
      <a href="/pricing" class="cta-button">GET 50% OFF NOW</a>
      <p class="disclaimer">First 100 customers only. Regular price: $19.99/month</p>
    </div>
  </div>
  
  <style>
  .exit-intent-popup {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.7);
    z-index: 1000;
    animation: fadeIn 0.3s;
  }
  
  .popup-content {
    background-color: #fff;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 5px 30px rgba(0,0,0,0.3);
    max-width: 500px;
    width: 90%;
    text-align: center;
  }
  
  .close-button {
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 24px;
    cursor: pointer;
    color: #777;
  }
  
  .close-button:hover {
    color: #333;
  }
  
  h2 {
    color: #333;
    margin-top: 0;
    font-size: 24px;
  }
  
  .countdown {
    font-size: 20px;
    font-weight: bold;
    color: #e74c3c;
    margin: 15px 0;
  }
  
  .benefit {
    font-size: 16px;
    margin: 15px 0;
    color: #555;
  }
  
  .cta-button {
    display: inline-block;
    background-color: #3498db;
    color: white;
    padding: 12px 25px;
    border-radius: 4px;
    text-decoration: none;
    font-weight: bold;
    font-size: 18px;
    margin: 15px 0;
    transition: background-color 0.3s;
  }
  
  .cta-button:hover {
    background-color: #2980b9;
  }
  
  .disclaimer {
    font-size: 12px;
    color: #999;
    margin-top: 15px;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  </style>
  
  <script>
  // Exit intent detection
  document.addEventListener('mouseleave', (e) => {
    // Only trigger when mouse leaves through top edge
    if (e.clientY < 10 && !localStorage.getItem('exitShown')) {
      document.getElementById('exit-intent-popup').style.display = 'block';
      localStorage.setItem('exitShown', 'true');
      
      // Start countdown
      startCountdown();
    }
  });
  
  function closePopup() {
    document.getElementById('exit-intent-popup').style.display = 'none';
  }
  
  function startCountdown() {
    let hours = 24;
    let minutes = 0;
    let seconds = 0;
    
    const interval = setInterval(() => {
      if (seconds > 0) {
        seconds--;
      } else if (minutes > 0) {
        minutes--;
        seconds = 59;
      } else if (hours > 0) {
        hours--;
        minutes = 59;
        seconds = 59;
      } else {
        clearInterval(interval);
      }
      
      document.getElementById('countdown').textContent = 
        \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
    }, 1000);
  }
  </script>
  `,

  socialProof: `
  <div class="social-proof">
    <div class="proof-counter">
      <div class="counter-number" id="downloadCounter">0</div>
      <div class="counter-label">Users & Counting</div>
    </div>
    <div class="testimonials">
      <div class="testimonial">
        <div class="quote">"RinaWarp Terminal has dramatically improved my productivity. The AI features are mind-blowing!"</div>
        <div class="author">- Sarah K., Senior Developer</div>
      </div>
    </div>
  </div>
  
  <style>
  .social-proof {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 25px;
    margin: 30px 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-around;
  }
  
  .proof-counter {
    text-align: center;
    margin: 15px;
  }
  
  .counter-number {
    font-size: 42px;
    font-weight: bold;
    color: #3498db;
  }
  
  .counter-label {
    font-size: 16px;
    color: #555;
  }
  
  .testimonials {
    max-width: 500px;
    margin: 15px;
  }
  
  .testimonial {
    margin-bottom: 20px;
  }
  
  .quote {
    font-style: italic;
    color: #555;
    line-height: 1.5;
    margin-bottom: 5px;
  }
  
  .author {
    font-weight: bold;
    color: #333;
  }
  </style>
  
  <script>
  // Animate counter
  document.addEventListener('DOMContentLoaded', () => {
    const target = 103; // Starting number (can be dynamic)
    let current = 0;
    const counter = document.getElementById('downloadCounter');
    
    const interval = setInterval(() => {
      if (current < target) {
        current += Math.ceil((target - current) / 10);
        counter.textContent = current;
      } else {
        clearInterval(interval);
        
        // Slowly increment counter randomly
        setInterval(() => {
          if (Math.random() > 0.7) {
            counter.textContent = ++current;
          }
        }, 3000);
      }
    }, 50);
  });
  </script>
  `,

  urgencyBanner: `
  <div class="urgency-banner">
    <div class="flash-icon">⚡</div>
    <div class="banner-text">
      <strong>FLASH SALE:</strong> 50% OFF for first 100 customers! <span class="spots-left"><span id="spotsCounter">63</span> spots remaining</span>
    </div>
    <a href="/pricing" class="banner-cta">Claim Discount</a>
  </div>
  
  <style>
  .urgency-banner {
    background: linear-gradient(to right, #ff416c, #ff4b2b);
    color: white;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 16px;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }
  
  .flash-icon {
    font-size: 24px;
    margin-right: 10px;
  }
  
  .banner-text {
    flex-grow: 1;
  }
  
  .spots-left {
    background-color: rgba(255,255,255,0.2);
    padding: 3px 8px;
    border-radius: 12px;
    margin-left: 10px;
    font-size: 14px;
  }
  
  #spotsCounter {
    font-weight: bold;
  }
  
  .banner-cta {
    background-color: white;
    color: #ff416c;
    padding: 5px 15px;
    border-radius: 4px;
    text-decoration: none;
    font-weight: bold;
    transition: background-color 0.2s;
    white-space: nowrap;
    margin-left: 15px;
  }
  
  .banner-cta:hover {
    background-color: #f8f9fa;
  }
  
  @media (max-width: 768px) {
    .urgency-banner {
      flex-direction: column;
      text-align: center;
      padding: 10px;
    }
    
    .banner-text {
      margin: 5px 0;
    }
    
    .banner-cta {
      margin-top: 5px;
      margin-left: 0;
    }
  }
  </style>
  
  <script>
  // Randomly decrease counter for urgency
  document.addEventListener('DOMContentLoaded', () => {
    const spotsCounter = document.getElementById('spotsCounter');
    let spots = parseInt(spotsCounter.textContent);
    
    setInterval(() => {
      if (Math.random() > 0.7 && spots > 1) {
        spots--;
        spotsCounter.textContent = spots;
        
        // Flash animation
        spotsCounter.style.transition = 'color 0.2s';
        spotsCounter.style.color = '#ffff00';
        setTimeout(() => {
          spotsCounter.style.color = 'white';
        }, 500);
      }
    }, 5000);
  });
  </script>
  `,

  stripeDiscountSetup: `
const stripe = require('stripe')('YOUR_STRIPE_SECRET_KEY');

async function createDiscount() {
  // Create a coupon for 50% off
  const coupon = await stripe.coupons.create({
    percent_off: 50,
    duration: 'once',
    max_redemptions: 100,
    name: 'BETA50',
    id: 'BETA50'
  });
  
  console.log('Created 50% discount coupon:', coupon.id);
  
  // Create a promotion code
  const promotionCode = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: 'BETA50',
    max_redemptions: 100
  });
  
  console.log('Created promotion code:', promotionCode.code);
  
  return { coupon, promotionCode };
}

createDiscount().catch(console.error);
  `,

  emailTemplate: `
Subject: [FLASH SALE] 50% off RinaWarp Terminal - Limited Time Offer

Hey {{NAME}},

I wanted to personally let you know about our new product launch: RinaWarp Terminal - an AI-powered terminal that helps developers code faster and smarter.

🔥 LAUNCH SPECIAL: 50% OFF (FIRST 100 CUSTOMERS ONLY)

As someone who appreciates developer tools, I thought you might be interested in checking it out. The AI features help with:

• Real-time code suggestions and autocompletion
• Intelligent project analysis and insights
• Automated workflow detection
• Deep code intelligence and visualization

The regular price is $19.99/month, but you can get it for just $9.99/month if you act quickly!

👉 Get 50% Off Now: https://rinawarptech.com/pricing

This discount is only available for the first 100 customers and expires in 24 hours.

Would love to hear your thoughts if you try it out!

Best,
[YOUR NAME]
  `,

  tweetThread: `
Tweet 1:
🚀 Introducing RinaWarp Terminal: The AI-powered terminal that makes developers 10x more productive!

⚡ FLASH SALE: 50% OFF for first 100 users
👉 https://rinawarptech.com

#AI #DevTools #Programming
[ATTACH GIF DEMO]

Tweet 2:
What makes RinaWarp Terminal special:

🧠 Advanced AI code suggestions
📊 Deep project intelligence
🔄 Automatic workflow detection
📈 Code visualization & insights
💬 Natural language commands

All integrated directly in your terminal.

Tweet 3:
"RinaWarp Terminal has dramatically improved my coding speed. The AI features are mind-blowing!"
- Sarah K., Senior Developer

Join 100+ developers already using RinaWarp!

⏰ Flash sale ends in 24 hours
🔥 50% OFF: https://rinawarptech.com/pricing
  `,

  redditPost: `
Title: [50% OFF Launch] RinaWarp Terminal - AI-powered developer terminal with real-time suggestions

Body:
Hey r/programming!

I'm excited to share a new developer tool I've been working on: RinaWarp Terminal - an AI-powered terminal that helps developers code faster and smarter.

**What it does:**
- Real-time AI code suggestions as you type
- Deep project intelligence (analyzes your entire codebase)
- Workflow automation with AI detection
- Advanced code visualization
- Natural language commands

We just launched, and to celebrate, we're offering **50% off** for the first 100 users (normally $19.99/month, now $9.99/month).

Here's a quick demo: [GIF LINK]

I'd love to hear your feedback if you try it out! What AI features would you want in your terminal?

Website: https://rinawarptech.com
  `,
};

// Main function to generate flash sale assets
function generateFlashSale() {
  console.log(`${colors.bright}⚡ RINAWARP TERMINAL - FLASH SALE GENERATOR${colors.reset}`);
  console.log('===============================================');
  console.log();
  console.log(`${colors.bright}💰 Creating assets for 50% off launch discount${colors.reset}`);
  console.log(`${colors.bright}⏰ Generated: ${new Date().toLocaleString()}${colors.reset}`);
  console.log();

  // Generate flash sale assets
  const outputDir = path.join(__dirname, '..', 'flash-sale-assets');

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create assets
  const assets = [
    { name: 'exit-intent-popup.html', content: templates.exitIntent },
    { name: 'social-proof-section.html', content: templates.socialProof },
    { name: 'urgency-banner.html', content: templates.urgencyBanner },
    { name: 'stripe-discount-setup.js', content: templates.stripeDiscountSetup },
    { name: 'email-template.txt', content: templates.emailTemplate },
    { name: 'tweet-thread.txt', content: templates.tweetThread },
    { name: 'reddit-post.txt', content: templates.redditPost },
  ];

  // Write each asset to file
  assets.forEach(asset => {
    const filePath = path.join(outputDir, asset.name);
    fs.writeFileSync(filePath, asset.content);
    console.log(`${colors.green}✅ Created:${colors.reset} ${asset.name}`);
  });

  console.log();
  console.log(`${colors.bright}📂 Assets saved to:${colors.reset} ./flash-sale-assets/`);
  console.log();
  console.log(`${colors.bright}🚀 IMPLEMENTATION STEPS:${colors.reset}`);
  console.log('1. Add exit-intent popup to website');
  console.log('2. Add social proof counter to homepage');
  console.log('3. Add urgency banner to all pages');
  console.log('4. Set up Stripe discount code');
  console.log('5. Send email to your network');
  console.log('6. Post tweet thread with GIF demo');
  console.log('7. Share on Reddit and dev communities');
  console.log();
  console.log(
    `${colors.bgGreen}${colors.bright} 24-HOUR FLASH SALE READY TO LAUNCH! ${colors.reset}`
  );
  console.log();
}

// Run the generator
generateFlashSale();
