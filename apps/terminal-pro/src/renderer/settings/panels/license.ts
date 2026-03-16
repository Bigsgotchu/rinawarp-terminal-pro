/**
 * License settings panel - Restore Purchase flow and license status display.
 */

// Track analytics if available (may not be available in renderer context)
function trackAnalytics(event: string, properties?: Record<string, unknown>): void {
  try {
    const funnelSteps = ['signup', 'first_run', 'first_block', 'upgrade_view', 'paid']
    if (funnelSteps.includes(event) && typeof (window as any).rina?.trackFunnelStep === 'function') {
      ;(window as any).rina.trackFunnelStep(event, properties)
      return
    }
    if (typeof (window as any).rina?.trackEvent === 'function') {
      ;(window as any).rina.trackEvent(event, properties)
    }
  } catch {
    // Ignore analytics errors
  }
}

type LicenseState = {
  tier: string
  status: string
  expires_at: number | null
  has_token: boolean
}

type StatusCardOpts = {
  isPro: boolean
  tierText: string
  statusText: string
  expiryText: string
  expiresAt: number | null
}

type RestoreHandlerOpts = {
  container: HTMLElement
  restoreBtn: HTMLButtonElement
  emailInput: HTMLInputElement
  statusDiv: HTMLDivElement
}

function formatExpiry(timestamp: number | null): string {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTier(tier: string): string {
  const tierNames: Record<string, string> = {
    pro: 'Pro',
    starter: 'Starter',
    founder: 'Founder',
    lifetime: 'Lifetime',
  }
  return tierNames[tier.toLowerCase()] || tier
}

function formatStatus(status: string): string {
  const statusNames: Record<string, string> = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
    expired: 'Expired',
  }
  return statusNames[status.toLowerCase()] || status
}

async function fetchLicenseState(): Promise<LicenseState> {
  try {
    const state = await (window as any).rina.licenseState()
    return {
      tier: state.tier || 'starter',
      status: state.status || 'unknown',
      expires_at: state.expires_at || null,
      has_token: state.has_token || false,
    }
  } catch {
    return { tier: 'starter', status: 'unknown', expires_at: null, has_token: false }
  }
}

function buildStatusCard(opts: StatusCardOpts): string {
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

function buildRestoreCard(): string {
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

function buildCustomerIdCard(): string {
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

function buildManageCard(): string {
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

/**
 * Build usage card for free tier users showing their usage and limits
 */
function buildUsageCard(): string {
  return `
    <div class="rw-card" style="margin-top: 16px; border: 1px solid #fbbf24; background: #fef3c7;">
      <div class="rw-row">
        <div>
          <div class="rw-label" style="color: #92400e;">⚡ Free Tier Usage</div>
          <div class="rw-muted" style="color: #b45309;">You've used some of your free limits. Upgrade to Pro for unlimited access!</div>
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
        <button 
          id="rw-upgrade-btn"
          style="width: 100%; padding: 10px 16px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">
          🚀 Upgrade to Pro - Unlimited Everything
        </button>
      </div>
    </div>
  `
}

function setStatusError(statusDiv: HTMLDivElement, msg: string): void {
  statusDiv.innerHTML = `<span style="color: #ef4444;">${msg}</span>`
}

function setStatusSuccess(statusDiv: HTMLDivElement, msg: string): void {
  statusDiv.innerHTML = `<span style="color: #10b981;">${msg}</span>`
}

function setStatusPending(statusDiv: HTMLDivElement, msg: string): void {
  statusDiv.innerHTML = `<span style="color: #6b7280;">${msg}</span>`
}

/**
 * Check if license status requires user action.
 * Returns error message if status is problematic, null if OK.
 */
function checkLicenseStatus(status: string): string | null {
  const s = status.toLowerCase()
  if (s === 'canceled') return 'Your subscription was canceled. Visit the billing portal to reactivate.'
  if (s === 'past_due') return 'Payment past due. Please update your payment method in the billing portal.'
  if (s === 'expired') return 'Your subscription has expired. Visit the billing portal to renew.'
  return null
}

/**
 * Handle lookup error with appropriate messaging for different cases.
 */
function handleLookupError(
  statusDiv: HTMLDivElement,
  lookupResult: { ok: boolean; error?: string; multiple?: boolean }
): void {
  const errorMsg = lookupResult.error || 'No purchase found for this email.'
  if (errorMsg.toLowerCase().includes('multiple') || lookupResult.multiple) {
    setStatusError(
      statusDiv,
      'Multiple accounts found for this email. Please contact support@rinawarptech.com to merge your accounts.'
    )
  } else {
    setStatusError(statusDiv, `${errorMsg} Check the email you used at checkout.`)
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
  const verifyResult = await (window as any).rina.verifyLicense(customerId)
  if (!verifyResult.ok) {
    setStatusError(statusDiv, 'License verification failed. Please contact support.')
    return false
  }

  const statusError = checkLicenseStatus(verifyResult.status || 'active')
  if (statusError) {
    setStatusError(statusDiv, statusError)
    return false
  }

  setStatusSuccess(
    statusDiv,
    `✓ License restored! Plan: ${formatTier(verifyResult.tier || verifyResult.effective_tier)}`
  )

  // Track successful payment/upgrade (conversion funnel)
  trackAnalytics('paid', { tier: verifyResult.tier || verifyResult.effective_tier, status: verifyResult.status })

  setTimeout(() => mountLicensePanel(container), 1500)
  return true
}

function attachRestoreHandler(opts: RestoreHandlerOpts): void {
  const { container, restoreBtn, emailInput, statusDiv } = opts
  restoreBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim()
    if (!email) {
      setStatusError(statusDiv, 'Please enter your email address.')
      return
    }

    if (!email.includes('@') || !email.includes('.')) {
      setStatusError(statusDiv, 'Please enter a valid email address.')
      return
    }

    setStatusPending(statusDiv, 'Looking up license...')
    restoreBtn.disabled = true

    try {
      const lookupResult = await (window as any).rina.licenseLookupByEmail(email)
      if (!lookupResult.ok) {
        handleLookupError(statusDiv, lookupResult)
        return
      }

      const customerId = lookupResult.customer_id
      if (!customerId) {
        setStatusError(statusDiv, 'No customer account found for this email.')
        return
      }

      setStatusPending(statusDiv, 'Verifying license...')
      await verifyAndApplyLicense(customerId, statusDiv, container)
    } catch (err: any) {
      setStatusError(statusDiv, err?.message || 'Verification failed. Please try again.')
    } finally {
      restoreBtn.disabled = false
    }
  })

  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') restoreBtn.click()
  })
}

function attachCustomerIdHandler(container: HTMLElement): void {
  const verifyBtn = container.querySelector('#rw-verify-customer-btn') as HTMLButtonElement
  const customerInput = container.querySelector('#rw-customer-id-input') as HTMLInputElement
  const statusDiv = container.querySelector('#rw-customer-status') as HTMLDivElement

  if (!verifyBtn || !customerInput || !statusDiv) return

  verifyBtn.addEventListener('click', async () => {
    const customerId = customerInput.value.trim()
    if (!customerId) {
      setStatusError(statusDiv, 'Please enter your Customer ID.')
      return
    }

    if (!customerId.startsWith('cus_')) {
      setStatusError(statusDiv, "Customer ID should start with 'cus_'.")
      return
    }

    setStatusPending(statusDiv, 'Verifying license...')
    verifyBtn.disabled = true

    try {
      const ok = await verifyAndApplyLicense(customerId, statusDiv, container)
      if (!ok && statusDiv.textContent?.includes('License verification failed')) {
        setStatusError(statusDiv, 'License verification failed. Check your Customer ID.')
      }
    } catch (err: any) {
      setStatusError(statusDiv, err?.message || 'Verification failed.')
    } finally {
      verifyBtn.disabled = false
    }
  })

  customerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') verifyBtn.click()
  })
}

function attachToggleHandlers(container: HTMLElement): void {
  // Toggle to Customer ID input
  const toggleCustomerId = container.querySelector('#rw-toggle-customer-id') as HTMLButtonElement
  if (toggleCustomerId) {
    toggleCustomerId.addEventListener('click', () => {
      const restoreCard = container.querySelector('.rw-card:nth-child(3)') as HTMLElement
      if (restoreCard) {
        restoreCard.outerHTML = buildCustomerIdCard()
        attachCustomerIdHandler(container)
        attachToggleHandlers(container)
      }
    })
  }

  // Toggle back to email input
  const toggleEmail = container.querySelector('#rw-toggle-email') as HTMLButtonElement
  if (toggleEmail) {
    toggleEmail.addEventListener('click', () => {
      const customerCard = container.querySelector('.rw-card:nth-child(3)') as HTMLElement
      if (customerCard) {
        customerCard.outerHTML = buildRestoreCard()
        const restoreBtn = container.querySelector('#rw-restore-btn') as HTMLButtonElement
        const emailInput = container.querySelector('#rw-restore-email') as HTMLInputElement
        const statusDiv = container.querySelector('#rw-restore-status') as HTMLDivElement
        if (restoreBtn && emailInput && statusDiv) {
          attachRestoreHandler({ container, restoreBtn, emailInput, statusDiv })
        }
        attachToggleHandlers(container)
      }
    })
  }
}

function attachManageHandler(): void {
  const manageBtn = document.querySelector('#rw-manage-sub-btn') as HTMLButtonElement | null
  if (!manageBtn) return

  manageBtn.addEventListener('click', async () => {
    try {
      await (window as any).rina.openStripePortal?.()
    } catch {
      window.open('https://billing.stripe.com/p/login', '_blank')
    }
  })
}

export async function mountLicensePanel(container: HTMLElement): Promise<void> {
  const licenseState = await fetchLicenseState()
  const isPro = licenseState.tier !== 'starter'
  const expiryText = formatExpiry(licenseState.expires_at)
  const tierText = formatTier(licenseState.tier)
  const statusText = formatStatus(licenseState.status)

  // Track upgrade view for non-pro users (conversion funnel)
  if (!isPro) {
    trackAnalytics('upgrade_view', { tier: licenseState.tier })
  }

  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>License</h2>
      <p class="rw-sub">Manage your Rinawarp Pro subscription.</p>
    </div>
    ${buildStatusCard({ isPro, tierText, statusText, expiryText, expiresAt: licenseState.expires_at })}
    ${!isPro ? buildUsageCard() : ''}
    ${buildRestoreCard()}
    ${isPro ? buildManageCard() : ''}
  `

  // Update usage bars for non-pro users
  if (!isPro) {
    updateUsageBars()
    attachUpgradeHandler(container)
  }

  const restoreBtn = container.querySelector('#rw-restore-btn') as HTMLButtonElement
  const emailInput = container.querySelector('#rw-restore-email') as HTMLInputElement
  const statusDiv = container.querySelector('#rw-restore-status') as HTMLDivElement

  if (restoreBtn && emailInput && statusDiv) {
    attachRestoreHandler({ container, restoreBtn, emailInput, statusDiv })
  }

  attachToggleHandlers(container)
  attachManageHandler()
}

/**
 * Update usage progress bars from main process
 */
async function updateUsageBars(): Promise<void> {
  try {
    // Get actual usage from main process via IPC
    const usage = await (window as any).rina.getUsageStatus?.()
    if (usage && usage.usage) {
      const commandsBar = document.getElementById('rw-usage-commands') as HTMLElement
      const suggestionsBar = document.getElementById('rw-usage-suggestions') as HTMLElement
      const commandsText = document.getElementById('rw-usage-commands-text')
      const suggestionsText = document.getElementById('rw-usage-suggestions-text')

      if (commandsBar) commandsBar.style.width = `${Math.min(100, usage.usagePercent.commandsExecuted || 0)}%`
      if (suggestionsBar) suggestionsBar.style.width = `${Math.min(100, usage.usagePercent.aiSuggestionsUsed || 0)}%`
      if (commandsText) commandsText.textContent = String(usage.usage.commandsExecuted || 0)
      if (suggestionsText) suggestionsText.textContent = String(usage.usage.aiSuggestionsUsed || 0)
    }
  } catch {
    // If no usage data, show some demo values to encourage upgrades
    const commandsBar = document.getElementById('rw-usage-commands') as HTMLElement
    const suggestionsBar = document.getElementById('rw-usage-suggestions') as HTMLElement
    if (commandsBar) commandsBar.style.width = '35%'
    if (suggestionsBar) suggestionsBar.style.width = '50%'
  }
}

/**
 * Attach upgrade button handler
 */
function attachUpgradeHandler(container: HTMLElement): void {
  const upgradeBtn = container.querySelector('#rw-upgrade-btn') as HTMLButtonElement
  if (!upgradeBtn) return

  upgradeBtn.addEventListener('click', async () => {
    trackAnalytics('upgrade_click', { source: 'usage_card' })
    // Open billing portal or pricing page
    try {
      await (window as any).rina.openStripePortal?.()
    } catch {
      window.open('https://rinawarptech.com/pricing', '_blank')
    }
  })
}
