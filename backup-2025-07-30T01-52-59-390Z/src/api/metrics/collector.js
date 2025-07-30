/**
 * Metrics Collector for RinaWarp API Gateway
 * Collects and stores performance metrics, usage analytics
 */

export class MetricsCollector {
  constructor(config = {}) {
    this.config = config;
    this.metrics = {
      requests: [],
      performance: [],
      errors: [],
      usage: new Map(),
      realTimeStats: {
        activeConnections: 0,
        requestsPerMinute: 0,
        averageResponseTime: 0,
        errorRate: 0,
      },
    };

    // Start real-time metrics calculation
    this.startRealTimeUpdates();
  }

  /**
   * Record an API request
   */
  recordRequest(requestData) {
    const timestamp = new Date().toISOString();
    const record = {
      timestamp,
      method: requestData.method,
      path: requestData.path,
      statusCode: requestData.statusCode,
      duration: requestData.duration,
      userId: requestData.userId,
      apiKey: requestData.apiKey?.substring(0, 10) + '****', // Masked for security
      userAgent: requestData.userAgent,
      ip: requestData.ip,
    };

    this.metrics.requests.push(record);

    // Keep only last 10000 requests to prevent memory issues
    if (this.metrics.requests.length > 10000) {
      this.metrics.requests = this.metrics.requests.slice(-5000);
    }

    // Update usage statistics
    this.updateUsageStats(requestData);

    // Record errors if status code indicates failure
    if (requestData.statusCode >= 400) {
      this.recordError({
        timestamp,
        statusCode: requestData.statusCode,
        path: requestData.path,
        userId: requestData.userId,
        error: this.getErrorMessageFromStatus(requestData.statusCode),
      });
    }
  }

  /**
   * Record a performance metric
   */
  recordPerformance(performanceData) {
    const record = {
      timestamp: new Date().toISOString(),
      type: performanceData.type, // 'api', 'database', 'external'
      operation: performanceData.operation,
      duration: performanceData.duration,
      success: performanceData.success,
      metadata: performanceData.metadata,
    };

    this.metrics.performance.push(record);

    // Keep only last 5000 performance records
    if (this.metrics.performance.length > 5000) {
      this.metrics.performance = this.metrics.performance.slice(-2500);
    }
  }

  /**
   * Record an error
   */
  recordError(errorData) {
    const record = {
      timestamp: new Date().toISOString(),
      type: errorData.type || 'api_error',
      message: errorData.error || errorData.message,
      statusCode: errorData.statusCode,
      path: errorData.path,
      userId: errorData.userId,
      stack: errorData.stack,
      metadata: errorData.metadata,
    };

    this.metrics.errors.push(record);

    // Keep only last 1000 errors
    if (this.metrics.errors.length > 1000) {
      this.metrics.errors = this.metrics.errors.slice(-500);
    }
  }

  /**
   * Update usage statistics
   */
  updateUsageStats(requestData) {
    const userId = requestData.userId;
    if (!userId) return;

    if (!this.metrics.usage.has(userId)) {
      this.metrics.usage.set(userId, {
        totalRequests: 0,
        totalDuration: 0,
        endpoints: new Map(),
        firstRequest: new Date().toISOString(),
        lastRequest: null,
      });
    }

    const userStats = this.metrics.usage.get(userId);
    userStats.totalRequests++;
    userStats.totalDuration += requestData.duration;
    userStats.lastRequest = new Date().toISOString();

    // Track endpoint usage
    const endpoint = `${requestData.method} ${requestData.path}`;
    if (!userStats.endpoints.has(endpoint)) {
      userStats.endpoints.set(endpoint, { count: 0, totalDuration: 0 });
    }
    const endpointStats = userStats.endpoints.get(endpoint);
    endpointStats.count++;
    endpointStats.totalDuration += requestData.duration;
  }

  /**
   * Start real-time metrics updates
   */
  startRealTimeUpdates() {
    setInterval(() => {
      this.updateRealTimeStats();
    }, 60000); // Update every minute
  }

  /**
   * Update real-time statistics
   */
  updateRealTimeStats() {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    // Calculate requests per minute
    const recentRequests = this.metrics.requests.filter(
      req => new Date(req.timestamp) > oneMinuteAgo
    );

    this.metrics.realTimeStats.requestsPerMinute = recentRequests.length;

    // Calculate average response time
    if (recentRequests.length > 0) {
      const totalDuration = recentRequests.reduce((sum, req) => sum + req.duration, 0);
      this.metrics.realTimeStats.averageResponseTime = totalDuration / recentRequests.length;
    }

    // Calculate error rate
    const errorRequests = recentRequests.filter(req => req.statusCode >= 400);
    this.metrics.realTimeStats.errorRate =
      recentRequests.length > 0 ? (errorRequests.length / recentRequests.length) * 100 : 0;
  }

  /**
   * Get analytics data for a specific time range
   */
  getAnalytics(startDate, endDate, userId = null) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    let filteredRequests = this.metrics.requests.filter(req => {
      const reqDate = new Date(req.timestamp);
      return reqDate >= start && reqDate <= end;
    });

    if (userId) {
      filteredRequests = filteredRequests.filter(req => req.userId === userId);
    }

    return {
      totalRequests: filteredRequests.length,
      averageResponseTime: this.calculateAverage(filteredRequests, 'duration'),
      errorRate: this.calculateErrorRate(filteredRequests),
      topEndpoints: this.getTopEndpoints(filteredRequests),
      requestsByHour: this.groupRequestsByHour(filteredRequests),
      statusCodeDistribution: this.getStatusCodeDistribution(filteredRequests),
      userActivity: this.getUserActivity(filteredRequests),
    };
  }

  /**
   * Get real-time dashboard data
   */
  getRealTimeStats() {
    return {
      ...this.metrics.realTimeStats,
      totalUsers: this.metrics.usage.size,
      totalRequests: this.metrics.requests.length,
      totalErrors: this.metrics.errors.length,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get user-specific analytics
   */
  getUserAnalytics(userId) {
    const userStats = this.metrics.usage.get(userId);
    if (!userStats) {
      return null;
    }

    const userRequests = this.metrics.requests.filter(req => req.userId === userId);

    return {
      totalRequests: userStats.totalRequests,
      averageResponseTime: userStats.totalDuration / userStats.totalRequests,
      firstRequest: userStats.firstRequest,
      lastRequest: userStats.lastRequest,
      topEndpoints: Array.from(userStats.endpoints.entries())
        .map(([endpoint, stats]) => ({
          endpoint,
          count: stats.count,
          averageTime: stats.totalDuration / stats.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentActivity: userRequests.slice(-50).map(req => ({
        timestamp: req.timestamp,
        method: req.method,
        path: req.path,
        duration: req.duration,
        statusCode: req.statusCode,
      })),
    };
  }

  /**
   * Helper methods
   */
  calculateAverage(requests, field) {
    if (requests.length === 0) return 0;
    const sum = requests.reduce((total, req) => total + req[field], 0);
    return sum / requests.length;
  }

  calculateErrorRate(requests) {
    if (requests.length === 0) return 0;
    const errors = requests.filter(req => req.statusCode >= 400);
    return (errors.length / requests.length) * 100;
  }

  getTopEndpoints(requests) {
    const endpointCounts = new Map();

    requests.forEach(req => {
      const endpoint = `${req.method} ${req.path}`;
      endpointCounts.set(endpoint, (endpointCounts.get(endpoint) || 0) + 1);
    });

    return Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  groupRequestsByHour(requests) {
    const hourCounts = new Map();

    requests.forEach(req => {
      const hour = new Date(req.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    return Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);
  }

  getStatusCodeDistribution(requests) {
    const statusCounts = new Map();

    requests.forEach(req => {
      const status = Math.floor(req.statusCode / 100) * 100; // Group by status class
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    return Array.from(statusCounts.entries()).map(([status, count]) => ({
      statusClass: `${status}xx`,
      count,
    }));
  }

  getUserActivity(requests) {
    const userCounts = new Map();

    requests.forEach(req => {
      if (req.userId) {
        userCounts.set(req.userId, (userCounts.get(req.userId) || 0) + 1);
      }
    });

    return Array.from(userCounts.entries())
      .map(([userId, count]) => ({ userId, requestCount: count }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 20);
  }

  getErrorMessageFromStatus(statusCode) {
    const errorMessages = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return errorMessages[statusCode] || 'Unknown Error';
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format = 'json') {
    const data = {
      timestamp: new Date().toISOString(),
      summary: this.getRealTimeStats(),
      requests: this.metrics.requests,
      performance: this.metrics.performance,
      errors: this.metrics.errors,
      usage: Array.from(this.metrics.usage.entries()).map(([userId, stats]) => ({
        userId,
        ...stats,
        endpoints: Array.from(stats.endpoints.entries()),
      })),
    };

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      return this.convertToCSV(data.requests);
    }

    return data;
  }

  convertToCSV(requests) {
    const headers = ['timestamp', 'method', 'path', 'statusCode', 'duration', 'userId'];
    const csvRows = [headers.join(',')];

    requests.forEach(req => {
      const row = headers.map(header => req[header] || '').join(',');
      csvRows.push(row);
    });

    return csvRows.join('\n');
  }
}
