import express from 'express';
import { getAnalyticsService } from '../services/analytics.js';

const router = express.Router();
const analytics = getAnalyticsService();

/**
 * POST /api/analytics/track
 * Track general events from the website
 */
router.post('/track', async (req, res) => {
  try {
    const { event_name, user_id, session_id, platform, tier, properties = {} } = req.body;

    if (!event_name) {
      return res.status(400).json({
        error: 'event_name is required',
      });
    }

    // Get client IP and user agent for enrichment
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const enrichedProperties = {
      ...properties,
      ip_address: clientIP,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
      source: 'website',
    };

    // Track the event
    const eventData = {
      event_name,
      user_id: user_id || session_id || 'anonymous',
      platform,
      tier,
      ...enrichedProperties,
    };

    await analytics.trackGA4Event(
      user_id || session_id || 'anonymous',
      event_name,
      enrichedProperties
    );

    await analytics.trackMixpanelEvent(user_id || session_id || 'anonymous', event_name, eventData);

    res.json({
      success: true,
      event_id: `${event_name}_${Date.now()}`,
    });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    res.status(500).json({
      error: 'Failed to track event',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/analytics/download
 * Track download events with platform and tier info
 */
router.post('/download', async (req, res) => {
  try {
    const { platform, tier, user_id, session_id, version = '1.0.8' } = req.body;

    if (!platform || !tier) {
      return res.status(400).json({
        error: 'platform and tier are required',
      });
    }

    const userId = user_id || session_id || 'anonymous';

    // Track download event
    await analytics.trackDownload(userId, platform, tier, version);

    // For free tier downloads, also track as a conversion goal
    if (tier === 'free') {
      await analytics.trackGA4Event(userId, 'free_download', {
        platform,
        tier,
        version,
        category: 'acquisition',
      });
    }

    res.json({
      success: true,
      message: `Download tracked: ${platform} ${tier}`,
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({
      error: 'Failed to track download',
    });
  }
});

/**
 * POST /api/analytics/demo-request
 * Track enterprise demo requests
 */
router.post('/demo-request', async (req, res) => {
  try {
    const { email, company, name, phone, message, estimated_seats, timeline } = req.body;

    if (!email || !company) {
      return res.status(400).json({
        error: 'email and company are required',
      });
    }

    const requestDetails = {
      name,
      phone,
      message,
      estimated_seats,
      timeline,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
    };

    // Track demo request
    await analytics.trackDemoRequest(email, company, requestDetails);

    res.json({
      success: true,
      message: 'Demo request tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking demo request:', error);
    res.status(500).json({
      error: 'Failed to track demo request',
    });
  }
});

/**
 * POST /api/analytics/tier-interest
 * Track user interest in specific tiers (pricing page interactions)
 */
router.post('/tier-interest', async (req, res) => {
  try {
    const {
      tier,
      action, // 'viewed', 'clicked', 'hovered'
      user_id,
      session_id,
      source_page = 'pricing',
    } = req.body;

    if (!tier || !action) {
      return res.status(400).json({
        error: 'tier and action are required',
      });
    }

    const userId = user_id || session_id || 'anonymous';

    await analytics.trackGA4Event(userId, `tier_${action}`, {
      tier,
      action,
      source_page,
      category: 'engagement',
    });

    await analytics.trackMixpanelEvent(userId, 'Tier Interest', {
      tier,
      action,
      source_page,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking tier interest:', error);
    res.status(500).json({
      error: 'Failed to track tier interest',
    });
  }
});

/**
 * POST /api/analytics/conversion-funnel
 * Track user progression through conversion funnel
 */
router.post('/conversion-funnel', async (req, res) => {
  try {
    const {
      step, // 'awareness', 'consideration', 'decision', 'action'
      action,
      tier,
      user_id,
      session_id,
      metadata = {},
    } = req.body;

    if (!step || !action) {
      return res.status(400).json({
        error: 'step and action are required',
      });
    }

    const userId = user_id || session_id || 'anonymous';

    const funnelEvent = {
      funnel_step: step,
      action,
      tier,
      ...metadata,
      timestamp: new Date().toISOString(),
    };

    await analytics.trackGA4Event(userId, 'funnel_progression', funnelEvent);
    await analytics.trackMixpanelEvent(userId, 'Conversion Funnel', funnelEvent);

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking conversion funnel:', error);
    res.status(500).json({
      error: 'Failed to track funnel progression',
    });
  }
});

/**
 * POST /api/analytics/a-b-test
 * Track A/B test exposure and outcomes
 */
router.post('/a-b-test', async (req, res) => {
  try {
    const { test_name, variant, user_id, session_id, outcome = null, metadata = {} } = req.body;

    if (!test_name || !variant) {
      return res.status(400).json({
        error: 'test_name and variant are required',
      });
    }

    const userId = user_id || session_id || 'anonymous';

    await analytics.trackABTest(userId, test_name, variant, outcome);

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking A/B test:', error);
    res.status(500).json({
      error: 'Failed to track A/B test',
    });
  }
});

/**
 * GET /api/analytics/summary
 * Get analytics summary (for admin/internal use)
 */
router.get('/summary', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;

    // This would typically require authentication in production
    const summary = await analytics.generateReport(
      new Date(Date.now() - (timeRange === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)),
      new Date()
    );

    res.json(summary);
  } catch (error) {
    console.error('Error generating analytics summary:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
    });
  }
});

/**
 * POST /api/analytics/page-view
 * Track page views and session data
 */
router.post('/page-view', async (req, res) => {
  try {
    const {
      page,
      referrer,
      user_id,
      session_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    } = req.body;

    if (!page) {
      return res.status(400).json({
        error: 'page is required',
      });
    }

    const userId = user_id || session_id || 'anonymous';

    const pageViewData = {
      page,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    };

    await analytics.trackGA4Event(userId, 'page_view', pageViewData);
    await analytics.trackMixpanelEvent(userId, 'Page View', pageViewData);

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking page view:', error);
    res.status(500).json({
      error: 'Failed to track page view',
    });
  }
});

export default router;
