import express from 'express';
import rateLimit from 'express-rate-limit';
import LeadCaptureSystem from '../marketing/LeadCaptureSystem.js';

const router = express.Router();

// Initialize lead capture system
const leadCapture = new LeadCaptureSystem();

// Rate limiting for marketing endpoints
const marketingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many marketing requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const leadCaptureLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 lead captures per minute
  message: { error: 'Too many lead submissions, please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all marketing routes
router.use(marketingLimiter);

// Lead capture endpoint
router.post('/leads', leadCaptureLimit, async (req, res) => {
  try {
    const { email, name, source, interests, metadata, tags } = req.body;

    // Validate required fields
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required',
      });
    }

    // Capture additional context
    const leadData = {
      email: email.toLowerCase().trim(),
      name: name?.trim() || '',
      source: source || 'api',
      interests: interests || [],
      metadata: {
        ...metadata,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        referrer: req.get('Referer'),
      },
      tags: tags || [],
    };

    const result = await leadCapture.captureLead(leadData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Lead captured successfully',
        leadId: result.leadId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Marketing API: Lead capture failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get lead statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await leadCapture.getLeadStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Marketing API: Failed to get lead stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve lead statistics',
    });
  }
});

// Newsletter signup endpoint
router.post('/newsletter', leadCaptureLimit, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required',
      });
    }

    const leadData = {
      email: email.toLowerCase().trim(),
      source: 'newsletter',
      tags: ['newsletter'],
      metadata: {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        referrer: req.get('Referer'),
      },
    };

    const result = await leadCapture.captureLead(leadData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Successfully subscribed to newsletter',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Marketing API: Newsletter signup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Beta signup endpoint
router.post('/beta-signup', leadCaptureLimit, async (req, res) => {
  try {
    const { email, name, company, useCase } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required',
      });
    }

    const leadData = {
      email: email.toLowerCase().trim(),
      name: name?.trim() || '',
      source: 'beta_signup',
      interests: ['beta_testing'],
      tags: ['beta', 'early_adopter'],
      metadata: {
        company: company?.trim() || '',
        useCase: useCase?.trim() || '',
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        referrer: req.get('Referer'),
      },
    };

    const result = await leadCapture.captureLead(leadData);

    if (result.success) {
      res.json({
        success: true,
        message: "Beta signup successful! We'll be in touch soon.",
        leadId: result.leadId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Marketing API: Beta signup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Demo request endpoint
router.post('/demo-request', leadCaptureLimit, async (req, res) => {
  try {
    const { email, name, company, teamSize, preferredTime } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required',
      });
    }

    const leadData = {
      email: email.toLowerCase().trim(),
      name: name?.trim() || '',
      source: 'demo_request',
      interests: ['demo', 'enterprise'],
      tags: ['demo_request', 'high_intent'],
      metadata: {
        company: company?.trim() || '',
        teamSize: teamSize || '',
        preferredTime: preferredTime || '',
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        referrer: req.get('Referer'),
      },
    };

    const result = await leadCapture.captureLead(leadData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Demo request submitted! Our team will contact you within 24 hours.',
        leadId: result.leadId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Marketing API: Demo request failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'marketing',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
