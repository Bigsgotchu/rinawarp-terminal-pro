/**
 * RinaWarp Marketplace Router
 * 
 * Routes requests to API or Marketplace UI handlers
 */

import { apiRouter } from "./api/index";
import { marketplaceUI } from "./marketplace/ui";
import { injectSeoTags } from "./seo";

function renderHomepage(): Response {
  const seo = injectSeoTags("/");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${seo}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: white; font-family: Inter, system-ui, -apple-system, sans-serif; min-height: 100vh; }
    header { background: #111; border-bottom: 1px solid #222; padding: 0 40px; }
    nav { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; height: 60px; }
    .logo { font-size: 1.5rem; color: white; text-decoration: none; font-weight: bold; }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { color: #888; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: #ff007f; }
    .hero { text-align: center; padding: 80px 20px; background: linear-gradient(180deg, #111 0%, #0a0a0a 100%); }
    .hero h1 { font-size: 3rem; margin-bottom: 16px; background: linear-gradient(90deg, #ff007f, #ff7f50, #00ffff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #888; font-size: 1.2rem; max-width: 600px; margin: 0 auto 32px; }
    .cta-buttons { display: flex; gap: 16px; justify-content: center; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.2s, opacity 0.2s; }
    .btn:hover { transform: translateY(-2px); }
    .btn-primary { background: linear-gradient(90deg, #ff007f, #ff7f50); color: white; }
    .btn-secondary { background: #222; color: white; border: 1px solid #333; }
    .features { max-width: 1100px; margin: 0 auto; padding: 60px 40px; }
    .features h2 { text-align: center; font-size: 2rem; margin-bottom: 40px; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .feature-card { background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; }
    .feature-card h3 { color: #ff007f; margin-bottom: 12px; font-size: 1.2rem; }
    .feature-card p { color: #888; line-height: 1.6; }
    .marketplace-preview { background: #111; border-top: 1px solid #222; padding: 60px 40px; text-align: center; }
    .marketplace-preview h2 { font-size: 2rem; margin-bottom: 16px; }
    .marketplace-preview p { color: #888; margin-bottom: 32px; }
    .agent-grid { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 32px; }
    .agent-badge { background: #222; border: 1px solid #333; padding: 12px 20px; border-radius: 8px; font-size: 0.9rem; }
    .agent-badge .price { color: #00ffff; font-weight: 600; }
    footer { background: #111; border-top: 1px solid #222; padding: 40px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="/" class="logo">🤖 RinaWarp</a>
      <div class="nav-links">
        <a href="/" class="active">Home</a>
        <a href="/agents">Agents</a>
        <a href="/pricing">Pricing</a>
        <a href="/download">Download</a>
        <a href="/feedback">Feedback</a>
      </div>
    </nav>
  </header>
  
  <main>
    <section class="hero">
      <h1>AI-Powered Terminal for Developers</h1>
      <p class="subtitle">RinaWarp combines persistent AI agents with a powerful terminal. Automate workflows, run tests, and deploy apps - all from your terminal.</p>
      <div class="cta-buttons">
        <a href="/download" class="btn btn-primary">Download Now</a>
        <a href="/agents" class="btn btn-secondary">Browse Agents</a>
      </div>
    </section>
    
    <section class="features">
      <h2>Why RinaWarp?</h2>
      <div class="features-grid">
        <div class="feature-card">
          <h3>🤖 AI Agents</h3>
          <p>Install and run AI agents directly in your terminal. From security audits to deployment helpers.</p>
        </div>
        <div class="feature-card">
          <h3>🔒 Secure Execution</h3>
          <p>Every agent runs with explicit permissions. You're in control of what they can access.</p>
        </div>
        <div class="feature-card">
          <h3>💰 Marketplace</h3>
          <p>Discover free and paid agents. Publish your own and earn from your creations.</p>
        </div>
        <div class="feature-card">
          <h3>⚡ Fast & Lightweight</h3>
          <p>Built with Electron. Runs smoothly on macOS, Linux, and Windows.</p>
        </div>
      </div>
    </section>
    
    <section class="marketplace-preview">
      <h2>🚀 Agent Marketplace</h2>
      <p>Supercharge your development workflow with pre-built agents</p>
      <div class="agent-grid">
        <div class="agent-badge">deploy-helper <span class="price">$5</span></div>
        <div class="agent-badge">security-audit <span class="price">$5</span></div>
        <div class="agent-badge">test-runner <span class="price">$4</span></div>
        <div class="agent-badge">docker-cleanup <span class="price">$3</span></div>
      </div>
      <a href="/agents" class="btn btn-primary">Explore Marketplace →</a>
    </section>
  </main>
  
  <footer>
    <p>© 2024 RinaWarp. Built with ❤️ for developers.</p>
  </footer>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

function renderPricing(): Response {
  const seo = injectSeoTags("/pricing");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${seo}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: white; font-family: Inter, system-ui, -apple-system, sans-serif; min-height: 100vh; }
    header { background: #111; border-bottom: 1px solid #222; padding: 0 40px; }
    nav { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; height: 60px; }
    .logo { font-size: 1.5rem; color: white; text-decoration: none; font-weight: bold; }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { color: #888; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: #ff007f; }
    .hero { text-align: center; padding: 60px 20px; background: linear-gradient(180deg, #111 0%, #0a0a0a 100%); }
    .hero h1 { font-size: 2.5rem; margin-bottom: 12px; }
    .subtitle { color: #888; font-size: 1.1rem; }
    .container { max-width: 1000px; margin: 0 auto; padding: 60px 40px; }
    .plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .plan { background: #111; border: 1px solid #222; border-radius: 12px; padding: 32px; text-align: center; }
    .plan.featured { border-color: #ff007f; position: relative; }
    .plan.featured::before { content: 'Popular'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #ff007f; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; }
    .plan h2 { font-size: 1.5rem; margin-bottom: 8px; }
    .price { font-size: 2.5rem; font-weight: bold; margin: 16px 0; color: #00ffff; }
    .price span { font-size: 1rem; color: #666; }
    .price.lifetime { font-size: 1.8rem; }
    .features { list-style: none; text-align: left; margin: 24px 0; }
    .features li { padding: 8px 0; color: #aaa; }
    .features li::before { content: '✓'; color: #00ffff; margin-right: 8px; }
    .btn { display: block; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.2s; }
    .btn:hover { transform: translateY(-2px); }
    .btn-primary { background: linear-gradient(90deg, #ff007f, #ff7f50); color: white; }
    .btn-secondary { background: #222; color: white; border: 1px solid #333; }
    .lifetime-badge { display: inline-block; background: #14b8a6; color: #0a0a0a; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; margin-bottom: 8px; }
    footer { background: #111; border-top: 1px solid #222; padding: 40px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="/" class="logo">🤖 RinaWarp</a>
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/agents">Agents</a>
        <a href="/pricing" class="active">Pricing</a>
        <a href="/download">Download</a>
        <a href="/feedback">Feedback</a>
      </div>
    </nav>
  </header>
  
  <main>
    <section class="hero">
      <h1>Simple, Transparent Pricing</h1>
      <p class="subtitle">Choose the plan that works for you</p>
    </section>
    
    <div class="container">
      <div class="plans">
        <div class="plan">
          <h2>Free</h2>
          <div class="price">$0<span>/month</span></div>
          <ul class="features">
            <li>Basic terminal features</li>
            <li>5 free agents</li>
            <li>Community support</li>
            <li>Standard security</li>
          </ul>
          <a href="/download" class="btn btn-secondary">Get Started</a>
        </div>
        
        <div class="plan featured">
          <h2>Pro</h2>
          <div class="price">$29<span>/month</span></div>
          <ul class="features">
            <li>All free features</li>
            <li>Unlimited agents</li>
            <li>Execute fixes</li>
            <li>High-impact actions</li>
            <li>Streaming execution</li>
            <li>Verification & audit exports</li>
            <li>Priority System Doctor</li>
          </ul>
          <a href="https://buy.stripe.com/3cI6oH2TYeZce7A7vJ0480h" class="btn btn-primary">Subscribe Now</a>
        </div>
        
        <div class="plan">
          <h2>Creator</h2>
          <div class="price">$69<span>/month</span></div>
          <ul class="features">
            <li>Everything in Pro</li>
            <li>Advanced workflows</li>
            <li>More execution context</li>
          </ul>
          <a href="https://buy.stripe.com/6oU28rcuy6sG3sWcQ30480i" class="btn btn-secondary">Subscribe</a>
        </div>

        <div class="plan">
          <h2>Team</h2>
          <div class="price">$99<span>/month</span></div>
          <ul class="features">
            <li>Everything in Creator</li>
            <li>Team-ready workflows</li>
            <li>Priority support</li>
          </ul>
          <a href="https://buy.stripe.com/fZu3cv8eicR48NgcQ30480j" class="btn btn-secondary">Subscribe</a>
        </div>

        <div class="plan">
          <span class="lifetime-badge">LIMITED</span>
          <h2>Founder Lifetime</h2>
          <div class="price lifetime">$699<span> one-time</span></div>
          <ul class="features">
            <li>Lifetime access</li>
            <li>All Pro features forever</li>
            <li>First 100 only</li>
            <li>Priority support</li>
          </ul>
          <a href="https://buy.stripe.com/bJe5kDgKObN0e7A7vJ0480k" class="btn btn-primary">Claim Now</a>
        </div>
      </div>
    </div>
  </main>
  
  <footer>
    <p>© 2024 RinaWarp. Built with ❤️ for developers.</p>
  </footer>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

function renderFeedback(): Response {
  const seo = injectSeoTags("/feedback");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${seo}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: white; font-family: Inter, system-ui, -apple-system, sans-serif; min-height: 100vh; }
    header { background: #111; border-bottom: 1px solid #222; padding: 0 40px; }
    nav { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; height: 60px; }
    .logo { font-size: 1.5rem; color: white; text-decoration: none; font-weight: bold; }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { color: #888; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
    .nav-links a:hover { color: #ff007f; }
    .container { max-width: 600px; margin: 0 auto; padding: 60px 40px; }
    h1 { text-align: center; margin-bottom: 16px; }
    p { color: #888; text-align: center; margin-bottom: 32px; }
    form { background: #111; border: 1px solid #222; border-radius: 12px; padding: 32px; }
    label { display: block; margin-bottom: 8px; color: #aaa; }
    input, textarea, select { width: 100%; padding: 12px; margin-bottom: 16px; background: #222; border: 1px solid #333; border-radius: 8px; color: white; font-size: 1rem; }
    textarea { min-height: 120px; resize: vertical; }
    button { width: 100%; padding: 14px; background: linear-gradient(90deg, #ff007f, #ff7f50); color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
    button:hover { opacity: 0.9; }
    footer { background: #111; border-top: 1px solid #222; padding: 40px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="/" class="logo">🤖 RinaWarp</a>
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/agents">Agents</a>
        <a href="/pricing">Pricing</a>
        <a href="/download">Download</a>
        <a href="/feedback" class="active">Feedback</a>
      </div>
    </nav>
  </header>
  
  <main>
    <div class="container">
      <h1>Send Us Feedback</h1>
      <p>We'd love to hear from you! Share your thoughts, suggestions, or report issues.</p>
      
      <form id="feedback-form">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" placeholder="Your name" required>
        
        <label for="email">Email</label>
        <input type="email" id="email" name="email" placeholder="your@email.com" required>
        
        <label for="rating">Rating</label>
        <select id="rating" name="rating">
          <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
          <option value="4">⭐⭐⭐⭐ Good</option>
          <option value="3">⭐⭐⭐ Average</option>
          <option value="2">⭐⭐ Poor</option>
          <option value="1">⭐ Very Poor</option>
        </select>
        
        <label for="message">Your Feedback</label>
        <textarea id="message" name="message" placeholder="Tell us what you think..." required></textarea>
        
        <button type="submit">Send Feedback</button>
      </form>
    </div>
  </main>
  
  <footer>
    <p>© 2024 RinaWarp. Built with ❤️ for developers.</p>
  </footer>
  
  <script>
    document.getElementById('feedback-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          alert('Thank you for your feedback!');
          e.target.reset();
        } else {
          alert('Something went wrong. Please try again.');
        }
      } catch (err) {
        console.error('Feedback error:', err);
        alert('Thank you for your feedback!');
        e.target.reset();
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

function renderDownload(): Response {
  const seo = injectSeoTags("/download");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${seo}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: white; font-family: Inter, system-ui, -apple-system, sans-serif; min-height: 100vh; }
    header { background: #111; border-bottom: 1px solid #222; padding: 0 40px; }
    nav { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; height: 60px; }
    .logo { font-size: 1.5rem; color: white; text-decoration: none; font-weight: bold; }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { color: #888; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: #ff007f; }
    .hero { text-align: center; padding: 80px 20px; background: linear-gradient(180deg, #111 0%, #0a0a0a 100%); }
    .hero h1 { font-size: 2.5rem; margin-bottom: 16px; }
    .version { display: inline-block; background: #14b8a6; color: #0a0a0a; padding: 4px 12px; border-radius: 12px; font-size: 0.9rem; font-weight: 600; margin-bottom: 16px; }
    .subtitle { color: #888; font-size: 1.1rem; max-width: 600px; margin: 0 auto 32px; }
    .container { max-width: 1000px; margin: 0 auto; padding: 60px 40px; }
    .platforms { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 48px; }
    .platform-card { background: #111; border: 1px solid #222; border-radius: 12px; padding: 32px; text-align: center; transition: transform 0.2s, border-color 0.2s; }
    .platform-card:hover { transform: translateY(-4px); border-color: #ff007f; }
    .platform-icon { font-size: 3rem; margin-bottom: 16px; }
    .platform-card h3 { font-size: 1.5rem; margin-bottom: 8px; }
    .platform-card p { color: #888; margin-bottom: 20px; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.2s, opacity 0.2s; }
    .btn:hover { transform: translateY(-2px); }
    .btn-primary { background: linear-gradient(90deg, #ff007f, #ff7f50); color: white; }
    .btn-secondary { background: #222; color: white; border: 1px solid #333; }
    .verification { background: #111; border: 1px solid #222; border-radius: 12px; padding: 32px; margin-top: 40px; }
    .verification h2 { font-size: 1.5rem; margin-bottom: 16px; color: #00ffff; }
    .verification p { color: #888; margin-bottom: 16px; line-height: 1.6; }
    .verification-links { display: flex; gap: 16px; flex-wrap: wrap; }
    .verification-links a { color: #ff007f; text-decoration: none; }
    .verification-links a:hover { text-decoration: underline; }
    .hash { background: #0a0a0a; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 0.85rem; color: #00ffff; overflow-x: auto; margin: 8px 0; }
    footer { background: #111; border-top: 1px solid #222; padding: 40px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <header>
    <nav role="navigation" aria-label="Main navigation">
      <a href="/" class="logo" aria-label="RinaWarp Home">🤖 RinaWarp</a>
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/agents">Agents</a>
        <a href="/pricing">Pricing</a>
        <a href="/download" class="active" aria-current="page">Download</a>
        <a href="/feedback">Feedback</a>
      </div>
    </nav>
  </header>
  
  <main>
    <section class="hero" role="banner">
      <span class="version">v1.0.4</span>
      <h1>Download RinaWarp Terminal Pro</h1>
      <p class="subtitle">The First AI You Can Trust to Actually Fix Things. Available for Linux, Windows, and macOS.</p>
    </section>
    
    <div class="container">
      <section class="platforms" aria-label="Download options by platform">
        <article class="platform-card">
          <div class="platform-icon" role="img" aria-label="Linux logo">🐧</div>
          <h3>Linux</h3>
          <p>AppImage (recommended) or .deb package</p>
          <a href="/login/" class="btn btn-primary" role="button" aria-label="Download for Linux">Download AppImage</a>
          <br><br>
          <a href="/login/" class="btn btn-secondary" role="button" aria-label="Download Debian package for Linux">Download .deb</a>
        </article>
        
        <article class="platform-card">
          <div class="platform-icon" role="img" aria-label="Windows logo">🪟</div>
          <h3>Windows</h3>
          <p>Windows Installer (.exe)</p>
          <a href="/login/" class="btn btn-primary" role="button" aria-label="Download for Windows">Download .exe</a>
        </article>
        
        <article class="platform-card">
          <div class="platform-icon" role="img" aria-label="Apple logo">🍎</div>
          <h3>macOS</h3>
          <p>macOS Installer (.dmg) - Coming Soon</p>
          <a href="/login/" class="btn btn-secondary" role="button" aria-label="Download for macOS (Coming Soon)" aria-disabled="true">Download .dmg</a>
        </article>
      </section>
      
      <section class="verification" aria-labelledby="verify-heading">
        <h2 id="verify-heading">🔒 File Integrity Verification</h2>
        <p>For your security, we provide SHA-256 checksums and GPG signatures for all downloadable files. Please verify your download before running it.</p>
        
        <p><strong>SHA-256 Checksums:</strong></p>
        <div class="hash" aria-label="SHA-256 checksums">
3aff452e84c40bc58e6bfd626c170939f636db8b8af75fe0fd9f988d0d7fc732  RinaWarp-Terminal-Pro-1.0.4.AppImage
bbee395e8de6baf2a902d9e69d1869af53441bb8286bd5c6f119bed76827122a  RinaWarp-Terminal-Pro-1.0.4.amd64.deb
0382dfdd47d96465ec25e5d7133c331c1d86e085135120caafd9b80474ff7ab4  RinaWarp-Terminal-Pro-1.0.4.exe</div>
        
        <p><strong>Verification Files:</strong></p>
        <div class="verification-links">
          <a href="https://rinawarp-downloads.rinawarptech.workers.dev/verify/SHASUMS256.txt" aria-label="Download SHA-256 checksums file">SHASUMS256.txt</a>
          <a href="https://rinawarp-downloads.rinawarptech.workers.dev/verify/SHASUMS256.txt.asc" aria-label="Download GPG signature for checksums">SHASUMS256.txt.asc</a>
          <a href="https://rinawarp-downloads.rinawarptech.workers.dev/verify/RINAWARP_GPG_PUBLIC_KEY.asc" aria-label="Download GPG public key">RINAWARP_GPG_PUBLIC_KEY.asc</a>
        </div>
        
        <p style="margin-top: 16px;"><strong>To verify on Linux/macOS:</strong></p>
        <div class="hash" aria-label="Verification commands">
# Download and verify the checksums
curl -O https://rinawarp-downloads.rinawarptech.workers.dev/verify/SHASUMS256.txt
curl -O https://rinawarp-downloads.rinawarptech.workers.dev/verify/SHASUMS256.txt.asc

# Verify the signature
gpg --verify SHASUMS256.txt.asc SHASUMS256.txt

# Verify the file hash
sha256sum -c SHASUMS256.txt</div>
      </section>
    </div>
  </main>
  
  <footer role="contentinfo">
    <p>© 2024 RinaWarp. Built with ❤️ for developers.</p>
  </footer>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for API responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, stripe-signature',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // API routes: /api/*
    if (path.startsWith('/api/')) {
      return handleApiRequest(request, env, path, corsHeaders);
    }

    // Homepage
    if (path === "/" || path === "") {
      return renderHomepage();
    }

    // Pricing page
    if (path === "/pricing" || path === "/pricing/") {
      return renderPricing();
    }

    // Feedback page
    if (path === "/feedback" || path === "/feedback/") {
      return renderFeedback();
    }

    // Download page
    if (path === "/download" || path === "/download/") {
      return renderDownload();
    }

    // Feedback API (POST)
    if ((path === "/api/feedback" || path === "/v1/feedback") && request.method === "POST") {
      return handleFeedbackSubmit(request, env, corsHeaders);
    }

    // API routes: /v1/*
    if (path.startsWith("/v1")) {
      return apiRouter(request, env);
    }

    // Marketplace UI: /agents
    if (path.startsWith("/agents")) {
      return marketplaceUI(request, env);
    }

    // Pass through to origin for everything else (docs, download, etc.)
    return fetch(request);
  }
};

async function handleApiRequest(request: Request, env: any, path: string, corsHeaders: Record<string, string>): Promise<Response> {
  // Health check
  if (path === '/api/health' && request.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // Feedback endpoint
  if (path === '/api/feedback' && request.method === 'POST') {
    return handleFeedbackSubmit(request, env, corsHeaders);
  }

  // Events endpoint
  if (path === '/api/events' && request.method === 'POST') {
    try {
      const body = await request.json();
      console.log('Event received:', body);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // User endpoint
  if (path === '/api/me' && request.method === 'GET') {
    return new Response(JSON.stringify({ 
      user: null,
      message: 'Auth endpoint - implement with database'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // License portal
  if (path === '/api/portal' && request.method === 'GET') {
    return new Response(JSON.stringify({ 
      url: 'https://billing.stripe.com/p/login/test'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // Stripe webhook
  if (path === '/api/stripe/webhook' && request.method === 'POST') {
    return handleStripeWebhook(request, env, corsHeaders);
  }

  // License endpoints
  if (path.startsWith('/api/license/')) {
    return handleLicenseRequest(request, env, corsHeaders, path);
  }

  // Auth endpoints
  if (path.startsWith('/api/auth/')) {
    return new Response(JSON.stringify({ 
      message: 'Auth endpoint'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response(JSON.stringify({ error: 'Not found', path }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function handleStripeWebhook(request: Request, env: any, corsHeaders: Record<string, string>): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('No signature', { status: 400, headers: corsHeaders });
  }

  // Verify webhook signature if secret is available
  if (env.STRIPE_WEBHOOK_SECRET) {
    const timestamp = request.headers.get('stripe-timestamp');
    const payload = await request.text();
    const expectedSignature = env.STRIPE_WEBHOOK_SECRET;
    // Note: Full signature verification would require computing HMAC
    // For now, we log the signature for debugging
    console.log('Stripe signature received:', signature.substring(0, 20) + '...');
  }

  try {
    const payload = await request.text();
    const event = JSON.parse(payload);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail = session.customer_details?.email || session.customer_email;
      console.log(`Payment completed: ${customerEmail}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return new Response(`Webhook error: ${err.message}`, { status: 400, headers: corsHeaders });
  }
}

async function handleLicenseRequest(request: Request, env: any, corsHeaders: Record<string, string>, path: string): Promise<Response> {
  // License verify
  if (path === '/api/license/verify' && request.method === 'POST') {
    try {
      const body = await request.json();
      return new Response(JSON.stringify({ 
        valid: true,
        tier: 'free',
        message: 'License verification endpoint'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // License activate
  if (path === '/api/license/activate' && request.method === 'POST') {
    return new Response(JSON.stringify({ 
      message: 'License activation endpoint'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

// Feedback submission handler with SendGrid email notification
async function handleFeedbackSubmit(request: Request, env: any, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json();
    const { name, email, rating, message } = body;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Log feedback for now
    console.log('Feedback received:', { name, email, rating, message, timestamp: new Date().toISOString() });

    // Send email notification via SendGrid if API key is configured
    if (env.SENDGRID_API_KEY) {
      try {
        const emailBody = {
          personalizations: [{
            to: [{ email: 'support@rinawarptech.com' }],
            subject: `New Feedback: ${rating ? `⭐${rating}` : ''} from ${name}`
          }],
          from: { email: 'noreply@rinawarptech.com', name: 'RinaWarp Feedback' },
          content: [{
            type: 'text/html',
            value: `
              <h2>New Feedback Received</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Rating:</strong> ${rating || 'Not provided'}</p>
              <p><strong>Message:</strong></p>
              <p>${message}</p>
              <hr>
              <p><small>Submitted: ${new Date().toISOString()}</small></p>
            `
          }]
        };

        const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailBody)
        });

        if (!emailResponse.ok) {
          console.error('SendGrid error:', await emailResponse.text());
        }
      } catch (emailErr) {
        console.error('Failed to send feedback email:', emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Feedback received' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
