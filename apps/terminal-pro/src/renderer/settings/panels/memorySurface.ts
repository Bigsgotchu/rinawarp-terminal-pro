type MemoryWorkspaceState = {
  workspaceId: string
  label?: string
  preferredResponseStyle?: string[]
  preferredProofStyle?: string[]
  conventions?: Array<{ key: string; value: string }>
  updatedAt: string
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function linesFromConventions(entries: Array<{ key: string; value: string }> | undefined): string {
  return Array.isArray(entries) ? entries.map((entry) => `${entry.key}=${entry.value}`).join('\n') : ''
}

export function linesFromStrings(entries: string[] | undefined): string {
  return Array.isArray(entries) ? entries.join('\n') : ''
}

export function renderWorkspaceSummary(workspaceId: string, state: MemoryWorkspaceState | undefined): string {
  if (!state) {
    return `<div class="rw-muted">No workspace memory saved yet for this project.</div>`
  }
  const conventionCount = Array.isArray(state.conventions) ? state.conventions.length : 0
  return `
    <div class="rw-row">
      <div>
        <div class="rw-label">${esc(state.label || workspaceId)}</div>
        <div class="rw-muted">${esc(workspaceId)}</div>
      </div>
      <div class="rw-pill">Updated ${esc(new Date(state.updatedAt).toLocaleString())}</div>
    </div>
    <div class="rw-row">
      <div class="rw-muted">Response defaults: ${esc(linesFromStrings(state.preferredResponseStyle) || '\u2014')}</div>
    </div>
    <div class="rw-row">
      <div class="rw-muted">Proof defaults: ${esc(linesFromStrings(state.preferredProofStyle) || '\u2014')}</div>
    </div>
    <div class="rw-row">
      <div class="rw-muted">Conventions: ${esc(conventionCount)}</div>
    </div>
  `
}

export function renderMemoryPanelShell(): string {
  return `
    <div class="rw-panel-head">
      <h2>Memory</h2>
      <p class="rw-sub">Owner-only preferences and workspace memory for Rina. Explicit only in this phase.</p>
    </div>
    <div class="rw-card rw-flex rw-gap">
      <div id="rw-memory-owner-meta" class="rw-row rw-space"></div>
      <div class="rw-row">
        <div>
          <div class="rw-label">Preferred name</div>
          <div class="rw-muted">How Rina should refer to you in a natural way.</div>
        </div>
      </div>
      <input id="rw-memory-preferred-name" class="rw-input" placeholder="Karina" />
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Tone preference</div>
          <div class="rw-muted">Controls how concise or guided the default explanation style feels.</div>
        </div>
        <select id="rw-memory-tone" class="rw-input">
          <option value="concise">Concise</option>
          <option value="balanced">Balanced</option>
          <option value="detailed">Detailed</option>
        </select>
      </div>
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Humor preference</div>
          <div class="rw-muted">Keeps personality bounded and explicit.</div>
        </div>
        <select id="rw-memory-humor" class="rw-input">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div class="rw-row">
        <div>
          <div class="rw-label">Likes</div>
          <div class="rw-muted">One item per line. Example: concise proof, direct status updates.</div>
        </div>
      </div>
      <textarea id="rw-memory-likes" class="rw-input" rows="4" placeholder="concise proof"></textarea>
      <div class="rw-row">
        <div>
          <div class="rw-label">Dislikes</div>
          <div class="rw-muted">One item per line. Example: fake progress language.</div>
        </div>
      </div>
      <textarea id="rw-memory-dislikes" class="rw-input" rows="4" placeholder="fake progress language"></textarea>
      <div class="rw-row rw-gap">
        <button type="button" id="rw-memory-save-profile" class="rw-btn">Save owner profile</button>
        <button type="button" id="rw-memory-reset-all" class="rw-btn rw-btn-ghost">Reset all memory</button>
      </div>
    </div>
    <div class="rw-card rw-flex rw-gap">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Current workspace memory</div>
          <div id="rw-memory-workspace-path" class="rw-muted">Loading workspace…</div>
        </div>
        <div id="rw-memory-workspace-status" class="rw-pill">Workspace</div>
      </div>
      <div id="rw-memory-workspace-summary"></div>
      <div class="rw-row">
        <div>
          <div class="rw-label">Preferred response style</div>
          <div class="rw-muted">One phrase per line, for this workspace only.</div>
        </div>
      </div>
      <textarea id="rw-memory-response-style" class="rw-input" rows="4" placeholder="show the short plan first"></textarea>
      <div class="rw-row">
        <div>
          <div class="rw-label">Preferred proof style</div>
          <div class="rw-muted">One phrase per line, for this workspace only.</div>
        </div>
      </div>
      <textarea id="rw-memory-proof-style" class="rw-input" rows="4" placeholder="keep run IDs visible"></textarea>
      <div class="rw-row">
        <div>
          <div class="rw-label">Workspace conventions</div>
          <div class="rw-muted">One convention per line in <code>key=value</code> form.</div>
        </div>
      </div>
      <textarea id="rw-memory-conventions" class="rw-input" rows="5" placeholder="packageManager=npm"></textarea>
      <div class="rw-row rw-gap">
        <button type="button" id="rw-memory-save-workspace" class="rw-btn">Save workspace memory</button>
        <button type="button" id="rw-memory-reset-workspace" class="rw-btn rw-btn-ghost">Reset this workspace</button>
      </div>
    </div>
    <div class="rw-card rw-flex rw-gap">
      <div class="rw-row rw-space">
        <div>
          <div class="rw-label">Inferred memory review</div>
          <div class="rw-muted">Behavior-based suggestions stay here until you approve or dismiss them.</div>
        </div>
        <div class="rw-pill">Owner review</div>
      </div>
      <div id="rw-memory-inferred-list" class="rw-flex rw-gap"></div>
    </div>
    <div id="rw-memory-feedback" class="rw-muted"></div>
  `
}
