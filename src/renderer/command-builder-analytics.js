/**
 * RinaWarp Terminal - Command Builder Analytics 🧜‍♀️
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Advanced analytics system for tracking command builder usage patterns
 */

class CommandBuilderAnalytics {
  constructor() {
    this.isEnabled = true;
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.startTime = Date.now();
    this.events = [];
    this.commands = new Map();
    this.categories = new Map();
    this.errors = [];

    this.setupEventListeners();
    this.initializeStorage();

    // Batch upload events periodically
    this.uploadInterval = setInterval(() => this.uploadEvents(), 30000); // 30 seconds

    console.log('📊 Command Builder Analytics initialized');
  }

  generateSessionId() {
    return 'cb_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getUserId() {
    let userId = localStorage.getItem('rina_user_id');
    if (!userId) {
      userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
      localStorage.setItem('rina_user_id', userId);
    }
    return userId;
  }

  initializeStorage() {
    // Load existing analytics data
    try {
      const stored = localStorage.getItem('command_builder_analytics');
      if (stored) {
        const data = JSON.parse(stored);
        this.commands = new Map(data.commands || []);
        this.categories = new Map(data.categories || []);
        this.errors = data.errors || [];
      }
    } catch (error) {
      console.warn('Failed to load analytics data:', error);
    }
  }

  saveToStorage() {
    try {
      const data = {
        commands: Array.from(this.commands.entries()),
        categories: Array.from(this.categories.entries()),
        errors: this.errors.slice(-100), // Keep last 100 errors
        lastSaved: Date.now(),
      };
      localStorage.setItem('command_builder_analytics', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save analytics data:', error);
    }
  }

  setupEventListeners() {
    // Track builder open/close
    document.addEventListener('command-builder-opened', event => {
      this.trackEvent('builder_opened', {
        trigger: event.detail?.trigger || 'unknown',
        timestamp: Date.now(),
      });
    });

    document.addEventListener('command-builder-closed', event => {
      this.trackEvent('builder_closed', {
        duration: event.detail?.duration || null,
        timestamp: Date.now(),
      });
    });

    // Track command building
    document.addEventListener('command-built', event => {
      this.trackCommand(event.detail);
    });

    // Track errors
    document.addEventListener('command-builder-error', event => {
      this.trackError(event.detail);
    });

    // Track page visibility for session management
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('session_paused');
        this.uploadEvents(); // Upload before potential page unload
      } else {
        this.trackEvent('session_resumed');
      }
    });

    // Upload events before page unload
    window.addEventListener('beforeunload', () => {
      this.uploadEvents(true); // Synchronous upload
    });
  }

  trackEvent(eventType, data = {}) {
    if (!this.isEnabled) return;

    const event = {
      type: eventType,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      data: {
        ...data,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      },
    };

    this.events.push(event);

    // Log for development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 Analytics Event:', eventType, data);
    }
  }

  trackCommand(commandData) {
    if (!this.isEnabled || !commandData) return;

    const {
      category,
      command,
      options = {},
      executionTime = null,
      success = true,
      finalCommand = '',
    } = commandData;

    // Update command statistics
    const commandKey = `${category}:${command}`;
    const commandStats = this.commands.get(commandKey) || {
      count: 0,
      category,
      command,
      totalExecutionTime: 0,
      errors: 0,
      lastUsed: null,
      popularOptions: new Map(),
    };

    commandStats.count++;
    commandStats.lastUsed = Date.now();

    if (executionTime) {
      commandStats.totalExecutionTime += executionTime;
    }

    if (!success) {
      commandStats.errors++;
    }

    // Track popular options
    Object.entries(options).forEach(([key, value]) => {
      if (value) {
        const optionKey = typeof value === 'boolean' ? key : `${key}:${value}`;
        const optionCount = commandStats.popularOptions.get(optionKey) || 0;
        commandStats.popularOptions.set(optionKey, optionCount + 1);
      }
    });

    this.commands.set(commandKey, commandStats);

    // Update category statistics
    const categoryStats = this.categories.get(category) || {
      name: category,
      count: 0,
      uniqueCommands: new Set(),
      averageExecutionTime: 0,
      lastUsed: null,
    };

    categoryStats.count++;
    categoryStats.uniqueCommands.add(command);
    categoryStats.lastUsed = Date.now();

    this.categories.set(category, categoryStats);

    // Track the event
    this.trackEvent('command_used', {
      category,
      command,
      optionsCount: Object.keys(options).length,
      commandLength: finalCommand.length,
      executionTime,
      success,
    });

    this.saveToStorage();
  }

  trackError(errorData) {
    if (!this.isEnabled) return;

    const error = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      ...errorData,
    };

    this.errors.push(error);

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    this.trackEvent('error_occurred', errorData);
    this.saveToStorage();
  }

  // Get analytics insights
  getInsights() {
    const totalCommands = Array.from(this.commands.values()).reduce(
      (sum, cmd) => sum + cmd.count,
      0
    );
    const totalCategories = this.categories.size;
    const totalErrors = this.errors.length;

    // Most popular commands
    const popularCommands = Array.from(this.commands.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([key, stats]) => ({
        command: key,
        count: stats.count,
        averageTime: stats.totalExecutionTime / stats.count || 0,
        errorRate: (stats.errors / stats.count) * 100 || 0,
      }));

    // Most popular categories
    const popularCategories = Array.from(this.categories.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([key, stats]) => ({
        category: key,
        count: stats.count,
        uniqueCommands: stats.uniqueCommands.size,
      }));

    // Recent activity
    const recentActivity = this.events.filter(
      event => Date.now() - event.timestamp < 24 * 60 * 60 * 1000
    ).length; // Last 24 hours

    // Error patterns
    const errorPatterns = this.errors.reduce((patterns, error) => {
      const key = error.type || 'unknown';
      patterns[key] = (patterns[key] || 0) + 1;
      return patterns;
    }, {});

    return {
      overview: {
        totalCommands,
        totalCategories,
        totalErrors,
        recentActivity,
        sessionDuration: Date.now() - this.startTime,
      },
      popularCommands,
      popularCategories,
      errorPatterns,
      userProfile: {
        userId: this.userId,
        experienceLevel: this.calculateExperienceLevel(),
        preferredCategories: this.getPreferredCategories(),
        averageSessionDuration: this.getAverageSessionDuration(),
      },
    };
  }

  calculateExperienceLevel() {
    const totalCommands = Array.from(this.commands.values()).reduce(
      (sum, cmd) => sum + cmd.count,
      0
    );

    if (totalCommands < 10) return 'beginner';
    if (totalCommands < 50) return 'intermediate';
    if (totalCommands < 200) return 'advanced';
    return 'expert';
  }

  getPreferredCategories() {
    return Array.from(this.categories.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([category]) => category);
  }

  getAverageSessionDuration() {
    // This would typically come from stored session data
    return Math.round((Date.now() - this.startTime) / 1000 / 60); // Minutes
  }

  // Export analytics data
  exportData() {
    return {
      insights: this.getInsights(),
      rawData: {
        events: this.events.slice(-1000), // Last 1000 events
        commands: Object.fromEntries(this.commands),
        categories: Object.fromEntries(this.categories),
        errors: this.errors,
      },
      metadata: {
        exportedAt: new Date().toISOString(),
        sessionId: this.sessionId,
        userId: this.userId,
      },
    };
  }

  // Upload events to analytics service
  async uploadEvents(synchronous = false) {
    if (!this.isEnabled || this.events.length === 0) return;

    const eventsToUpload = [...this.events];
    this.events = []; // Clear events after copying

    const payload = {
      sessionId: this.sessionId,
      userId: this.userId,
      events: eventsToUpload,
      insights: this.getInsights(),
      timestamp: new Date().toISOString(),
    };

    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RinaWarp-Terminal-CommandBuilder/1.0',
        },
        body: JSON.stringify(payload),
      };

      let response;
      if (synchronous && navigator.sendBeacon) {
        // Use sendBeacon for synchronous uploads (page unload)
        navigator.sendBeacon('/api/analytics/command-builder', options.body);
        return;
      } else {
        response = await fetch('/api/analytics/command-builder', options);
      }

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      console.log('📊 Analytics uploaded successfully');
    } catch (error) {
      console.warn('📊 Analytics upload failed:', error);

      // Re-add events to queue for retry
      this.events.unshift(...eventsToUpload);

      // Keep queue manageable
      if (this.events.length > 500) {
        this.events = this.events.slice(-500);
      }
    }
  }

  // Generate analytics dashboard data
  getDashboardData() {
    const insights = this.getInsights();

    return {
      ...insights,
      chartData: {
        commandUsage: this.getCommandUsageChart(),
        categoryDistribution: this.getCategoryDistributionChart(),
        timelineActivity: this.getTimelineActivityChart(),
        errorRates: this.getErrorRatesChart(),
      },
    };
  }

  getCommandUsageChart() {
    return Array.from(this.commands.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 15)
      .map(([command, stats]) => ({
        name: command.split(':')[1], // Just the command name
        count: stats.count,
        category: stats.category,
      }));
  }

  getCategoryDistributionChart() {
    return Array.from(this.categories.entries()).map(([category, stats]) => ({
      name: category,
      value: stats.count,
      percentage: Math.round(
        (stats.count / Array.from(this.categories.values()).reduce((sum, c) => sum + c.count, 0)) *
          100
      ),
    }));
  }

  getTimelineActivityChart() {
    const now = Date.now();
    const hours = [];

    // Generate 24 hour buckets
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - i * 60 * 60 * 1000;
      const hourEnd = hourStart + 60 * 60 * 1000;

      const eventCount = this.events.filter(
        event => event.timestamp >= hourStart && event.timestamp < hourEnd
      ).length;

      hours.push({
        hour: new Date(hourStart).getHours(),
        events: eventCount,
        timestamp: hourStart,
      });
    }

    return hours;
  }

  getErrorRatesChart() {
    return Array.from(this.commands.entries())
      .filter(([, stats]) => stats.count > 0)
      .map(([command, stats]) => ({
        name: command.split(':')[1],
        errorRate: Math.round((stats.errors / stats.count) * 100),
        totalUses: stats.count,
        errors: stats.errors,
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10);
  }

  // Cleanup
  destroy() {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
    }
    this.uploadEvents(true);
    this.isEnabled = false;
  }
}

// Initialize analytics if enabled
let commandBuilderAnalytics = null;

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Check if analytics should be enabled (respect user privacy settings)
    const analyticsEnabled = localStorage.getItem('rina_analytics_enabled') !== 'false';

    if (analyticsEnabled) {
      commandBuilderAnalytics = new CommandBuilderAnalytics();
      window.commandBuilderAnalytics = commandBuilderAnalytics;

      console.log('📊 Command Builder Analytics ready');
    } else {
      console.log('📊 Analytics disabled by user preference');
    }
  });
}

export default CommandBuilderAnalytics;
