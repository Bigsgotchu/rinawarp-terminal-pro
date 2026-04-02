export type LicenseTier =
  | "starter"
  | "creator"
  | "pro"
  | "team"
  | "enterprise"
  | "founder"
  | "pioneer";

export type LicenseStatus =
  | "active"
  | "expired"
  | "invalid"
  | "starter"
  | "unknown";

export interface LicenseSnapshot {
  readonly tier: LicenseTier;
  readonly hasToken: boolean;
  readonly licenseToken: string | null;
  readonly expiresAt: number | null;
  readonly customerId: string | null;
  readonly status: LicenseStatus;
}

export interface ApplyVerifiedLicenseInput {
  readonly tier: LicenseTier;
  readonly licenseToken?: string | null;
  readonly expiresAt?: number | null;
  readonly customerId?: string | null;
  readonly status?: LicenseStatus;
}

export interface LicensingService {
  getSnapshot(): LicenseSnapshot;
  refresh(): Promise<LicenseSnapshot>;
  applyVerifiedLicense(input: ApplyVerifiedLicenseInput): string;
  resetToStarter(): void;
}
