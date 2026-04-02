import type {
  ApplyVerifiedLicenseInput,
  LicenseSnapshot,
  LicenseTier,
  LicensingService,
} from "../../../runtime-contracts/dist/index.js";

export interface StoredEntitlement {
  readonly tier: LicenseTier;
  readonly token: string | null;
  readonly expiresAt: number | null;
  readonly customerId: string | null;
  readonly verifiedAt?: string;
  readonly lastVerifiedAt?: string;
  readonly status?: string;
}

export interface LicensingServiceConfig {
  readonly isPackaged: boolean;
  readonly verifyLicense: (
    customerId: string,
    options?: { force?: boolean },
  ) => Promise<{
    ok?: boolean;
    tier: string;
    license_token?: string | null;
    expires_at?: number | null;
    customer_id?: string | null;
    status?: string;
  }>;
  readonly writeJsonFile: (filePath: string, value: unknown) => unknown;
  readonly readJsonIfExists: (filePath: string) => unknown;
  readonly deleteFile?: (filePath: string) => void;
  readonly entitlementFile: () => string;
}

export interface LicensingRuntimeService extends LicensingService {
  getLicenseState(): {
    tier: LicenseTier;
    has_token: boolean;
    expires_at: number | null;
    customer_id: string | null;
    status: string;
  };
  getCurrentLicenseCustomerId(): string | null;
  getLicenseTier(): LicenseTier;
  getLicenseToken(): string | null;
  refreshLicenseState(): Promise<{
    tier: LicenseTier;
    has_token: boolean;
    expires_at: number | null;
    customer_id: string | null;
    status: string;
  }>;
  saveEntitlements(): void;
  loadEntitlements(): StoredEntitlement | null;
  applyStoredEntitlement(data: StoredEntitlement): void;
  isEntitlementStale(data: StoredEntitlement & { lastVerifiedAt?: string }): boolean;
}

export function createLicensingService(
  config: LicensingServiceConfig,
): LicensingRuntimeService {
  let currentLicenseTier: LicenseTier = "starter";
  let currentLicenseToken: string | null = null;
  let currentLicenseExpiresAt: number | null = null;
  let currentLicenseCustomerId: string | null = null;
  let currentLicenseStatus = "unknown";

  const LIFETIME_TIERS = new Set<LicenseTier>(["founder", "pioneer"]);

  function mapApiTierToLicenseTier(apiTier: string): LicenseTier {
    const normalized = String(apiTier || "").trim().toLowerCase();
    if (normalized === "pro") return "pro";
    if (normalized === "creator") return "creator";
    if (normalized === "pioneer") return "pioneer";
    if (normalized === "founder") return "founder";
    if (normalized === "enterprise") return "enterprise";
    if (normalized === "team") return "team";
    return "starter";
  }

  function applyVerifiedLicense(input: ApplyVerifiedLicenseInput): string {
    const tier = mapApiTierToLicenseTier(input.tier);
    currentLicenseTier = tier;
    currentLicenseToken = input.licenseToken ?? null;
    currentLicenseExpiresAt = Number.isFinite(input.expiresAt)
      ? Number(input.expiresAt)
      : null;
    currentLicenseCustomerId = input.customerId ?? null;
    currentLicenseStatus = input.status ?? "active";
    return tier;
  }

  function resetToStarter(): void {
    currentLicenseTier = "starter";
    currentLicenseToken = null;
    currentLicenseExpiresAt = null;
    currentLicenseCustomerId = null;
  }

  function getSnapshot(): LicenseSnapshot {
    return {
      tier: currentLicenseTier,
      hasToken: Boolean(currentLicenseToken),
      licenseToken: currentLicenseToken,
      expiresAt: currentLicenseExpiresAt,
      customerId: currentLicenseCustomerId,
      status: currentLicenseStatus as LicenseSnapshot["status"],
    };
  }

  function getLicenseState() {
    return {
      tier: currentLicenseTier,
      has_token: Boolean(currentLicenseToken),
      expires_at: currentLicenseExpiresAt,
      customer_id: currentLicenseCustomerId,
      status: currentLicenseStatus,
    };
  }

  function getCurrentLicenseCustomerId(): string | null {
    return currentLicenseCustomerId;
  }

  function getLicenseTier(): LicenseTier {
    return currentLicenseTier;
  }

  function getLicenseToken(): string | null {
    return currentLicenseToken;
  }

  async function refresh(): Promise<LicenseSnapshot> {
    if (!currentLicenseCustomerId) {
      return getSnapshot();
    }
    const data = await config.verifyLicense(currentLicenseCustomerId, {
      force: true,
    });
    if (!data?.ok) {
      throw new Error("license refresh returned non-ok response");
    }
    applyVerifiedLicense({
      tier: mapApiTierToLicenseTier(data.tier),
      licenseToken: data.license_token,
      expiresAt: data.expires_at,
      customerId: data.customer_id,
      status: data.status as ApplyVerifiedLicenseInput["status"],
    });
    saveEntitlements();
    return getSnapshot();
  }

  async function refreshLicenseState() {
    await refresh();
    return getLicenseState();
  }

  function validateEntitlementExpiry(data: StoredEntitlement) {
    if (LIFETIME_TIERS.has(data.tier)) {
      if (data.expiresAt === null) return { ok: true as const };
      if (!Number.isFinite(data.expiresAt)) {
        return { ok: false as const, reason: "Lifetime tier has non-finite expiresAt" };
      }
      if (Date.now() > data.expiresAt * 1000) {
        return { ok: false as const, reason: "Lifetime tier has expired" };
      }
      return { ok: true as const };
    }

    if (data.expiresAt === null) {
      return { ok: false as const, reason: "Subscription tier missing expiresAt" };
    }
    if (!Number.isFinite(data.expiresAt)) {
      return { ok: false as const, reason: "Subscription tier has non-finite expiresAt" };
    }
    if (Date.now() > data.expiresAt * 1000) {
      return { ok: false as const, reason: "Subscription has expired" };
    }
    return { ok: true as const };
  }

  function isEntitlementStale(
    data: StoredEntitlement & { lastVerifiedAt?: string },
  ): boolean {
    if (!data.lastVerifiedAt) return true;
    const lastVerified = Date.parse(data.lastVerifiedAt);
    if (!Number.isFinite(lastVerified)) return true;
    const hoursSinceVerify = (Date.now() - lastVerified) / (1000 * 60 * 60);
    return hoursSinceVerify > 24;
  }

  function saveEntitlements(): void {
    try {
      const data: StoredEntitlement = {
        tier: currentLicenseTier,
        token: currentLicenseToken,
        expiresAt: currentLicenseExpiresAt,
        customerId: currentLicenseCustomerId,
        verifiedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        status: currentLicenseStatus,
      };
      config.writeJsonFile(config.entitlementFile(), data);
      if (config.isPackaged) {
        console.log("[license] Entitlement saved for tier:", currentLicenseTier);
      } else {
        console.log("[license] Entitlement saved:", {
          tier: currentLicenseTier,
          status: currentLicenseStatus,
        });
      }
    } catch (error) {
      console.warn("[license] Failed to save entitlements:", error);
    }
  }

  function loadEntitlements(): StoredEntitlement | null {
    try {
      const data = config.readJsonIfExists(config.entitlementFile()) as
        | StoredEntitlement
        | null;
      if (!data) return null;
      const validation = validateEntitlementExpiry(data);
      if (!validation.ok) {
        console.log("[license] Stored entitlement invalid:", validation.reason);
        try {
          config.deleteFile?.(config.entitlementFile());
        } catch {
          // Ignore cleanup failures for invalid persisted state.
        }
        return null;
      }
      return data;
    } catch (error) {
      console.warn("[license] Failed to load entitlements:", error);
      return null;
    }
  }

  function applyStoredEntitlement(data: StoredEntitlement): void {
    currentLicenseTier = data.tier;
    currentLicenseToken = data.token;
    currentLicenseExpiresAt = data.expiresAt;
    currentLicenseCustomerId = data.customerId;
    currentLicenseStatus = data.status || "unknown";
  }

  return {
    getSnapshot,
    refresh,
    applyVerifiedLicense,
    resetToStarter,
    getLicenseState,
    getCurrentLicenseCustomerId,
    getLicenseTier,
    getLicenseToken,
    refreshLicenseState,
    saveEntitlements,
    loadEntitlements,
    applyStoredEntitlement,
    isEntitlementStale,
  };
}
