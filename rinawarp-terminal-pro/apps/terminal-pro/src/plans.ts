export type PlanId =
  | "free"
  | "pro_monthly"
  | "team_seat_monthly";

export type EntitlementStatus =
  | "active"
  | "inactive"
  | "past_due"
  | "canceled"
  | "trial";

export interface Entitlement {
  planId: PlanId;
  status: EntitlementStatus;
  billingEmail?: string;
  seats?: number;
  renewsAt?: string | null;
  source: "stripe" | "manual" | "local-dev";
}

export const PLAN_CATALOG = {
  free: {
    id: "free",
    label: "Free",
    priceLabel: "$0 / month",
  },
  pro_monthly: {
    id: "pro_monthly",
    label: "Pro",
    priceLabel: "$15 / month",
  },
  team_seat_monthly: {
    id: "team_seat_monthly",
    label: "Power / Team",
    priceLabel: "$40 / user / month",
  },
} as const;

export type FeatureFlag =
  | "fix_project"
  | "proof_runs"
  | "unlimited_real_project_fixes"
  | "confidence_summaries"
  | "priority_support"
  | "team_rollout"
  | "role_aware_invites"
  | "shared_team_workflows";

export const PLAN_FEATURES: Record<PlanId, FeatureFlag[]> = {
  free: [
    "fix_project",
    "proof_runs",
  ],
  pro_monthly: [
    "fix_project",
    "proof_runs",
    "unlimited_real_project_fixes",
    "confidence_summaries",
    "priority_support",
  ],
  team_seat_monthly: [
    "fix_project",
    "proof_runs",
    "unlimited_real_project_fixes",
    "confidence_summaries",
    "priority_support",
    "team_rollout",
    "role_aware_invites",
    "shared_team_workflows",
  ],
};

export function mapLicenseTierToPlanId(tier: string): PlanId {
  const normalized = String(tier || "").trim().toLowerCase();
  if (normalized === "enterprise" || normalized === "team") return "team_seat_monthly";
  if (normalized === "pro" || normalized === "creator" || normalized === "founder" || normalized === "pioneer") {
    return "pro_monthly";
  }
  return "free";
}

export function normalizeEntitlementStatus(status: string): EntitlementStatus {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "past_due") return "past_due";
  if (normalized === "canceled") return "canceled";
  if (normalized === "trialing" || normalized === "trial") return "trial";
  return "inactive";
}

export function getPlanCatalogEntry(planId: PlanId) {
  return PLAN_CATALOG[planId];
}

export function hasPlanFeature(planId: PlanId, feature: FeatureFlag): boolean {
  return PLAN_FEATURES[planId].includes(feature);
}
