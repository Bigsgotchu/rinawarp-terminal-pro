/**
 * Google Analytics Measurement Protocol Integration
 * For sending analytics data from Electron applications to Google Analytics
 */

import https from 'https';
import { URLSearchParams } from 'url';
import { randomUUID } from 'crypto';

class GoogleAnalyticsIntegration {
  constructor(trackingId, clientId = null) {
    this.trackingId = trackingId;
    this.clientId = clientId || this.generateClientId();
    this.endpoint = 'https://www.google-analytics.com/collect';
    this.debug = false;
    this.enabled = true;
  }

  /**
   * Generate a unique client ID
   */
  generateClientId() {
    return randomUUID();
  }

  /**
   * Track a page view
   */
  async trackPageView(page, title = null, hostname = null) {
    const params = {
      v: '1', // Version
      tid: this.trackingId, // Tracking ID
      cid: this.clientId, // Client ID
      t: 'pageview', // Hit Type
      dp: page, // Document Path
      dt: title || page, // Document Title
      dh: hostname || 'electron-app', // Document Hostname
    };

    return this.sendHit(params);
  }

  /**
   * Track an event
   */
  async trackEvent(category, action, label = null, value = null) {
    const params = {
      v: '1', // Version
      tid: this.trackingId, // Tracking ID
      cid: this.clientId, // Client ID
      t: 'event', // Hit Type
      ec: category, // Event Category
      ea: action, // Event Action
      el: label, // Event Label
      ev: value, // Event Value
    };

    return this.sendHit(params);
  }

  /**
   * Track a timing event
   */
  async trackTiming(category, variable, time, label = null) {
    const params = {
      v: '1', // Version
      tid: this.trackingId, // Tracking ID
      cid: this.clientId, // Client ID
      t: 'timing', // Hit Type
      utc: category, // User Timing Category
      utv: variable, // User Timing Variable
      utt: time, // User Timing Time
      utl: label, // User Timing Label
    };

    return this.sendHit(params);
  }

  /**
   * Track an exception/error
   */
  async trackException(description, fatal = false) {
    const params = {
      v: '1', // Version
      tid: this.trackingId, // Tracking ID
      cid: this.clientId, // Client ID
      t: 'exception', // Hit Type
      exd: description, // Exception Description
      exf: fatal ? '1' : '0', // Exception Fatal
    };

    return this.sendHit(params);
  }

  /**
   * Track a social interaction
   */
  async trackSocial(network, action, target) {
    const params = {
      v: '1', // Version
      tid: this.trackingId, // Tracking ID
      cid: this.clientId, // Client ID
      t: 'social', // Hit Type
      sn: network, // Social Network
      sa: action, // Social Action
      st: target, // Social Target
    };

    return this.sendHit(params);
  }

  /**
   * Set custom dimensions
   */
  setCustomDimension(index, value) {
    this.customDimensions = this.customDimensions || {};
    this.customDimensions[`cd${index}`] = value;
  }

  /**
   * Set custom metrics
   */
  setCustomMetric(index, value) {
    this.customMetrics = this.customMetrics || {};
    this.customMetrics[`cm${index}`] = value;
  }

  /**
   * Send a hit to Google Analytics
   */
  async sendHit(params) {
    if (!this.enabled) {
      return Promise.resolve();
    }

    // Add custom dimensions and metrics
    if (this.customDimensions) {
      Object.assign(params, this.customDimensions);
    }
    if (this.customMetrics) {
      Object.assign(params, this.customMetrics);
    }

    const postData = new URLSearchParams(params).toString();

    if (this.debug) {
      console.log('GA Hit:', params);
    }

    return new Promise((resolve, reject) => {
      const req = https.request(
        this.endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'RinaWarp Terminal/1.0 (Electron)',
          },
        },
        res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          });
        }
      );

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * Enable debug mode
   */
  enableDebug() {
    this.debug = true;
  }

  /**
   * Disable debug mode
   */
  disableDebug() {
    this.debug = false;
  }

  /**
   * Enable analytics
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable analytics
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Set client ID
   */
  setClientId(clientId) {
    this.clientId = clientId;
  }

  /**
   * Get client ID
   */
  getClientId() {
    return this.clientId;
  }
}

export default GoogleAnalyticsIntegration;
