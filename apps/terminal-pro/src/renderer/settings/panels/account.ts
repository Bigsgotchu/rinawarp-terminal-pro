import { setStatusError, setStatusPending, setStatusSuccess } from './licenseUi.js'

type AuthState = {
  authenticated: boolean
  user: { email?: string; name?: string } | null
  token?: string | null
}

type ReferralState = {
  ok?: boolean
  code?: string
  inviteUrl?: string
  stats?: { clicks?: number; checkouts?: number; conversions?: number }
  error?: string
}

type ReferralAdminLookup = {
  ok?: boolean
  found?: boolean
  mode?: string
  referral?: { code?: string; userId?: string; email?: string | null; name?: string | null }
  stats?: { events?: number; checkouts?: number; conversions?: number }
  events?: Array<{
    referral_code?: string
    event_type?: string
    referred_email?: string
    checkout_session_id?: string | null
    source?: string
    created_at?: number
    converted_at?: number | null
  }>
  error?: string
}

function getRina(): any {
  return (window as any).rina
}

function getShell(): { openExternal?: (url: string) => Promise<void> } | null {
  return (window as any).electronAPI?.shell || null
}

async function openExternal(url: string): Promise<void> {
  const shell = getShell()
  if (shell?.openExternal) {
    await shell.openExternal(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

async function fetchAuthState(): Promise<AuthState> {
  try {
    return (await getRina()?.authState?.()) || { authenticated: false, user: null, token: null }
  } catch {
    return { authenticated: false, user: null, token: null }
  }
}

async function fetchReferralState(): Promise<ReferralState | null> {
  try {
    const token = String((await getRina()?.authToken?.())?.token || '').trim()
    if (!token) return null
    const response = await fetch('https://rinawarptech.com/api/referrals/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = (await response.json().catch(() => null)) as ReferralState | null
    if (!response.ok) return null
    return payload
  } catch {
    return null
  }
}

function isPrivateAdminEmail(email: string | undefined | null): boolean {
  const normalized = String(email || '').trim().toLowerCase()
  const isDesktopLocal = window.location.protocol === 'file:'
  return normalized === 'support@rinawarptech.com' || normalized === 'hello@rinawarptech.com' || isDesktopLocal
}

function canRenderPrivateAdminPanel(authState: AuthState): boolean {
  return isPrivateAdminEmail(authState.user?.email) || window.location.protocol === 'file:'
}

async function fetchReferralAdminLookup(query: { code?: string; email?: string }): Promise<ReferralAdminLookup | null> {
  try {
    const token = String((await getRina()?.authToken?.())?.token || '').trim()
    if (!token) return null
    const params = new URLSearchParams()
    if (query.code) params.set('code', query.code)
    if (query.email) params.set('email', query.email)
    const response = await fetch(`https://rinawarptech.com/api/referrals/admin?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = (await response.json().catch(() => null)) as ReferralAdminLookup | null
    if (!response.ok) return payload
    return payload
  } catch {
    return null
  }
}

function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function notifyLicenseUpdated(tier: string | null | undefined): void {
  window.dispatchEvent(
    new CustomEvent('rina:license-updated', {
      detail: { tier: String(tier || 'starter').toLowerCase() },
    })
  )
}

function renderSignedOut(authConfigured: boolean, billingEmail: string): string {
  return `
    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Account access</div>
          <div class="rw-muted">
            Sign in if you already have a RinaWarp account. During Early Access, billing restore by email also works even if you have not created a password yet.
          </div>
        </div>
        <div class="rw-pill">${authConfigured ? 'Ready' : 'Browser flow'}</div>
      </div>
      <div class="rw-account-toggle" role="tablist" aria-label="Account flow">
        <button type="button" class="rw-btn rw-btn-ghost rw-account-toggle-btn" data-account-view="login">Sign in</button>
        <button type="button" class="rw-btn rw-btn-ghost rw-account-toggle-btn" data-account-view="register">Create account</button>
        <button type="button" class="rw-btn rw-btn-ghost rw-account-toggle-btn" data-account-view="reset">Reset password</button>
      </div>
      <div id="rw-account-feedback" class="rw-muted" aria-live="polite"></div>
      <div class="rw-account-views">
        <form class="rw-account-view" data-account-form="login">
          <div class="rw-label">Sign in</div>
          <input class="rw-input" type="email" name="email" placeholder="you@company.com" autocomplete="email" required />
          <input class="rw-input" type="password" name="password" placeholder="Password" autocomplete="current-password" required />
          <div class="rw-row rw-gap">
            <button type="submit" class="rw-btn rw-btn-primary">Sign in</button>
            <button type="button" class="rw-btn rw-btn-ghost" data-open-url="https://rinawarptech.com/login">Open in browser</button>
          </div>
        </form>
        <form class="rw-account-view" data-account-form="register" hidden>
          <div class="rw-label">Create account</div>
          <input class="rw-input" type="text" name="name" placeholder="Name (optional)" autocomplete="name" />
          <input class="rw-input" type="email" name="email" placeholder="you@company.com" autocomplete="email" required />
          <input class="rw-input" type="password" name="password" placeholder="Create a strong password" autocomplete="new-password" required />
          <input class="rw-input" type="password" name="confirmPassword" placeholder="Confirm password" autocomplete="new-password" required />
          <div class="rw-row rw-gap">
            <button type="submit" class="rw-btn rw-btn-primary">Create account</button>
            <button type="button" class="rw-btn rw-btn-ghost" data-open-url="https://rinawarptech.com/register">Open in browser</button>
          </div>
        </form>
        <form class="rw-account-view" data-account-form="reset" hidden>
          <div class="rw-label">Password reset</div>
          <input class="rw-input" type="email" name="email" placeholder="you@company.com" autocomplete="email" required />
          <div class="rw-row rw-gap">
            <button type="submit" class="rw-btn rw-btn-primary">Send reset link</button>
            <button type="button" class="rw-btn rw-btn-ghost" data-open-url="https://rinawarptech.com/forgot-password">Open in browser</button>
          </div>
        </form>
      </div>
      <div class="rw-muted">
        Billing email restore is currently the most reliable way to reconnect a paid install on a new device.
      </div>
    </div>
    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Restore Pro access</div>
          <div class="rw-muted">Use the billing email from checkout to restore entitlements on this device.</div>
        </div>
      </div>
      <div class="rw-row rw-gap">
        <input class="rw-input" id="rw-account-restore-email" type="email" placeholder="Billing email" value="${escapeAttr(billingEmail)}" />
        <button type="button" class="rw-btn" id="rw-account-restore-btn">Restore</button>
      </div>
      <div id="rw-account-restore-status" class="rw-muted" aria-live="polite"></div>
    </div>
  `
}

function renderSignedIn(user: { email?: string; name?: string } | null, billingEmail: string): string {
  const userEmail = String(user?.email || billingEmail || '').trim()
  const userName = String(user?.name || '').trim()
  return `
    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Signed in</div>
          <div class="rw-account-identity">${userName || 'RinaWarp account'}</div>
          <div class="rw-muted">${userEmail || 'No email available'}</div>
        </div>
        <div class="rw-pill">Authenticated</div>
      </div>
      <div class="rw-row rw-gap">
        <button type="button" class="rw-btn rw-btn-primary" id="rw-account-open-portal">Open billing portal</button>
        <button type="button" class="rw-btn rw-btn-ghost" id="rw-account-logout">Sign out</button>
      </div>
      <div id="rw-account-feedback" class="rw-muted" aria-live="polite"></div>
    </div>
    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Invite someone</div>
          <div class="rw-muted">Share a real referral link right after a fix lands. We track started checkouts and paid conversions here.</div>
        </div>
        <div class="rw-pill" id="rw-account-referral-code">Loading…</div>
      </div>
      <div class="rw-row rw-gap">
        <input class="rw-input" id="rw-account-referral-link" type="text" value="" readonly placeholder="Referral link will appear here" />
        <button type="button" class="rw-btn" id="rw-account-copy-referral-link">Copy invite link</button>
      </div>
      <div id="rw-account-referral-stats" class="rw-muted">Loading referral stats…</div>
      <div id="rw-account-referral-status" class="rw-muted" aria-live="polite"></div>
    </div>
    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Restore on another device</div>
          <div class="rw-muted">Use your billing email if you need to reconnect this purchase on a fresh machine.</div>
        </div>
      </div>
      <div class="rw-row rw-gap">
        <input class="rw-input" id="rw-account-restore-email" type="email" placeholder="Billing email" value="${escapeAttr(userEmail || billingEmail)}" />
        <button type="button" class="rw-btn" id="rw-account-restore-btn">Restore</button>
      </div>
      <div id="rw-account-restore-status" class="rw-muted" aria-live="polite"></div>
    </div>
  `
}

function renderPrivateAdminCard(): string {
  return `
    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Private referral admin</div>
          <div class="rw-muted">This panel only renders for your support/founder account inside the desktop build.</div>
        </div>
        <div class="rw-pill">Private</div>
      </div>
      <form id="rw-account-admin-referral-form">
        <div class="rw-row rw-gap">
          <input class="rw-input" id="rw-account-admin-referral-code" type="text" name="code" placeholder="Referral code (A44K5)" />
          <input class="rw-input" id="rw-account-admin-referral-email" type="email" name="email" placeholder="Owner email" />
        </div>
        <div class="rw-row rw-gap">
          <button type="submit" class="rw-btn">Lookup referral</button>
          <button type="button" class="rw-btn rw-btn-ghost" id="rw-account-admin-load-mine">Load my referral</button>
          <button type="button" class="rw-btn rw-btn-ghost" id="rw-account-admin-load-recent">Recent activity</button>
        </div>
      </form>
      <div id="rw-account-admin-referral-status" class="rw-muted" aria-live="polite"></div>
      <pre id="rw-account-admin-referral-output" class="rw-muted" style="white-space: pre-wrap;"></pre>
    </div>
  `
}

function renderBusinessCards(): string {
  return `
    <div class="rw-card">
      <div class="rw-label">Support and feedback</div>
      <div class="rw-muted">Need help with billing, restore, installs, or a failed run? Reach out through the official support paths.</div>
      <div class="rw-row rw-gap">
        <button type="button" class="rw-btn rw-btn-ghost" data-open-url="https://rinawarptech.com/account">Web account</button>
        <button type="button" class="rw-btn rw-btn-ghost" data-open-url="https://rinawarptech.com/early-access">Early Access policy</button>
        <button type="button" class="rw-btn rw-btn-ghost" data-open-url="mailto:support@rinawarptech.com">Email support</button>
      </div>
    </div>
    <div class="rw-card">
      <div class="rw-label">Policies and boundaries</div>
      <div class="rw-muted">RinaWarp Technologies, LLC currently supports Windows and Debian/Ubuntu desktop systems in Early Access. macOS remains unavailable until signing and notarization are complete.</div>
      <div class="rw-row rw-gap">
        <button type="button" class="rw-btn rw-btn-ghost" data-open-url="https://rinawarptech.com/privacy">Privacy</button>
        <button type="button" class="rw-btn rw-btn-ghost" data-open-url="https://rinawarptech.com/terms">Terms</button>
        <button type="button" class="rw-btn rw-btn-ghost" data-open-url="https://rinawarptech.com/download">Downloads</button>
      </div>
      <div class="rw-account-platforms">
        <div><span class="rw-pill">Windows</span><span class="rw-muted">Supported in Early Access</span></div>
        <div><span class="rw-pill">Debian / Ubuntu</span><span class="rw-muted">Use the .deb baseline</span></div>
        <div><span class="rw-pill">AppImage</span><span class="rw-muted">Updater path when desktop libs are already present</span></div>
        <div><span class="rw-pill">macOS</span><span class="rw-muted">Not available yet</span></div>
      </div>
    </div>
  `
}

function setActiveView(container: HTMLElement, next: 'login' | 'register' | 'reset'): void {
  for (const button of Array.from(container.querySelectorAll<HTMLElement>('[data-account-view]'))) {
    const active = button.dataset.accountView === next
    button.classList.toggle('rw-density-active', active)
    button.setAttribute('aria-pressed', String(active))
  }
  for (const panel of Array.from(container.querySelectorAll<HTMLElement>('[data-account-form]'))) {
    panel.hidden = panel.dataset.accountForm !== next
  }
}

function getFeedbackEl(container: HTMLElement): HTMLDivElement | null {
  return container.querySelector<HTMLDivElement>('#rw-account-feedback')
}

function getRestoreStatusEl(container: HTMLElement): HTMLDivElement | null {
  return container.querySelector<HTMLDivElement>('#rw-account-restore-status')
}

async function handleRestore(container: HTMLElement, remount: (container: HTMLElement) => Promise<void>): Promise<void> {
  const input = container.querySelector<HTMLInputElement>('#rw-account-restore-email')
  const statusEl = getRestoreStatusEl(container)
  if (!input || !statusEl) return
  const email = input.value.trim()
  if (!email) {
    setStatusError(statusEl, 'Enter the billing email you used at checkout.')
    return
  }
  setStatusPending(statusEl, 'Looking up entitlements...')
  try {
    const lookup = await getRina()?.licenseLookupByEmail?.(email)
    if (!lookup?.ok || !lookup?.customer_id) {
      setStatusError(statusEl, lookup?.error || 'No paid purchase was found for that email.')
      return
    }
    const verified = await getRina()?.verifyLicense?.(lookup.customer_id)
    if (!verified?.ok) {
      setStatusError(statusEl, verified?.error || 'We found the account, but verification did not complete.')
      return
    }
    notifyLicenseUpdated(verified?.tier || verified?.effective_tier)
    setStatusSuccess(statusEl, 'Pro access restored on this device. Refreshing account state…')
    setTimeout(() => {
      void remount(container)
    }, 1200)
  } catch (error) {
    setStatusError(statusEl, error instanceof Error ? error.message : 'Restore failed. Try again in a moment.')
  }
}

function attachCommonActions(container: HTMLElement, remount: (container: HTMLElement) => Promise<void>): void {
  for (const button of Array.from(container.querySelectorAll<HTMLElement>('[data-open-url]'))) {
    button.addEventListener('click', () => {
      const url = button.dataset.openUrl
      if (url) void openExternal(url)
    })
  }
  const restoreBtn = container.querySelector<HTMLButtonElement>('#rw-account-restore-btn')
  restoreBtn?.addEventListener('click', () => {
    void handleRestore(container, remount)
  })
}

async function handleLogin(container: HTMLElement, remount: (container: HTMLElement) => Promise<void>): Promise<void> {
  const form = container.querySelector<HTMLFormElement>('[data-account-form="login"]')
  const feedback = getFeedbackEl(container)
  if (!form || !feedback) return
  const email = String(new FormData(form).get('email') || '').trim()
  const password = String(new FormData(form).get('password') || '')
  if (!email || !password) {
    setStatusError(feedback, 'Enter both your email and password.')
    return
  }
  setStatusPending(feedback, 'Signing in…')
  try {
    const result = await getRina()?.authLogin?.({ email, password })
    if (!result?.ok) {
      setStatusError(feedback, result?.error || 'Sign-in failed.')
      return
    }
    setStatusSuccess(feedback, 'Signed in. Refreshing your account view…')
    setTimeout(() => {
      void remount(container)
    }, 800)
  } catch (error) {
    setStatusError(feedback, error instanceof Error ? error.message : 'Sign-in failed.')
  }
}

async function handleRegister(container: HTMLElement): Promise<void> {
  const form = container.querySelector<HTMLFormElement>('[data-account-form="register"]')
  const feedback = getFeedbackEl(container)
  if (!form || !feedback) return
  const formData = new FormData(form)
  const email = String(formData.get('email') || '').trim()
  const name = String(formData.get('name') || '').trim()
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirmPassword') || '')
  if (!email || !password || !confirmPassword) {
    setStatusError(feedback, 'Fill in the required fields first.')
    return
  }
  if (password !== confirmPassword) {
    setStatusError(feedback, 'Passwords do not match.')
    return
  }
  if (password.length < 8) {
    setStatusError(feedback, 'Use at least 8 characters for your password.')
    return
  }
  setStatusPending(feedback, 'Creating your account…')
  try {
    const result = await getRina()?.authRegister?.({ email, password, name: name || undefined })
    if (!result?.ok) {
      setStatusError(feedback, result?.error || 'Registration failed.')
      return
    }
    setStatusSuccess(feedback, result?.message || 'Account created. Check your inbox if verification is enabled.')
    form.reset()
    setActiveView(container, 'login')
  } catch (error) {
    setStatusError(feedback, error instanceof Error ? error.message : 'Registration failed.')
  }
}

async function handleReset(container: HTMLElement): Promise<void> {
  const form = container.querySelector<HTMLFormElement>('[data-account-form="reset"]')
  const feedback = getFeedbackEl(container)
  if (!form || !feedback) return
  const email = String(new FormData(form).get('email') || '').trim()
  if (!email) {
    setStatusError(feedback, 'Enter the email you want the reset link sent to.')
    return
  }
  setStatusPending(feedback, 'Sending reset instructions…')
  try {
    const result = await getRina()?.authForgotPassword?.({ email })
    if (!result?.ok) {
      setStatusError(feedback, result?.error || 'Password reset request failed.')
      return
    }
    setStatusSuccess(feedback, result?.message || 'If the account exists, a reset email is on the way.')
    form.reset()
  } catch (error) {
    setStatusError(feedback, error instanceof Error ? error.message : 'Password reset request failed.')
  }
}

export async function mountAccountPanel(container: HTMLElement): Promise<void> {
  const rina = getRina()
  const authState = await fetchAuthState()
  const referralState = authState.authenticated ? await fetchReferralState() : null
  const billingEmail = String((await rina?.licenseCachedEmail?.())?.email || authState.user?.email || '')
    .trim()
    .toLowerCase()
  const authConfigured = typeof rina?.authLogin === 'function'

  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>Account</h2>
      <p class="rw-sub">Sign in, restore paid access, manage billing, and keep your Early Access setup supportable.</p>
    </div>
    ${authState.authenticated ? renderSignedIn(authState.user, billingEmail) : renderSignedOut(authConfigured, billingEmail)}
    ${canRenderPrivateAdminPanel(authState) ? renderPrivateAdminCard() : ''}
    ${renderBusinessCards()}
  `

  attachCommonActions(container, mountAccountPanel)

  if (authState.authenticated) {
    const referralCodeEl = container.querySelector<HTMLElement>('#rw-account-referral-code')
    const referralLinkEl = container.querySelector<HTMLInputElement>('#rw-account-referral-link')
    const referralStatsEl = container.querySelector<HTMLElement>('#rw-account-referral-stats')
    const referralStatusEl = container.querySelector<HTMLDivElement>('#rw-account-referral-status')
    if (referralState?.inviteUrl && referralLinkEl) {
      referralLinkEl.value = referralState.inviteUrl
    }
    if (referralCodeEl) {
      referralCodeEl.textContent = referralState?.code ? `Code ${referralState.code}` : 'Unavailable'
    }
    if (referralStatsEl) {
      referralStatsEl.textContent = referralState
        ? `${Number(referralState.stats?.checkouts || 0)} checkout(s) started • ${Number(referralState.stats?.conversions || 0)} paid conversion(s)`
        : 'Referral stats are unavailable right now.'
    }
    container.querySelector<HTMLButtonElement>('#rw-account-copy-referral-link')?.addEventListener('click', async () => {
      const value = referralLinkEl?.value?.trim()
      if (!value) {
        if (referralStatusEl) setStatusError(referralStatusEl, 'No referral link is available yet.')
        return
      }
      try {
        await navigator.clipboard.writeText(value)
        if (referralStatusEl) setStatusSuccess(referralStatusEl, 'Invite link copied.')
      } catch (error) {
        if (referralStatusEl) setStatusError(referralStatusEl, error instanceof Error ? error.message : 'Could not copy the invite link.')
      }
    })
    container.querySelector<HTMLButtonElement>('#rw-account-open-portal')?.addEventListener('click', async () => {
      const feedback = getFeedbackEl(container)
      if (feedback) setStatusPending(feedback, 'Opening billing portal…')
      const email = String(authState.user?.email || billingEmail || '').trim().toLowerCase()
      try {
        const result = await rina?.openStripePortal?.(email || undefined)
        if (feedback) {
          if (result?.ok) setStatusSuccess(feedback, 'Billing portal opened in your browser.')
          else setStatusError(feedback, result?.error || 'Could not open the billing portal.')
        }
      } catch (error) {
        if (feedback) setStatusError(feedback, error instanceof Error ? error.message : 'Could not open the billing portal.')
      }
    })
    container.querySelector<HTMLButtonElement>('#rw-account-logout')?.addEventListener('click', async () => {
      const feedback = getFeedbackEl(container)
      if (feedback) setStatusPending(feedback, 'Signing out…')
      await rina?.authLogout?.()
      void mountAccountPanel(container)
    })

    const adminForm = container.querySelector<HTMLFormElement>('#rw-account-admin-referral-form')
    const adminStatus = container.querySelector<HTMLDivElement>('#rw-account-admin-referral-status')
    const adminOutput = container.querySelector<HTMLElement>('#rw-account-admin-referral-output')
    const adminLoadMineBtn = container.querySelector<HTMLButtonElement>('#rw-account-admin-load-mine')
    const adminLoadRecentBtn = container.querySelector<HTMLButtonElement>('#rw-account-admin-load-recent')
    const adminCodeInput = container.querySelector<HTMLInputElement>('#rw-account-admin-referral-code')
    const adminEmailInput = container.querySelector<HTMLInputElement>('#rw-account-admin-referral-email')

    const runAdminLookup = async (query: { code?: string; email?: string }): Promise<void> => {
      if (!adminStatus || !adminOutput) return
      if (!authState.authenticated) {
        setStatusError(adminStatus, 'Sign in first to load private referral activity.')
        adminOutput.textContent = 'Local admin tools are visible in this build, but live referral data still requires your authenticated account.'
        return
      }
      setStatusPending(adminStatus, 'Looking up referral activity…')
      adminOutput.textContent = ''
      const payload = await fetchReferralAdminLookup(query)
      if (!payload?.ok && !payload?.found) {
        setStatusError(adminStatus, payload?.error || 'Referral lookup failed.')
        return
      }
      if (!payload?.found) {
        setStatusSuccess(adminStatus, 'Lookup finished.')
        adminOutput.textContent = 'No referral record found.'
        return
      }
      const lines =
        payload.mode === 'recent'
          ? [
              'Recent referral activity',
              `Events: ${Number(payload.stats?.events || 0)}`,
              `Checkouts: ${Number(payload.stats?.checkouts || 0)}`,
              `Conversions: ${Number(payload.stats?.conversions || 0)}`,
              '',
              'Latest events:',
              ...((payload.events || []).map((entry) =>
                `- ${String(entry.referral_code || '—')} · ${String(entry.event_type || 'event')} · ${String(entry.referred_email || '—')} · ${String(entry.source || '—')}`
              )),
            ]
          : [
              `Referral code: ${payload.referral?.code || '—'}`,
              `Owner email: ${payload.referral?.email || '—'}`,
              `Owner name: ${payload.referral?.name || '—'}`,
              `Events: ${Number(payload.stats?.events || 0)}`,
              `Checkouts: ${Number(payload.stats?.checkouts || 0)}`,
              `Conversions: ${Number(payload.stats?.conversions || 0)}`,
              '',
              'Recent events:',
              ...((payload.events || []).map((entry) =>
                `- ${String(entry.event_type || 'event')} · ${String(entry.referred_email || '—')} · ${String(entry.source || '—')}`
              )),
            ]
      adminOutput.textContent = lines.join('\n')
      setStatusSuccess(adminStatus, 'Lookup finished.')
    }

    adminForm?.addEventListener('submit', (event) => {
      event.preventDefault()
      void runAdminLookup({
        code: adminCodeInput?.value?.trim() || undefined,
        email: adminEmailInput?.value?.trim() || undefined,
      })
    })

    adminLoadMineBtn?.addEventListener('click', () => {
      if (referralState?.code && adminCodeInput) adminCodeInput.value = referralState.code
      if (authState.user?.email && adminEmailInput) adminEmailInput.value = authState.user.email
      void runAdminLookup({
        code: referralState?.code || undefined,
        email: authState.user?.email || undefined,
      })
    })

    adminLoadRecentBtn?.addEventListener('click', () => {
      if (adminCodeInput) adminCodeInput.value = ''
      if (adminEmailInput) adminEmailInput.value = ''
      void runAdminLookup({})
    })
    return
  }

  setActiveView(container, 'login')

  for (const button of Array.from(container.querySelectorAll<HTMLButtonElement>('[data-account-view]'))) {
    button.addEventListener('click', () => {
      const next = button.dataset.accountView
      if (next === 'login' || next === 'register' || next === 'reset') setActiveView(container, next)
    })
  }

  container.querySelector<HTMLFormElement>('[data-account-form="login"]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    void handleLogin(container, mountAccountPanel)
  })
  container.querySelector<HTMLFormElement>('[data-account-form="register"]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    void handleRegister(container)
  })
  container.querySelector<HTMLFormElement>('[data-account-form="reset"]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    void handleReset(container)
  })
}
