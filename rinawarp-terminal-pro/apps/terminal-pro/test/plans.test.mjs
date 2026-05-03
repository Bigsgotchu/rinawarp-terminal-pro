import test from "node:test";
import assert from "node:assert/strict";

const {
  PLAN_CATALOG,
  PLAN_FEATURES,
  hasPlanFeature,
  mapLicenseTierToPlanId,
  normalizeEntitlementStatus,
} = await import("../dist-electron/plans.js");

test("public catalog matches current pricing page tiers", () => {
  assert.deepEqual(PLAN_CATALOG.free, {
    id: "free",
    label: "Free",
    priceLabel: "$0 / month",
  });
  assert.deepEqual(PLAN_CATALOG.pro_monthly, {
    id: "pro_monthly",
    label: "Pro",
    priceLabel: "$15 / month",
  });
  assert.deepEqual(PLAN_CATALOG.team_seat_monthly, {
    id: "team_seat_monthly",
    label: "Power / Team",
    priceLabel: "$40 / user / month",
  });
});

test("legacy billing aliases map to public plan ids only", () => {
  assert.equal(mapLicenseTierToPlanId("starter"), "free");
  assert.equal(mapLicenseTierToPlanId("free"), "free");
  assert.equal(mapLicenseTierToPlanId("pro"), "pro_monthly");
  assert.equal(mapLicenseTierToPlanId("creator"), "pro_monthly");
  assert.equal(mapLicenseTierToPlanId("founder"), "pro_monthly");
  assert.equal(mapLicenseTierToPlanId("pioneer"), "pro_monthly");
  assert.equal(mapLicenseTierToPlanId("team"), "team_seat_monthly");
  assert.equal(mapLicenseTierToPlanId("enterprise"), "team_seat_monthly");
  assert.equal(mapLicenseTierToPlanId("unknown"), "free");
});

test("entitlement statuses normalize to canonical app statuses", () => {
  assert.equal(normalizeEntitlementStatus("active"), "active");
  assert.equal(normalizeEntitlementStatus("trialing"), "trial");
  assert.equal(normalizeEntitlementStatus("trial"), "trial");
  assert.equal(normalizeEntitlementStatus("past_due"), "past_due");
  assert.equal(normalizeEntitlementStatus("canceled"), "canceled");
  assert.equal(normalizeEntitlementStatus("expired"), "inactive");
  assert.equal(normalizeEntitlementStatus("unknown"), "inactive");
});

test("plan features keep team rollout gated to Power / Team", () => {
  assert.deepEqual(PLAN_FEATURES.free, ["fix_project", "proof_runs"]);
  assert.equal(hasPlanFeature("free", "team_rollout"), false);
  assert.equal(hasPlanFeature("pro_monthly", "team_rollout"), false);
  assert.equal(hasPlanFeature("pro_monthly", "priority_support"), true);
  assert.equal(hasPlanFeature("team_seat_monthly", "team_rollout"), true);
  assert.equal(hasPlanFeature("team_seat_monthly", "role_aware_invites"), true);
  assert.equal(hasPlanFeature("team_seat_monthly", "shared_team_workflows"), true);
});
