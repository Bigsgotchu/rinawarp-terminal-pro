/**
 * License settings panel - Restore Purchase flow and license status display.
 */
import {
  buildCustomerIdCard,
  buildManageCard,
  buildRestoreCard,
  buildStatusCard,
  buildUsageCard,
} from './licenseUi.js'
import {
  attachManageHandler,
  attachRestoreHandler,
  attachToggleHandlers,
  attachUpgradeHandler,
  fetchLicenseState,
  formatExpiry,
  formatStatus,
  formatTier,
  trackLicenseAnalytics,
  updateUsageBars,
} from './licenseRuntime.js'

type CloudAccountState = {
  ok: boolean
  configured: boolean
  hasToken: boolean
  error?: string
  code?: string
  status?: number
  usage?: {
    account: { plan: string; subscriptionStatus: string; email?: string }
    usage: { requests: number; limit: number; remaining: number; inputTokens: number; outputTokens: number }
    billing: { upgradeUrl: string; portalUrl: string }
  }
}

async function fetchCloudAccountState(): Promise<CloudAccountState> {
  try {
    const state = await (window as any).rina.rinaCloudAccount?.()
    return {
      ok: !!state?.ok,
      configured: !!state?.configured,
      hasToken: !!state?.hasToken,
      error: state?.error,
      code: state?.code,
      status: state?.status,
      usage: state?.usage,
    }
  } catch (err: any) {
    return { ok: false, configured: false, hasToken: false, error: err?.message || 'Rina Cloud account check failed.' }
  }
}

function cloudStatusKind(state: CloudAccountState): 'connected' | 'unauthorized' | 'unpaid' | 'over limit' | 'unavailable' {
  if (!state.configured || state.code === 'unavailable') return 'unavailable'
  if (state.ok) {
    const status = state.usage?.account.subscriptionStatus
    if (status === 'active' || status === 'trialing') return 'connected'
    return 'unpaid'
  }
  if (!state.hasToken || state.status === 401 || state.code === 'auth_required') return 'unauthorized'
  if (state.status === 402 || state.code === 'subscription_required') return 'unpaid'
  if (state.status === 429 || state.code === 'daily_usage_limit_reached') return 'over limit'
  return 'unavailable'
}

function escapeAttr(value: unknown): string {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char))
}

function buildCloudAccountCard(state: CloudAccountState): string {
  const usage = state.usage?.usage
  const account = state.usage?.account
  const billing = state.usage?.billing
  const status = cloudStatusKind(state)
  const statusDetail = state.ok
    ? `${account?.plan || 'unknown'} / ${account?.subscriptionStatus || 'unknown'}`
    : state.error || 'Rina Cloud is unavailable. Local recovery workflows still work.'
  const remaining = usage ? `${usage.remaining} of ${usage.limit} requests left today` : 'Usage unavailable'
  return `
    <div class="rw-card" style="margin-bottom: 16px;">
      <div class="rw-row" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="rw-label">Rina Cloud Account</div>
          <div class="rw-muted">Sign in with a Rina auth token. Model keys stay on the backend.</div>
        </div>
        <button id="rw-cloud-refresh-btn" class="rw-btn rw-btn-ghost" type="button">Refresh</button>
      </div>
      <div class="rw-row" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px;">
        <div><div class="rw-label">Status</div><div class="rw-value">${status}</div><div class="rw-muted">${statusDetail}</div></div>
        <div><div class="rw-label">Daily Usage</div><div class="rw-value">${remaining}</div></div>
        <div><div class="rw-label">Tokens</div><div class="rw-value">${usage ? `${usage.inputTokens} in / ${usage.outputTokens} out` : 'Unavailable'}</div></div>
      </div>
      <div class="rw-row" style="display:flex;gap:8px;align-items:center;margin-top:12px;">
        <input type="password" id="rw-cloud-token" placeholder="Rina auth token" style="flex:1;padding:8px 12px;border:1px solid #374151;border-radius:6px;background:#1f2937;color:#f9fafb;font-size:14px;" />
        <button id="rw-cloud-save-token-btn" type="button" class="rw-btn">Save Token</button>
        <button id="rw-cloud-clear-token-btn" type="button" class="rw-btn rw-btn-ghost">Sign Out</button>
      </div>
      <div class="rw-row" style="display:flex;gap:8px;margin-top:10px;">
        <input id="rw-cloud-email" type="email" placeholder="Billing email" value="${escapeAttr(account?.email)}" style="flex:1;padding:8px 12px;border:1px solid #374151;border-radius:6px;background:#1f2937;color:#f9fafb;font-size:14px;" />
        <button id="rw-cloud-upgrade-btn" type="button" class="rw-btn">Upgrade</button>
        <button id="rw-cloud-portal-btn" type="button" class="rw-btn rw-btn-ghost">Billing Portal</button>
      </div>
      <div id="rw-cloud-status" class="rw-muted" style="margin-top:8px;">${state.error || 'Cloud calls are blocked when the account is unpaid or over the daily limit.'}</div>
      <div class="rw-muted" style="margin-top:8px;">Stripe checkout and customer portal are opened through Rina Cloud.</div>
      <span id="rw-cloud-upgrade-url" data-url="${billing?.upgradeUrl || 'https://www.rinawarptech.com/pricing'}" style="display:none;"></span>
      <span id="rw-cloud-portal-url" data-url="${billing?.portalUrl || 'https://www.rinawarptech.com/account'}" style="display:none;"></span>
    </div>
  `
}

function attachCloudAccountHandlers(container: HTMLElement): void {
  const status = container.querySelector('#rw-cloud-status') as HTMLElement | null
  const tokenInput = container.querySelector('#rw-cloud-token') as HTMLInputElement | null
  const reload = () => mountLicensePanel(container)
  container.querySelector('#rw-cloud-refresh-btn')?.addEventListener('click', () => void reload())
  container.querySelector('#rw-cloud-save-token-btn')?.addEventListener('click', async () => {
    const token = tokenInput?.value.trim() || ''
    if (!token) {
      if (status) status.textContent = 'Paste your Rina auth token first.'
      return
    }
    if (status) status.textContent = 'Saving token and checking account...'
    const result = await (window as any).rina.rinaCloudAuthSave?.({ token })
    if (!result?.ok) {
      if (status) status.textContent = result?.error || 'Token saved, but account check failed.'
      return
    }
    reload()
  })
  container.querySelector('#rw-cloud-clear-token-btn')?.addEventListener('click', async () => {
    await (window as any).rina.rinaCloudAuthClear?.()
    reload()
  })
  container.querySelector('#rw-cloud-upgrade-btn')?.addEventListener('click', async () => {
    const email = String(container.querySelector<HTMLInputElement>('#rw-cloud-email')?.value || '').trim().toLowerCase()
    if (status) status.textContent = 'Opening Stripe checkout...'
    const result = await (window as any).rina.rinaCloudCheckout?.({ email })
    if (result?.ok) {
      if (status) status.textContent = 'Stripe checkout opened. Refresh after payment completes.'
      return
    }
    const fallback = (container.querySelector('#rw-cloud-upgrade-url') as HTMLElement | null)?.dataset.url
    if (fallback) window.open(fallback, '_blank')
    if (status) status.textContent = result?.error || 'Checkout could not be opened. Opened pricing fallback.'
  })
  container.querySelector('#rw-cloud-portal-btn')?.addEventListener('click', async () => {
    if (status) status.textContent = 'Opening Stripe customer portal...'
    const result = await (window as any).rina.rinaCloudPortal?.()
    if (result?.ok) {
      if (status) status.textContent = 'Stripe customer portal opened.'
      return
    }
    const fallback = (container.querySelector('#rw-cloud-portal-url') as HTMLElement | null)?.dataset.url
    if (fallback) window.open(fallback, '_blank')
    if (status) status.textContent = result?.error || 'Billing portal could not be opened. Opened account fallback.'
  })
}

export async function mountLicensePanel(container: HTMLElement): Promise<void> {
  const [licenseState, cloudState] = await Promise.all([fetchLicenseState(), fetchCloudAccountState()])
  const cachedEmail = String(((window as any).rina.licenseCachedEmail ? await (window as any).rina.licenseCachedEmail() : { email: '' })?.email || '')
    .trim()
    .toLowerCase()
  const isPro = licenseState.tier === 'pro' || licenseState.tier === 'team' || licenseState.tier === 'enterprise'
  const expiryText = formatExpiry(licenseState.expires_at)
  const tierText = formatTier(licenseState.tier)
  const statusText = formatStatus(licenseState.status)

  // Track upgrade view for non-pro users (conversion funnel)
  if (!isPro) {
    trackLicenseAnalytics('upgrade_view', { tier: licenseState.tier })
  }

  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>License</h2>
      <p class="rw-sub">Manage your Rinawarp Pro subscription.</p>
    </div>
    ${buildCloudAccountCard(cloudState)}
    ${buildStatusCard({ isPro, tierText, statusText, expiryText, expiresAt: licenseState.expires_at })}
    ${!isPro ? buildUsageCard(cachedEmail) : ''}
    ${buildRestoreCard()}
    ${isPro ? buildManageCard() : ''}
  `

  // Update usage bars for non-pro users
  if (!isPro) {
    updateUsageBars()
    attachUpgradeHandler(container, mountLicensePanel)
  }

  const restoreBtn = container.querySelector('#rw-restore-btn') as HTMLButtonElement
  const emailInput = container.querySelector('#rw-restore-email') as HTMLInputElement
  const statusDiv = container.querySelector('#rw-restore-status') as HTMLDivElement

  if (restoreBtn && emailInput && statusDiv) {
    attachRestoreHandler({ container, restoreBtn, emailInput, statusDiv }, mountLicensePanel)
  }

  attachCloudAccountHandlers(container)
  attachToggleHandlers(container, buildCustomerIdCard, buildRestoreCard, mountLicensePanel)
  attachManageHandler()
}
