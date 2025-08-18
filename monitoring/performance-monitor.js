/**
 * RinaWarp Terminal - Performance Monitoring System
 * Real-time performance tracking and analytics
 */

import os from 'os';
import process from 'process';

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requests: 0,
            responses: 0,
            errors: 0,
            averageResponseTime: 0,
            peakMemory: 0,
            startTime: Date.now()
        };
        
        this.responseTimes = [];
        this.recentMetrics = [];
        this.isMonitoring = false;
    }

    // Start monitoring
    start() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        
        console.log('🔍 Performance Monitor started');
        
        // Monitor system metrics every 30 seconds
        setInterval(() => {
            this.collectSystemMetrics();
        }, 30000);
        
        // Clean old metrics every 5 minutes
        setInterval(() => {
            this.cleanOldMetrics();
        }, 300000);
    }

    // Middleware to track HTTP requests
    trackRequest() {
        return (req, res, next) => {
            const startTime = Date.now();
            this.metrics.requests++;

            // Track response
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                this.recordResponse(responseTime, res.statusCode);
            });

            next();
        };
    }

    // Record response metrics
    recordResponse(responseTime, statusCode) {
        this.metrics.responses++;
        
        if (statusCode >= 400) {
            this.metrics.errors++;
        }

        // Track response times (keep last 1000)
        this.responseTimes.push(responseTime);
        if (this.responseTimes.length > 1000) {
            this.responseTimes.shift();
        }

        // Calculate average response time
        this.metrics.averageResponseTime = 
            this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    }

    // Collect system metrics
    collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        // Update peak memory
        if (memUsage.heapUsed > this.metrics.peakMemory) {
            this.metrics.peakMemory = memUsage.heapUsed;
        }

        const systemMetrics = {
            timestamp: Date.now(),
            memory: {
                used: memUsage.heapUsed,
                total: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            uptime: process.uptime(),
            loadAverage: os.loadavg(),
            freeMemory: os.freemem(),
            totalMemory: os.totalmem()
        };

        // Store recent metrics (keep last 100 measurements)
        this.recentMetrics.push(systemMetrics);
        if (this.recentMetrics.length > 100) {
            this.recentMetrics.shift();
        }
    }

    // Clean old metrics to prevent memory leaks
    cleanOldMetrics() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.recentMetrics = this.recentMetrics.filter(
            metric => metric.timestamp > oneHourAgo
        );
    }

    // Get current metrics
    getMetrics() {
        const uptime = Math.floor((Date.now() - this.metrics.startTime) / 1000);
        
        return {
            ...this.metrics,
            uptime,
            memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            peakMemoryMB: Math.round(this.metrics.peakMemory / 1024 / 1024),
            requestsPerMinute: this.calculateRPM(),
            errorRate: this.metrics.responses > 0 ? 
                (this.metrics.errors / this.metrics.responses * 100).toFixed(2) + '%' : '0%',
            systemLoad: os.loadavg()[0].toFixed(2),
            freeMemoryGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
            recentMetrics: this.recentMetrics.slice(-10) // Last 10 measurements
        };
    }

    // Calculate requests per minute
    calculateRPM() {
        const uptimeMinutes = (Date.now() - this.metrics.startTime) / 60000;
        return uptimeMinutes > 0 ? Math.round(this.metrics.requests / uptimeMinutes) : 0;
    }

    // Get detailed analytics
    getAnalytics() {
        return {
            performance: this.getMetrics(),
            responseTimeDistribution: this.getResponseTimeDistribution(),
            healthStatus: this.getHealthStatus(),
            recommendations: this.getRecommendations()
        };
    }

    // Analyze response time distribution
    getResponseTimeDistribution() {
        if (this.responseTimes.length === 0) return {};

        const sorted = [...this.responseTimes].sort((a, b) => a - b);
        const len = sorted.length;

        return {
            min: sorted[0],
            max: sorted[len - 1],
            median: sorted[Math.floor(len / 2)],
            p95: sorted[Math.floor(len * 0.95)],
            p99: sorted[Math.floor(len * 0.99)]
        };
    }

    // Determine health status
    getHealthStatus() {
        const metrics = this.getMetrics();
        let status = 'healthy';
        let issues = [];

        // Check memory usage
        if (metrics.memoryUsageMB > 500) {
            status = 'warning';
            issues.push('High memory usage');
        }

        // Check error rate
        if (parseFloat(metrics.errorRate) > 5) {
            status = 'critical';
            issues.push('High error rate');
        }

        // Check response time
        if (metrics.averageResponseTime > 1000) {
            status = status === 'critical' ? 'critical' : 'warning';
            issues.push('Slow response times');
        }

        return { status, issues };
    }

    // Get performance recommendations
    getRecommendations() {
        const recommendations = [];
        const metrics = this.getMetrics();

        if (metrics.memoryUsageMB > 300) {
            recommendations.push({
                type: 'memory',
                message: 'Consider implementing memory optimization or garbage collection tuning',
                priority: 'medium'
            });
        }

        if (metrics.averageResponseTime > 500) {
            recommendations.push({
                type: 'performance',
                message: 'Response times are high. Consider adding caching or optimizing database queries',
                priority: 'high'
            });
        }

        if (parseFloat(metrics.errorRate) > 2) {
            recommendations.push({
                type: 'reliability',
                message: 'Error rate is elevated. Review error logs and implement better error handling',
                priority: 'high'
            });
        }

        return recommendations;
    }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export default PerformanceMonitor;
