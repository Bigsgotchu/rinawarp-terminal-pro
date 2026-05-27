import electron from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { MetricType, MetricEvent } from './metrics-events.js'

type ElectronRuntime = {
  app?: {
    getPath(name: 'userData'): string
  }
}

function getMetricsDataDir(): string {
  const runtime = electron as unknown as ElectronRuntime
  return runtime.app?.getPath('userData') ?? path.join(os.tmpdir(), 'rinawarp-terminal-pro-metrics')
}

export class MetricsStore {
  private static instance: MetricsStore
  private events: MetricEvent[] = []
  private readonly maxEventsInMemory = 10000
  private readonly dataDir: string
  private readonly metricsFile: string

  private constructor() {
    this.dataDir = getMetricsDataDir()
    this.metricsFile = path.join(this.dataDir, 'metrics.json')
    this.load()
  }

  public static getInstance(): MetricsStore {
    if (!MetricsStore.instance) {
      MetricsStore.instance = new MetricsStore()
    }
    return MetricsStore.instance
  }

  public static record(event: MetricEvent | Omit<MetricEvent, 'timestamp'>) {
    MetricsStore.getInstance().record(event)
  }

  public static recordIncrement(type: MetricType, labels?: Record<string, string>) {
    MetricsStore.getInstance().recordIncrement(type, labels)
  }

  public static recordValue(type: MetricType, value: number, labels?: Record<string, string>) {
    MetricsStore.getInstance().recordValue(type, value, labels)
  }

  public static getEvents(type?: MetricType, startTime?: number, endTime?: number): MetricEvent[] {
    return MetricsStore.getInstance().getEvents(type, startTime, endTime)
  }

  public static clear() {
    MetricsStore.getInstance().clear()
  }

  private load() {
    try {
      if (fs.existsSync(this.metricsFile)) {
        const data = fs.readFileSync(this.metricsFile, 'utf8')
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed)) {
          this.events = parsed
        }
      }
    } catch (error) {
      console.error('Failed to load metrics store', error)
      this.events = []
    }
  }

  private save() {
    try {
      // Ensure the directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true })
      }
      fs.writeFileSync(this.metricsFile, JSON.stringify(this.events, null, 2), 'utf8')
    } catch (error) {
      console.error('Failed to save metrics store', error)
    }
  }

  public record(event: MetricEvent | Omit<MetricEvent, 'timestamp'>) {
    const metricEvent: MetricEvent = {
      ...event,
      timestamp: 'timestamp' in event ? event.timestamp : Date.now()
    }
    this.events.push(metricEvent)
    // Keep only the most recent events in memory
    if (this.events.length > this.maxEventsInMemory) {
      this.events = this.events.slice(-this.maxEventsInMemory)
    }
    // Periodically save to disk (every 100 events)
    if (this.events.length % 100 === 0) {
      this.save()
    }
  }

  public recordIncrement(type: MetricType, labels?: Record<string, string>) {
    this.record({ type, value: 1, labels })
  }

  public recordValue(type: MetricType, value: number, labels?: Record<string, string>) {
    this.record({ type, value, labels })
  }

  public getEvents(type?: MetricType, startTime?: number, endTime?: number): MetricEvent[] {
    let filtered = this.events
    if (type) {
      filtered = filtered.filter(e => e.type === type)
    }
    if (startTime !== undefined) {
      filtered = filtered.filter(e => e.timestamp >= startTime)
    }
    if (endTime !== undefined) {
      filtered = filtered.filter(e => e.timestamp <= endTime)
    }
    return filtered
  }

  public clear() {
    this.events = []
    this.save()
  }
}

export default MetricsStore
