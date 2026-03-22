export type StatusCardOpts = {
  isPro: boolean
  tierText: string
  statusText: string
  expiryText: string
  expiresAt: number | null
}

export function formatExpiry(timestamp: number | null): string {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatTier(tier: string): string {
  const tierNames: Record<string, string> = {
    pro: 'Pro',
    starter: 'Starter',
    founder: 'Founder',
    lifetime: 'Lifetime',
  }
  return tierNames[tier.toLowerCase()] || tier
}

export function formatStatus(status: string): string {
  const statusNames: Record<string, string> = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
    expired: 'Expired',
  }
  return statusNames[status.toLowerCase()] || status
}

export function buildStatusCard(opts: StatusCardOpts): string {
  const { isPro, tierText, statusText, expiryText, expiresAt } = opts
  return `
    <div class="rw-card rw-license-status" style="margin-bottom: 16px;">
      <div class="rw-row" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div class="rw-label">Current Plan</div>
          <div class="rw-value" style="font-size: 18px; font-weight: 600; color: ${isPro ? '#10b981' : '#6b7280'};">
            ${tierText}
          </div>
        </div>
        <div style="text-align: right;">
          <div class="rw-label">Status</div>
          <div class="rw-value" style="font-size: 14px; color: ${isPro ? '#059669' : '#6b7280'};">
            ${statusText}
          </div>
        </div>
      </div>
      ${expiresAt ? `<div class="rw-row" style="margin-top: 8px;"><div class="rw-muted">Renews: ${expiryText}</div></div>` : ''}
    </div>
  `
}

export function buildRestoreCard(): string {
  return `
    <div class="rw-card">
      <div class="rw-row">
        <div>
          <div class="rw-label">Restore Purchase</div>
          <div class="rw-muted">Enter the email you used at checkout to restore your license.</div>
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
      <div style="margin-top: 8px;">
        <button 
          id="rw-toggle-customer-id"
          style="background: transparent; color: #6b7280; border: none; cursor: pointer; font-size: 12px; text-decoration: underline;">
          Have a Customer ID instead?
        </button>
      </div>
    </div>
  `
}

export function buildCustomerIdCard(): string {
  return `
    <div class="rw-card">
      <div class="rw-row">
        <div>
          <div class="rw-label">Restore with Customer ID</div>
          <div class="rw-muted">Enter your Stripe Customer ID (cus_...) to restore your license.</div>
        </div>
      </div>
      <div class="rw-row" style="display: flex; gap: 8px; align-items: center;">
        <input 
          type="text" 
          id="rw-customer-id-input" 
          placeholder="cus_..." 
          style="flex: 1; padding: 8px 12px; border: 1px solid #374151; border-radius: 6px; background: #1f2937; color: #f9fafb; font-size: 14px;"
        />
        <button 
          id="rw-verify-customer-btn"
          style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
          Verify
        </button>
      </div>
      <div id="rw-customer-status" style="margin-top: 8px; min-height: 20px;"></div>
      <div style="margin-top: 8px;">
        <button 
          id="rw-toggle-email"
          style="background: transparent; color: #6b7280; border: none; cursor: pointer; font-size: 12px; text-decoration: underline;">
          Use email instead
        </button>
      </div>
    </div>
  `
}

export function buildManageCard(): string {
  return `
    <div class="rw-card" style="margin-top: 16px;">
      <div class="rw-row">
        <div>
          <div class="rw-label">Manage Subscription</div>
          <div class="rw-muted">Update payment method, view invoices, or cancel.</div>
        </div>
      </div>
      <div class="rw-row">
        <button 
          id="rw-manage-sub-btn"
          style="padding: 8px 16px; background: transparent; color: #3b82f6; border: 1px solid #3b82f6; border-radius: 6px; cursor: pointer;">
          Open Stripe Portal
        </button>
      </div>
    </div>
  `
}

function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function buildUsageCard(email = ''): string {
  return `
    <div class="rw-card" style="margin-top: 16px; border: 1px solid #fbbf24; background: #fef3c7;">
      <div class="rw-row">
        <div>
          <div class="rw-label" style="color: #92400e;">⚡ Free Tier Usage</div>
          <div class="rw-muted" style="color: #b45309;">You've used some of your free limits. Upgrade to Pro for premium execution, capability packs, and higher limits.</div>
        </div>
      </div>
      <div class="rw-row" style="margin-top: 12px;">
        <div style="flex: 1; padding-right: 8px;">
          <div class="rw-muted" style="font-size: 12px; color: #92400e;">Commands</div>
          <div class="rw-progress-bar" style="height: 6px; background: #fcd34d; border-radius: 3px; margin-top: 4px;">
            <div id="rw-usage-commands" style="width: 0%; height: 100%; background: #f59e0b; border-radius: 3px;"></div>
          </div>
          <div class="rw-muted" style="font-size: 11px; color: #b45309; margin-top: 2px;"><span id="rw-usage-commands-text">0</span> / 100</div>
        </div>
        <div style="flex: 1; padding-left: 8px;">
          <div class="rw-muted" style="font-size: 12px; color: #92400e;">AI Suggestions</div>
          <div class="rw-progress-bar" style="height: 6px; background: #fcd34d; border-radius: 3px; margin-top: 4px;">
            <div id="rw-usage-suggestions" style="width: 0%; height: 100%; background: #f59e0b; border-radius: 3px;"></div>
          </div>
          <div class="rw-muted" style="font-size: 11px; color: #b45309; margin-top: 2px;"><span id="rw-usage-suggestions-text">0</span> / 20</div>
        </div>
      </div>
      <div class="rw-row" style="margin-top: 12px;">
        <input
          id="rw-upgrade-email"
          type="email"
          value="${escapeAttr(email)}"
          placeholder="Billing email"
          style="width: 100%; padding: 10px 12px; border: 1px solid #f59e0b; border-radius: 6px; background: #fffaf0; color: #92400e;"
        />
      </div>
      <div class="rw-row" style="margin-top: 12px;">
        <button 
          id="rw-upgrade-btn"
          style="width: 100%; padding: 10px 16px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">
          Upgrade to Pro - Unlock premium execution
        </button>
      </div>
      <div class="rw-row" style="margin-top: 8px;">
        <button 
          id="rw-refresh-license-btn"
          style="width: 100%; padding: 8px 14px; background: transparent; color: #92400e; border: 1px solid #d97706; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
          I paid — Refresh Pro status
        </button>
      </div>
      <div id="rw-upgrade-status" class="rw-muted" style="margin-top: 8px; color: #92400e;"></div>
    </div>
  `
}

export function setStatusError(statusDiv: HTMLDivElement, msg: string): void {
  statusDiv.innerHTML = `<span style="color: #ef4444;">${msg}</span>`
}

export function setStatusSuccess(statusDiv: HTMLDivElement, msg: string): void {
  statusDiv.innerHTML = `<span style="color: #10b981;">${msg}</span>`
}

export function setStatusPending(statusDiv: HTMLDivElement, msg: string): void {
  statusDiv.innerHTML = `<span style="color: #6b7280;">${msg}</span>`
}
