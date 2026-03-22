/**
 * RinaWarp Analytics Module
 *
 * Privacy-friendly product analytics using PostHog.
 * Tracks user behavior for product improvement.
 */

export type { AnalyticsEvent } from './analytics/core.js'

export {
  flushAnalytics,
  identifyUser,
  initAnalyticsCore,
  setSuperProperties,
  shutdownAnalytics,
  trackEvent,
  trackFeatureFlag,
} from './analytics/core.js'

export { markAnalyticsAppStart, resetFunnelState, trackFunnelStep } from './analytics/funnel.js'

export {
  addSessionTime,
  disableUsageTracking,
  enableUsageTracking,
  getUsageStatus,
  isUsageTrackingEnabled,
  trackAISuggestionUsed,
  trackCommandExecuted,
  trackSelfHealingRun,
  trackTerminalSessionStart,
} from './analytics/usage.js'

import { initAnalyticsCore } from './analytics/core.js'
import { markAnalyticsAppStart } from './analytics/funnel.js'

export function initAnalytics(): void {
  markAnalyticsAppStart()
  initAnalyticsCore()
}
