/**
 * RinaWarp Analytics Module
 * 
 * Privacy-friendly product analytics using PostHog.
 * Tracks user behavior for product improvement.
 * 
 * Features:
 * - Anonymous user tracking (no PII)
 * - Automatic session tracking
 * - Feature usage analytics
 * - Revenue funnel tracking
 * 
 * Environment:
 * - POSTHOG_API_KEY: Your PostHog API key
 * - POSTHOG_HOST: PostHog host (default: https://app.posthog.com)
 * - RINAWARP_ANALYTICS_DISABLED: Set to 'true' to disable tracking
 */

import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

// Configuration - uses RINAWARP_ prefix to match project conventions
const POSTHOG_API_KEY = process.env.RINAWARP_POSTHOG_KEY || process.env.POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.RINAWARP_POSTHOG_HOST || process.env.POSTHOG_HOST || 'https://app.posthog.com';
const ANALYTICS_DISABLED = process.env.RINAWARP_ANALYTICS_DISABLED === 'true' || process.env.RINAWARP_ANALYTICS_DISABLED === '1' || !POSTHOG_API_KEY;

// Device ID storage
function getDeviceId(): string {
  const userDataPath = app?.getPath?.('userData') || '.';
  const deviceIdPath = path.join(userDataPath, 'analytics-device-id.txt');
  
  try {
    if (fs.existsSync(deviceIdPath)) {
      return fs.readFileSync(deviceIdPath, 'utf8').trim();
    }
    // Generate new device ID
    const crypto = require('node:crypto');
    const deviceId = crypto.randomUUID();
    fs.mkdirSync(path.dirname(deviceIdPath), { recursive: true });
    fs.writeFileSync(deviceIdPath, deviceId, 'utf8');
    return deviceId;
  } catch {
    return 'unknown-device';
  }
}

// PostHog instance (lazy initialized). Optional at runtime.
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
        flushAt: 1,
        flushInterval: 0,
        enable: true,
      });
    } catch (error) {
      console.error('[Analytics] Failed to initialize PostHog:', error);
      return null;
    }
  }
  
  return posthog;
}

// Event types
export type AnalyticsEvent =
  | 'app_started'
  | 'app_closed'
  | 'terminal_session_start'
  | 'terminal_session_end'
  | 'command_executed'
  | 'command_blocked'
  | 'ai_suggestion_shown'
  | 'ai_suggestion_accepted'
  | 'ai_suggestion_rejected'
  | 'error_recovered'
  | 'settings_opened'
  | 'settings_changed'
  | 'login_success'
  | 'login_failed'
  | 'signup_success'
  | 'subscription_started'
  | 'subscription_failed'
  | 'feature_flag_evaluated'
  | 'daemon_started'
  | 'daemon_stopped'
  | 'agent_run_completed'
  | 'agent_run_failed'
  | 'self_heal_success'
  | 'self_heal_failed'
  // Conversion funnel events
  | 'funnel_signup'
  | 'funnel_first_run'
  | 'funnel_first_block'
  | 'funnel_upgrade_view'
  | 'funnel_paid'
  // Metered usage events
  | 'usage_tracking_enabled'
  | 'ai_suggestion_used'
  | 'self_healing_run'
  | 'terminal_session_tracked';

/**
 * Track an analytics event
 */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>
): void {
  const ph = getPostHog();
  if (!ph) return;
  
  try {
    ph.capture({
      distinctId: getDeviceId(),
      event,
      properties: {
        ...properties,
        // Add context
        app_version: app?.getVersion?.() || 'unknown',
        platform: process.platform,
        node_version: process.version,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[Analytics] Failed to track event:', event, error);
  }
}

/**
 * Track a user identification (for logged-in users)
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  const ph = getPostHog();
  if (!ph) return;
  
  try {
    ph.identify({
      distinctId: getDeviceId(),
      userId,
      properties: traits,
    });
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error);
  }
}

/**
 * Set super properties (included in all events)
 */
export function setSuperProperties(properties: Record<string, unknown>): void {
  const ph = getPostHog();
  if (!ph) return;
  
  try {
    ph.register({
      ...properties,
      app_version: app?.getVersion?.() || 'unknown',
      platform: process.platform,
    });
  } catch (error) {
    console.error('[Analytics] Failed to set super properties:', error);
  }
}

/**
 * Track a feature flag evaluation
 */
export function trackFeatureFlag(flagName: string, flagValue: unknown): void {
  trackEvent('feature_flag_evaluated', {
    flag_name: flagName,
    flag_value: String(flagValue),
  });
}

/**
 * Flush all pending events
 */
export async function flushAnalytics(): Promise<void> {
  const ph = getPostHog();
  if (!ph) return;
  
  try {
    await ph.flushAsync();
  } catch (error) {
    console.error('[Analytics] Failed to flush:', error);
  }
}

/**
 * Shutdown analytics (call on app quit)
 */
export async function shutdownAnalytics(): Promise<void> {
  await flushAnalytics();
  
  const ph = getPostHog();
  if (ph) {
    ph.shutdown();
    posthog = null;
  }
}

// Funnel state (tracked locally to avoid duplicate events)
const funnelStepToKey: Record<string, keyof typeof funnelState> = {
  signup: 'signupTracked',
  first_run: 'firstRunTracked',
  first_block: 'firstBlockTracked',
  upgrade_view: 'upgradeViewTracked',
  paid: 'paidTracked',
};

let funnelState = {
  signupTracked: false,
  firstRunTracked: false,
  firstBlockTracked: false,
  upgradeViewTracked: false,
  paidTracked: false,
};

type FunnelStep = 'signup' | 'first_run' | 'first_block' | 'upgrade_view' | 'paid';

/**
 * Track conversion funnel step
 * These events track the user journey from signup to paid
 */
export function trackFunnelStep(
  step: FunnelStep,
  properties?: Record<string, unknown>
): void {
  const eventMap: Record<FunnelStep, AnalyticsEvent> = {
    signup: 'funnel_signup',
    first_run: 'funnel_first_run',
    first_block: 'funnel_first_block',
    upgrade_view: 'funnel_upgrade_view',
    paid: 'funnel_paid',
  };
  
  // Check if already tracked (prevent duplicates)
  const stateKey = funnelStepToKey[step];
  if (funnelState[stateKey]) {
    return;
  }
  
  // Mark as tracked
  funnelState[stateKey] = true;
  
  // Track the event
  trackEvent(eventMap[step], {
    ...properties,
    funnel_step: step,
    funnel_order: ['signup', 'first_run', 'first_block', 'upgrade_view', 'paid'].indexOf(step) + 1,
  });
}

/**
 * Reset funnel state (for new user)
 */
export function resetFunnelState(): void {
  funnelState = {
    signupTracked: false,
    firstRunTracked: false,
    firstBlockTracked: false,
    upgradeViewTracked: false,
    paidTracked: false,
  };
}

// Default super properties
export function initAnalytics(): void {
  if (ANALYTICS_DISABLED) {
    console.log('[Analytics] Analytics disabled (no POSTHOG_API_KEY set)');
    return;
  }
  
  console.log('[Analytics] Initialized with device ID:', getDeviceId().slice(0, 8) + '...');
  
  setSuperProperties({
    app_name: 'RinaWarp Terminal Pro',
    app_version: app?.getVersion?.() || 'unknown',
    platform: process.platform,
    arch: process.arch,
  });
  
  // Track app start
  trackEvent('app_started');
}

// ============================================================
// Metered Usage Tracking (Opt-in)
// ============================================================
// Tracks usage metrics for free tier to create upgrade urgency

interface UsageMetrics {
  commandsExecuted: number;
  aiSuggestionsUsed: number;
  selfHealingRuns: number;
  terminalSessions: number;
  totalSessionTimeMs: number;
}

const DEFAULT_USAGE: UsageMetrics = {
  commandsExecuted: 0,
  aiSuggestionsUsed: 0,
  selfHealingRuns: 0,
  terminalSessions: 0,
  totalSessionTimeMs: 0,
};

let usageMetrics: UsageMetrics = { ...DEFAULT_USAGE };
let usageTrackingEnabled = false;

// Free tier limits (create upgrade urgency)
const FREE_TIER_LIMITS = {
  commandsExecuted: 100,
  aiSuggestionsUsed: 20,
  selfHealingRuns: 10,
  terminalSessions: 50,
  totalSessionTimeMs: 3600000, // 1 hour
};

/**
 * Check if usage tracking is enabled
 */
export function isUsageTrackingEnabled(): boolean {
  return usageTrackingEnabled;
}

/**
 * Enable usage tracking (opt-in for free tier)
 */
export function enableUsageTracking(): void {
  usageTrackingEnabled = true;
  trackEvent('usage_tracking_enabled');
}

/**
 * Disable usage tracking
 */
export function disableUsageTracking(): void {
  usageTrackingEnabled = false;
}

/**
 * Check if user is approaching free tier limits
 */
export function getUsageStatus(): {
  approachingLimit: boolean;
  atLimit: boolean;
  limits: typeof FREE_TIER_LIMITS;
  usage: UsageMetrics;
  usagePercent: Record<keyof UsageMetrics, number>;
} {
  const usagePercent: Record<keyof UsageMetrics, number> = {
    commandsExecuted: Math.min(100, (usageMetrics.commandsExecuted / FREE_TIER_LIMITS.commandsExecuted) * 100),
    aiSuggestionsUsed: Math.min(100, (usageMetrics.aiSuggestionsUsed / FREE_TIER_LIMITS.aiSuggestionsUsed) * 100),
    selfHealingRuns: Math.min(100, (usageMetrics.selfHealingRuns / FREE_TIER_LIMITS.selfHealingRuns) * 100),
    terminalSessions: Math.min(100, (usageMetrics.terminalSessions / FREE_TIER_LIMITS.terminalSessions) * 100),
    totalSessionTimeMs: Math.min(100, (usageMetrics.totalSessionTimeMs / FREE_TIER_LIMITS.totalSessionTimeMs) * 100),
  };

  const approachingLimit = Object.values(usagePercent).some(p => p >= 80);
  const atLimit = Object.values(usagePercent).some(p => p >= 100);

  return {
    approachingLimit,
    atLimit,
    limits: FREE_TIER_LIMITS,
    usage: { ...usageMetrics },
    usagePercent,
  };
}

/**
 * Track command execution (for usage metering)
 */
export function trackCommandExecuted(): void {
  if (!usageTrackingEnabled) return;
  usageMetrics.commandsExecuted += 1;
  
  // Track in PostHog with usage status
  const status = getUsageStatus();
  trackEvent('command_executed', {
    total_commands: usageMetrics.commandsExecuted,
    usage_percent: status.usagePercent.commandsExecuted,
    approaching_limit: status.approachingLimit,
  });
}

/**
 * Track AI suggestion usage (for usage metering)
 */
export function trackAISuggestionUsed(): void {
  if (!usageTrackingEnabled) return;
  usageMetrics.aiSuggestionsUsed += 1;
  
  const status = getUsageStatus();
  trackEvent('ai_suggestion_used', {
    total_suggestions: usageMetrics.aiSuggestionsUsed,
    usage_percent: status.usagePercent.aiSuggestionsUsed,
    approaching_limit: status.approachingLimit,
  });
}

/**
 * Track self-healing run (for usage metering)
 */
export function trackSelfHealingRun(): void {
  if (!usageTrackingEnabled) return;
  usageMetrics.selfHealingRuns += 1;
  
  const status = getUsageStatus();
  trackEvent('self_healing_run', {
    total_runs: usageMetrics.selfHealingRuns,
    usage_percent: status.usagePercent.selfHealingRuns,
    approaching_limit: status.approachingLimit,
  });
}

/**
 * Track terminal session start (for usage metering)
 */
export function trackTerminalSessionStart(): void {
  if (!usageTrackingEnabled) return;
  usageMetrics.terminalSessions += 1;
  
  const status = getUsageStatus();
  trackEvent('terminal_session_tracked', {
    total_sessions: usageMetrics.terminalSessions,
    usage_percent: status.usagePercent.terminalSessions,
    approaching_limit: status.approachingLimit,
  });
}

/**
 * Add session time (for usage metering)
 */
export function addSessionTime(ms: number): void {
  if (!usageTrackingEnabled) return;
  usageMetrics.totalSessionTimeMs += ms;
}
