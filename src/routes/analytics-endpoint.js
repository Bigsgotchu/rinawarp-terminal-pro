/**
 * Conversion Analytics Backend Endpoint
 * This module handles receiving and storing conversion data from frontend
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiting for analytics endpoints
const analyticsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  message: { error: 'Too many analytics requests, please try again later' },
});

// Analytics storage directories
const DATA_DIR = path.join(process.cwd(), 'data', 'analytics');
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.jsonl');
const CONVERSIONS_FILE = path.join(DATA_DIR, 'conversions.jsonl');
const FUNNELS_FILE = path.join(DATA_DIR, 'funnels.jsonl');

// Ensure analytics directories exist
function ensureDirectoriesExist() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Initialize analytics files if they don't exist
function initializeAnalyticsFiles() {
  ensureDirectoriesExist();

  const files = [EVENTS_FILE, SESSIONS_FILE, CONVERSIONS_FILE, FUNNELS_FILE];

  files.forEach(file => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '', 'utf8');
      console.log(`Created analytics file: ${file}`);
    }
  });
}

// Initialize analytics files on startup
initializeAnalyticsFiles();

/**
 * POST /api/analytics/conversion-batch
 * Receive batch of conversion events from frontend
 */
router.post('/conversion-batch', analyticsRateLimit, async (req, res) => {
  try {
    const { sessionId, userId, events, metadata } = req.body;

    if (!sessionId || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Invalid analytics data' });
    }

    // Store session data
    const sessionData = {
      sessionId,
      userId,
      timestamp: Date.now(),
      userAgent: metadata?.userAgent || req.headers['user-agent'],
      ip: req.ip,
      metadata,
    };

    fs.appendFileSync(SESSIONS_FILE, JSON.stringify(sessionData) + '\n');

    // Process each event
    let conversions = 0;
    let funnelEvents = 0;

    for (const event of events) {
      // Store all events
      fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');

      // Store conversions separately
      if (
        event.eventName === 'payment_success' ||
        event.eventName === 'trial_start' ||
        event.eventName === 'signup' ||
        event.eventName === 'conversion_funnel_complete'
      ) {
        fs.appendFileSync(CONVERSIONS_FILE, JSON.stringify(event) + '\n');
        conversions++;
      }

      // Store funnel events separately
      if (event.category === 'funnel' || event.eventName === 'funnel_step_change') {
        fs.appendFileSync(FUNNELS_FILE, JSON.stringify(event) + '\n');
        funnelEvents++;
      }
    }

    console.log(
      `📊 Received ${events.length} events (${conversions} conversions, ${funnelEvents} funnel events) from session ${sessionId}`
    );

    res.json({
      success: true,
      processed: events.length,
      conversions,
      funnelEvents,
    });
  } catch (error) {
    console.error('❌ Error processing analytics batch:', error);
    res.status(500).json({ error: 'Failed to process analytics data' });
  }
});

/**
 * GET /api/analytics/dashboard-data
 * Get aggregated analytics data for dashboard
 */
router.get('/dashboard-data', analyticsRateLimit, async (req, res) => {
  try {
    // Read and parse analytics files
    const events = readAnalyticsFile(EVENTS_FILE);
    const sessions = readAnalyticsFile(SESSIONS_FILE);
    const conversions = readAnalyticsFile(CONVERSIONS_FILE);
    const funnels = readAnalyticsFile(FUNNELS_FILE);

    // Calculate key metrics
    const metrics = calculateMetrics(events, sessions, conversions, funnels);

    res.json({
      success: true,
      data: metrics,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ Error generating analytics dashboard data:', error);
    res.status(500).json({ error: 'Failed to generate analytics data' });
  }
});

/**
 * Read and parse analytics file
 */
function readAnalyticsFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  if (!content) {
    return [];
  }

  return content
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (_e) {
        console.error(`Error parsing line: ${line}`);
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Calculate key analytics metrics
 */
function calculateMetrics(events, sessions, conversions, funnels) {
  // Basic metrics
  const totalSessions = sessions.length;
  const totalEvents = events.length;
  const totalConversions = conversions.length;
  const conversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;

  // Unique users
  const uniqueUsers = new Set(sessions.map(s => s.userId)).size;

  // Conversion funnel analysis
  const funnelSteps = {
    page_view: 0,
    pricing_view: 0,
    plan_selection: 0,
    checkout_start: 0,
    conversion_complete: 0,
  };

  // Count funnel steps
  funnels.forEach(event => {
    if (event.toStep && funnelSteps.hasOwnProperty(event.toStep)) {
      funnelSteps[event.toStep]++;
    }
  });

  // Calculate drop-off rates
  const funnelDropoff = {};
  let previousStepCount = funnelSteps.page_view;

  for (const [step, count] of Object.entries(funnelSteps)) {
    if (step === 'page_view') continue;

    const dropoffRate =
      previousStepCount > 0 ? ((previousStepCount - count) / previousStepCount) * 100 : 0;
    funnelDropoff[step] = {
      count,
      previousStep: Object.keys(funnelSteps)[Object.keys(funnelSteps).indexOf(step) - 1],
      dropoffRate: Math.round(dropoffRate * 100) / 100,
    };

    previousStepCount = count;
  }

  // Plan distribution
  const planDistribution = {};
  conversions.forEach(conversion => {
    const plan = conversion.plan || 'unknown';
    planDistribution[plan] = (planDistribution[plan] || 0) + 1;
  });

  // Top referrers
  const referrers = {};
  sessions.forEach(session => {
    const referrer = session.metadata?.referrer || 'direct';
    referrers[referrer] = (referrers[referrer] || 0) + 1;
  });

  return {
    totalSessions,
    totalEvents,
    totalConversions,
    uniqueUsers,
    conversionRate: Math.round(conversionRate * 100) / 100,
    funnelSteps,
    funnelDropoff,
    planDistribution,
    topReferrers: Object.entries(referrers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count })),
  };
}

export default router;
