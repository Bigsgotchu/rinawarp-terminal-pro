/**
 * RinaWarp Terminal - Advanced Caching and Scaling System
 * Multi-layer caching with Redis-like functionality and scaling utilities
 */

import fs from 'fs/promises';
import path from 'path';

class CacheManager {
    constructor(options = {}) {
        this.config = {
            defaultTTL: options.defaultTTL || 3600000, // 1 hour
            maxMemorySize: options.maxMemorySize || 100 * 1024 * 1024, // 100MB
            cleanupInterval: options.cleanupInterval || 300000, // 5 minutes
            compressionThreshold: options.compressionThreshold || 1024, // 1KB
            enablePersistence: options.enablePersistence || true,
            persistenceFile: options.persistenceFile || 'cache-data.json'
        };

        // Multi-layer cache storage
        this.memoryCache = new Map();
        this.persistentCache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            memoryUsage: 0,
            lastCleanup: Date.now()
        };

        // Cleanup timers
        this.cleanupTimer = null;
        this.persistenceTimer = null;

        this.initialize();
    }

    async initialize() {
        console.log('🗄️ Initializing advanced cache system...');
        
        // Load persistent cache if enabled
        if (this.config.enablePersistence) {
            await this.loadPersistentCache();
        }

        // Start cleanup timer
        this.startCleanupTimer();
        this.startPersistenceTimer();
        
        console.log('✅ Cache system initialized successfully');
    }

    // Set cache entry with advanced options
    async set(key, value, options = {}) {
        const ttl = options.ttl || this.config.defaultTTL;
        const compress = options.compress !== false;
        const persistent = options.persistent || false;
        
        const entry = {
            value,
            timestamp: Date.now(),
            ttl,
            size: this.calculateSize(value),
            compressed: false,
            persistent
        };

        // Compress large values
        if (compress && entry.size > this.config.compressionThreshold) {
            entry.value = await this.compress(value);
            entry.compressed = true;
            entry.size = this.calculateSize(entry.value);
        }

        // Store in appropriate cache layer
        if (persistent) {
            this.persistentCache.set(key, entry);
        } else {
            this.memoryCache.set(key, entry);
        }

        // Update stats
        this.cacheStats.sets++;
        this.updateMemoryUsage();

        // Check memory limits
        await this.enforceMemoryLimits();

        return true;
    }

    // Get cache entry with fallback layers
    async get(key, options = {}) {
        const includeExpired = options.includeExpired || false;
        
        // Check memory cache first
        let entry = this.memoryCache.get(key);
        let fromPersistent = false;

        // Fallback to persistent cache
        if (!entry) {
            entry = this.persistentCache.get(key);
            fromPersistent = true;
        }

        if (!entry) {
            this.cacheStats.misses++;
            return null;
        }

        // Check expiration
        const now = Date.now();
        const isExpired = now > (entry.timestamp + entry.ttl);
        
        if (isExpired && !includeExpired) {
            // Remove expired entry
            if (fromPersistent) {
                this.persistentCache.delete(key);
            } else {
                this.memoryCache.delete(key);
            }
            this.cacheStats.misses++;
            return null;
        }

        // Decompress if needed
        let value = entry.value;
        if (entry.compressed) {
            value = await this.decompress(value);
        }

        // Promote to memory cache if from persistent
        if (fromPersistent && !isExpired) {
            await this.set(key, value, { 
                ttl: entry.ttl - (now - entry.timestamp),
                compress: false,
                persistent: false 
            });
        }

        this.cacheStats.hits++;
        return value;
    }

    // Advanced get with auto-refresh
    async getOrSet(key, generator, options = {}) {
        let value = await this.get(key, options);
        
        if (value === null && typeof generator === 'function') {
            console.log(`🔄 Cache miss for '${key}' - generating value`);
            value = await generator();
            
            if (value !== null && value !== undefined) {
                await this.set(key, value, options);
            }
        }

        return value;
    }

    // Batch operations for performance
    async mget(keys) {
        const results = new Map();
        
        for (const key of keys) {
            const value = await this.get(key);
            results.set(key, value);
        }

        return results;
    }

    async mset(entries, options = {}) {
        const promises = [];
        
        for (const [key, value] of entries) {
            promises.push(this.set(key, value, options));
        }

        return Promise.all(promises);
    }

    // Pattern-based operations
    async keys(pattern = '*') {
        const allKeys = [
            ...this.memoryCache.keys(),
            ...this.persistentCache.keys()
        ];

        if (pattern === '*') {
            return [...new Set(allKeys)];
        }

        // Simple pattern matching
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return allKeys.filter(key => regex.test(key));
    }

    async clear(pattern = '*') {
        if (pattern === '*') {
            this.memoryCache.clear();
            this.persistentCache.clear();
        } else {
            const keysToDelete = await this.keys(pattern);
            for (const key of keysToDelete) {
                await this.delete(key);
            }
        }

        this.updateMemoryUsage();
        return true;
    }

    // Delete with cascade options
    async delete(key, options = {}) {
        const cascade = options.cascade !== false;
        
        let deleted = false;
        
        if (this.memoryCache.has(key)) {
            this.memoryCache.delete(key);
            deleted = true;
        }

        if (cascade && this.persistentCache.has(key)) {
            this.persistentCache.delete(key);
            deleted = true;
        }

        if (deleted) {
            this.cacheStats.deletes++;
            this.updateMemoryUsage();
        }

        return deleted;
    }

    // Cache warming and preloading
    async warmCache(warmupData) {
        console.log('🔥 Warming up cache with predefined data...');
        
        const promises = [];
        for (const [key, config] of Object.entries(warmupData)) {
            if (typeof config.generator === 'function') {
                promises.push(
                    this.getOrSet(key, config.generator, config.options || {})
                );
            }
        }

        await Promise.all(promises);
        console.log(`✅ Cache warmed with ${promises.length} entries`);
    }

    // Memory management
    async enforceMemoryLimits() {
        if (this.cacheStats.memoryUsage <= this.config.maxMemorySize) {
            return;
        }

        console.log('⚠️ Memory limit reached, performing cleanup...');
        
        // LRU eviction - sort by timestamp and remove oldest
        const entries = Array.from(this.memoryCache.entries())
            .sort(([,a], [,b]) => a.timestamp - b.timestamp);

        let freedMemory = 0;
        const targetReduction = this.cacheStats.memoryUsage - (this.config.maxMemorySize * 0.8);

        for (const [key, entry] of entries) {
            if (freedMemory >= targetReduction) break;
            
            this.memoryCache.delete(key);
            freedMemory += entry.size;
        }

        this.updateMemoryUsage();
        console.log(`🧹 Freed ${Math.round(freedMemory / 1024)}KB of memory`);
    }

    // Compression utilities
    async compress(data) {
        // Simple string compression simulation
        const jsonString = JSON.stringify(data);
        return Buffer.from(jsonString).toString('base64');
    }

    async decompress(compressed) {
        try {
            const jsonString = Buffer.from(compressed, 'base64').toString('utf-8');
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Decompression failed:', error);
            return null;
        }
    }

    // Persistence management
    async loadPersistentCache() {
        try {
            const data = await fs.readFile(this.config.persistenceFile, 'utf-8');
            const cacheData = JSON.parse(data);
            
            for (const [key, entry] of Object.entries(cacheData)) {
                this.persistentCache.set(key, entry);
            }
            
            console.log(`📁 Loaded ${this.persistentCache.size} entries from persistent cache`);
        } catch (error) {
            console.log('📁 No persistent cache found, starting fresh');
        }
    }

    async savePersistentCache() {
        if (!this.config.enablePersistence || this.persistentCache.size === 0) {
            return;
        }

        try {
            const cacheData = Object.fromEntries(this.persistentCache);
            await fs.writeFile(
                this.config.persistenceFile, 
                JSON.stringify(cacheData, null, 2)
            );
            
            console.log(`💾 Saved ${this.persistentCache.size} entries to persistent cache`);
        } catch (error) {
            console.error('Failed to save persistent cache:', error);
        }
    }

    // Cleanup and maintenance
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.performCleanup();
        }, this.config.cleanupInterval);
    }

    startPersistenceTimer() {
        if (!this.config.enablePersistence) return;
        
        // Save persistent cache every 10 minutes
        this.persistenceTimer = setInterval(() => {
            this.savePersistentCache();
        }, 600000);
    }

    async performCleanup() {
        const now = Date.now();
        let cleaned = 0;

        // Clean memory cache
        for (const [key, entry] of this.memoryCache.entries()) {
            if (now > (entry.timestamp + entry.ttl)) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        // Clean persistent cache
        for (const [key, entry] of this.persistentCache.entries()) {
            if (now > (entry.timestamp + entry.ttl)) {
                this.persistentCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
            this.updateMemoryUsage();
        }

        this.cacheStats.lastCleanup = now;
    }

    // Utility methods
    calculateSize(data) {
        return JSON.stringify(data).length * 2; // Rough estimate
    }

    updateMemoryUsage() {
        let totalSize = 0;
        
        for (const entry of this.memoryCache.values()) {
            totalSize += entry.size;
        }
        
        for (const entry of this.persistentCache.values()) {
            totalSize += entry.size;
        }

        this.cacheStats.memoryUsage = totalSize;
    }

    // Statistics and monitoring
    getStats() {
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
            ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this.cacheStats,
            hitRate: `${hitRate}%`,
            memoryUsageMB: Math.round(this.cacheStats.memoryUsage / 1024 / 1024),
            memoryCacheSize: this.memoryCache.size,
            persistentCacheSize: this.persistentCache.size,
            totalEntries: this.memoryCache.size + this.persistentCache.size,
            uptimeMinutes: Math.round((Date.now() - this.cacheStats.lastCleanup) / 60000)
        };
    }

    // Health check
    async healthCheck() {
        const stats = this.getStats();
        
        return {
            status: 'healthy',
            cache: {
                operational: true,
                hitRate: stats.hitRate,
                memoryUsage: stats.memoryUsageMB,
                totalEntries: stats.totalEntries
            },
            recommendations: this.generateRecommendations(stats)
        };
    }

    generateRecommendations(stats) {
        const recommendations = [];
        
        if (parseFloat(stats.hitRate) < 50) {
            recommendations.push({
                type: 'performance',
                message: 'Low cache hit rate detected. Consider increasing TTL or warming cache.',
                priority: 'medium'
            });
        }

        if (stats.memoryUsageMB > this.config.maxMemorySize / 1024 / 1024 * 0.8) {
            recommendations.push({
                type: 'memory',
                message: 'Cache memory usage is high. Consider increasing cleanup frequency.',
                priority: 'high'
            });
        }

        if (stats.totalEntries > 10000) {
            recommendations.push({
                type: 'scaling',
                message: 'Large number of cache entries. Consider implementing cache partitioning.',
                priority: 'low'
            });
        }

        return recommendations;
    }

    // Graceful shutdown
    async shutdown() {
        console.log('🛑 Shutting down cache system...');
        
        // Clear timers
        if (this.cleanupTimer) clearInterval(this.cleanupTimer);
        if (this.persistenceTimer) clearInterval(this.persistenceTimer);

        // Save persistent cache
        await this.savePersistentCache();
        
        console.log('✅ Cache system shutdown complete');
    }
}

// Export singleton instance
export const cacheManager = new CacheManager();
export default CacheManager;
