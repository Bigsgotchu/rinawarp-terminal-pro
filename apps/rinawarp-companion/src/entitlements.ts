import * as vscode from 'vscode';

import { getConfig } from './config';

const ENTITLEMENT_KEY = 'rinawarp.entitlementSnapshot';
const TOKEN_KEY = 'rinawarp.sessionToken';

export type PlanTier = 'free' | 'pro' | 'team';

export interface EntitlementSnapshot {
  email?: string;
  plan: PlanTier;
  packs: string[];
  updatedAt: string;
}

export class EntitlementService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async getSnapshot(): Promise<EntitlementSnapshot> {
    const raw = await this.context.secrets.get(ENTITLEMENT_KEY);
    if (!raw) {
      return defaultSnapshot();
    }

    try {
      return JSON.parse(raw) as EntitlementSnapshot;
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
    await this.context.secrets.store(ENTITLEMENT_KEY, JSON.stringify(snapshot));
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
      return this.getSnapshot();
    }

    const config = getConfig();
    const json = await fetchEntitlements(config, token);
    const snapshot: EntitlementSnapshot = {
      email: json.email,
      plan: normalizePlan(json.plan),
      packs: Array.isArray(json.packs) ? json.packs.filter((pack): pack is string => typeof pack === 'string') : [],
      updatedAt: new Date().toISOString(),
    };
    await this.setSnapshot(snapshot);
    return snapshot;
  }
}

export function defaultSnapshot(): EntitlementSnapshot {
  return {
    plan: 'free',
    packs: [],
    updatedAt: new Date(0).toISOString(),
  };
}

async function fetchEntitlements(
  config: ReturnType<typeof getConfig>,
  token: string,
): Promise<Partial<EntitlementSnapshot>> {
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
        lastError = new Error(`Entitlement refresh failed with status ${response.status} at ${url}`);
        continue;
      }

      return (await response.json()) as Partial<EntitlementSnapshot>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown entitlement fetch error');
    }
  }

  throw lastError ?? new Error('No entitlement endpoint was available');
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
