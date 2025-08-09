#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const fs = require('node:fs');
const path = require('node:path');

class TestimonialManager {
  constructor() {
    this.config = {
      testimonialDir: path.join(process.cwd(), 'testimonials'),
      templatesDir: path.join(process.cwd(), 'public', 'html', 'templates'),
      approvedDir: path.join(process.cwd(), 'testimonials', 'approved'),
      pendingDir: path.join(process.cwd(), 'testimonials', 'pending'),
      logFile: path.join(process.cwd(), 'testimonials', 'testimonials.log'),
    };

    this.initializeDirectories();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    console.log(logEntry.trim());

    // Ensure log directory exists
    const logDir = path.dirname(this.config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFileSync(this.config.logFile, logEntry);
  }

  initializeDirectories() {
    const dirs = [
      this.config.testimonialDir,
      this.config.approvedDir,
      this.config.pendingDir,
      this.config.templatesDir,
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`Created directory: ${dir}`);
      }
    });
  }

  // Process incoming feedback from forms
  processFeedback(feedbackData) {
    const timestamp = Date.now();
    const filename = `feedback_${timestamp}.json`;
    const filepath = path.join(this.config.pendingDir, filename);

    const processedFeedback = {
      id: timestamp,
      timestamp: new Date().toISOString(),
      status: 'pending',
      type: feedbackData.type || 'general',
      data: feedbackData,
      testimonialApproved: feedbackData.testimonial_ok === 'on',
      metadata: {
        source: 'web_form',
        ip: feedbackData.ip || 'unknown',
        userAgent: feedbackData.userAgent || 'unknown',
      },
    };

    fs.writeFileSync(filepath, JSON.stringify(processedFeedback, null, 2));
    this.log(`New feedback received: ${filename}`);

    return processedFeedback;
  }

  // Get all pending testimonials for review
  getPendingTestimonials() {
    const pendingFiles = fs
      .readdirSync(this.config.pendingDir)
      .filter(file => file.endsWith('.json'));

    return pendingFiles
      .map(file => {
        const filepath = path.join(this.config.pendingDir, file);
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        return data;
      })
      .filter(item => item.testimonialApproved);
  }

  // Approve a testimonial
  approveTestimonial(testimonialId, reviewNotes = '') {
    const pendingFile = `feedback_${testimonialId}.json`;
    const pendingPath = path.join(this.config.pendingDir, pendingFile);

    if (!fs.existsSync(pendingPath)) {
      throw new Error(new Error(new Error(`Testimonial ${testimonialId} not found`)));
    }

    const testimonial = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
    testimonial.status = 'approved';
    testimonial.approvedAt = new Date().toISOString();
    testimonial.reviewNotes = reviewNotes;

    // Move to approved directory
    const approvedPath = path.join(this.config.approvedDir, pendingFile);
    fs.writeFileSync(approvedPath, JSON.stringify(testimonial, null, 2));
    fs.unlinkSync(pendingPath);

    this.log(`Approved testimonial: ${testimonialId}`);
    this.generateTestimonialPage();

    return testimonial;
  }

  // Get all approved testimonials
  getApprovedTestimonials() {
    if (!fs.existsSync(this.config.approvedDir)) {
      return [];
    }

    const approvedFiles = fs
      .readdirSync(this.config.approvedDir)
      .filter(file => file.endsWith('.json'));

    return approvedFiles
      .map(file => {
        const filepath = path.join(this.config.approvedDir, file);
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        return data;
      })
      .sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt));
  }

  // Generate HTML page with approved testimonials
  generateTestimonialPage() {
    const testimonials = this.getApprovedTestimonials();

    let testimonialsHTML = '';

    testimonials.forEach(testimonial => {
      const data = testimonial.data;
      const company = data.company ? ` at ${data.company}` : '';
      const teamSize = data.team_size ? ` (${data.team_size} team)` : '';

      testimonialsHTML += `
        <div class="testimonial-card">
          <div class="testimonial-content">
            "${data.feedback || data.comments || 'Great experience with RinaWarp Terminal!'}"
          </div>
          <div class="testimonial-author">
            — ${data.name || 'Anonymous'}${company}${teamSize}
          </div>
          <div class="testimonial-meta">
            ${new Date(testimonial.approvedAt).toLocaleDateString()}
          </div>
        </div>
      `;
    });

    if (testimonialsHTML === '') {
      testimonialsHTML = `
        <div class="no-testimonials">
          <h3>Building Our Community</h3>
          <p>We're collecting authentic feedback from our beta users. Real testimonials will appear here as they're submitted and approved.</p>
          <p><a href="/case-studies-authentic.html">Share your experience</a> to help others discover RinaWarp Terminal!</p>
        </div>
      `;
    }

    const pageHTML = this.generateTestimonialPageTemplate(testimonialsHTML, testimonials.length);
    const outputPath = path.join(this.config.templatesDir, 'case-studies-real.html');

    // Ensure templates directory exists
    if (!fs.existsSync(this.config.templatesDir)) {
      fs.mkdirSync(this.config.templatesDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, pageHTML);
    this.log(`Generated testimonial page with ${testimonials.length} testimonials`);
  }

  generateTestimonialPageTemplate(testimonialsHTML, count) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Real Success Stories - RinaWarp Terminal</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #0a1628; 
            background: linear-gradient(135deg, #ff1493 0%, #00ced1 15%, #1e90ff 30%, #ff69b4 45%, #20b2aa 60%, #ff1493 75%, #00ffff 90%, #ff69b4 100%);
            background-size: 400% 400%;
            animation: gradientShift 8s ease infinite;
            min-height: 100vh;
        }
        
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; color: white; margin-bottom: 60px; }
        .header h1 { 
            font-size: 3.5rem; 
            margin-bottom: 20px; 
            background: linear-gradient(45deg, #ff1493, #00ffff, #ff69b4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 0 40px rgba(255, 20, 147, 0.6);
        }
        
        .nav { display: flex; justify-content: center; gap: 20px; margin: 40px 0; flex-wrap: wrap; }
        .nav a { 
            background: linear-gradient(135deg, rgba(255, 20, 147, 0.4), rgba(0, 206, 209, 0.5)); 
            color: #ffffff; 
            padding: 15px 30px; 
            border-radius: 25px; 
            text-decoration: none; 
            font-weight: bold;
            transition: all 0.3s ease;
            border: 2px solid rgba(255, 105, 180, 0.6);
            backdrop-filter: blur(15px);
        }
        .nav a:hover { 
            background: linear-gradient(135deg, rgba(255, 20, 147, 0.8), rgba(0, 255, 255, 0.8)); 
            transform: translateY(-2px);
        }
        
        .stats-bar {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 20px;
            margin: 40px 0;
            text-align: center;
            box-shadow: 0 10px 20px rgba(255, 20, 147, 0.2);
        }
        
        .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin: 40px 0;
        }
        
        .testimonial-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(255, 20, 147, 0.3);
            border: 2px solid rgba(255, 20, 147, 0.2);
            transition: all 0.3s ease;
        }
        
        .testimonial-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 25px 50px rgba(255, 20, 147, 0.4);
        }
        
        .testimonial-content {
            font-size: 1.1rem;
            font-style: italic;
            margin-bottom: 20px;
            line-height: 1.7;
            color: #333;
        }
        
        .testimonial-author {
            font-weight: bold;
            color: #ff1493;
            margin-bottom: 10px;
        }
        
        .testimonial-meta {
            font-size: 0.9rem;
            color: #666;
        }
        
        .no-testimonials {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 60px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(255, 20, 147, 0.3);
            border: 2px solid rgba(255, 20, 147, 0.2);
        }
        
        .no-testimonials h3 {
            color: #ff1493;
            font-size: 2rem;
            margin-bottom: 20px;
        }
        
        .no-testimonials p {
            font-size: 1.1rem;
            margin-bottom: 15px;
        }
        
        .no-testimonials a {
            color: #ff1493;
            text-decoration: none;
            font-weight: bold;
        }
        
        .no-testimonials a:hover {
            text-decoration: underline;
        }
        
        .cta-section {
            background: linear-gradient(135deg, #ff1493, #00ffff, #ff69b4);
            color: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            margin: 40px 0;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .cta-button {
            background: rgba(255, 255, 255, 0.9);
            color: #ff1493;
            padding: 15px 30px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            margin: 10px;
            display: inline-block;
        }
        
        .cta-button:hover {
            background: rgba(255, 255, 255, 1);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        @media (max-width: 768px) {
            .header h1 { font-size: 2.5rem; }
            .testimonials-grid { grid-template-columns: 1fr; }
            .testimonial-card { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✨ Real Success Stories</h1>
            <p>Authentic experiences from the RinaWarp Terminal community</p>
        </div>
        
        <div class="nav">
            <a href="/">🏠 Home</a>
            <a href="/pricing.html">💰 Pricing</a>
            <a href="/download.html">📥 Download</a>
            <a href="/case-studies-authentic.html">📝 Share Your Story</a>
        </div>
        
        <div class="stats-bar">
            <strong>${count} Verified User Stories</strong> • 
            Last updated: ${new Date().toLocaleDateString()} • 
            <a href="/case-studies-authentic.html" style="color: #ff1493; text-decoration: none;">Add Yours →</a>
        </div>
        
        <div class="testimonials-grid">
            ${testimonialsHTML}
        </div>
        
        <div class="cta-section">
            <h2 style="margin-bottom: 20px;">Share Your RinaWarp Terminal Experience</h2>
            <p style="margin-bottom: 30px; font-size: 1.2rem;">Help other developers discover how RinaWarp Terminal can improve their workflow</p>
            
            <a href="/case-studies-authentic.html" class="cta-button">📝 Submit Your Story</a>
            <a href="/download.html" class="cta-button">📥 Try RinaWarp Terminal</a>
        </div>
    </div>
</body>
</html>`;
  }

  // CLI interface for managing testimonials
  async runCLI() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'list-pending':
        return this.listPendingTestimonials();

      case 'approve':
        const testimonialId = args[1];
        const notes = args.slice(2).join(' ');
        return this.approveTestimonialCLI(testimonialId, notes);

      case 'generate':
        return this.generateTestimonialPage();

      case 'stats':
        return this.showStats();

      case 'init':
        return this.initializeSystem();

      default:
        return this.showHelp();
    }
  }

  listPendingTestimonials() {
    const pending = this.getPendingTestimonials();

    if (pending.length === 0) {
      console.log('📭 No pending testimonials found.');
      return;
    }

    console.log(`📬 ${pending.length} pending testimonials:\n`);

    pending.forEach(testimonial => {
      console.log(`ID: ${testimonial.id}`);
      console.log(`Date: ${new Date(testimonial.timestamp).toLocaleDateString()}`);
      console.log(`Name: ${testimonial.data.name || 'Anonymous'}`);
      console.log(`Company: ${testimonial.data.company || 'Not specified'}`);
      console.log(`Team Size: ${testimonial.data.team_size || 'Not specified'}`);
      console.log(
        `Feedback: ${(testimonial.data.feedback || testimonial.data.comments || '').substring(0, 100)}...`
      );
      console.log(`Testimonial OK: ${testimonial.testimonialApproved ? 'Yes' : 'No'}`);
      console.log('─'.repeat(50));
    });
  }

  approveTestimonialCLI(testimonialId, notes) {
    if (!testimonialId) {
      console.log('❌ Please provide a testimonial ID');
      return;
    }

    try {
      const approved = this.approveTestimonial(testimonialId, notes);
      console.log(`✅ Approved testimonial from ${approved.data.name || 'Anonymous'}`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  showStats() {
    const pending = this.getPendingTestimonials();
    const approved = this.getApprovedTestimonials();

    console.log('📊 Testimonial Statistics:');
    console.log(`   Pending: ${pending.length}`);
    console.log(`   Approved: ${approved.length}`);
    console.log(`   Total: ${pending.length + approved.length}`);

    if (approved.length > 0) {
      const latest = approved[0];
      console.log(
        `   Latest: ${latest.data.name || 'Anonymous'} (${new Date(latest.approvedAt).toLocaleDateString()})`
      );
    }
  }

  initializeSystem() {
    this.initializeDirectories();
    this.generateTestimonialPage();
    console.log('✅ Testimonial system initialized');
    console.log('📁 Directories created:');
    console.log(`   - ${this.config.testimonialDir}`);
    console.log(`   - ${this.config.approvedDir}`);
    console.log(`   - ${this.config.pendingDir}`);
    console.log(`   - ${this.config.templatesDir}`);
  }

  showHelp() {
    console.log(`
🗣️  RinaWarp Testimonial Manager

Usage: node testimonial-manager.cjs [command]

Commands:
  init              Initialize testimonial system
  list-pending      Show all pending testimonials
  approve <id>      Approve a testimonial by ID
  generate          Generate testimonial HTML page
  stats             Show testimonial statistics
  help              Show this help message

Examples:
  node testimonial-manager.cjs init
  node testimonial-manager.cjs list-pending
  node testimonial-manager.cjs approve 1640995200000
  node testimonial-manager.cjs generate
`);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const manager = new TestimonialManager();
  manager.runCLI().catch(console.error);
}

module.exports = TestimonialManager;
