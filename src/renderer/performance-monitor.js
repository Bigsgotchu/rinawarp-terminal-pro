/**
 * RinaWarp Terminal - Performance Monitor
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      cpu: 80, // CPU usage percentage
      memory: 85, // Memory usage percentage
      execution: 5000, // Command execution time in ms
      io: 1000, // I/O operations per second
    };
    this.historicalData = [];
    this.activeCommands = new Map();
    this.optimizationCache = new Map();
    this.init();
  }

  async init() {
    this.startSystemMonitoring();
    this.loadOptimizationPatterns();
    console.log('📊 Performance Monitor initialized');
  }

  async trackCommandStart(command, context) {
    const commandId = this.generateCommandId();
    const startMetrics = {
      id: commandId,
      command: command,
      startTime: Date.now(),
      startCpu: await this.getCpuUsage(),
      startMemory: await this.getMemoryUsage(),
      workingDir: context.workingDir,
      context: context,
    };

    this.activeCommands.set(commandId, startMetrics);
    return commandId;
  }

  async trackCommandEnd(commandId, result) {
    const startMetrics = this.activeCommands.get(commandId);
    if (!startMetrics) return null;

    const endTime = Date.now();
    const executionTime = endTime - startMetrics.startTime;
    const endCpu = await this.getCpuUsage();
    const endMemory = await this.getMemoryUsage();

    const performance = {
      ...startMetrics,
      endTime: endTime,
      executionTime: executionTime,
      endCpu: endCpu,
      endMemory: endMemory,
      cpuDelta: endCpu - startMetrics.startCpu,
      memoryDelta: endMemory - startMetrics.startMemory,
      result: result,
      success: result.exitCode === 0,
    };

    this.activeCommands.delete(commandId);
    this.storeMetrics(performance);
    await this.analyzePerformance(performance);

    return performance;
  }

  async getSystemHealth() {
    const health = {
      timestamp: Date.now(),
      cpu: {
        usage: await this.getCpuUsage(),
        cores: navigator.hardwareConcurrency || 4,
        loadAverage: await this.getLoadAverage(),
      },
      memory: {
        usage: await this.getMemoryUsage(),
        total: await this.getTotalMemory(),
        available: await this.getAvailableMemory(),
      },
      disk: {
        usage: await this.getDiskUsage(),
        readSpeed: await this.getDiskReadSpeed(),
        writeSpeed: await this.getDiskWriteSpeed(),
      },
      network: {
        upload: await this.getNetworkUpload(),
        download: await this.getNetworkDownload(),
        latency: await this.getNetworkLatency(),
      },
      terminal: {
        activeSessions: this.activeCommands.size,
        totalCommands: this.metrics.size,
        averageResponseTime: this.getAverageResponseTime(),
      },
    };

    return health;
  }

  async analyzePerformance(performance) {
    const optimizations = [];
    const warnings = [];

    // Execution time analysis
    if (performance.executionTime > this.thresholds.execution) {
      optimizations.push({
        type: 'slow_execution',
        message: `Command took ${performance.executionTime}ms to execute`,
        suggestions: await this.getExecutionOptimizations(performance.command),
        severity: 'medium',
      });
    }

    // CPU usage analysis
    if (performance.cpuDelta > this.thresholds.cpu) {
      warnings.push({
        type: 'high_cpu',
        message: `Command consumed ${performance.cpuDelta}% CPU`,
        suggestions: await this.getCpuOptimizations(performance.command),
        severity: 'high',
      });
    }

    // Memory usage analysis
    if (performance.memoryDelta > this.thresholds.memory) {
      warnings.push({
        type: 'high_memory',
        message: `Command used ${performance.memoryDelta}MB memory`,
        suggestions: await this.getMemoryOptimizations(performance.command),
        severity: 'high',
      });
    }

    // Check for optimization patterns
    const patternOptimizations = await this.checkOptimizationPatterns(performance.command);
    optimizations.push(...patternOptimizations);

    if (optimizations.length > 0 || warnings.length > 0) {
      this.showPerformanceInsights({
        command: performance.command,
        optimizations: optimizations,
        warnings: warnings,
        metrics: performance,
      });
    }
  }

  async predictResourceUsage(command, context) {
    const prediction = {
      estimatedTime: 0,
      estimatedCpu: 0,
      estimatedMemory: 0,
      confidence: 0,
      warnings: [],
    };

    // Find similar commands in history
    const similarCommands = this.findSimilarCommands(command);

    if (similarCommands.length > 0) {
      const avgMetrics = this.calculateAverageMetrics(similarCommands);
      prediction.estimatedTime = avgMetrics.executionTime;
      prediction.estimatedCpu = avgMetrics.cpuDelta;
      prediction.estimatedMemory = avgMetrics.memoryDelta;
      prediction.confidence = Math.min(0.9, similarCommands.length / 10);
    }

    // Check for resource-intensive patterns
    const resourceWarnings = await this.checkResourcePatterns(command);
    prediction.warnings.push(...resourceWarnings);

    return prediction;
  }

  getPerformanceAnalytics(timeRange = '24h') {
    const now = Date.now();
    const timeMs = this.parseTimeRange(timeRange);
    const startTime = now - timeMs;

    const relevantMetrics = this.historicalData.filter(metric => metric.startTime >= startTime);

    const analytics = {
      totalCommands: relevantMetrics.length,
      averageExecutionTime: this.calculateAverage(relevantMetrics, 'executionTime'),
      slowestCommands: this.getSlowestCommands(relevantMetrics, 10),
      fastestCommands: this.getFastestCommands(relevantMetrics, 10),
      resourceUsage: {
        avgCpu: this.calculateAverage(relevantMetrics, 'cpuDelta'),
        avgMemory: this.calculateAverage(relevantMetrics, 'memoryDelta'),
        peakCpu: Math.max(...relevantMetrics.map(m => m.cpuDelta)),
        peakMemory: Math.max(...relevantMetrics.map(m => m.memoryDelta)),
      },
      trends: this.calculateTrends(relevantMetrics),
      optimizationImpact: this.calculateOptimizationImpact(relevantMetrics),
    };

    return analytics;
  }

  async optimizeCommand(command, context) {
    // Check cache first
    const cacheKey = this.generateCacheKey(command, context);
    if (this.optimizationCache.has(cacheKey)) {
      return this.optimizationCache.get(cacheKey);
    }

    const optimizations = {
      original: command,
      optimized: command,
      improvements: [],
      estimatedSpeedup: 1.0,
    };

    // Apply various optimization strategies
    optimizations.optimized = await this.applyParallelization(optimizations.optimized);
    optimizations.optimized = await this.applyCaching(optimizations.optimized);
    optimizations.optimized = await this.applyResourceOptimization(optimizations.optimized);
    optimizations.optimized = await this.applyPathOptimization(optimizations.optimized, context);

    // Calculate estimated speedup
    optimizations.estimatedSpeedup = await this.calculateSpeedup(command, optimizations.optimized);

    // Cache the result
    this.optimizationCache.set(cacheKey, optimizations);

    return optimizations;
  }

  startSystemMonitoring() {
    // Monitor system resources every second
    setInterval(async () => {
      const health = await this.getSystemHealth();
      this.checkResourceThresholds(health);
      this.updateResourceGraphs(health);
    }, 1000);

    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000);
  }

  checkResourceThresholds(health) {
    const alerts = [];

    if (health.cpu.usage > this.thresholds.cpu) {
      alerts.push({
        type: 'cpu_high',
        message: `CPU usage is ${health.cpu.usage}%`,
        severity: 'warning',
      });
    }

    if (health.memory.usage > this.thresholds.memory) {
      alerts.push({
        type: 'memory_high',
        message: `Memory usage is ${health.memory.usage}%`,
        severity: 'warning',
      });
    }

    if (alerts.length > 0) {
      this.showResourceAlerts(alerts);
    }
  }

  loadOptimizationPatterns() {
    this.patterns = {
      // Git optimizations
      'git log': [
        'Use --oneline for faster output',
        'Add -n 10 to limit results',
        'Use --graph for visual branching',
      ],
      // Find optimizations
      find: [
        'Use -type f for files only',
        'Add -name pattern for specific files',
        'Use -prune to exclude directories',
      ],
      // NPM optimizations
      'npm install': [
        'Use --prefer-offline for cache',
        'Use --no-audit to skip audit',
        'Use --production for prod deps only',
      ],
      // Docker optimizations
      'docker build': [
        'Use --cache-from for layer caching',
        'Add .dockerignore to reduce context',
        'Use multi-stage builds',
      ],
      // General optimizations
      grep: [
        'Use -F for fixed strings (faster)',
        'Add --exclude-dir=.git to skip git files',
        'Use -l to list filenames only',
      ],
    };
  }

  async checkOptimizationPatterns(command) {
    const optimizations = [];
    const baseCommand = command.split(' ')[0];

    if (this.patterns[baseCommand]) {
      for (const suggestion of this.patterns[baseCommand]) {
        if (!this.commandIncludesOptimization(command, suggestion)) {
          optimizations.push({
            type: 'pattern_optimization',
            message: suggestion,
            severity: 'info',
          });
        }
      }
    }

    // Check for full command patterns
    for (const [pattern, suggestions] of Object.entries(this.patterns)) {
      if (command.includes(pattern) && pattern !== baseCommand) {
        for (const suggestion of suggestions) {
          optimizations.push({
            type: 'pattern_optimization',
            message: suggestion,
            severity: 'info',
          });
        }
      }
    }

    return optimizations;
  }

  async applyParallelization(command) {
    // Add parallelization where possible
    if (command.includes('find') && !command.includes('-exec')) {
      return command + ' -exec {} +'; // Batch execution
    }

    if (command.includes('xargs') && !command.includes('-P')) {
      return command.replace('xargs', 'xargs -P 4'); // Parallel execution
    }

    return command;
  }

  async applyCaching(command) {
    // Add caching flags where beneficial
    if (command.includes('npm install') && !command.includes('--prefer-offline')) {
      return command + ' --prefer-offline';
    }

    if (command.includes('pip install') && !command.includes('--cache-dir')) {
      return command + ' --cache-dir ~/.pip-cache';
    }

    return command;
  }

  async applyResourceOptimization(command) {
    // Optimize resource usage
    if (command.includes('find') && !command.includes('-type')) {
      return command + ' -type f'; // Files only, faster
    }

    if (command.includes('grep -r') && !command.includes('--exclude-dir')) {
      return command + ' --exclude-dir=.git --exclude-dir=node_modules';
    }

    return command;
  }

  async applyPathOptimization(command, context) {
    // Optimize paths and working directories
    if (command.includes('./') && context.workingDir) {
      return command.replace('./', context.workingDir + '/');
    }

    return command;
  }

  async getCpuUsage() {
    // Estimate CPU usage (browser limitation)
    const start = performance.now();
    const iterations = 100000;

    for (let i = 0; i < iterations; i++) {
      Math.random();
    }

    const duration = performance.now() - start;
    return Math.min(100, duration / 10); // Rough estimation
  }

  async getMemoryUsage() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const total = performance.memory.totalJSHeapSize;
      return (used / total) * 100;
    }
    return 0;
  }

  async getTotalMemory() {
    if (performance.memory) {
      return performance.memory.totalJSHeapSize / (1024 * 1024); // MB
    }
    return 8192; // Default assumption
  }

  async getAvailableMemory() {
    if (performance.memory) {
      return (
        (performance.memory.totalJSHeapSize - performance.memory.usedJSHeapSize) / (1024 * 1024)
      );
    }
    return 4096; // Default assumption
  }

  async getDiskUsage() {
    // Mock disk usage - in real implementation, use Node.js APIs
    return Math.random() * 100;
  }

  async getNetworkLatency() {
    try {
      const start = performance.now();
      await fetch('/ping', { method: 'HEAD' });
      return performance.now() - start;
    } catch {
      return 0;
    }
  }

  findSimilarCommands(command) {
    const baseCommand = command.split(' ')[0];
    return this.historicalData.filter(metric => metric.command.startsWith(baseCommand)).slice(-20); // Last 20 similar commands
  }

  calculateAverageMetrics(metrics) {
    const count = metrics.length;
    return {
      executionTime: metrics.reduce((sum, m) => sum + m.executionTime, 0) / count,
      cpuDelta: metrics.reduce((sum, m) => sum + m.cpuDelta, 0) / count,
      memoryDelta: metrics.reduce((sum, m) => sum + m.memoryDelta, 0) / count,
    };
  }

  getSlowestCommands(metrics, limit) {
    return metrics
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit)
      .map(m => ({
        command: m.command,
        executionTime: m.executionTime,
        timestamp: m.startTime,
      }));
  }

  getFastestCommands(metrics, limit) {
    return metrics
      .filter(m => m.executionTime > 0)
      .sort((a, b) => a.executionTime - b.executionTime)
      .slice(0, limit)
      .map(m => ({
        command: m.command,
        executionTime: m.executionTime,
        timestamp: m.startTime,
      }));
  }

  calculateTrends(metrics) {
    if (metrics.length < 2) return { trend: 'insufficient_data' };

    const recent = metrics.slice(-10);
    const older = metrics.slice(-20, -10);

    const recentAvg = recent.reduce((sum, m) => sum + m.executionTime, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.executionTime, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    return {
      trend: change > 5 ? 'slower' : change < -5 ? 'faster' : 'stable',
      change: change,
      recentAverage: recentAvg,
      previousAverage: olderAvg,
    };
  }

  showPerformanceInsights(insights) {
    // Create performance insights panel
    const panel = document.createElement('div');
    panel.className = 'performance-insights';
    panel.innerHTML = `
            <h3>⚡ Performance Insights</h3>
            <div class="command">${insights.command}</div>
            <div class="metrics">
                <span>Time: ${insights.metrics.executionTime}ms</span>
                <span>CPU: ${insights.metrics.cpuDelta}%</span>
                <span>Memory: ${insights.metrics.memoryDelta}MB</span>
            </div>
            ${insights.optimizations
              .map(
                opt => `
                <div class="optimization ${opt.severity}">
                    💡 ${opt.message}
                </div>
            `
              )
              .join('')}
            ${insights.warnings
              .map(
                warn => `
                <div class="warning ${warn.severity}">
                    ⚠️ ${warn.message}
                </div>
            `
              )
              .join('')}
        `;

    // Add to terminal interface
    const terminal = document.querySelector('.terminal-container');
    if (terminal) {
      terminal.appendChild(panel);
      setTimeout(() => panel.remove(), 10000); // Auto-remove after 10s
    }
  }

  showResourceAlerts(alerts) {
    alerts.forEach(alert => {
      console.warn(`🚨 ${alert.type}: ${alert.message}`);
    });
  }

  updateResourceGraphs(health) {
    // Update real-time resource graphs
    if (window.performanceCharts) {
      window.performanceCharts.updateCpuChart(health.cpu.usage);
      window.performanceCharts.updateMemoryChart(health.memory.usage);
      window.performanceCharts.updateNetworkChart(health.network.download, health.network.upload);
    }
  }

  generateCommandId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  generateCacheKey(command, context) {
    return btoa(command + context.workingDir).replace(/[^a-zA-Z0-9]/g, '');
  }

  storeMetrics(performance) {
    this.metrics.set(performance.id, performance);
    this.historicalData.push(performance);

    // Keep only last 1000 entries
    if (this.historicalData.length > 1000) {
      this.historicalData.shift();
    }
  }

  parseTimeRange(range) {
    const units = {
      h: 3600000,
      d: 86400000,
      w: 604800000,
      m: 2592000000,
    };

    const match = range.match(/(\d+)([hdwm])/);
    if (match) {
      const [, amount, unit] = match;
      return parseInt(amount) * units[unit];
    }

    return 86400000; // Default to 24 hours
  }

  calculateAverage(metrics, field) {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m[field], 0) / metrics.length;
  }

  commandIncludesOptimization(command, suggestion) {
    // Simple check if optimization is already applied
    return suggestion.split(' ').some(word => command.includes(word));
  }

  cleanupOldData() {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.historicalData = this.historicalData.filter(metric => metric.startTime > oneWeekAgo);
  }

  getAverageResponseTime() {
    if (this.historicalData.length === 0) return 0;
    const recent = this.historicalData.slice(-50);
    return this.calculateAverage(recent, 'executionTime');
  }

  async getLoadAverage() {
    // Mock load average - in real implementation, get from system
    return [1.2, 1.1, 0.9];
  }

  async getDiskReadSpeed() {
    // Mock disk read speed
    return 500 + Math.random() * 100; // MB/s
  }

  async getDiskWriteSpeed() {
    // Mock disk write speed
    return 300 + Math.random() * 100; // MB/s
  }

  async getNetworkUpload() {
    // Mock network upload speed
    return Math.random() * 100; // Mbps
  }

  async getNetworkDownload() {
    // Mock network download speed
    return Math.random() * 200; // Mbps
  }

  async getExecutionOptimizations(command) {
    return [
      'Consider using parallel execution',
      'Add progress indicators for long operations',
      'Use streaming for large outputs',
    ];
  }

  async getCpuOptimizations(command) {
    return [
      'Reduce CPU-intensive operations',
      'Consider running in background',
      'Use nice/ionice for lower priority',
    ];
  }

  async getMemoryOptimizations(command) {
    return [
      'Stream data instead of loading all at once',
      'Use pagination for large results',
      'Clear unused variables',
    ];
  }

  async checkResourcePatterns(command) {
    const warnings = [];

    // Check for known resource-intensive commands
    const heavyCommands = ['find /', 'grep -r', 'npm install', 'docker build'];

    for (const heavy of heavyCommands) {
      if (command.includes(heavy)) {
        warnings.push({
          type: 'resource_intensive',
          message: `${heavy} can be resource intensive`,
          severity: 'medium',
        });
      }
    }

    return warnings;
  }

  async calculateSpeedup(original, optimized) {
    // Estimate speedup based on optimizations applied
    let speedup = 1.0;

    if (optimized.includes('-P ')) speedup *= 2.0; // Parallelization
    if (optimized.includes('--prefer-offline')) speedup *= 1.5; // Caching
    if (optimized.includes('-type f')) speedup *= 1.3; // Type filtering
    if (optimized.includes('--exclude-dir')) speedup *= 1.2; // Directory exclusion

    return speedup;
  }

  calculateOptimizationImpact(metrics) {
    // Calculate the impact of applied optimizations
    const optimized = metrics.filter(m => m.command.includes('optimized'));
    const regular = metrics.filter(m => !m.command.includes('optimized'));

    if (optimized.length === 0 || regular.length === 0) {
      return { impact: 'insufficient_data' };
    }

    const optimizedAvg = this.calculateAverage(optimized, 'executionTime');
    const regularAvg = this.calculateAverage(regular, 'executionTime');

    const improvement = ((regularAvg - optimizedAvg) / regularAvg) * 100;

    return {
      improvement: improvement,
      optimizedAverage: optimizedAvg,
      regularAverage: regularAvg,
      sampleSize: { optimized: optimized.length, regular: regular.length },
    };
  }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
} else {
  window.PerformanceMonitor = PerformanceMonitor;
}

class PerformanceMonitoringDashboard {
  constructor() {
    this.metrics = new Map();
    this.commandHistory = new Map();
    this.resourceMonitor = new ResourceMonitor();
    this.predictiveAnalyzer = new PredictivePerformanceAnalyzer();
    this.alertSystem = new PerformanceAlertSystem();
    this.optimizationEngine = new OptimizationEngine();
    this.dashboardUI = null;
    this.isMonitoring = false;
    this.initializeDashboard();
  }

  initializeDashboard() {
    this.createDashboardUI();
    this.startResourceMonitoring();
    this.loadHistoricalData();
  }

  loadHistoricalData() {
    try {
      // Load historical performance data from localStorage
      const storedData = localStorage.getItem('rinawarp_performance_history');
      if (storedData) {
        const historicalData = JSON.parse(storedData);
        this.metrics = new Map(historicalData.metrics || []);
        this.commandHistory = new Map(historicalData.commandHistory || []);
        console.log('📊 Loaded historical performance data');
      } else {
        console.log('📊 No historical performance data found, starting fresh');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load historical performance data:', error);
      // Initialize with empty data
      this.metrics = new Map();
      this.commandHistory = new Map();
    }
  }

  saveHistoricalData() {
    try {
      const dataToSave = {
        metrics: Array.from(this.metrics.entries()),
        commandHistory: Array.from(this.commandHistory.entries()),
        lastSaved: Date.now(),
      };
      localStorage.setItem('rinawarp_performance_history', JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('⚠️ Failed to save historical performance data:', error);
    }
  }

  createDashboardUI() {
    const dashboardContainer = document.createElement('div');
    dashboardContainer.id = 'performance-dashboard';
    dashboardContainer.className = 'performance-dashboard hidden';

    dashboardContainer.innerHTML = `
            <div class="dashboard-header">
                <h2>🚀 Performance Monitor</h2>
                <div class="dashboard-controls">
                    <button id="toggle-monitoring" class="monitor-btn">
                        <span class="status-indicator"></span>
                        <span class="status-text">Start Monitoring</span>
                    </button>
                    <button id="clear-metrics" class="clear-btn">Clear Data</button>
                    <button id="export-metrics" class="export-btn">Export</button>
                    <button id="close-dashboard" class="close-btn">×</button>
                </div>
            </div>
            
            <div class="dashboard-content">
                <!-- Real-time Metrics Section -->
                <div class="metrics-section">
                    <h3>Real-time Performance</h3>
                    <div class="metrics-grid">
                        <div class="metric-card cpu">
                            <div class="metric-icon">🔥</div>
                            <div class="metric-value" id="cpu-usage">0%</div>
                            <div class="metric-label">CPU Usage</div>
                        </div>
                        <div class="metric-card memory">
                            <div class="metric-icon">🧠</div>
                            <div class="metric-value" id="memory-usage">0MB</div>
                            <div class="metric-label">Memory</div>
                        </div>
                        <div class="metric-card commands">
                            <div class="metric-icon">⚡</div>
                            <div class="metric-value" id="commands-count">0</div>
                            <div class="metric-label">Commands Run</div>
                        </div>
                        <div class="metric-card avg-time">
                            <div class="metric-icon">⏱️</div>
                            <div class="metric-value" id="avg-execution-time">0ms</div>
                            <div class="metric-label">Avg Exec Time</div>
                        </div>
                    </div>
                </div>
                
                <!-- Command Performance Section -->
                <div class="command-performance-section">
                    <h3>Command Performance Analysis</h3>
                    <div class="performance-chart">
                        <canvas id="performance-chart" width="600" height="300"></canvas>
                    </div>
                    <div class="command-stats">
                        <div class="stats-table">
                            <table id="command-stats-table">
                                <thead>
                                    <tr>
                                        <th>Command</th>
                                        <th>Executions</th>
                                        <th>Avg Time</th>
                                        <th>Success Rate</th>
                                        <th>Performance</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Optimization Suggestions -->
                <div class="optimization-section">
                    <h3>🎯 Optimization Suggestions</h3>
                    <div id="optimization-suggestions" class="suggestions-list">
                        <!-- Dynamic suggestions will be inserted here -->
                    </div>
                </div>
                
                <!-- Resource Usage Timeline -->
                <div class="timeline-section">
                    <h3>📊 Resource Usage Timeline</h3>
                    <div class="timeline-chart">
                        <canvas id="timeline-chart" width="800" height="200"></canvas>
                    </div>
                </div>
                
                <!-- Alerts Section -->
                <div class="alerts-section">
                    <h3>🚨 Performance Alerts</h3>
                    <div id="performance-alerts" class="alerts-list">
                        <!-- Dynamic alerts will be inserted here -->
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(dashboardContainer);
    this.dashboardUI = dashboardContainer;
    this.attachEventListeners();
  }

  async trackCommandExecution(command, startTime, endTime, result) {
    const executionTime = endTime - startTime;
    const commandKey = this.normalizeCommand(command);

    const metrics = {
      command: command,
      executionTime: executionTime,
      timestamp: startTime,
      success: result.exitCode === 0,
      resourceUsage: await this.resourceMonitor.getUsageSnapshot(),
      outputSize: result.output ? result.output.length : 0,
    };

    // Store metrics
    if (!this.commandHistory.has(commandKey)) {
      this.commandHistory.set(commandKey, []);
    }
    this.commandHistory.get(commandKey).push(metrics);

    // Update real-time metrics
    this.updateRealTimeMetrics(metrics);

    // Check for performance issues
    await this.analyzePerformance(metrics);

    // Generate optimization suggestions
    const suggestions = await this.optimizationEngine.analyzePotentialOptimizations(metrics);
    this.updateOptimizationSuggestions(suggestions);

    // Update dashboard if visible
    if (!this.dashboardUI.classList.contains('hidden')) {
      this.refreshDashboard();
    }
  }

  startResourceMonitoring() {
    this.resourceMonitor.startMonitoring();

    // Update UI every second
    setInterval(() => {
      if (this.isMonitoring) {
        this.updateResourceMetrics();
      }
    }, 1000);
  }

  async analyzePerformance(metrics) {
    const analysis = {
      isSlowCommand: metrics.executionTime > 5000, // 5 seconds
      isResourceIntensive: this.isResourceIntensive(metrics.resourceUsage),
      hasHighFailureRate: (await this.calculateFailureRate(metrics.command)) > 0.2,
      isFrequentCommand: (await this.getCommandFrequency(metrics.command)) > 10,
    };

    // Generate alerts for performance issues
    if (analysis.isSlowCommand) {
      this.alertSystem.addAlert({
        type: 'SLOW_COMMAND',
        message: `Command '${metrics.command}' took ${metrics.executionTime}ms to execute`,
        severity: 'warning',
        timestamp: Date.now(),
        suggestions: await this.optimizationEngine.getSuggestions(metrics.command),
      });
    }

    if (analysis.isResourceIntensive) {
      this.alertSystem.addAlert({
        type: 'HIGH_RESOURCE_USAGE',
        message: `Command consumed ${metrics.resourceUsage.memory}MB memory`,
        severity: 'info',
        timestamp: Date.now(),
      });
    }

    return analysis;
  }

  async predictPerformanceImpact(command) {
    const commandKey = this.normalizeCommand(command);
    const history = this.commandHistory.get(commandKey) || [];

    if (history.length === 0) {
      return {
        estimatedTime: 'Unknown',
        confidence: 0,
        resourceImpact: 'Unknown',
      };
    }

    const avgTime = history.reduce((sum, h) => sum + h.executionTime, 0) / history.length;
    const avgMemory = history.reduce((sum, h) => sum + h.resourceUsage.memory, 0) / history.length;
    const successRate = history.filter(h => h.success).length / history.length;

    return {
      estimatedTime: Math.round(avgTime),
      confidence: Math.min(history.length / 10, 1), // Confidence increases with more data
      resourceImpact: {
        memory: Math.round(avgMemory),
        cpu: 'Medium', // Simplified for now
      },
      successRate: successRate,
      recommendation: this.generateRecommendation(avgTime, successRate),
    };
  }

  updateRealTimeMetrics(metrics) {
    const totalCommands = Array.from(this.commandHistory.values()).reduce(
      (sum, history) => sum + history.length,
      0
    );

    const allExecutionTimes = Array.from(this.commandHistory.values())
      .flat()
      .map(h => h.executionTime);

    const avgExecutionTime =
      allExecutionTimes.length > 0
        ? allExecutionTimes.reduce((sum, time) => sum + time, 0) / allExecutionTimes.length
        : 0;

    // Update metric cards
    const elements = {
      'commands-count': totalCommands,
      'avg-execution-time': `${Math.round(avgExecutionTime)}ms`,
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }

  updateResourceMetrics() {
    const usage = this.resourceMonitor.getCurrentUsage();

    const cpuElement = document.getElementById('cpu-usage');
    const memoryElement = document.getElementById('memory-usage');

    if (cpuElement) cpuElement.textContent = `${Math.round(usage.cpu)}%`;
    if (memoryElement) memoryElement.textContent = `${Math.round(usage.memory)}MB`;
  }

  refreshDashboard() {
    this.updateCommandStatsTable();
    this.updatePerformanceChart();
    this.updateTimelineChart();
    this.updateAlerts();
  }

  updateCommandStatsTable() {
    const tbody = document.querySelector('#command-stats-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Get command statistics
    const stats = Array.from(this.commandHistory.entries())
      .map(([command, history]) => {
        const avgTime = history.reduce((sum, h) => sum + h.executionTime, 0) / history.length;
        const successRate = history.filter(h => h.success).length / history.length;
        const performance = this.calculatePerformanceRating(avgTime, successRate);

        return {
          command: command,
          executions: history.length,
          avgTime: Math.round(avgTime),
          successRate: Math.round(successRate * 100),
          performance: performance,
        };
      })
      .sort((a, b) => b.executions - a.executions)
      .slice(0, 10); // Top 10 commands

    stats.forEach(stat => {
      const row = tbody.insertRow();
      row.innerHTML = `
                <td class="command-cell">${this.truncateCommand(stat.command)}</td>
                <td>${stat.executions}</td>
                <td>${stat.avgTime}ms</td>
                <td>${stat.successRate}%</td>
                <td><span class="performance-badge ${stat.performance.class}">${stat.performance.text}</span></td>
            `;
    });
  }

  attachEventListeners() {
    document.getElementById('toggle-monitoring')?.addEventListener('click', () => {
      this.toggleMonitoring();
    });

    document.getElementById('clear-metrics')?.addEventListener('click', () => {
      this.clearMetrics();
    });

    document.getElementById('export-metrics')?.addEventListener('click', () => {
      this.exportMetrics();
    });

    document.getElementById('close-dashboard')?.addEventListener('click', () => {
      this.hideDashboard();
    });
  }

  toggleMonitoring() {
    this.isMonitoring = !this.isMonitoring;
    const button = document.getElementById('toggle-monitoring');
    const statusText = button?.querySelector('.status-text');
    const statusIndicator = button?.querySelector('.status-indicator');

    if (this.isMonitoring) {
      statusText.textContent = 'Stop Monitoring';
      statusIndicator.classList.add('active');
      button.classList.add('monitoring');
    } else {
      statusText.textContent = 'Start Monitoring';
      statusIndicator.classList.remove('active');
      button.classList.remove('monitoring');
    }
  }

  // Public API
  showDashboard() {
    this.dashboardUI.classList.remove('hidden');
    this.refreshDashboard();
  }

  hideDashboard() {
    this.dashboardUI.classList.add('hidden');
  }

  exportMetrics() {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: Array.from(this.commandHistory.entries()),
      summary: this.generateSummaryReport(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rinawarp-performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Helper methods
  normalizeCommand(command) {
    // Normalize command for grouping (remove unique parameters)
    return command.split(' ')[0]; // Just use the base command for now
  }

  calculatePerformanceRating(avgTime, successRate) {
    if (successRate < 0.8) {
      return { text: 'Poor', class: 'poor' };
    }
    if (avgTime > 5000) {
      return { text: 'Slow', class: 'slow' };
    }
    if (avgTime < 1000 && successRate > 0.95) {
      return { text: 'Excellent', class: 'excellent' };
    }
    return { text: 'Good', class: 'good' };
  }

  truncateCommand(command, maxLength = 30) {
    return command.length > maxLength ? command.substr(0, maxLength) + '...' : command;
  }
}

class ResourceMonitor {
  constructor() {
    this.isMonitoring = false;
    this.currentUsage = { cpu: 0, memory: 0 };
    this.history = [];
  }

  startMonitoring() {
    this.isMonitoring = true;

    // Monitor resource usage
    setInterval(async () => {
      if (this.isMonitoring) {
        this.currentUsage = await this.measureResourceUsage();
        this.history.push({
          timestamp: Date.now(),
          ...this.currentUsage,
        });

        // Keep only last hour of data
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.history = this.history.filter(h => h.timestamp > oneHourAgo);
      }
    }, 1000);
  }

  async measureResourceUsage() {
    // In a real implementation, this would measure actual resource usage
    // For now, we'll simulate it
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 1000 + 50,
    };
  }

  getCurrentUsage() {
    return this.currentUsage;
  }

  async getUsageSnapshot() {
    return await this.measureResourceUsage();
  }
}

class PredictivePerformanceAnalyzer {
  constructor() {
    this.patterns = new Map();
    this.learningData = new Map();
  }

  learnFromExecution(command, metrics) {
    const pattern = this.extractPattern(command, metrics);

    if (!this.learningData.has(command)) {
      this.learningData.set(command, []);
    }

    this.learningData.get(command).push(pattern);
  }

  predictExecutionTime(command, context) {
    const historicalData = this.learningData.get(command) || [];

    if (historicalData.length === 0) {
      return { prediction: null, confidence: 0 };
    }

    // Simple prediction based on average
    const avgTime =
      historicalData.reduce((sum, data) => sum + data.executionTime, 0) / historicalData.length;
    const confidence = Math.min(historicalData.length / 10, 1);

    return {
      prediction: avgTime,
      confidence: confidence,
      factors: this.analyzePerformanceFactors(historicalData, context),
    };
  }

  extractPattern(command, metrics) {
    return {
      executionTime: metrics.executionTime,
      resourceUsage: metrics.resourceUsage,
      timeOfDay: new Date(metrics.timestamp).getHours(),
      commandLength: command.length,
    };
  }

  analyzePerformanceFactors(historicalData, context) {
    // Analyze what factors affect performance
    return {
      timeOfDay: 'No significant impact',
      systemLoad: 'Moderate impact',
      commandComplexity: 'High impact',
    };
  }
}

class PerformanceAlertSystem {
  constructor() {
    this.alerts = [];
    this.maxAlerts = 50;
  }

  addAlert(alert) {
    this.alerts.unshift(alert);

    // Limit number of alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }

    this.notifyUI(alert);
  }

  getAlerts() {
    return this.alerts;
  }

  clearAlerts() {
    this.alerts = [];
  }

  notifyUI(alert) {
    // Update alerts in dashboard
    const alertsContainer = document.getElementById('performance-alerts');
    if (alertsContainer) {
      const alertElement = document.createElement('div');
      alertElement.className = `alert alert-${alert.severity}`;
      alertElement.innerHTML = `
                <div class="alert-header">
                    <span class="alert-type">${alert.type}</span>
                    <span class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="alert-message">${alert.message}</div>
                ${alert.suggestions ? `<div class="alert-suggestions">${alert.suggestions.join(', ')}</div>` : ''}
            `;

      alertsContainer.insertBefore(alertElement, alertsContainer.firstChild);

      // Remove old alerts
      const alerts = alertsContainer.querySelectorAll('.alert');
      if (alerts.length > 10) {
        alerts[alerts.length - 1].remove();
      }
    }
  }
}

class OptimizationEngine {
  constructor() {
    this.optimizationRules = new Map();
    this.loadOptimizationRules();
  }

  loadOptimizationRules() {
    // Define optimization rules
    this.optimizationRules.set('slow_git_commands', {
      pattern: /git\s+(status|log|diff)/,
      suggestion: 'Consider using git aliases or --porcelain flag for faster execution',
      impact: 'High',
    });

    this.optimizationRules.set('inefficient_find', {
      pattern: /find\s+\/\s+-name/,
      suggestion: 'Use locate or fd for faster file searching',
      impact: 'Medium',
    });

    this.optimizationRules.set('unoptimized_npm', {
      pattern: /npm\s+install/,
      suggestion: 'Consider using npm ci for faster installs in CI environments',
      impact: 'Medium',
    });
  }

  async analyzePotentialOptimizations(metrics) {
    const suggestions = [];

    // Check against optimization rules
    for (const [rule, config] of this.optimizationRules) {
      if (config.pattern.test(metrics.command)) {
        suggestions.push({
          rule: rule,
          suggestion: config.suggestion,
          impact: config.impact,
          confidence: 0.8,
        });
      }
    }

    // Add performance-based suggestions
    if (metrics.executionTime > 5000) {
      suggestions.push({
        rule: 'slow_execution',
        suggestion:
          'This command is running slowly. Consider breaking it into smaller tasks or running in background.',
        impact: 'High',
        confidence: 0.9,
      });
    }

    return suggestions;
  }

  getSuggestions(command) {
    const suggestions = [];

    for (const [rule, config] of this.optimizationRules) {
      if (config.pattern.test(command)) {
        suggestions.push(config.suggestion);
      }
    }

    return suggestions;
  }
}

export { PerformanceMonitoringDashboard };
