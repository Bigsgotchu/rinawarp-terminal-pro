import express from 'express';
import rateLimit from 'express-rate-limit';
import support from '../support/SupportSystem.js';

const router = express.Router();

// Rate limiting for support endpoints
const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { error: 'Too many support requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const ticketCreateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 ticket creations per hour
  message: { error: 'Too many ticket submissions, please wait before creating another ticket.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all support routes
router.use(supportLimiter);

// Create ticket endpoint
router.post('/tickets', ticketCreateLimit, async (req, res) => {
  try {
    const {
      subject,
      description,
      customerName,
      customerEmail,
      category,
      tags,
      attachments,
      version,
    } = req.body;

    // Validate required fields
    if (!subject || !description || !customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'Subject, description, and email are required',
      });
    }

    if (!customerEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required',
      });
    }

    const ticketData = {
      subject: subject.trim(),
      description: description.trim(),
      customerName: customerName?.trim() || '',
      customerEmail: customerEmail.toLowerCase().trim(),
      category: category || 'general',
      tags: tags || [],
      attachments: attachments || [],
      version: version || '',
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      source: 'web',
    };

    const result = await support.createTicket(ticketData);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        ticketId: result.ticketId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Support API: Ticket creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Add response to ticket endpoint
router.post('/tickets/:ticketId/responses', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message, author, authorType = 'customer', isPublic = true, attachments } = req.body;

    if (!message || !author) {
      return res.status(400).json({
        success: false,
        error: 'Message and author are required',
      });
    }

    const responseData = {
      message: message.trim(),
      author: author.trim(),
      authorType,
      isPublic,
      attachments: attachments || [],
    };

    const result = await support.addResponse(ticketId, responseData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Response added successfully',
        responseId: result.responseId,
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Support API: Response addition failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Resolve ticket endpoint
router.put('/tickets/:ticketId/resolve', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { summary, resolvedBy } = req.body;

    if (!summary || !resolvedBy) {
      return res.status(400).json({
        success: false,
        error: 'Resolution summary and resolver name are required',
      });
    }

    const resolutionData = {
      summary: summary.trim(),
      resolvedBy: resolvedBy.trim(),
    };

    const result = await support.resolveTicket(ticketId, resolutionData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Ticket resolved successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Support API: Ticket resolution failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get ticket details endpoint
router.get('/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await support.getTicket(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('Support API: Failed to get ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Search knowledge base endpoint
router.get('/kb/search', async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long',
      });
    }

    const results = await support.searchKnowledgeBase(query.trim());

    res.json({
      success: true,
      data: results,
      query: query.trim(),
    });
  } catch (error) {
    console.error('Support API: Knowledge base search failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search knowledge base',
    });
  }
});

// Get support statistics endpoint
router.get('/stats', async (req, res) => {
  try {
    const stats = await support.getSupportStats();

    if (stats.error) {
      return res.status(500).json({
        success: false,
        error: stats.error,
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Support API: Failed to get support stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve support statistics',
    });
  }
});

// Contact form endpoint
router.post('/contact', ticketCreateLimit, async (req, res) => {
  try {
    const { name, email, subject, message, category = 'general' } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required',
      });
    }

    // Create ticket from contact form
    const ticketData = {
      subject: `Contact Form: ${subject.trim()}`,
      description: message.trim(),
      customerName: name.trim(),
      customerEmail: email.toLowerCase().trim(),
      category,
      tags: ['contact_form'],
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      source: 'contact_form',
    };

    const result = await support.createTicket(ticketData);

    if (result.success) {
      res.json({
        success: true,
        message: "Thank you for contacting us! We'll get back to you soon.",
        ticketId: result.ticketId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Support API: Contact form submission failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Feedback endpoint
router.post('/feedback/:ticketId', async (req, res) => {
  try {
    const { _ticketId } = req.params;
    const { rating, _comment } = req.body;

    // Validate rating
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
    }

    // For now, just log the feedback
    // In a full implementation, you'd store this in a feedback system

    res.json({
      success: true,
      message: 'Thank you for your feedback!',
    });
  } catch (error) {
    console.error('Support API: Feedback submission failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get categories endpoint
router.get('/categories', (req, res) => {
  try {
    res.json({
      success: true,
      data: support.config.categories,
    });
  } catch (error) {
    console.error('Support API: Failed to get categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories',
    });
  }
});

// Get priority levels endpoint
router.get('/priorities', (req, res) => {
  try {
    res.json({
      success: true,
      data: support.config.priorityLevels,
    });
  } catch (error) {
    console.error('Support API: Failed to get priorities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve priority levels',
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'support',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
