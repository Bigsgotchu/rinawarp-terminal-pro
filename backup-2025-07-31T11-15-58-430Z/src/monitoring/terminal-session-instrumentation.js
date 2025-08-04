/**
 * Terminal Session Metrics Instrumentation
 * Integrates with the SessionManager to collect terminal-specific metrics
 */

import metricsService from './metrics-service.js';

export class TerminalSessionInstrumentation {
  constructor() {
    this.sessionStartTimes = new Map();
    this.commandCounters = new Map();
    this.commandRateTrackers = new Map();
    this.metricsInterval = null;
    this.metricsCollectionInterval = 60000; // 1 minute

    this.startMetricsCollection();
  }

  /**
   * Start periodic metrics collection
   */
  startMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(() => {
      this.collectAndReportMetrics();
    }, this.metricsCollectionInterval);
  }

  /**
   * Stop periodic metrics collection
   */
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Instrument session start
   */
  async onSessionStart(sessionId, _sessionType = 'default') {
    this.sessionStartTimes.set(sessionId, Date.now());
    this.commandCounters.set(sessionId, 0);
    this.commandRateTrackers.set(sessionId, {
      commandCount: 0,
      startTime: Date.now(),
    });

    // Record session start event
    await metricsService.recordSessionStart(sessionId);

    console.log(`📊 Session instrumentation started for session: ${sessionId}`);
  }

  /**
   * Instrument session end
   */
  async onSessionEnd(sessionId, sessionType = 'default') {
    const startTime = this.sessionStartTimes.get(sessionId);
    if (startTime) {
      const durationMs = Date.now() - startTime;
      const durationSeconds = Math.floor(durationMs / 1000);

      // Record session duration
      await metricsService.recordTerminalSessionDuration(sessionId, durationSeconds, sessionType);

      // Record session end event
      await metricsService.recordSessionEnd(sessionId);

      // Clean up tracking data
      this.sessionStartTimes.delete(sessionId);
      this.commandCounters.delete(sessionId);
      this.commandRateTrackers.delete(sessionId);

        `📊 Session instrumentation ended for session: ${sessionId}, duration: ${durationSeconds}s`
      );
    }
  }

  /**
   * Instrument command execution
   */
  async onCommandExecuted(sessionId, command, success = true, terminalId = null) {
    // Update command counter
    const currentCount = this.commandCounters.get(sessionId) || 0;
    this.commandCounters.set(sessionId, currentCount + 1);

    // Update rate tracker
    const rateTracker = this.commandRateTrackers.get(sessionId);
    if (rateTracker) {
      rateTracker.commandCount++;
    }

    // Record command execution (legacy)
    await metricsService.recordCommandExecution(command, success);

    // Record command execution error if failed
    if (!success) {
      await metricsService.recordCommandExecutionError(
        command,
        'execution_failed',
        'Command execution failed',
        terminalId
      );
    }

    console.log(`📊 Command executed in session ${sessionId}: ${command} (success: ${success})`);
  }

  /**
   * Instrument command error
   */
  async onCommandError(sessionId, command, errorType, errorMessage, terminalId = null) {
    await metricsService.recordCommandExecutionError(command, errorType, errorMessage, terminalId);
  }

  /**
   * Collect and report periodic metrics
   */
  async collectAndReportMetrics() {
    try {
      // Get active session count
      const activeSessionCount = this.sessionStartTimes.size;
      const activeSessionIds = Array.from(this.sessionStartTimes.keys());

      // Record active sessions
      await metricsService.recordActiveTerminalSessions(activeSessionCount, activeSessionIds);

      // Calculate and record command rates
      for (const [sessionId, rateTracker] of this.commandRateTrackers) {
        const elapsedMs = Date.now() - rateTracker.startTime;
        const elapsedMinutes = elapsedMs / (1000 * 60);

        if (elapsedMinutes > 0) {
          const commandsPerMinute = rateTracker.commandCount / elapsedMinutes;
          await metricsService.recordCommandsPerMinute(commandsPerMinute, sessionId);
        }
      }

    } catch (error) {
      console.error('📊 Error collecting periodic metrics:', error);
    }
  }

  /**
   * Get current session metrics
   */
  getSessionMetrics(sessionId) {
    const startTime = this.sessionStartTimes.get(sessionId);
    const commandCount = this.commandCounters.get(sessionId) || 0;
    const rateTracker = this.commandRateTrackers.get(sessionId);

    if (!startTime || !rateTracker) {
      return null;
    }

    const elapsedMs = Date.now() - startTime;
    const elapsedMinutes = elapsedMs / (1000 * 60);
    const commandsPerMinute = elapsedMinutes > 0 ? commandCount / elapsedMinutes : 0;

    return {
      sessionId,
      startTime,
      elapsedMs,
      commandCount,
      commandsPerMinute,
      isActive: true,
    };
  }

  /**
   * Get all session metrics
   */
  getAllSessionMetrics() {
    const metrics = [];

    for (const sessionId of this.sessionStartTimes.keys()) {
      const sessionMetrics = this.getSessionMetrics(sessionId);
      if (sessionMetrics) {
        metrics.push(sessionMetrics);
      }
    }

    return metrics;
  }

  /**
   * Get instrumentation status
   */
  getStatus() {
    return {
      isActive: this.metricsInterval !== null,
      activeSessions: this.sessionStartTimes.size,
      collectionInterval: this.metricsCollectionInterval,
      trackedSessions: Array.from(this.sessionStartTimes.keys()),
    };
  }
}

// Create singleton instance
const terminalSessionInstrumentation = new TerminalSessionInstrumentation();

export default terminalSessionInstrumentation;
