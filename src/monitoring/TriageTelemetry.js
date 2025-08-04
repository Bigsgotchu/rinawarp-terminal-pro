/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 4 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Telemetry module for the Error Triage System
 * Handles anonymous data collection, sanitization, and batched uploads
 */

const fs = require('node:fs').promises;
const path = require('node:path');
const crypto = require('node:crypto');

class TriageTelemetry {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled ?? false,
      endpoint: config.endpoint ?? 'https://api.error-triage.example.com/telemetry',
      batchSize: config.batchSize ?? 50,
      batchIntervalMs: config.batchIntervalMs ?? 60000, // 1 minute
      cachePath: config.cachePath ?? path.join(process.cwd(), '.error-triage-cache'),
      sensitivePatterns: config.sensitivePatterns ?? [
        /password/i,
        /secret/i,
        /token/i,
        /key/i,
        /auth/i,
        /credential/i,
        /\/home\/[\w-]+\//i, // User home directories
        /C:\\Users\\[\w-]+\\/i, // Windows user directories
      ],
    };

    this.pendingData = [];
    this.batchTimer = null;
    this.initialized = false;
  }

  /**
   * Initialize the telemetry system
   */
  async initialize() {
    if (this.initialized) return;

    // Ensure cache directory exists
    await fs.mkdir(this.config.cachePath, { recursive: true });

    // Load any cached data from disk
    await this.loadCache();

    // Start batch processing timer if enabled
    if (this.config.enabled) {
      this.startBatchProcessing();
    }

    this.initialized = true;
  }

  /**
   * Start batch processing timer
   */
  startBatchProcessing() {
    if (this.batchTimer) return;

    this.batchTimer = setInterval(() => this.processBatch(), this.config.batchIntervalMs);
  }

  /**
   * Stop batch processing timer
   */
  stopBatchProcessing() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Process and anonymize a triage snapshot
   * @param {Object} snapshot The triage data snapshot
   * @returns {Object} Anonymized snapshot
   */
  anonymizeSnapshot(snapshot) {
    // Create a deep copy to avoid modifying original data
    const anonymized = JSON.parse(JSON.stringify(snapshot));

    // Generate anonymous session ID if not present
    if (!anonymized.sessionId) {
      anonymized.sessionId = crypto.randomUUID();
    }

    // Remove any PII or sensitive information
    this.sanitizeObject(anonymized);

    // Add collection timestamp
    anonymized.collectedAt = new Date().toISOString();

    return anonymized;
  }

  /**
   * Recursively sanitize an object to remove sensitive information
   * @param {Object} obj Object to sanitize
   */
  sanitizeObject(obj) {
    for (const [key, value] of Object.entries(obj)) {
      // Check if key matches sensitive patterns
      const isSensitive = this.config.sensitivePatterns.some(
        pattern => pattern.test(key) || (typeof value === 'string' && pattern.test(value))
      );

      if (isSensitive) {
        obj[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        this.sanitizeObject(value);
      }
    }
  }

  /**
   * Add a triage snapshot to the telemetry queue
   * @param {Object} snapshot The triage data to collect
   */
  async collectSnapshot(snapshot) {
    if (!this.config.enabled) return;

    const anonymizedData = this.anonymizeSnapshot(snapshot);
    this.pendingData.push(anonymizedData);

    // Save to cache file
    await this.saveToCache(anonymizedData);

    // Process immediately if batch size reached
    if (this.pendingData.length >= this.config.batchSize) {
      await this.processBatch();
    }
  }

  /**
   * Save data to local cache
   * @param {Object} data Data to cache
   */
  async saveToCache(data) {
    const cacheFile = path.join(this.config.cachePath, `${Date.now()}.json`);
    await fs.writeFile(cacheFile, JSON.stringify(data));
  }

  /**
   * Load cached data from disk
   */
  async loadCache() {
    try {
      const files = await fs.readdir(this.config.cachePath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.config.cachePath, file);
        const content = await fs.readFile(filePath, 'utf8');

        try {
          const data = JSON.parse(content);
          this.pendingData.push(data);
        } catch (err) {
          console.error(`Failed to parse cached telemetry data: ${file}`);
        }

        // Remove the processed cache file
        await fs.unlink(filePath);
      }
    } catch (err) {
      console.error('Failed to load telemetry cache:', err);
    }
  }

  /**
   * Process a batch of telemetry data
   */
  async processBatch() {
    if (!this.config.enabled || this.pendingData.length === 0) return;

    const batch = this.pendingData.splice(0, this.config.batchSize);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        // On failure, add back to pending queue and cache
        this.pendingData.unshift(...batch);
        for (const data of batch) {
          await this.saveToCache(data);
        }
        throw new Error(new Error(new Error(`Failed to upload telemetry: ${response.statusText}`)));
      }
    } catch (err) {
      console.error('Telemetry upload failed:', err);
      // Data is already cached and back in queue, will retry on next batch
    }
  }

  /**
   * Register event listeners with the ErrorTriageSystem
   * @param {ErrorTriageSystem} triageSystem The triage system instance
   */
  registerEvents(triageSystem) {
    // Collect telemetry on error triage completion
    triageSystem.on('triageComplete', triageResult => {
      this.collectSnapshot({
        type: 'triage',
        result: triageResult,
        timestamp: new Date().toISOString(),
      });
    });

    // Collect telemetry on error resolution
    triageSystem.on('errorResolved', resolution => {
      this.collectSnapshot({
        type: 'resolution',
        resolution: resolution,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Clean up resources
   */
  async dispose() {
    this.stopBatchProcessing();

    // Process any remaining data
    if (this.pendingData.length > 0) {
      await this.processBatch();
    }
  }
}

module.exports = TriageTelemetry;
