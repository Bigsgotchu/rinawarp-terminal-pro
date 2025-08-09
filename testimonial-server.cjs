const express = require('express');
const TestimonialManager = require('./scripts/testimonial-manager.cjs');
const path = require('path');
const fs = require('fs');

const app = express();
const testimonialManager = new TestimonialManager();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// API endpoint to handle feedback submissions
app.post('/api/submit-feedback', (req, res) => {
    try {
        const feedbackData = {
            ...req.body,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        };
        
        const processed = testimonialManager.processFeedback(feedbackData);
        
        console.log(`📧 New ${processed.type} received from ${processed.data.name || 'Anonymous'}`);
        
        res.json({
            success: true,
            message: 'Thank you for your feedback! We\'ll review it and may reach out to you.',
            id: processed.id
        });
    } catch (error) {
        console.error('Error processing feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Sorry, there was an error submitting your feedback. Please try again.'
        });
    }
});

// API endpoint to get approved testimonials (for display)
app.get('/api/testimonials', (req, res) => {
    try {
        const approved = testimonialManager.getApprovedTestimonials();
        res.json({
            success: true,
            testimonials: approved,
            count: approved.length
        });
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching testimonials'
        });
    }
});

// Serve the testimonial collection page
app.get('/testimonials.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/testimonials.html'));
});

// Serve the generated testimonial display page
app.get('/user-stories.html', (req, res) => {
    const testimonialPagePath = path.join(__dirname, 'public/html/templates/case-studies-real.html');
    if (fs.existsSync(testimonialPagePath)) {
        res.sendFile(testimonialPagePath);
    } else {
        res.status(404).send('User stories page not found. Please generate testimonials first.');
    }
});

// Admin endpoint to list pending testimonials (basic auth would be added in production)
app.get('/admin/pending', (req, res) => {
    try {
        const pending = testimonialManager.getPendingTestimonials();
        res.json({
            success: true,
            pending: pending,
            count: pending.length
        });
    } catch (error) {
        console.error('Error fetching pending testimonials:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending testimonials'
        });
    }
});

// Admin endpoint to approve testimonials
app.post('/admin/approve/:id', (req, res) => {
    try {
        const testimonialId = req.params.id;
        const notes = req.body.notes || '';
        
        const approved = testimonialManager.approveTestimonial(testimonialId, notes);
        
        res.json({
            success: true,
            message: `Testimonial from ${approved.data.name || 'Anonymous'} approved`,
            testimonial: approved
        });
    } catch (error) {
        console.error('Error approving testimonial:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        testimonials: {
            pending: testimonialManager.getPendingTestimonials().length,
            approved: testimonialManager.getApprovedTestimonials().length
        }
    });
});

const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.NODE_ENV === 'production' ? 'https://rinawarptech.com' : `http://localhost:${PORT}`;

app.listen(PORT, () => {
    console.log(`
🚀 RinaWarp Terminal Testimonial Server running on port ${PORT}

📝 Testimonial Collection: ${DOMAIN}/testimonials.html
👥 User Stories Display: ${DOMAIN}/user-stories.html
🔧 Admin Panel: ${DOMAIN}/admin/pending
📊 Health Check: ${DOMAIN}/health

💡 CLI Commands:
   node scripts/testimonial-manager.cjs list-pending
   node scripts/testimonial-manager.cjs approve <id>
   node scripts/testimonial-manager.cjs generate
   node scripts/testimonial-manager.cjs stats
`);
});

module.exports = app;
