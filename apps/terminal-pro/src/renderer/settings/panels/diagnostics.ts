import { exportSupportBundleOwned } from '../../actions/utilityOwnership.js'

function getRina(): any {
  return (window as unknown as { rina: unknown }).rina
}

function getDebugSnapshot(): any {
  return (window as unknown as { __rinaDebugEvidence?: { getSnapshot?: () => unknown } }).__rinaDebugEvidence?.getSnapshot?.()
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function fmtBytes(n: number | null | undefined): string {
  if (!Number.isFinite(n as number)) return '—'
  const v = n as number
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let x = v
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024
    i += 1
  }
  return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replaceAll('&', '&')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
}

type FileRow = { exists?: boolean; sizeBytes?: number; path?: string; sha256?: string }

function renderFileRow(label: string, rv: FileRow | undefined): string {
  const exists = !!rv?.exists
  const badge = exists ? `<span class="rw-badge rw-ok">OK</span>` : `<span class="rw-badge rw-bad">MISSING</span>`
  return `
    <div class="rw-file">
      <div class="rw-file-head">
        <div class="rw-file-title">${esc(label)} ${badge}</div>
        <div class="rw-muted">${fmtBytes(rv?.sizeBytes)}</div>
      </div>
      <div class="rw-file-path">${esc(rv?.path)}</div>
      <div class="rw-file-hash">${esc(rv?.sha256 || '—')}</div>
    </div>
  `
}

function renderRuntime(el: HTMLElement, app: any): void {
  el.innerHTML = `
    <div class="rw-kv"><div class="rw-k">Packaged</div><div class="rw-v">${esc(app?.isPackaged)}</div></div>
    <div class="rw-kv"><div class="rw-k">Platform</div><div class="rw-v">${esc(app?.platform)}</div></div>
    <div class="rw-kv"><div class="rw-k">Arch</div><div class="rw-v">${esc(app?.arch)}</div></div>
    <div class="rw-kv"><div class="rw-k">AppPath</div><div class="rw-v">${esc(app?.appPath)}</div></div>
    <div class="rw-kv"><div class="rw-k">Resources</div><div class="rw-v">${esc(app?.resourcesPath)}</div></div>
    <div class="rw-kv"><div class="rw-k">CWD</div><div class="rw-v">${esc(app?.cwd)}</div></div>
  `
}

function renderFiles(el: HTMLElement, resolved: any): void {
  const rows: Array<{ label: string; v: unknown }> = [
    { label: 'Main', v: resolved.main },
    { label: 'Preload', v: resolved.preload },
    { label: 'Renderer', v: resolved.renderer },
    { label: 'Themes', v: resolved.themeRegistry },
    { label: 'Policy', v: resolved.policyYaml },
  ]
  el.innerHTML = rows.map((r) => renderFileRow(r.label, r.v as FileRow | undefined)).join('')
}

function renderNotes(el: HTMLElement, notes: unknown): void {
  const arr = Array.isArray(notes) ? notes : []
  el.innerHTML = arr.length
    ? `<div class="rw-warn">${arr.map((n: unknown) => `<div>• ${esc(n)}</div>`).join('')}</div>`
    : `<div class="rw-muted">No notes.</div>`
}

export async function mountDiagnosticsPanel(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>Diagnostics</h2>
      <p class="rw-sub">Copy system info for support and verify packaged paths.</p>
    </div>

    <div class="rw-card rw-flex rw-gap">
      <div class="rw-row rw-gap">
        <button id="rw-diag-refresh" class="rw-btn">Refresh</button>
        <button id="rw-diag-copy" class="rw-btn rw-btn-ghost">Copy JSON</button>
        <button id="rw-diag-receipt" class="rw-btn rw-btn-ghost">Copy bug receipt</button>
        <button id="rw-diag-bundle" class="rw-btn rw-btn-ghost">Export debug bundle</button>
        <div id="rw-diag-status" class="rw-muted"></div>
      </div>

      <div id="rw-diag-runtime" class="rw-diag-grid"></div>
      <div id="rw-diag-files" class="rw-diag-files"></div>
      <div id="rw-diag-notes" class="rw-diag-notes"></div>
      <pre id="rw-diag-raw" class="rw-code"></pre>
    </div>
  `

  const rina = getRina()
  const refreshBtn = container.querySelector<HTMLButtonElement>('#rw-diag-refresh')
  const copyBtn = container.querySelector<HTMLButtonElement>('#rw-diag-copy')
  const receiptBtn = container.querySelector<HTMLButtonElement>('#rw-diag-receipt')
  const bundleBtn = container.querySelector<HTMLButtonElement>('#rw-diag-bundle')
  const statusEl = container.querySelector<HTMLElement>('#rw-diag-status')
  const runtimeEl = container.querySelector<HTMLElement>('#rw-diag-runtime')
  const filesEl = container.querySelector<HTMLElement>('#rw-diag-files')
  const notesEl = container.querySelector<HTMLElement>('#rw-diag-notes')
  const rawEl = container.querySelector<HTMLElement>('#rw-diag-raw')
  if (!refreshBtn || !copyBtn || !receiptBtn || !bundleBtn || !statusEl || !runtimeEl || !filesEl || !notesEl || !rawEl) return

  if (!rina?.diagnosticsPaths) {
    statusEl.textContent = 'Diagnostics API not available. Check preload bridge.'
    return
  }

  let lastPayload: any = null

  const render = (payload: any) => {
    lastPayload = payload
    rawEl.textContent = JSON.stringify(payload, null, 2)
    renderRuntime(runtimeEl, payload?.app || {})
    renderFiles(filesEl, payload?.resolved || {})
    renderNotes(notesEl, payload?.notes)
  }

  const refresh = async () => {
    statusEl.textContent = 'Refreshing…'
    try {
      const payload = await rina.diagnosticsPaths()
      render(payload)
      statusEl.textContent = 'Ready.'
    } catch (e) {
      statusEl.textContent = `Failed: ${String(e)}`
    }
  }

  refreshBtn.addEventListener('click', () => void refresh())

  copyBtn.addEventListener('click', async () => {
    const ok = await copyToClipboard(lastPayload ? JSON.stringify(lastPayload, null, 2) : '')
    statusEl.textContent = ok ? 'Copied.' : 'Copy failed.'
  })

  receiptBtn.addEventListener('click', async () => {
    const snapshot = getDebugSnapshot()
    const receipt = snapshot?.bugReceipt || snapshot || lastPayload
    const ok = await copyToClipboard(JSON.stringify(receipt, null, 2))
    statusEl.textContent = ok ? 'Bug receipt copied.' : 'Copy failed.'
  })

  bundleBtn.addEventListener('click', async () => {
    if (!rina?.supportBundle) {
      statusEl.textContent = 'Debug bundle API not available.'
      return
    }
    statusEl.textContent = 'Creating debug bundle…'
    try {
      const snapshot = getDebugSnapshot()
      const resp = await exportSupportBundleOwned(String(snapshot?.workspaceRoot || 'diagnostics'), snapshot, {
        source: 'diagnostics_panel',
      })
      statusEl.textContent = resp?.ok ? `Saved: ${resp.path}` : `Failed: ${resp?.error || 'unknown'}`
    } catch (e) {
      statusEl.textContent = `Failed: ${String(e)}`
    }
  })

  await refresh()
}
