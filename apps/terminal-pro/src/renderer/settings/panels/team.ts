import { setStatusError, setStatusPending, setStatusSuccess } from './licenseUi.js'

type TeamMember = { email: string; role: string }
type TeamState = {
  ok?: boolean
  workspaceId?: string
  currentUser: string
  currentRole: string
  members: TeamMember[]
  seatsAllowed: number
  seatsUsed: number
  error?: string
}

type TeamPlan = {
  ok?: boolean
  plan?: string
  status?: string
  seats_allowed?: number
  seats_used?: number
  renews_at?: string
  error?: string
}

type TeamWorkspace = {
  id?: string
  name?: string
  region?: string
  owner_id?: string
  members?: number
  seats_allowed?: number
  seats_used?: number
  billing_status?: string
  billing_enforced?: boolean
  billing_locked?: boolean
  created_at?: string
  updated_at?: string
  error?: string
}

type TeamInvite = {
  invite_id: string
  email: string
  role: string
  status: string
  expires_at: string
  created_at?: string
  token_hint?: string
}

type TeamAuditEntry = {
  id: string
  type: string
  actor_id: string
  timestamp: string
  metadata?: Record<string, unknown>
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

function esc(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function formatDate(value?: string | null): string {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function statusTone(value: string): 'success' | 'error' | 'pending' {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'active' || normalized === 'team' || normalized === 'pro') return 'success'
  if (normalized === 'past_due' || normalized === 'canceled' || normalized === 'cancelled' || normalized === 'locked')
    return 'error'
  return 'pending'
}

function renderMembers(members: TeamMember[]): string {
  if (!members.length) {
    return `<div class="rw-muted">No team members are cached locally yet.</div>`
  }
  return members
    .map(
      (member) => `
        <div class="rw-team-member">
          <div class="rw-team-member-main">
            <div class="rw-account-identity">${esc(member.email)}</div>
            <div class="rw-muted">Role: ${esc(member.role)}</div>
          </div>
          <div class="rw-pill">${esc(member.role)}</div>
        </div>
      `
    )
    .join('')
}

function renderInvites(invites: TeamInvite[]): string {
  if (!invites.length) {
    return `<div class="rw-muted">No pending invites yet.</div>`
  }
  return invites
    .map(
      (invite) => `
        <div class="rw-team-member">
          <div class="rw-team-member-main">
            <div class="rw-account-identity">${esc(invite.email)}</div>
            <div class="rw-muted">${esc(invite.role)} · ${esc(invite.status)} · expires ${esc(formatDate(invite.expires_at))}</div>
          </div>
          <div class="rw-row rw-gap">
            ${invite.token_hint ? `<div class="rw-pill">…${esc(invite.token_hint)}</div>` : ''}
            ${invite.status === 'pending' ? `<button type="button" class="rw-btn rw-btn-ghost" data-team-revoke="${esc(invite.invite_id)}">Revoke</button>` : ''}
          </div>
        </div>
      `
    )
    .join('')
}

function renderAudit(entries: TeamAuditEntry[]): string {
  if (!entries.length) {
    return `<div class="rw-muted">No audit events returned for this workspace yet.</div>`
  }
  return entries
    .map(
      (entry) => `
        <div class="rw-team-audit-row">
          <div>
            <div class="rw-account-identity">${esc(entry.type)}</div>
            <div class="rw-muted">${esc(entry.actor_id)} · ${esc(formatDate(entry.timestamp))}</div>
          </div>
          <div class="rw-muted rw-team-audit-meta">${esc(JSON.stringify(entry.metadata || {}))}</div>
        </div>
      `
    )
    .join('')
}

async function loadTeamData() {
  const rina = getRina()
  const teamState = ((await rina?.teamState?.().catch(() => null)) || {
    currentUser: 'owner@local',
    currentRole: 'owner',
    members: [{ email: 'owner@local', role: 'owner' }],
    seatsAllowed: 1,
    seatsUsed: 1,
  }) as TeamState
  const teamPlan = ((await rina?.teamPlan?.().catch(() => null)) || {}) as TeamPlan
  const workspaceId = String(teamState?.workspaceId || '').trim()
  const workspace = workspaceId ? ((await rina?.teamWorkspaceGet?.(workspaceId).catch(() => null)) || {}) as TeamWorkspace : null
  const invitesPayload = workspaceId ? await rina?.teamInvitesList?.(workspaceId).catch(() => null) : null
  const auditPayload = workspaceId ? await rina?.teamAuditList?.({ workspaceId, limit: 8 }).catch(() => null) : null
  return {
    teamState,
    teamPlan,
    workspaceId,
    workspace,
    invites: Array.isArray(invitesPayload?.invites) ? (invitesPayload.invites as TeamInvite[]) : [],
    audit: Array.isArray(auditPayload?.entries) ? (auditPayload.entries as TeamAuditEntry[]) : [],
  }
}

async function refresh(container: HTMLElement): Promise<void> {
  await mountTeamPanel(container)
}

export async function mountTeamPanel(container: HTMLElement): Promise<void> {
  const rina = getRina()
  const { teamState, teamPlan, workspaceId, workspace, invites, audit } = await loadTeamData()
  const tierState = await rina?.licenseState?.().catch(() => null)
  const tier = String(tierState?.tier || 'starter').trim().toLowerCase()
  const currentUser = String(teamState?.currentUser || 'owner@local')
  const currentRole = String(teamState?.currentRole || 'owner')
  const members = Array.isArray(teamState?.members) ? teamState.members : []
  const seatsAllowed = Math.max(
    1,
    Number(workspace?.seats_allowed || teamPlan?.seats_allowed || teamState?.seatsAllowed || members.length || 1)
  )
  const seatsUsed = Math.max(1, Number(workspace?.seats_used || teamPlan?.seats_used || teamState?.seatsUsed || members.length || 1))
  const billingStatus = String(workspace?.billing_status || teamPlan?.status || 'unknown')
  const isBillingEnforced = workspace?.billing_enforced === true
  const billingTone = statusTone(billingStatus)
  const isTeamTier = tier === 'team'

  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>Team</h2>
      <p class="rw-sub">Run Team as a real product surface: workspace anchor, seats, invites, audit, and a direct path to team billing instead of “talk to us later” vapor.</p>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Current team plan</div>
          <div class="rw-account-identity">${isTeamTier ? 'Team tier active' : 'Team surface enabled'}</div>
          <div class="rw-muted">${isTeamTier ? 'This install already has Team entitlements.' : 'The controls below let you stand up and administer a Team workspace before broad rollout.'}</div>
        </div>
        <div class="rw-pill">${esc(String(teamPlan?.plan || tier || 'pro'))}</div>
      </div>
      <div class="rw-team-stats">
        <div><span class="rw-pill">User</span><span class="rw-muted">${esc(currentUser)}</span></div>
        <div><span class="rw-pill">Role</span><span class="rw-muted">${esc(currentRole)}</span></div>
        <div><span class="rw-pill">Workspace</span><span class="rw-muted">${esc(workspaceId || 'Not attached')}</span></div>
        <div><span class="rw-pill">Billing</span><span class="rw-muted rw-tone-${billingTone}">${esc(billingStatus)}</span></div>
        <div><span class="rw-pill">Seats</span><span class="rw-muted">${seatsUsed} of ${seatsAllowed} used</span></div>
        <div><span class="rw-pill">Renews</span><span class="rw-muted">${esc(formatDate(teamPlan?.renews_at || null))}</span></div>
      </div>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Workspace anchor</div>
          <div class="rw-account-identity">${esc(workspace?.name || 'No team workspace attached')}</div>
          <div class="rw-muted">${workspaceId ? `Region ${esc(String(workspace?.region || 'us-east-1'))} · updated ${esc(formatDate(workspace?.updated_at || null))}` : 'Create a workspace or attach an existing one before sending invites.'}</div>
        </div>
        <div class="rw-pill">${workspaceId ? 'Attached' : 'Needed'}</div>
      </div>
      <div class="rw-row rw-gap">
        <input class="rw-input" id="rw-team-workspace-id" type="text" placeholder="Existing workspace id" value="${esc(workspaceId)}" />
        <button type="button" class="rw-btn rw-btn-ghost" id="rw-team-attach">Attach</button>
      </div>
      <div class="rw-row rw-gap">
        <input class="rw-input" id="rw-team-workspace-name" type="text" placeholder="New workspace name" value="${esc(workspace?.name || 'RinaWarp Team Workspace')}" />
        <button type="button" class="rw-btn rw-btn-primary" id="rw-team-create-workspace">Create workspace</button>
      </div>
      <div id="rw-team-workspace-status" class="rw-muted" aria-live="polite"></div>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Seat admin</div>
          <div class="rw-muted">Seat usage comes from the workspace state. Team checkout below is how you increase the paid seat count; billing enforcement makes full workspaces stop over-inviting.</div>
        </div>
      </div>
      <div class="rw-team-stats">
        <div><span class="rw-pill">Allowed</span><span class="rw-muted">${seatsAllowed}</span></div>
        <div><span class="rw-pill">Used</span><span class="rw-muted">${seatsUsed}</span></div>
        <div><span class="rw-pill">Remaining</span><span class="rw-muted">${Math.max(0, seatsAllowed - seatsUsed)}</span></div>
        <div><span class="rw-pill">Billing enforcement</span><span class="rw-muted">${isBillingEnforced ? 'On' : 'Off'}</span></div>
      </div>
      <label class="rw-inline-check">
        <input id="rw-team-enforce" type="checkbox" ${isBillingEnforced ? 'checked' : ''} ${workspaceId ? '' : 'disabled'} />
        <span>Require an active paid Team plan before new invites can be accepted</span>
      </label>
      <div class="rw-row rw-gap">
        <button type="button" class="rw-btn rw-btn-ghost" id="rw-team-save-billing" ${workspaceId ? '' : 'disabled'}>Save seat policy</button>
        <button type="button" class="rw-btn rw-btn-ghost" id="rw-team-refresh">Refresh team state</button>
      </div>
      <div id="rw-team-billing-status" class="rw-muted" aria-live="polite"></div>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Invite management</div>
          <div class="rw-muted">Create role-bound invites using the real team backend. Pending invites can be revoked before they are accepted.</div>
        </div>
      </div>
      <div class="rw-row rw-gap">
        <input class="rw-input" id="rw-team-invite-email" type="email" placeholder="teammate@company.com" />
        <select class="rw-input rw-select" id="rw-team-invite-role">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
        <input class="rw-input rw-input-sm" id="rw-team-invite-hours" type="number" min="1" max="336" value="72" />
      </div>
      <label class="rw-inline-check">
        <input id="rw-team-send-email" type="checkbox" checked ${workspaceId ? '' : 'disabled'} />
        <span>Queue invite email as well as returning the token in-app</span>
      </label>
      <div class="rw-row rw-gap">
        <button type="button" class="rw-btn rw-btn-primary" id="rw-team-invite-create" ${workspaceId ? '' : 'disabled'}>Send invite</button>
      </div>
      <div id="rw-team-invite-status" class="rw-muted" aria-live="polite"></div>
      <div class="rw-team-members">${renderInvites(invites)}</div>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Workspace audit</div>
          <div class="rw-muted">Recent team events from the audit trail already present in the backend surface.</div>
        </div>
      </div>
      <div class="rw-team-audit">${renderAudit(audit)}</div>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Team checkout</div>
          <div class="rw-muted">Self-serve Team checkout uses the live $49 per-user monthly price and carries your workspace id so billing and seats can converge cleanly.</div>
        </div>
        <div class="rw-pill">$49 / user / month</div>
      </div>
      <div class="rw-row rw-gap">
        <input class="rw-input" id="rw-team-checkout-email" type="email" placeholder="billing@company.com" value="${esc(currentUser.includes('@') ? currentUser : '')}" />
        <input class="rw-input rw-input-sm" id="rw-team-checkout-seats" type="number" min="1" max="500" value="${Math.max(2, seatsAllowed)}" />
      </div>
      <div class="rw-row rw-gap">
        <button type="button" class="rw-btn rw-btn-primary" id="rw-team-checkout">Start Team checkout</button>
        <button type="button" class="rw-btn rw-btn-ghost" id="rw-team-open-page">Open Team page</button>
      </div>
      <div id="rw-team-checkout-status" class="rw-muted" aria-live="polite"></div>
    </div>

    <div class="rw-card">
      <div class="rw-label">Local team members</div>
      <div class="rw-muted">This machine still keeps a local view of who is attached to the workspace so the UI can stay useful even when the network is flaky.</div>
      <div class="rw-team-members">${renderMembers(members)}</div>
    </div>
  `

  const workspaceStatusEl = container.querySelector<HTMLDivElement>('#rw-team-workspace-status')
  const billingStatusEl = container.querySelector<HTMLDivElement>('#rw-team-billing-status')
  const inviteStatusEl = container.querySelector<HTMLDivElement>('#rw-team-invite-status')
  const checkoutStatusEl = container.querySelector<HTMLDivElement>('#rw-team-checkout-status')

  container.querySelector<HTMLButtonElement>('#rw-team-attach')?.addEventListener('click', async () => {
    const input = container.querySelector<HTMLInputElement>('#rw-team-workspace-id')
    const nextWorkspaceId = String(input?.value || '').trim()
    if (!workspaceStatusEl) return
    if (!nextWorkspaceId) {
      setStatusError(workspaceStatusEl, 'Enter an existing workspace id first.')
      return
    }
    setStatusPending(workspaceStatusEl, 'Attaching workspace…')
    const result = await rina?.teamWorkspaceSet?.(nextWorkspaceId)
    if (!result?.ok) {
      setStatusError(workspaceStatusEl, result?.error || 'Could not attach workspace.')
      return
    }
    setStatusSuccess(workspaceStatusEl, 'Workspace attached. Refreshing team surface…')
    await refresh(container)
  })

  container.querySelector<HTMLButtonElement>('#rw-team-create-workspace')?.addEventListener('click', async () => {
    const input = container.querySelector<HTMLInputElement>('#rw-team-workspace-name')
    const name = String(input?.value || '').trim()
    if (!workspaceStatusEl) return
    if (!name) {
      setStatusError(workspaceStatusEl, 'Give the workspace a name first.')
      return
    }
    setStatusPending(workspaceStatusEl, 'Creating workspace…')
    const created = await rina?.teamWorkspaceCreate?.({ name, region: 'us-east-1' })
    if (!created?.workspace_id) {
      setStatusError(workspaceStatusEl, created?.error || 'Workspace could not be created.')
      return
    }
    setStatusSuccess(workspaceStatusEl, `Workspace created: ${created.workspace_id}. Refreshing…`)
    await refresh(container)
  })

  container.querySelector<HTMLButtonElement>('#rw-team-save-billing')?.addEventListener('click', async () => {
    const enforceEl = container.querySelector<HTMLInputElement>('#rw-team-enforce')
    if (!billingStatusEl) return
    setStatusPending(billingStatusEl, 'Saving billing enforcement…')
    const result = await rina?.teamBillingSetEnforcement?.({
      workspaceId,
      requireActivePlan: enforceEl?.checked === true,
    })
    if (!result?.ok) {
      setStatusError(billingStatusEl, result?.error || 'Could not update billing enforcement.')
      return
    }
    setStatusSuccess(billingStatusEl, 'Seat policy saved. Refreshing team state…')
    await refresh(container)
  })

  container.querySelector<HTMLButtonElement>('#rw-team-refresh')?.addEventListener('click', async () => {
    if (!billingStatusEl) return
    setStatusPending(billingStatusEl, 'Refreshing…')
    await refresh(container)
  })

  container.querySelector<HTMLButtonElement>('#rw-team-invite-create')?.addEventListener('click', async () => {
    const email = String(container.querySelector<HTMLInputElement>('#rw-team-invite-email')?.value || '').trim()
    const role = String(container.querySelector<HTMLSelectElement>('#rw-team-invite-role')?.value || 'member').trim()
    const expiresInHours = Number(container.querySelector<HTMLInputElement>('#rw-team-invite-hours')?.value || 72)
    const sendEmail = container.querySelector<HTMLInputElement>('#rw-team-send-email')?.checked === true
    if (!inviteStatusEl) return
    if (!email) {
      setStatusError(inviteStatusEl, 'Enter a teammate email before sending the invite.')
      return
    }
    setStatusPending(inviteStatusEl, 'Creating invite…')
    const result = await rina?.teamInviteCreate?.({
      workspaceId,
      email,
      role,
      expiresInHours,
      sendEmail,
    })
    if (!result?.invite_id) {
      setStatusError(inviteStatusEl, result?.error || 'Invite could not be created.')
      return
    }
    const tokenHint = result?.invite_token ? ` Token: ${result.invite_token}` : ''
    setStatusSuccess(inviteStatusEl, `Invite created.${tokenHint}`)
    await refresh(container)
  })

  for (const button of Array.from(container.querySelectorAll<HTMLButtonElement>('[data-team-revoke]'))) {
    button.addEventListener('click', async () => {
      if (!inviteStatusEl) return
      const inviteId = String(button.dataset.teamRevoke || '').trim()
      setStatusPending(inviteStatusEl, 'Revoking invite…')
      const result = await rina?.teamInviteRevoke?.(inviteId)
      if (!result?.ok) {
        setStatusError(inviteStatusEl, result?.error || 'Invite could not be revoked.')
        return
      }
      setStatusSuccess(inviteStatusEl, 'Invite revoked.')
      await refresh(container)
    })
  }

  container.querySelector<HTMLButtonElement>('#rw-team-checkout')?.addEventListener('click', async () => {
    const email = String(container.querySelector<HTMLInputElement>('#rw-team-checkout-email')?.value || '').trim()
    const seats = Math.max(1, Number(container.querySelector<HTMLInputElement>('#rw-team-checkout-seats')?.value || seatsAllowed || 1))
    if (!checkoutStatusEl) return
    if (!email) {
      setStatusError(checkoutStatusEl, 'Enter the billing email for this Team subscription.')
      return
    }
    setStatusPending(checkoutStatusEl, 'Opening Team checkout in Stripe…')
    const result = await rina?.licenseCheckout?.({
      email,
      tier: 'team',
      seats,
      workspaceId,
    })
    if (!result?.ok) {
      setStatusError(
        checkoutStatusEl,
        result?.error || 'Team checkout could not be created. Try the Team page or check Stripe config.'
      )
      return
    }
    setStatusSuccess(checkoutStatusEl, 'Stripe checkout opened. When payment completes, refresh the team state.')
  })

  container.querySelector<HTMLButtonElement>('#rw-team-open-page')?.addEventListener('click', async () => {
    await openExternal('https://rinawarptech.com/team/')
  })
}
