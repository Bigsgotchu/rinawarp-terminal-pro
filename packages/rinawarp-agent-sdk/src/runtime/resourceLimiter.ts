/**
 * Resource Limiter - CPU / memory / timeout limits for agent execution
 */

import { ResourceLimits } from '../types/agent.js'

/**
 * Default resource limits
 */
export const DEFAULT_LIMITS: Required<ResourceLimits> = {
  timeoutMs: 30000,
  maxMemoryBytes: 256 * 1024 * 1024, // 256MB
  maxCpuPercent: 80,
  maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
  maxFiles: 1000,
  maxNetworkRequests: 100,
}

/**
 * Resource tracker for monitoring usage
 */
export class ResourceTracker {
  private startTime: number
  private memoryStart: number
  private cpuStart: number
  private networkRequests: number = 0

  constructor() {
    this.startTime = Date.now()
    this.memoryStart = this.getMemoryUsage()
    this.cpuStart = this.getCpuUsage()
  }

  private getMemoryUsage(): number {
    // Note: In Node.js, we can't get exact memory usage easily
    // This is an approximation
    if (process.memoryUsage) {
      return process.memoryUsage().heapUsed
    }
    return 0
  }

  private getCpuUsage(): number {
    // CPU usage tracking would require platform-specific code
    // For now, return placeholder
    return 0
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedMs(): number {
    return Date.now() - this.startTime
  }

  /**
   * Get current memory usage
   */
  getMemoryUsed(): number {
    return this.getMemoryUsage() - this.memoryStart
  }

  /**
   * Get CPU usage percentage (approximate)
   */
  getCpuUsed(): number {
    return this.getCpuUsage() - this.cpuStart
  }

  /**
   * Increment network request counter
   */
  incrementNetworkRequests(): void {
    this.networkRequests++
  }

  /**
   * Get network request count
   */
  getNetworkRequests(): number {
    return this.networkRequests
  }

  /**
   * Reset counters
   */
  reset(): void {
    this.startTime = Date.now()
    this.memoryStart = this.getMemoryUsage()
    this.cpuStart = this.getCpuUsage()
    this.networkRequests = 0
  }
}

/**
 * Check if resource limits are exceeded
 */
export function checkResourceLimits(
  tracker: ResourceTracker,
  limits: Required<ResourceLimits>
): { exceeded: boolean; reason?: string } {
  // Check timeout
  if (tracker.getElapsedMs() > limits.timeoutMs) {
    return { exceeded: true, reason: `Timeout: ${tracker.getElapsedMs()}ms > ${limits.timeoutMs}ms` }
  }

  // Check memory
  const memoryUsed = tracker.getMemoryUsed()
  if (memoryUsed > limits.maxMemoryBytes) {
    return { exceeded: true, reason: `Memory: ${memoryUsed} bytes > ${limits.maxMemoryBytes} bytes` }
  }

  // Check network requests
  if (tracker.getNetworkRequests() > limits.maxNetworkRequests) {
    return {
      exceeded: true,
      reason: `Network requests: ${tracker.getNetworkRequests()} > ${limits.maxNetworkRequests}`,
    }
  }

  return { exceeded: false }
}

/**
 * Create resource limits from options
 */
export function createResourceLimits(options?: Partial<ResourceLimits>): Required<ResourceLimits> {
  return {
    timeoutMs: options?.timeoutMs ?? DEFAULT_LIMITS.timeoutMs,
    maxMemoryBytes: options?.maxMemoryBytes ?? DEFAULT_LIMITS.maxMemoryBytes,
    maxCpuPercent: options?.maxCpuPercent ?? DEFAULT_LIMITS.maxCpuPercent,
    maxFileSizeBytes: options?.maxFileSizeBytes ?? DEFAULT_LIMITS.maxFileSizeBytes,
    maxFiles: options?.maxFiles ?? DEFAULT_LIMITS.maxFiles,
    maxNetworkRequests: options?.maxNetworkRequests ?? DEFAULT_LIMITS.maxNetworkRequests,
  }
}

/**
 * Validate file size against limits
 */
export function validateFileSize(size: number, limits: Required<ResourceLimits>): boolean {
  return size <= limits.maxFileSizeBytes
}

/**
 * Validate file count against limits
 */
export function validateFileCount(count: number, limits: Required<ResourceLimits>): boolean {
  return count <= limits.maxFiles
}

export default {
  DEFAULT_LIMITS,
  ResourceTracker,
  checkResourceLimits,
  createResourceLimits,
  validateFileSize,
  validateFileCount,
}
