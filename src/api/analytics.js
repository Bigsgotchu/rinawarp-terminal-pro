import express from 'express';
import rateLimit from 'express-rate-limit';
import AnalyticsSystem from '../analytics/AnalyticsSystem.js';

const router = express.Router();

// Initialize analytics system
const analytics = new AnalyticsSystem();

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: { error: 'Too many analytics requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 tracking events per minute
  message: { error: 'Too many tracking requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all analytics routes
router.use(analyticsLimiter);

// Track event endpoint
router.post('/track', trackingLimiter, async (req, res) => {
  try {
    const {
      event,
      properties = {},
      userId,
      sessionId,
      context = {}
    } = req.body;
        
    if (!event) {
      return res.status(400).json({
        success: false,
        error: 'Event name is required'
      });
    }
        
    const eventData = {
      event,
      properties,
      userId,
      sessionId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      referrer: req.get('Referer'),
      url: req.get('Origin') || context.url,
      context: {
        ...context,
        timestamp: new Date().toISOString()
      }
    };
        
    const eventId = await analytics.trackEvent(eventData);
        
    res.json({
      success: true,
      eventId,
      message: 'Event tracked successfully'
    });
        
  } catch (error) {
    console.error('Analytics API: Event tracking failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

// Track page view endpoint
router.post('/pageview', trackingLimiter, async (req, res) => {
  try {
    const {
      page,
      title,
      loadTime,
      userId,
      sessionId
    } = req.body;
        
    if (!page) {
      return res.status(400).json({
        success: false,
        error: 'Page path is required'
      });
    }
        
    const eventId = await analytics.trackPageView({
      page,
      title,
      loadTime,
      userId,
      sessionId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      referrer: req.get('Referer'),
      url: req.get('Origin')
    });
        
    res.json({
      success: true,
      eventId,
      message: 'Page view tracked successfully'
    });
        
  } catch (error) {
    console.error('Analytics API: Page view tracking failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track page view'
    });
  }
});

// Track button click endpoint
router.post('/click', trackingLimiter, async (req, res) => {
  try {
    const {
      button,
      text,
      position,
      userId,
      sessionId
    } = req.body;
        
    if (!button) {
      return res.status(400).json({
        success: false,
        error: 'Button identifier is required'
      });
    }
        
    const eventId = await analytics.trackButtonClick({
      button,
      text,
      position,
      userId,
      sessionId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      referrer: req.get('Referer'),
      url: req.get('Origin')
    });
        
    res.json({
      success: true,
      eventId,
      message: 'Button click tracked successfully'
    });
        
  } catch (error) {
    console.error('Analytics API: Button click tracking failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track button click'
    });
  }
});

// Track conversion endpoint
router.post('/conversion', trackingLimiter, async (req, res) => {
  try {
    const {
      type,
      value,
      currency = 'USD',
      properties = {},
      userId,
      sessionId
    } = req.body;
        
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Conversion type is required'
      });
    }
        
    const eventId = await analytics.trackConversion({
      type,
      value: parseFloat(value) || 0,
      currency,
      properties,
      userId,
      sessionId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      referrer: req.get('Referer'),
      url: req.get('Origin')
    });
        
    res.json({
      success: true,
      eventId,
      message: 'Conversion tracked successfully'
    });
        
  } catch (error) {
    console.error('Analytics API: Conversion tracking failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track conversion'
    });
  }
});

// Get analytics data endpoint
router.get('/data', async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
        
    // Validate time range
    const validRanges = ['1d', '7d', '30d', '90d'];
    if (!validRanges.includes(timeRange)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid time range. Valid options: 1d, 7d, 30d, 90d'
      });
    }
        
    const analyticsData = await analytics.getAnalytics(timeRange);
        
    res.json({
      success: true,
      data: analyticsData,
      timeRange
    });
        
  } catch (error) {
    console.error('Analytics API: Failed to get analytics data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics data'
    });
  }
});

// Get funnel analysis endpoint
router.get('/funnels', async (req, res) => {
  try {
    const funnelAnalysis = await analytics.getFunnelAnalysis();
        
    res.json({
      success: true,
      data: funnelAnalysis
    });
        
  } catch (error) {
    console.error('Analytics API: Failed to get funnel analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve funnel analysis'
    });
  }
});

// Batch event tracking endpoint
router.post('/batch', trackingLimiter, async (req, res) => {
  try {
    const { events } = req.body;
        
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Events array is required and must not be empty'
      });
    }
        
    if (events.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 events per batch request'
      });
    }
        
    const eventIds = [];
    const errors = [];
        
    for (let i = 0; i < events.length; i++) {
      try {
        const event = events[i];
        const eventData = {
          ...event,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          referrer: req.get('Referer'),
          url: req.get('Origin'),
          context: {
            ...event.context,
            batchIndex: i,
            timestamp: new Date().toISOString()
          }
        };
                
        const eventId = await analytics.trackEvent(eventData);
        eventIds.push(eventId);
                
      } catch (error) {
        console.error(`Analytics API: Batch event ${i} failed:`, error);
        errors.push({ index: i, error: error.message });
      }
    }
        
    res.json({
      success: true,
      processed: eventIds.length,
      total: events.length,
      eventIds,
      errors: errors.length > 0 ? errors : undefined,
      message: `Processed ${eventIds.length}/${events.length} events successfully`
    });
        
  } catch (error) {
    console.error('Analytics API: Batch tracking failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch events'
    });
  }
});

// Get real-time metrics endpoint
router.get('/realtime', async (req, res) => {
  try {
    // This would typically connect to a real-time analytics service
    // For now, return mock real-time data
    const realtimeData = {
      activeUsers: Math.floor(Math.random() * 100) + 10,
      currentSessions: Math.floor(Math.random() * 50) + 5,
      eventsPerMinute: Math.floor(Math.random() * 200) + 20,
      topPages: [
        { page: '/', users: Math.floor(Math.random() * 20) + 5 },
        { page: '/pricing', users: Math.floor(Math.random() * 15) + 3 },
        { page: '/download', users: Math.floor(Math.random() * 10) + 2 }
      ],
      timestamp: new Date().toISOString()
    };
        
    res.json({
      success: true,
      data: realtimeData
    });
        
  } catch (error) {
    console.error('Analytics API: Failed to get real-time data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve real-time data'
    });
  }
});

// Debug endpoint (development only)
router.get('/debug', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
    
  res.json({
    success: true,
    debug: {
      sessionCount: analytics.sessions.size,
      funnelStepCount: analytics.funnelSteps.size,
      eventBufferSize: analytics.eventBuffer.length,
      config: {
        dataDir: analytics.config.dataDir,
        sessionTimeout: analytics.config.sessionTimeout,
        batchSize: analytics.config.batchSize,
        enableRealtime: analytics.config.enableRealtime
      }
    }
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'analytics',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
