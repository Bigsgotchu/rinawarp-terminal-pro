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

export async function mountLicensePanel(container: HTMLElement): Promise<void> {
  const licenseState = await fetchLicenseState()
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

  attachToggleHandlers(container, buildCustomerIdCard, buildRestoreCard, mountLicensePanel)
  attachManageHandler()
}
