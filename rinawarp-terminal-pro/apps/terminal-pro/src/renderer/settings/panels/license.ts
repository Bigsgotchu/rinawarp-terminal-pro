/**
 * License settings panel - Restore Purchase flow and license status display.
 */

import { getPlanCatalogEntry, mapLicenseTierToPlanId, normalizeEntitlementStatus, type PlanId } from "../../../plans.js";

type LicenseState = {
  tier: string;
  plan_id?: PlanId;
  status: string;
  expires_at: number | null;
  has_token: boolean;
  feature_flags?: string[];
};

type PlanPresentation = {
  label: string;
  priceLabel: string;
  isPaid: boolean;
};

type StatusCardOpts = {
  plan: PlanPresentation;
  statusText: string;
  expiryText: string;
  expiresAt: number | null;
};

type RestoreHandlerOpts = {
  container: HTMLElement;
  restoreBtn: HTMLButtonElement;
  emailInput: HTMLInputElement;
  statusDiv: HTMLDivElement;
};

function formatExpiry(timestamp: number | null): string {
  if (!timestamp) return "Not scheduled";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function getPlanPresentation(planId: PlanId): PlanPresentation {
  const plan = getPlanCatalogEntry(planId);
  return {
    label: plan.label,
    priceLabel: plan.priceLabel,
    isPaid: planId !== "free",
  };
}

function formatStatus(status: string): string {
  const statusNames: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past Due",
    canceled: "Canceled",
    expired: "Expired",
  };
  return statusNames[status.toLowerCase()] || status;
}

async function fetchLicenseState(): Promise<LicenseState> {
  try {
    const state = await (window as any).rina.licenseState();
    return {
      tier: state.tier || "free",
      plan_id: state.plan_id || mapLicenseTierToPlanId(state.tier || "free"),
      status: state.status || "unknown",
      expires_at: state.expires_at || null,
      has_token: state.has_token || false,
      feature_flags: Array.isArray(state.feature_flags) ? state.feature_flags : [],
    };
  } catch {
    return { tier: "free", plan_id: "free", status: "unknown", expires_at: null, has_token: false, feature_flags: [] };
  }
}

function buildStatusCard(opts: StatusCardOpts): string {
  const { plan, statusText, expiryText, expiresAt } = opts;
  return `
    <div class="rw-card rw-license-status" style="margin-bottom: 16px;">
      <div class="rw-row" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div class="rw-label">Current Plan</div>
          <div class="rw-value" style="font-size: 18px; font-weight: 600; color: ${plan.isPaid ? "#10b981" : "#6b7280"};">
            ${plan.label}
          </div>
          <div class="rw-muted" style="margin-top: 4px;">
            ${plan.priceLabel}
          </div>
        </div>
        <div style="text-align: right;">
          <div class="rw-label">Status</div>
          <div class="rw-value" style="font-size: 14px; color: ${plan.isPaid ? "#059669" : "#6b7280"};">
            ${statusText}
          </div>
        </div>
      </div>
      ${expiresAt ? `<div class="rw-row" style="margin-top: 8px;"><div class="rw-muted">Renews: ${expiryText}</div></div>` : ""}
    </div>
  `;
}

function buildRestoreCard(): string {
  return `
    <div class="rw-card">
      <div class="rw-row">
        <div>
          <div class="rw-label">Restore Paid Access</div>
          <div class="rw-muted">Enter the billing email you used at checkout to restore your subscription access.</div>
        </div>
      </div>
      <div class="rw-row" style="display: flex; gap: 8px; align-items: center;">
        <input 
          type="email" 
          id="rw-restore-email" 
          placeholder="email@example.com" 
          style="flex: 1; padding: 8px 12px; border: 1px solid #374151; border-radius: 6px; background: #1f2937; color: #f9fafb; font-size: 14px;"
        />
        <button 
          id="rw-restore-btn"
          style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
          Restore
        </button>
      </div>
      <div id="rw-restore-status" style="margin-top: 8px; min-height: 20px;"></div>
      <div class="rw-muted" style="margin-top: 8px;">Annual plans are not currently live. Early Access billing is managed through Stripe.</div>
    </div>
  `;
}

function buildManageCard(): string {
  return `
    <div class="rw-card" style="margin-top: 16px;">
      <div class="rw-row">
        <div>
          <div class="rw-label">Manage Billing</div>
          <div class="rw-muted">Open the Stripe billing portal to update payment method, view invoices, or cancel your subscription.</div>
        </div>
      </div>
      <div class="rw-row">
        <button 
          id="rw-manage-sub-btn"
          style="padding: 8px 16px; background: transparent; color: #3b82f6; border: 1px solid #3b82f6; border-radius: 6px; cursor: pointer;">
          Open Billing Portal
        </button>
      </div>
    </div>
  `;
}

function setStatusError(statusDiv: HTMLDivElement, msg: string): void {
  statusDiv.innerHTML = `<span style="color: #ef4444;">${msg}</span>`;
}

function setStatusSuccess(statusDiv: HTMLDivElement, msg: string): void {
  statusDiv.innerHTML = `<span style="color: #10b981;">${msg}</span>`;
}

function setStatusPending(statusDiv: HTMLDivElement, msg: string): void {
  statusDiv.innerHTML = `<span style="color: #6b7280;">${msg}</span>`;
}

/**
 * Check if license status requires user action.
 * Returns error message if status is problematic, null if OK.
 */
function checkLicenseStatus(status: string): string | null {
  const s = status.toLowerCase();
  if (s === "canceled") return "Your subscription was canceled. Visit the billing portal to reactivate.";
  if (s === "past_due") return "Payment past due. Please update your payment method in the billing portal.";
  if (s === "expired") return "Your subscription has expired. Visit the billing portal to renew.";
  return null;
}

/**
 * Handle lookup error with appropriate messaging for different cases.
 */
function handleLookupError(statusDiv: HTMLDivElement, lookupResult: { ok: boolean; error?: string; multiple?: boolean }): void {
  const errorMsg = lookupResult.error || "No purchase found for this email.";
  if (errorMsg.toLowerCase().includes("multiple") || lookupResult.multiple) {
    setStatusError(statusDiv, "Multiple accounts found for this email. Please contact support@rinawarptech.com to merge your accounts.");
  } else {
    setStatusError(statusDiv, `${errorMsg} Check the billing email you used at checkout.`);
  }
}

/**
 * Verify license and handle result. Returns true on success.
 */
async function verifyAndApplyLicense(
  customerId: string,
  statusDiv: HTMLDivElement,
  container: HTMLElement
): Promise<boolean> {
  const verifyResult = await (window as any).rina.verifyLicense(customerId);
  if (!verifyResult.ok) {
    setStatusError(statusDiv, "License verification failed. Please contact support.");
    return false;
  }

  const statusError = checkLicenseStatus(verifyResult.status || "active");
  if (statusError) {
    setStatusError(statusDiv, statusError);
    return false;
  }

  setStatusSuccess(
    statusDiv,
    `✓ Access restored. Plan: ${getPlanPresentation(mapLicenseTierToPlanId(verifyResult.tier || verifyResult.effective_tier || "free")).label}`,
  );
  setTimeout(() => mountLicensePanel(container), 1500);
  return true;
}

function attachRestoreHandler(opts: RestoreHandlerOpts): void {
  const { container, restoreBtn, emailInput, statusDiv } = opts;
  restoreBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email) {
      setStatusError(statusDiv, "Please enter your email address.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setStatusError(statusDiv, "Please enter a valid email address.");
      return;
    }

    setStatusPending(statusDiv, "Looking up subscription...");
    restoreBtn.disabled = true;

    try {
      const lookupResult = await (window as any).rina.licenseLookupByEmail(email);
      if (!lookupResult.ok) {
        handleLookupError(statusDiv, lookupResult);
        return;
      }

      const customerId = lookupResult.customer_id;
      if (!customerId) {
        setStatusError(statusDiv, "No customer account found for this email.");
        return;
      }

      setStatusPending(statusDiv, "Verifying subscription...");
      await verifyAndApplyLicense(customerId, statusDiv, container);
    } catch (err: any) {
      setStatusError(statusDiv, err?.message || "Verification failed. Please try again.");
    } finally {
      restoreBtn.disabled = false;
    }
  });

  emailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") restoreBtn.click();
  });
}

function attachManageHandler(): void {
  const manageBtn = document.querySelector("#rw-manage-sub-btn") as HTMLButtonElement | null;
  if (!manageBtn) return;

  manageBtn.addEventListener("click", async () => {
    try {
      await (window as any).rina.openStripePortal?.();
    } catch {
      window.open("https://billing.stripe.com/p/login", "_blank");
    }
  });
}

export async function mountLicensePanel(container: HTMLElement): Promise<void> {
  const licenseState = await fetchLicenseState();
  const plan = getPlanPresentation(licenseState.plan_id || mapLicenseTierToPlanId(licenseState.tier));
  const expiryText = formatExpiry(licenseState.expires_at);
  const statusText = formatStatus(normalizeEntitlementStatus(licenseState.status));

  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>Billing</h2>
      <p class="rw-sub">Manage your Terminal Pro Early Access subscription.</p>
    </div>
    ${buildStatusCard({ plan, statusText, expiryText, expiresAt: licenseState.expires_at })}
    ${buildRestoreCard()}
    ${plan.isPaid ? buildManageCard() : ""}
  `;

  const restoreBtn = container.querySelector("#rw-restore-btn") as HTMLButtonElement;
  const emailInput = container.querySelector("#rw-restore-email") as HTMLInputElement;
  const statusDiv = container.querySelector("#rw-restore-status") as HTMLDivElement;

  if (restoreBtn && emailInput && statusDiv) {
    attachRestoreHandler({ container, restoreBtn, emailInput, statusDiv });
  }

  attachManageHandler();
}
