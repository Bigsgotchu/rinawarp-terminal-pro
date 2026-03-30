import * as vscode from 'vscode';

import { getConfig } from './config';

const ENTITLEMENT_KEY = 'rinawarp.entitlementSnapshot';
const TOKEN_KEY = 'rinawarp.sessionToken';

export type PlanTier = 'free' | 'pro' | 'team';
export type EntitlementRefreshStatus = 'idle' | 'refreshing' | 'failed';
export type EntitlementRefreshFailureCode =
  | 'missing_token'
  | 'auth_rejected'
  | 'endpoint_unavailable'
  | 'malformed_response';

export interface EntitlementSnapshot {
  email?: string;
  plan: PlanTier;
  packs: string[];
  updatedAt: string;
  refreshStatus?: EntitlementRefreshStatus;
  lastRefreshAttemptAt?: string;
  lastRefreshError?: string;
}

interface StoredEntitlementSnapshot {
  email?: string;
  plan: PlanTier;
  packs: string[];
  updatedAt: string;
}

interface ParsedEntitlementPayload {
  email?: string;
  packs?: string[];
  plan?: PlanTier;
  updatedAt?: string;
}

export class EntitlementRefreshError extends Error {
  constructor(
    public readonly code: EntitlementRefreshFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'EntitlementRefreshError';
  }
}

export interface EntitlementRefreshFailureDetails {
  code: EntitlementRefreshFailureCode;
  message: string;
  recoveryHint: string;
}

export class EntitlementService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async getSnapshot(): Promise<EntitlementSnapshot> {
    const raw = await this.context.secrets.get(ENTITLEMENT_KEY);
    if (!raw) {
      return defaultSnapshot();
    }

    try {
      return hydrateSnapshot(JSON.parse(raw) as Partial<StoredEntitlementSnapshot>);
    } catch {
      return defaultSnapshot();
    }
  }

  async setSessionToken(token: string): Promise<void> {
    await this.context.secrets.store(TOKEN_KEY, token);
  }

  async getSessionToken(): Promise<string | undefined> {
    return this.context.secrets.get(TOKEN_KEY);
  }

  async setSnapshot(snapshot: EntitlementSnapshot): Promise<void> {
    await this.context.secrets.store(ENTITLEMENT_KEY, JSON.stringify(stripRefreshMetadata(snapshot)));
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.context.secrets.delete(ENTITLEMENT_KEY),
      this.context.secrets.delete(TOKEN_KEY),
    ]);
  }

  async refreshFromApi(): Promise<EntitlementSnapshot> {
    const token = await this.context.secrets.get(TOKEN_KEY);
    if (!token) {
      throw new EntitlementRefreshError(
        'missing_token',
        'Connect your RinaWarp account before refreshing entitlements.',
      );
    }

    const config = getConfig();
    const json = await fetchEntitlements(config, token);
    const snapshot = hydrateSnapshot({
      email: json.email,
      plan: json.plan,
      packs: json.packs,
      updatedAt: json.updatedAt ?? new Date().toISOString(),
    });
    await this.setSnapshot(snapshot);
    return snapshot;
  }
}

export function defaultSnapshot(): EntitlementSnapshot {
  return hydrateSnapshot({
    plan: 'free',
    packs: [],
    updatedAt: new Date(0).toISOString(),
  });
}

export function markEntitlementRefreshing(snapshot: EntitlementSnapshot, attemptedAt: string): EntitlementSnapshot {
  return {
    ...snapshot,
    refreshStatus: 'refreshing',
    lastRefreshAttemptAt: attemptedAt,
    lastRefreshError: undefined,
  };
}

export function markEntitlementRefreshSuccess(snapshot: EntitlementSnapshot, attemptedAt: string): EntitlementSnapshot {
  return {
    ...snapshot,
    refreshStatus: 'idle',
    lastRefreshAttemptAt: attemptedAt,
    lastRefreshError: undefined,
  };
}

export function markEntitlementRefreshFailure(
  snapshot: EntitlementSnapshot,
  attemptedAt: string,
  errorMessage: string,
): EntitlementSnapshot {
  return {
    ...snapshot,
    refreshStatus: 'failed',
    lastRefreshAttemptAt: attemptedAt,
    lastRefreshError: errorMessage,
  };
}

export function describeEntitlementRefreshError(error: unknown): EntitlementRefreshFailureDetails {
  if (error instanceof EntitlementRefreshError) {
    switch (error.code) {
      case 'missing_token':
        return {
          code: error.code,
          message: 'Connect your account to refresh entitlements.',
          recoveryHint: 'Reconnect your RinaWarp account, then try refresh again.',
        };
      case 'auth_rejected':
        return {
          code: error.code,
          message: 'Your saved RinaWarp session is no longer accepted.',
          recoveryHint: 'Reconnect your account to restore access.',
        };
      case 'endpoint_unavailable':
        return {
          code: error.code,
          message: 'RinaWarp could not reach the entitlement service.',
          recoveryHint: 'Retry in a moment. If this keeps happening, check your network or service status.',
        };
      case 'malformed_response':
        return {
          code: error.code,
          message: 'RinaWarp received an unexpected entitlement response.',
          recoveryHint: 'Retry in a moment. If it keeps happening, reconnect your account or contact support.',
        };
    }
  }

  return {
    code: 'endpoint_unavailable',
    message: 'RinaWarp could not verify entitlements right now.',
    recoveryHint: 'Retry in a moment. If this keeps happening, reconnect your account.',
  };
}

export function mergeEntitlementSnapshot(
  current: EntitlementSnapshot,
  next: Partial<EntitlementSnapshot>,
): EntitlementSnapshot {
  return hydrateSnapshot({
    email: next.email ?? current.email,
    plan: next.plan ?? current.plan,
    packs: next.packs ?? current.packs,
    updatedAt: next.updatedAt ?? current.updatedAt,
  });
}

function hydrateSnapshot(snapshot: Partial<StoredEntitlementSnapshot>): EntitlementSnapshot {
  return {
    email: snapshot.email,
    plan: normalizePlan(snapshot.plan),
    packs: Array.isArray(snapshot.packs) ? snapshot.packs.filter((pack): pack is string => typeof pack === 'string') : [],
    updatedAt: typeof snapshot.updatedAt === 'string' ? snapshot.updatedAt : new Date(0).toISOString(),
    refreshStatus: 'idle',
    lastRefreshAttemptAt: undefined,
    lastRefreshError: undefined,
  };
}

function stripRefreshMetadata(snapshot: EntitlementSnapshot): StoredEntitlementSnapshot {
  return {
    email: snapshot.email,
    plan: snapshot.plan,
    packs: snapshot.packs,
    updatedAt: snapshot.updatedAt,
  };
}

async function fetchEntitlements(
  config: ReturnType<typeof getConfig>,
  token: string,
): Promise<ParsedEntitlementPayload> {
  const candidates = [
    `${config.apiBaseUrl}/v1/extension/entitlements`,
    `${config.baseUrl}/api/vscode/entitlements`,
  ];

  let lastError: Error | undefined;
  for (const url of dedupe(candidates)) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new EntitlementRefreshError(
            'auth_rejected',
            `Entitlement refresh was rejected with status ${response.status} at ${url}`,
          );
        }

        lastError = new EntitlementRefreshError(
          'endpoint_unavailable',
          `Entitlement refresh failed with status ${response.status} at ${url}`,
        );
        continue;
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        lastError = new EntitlementRefreshError(
          'malformed_response',
          `Entitlement refresh returned invalid JSON at ${url}`,
        );
        continue;
      }

      const normalizedPayload = parseEntitlementPayload(json);
      if (!normalizedPayload) {
        lastError = new EntitlementRefreshError(
          'malformed_response',
          `Entitlement refresh returned an unexpected payload at ${url}`,
        );
        continue;
      }

      return normalizedPayload;
    } catch (error) {
      if (error instanceof EntitlementRefreshError) {
        throw error;
      }

      lastError = new EntitlementRefreshError(
        'endpoint_unavailable',
        error instanceof Error ? error.message : 'Unknown entitlement fetch error',
      );
    }
  }

  throw lastError ?? new EntitlementRefreshError('endpoint_unavailable', 'No entitlement endpoint was available');
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizePlan(value: unknown): PlanTier {
  if (value === 'pro' || value === 'team') {
    return value;
  }
  return 'free';
}

function isEntitlementPayload(value: unknown): value is Partial<StoredEntitlementSnapshot> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const emailValid = payload.email === undefined || typeof payload.email === 'string';
  const planValid = payload.plan === undefined || payload.plan === 'free' || payload.plan === 'pro' || payload.plan === 'team';
  const packsValid = payload.packs === undefined
    || (Array.isArray(payload.packs) && payload.packs.every((pack) => typeof pack === 'string'));

  return emailValid && planValid && packsValid;
}

function parseEntitlementPayload(value: unknown): ParsedEntitlementPayload | null {
  const direct = normalizeEntitlementPayloadRecord(value);
  if (direct) {
    return direct;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const nestedCandidates = [record.data, record.entitlements, record.result, record.account];
  for (const candidate of nestedCandidates) {
    const normalized = normalizeEntitlementPayloadRecord(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeEntitlementPayloadRecord(value: unknown): ParsedEntitlementPayload | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const planCandidate = parsePlanCandidate(record.plan ?? record.tier);
  const packsCandidate = normalizePackList(
    record.packs
      ?? record.enabledPacks
      ?? record.capabilityPacks
      ?? record.features,
  );
  const emailCandidate = typeof record.email === 'string'
    ? record.email
    : typeof record.billingEmail === 'string'
      ? record.billingEmail
      : typeof record.userEmail === 'string'
        ? record.userEmail
        : undefined;
  const updatedAtCandidate = typeof record.updatedAt === 'string'
    ? record.updatedAt
    : typeof record.refreshedAt === 'string'
      ? record.refreshedAt
      : typeof record.checkedAt === 'string'
        ? record.checkedAt
        : undefined;

  if (!emailCandidate && !planCandidate && !packsCandidate && !updatedAtCandidate) {
    return null;
  }

  return {
    email: emailCandidate,
    packs: packsCandidate,
    plan: planCandidate,
    updatedAt: updatedAtCandidate,
  };
}

function normalizePackList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((pack): pack is string => typeof pack === 'string');
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => enabled === true)
      .map(([key]) => key);
    if (entries.length > 0) {
      return entries;
    }
  }

  return undefined;
}

function parsePlanCandidate(value: unknown): PlanTier | undefined {
  if (value === 'free' || value === 'pro' || value === 'team') {
    return value;
  }

  return undefined;
}
