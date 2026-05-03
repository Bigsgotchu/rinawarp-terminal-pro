import fs from "node:fs";
import path from "node:path";
import type { LicenseTier } from "@rinawarp/core/enforcement/index.js";
import type { LicenseVerifyResponse } from "../license.js";
import {
  PLAN_FEATURES,
  hasPlanFeature,
  mapLicenseTierToPlanId,
  normalizeEntitlementStatus,
  type FeatureFlag,
  type PlanId,
} from "../plans.js";

export type LicenseRuntimeState = {
  tier: LicenseTier;
  token: string | null;
  expiresAt: number | null;
  customerId: string | null;
  status: string;
};

export type EntitlementData = {
  tier: LicenseTier;
  token: string | null;
  expiresAt: number | null;
  customerId: string | null;
  verifiedAt: string;
  lastVerifiedAt: string;
  status: string;
};

export function mapApiTierToLicenseTier(apiTier: string): LicenseTier {
  const t = apiTier.trim().toLowerCase();
  if (t === "pro") return "pro";
  if (t === "creator") return "creator";
  if (t === "pioneer") return "pioneer";
  if (t === "founder") return "founder";
  if (t === "enterprise") return "enterprise";
  // Stripe worker currently emits "team" as the top tier.
  if (t === "team") return "enterprise";
  return "starter";
}

const LIFETIME_TIERS: ReadonlySet<LicenseTier> = new Set(["founder", "pioneer"] as const);

export function validateEntitlementExpiry(data: EntitlementData): { ok: boolean; reason?: string } {
  const { tier, expiresAt } = data;

  if (LIFETIME_TIERS.has(tier)) {
    if (expiresAt === null) return { ok: true };
    if (!Number.isFinite(expiresAt)) {
      return { ok: false, reason: "Lifetime tier has non-finite expiresAt" };
    }
    if (Date.now() > expiresAt * 1000) {
      return { ok: false, reason: "Lifetime tier has expired" };
    }
    return { ok: true };
  }

  if (expiresAt === null) {
    return { ok: false, reason: "Subscription tier missing expiresAt" };
  }
  if (!Number.isFinite(expiresAt)) {
    return { ok: false, reason: "Subscription tier has non-finite expiresAt" };
  }
  if (Date.now() > expiresAt * 1000) {
    return { ok: false, reason: "Subscription has expired" };
  }

  return { ok: true };
}

export function isEntitlementStale(data: EntitlementData): boolean {
  if (!data.lastVerifiedAt) return true;
  const lastVerified = Date.parse(data.lastVerifiedAt);
  if (!Number.isFinite(lastVerified)) return true;
  const hoursSinceVerify = (Date.now() - lastVerified) / (1000 * 60 * 60);
  return hoursSinceVerify > 24;
}

export function createLicenseEntitlementRuntime(args: {
  state: LicenseRuntimeState;
  getUserDataPath: () => string;
  isPackaged: () => boolean;
  readJsonIfExists: <T>(p: string) => T | null;
  writeJsonFile: (p: string, value: unknown) => void;
}) {
  const entitlementFile = () => path.join(args.getUserDataPath(), "license-entitlement.json");

  function getCurrentPlanId(): PlanId {
    return mapLicenseTierToPlanId(args.state.tier);
  }

  function getCurrentPlanFeatures(): FeatureFlag[] {
    return PLAN_FEATURES[getCurrentPlanId()];
  }

  function currentPlanHasFeature(feature: FeatureFlag): boolean {
    return hasPlanFeature(getCurrentPlanId(), feature);
  }

  function applyVerifiedLicense(data: LicenseVerifyResponse): LicenseTier {
    const tier = mapApiTierToLicenseTier(data.tier);
    args.state.tier = tier;
    args.state.token = data.license_token ?? null;
    args.state.expiresAt = Number.isFinite(data.expires_at) ? data.expires_at : null;
    args.state.customerId = data.customer_id ?? null;
    args.state.status = data.status ?? "active";
    return tier;
  }

  function resetLicenseToStarter() {
    args.state.tier = "starter";
    args.state.token = null;
    args.state.expiresAt = null;
    args.state.customerId = null;
    args.state.status = "inactive";
  }

  function getLicenseState() {
    return {
      tier: args.state.tier,
      plan_id: getCurrentPlanId(),
      has_token: !!args.state.token,
      expires_at: args.state.expiresAt,
      customer_id: args.state.customerId,
      status: normalizeEntitlementStatus(args.state.status),
      feature_flags: getCurrentPlanFeatures(),
    };
  }

  function getCurrentLicenseCustomerId(): string | null {
    return args.state.customerId;
  }

  function saveEntitlements(): void {
    try {
      const data: EntitlementData = {
        tier: args.state.tier,
        token: args.state.token,
        expiresAt: args.state.expiresAt,
        customerId: args.state.customerId,
        verifiedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        status: args.state.status,
      };
      args.writeJsonFile(entitlementFile(), data);
      if (args.isPackaged()) {
        console.log("[license] Entitlement saved for tier:", args.state.tier);
      } else {
        console.log("[license] Entitlement saved:", { tier: args.state.tier, status: args.state.status });
      }
    } catch (err) {
      console.warn("[license] Failed to save entitlements:", err);
    }
  }

  function loadEntitlements(): EntitlementData | null {
    try {
      const data = args.readJsonIfExists<EntitlementData>(entitlementFile());
      if (!data) return null;

      const validation = validateEntitlementExpiry(data);
      if (!validation.ok) {
        console.log("[license] Stored entitlement invalid:", validation.reason);
        try {
          fs.unlinkSync(entitlementFile());
        } catch {
          // ignore
        }
        return null;
      }

      return data;
    } catch (err) {
      console.warn("[license] Failed to load entitlements:", err);
      return null;
    }
  }

  function applyStoredEntitlement(data: EntitlementData): void {
    args.state.tier = data.tier;
    args.state.token = data.token;
    args.state.expiresAt = data.expiresAt;
    args.state.customerId = data.customerId;
    args.state.status = data.status || "unknown";
  }

  return {
    entitlementFile,
    getCurrentPlanId,
    getCurrentPlanFeatures,
    currentPlanHasFeature,
    applyVerifiedLicense,
    resetLicenseToStarter,
    getLicenseState,
    getCurrentLicenseCustomerId,
    saveEntitlements,
    loadEntitlements,
    applyStoredEntitlement,
    isEntitlementStale,
  };
}
