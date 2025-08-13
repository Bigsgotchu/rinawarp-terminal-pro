/**
 * RinaWarp Terminal - Analytics Database Module
 * Persistent storage for analytics, license emails, and business metrics
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'rinawarp_analytics.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Initialize database schema
function initializeDatabase() {
  // License emails table
  db.exec(`
    CREATE TABLE IF NOT EXISTS license_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      to_email TEXT NOT NULL,
      message_id TEXT,
      license_key TEXT,
      license_type TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Analytics events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      event_data JSON,
      timestamp BIGINT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT
    )
  `);

  // A/B test results table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ab_test_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL, -- 'view' or 'conversion'
      variant TEXT NOT NULL,
      plan TEXT,
      value DECIMAL(10,2),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT
    )
  `);

  // License tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT UNIQUE NOT NULL,
      customer_id TEXT,
      customer_email TEXT,
      license_type TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      subscription_id TEXT,
      price_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    )
  `);

  // Server metrics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS server_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      metadata JSON,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database initialized with all tables');
}

// Initialize the database
initializeDatabase();

// Prepared statements for better performance
const statements = {
  insertLicenseEmail: db.prepare(`
    INSERT INTO license_emails (type, to_email, message_id, license_key, license_type, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  insertAnalyticsEvent: db.prepare(`
    INSERT INTO analytics_events (session_id, event_name, event_data, timestamp, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  insertABTestEvent: db.prepare(`
    INSERT INTO ab_test_events (event_type, variant, plan, value, ip_address, user_agent, referrer)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  insertLicense: db.prepare(`
    INSERT OR REPLACE INTO licenses 
    (license_key, customer_id, customer_email, license_type, status, subscription_id, price_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  insertServerMetric: db.prepare(`
    INSERT INTO server_metrics (metric_name, metric_value, metadata)
    VALUES (?, ?, ?)
  `),

  getLicenseEmailStats: db.prepare(`
    SELECT 
      type,
      COUNT(*) as count,
      MAX(timestamp) as last_sent
    FROM license_emails 
    GROUP BY type
  `),

  getRecentLicenseEmails: db.prepare(`
    SELECT * FROM license_emails 
    ORDER BY timestamp DESC 
    LIMIT ?
  `),

  getEmailsToday: db.prepare(`
    SELECT COUNT(*) as count 
    FROM license_emails 
    WHERE DATE(timestamp) = DATE('now')
  `),

  getABTestResults: db.prepare(`
    SELECT 
      variant,
      event_type,
      COUNT(*) as count,
      AVG(value) as avg_value,
      SUM(value) as total_value
    FROM ab_test_events 
    GROUP BY variant, event_type
  `),

  getAnalyticsEventCount: db.prepare(`
    SELECT 
      event_name,
      COUNT(*) as count
    FROM analytics_events
    WHERE timestamp > ?
    GROUP BY event_name
  `),
};

// Analytics Database Functions
export class AnalyticsDB {
  // License Email Functions
  static logLicenseEmail(type, toEmail, messageId, licenseKey = null, licenseType = null) {
    try {
      const timestamp = new Date().toISOString();
      statements.insertLicenseEmail.run(
        type,
        toEmail,
        messageId,
        licenseKey,
        licenseType,
        timestamp
      );
      console.log(`📊 Logged ${type} email to database:`, toEmail);
    } catch (error) {
      console.error('❌ Error logging license email:', error);
    }
  }

  static getLicenseEmailStats() {
    try {
      const stats = statements.getLicenseEmailStats.all();
      const recentEmails = statements.getRecentLicenseEmails.all(50);
      const todayCount = statements.getEmailsToday.get();

      const summary = {
        totalSent: stats.reduce((sum, stat) => sum + stat.count, 0),
        welcomeEmails: stats.find(s => s.type === 'welcome')?.count || 0,
        licenseEmails: stats.find(s => s.type === 'license')?.count || 0,
        lastSent:
          stats.length > 0 ? Math.max(...stats.map(s => new Date(s.last_sent).getTime())) : null,
        emailsToday: todayCount.count,
      };

      return {
        summary,
        recentEmails,
        stats,
      };
    } catch (error) {
      console.error('❌ Error getting license email stats:', error);
      return { summary: {}, recentEmails: [], stats: [] };
    }
  }

  // Analytics Event Functions
  static logAnalyticsEvent(
    sessionId,
    eventName,
    eventData,
    timestamp,
    ipAddress = null,
    userAgent = null
  ) {
    try {
      statements.insertAnalyticsEvent.run(
        sessionId,
        eventName,
        JSON.stringify(eventData),
        timestamp,
        ipAddress,
        userAgent
      );
    } catch (error) {
      console.error('❌ Error logging analytics event:', error);
    }
  }

  static logABTestEvent(
    eventType,
    variant,
    plan = null,
    value = null,
    ipAddress = null,
    userAgent = null,
    referrer = null
  ) {
    try {
      statements.insertABTestEvent.run(
        eventType,
        variant,
        plan,
        value,
        ipAddress,
        userAgent,
        referrer
      );
    } catch (error) {
      console.error('❌ Error logging A/B test event:', error);
    }
  }

  static getABTestResults() {
    try {
      const results = statements.getABTestResults.all();
      const processed = {
        simple: { views: 0, conversions: 0, conversionRate: 0, revenue: 0, avgRevenue: 0 },
        complex: { views: 0, conversions: 0, conversionRate: 0, revenue: 0, avgRevenue: 0 },
      };

      results.forEach(result => {
        if (processed[result.variant]) {
          if (result.event_type === 'view') {
            processed[result.variant].views = result.count;
          } else if (result.event_type === 'conversion') {
            processed[result.variant].conversions = result.count;
            processed[result.variant].revenue = result.total_value || 0;
          }
        }
      });

      // Calculate conversion rates and average revenue
      Object.keys(processed).forEach(variant => {
        const data = processed[variant];
        if (data.views > 0) {
          data.conversionRate = ((data.conversions / data.views) * 100).toFixed(2);
          data.avgRevenue = (data.revenue / data.views).toFixed(2);
        }
      });

      return processed;
    } catch (error) {
      console.error('❌ Error getting A/B test results:', error);
      return { simple: {}, complex: {} };
    }
  }

  // License Functions
  static saveLicense(licenseData) {
    try {
      statements.insertLicense.run(
        licenseData.licenseKey,
        licenseData.customerId,
        licenseData.customerEmail,
        licenseData.licenseType,
        licenseData.status || 'active',
        licenseData.subscriptionId || null,
        licenseData.priceId || null
      );
      console.log('📊 License saved to database:', licenseData.licenseKey);
    } catch (error) {
      console.error('❌ Error saving license:', error);
    }
  }

  // Server Metrics Functions
  static logServerMetric(metricName, value, metadata = {}) {
    try {
      statements.insertServerMetric.run(metricName, value, JSON.stringify(metadata));
    } catch (error) {
      console.error('❌ Error logging server metric:', error);
    }
  }

  // Analytics Dashboard Data
  static getAnalyticsDashboard() {
    try {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const eventCounts = statements.getAnalyticsEventCount.all(oneDayAgo);

      const stats = {
        totalSessions: 0, // Would need session counting logic
        totalEvents: eventCounts.reduce((sum, event) => sum + event.count, 0),
        pageViews: eventCounts.find(e => e.event_name === 'page_view')?.count || 0,
        checkoutInitiated: eventCounts.find(e => e.event_name === 'checkout_initiated')?.count || 0,
        purchasesCompleted:
          eventCounts.find(e => e.event_name === 'purchase_completed')?.count || 0,
      };

      stats.conversionRate =
        stats.pageViews > 0 ? ((stats.purchasesCompleted / stats.pageViews) * 100).toFixed(2) : 0;

      return {
        stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error getting analytics dashboard:', error);
      return { stats: {}, timestamp: new Date().toISOString() };
    }
  }

  // Database maintenance
  static vacuum() {
    try {
      db.exec('VACUUM');
      console.log('✅ Database vacuumed');
    } catch (error) {
      console.error('❌ Error vacuuming database:', error);
    }
  }

  static close() {
    db.close();
  }
}

// Schedule periodic maintenance
setInterval(
  () => {
    AnalyticsDB.logServerMetric('uptime', process.uptime());
  },
  5 * 60 * 1000
); // Every 5 minutes

// Log startup
AnalyticsDB.logServerMetric('server_start', 1, {
  timestamp: new Date().toISOString(),
  version: '1.0.9',
});

console.log('✅ Analytics database initialized:', dbPath);

export default AnalyticsDB;
