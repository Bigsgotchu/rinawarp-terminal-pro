import { setStatusError, setStatusSuccess } from './licenseUi.js'

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

function renderMemberRows(members: Array<{ email: string; role: string }>): string {
  if (!members.length) {
    return `<div class="rw-muted">No team members recorded on this device yet.</div>`
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

export async function mountTeamPanel(container: HTMLElement): Promise<void> {
  const rina = getRina()
  const [licenseState, teamState] = await Promise.all([
    rina?.licenseState?.().catch(() => null),
    rina?.teamState?.().catch(() => null),
  ])

  const tier = String(licenseState?.tier || 'starter').trim().toLowerCase()
  const isTeamTier = tier === 'team'
  const currentRole = String(teamState?.currentRole || 'owner')
  const currentUser = String(teamState?.currentUser || 'owner@local')
  const seatsAllowed = Math.max(1, Number(teamState?.seatsAllowed || teamState?.members?.length || 1))
  const seatsUsed = Math.max(1, Number(teamState?.seatsUsed || teamState?.members?.length || 1))
  const members = Array.isArray(teamState?.members) ? teamState.members : [{ email: currentUser, role: currentRole }]

  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>Team</h2>
      <p class="rw-sub">Make the Team / Business tier true with managed seats, clear roles, and supportable onboarding instead of vague futureware.</p>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Current team state</div>
          <div class="rw-account-identity">${isTeamTier ? 'Team plan active' : 'Managed Team onboarding'}</div>
          <div class="rw-muted">${isTeamTier ? 'This install can use team-role and multi-seat behavior.' : 'Team is currently a founder-managed offer, not a self-serve checkout path.'}</div>
        </div>
        <div class="rw-pill">${isTeamTier ? 'Team tier' : 'Pilot / managed'}</div>
      </div>
      <div class="rw-team-stats">
        <div><span class="rw-pill">Tier</span><span class="rw-muted">${esc(tier || 'starter')}</span></div>
        <div><span class="rw-pill">Current user</span><span class="rw-muted">${esc(currentUser)}</span></div>
        <div><span class="rw-pill">Role</span><span class="rw-muted">${esc(currentRole)}</span></div>
        <div><span class="rw-pill">Seats</span><span class="rw-muted">${seatsUsed} of ${seatsAllowed} used</span></div>
      </div>
    </div>

    <div class="rw-card">
      <div class="rw-label">What Team includes</div>
      <div class="rw-muted">The Team offer is anchored to the capabilities already in the product stack and daemon surfaces.</div>
      <div class="rw-team-stats">
        <div><span class="rw-pill">Roles</span><span class="rw-muted">Owner, admin, and member boundaries</span></div>
        <div><span class="rw-pill">Seats</span><span class="rw-muted">Seat tracking and seat-limit enforcement</span></div>
        <div><span class="rw-pill">Invites</span><span class="rw-muted">Invite and accept flow in the team backend / CLI</span></div>
        <div><span class="rw-pill">Audit</span><span class="rw-muted">Audit and workspace event surfaces are already present</span></div>
        <div><span class="rw-pill">Concurrency</span><span class="rw-muted">Higher multi-agent and memory limits than Pro</span></div>
        <div><span class="rw-pill">Support</span><span class="rw-muted">Founder-managed onboarding and support while Team stays managed</span></div>
      </div>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Members on this device</div>
          <div class="rw-muted">This reflects the local team workspace state currently attached to the app.</div>
        </div>
      </div>
      <div class="rw-team-members">${renderMemberRows(members)}</div>
      <div id="rw-team-status" class="rw-muted" aria-live="polite"></div>
      <div class="rw-row rw-gap">
        <button type="button" class="rw-btn rw-btn-primary" id="rw-team-contact">Talk to RinaWarp about Team</button>
        <button type="button" class="rw-btn rw-btn-ghost" id="rw-team-docs">Open Team page</button>
        <button type="button" class="rw-btn rw-btn-ghost" id="rw-team-email">Email team sales</button>
      </div>
    </div>
  `

  const statusEl = container.querySelector<HTMLDivElement>('#rw-team-status')

  container.querySelector<HTMLButtonElement>('#rw-team-contact')?.addEventListener('click', async () => {
    try {
      await openExternal('https://rinawarptech.com/team/')
      if (statusEl) setStatusSuccess(statusEl, 'Opened the Team onboarding page in your browser.')
    } catch (error) {
      if (statusEl) setStatusError(statusEl, error instanceof Error ? error.message : 'Could not open the Team page.')
    }
  })

  container.querySelector<HTMLButtonElement>('#rw-team-docs')?.addEventListener('click', () => {
    void openExternal('https://rinawarptech.com/team/')
  })

  container.querySelector<HTMLButtonElement>('#rw-team-email')?.addEventListener('click', () => {
    void openExternal(
      'mailto:hello@rinawarptech.com?subject=RinaWarp%20Team%20Plan&body=Tell%20us%20your%20team%20size%2C%20platforms%2C%20and%20what%20you%20need%20RinaWarp%20to%20support.'
    )
  })
}
