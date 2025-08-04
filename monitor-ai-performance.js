#!/usr/bin/env node

import { unifiedAIClient } from './src/ai-providers/unified-ai-client.js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

class PerformanceMonitor {
  constructor() {
    this.logFile = './ai-performance-log.json';
    this.logData = this.loadLogData();
  }

  loadLogData() {
    if (fs.existsSync(this.logFile)) {
      const data = fs.readFileSync(this.logFile, 'utf8');
      return JSON.parse(data);
    } else {
      return { logs: [], summary: {} };
    }
  }

  saveLogData() {
    fs.writeFileSync(this.logFile, JSON.stringify(this.logData, null, 2));
  }

  async runPerformanceCheck() {
    await unifiedAIClient.initialize();

    const providersToTest = ['openai', 'anthropic'];

    for (const providerId of providersToTest) {
      await this.measurePerformance(providerId);
    }

    this.generateSummary();
    this.saveLogData();

  }

  async measurePerformance(providerId) {
    try {
      const startTime = Date.now();
      const model =
        providerId === 'openai'
          ? 'gpt-3.5-turbo'
          : unifiedAIClient.config.providers[providerId].models[0];
      await unifiedAIClient.switchProvider(providerId, model);

      await unifiedAIClient.chat('Short confirmation message.');
      const latency = Date.now() - startTime;

      this.logData.logs.push({
        timestamp: new Date().toISOString(),
        provider: providerId,
        latency,
        success: true,
      });
    } catch (error) {
      this.logData.logs.push({
        timestamp: new Date().toISOString(),
        provider: providerId,
        error: error.message,
        success: false,
      });
    }
  }

  generateSummary() {
    const summary = {};
    for (const log of this.logData.logs) {
      if (!summary[log.provider]) {
        summary[log.provider] = { totalRequests: 0, successful: 0, totalLatency: 0 };
      }
      summary[log.provider].totalRequests++;
      if (log.success) {
        summary[log.provider].successful++;
        summary[log.provider].totalLatency += log.latency;
      }
    }

    this.logData.summary.lastUpdated = new Date().toISOString();
    this.logData.summary.providerPerformance = Object.entries(summary).map(([provider, data]) => ({
      provider,
      ...data,
      successRate: `${((data.successful / data.totalRequests) * 100).toFixed(2)}%`,
      averageLatency:
        data.successful > 0 ? `${(data.totalLatency / data.successful).toFixed(2)}ms` : 'N/A',
    }));
  }
}

const monitor = new PerformanceMonitor();
monitor.runPerformanceCheck();
