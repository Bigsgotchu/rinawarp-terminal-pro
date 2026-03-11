/**
 * RinaWarp Agentd Analytics Module
 * 
 * Server-side analytics for the RinaWarp agent daemon.
 * Tracks:
 * - Plan executions
 * - User sessions
 * - Revenue events
 * - Error rates
 * 
 * Also persists metrics to disk for historical analysis.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Configuration - uses RINAWARP_ prefix to match project conventions
const POSTHOG_API_KEY = process.env.RINAWARP_POSTHOG_KEY || process.env.POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.RINAWARP_POSTHOG_HOST || process.env.POSTHOG_HOST || 'https://app.posthog.com';
const ANALYTICS_DISABLED = process.env.RINAWARP_ANALYTICS_DISABLED === 'true' || process.env.RINAWARP_ANALYTICS_DISABLED === '1' || !POSTHOG_API_KEY;

// Metrics persistence
const METRICS_DIR = process.env.RINAWARP_METRICS_DIR || '.rinawarp/metrics';
const METRICS_FLUSH_INTERVAL_MS = 60_000; // Flush every minute

// In-memory metrics (mirrors server.ts but persisted)
interface PersistentMetrics {
  runs_total: number;
  runs_completed: number;
  runs_failed: number;
  runs_cancelled: number;
  interventions_total: number;
  confirmation_denied_total: number;
  failure_classes: Record<string, number>;
  duration_ms_total: number;
  unblock_runs: number;
  unblock_duration_ms_total: number;
  // Daily counts for historical tracking
  daily: Record<string, {
    runs: number;
    completed: number;
    failed: number;
    revenue_events: number;
    new_users: number;
  }>;
}

const defaultMetrics = (): PersistentMetrics => ({
  runs_total: 0,
  runs_completed: 0,
  runs_failed: 0,
  runs_cancelled: 0,
  interventions_total: 0,
  confirmation_denied_total: 0,
  failure_classes: {},
  duration_ms_total: 0,
  unblock_runs: 0,
  unblock_duration_ms_total: 0,
  daily: {},
});

// Load metrics from disk
function loadMetrics(): PersistentMetrics {
  const metricsPath = path.join(METRICS_DIR, 'metrics.json');
  try {
    if (fs.existsSync(metricsPath)) {
      const data = fs.readFileSync(metricsPath, 'utf8');
      const parsed = JSON.parse(data);
      return { ...defaultMetrics(), ...parsed };
    }
  } catch (error) {
    console.error('[Analytics] Failed to load metrics:', error);
  }
  return defaultMetrics();
}

// Save metrics to disk
function saveMetrics(metrics: PersistentMetrics): void {
  const metricsDir = path.dirname(path.join(METRICS_DIR, 'metrics.json'));
  try {
    fs.mkdirSync(metricsDir, { recursive: true });
    fs.writeFileSync(
      path.join(METRICS_DIR, 'metrics.json'),
      JSON.stringify(metrics, null, 2),
      'utf8'
    );
  } catch (error) {
    console.error('[Analytics] Failed to save metrics:', error);
  }
}

// Current metrics (persisted)
let metrics = loadMetrics();

// PostHog instance (optional at runtime)
let posthog: any | null = null;
let posthogCtor: any | null = null;

function loadPostHogCtor(): any | null {
  if (posthogCtor) return posthogCtor;
  try {
    // Optional dependency: do not hard-fail builds if missing.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('posthog-node');
    posthogCtor = mod?.PostHog || mod?.default || null;
  } catch {
    posthogCtor = null;
  }
  return posthogCtor;
}

function getPostHog(): any | null {
  if (ANALYTICS_DISABLED) {
    return null;
  }
  
  if (!posthog) {
    const PostHog = loadPostHogCtor();
    if (!PostHog) return null;
    try {
      posthog = new PostHog(POSTHOG_API_KEY, {
        host: POSTHOG_HOST,
        flushAt: 10,
        flushInterval: 30_000,
        enable: true,
      });
    } catch (error) {
      console.error('[Analytics] Failed to initialize PostHog:', error);
      return null;
    }
  }
  
  return posthog;
}

// Get today's date key
function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

// Ensure today's daily bucket exists
function ensureDailyBucket(): void {
  const key = todayKey();
  if (!metrics.daily[key]) {
    metrics.daily[key] = {
      runs: 0,
      completed: 0,
      failed: 0,
      revenue_events: 0,
      new_users: 0,
    };
  }
}

// Server-side event types
export type ServerEvent =
  | 'daemon_started'
  | 'daemon_stopped'
  | 'plan_execution_start'
  | 'plan_execution_complete'
  | 'plan_execution_failed'
  | 'plan_execution_cancelled'
  | 'step_executed'
  | 'step_failed'
  | 'confirmation_requested'
  | 'confirmation_denied'
  | 'self_heal_attempt'
  | 'self_heal_success'
  | 'self_heal_failed'
  | 'user_login'
  | 'user_logout'
  | 'workspace_created'
  | 'invite_sent'
  | 'invite_accepted'
  | 'subscription_created'
  | 'subscription_failed'
  | 'api_request'
  | 'api_error'
  // Conversion funnel events
  | 'funnel_signup'
  | 'funnel_first_run'
  | 'funnel_first_block'
  | 'funnel_upgrade_view'
  | 'funnel_paid';

/**
 * Track a server-side event
 */
export function trackServerEvent(
  event: ServerEvent,
  properties?: Record<string, unknown>
): void {
  const ph = getPostHog();
  const eventId = randomUUID();
  
  // Always update local metrics
  updateLocalMetrics(event, properties);
  
  // Send to PostHog if available
  if (ph) {
    try {
      ph.capture({
        distinctId: String(properties?.user_id || 'anonymous'),
        event: `agentd_${event}`,
        properties: {
          ...properties,
          event_id: eventId,
          timestamp: new Date().toISOString(),
          service: 'agentd',
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[Analytics] Failed to track server event:', event, error);
    }
  }
}

/**
 * Update local metrics based on event
 */
function updateLocalMetrics(event: ServerEvent, properties?: Record<string, unknown>): void {
  ensureDailyBucket();
  const today = todayKey();
  
  switch (event) {
    case 'plan_execution_start':
      metrics.runs_total += 1;
      metrics.daily[today].runs += 1;
      break;
    case 'plan_execution_complete':
      metrics.runs_completed += 1;
      metrics.daily[today].completed += 1;
      break;
    case 'plan_execution_failed':
      metrics.runs_failed += 1;
      metrics.daily[today].failed += 1;
      break;
    case 'plan_execution_cancelled':
      metrics.runs_cancelled += 1;
      break;
    case 'confirmation_requested':
      metrics.interventions_total += 1;
      break;
    case 'confirmation_denied':
      metrics.confirmation_denied_total += 1;
      break;
    case 'self_heal_success':
      metrics.unblock_runs += 1;
      break;
    case 'subscription_created':
      metrics.daily[today].revenue_events += 1;
      break;
    case 'user_login':
    case 'workspace_created':
      metrics.daily[today].new_users += 1;
      break;
    // Funnel events - track in daily metrics
    case 'funnel_signup':
    case 'funnel_first_run':
    case 'funnel_first_block':
    case 'funnel_upgrade_view':
    case 'funnel_paid':
      // Funnel events are tracked for conversion analysis
      break;
  }
  
  // Track duration if provided
  if (properties?.duration_ms) {
    metrics.duration_ms_total += Number(properties.duration_ms);
    if (event === 'self_heal_success') {
      metrics.unblock_duration_ms_total += Number(properties.duration_ms);
    }
  }
  
  // Track failure class
  if (properties?.failure_class && (event === 'plan_execution_failed' || event === 'step_failed')) {
    const fc = String(properties.failure_class);
    metrics.failure_classes[fc] = (metrics.failure_classes[fc] || 0) + 1;
  }
  
  // Persist to disk
  saveMetrics(metrics);
}

/**
 * Increment a counter metric
 */
export function incCounter(name: string, value = 1): void {
  ensureDailyBucket();
  const today = todayKey();
  
  switch (name) {
    case 'runs_total':
      metrics.runs_total += value;
      metrics.daily[today].runs += value;
      break;
    case 'runs_completed':
      metrics.runs_completed += value;
      metrics.daily[today].completed += value;
      break;
    case 'runs_failed':
      metrics.runs_failed += value;
      metrics.daily[today].failed += value;
      break;
    case 'interventions':
      metrics.interventions_total += value;
      break;
    case 'confirmations_denied':
      metrics.confirmation_denied_total += value;
      break;
    case 'unblock_runs':
      metrics.unblock_runs += value;
      break;
    case 'revenue_events':
      metrics.daily[today].revenue_events += value;
      break;
    case 'new_users':
      metrics.daily[today].new_users += value;
      break;
  }
  
  saveMetrics(metrics);
}

/**
 * Add to a duration metric
 */
export function addDuration(name: string, ms: number): void {
  switch (name) {
    case 'total':
      metrics.duration_ms_total += ms;
      break;
    case 'unblock':
      metrics.unblock_duration_ms_total += ms;
      break;
  }
  saveMetrics(metrics);
}

/**
 * Get current metrics
 */
export function getMetrics(): PersistentMetrics & {
  completion_rate: number;
  avg_duration_ms: number;
  mttr_unblock_ms: number;
} {
  const completedOrFailed = metrics.runs_completed + metrics.runs_failed;
  const completionRate = completedOrFailed === 0 ? 0 : metrics.runs_completed / completedOrFailed;
  const avgDurationMs = metrics.runs_total === 0 ? 0 : Math.round(metrics.duration_ms_total / metrics.runs_total);
  const mttrUnblockMs = metrics.unblock_runs === 0 ? 0 : Math.round(metrics.unblock_duration_ms_total / metrics.unblock_runs);
  
  return {
    ...metrics,
    completion_rate: completionRate,
    avg_duration_ms: avgDurationMs,
    mttr_unblock_ms: mttrUnblockMs,
  };
}

/**
 * Get daily metrics for a date range
 */
export function getDailyMetrics(from?: string, to?: string): Array<{
  date: string;
  runs: number;
  completed: number;
  failed: number;
  revenue_events: number;
  new_users: number;
}> {
  const fromDate = from || todayKey();
  const toDate = to || todayKey();
  
  return Object.entries(metrics.daily)
    .filter(([date]) => date >= fromDate && date <= toDate)
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Flush analytics
 */
export async function flushAnalytics(): Promise<void> {
  const ph = getPostHog();
  if (ph) {
    await ph.flushAsync();
  }
  saveMetrics(metrics);
}

/**
 * Shutdown analytics
 */
export async function shutdownAnalytics(): Promise<void> {
  await flushAnalytics();
  
  const ph = getPostHog();
  if (ph) {
    ph.shutdown();
    posthog = null;
  }
}

// Initialize
export function initAnalytics(): void {
  if (ANALYTICS_DISABLED) {
    console.log('[Analytics] Server analytics disabled (no POSTHOG_API_KEY set)');
  } else {
    console.log('[Analytics] Server analytics initialized');
  }
  
  // Periodic flush
  setInterval(() => {
    saveMetrics(metrics);
  }, METRICS_FLUSH_INTERVAL_MS);
  
  // Track daemon start
  trackServerEvent('daemon_started', {
    version: process.env.npm_package_version || '1.0.0',
    node_version: process.version,
    platform: process.platform,
  });
}
