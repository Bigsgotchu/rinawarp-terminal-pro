import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AnalyticsSystem {
  constructor(config = {}) {
    this.config = {
      dataDir: path.join(__dirname, '../../data/analytics'),
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
      enableRealtime: true,
      webhookUrl: process.env.ANALYTICS_WEBHOOK_URL,
      ...config,
    };

    this.eventBuffer = [];
    this.sessions = new Map();
    this.funnelSteps = new Map();

    this.initializeSystem();
    this.setupPeriodicFlush();
  }

  async initializeSystem() {
    try {
      await fs.mkdir(this.config.dataDir, { recursive: true });

      // Initialize data files
      const files = ['events.jsonl', 'sessions.jsonl', 'conversions.jsonl', 'funnels.json'];

      for (const file of files) {
        const filePath = path.join(this.config.dataDir, file);
        try {
          await fs.access(filePath);
        } catch {
          if (file.endsWith('.json')) {
            await fs.writeFile(filePath, JSON.stringify({}, null, 2));
          } else {
            await fs.writeFile(filePath, '');
          }
        }
      }

      // Define conversion funnels
      await this.defineFunnels();
    } catch (error) {
      console.error('Analytics: Failed to initialize system:', error);
    }
  }

  async defineFunnels() {
    const funnels = {
      user_acquisition: {
        name: 'User Acquisition Funnel',
        steps: [
          { id: 'landing', name: 'Landing Page Visit', event: 'page_view', filters: { page: '/' } },
          {
            id: 'pricing',
            name: 'Pricing Page View',
            event: 'page_view',
            filters: { page: '/pricing' },
          },
          {
            id: 'download_intent',
            name: 'Download Button Click',
            event: 'button_click',
            filters: { button: 'download' },
          },
          { id: 'download_complete', name: 'Download Completed', event: 'download_complete' },
          { id: 'app_install', name: 'App Installed', event: 'app_install' },
          {
            id: 'first_launch',
            name: 'First App Launch',
            event: 'app_launch',
            filters: { session_count: 1 },
          },
        ],
      },
      purchase_conversion: {
        name: 'Purchase Conversion Funnel',
        steps: [
          {
            id: 'pricing_view',
            name: 'Pricing Page View',
            event: 'page_view',
            filters: { page: '/pricing' },
          },
          {
            id: 'plan_click',
            name: 'Plan Selection',
            event: 'button_click',
            filters: { button: 'select_plan' },
          },
          { id: 'checkout_start', name: 'Checkout Started', event: 'checkout_start' },
          { id: 'payment_info', name: 'Payment Info Entered', event: 'payment_info_entered' },
          { id: 'purchase_complete', name: 'Purchase Completed', event: 'purchase_complete' },
        ],
      },
      user_activation: {
        name: 'User Activation Funnel',
        steps: [
          {
            id: 'first_launch',
            name: 'First Launch',
            event: 'app_launch',
            filters: { session_count: 1 },
          },
          {
            id: 'ai_discovery',
            name: 'AI Feature Discovery',
            event: 'feature_discovery',
            filters: { feature: 'ai_agent' },
          },
          { id: 'ai_first_use', name: 'First AI Command', event: 'ai_command_executed' },
          { id: 'terminal_customization', name: 'Terminal Customized', event: 'settings_changed' },
          {
            id: 'active_user',
            name: 'Active User (10+ commands)',
            event: 'milestone_reached',
            filters: { milestone: 'commands_10' },
          },
        ],
      },
    };

    const funnelPath = path.join(this.config.dataDir, 'funnels.json');
    await fs.writeFile(funnelPath, JSON.stringify(funnels, null, 2));
  }

  setupPeriodicFlush() {
    if (this.config.enableRealtime) {
      setInterval(() => {
        this.flushEvents();
      }, this.config.flushInterval);
    }
  }

  async trackEvent(eventData) {
    const event = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      sessionId: eventData.sessionId || this.generateSessionId(eventData),
      userId: eventData.userId,
      event: eventData.event,
      properties: eventData.properties || {},
      context: {
        userAgent: eventData.userAgent,
        ip: eventData.ip,
        referrer: eventData.referrer,
        url: eventData.url,
        ...eventData.context,
      },
    };

    // Update session
    await this.updateSession(event);

    // Add to buffer
    this.eventBuffer.push(event);

    // Process funnel progression
    await this.processFunnelProgression(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flushEvents();
    }

    return event.id;
  }

  async trackPageView(data) {
    return this.trackEvent({
      event: 'page_view',
      properties: {
        page: data.page,
        title: data.title,
        loadTime: data.loadTime,
      },
      ...data,
    });
  }

  async trackButtonClick(data) {
    return this.trackEvent({
      event: 'button_click',
      properties: {
        button: data.button,
        text: data.text,
        position: data.position,
      },
      ...data,
    });
  }

  async trackConversion(data) {
    const conversion = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      sessionId: data.sessionId,
      userId: data.userId,
      type: data.type, // 'purchase', 'signup', 'download', etc.
      value: data.value,
      currency: data.currency || 'USD',
      properties: data.properties || {},
    };

    await this.logConversion(conversion);

    return this.trackEvent({
      event: 'conversion',
      properties: conversion,
      ...data,
    });
  }

  async updateSession(event) {
    const sessionId = event.sessionId;
    const session = this.sessions.get(sessionId) || {
      id: sessionId,
      userId: event.userId,
      startTime: event.timestamp,
      lastActivity: event.timestamp,
      eventCount: 0,
      pages: new Set(),
      referrer: event.context.referrer,
      userAgent: event.context.userAgent,
      ip: event.context.ip,
    };

    session.lastActivity = event.timestamp;
    session.eventCount++;

    if (event.context.url) {
      session.pages.add(event.context.url);
    }

    this.sessions.set(sessionId, session);

    // Persist session
    await this.logSession(session);
  }

  async processFunnelProgression(event) {
    const funnels = await this.getFunnels();

    for (const [funnelId, funnel] of Object.entries(funnels)) {
      for (let i = 0; i < funnel.steps.length; i++) {
        const step = funnel.steps[i];

        if (this.matchesStep(event, step)) {
          await this.recordFunnelProgression(event.sessionId, funnelId, step.id, i);
        }
      }
    }
  }

  matchesStep(event, step) {
    if (event.event !== step.event) return false;

    if (step.filters) {
      for (const [key, value] of Object.entries(step.filters)) {
        const eventValue = event.properties[key] || event.context[key];
        if (eventValue !== value) return false;
      }
    }

    return true;
  }

  async recordFunnelProgression(sessionId, funnelId, stepId, stepIndex) {
    const key = `${sessionId}_${funnelId}`;
    const progression = this.funnelSteps.get(key) || {
      sessionId,
      funnelId,
      steps: [],
      currentStep: -1,
    };

    if (stepIndex > progression.currentStep) {
      progression.steps.push({
        stepId,
        stepIndex,
        timestamp: new Date().toISOString(),
      });
      progression.currentStep = stepIndex;

      this.funnelSteps.set(key, progression);
    }
  }

  async flushEvents() {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Write to file
      const eventPath = path.join(this.config.dataDir, 'events.jsonl');
      const eventLines = events.map(event => JSON.stringify(event)).join('\n') + '\n';
      await fs.appendFile(eventPath, eventLines);

      // Send to webhook if configured
      if (this.config.webhookUrl) {
        await this.sendWebhookBatch(events);
      }
    } catch (error) {
      console.error('Analytics: Failed to flush events:', error);
      // Put events back in buffer
      this.eventBuffer.unshift(...events);
    }
  }

  async logSession(session) {
    try {
      const sessionPath = path.join(this.config.dataDir, 'sessions.jsonl');
      const sessionData = {
        ...session,
        pages: Array.from(session.pages),
      };
      await fs.appendFile(sessionPath, JSON.stringify(sessionData) + '\n');
    } catch (error) {
      console.error('Analytics: Failed to log session:', error);
    }
  }

  async logConversion(conversion) {
    try {
      const conversionPath = path.join(this.config.dataDir, 'conversions.jsonl');
      await fs.appendFile(conversionPath, JSON.stringify(conversion) + '\n');
    } catch (error) {
      console.error('Analytics: Failed to log conversion:', error);
    }
  }

  async getAnalytics(timeRange = '7d') {
    try {
      const events = await this.getEvents(timeRange);
      const sessions = await this.getSessions(timeRange);
      const conversions = await this.getConversions(timeRange);

      return {
        overview: {
          totalEvents: events.length,
          totalSessions: sessions.length,
          totalConversions: conversions.length,
          conversionRate:
            sessions.length > 0 ? ((conversions.length / sessions.length) * 100).toFixed(2) : 0,
        },
        topEvents: this.getTopEvents(events),
        topPages: this.getTopPages(events),
        userFlow: await this.getUserFlow(events),
        funnelAnalysis: await this.getFunnelAnalysis(),
        conversionMetrics: this.getConversionMetrics(conversions),
        sessionMetrics: this.getSessionMetrics(sessions),
      };
    } catch (error) {
      console.error('Analytics: Failed to get analytics:', error);
      return { error: error.message };
    }
  }

  async getFunnelAnalysis() {
    const funnels = await this.getFunnels();
    const analysis = {};

    for (const [funnelId, funnel] of Object.entries(funnels)) {
      const stepCounts = {};
      const stepConversions = {};

      // Count users at each step
      for (const [_key, progression] of this.funnelSteps.entries()) {
        if (progression.funnelId === funnelId) {
          for (const step of progression.steps) {
            stepCounts[step.stepId] = (stepCounts[step.stepId] || 0) + 1;
          }
        }
      }

      // Calculate conversion rates
      const stepIds = funnel.steps.map(s => s.id);
      for (let i = 0; i < stepIds.length; i++) {
        const currentStep = stepIds[i];
        const nextStep = stepIds[i + 1];

        if (nextStep && stepCounts[currentStep] > 0) {
          stepConversions[`${currentStep}_to_${nextStep}`] = (
            ((stepCounts[nextStep] || 0) / stepCounts[currentStep]) *
            100
          ).toFixed(2);
        }
      }

      analysis[funnelId] = {
        name: funnel.name,
        stepCounts,
        stepConversions,
        totalUsers: stepCounts[stepIds[0]] || 0,
        completedUsers: stepCounts[stepIds[stepIds.length - 1]] || 0,
        overallConversion: stepCounts[stepIds[0]]
          ? (
            ((stepCounts[stepIds[stepIds.length - 1]] || 0) / stepCounts[stepIds[0]]) *
              100
          ).toFixed(2)
          : 0,
      };
    }

    return analysis;
  }

  generateSessionId(eventData) {
    const identifier = eventData.userId || eventData.ip || 'anonymous';
    return crypto
      .createHash('md5')
      .update(identifier + Date.now())
      .digest('hex');
  }

  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  async getFunnels() {
    try {
      const funnelPath = path.join(this.config.dataDir, 'funnels.json');
      const data = await fs.readFile(funnelPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async getEvents(_timeRange) {
    // Implementation would read and filter events from jsonl file
    return [];
  }

  async getSessions(_timeRange) {
    // Implementation would read and filter sessions from jsonl file
    return [];
  }

  async getConversions(_timeRange) {
    // Implementation would read and filter conversions from jsonl file
    return [];
  }

  getTopEvents(events) {
    const eventCounts = {};
    events.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    });
    return Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }

  getTopPages(events) {
    const pageCounts = {};
    events
      .filter(e => e.event === 'page_view')
      .forEach(event => {
        const page = event.properties.page || event.context.url;
        pageCounts[page] = (pageCounts[page] || 0) + 1;
      });
    return Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }

  async getUserFlow(events) {
    // Analyze common user paths through the application
    const flows = {};
    const sessionFlows = {};

    events.forEach(event => {
      if (!sessionFlows[event.sessionId]) {
        sessionFlows[event.sessionId] = [];
      }
      sessionFlows[event.sessionId].push(event.event);
    });

    // Analyze common sequences
    Object.values(sessionFlows).forEach(flow => {
      for (let i = 0; i < flow.length - 1; i++) {
        const sequence = `${flow[i]} → ${flow[i + 1]}`;
        flows[sequence] = (flows[sequence] || 0) + 1;
      }
    });

    return Object.entries(flows)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);
  }

  getConversionMetrics(conversions) {
    const metrics = {
      totalRevenue: 0,
      averageOrderValue: 0,
      conversionsByType: {},
    };

    conversions.forEach(conversion => {
      metrics.totalRevenue += conversion.value || 0;
      metrics.conversionsByType[conversion.type] =
        (metrics.conversionsByType[conversion.type] || 0) + 1;
    });

    metrics.averageOrderValue =
      conversions.length > 0 ? metrics.totalRevenue / conversions.length : 0;

    return metrics;
  }

  getSessionMetrics(sessions) {
    if (sessions.length === 0) return {};

    const durations = sessions.map(s => new Date(s.lastActivity) - new Date(s.startTime));

    return {
      totalSessions: sessions.length,
      averageSessionDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      averageEventsPerSession: sessions.reduce((sum, s) => sum + s.eventCount, 0) / sessions.length,
      bounceRate: (
        (sessions.filter(s => s.eventCount === 1).length / sessions.length) *
        100
      ).toFixed(2),
    };
  }

  async sendWebhookBatch(events) {
    if (!this.config.webhookUrl) return;

    try {
      const fetch = await import('node-fetch');
      await fetch.default(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'analytics_batch',
          events,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Analytics: Webhook batch failed:', error);
    }
  }
}

export default AnalyticsSystem;
