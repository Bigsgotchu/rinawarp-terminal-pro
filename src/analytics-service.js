import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { analytics } from './firebase-config.js';
import { authService } from './auth-service.js';

class AnalyticsService {
  constructor() {
    this.isAnalyticsEnabled = true;
    this.sessionStartTime = Date.now();

    // Listen for auth state changes to set user ID
    authService.onAuthStateChange(user => {
      if (user && this.isAnalyticsEnabled) {
        this.setUser(user.uid);
        this.setUserProperties({
          user_type: 'authenticated',
          sign_up_method: user.providerData[0]?.providerId || 'unknown',
        });
      }
    });
  }

  // Core Analytics Methods
  setUser(userId) {
    try {
      if (this.isAnalyticsEnabled && analytics) {
        setUserId(analytics, userId);
        console.log('Analytics: User ID set');
      }
    } catch (error) {
      console.error('Error setting user ID:', error);
    }
  }

  setUserProperties(properties) {
    try {
      if (this.isAnalyticsEnabled && analytics) {
        setUserProperties(analytics, properties);
        console.log('Analytics: User properties set', properties);
      }
    } catch (error) {
      console.error('Error setting user properties:', error);
    }
  }

  trackEvent(eventName, parameters = {}) {
    try {
      if (this.isAnalyticsEnabled && analytics) {
        const enrichedParams = {
          ...parameters,
          timestamp: Date.now(),
          session_duration: Date.now() - this.sessionStartTime,
        };

        logEvent(analytics, eventName, enrichedParams);
        console.log(`Analytics: Event tracked - ${eventName}`, enrichedParams);
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  // Authentication Events
  trackSignUp(method = 'email') {
    this.trackEvent('sign_up', {
      method: method,
    });
  }

  trackLogin(method = 'email') {
    this.trackEvent('login', {
      method: method,
    });
  }

  trackLogout() {
    this.trackEvent('logout', {
      session_duration: Date.now() - this.sessionStartTime,
    });
  }

  // Terminal Events
  trackTerminalSession(action, sessionData = {}) {
    this.trackEvent('terminal_session', {
      action: action, // 'create', 'save', 'load', 'delete'
      session_id: sessionData.sessionId,
      session_title: sessionData.title,
      command_count: sessionData.commands?.length || 0,
      theme: sessionData.theme || 'default',
    });
  }

  trackCommandExecution(commandData) {
    this.trackEvent('command_executed', {
      command_type: this.getCommandType(commandData.command),
      command_length: commandData.command?.length || 0,
      execution_time: commandData.executionTime || 0,
      exit_code: commandData.exitCode || 0,
      has_output: Boolean(commandData.output),
      working_directory: commandData.workingDirectory,
    });
  }

  trackTerminalFeature(feature, action = 'use') {
    this.trackEvent('terminal_feature', {
      feature: feature, // 'copy', 'paste', 'clear', 'search', 'theme_change', etc.
      action: action,
    });
  }

  // File Operations Events
  trackFileOperation(operation, fileData = {}) {
    this.trackEvent('file_operation', {
      operation: operation, // 'upload', 'download', 'delete', 'view'
      file_type: fileData.type,
      file_size: fileData.size,
      file_category: this.getFileCategory(fileData.type),
      success: fileData.success !== false,
    });
  }

  trackFileUpload(fileData, uploadResult) {
    this.trackEvent('file_upload', {
      file_type: fileData.type,
      file_size: fileData.size,
      file_category: this.getFileCategory(fileData.type),
      upload_duration: uploadResult.duration || 0,
      success: uploadResult.success,
    });
  }

  trackFileDownload(fileData) {
    this.trackEvent('file_download', {
      file_type: fileData.type,
      file_size: fileData.size,
      file_category: this.getFileCategory(fileData.type),
    });
  }

  // Settings and Configuration Events
  trackSettingsChange(setting, newValue, oldValue = null) {
    this.trackEvent('settings_changed', {
      setting: setting,
      new_value: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue),
      old_value: oldValue
        ? typeof oldValue === 'object'
          ? JSON.stringify(oldValue)
          : String(oldValue)
        : null,
    });
  }

  trackThemeChange(newTheme, oldTheme = null) {
    this.trackEvent('theme_changed', {
      new_theme: newTheme,
      old_theme: oldTheme,
    });
  }

  // User Engagement Events
  trackPageView(pageName, additionalParams = {}) {
    this.trackEvent('page_view', {
      page_title: pageName,
      page_location: window.location.href,
      ...additionalParams,
    });
  }

  trackUserEngagement(action, element = null) {
    this.trackEvent('user_engagement', {
      engagement_type: action, // 'click', 'scroll', 'hover', 'focus'
      element: element,
      page_title: document.title,
    });
  }

  trackSearch(searchTerm, results = null) {
    this.trackEvent('search', {
      search_term: searchTerm,
      result_count: results?.length || 0,
    });
  }

  // Error Tracking
  trackError(error, context = '') {
    this.trackEvent('error_occurred', {
      error_message: error.message || String(error),
      error_context: context,
      error_stack: error.stack || '',
      page_title: document.title,
      user_agent: navigator.userAgent,
    });
  }

  trackPerformance(metric, value, context = '') {
    this.trackEvent('performance_metric', {
      metric_name: metric,
      metric_value: value,
      context: context,
    });
  }

  // Business Events
  trackSubscription(action, plan = null) {
    this.trackEvent('subscription', {
      action: action, // 'start_trial', 'subscribe', 'upgrade', 'downgrade', 'cancel'
      plan: plan,
      value: this.getPlanValue(plan),
    });
  }

  trackFeatureUsage(feature, usage_type = 'accessed') {
    this.trackEvent('feature_usage', {
      feature_name: feature,
      usage_type: usage_type,
      user_type: authService.isAuthenticated() ? 'authenticated' : 'anonymous',
    });
  }

  // Session Management
  startSession() {
    this.sessionStartTime = Date.now();
    this.trackEvent('session_start', {
      platform: this.getPlatform(),
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    });
  }

  endSession() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    this.trackEvent('session_end', {
      session_duration: sessionDuration,
    });
  }

  // Utility Methods
  getCommandType(command) {
    if (!command) return 'unknown';

    const cmd = command.trim().split(' ')[0].toLowerCase();
    const commandTypes = {
      ls: 'navigation',
      cd: 'navigation',
      pwd: 'navigation',
      mkdir: 'file_system',
      rm: 'file_system',
      cp: 'file_system',
      mv: 'file_system',
      git: 'version_control',
      npm: 'package_manager',
      node: 'runtime',
      python: 'runtime',
      docker: 'container',
      ssh: 'network',
      curl: 'network',
      ping: 'network',
    };

    return commandTypes[cmd] || 'other';
  }

  getFileCategory(fileType) {
    if (!fileType) return 'unknown';

    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType.startsWith('text/')) return 'text';
    if (fileType.includes('json')) return 'config';
    if (fileType.includes('zip') || fileType.includes('tar')) return 'archive';
    if (fileType.includes('pdf')) return 'document';

    return 'other';
  }

  getPlatform() {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) return 'windows';
    if (platform.includes('mac')) return 'macos';
    if (platform.includes('linux')) return 'linux';
    return 'unknown';
  }

  getPlanValue(plan) {
    const planValues = {
      free: 0,
      basic: 9.99,
      pro: 19.99,
      enterprise: 49.99,
    };
    return planValues[plan] || 0;
  }

  // Configuration Methods
  enableAnalytics() {
    this.isAnalyticsEnabled = true;
    console.log('Analytics enabled');
  }

  disableAnalytics() {
    this.isAnalyticsEnabled = false;
    console.log('Analytics disabled');
  }

  isEnabled() {
    return this.isAnalyticsEnabled;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
