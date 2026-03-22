import {
  formatExpiry,
  formatStatus,
  formatTier,
  setStatusError,
  setStatusPending,
  setStatusSuccess,
} from './licenseUi.js'

type LicenseState = {
  tier: string
  status: string
  expires_at: number | null
  has_token: boolean
}

export type RestoreHandlerOpts = {
  container: HTMLElement
  restoreBtn: HTMLButtonElement
  emailInput: HTMLInputElement
  statusDiv: HTMLDivElement
}

export function trackLicenseAnalytics(event: string, properties?: Record<string, unknown>): void {
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

export async function fetchLicenseState(): Promise<LicenseState> {
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

function checkLicenseStatus(status: string): string | null {
  const s = status.toLowerCase()
  if (s === 'canceled') return 'Your subscription was canceled. Visit the billing portal to reactivate.'
  if (s === 'past_due') return 'Payment past due. Please update your payment method in the billing portal.'
  if (s === 'expired') return 'Your subscription has expired. Visit the billing portal to renew.'
  return null
}

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

export async function verifyAndApplyLicense(
  customerId: string,
  statusDiv: HTMLDivElement,
  container: HTMLElement,
  remount: (container: HTMLElement) => Promise<void>
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

  trackLicenseAnalytics('paid', { tier: verifyResult.tier || verifyResult.effective_tier, status: verifyResult.status })

  setTimeout(() => {
    void remount(container)
  }, 1500)
  return true
}

export function attachRestoreHandler(
  opts: RestoreHandlerOpts,
  remount: (container: HTMLElement) => Promise<void>
): void {
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
      await verifyAndApplyLicense(customerId, statusDiv, container, remount)
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

export function attachCustomerIdHandler(
  container: HTMLElement,
  remount: (container: HTMLElement) => Promise<void>
): void {
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
      const ok = await verifyAndApplyLicense(customerId, statusDiv, container, remount)
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

export function attachToggleHandlers(
  container: HTMLElement,
  buildCustomerIdCard: () => string,
  buildRestoreCard: () => string,
  remount: (container: HTMLElement) => Promise<void>
): void {
  const toggleCustomerId = container.querySelector('#rw-toggle-customer-id') as HTMLButtonElement
  if (toggleCustomerId) {
    toggleCustomerId.addEventListener('click', () => {
      const restoreCard = container.querySelector('.rw-card:nth-child(3)') as HTMLElement
      if (restoreCard) {
        restoreCard.outerHTML = buildCustomerIdCard()
        attachCustomerIdHandler(container, remount)
        attachToggleHandlers(container, buildCustomerIdCard, buildRestoreCard, remount)
      }
    })
  }

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
          attachRestoreHandler({ container, restoreBtn, emailInput, statusDiv }, remount)
        }
        attachToggleHandlers(container, buildCustomerIdCard, buildRestoreCard, remount)
      }
    })
  }
}

export function attachManageHandler(): void {
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

export async function refreshLicenseStateWithRetry(): Promise<boolean> {
  const refresh = (window as any).rina.licenseRefresh
  const readState = (window as any).rina.licenseState
  const deadline = Date.now() + 60_000

  while (Date.now() < deadline) {
    const state = refresh ? await refresh() : await readState()
    const tier = String(state?.tier || 'starter').toLowerCase()
    if (tier !== 'starter') return true
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  return false
}

export async function updateUsageBars(): Promise<void> {
  try {
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
    const commandsBar = document.getElementById('rw-usage-commands') as HTMLElement
    const suggestionsBar = document.getElementById('rw-usage-suggestions') as HTMLElement
    if (commandsBar) commandsBar.style.width = '35%'
    if (suggestionsBar) suggestionsBar.style.width = '50%'
  }
}

export function attachUpgradeHandler(container: HTMLElement, remount: (container: HTMLElement) => Promise<void>): void {
  const upgradeBtn = container.querySelector('#rw-upgrade-btn') as HTMLButtonElement
  const refreshBtn = container.querySelector('#rw-refresh-license-btn') as HTMLButtonElement | null
  const emailInput = container.querySelector('#rw-upgrade-email') as HTMLInputElement | null
  const statusEl = container.querySelector('#rw-upgrade-status') as HTMLDivElement | null
  if (!upgradeBtn) return

  upgradeBtn.addEventListener('click', async () => {
    trackLicenseAnalytics('upgrade_click', { source: 'usage_card' })
    const email = String(emailInput?.value || '').trim().toLowerCase()
    if (!email) {
      if (statusEl) statusEl.textContent = 'Enter your billing email to start checkout.'
      emailInput?.focus()
      return
    }

    const original = upgradeBtn.textContent
    upgradeBtn.disabled = true
    upgradeBtn.textContent = 'Opening checkout…'
    try {
      const result = await (window as any).rina.licenseCheckout?.(email)
      if (result?.ok) {
        if (statusEl) statusEl.textContent = 'Checkout opened in your browser. After payment, click Refresh Pro status.'
      } else if ((window as any).rina.openStripePortal) {
        await (window as any).rina.openStripePortal(email)
        if (statusEl) statusEl.textContent = 'Billing portal opened in your browser.'
      } else {
        window.open('https://rinawarptech.com/pricing', '_blank')
      }
    } catch {
      if (statusEl) statusEl.textContent = 'Could not open checkout. Try again in a moment.'
    } finally {
      upgradeBtn.disabled = false
      upgradeBtn.textContent = original
    }
  })

  refreshBtn?.addEventListener('click', async () => {
    const original = refreshBtn.textContent
    refreshBtn.disabled = true
    refreshBtn.textContent = 'Refreshing…'
    try {
      const ok = await refreshLicenseStateWithRetry()
      refreshBtn.textContent = ok ? 'Pro unlocked' : 'Still pending — try again'
      if (ok) {
        await remount(container)
      }
    } catch {
      refreshBtn.textContent = 'Refresh failed'
    } finally {
      refreshBtn.disabled = false
      if (refreshBtn.textContent === 'Pro unlocked') return
      setTimeout(() => {
        if (refreshBtn.isConnected) refreshBtn.textContent = original
      }, 2500)
    }
  })
}

export { formatExpiry, formatStatus, formatTier }
