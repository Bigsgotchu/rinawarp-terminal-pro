import {
  describeEntitlementRefreshError,
  markEntitlementRefreshFailure,
  markEntitlementRefreshing,
  markEntitlementRefreshSuccess,
  mergeEntitlementSnapshot,
  type EntitlementRefreshFailureCode,
  type EntitlementService,
  type EntitlementSnapshot,
} from './entitlements';

export type EntitlementRefreshSource = 'manual' | 'auth-callback' | 'purchase-complete';
export type RefreshToastSeverity = 'info' | 'warning';

export interface EntitlementRefreshResult {
  ok: boolean;
  ignored?: boolean;
  snapshot: EntitlementSnapshot;
  severity: RefreshToastSeverity;
  toastMessage: string;
  failureCode?: EntitlementRefreshFailureCode;
}

interface RunEntitlementRefreshOptions {
  source: EntitlementRefreshSource;
  entitlements: EntitlementService;
  getSnapshot: () => EntitlementSnapshot;
  setSnapshot: (snapshot: EntitlementSnapshot) => void;
  output: { appendLine(line: string): void };
  fallbackSnapshot?: Partial<EntitlementSnapshot>;
}

export async function runEntitlementRefresh(
  options: RunEntitlementRefreshOptions,
): Promise<EntitlementRefreshResult> {
  const current = options.getSnapshot();
  if (current.refreshStatus === 'refreshing') {
    return {
      ok: false,
      ignored: true,
      snapshot: current,
      severity: 'info',
      toastMessage: 'RinaWarp is already refreshing entitlements.',
    };
  }

  const attemptedAt = new Date().toISOString();
  options.setSnapshot(markEntitlementRefreshing(current, attemptedAt));

  try {
    const refreshed = await options.entitlements.refreshFromApi();
    const snapshot = markEntitlementRefreshSuccess(refreshed, attemptedAt);
    options.setSnapshot(snapshot);
    return {
      ok: true,
      snapshot,
      severity: 'info',
      toastMessage: buildSuccessMessage(options.source, snapshot),
    };
  } catch (error) {
    const details = describeEntitlementRefreshError(error);
    const baseSnapshot = options.fallbackSnapshot
      ? mergeEntitlementSnapshot(current, options.fallbackSnapshot)
      : current;
    const snapshot = markEntitlementRefreshFailure(baseSnapshot, attemptedAt, details.message);
    options.setSnapshot(snapshot);
    options.output.appendLine(`[warn] ${details.code}: ${details.message}`);

    return {
      ok: false,
      snapshot,
      severity: 'warning',
      failureCode: details.code,
      toastMessage: buildFailureMessage(options.source, details.message, details.recoveryHint, Boolean(options.fallbackSnapshot)),
    };
  }
}

function buildSuccessMessage(source: EntitlementRefreshSource, snapshot: EntitlementSnapshot): string {
  const plan = snapshot.plan.toUpperCase();
  switch (source) {
    case 'auth-callback':
      return `RinaWarp connected. Plan: ${plan}.`;
    case 'purchase-complete':
      return `RinaWarp purchase confirmed. Plan: ${plan}.`;
    case 'manual':
      return `RinaWarp entitlements refreshed. Plan: ${plan}.`;
  }
}

function buildFailureMessage(
  source: EntitlementRefreshSource,
  message: string,
  recoveryHint: string,
  usedFallbackSnapshot: boolean,
): string {
  if (source === 'auth-callback' && usedFallbackSnapshot) {
    return `RinaWarp connected, but entitlements could not be fully verified yet. ${recoveryHint}`;
  }

  if (source === 'purchase-complete') {
    return `RinaWarp could not verify your updated plan yet. ${recoveryHint}`;
  }

  return `${message} ${recoveryHint}`;
}
