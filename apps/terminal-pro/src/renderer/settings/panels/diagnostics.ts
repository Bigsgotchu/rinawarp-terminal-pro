import { exportSupportBundleOwned } from '../../actions/utilityOwnership.js'
import { renderDiagnosticsPanelPayload, renderDiagnosticsPanelShell } from './diagnosticsSurface.js'

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

export async function mountDiagnosticsPanel(container: HTMLElement): Promise<void> {
  container.innerHTML = renderDiagnosticsPanelShell()

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
    const rendered = renderDiagnosticsPanelPayload(payload)
    rawEl.textContent = rendered.rawJson
    runtimeEl.innerHTML = rendered.runtimeHtml
    filesEl.innerHTML = rendered.filesHtml
    notesEl.innerHTML = rendered.notesHtml
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
