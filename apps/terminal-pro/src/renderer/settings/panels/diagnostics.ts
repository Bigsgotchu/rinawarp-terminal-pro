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
  const titleEl = container.querySelector<HTMLElement>('#rw-diag-title')
  const refreshBtn = container.querySelector<HTMLButtonElement>('#rw-diag-refresh')
  const copyBtn = container.querySelector<HTMLButtonElement>('#rw-diag-copy')
  const receiptBtn = container.querySelector<HTMLButtonElement>('#rw-diag-receipt')
  const bundleBtn = container.querySelector<HTMLButtonElement>('#rw-diag-bundle')
  const statusEl = container.querySelector<HTMLElement>('#rw-diag-status')
  const runtimeEl = container.querySelector<HTMLElement>('#rw-diag-runtime')
  const filesEl = container.querySelector<HTMLElement>('#rw-diag-files')
  const notesEl = container.querySelector<HTMLElement>('#rw-diag-notes')
  const rawEl = container.querySelector<HTMLElement>('#rw-diag-raw')
  const debugRoot = container.querySelector<HTMLElement>('#rw-rina-debug')
  const debugStatusEl = container.querySelector<HTMLElement>('#rw-rina-debug-status')
  const debugPromptEl = container.querySelector<HTMLTextAreaElement>('#rw-rina-debug-prompt')
  const debugRunBtn = container.querySelector<HTMLButtonElement>('#rw-rina-debug-run')
  const debugCopyBtn = container.querySelector<HTMLButtonElement>('#rw-rina-debug-copy')
  const debugSummaryEl = container.querySelector<HTMLElement>('#rw-rina-debug-summary')
  const debugRawEl = container.querySelector<HTMLElement>('#rw-rina-debug-raw')
  if (
    !refreshBtn ||
    !copyBtn ||
    !receiptBtn ||
    !bundleBtn ||
    !statusEl ||
    !runtimeEl ||
    !filesEl ||
    !notesEl ||
    !rawEl ||
    !debugRoot ||
    !debugStatusEl ||
    !debugPromptEl ||
    !debugRunBtn ||
    !debugCopyBtn ||
    !debugSummaryEl ||
    !debugRawEl
  ) return

  if (!rina?.diagnosticsPaths) {
    statusEl.textContent = 'Diagnostics API not available. Check preload bridge.'
    return
  }

  let lastPayload: any = null
  let lastConversationDebug: any = null

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

  const renderDebugSummary = (payload: any) => {
    const summaryRows = [
      ['Turn type', String(payload?.turnType || 'unknown')],
      ['Mode', String(payload?.mode || 'unknown')],
      ['Allowed next action', String(payload?.allowedNextAction || 'unknown')],
      ['Reply mode', String(payload?.replyPlan?.mode || 'unknown')],
      ['Tone', String(payload?.replyPlan?.tone || 'unknown')],
      ['Should start run', payload?.replyPlan?.shouldStartRun ? 'Yes' : 'No'],
      ['Workspace', String(payload?.workspaceId || 'none')],
      ['Run reference', String(payload?.references?.runId || 'none')],
      ['Receipt reference', String(payload?.references?.receiptId || 'none')],
      ['Restored session', String(payload?.references?.restoredSessionId || 'none')],
      ['Execution goal', String(payload?.executionCandidate?.goal || 'none')],
      ['Execution risk', String(payload?.executionCandidate?.risk || 'none')],
      ['Context outcome', String(payload?.context?.latestOutcome || 'unknown')],
      ['Context intent', String(payload?.context?.latestIntent || 'unknown')],
      ['Clarification required', payload?.clarification?.required ? 'Yes' : 'No'],
      ['Clarification reason', String(payload?.clarification?.reason || 'none')],
    ]

    debugSummaryEl.innerHTML = summaryRows
      .map(
        ([label, value]) =>
          `<div class="rw-kv"><div class="rw-k">${label}</div><div class="rw-v">${String(value)}</div></div>`
      )
      .join('')
    debugRawEl.textContent = JSON.stringify(payload, null, 2)
  }

  const resolveWorkspaceRoot = async (): Promise<string | null> => {
    try {
      const status = typeof rina?.getStatus === 'function' ? await rina.getStatus() : null
      const workspaceRoot = typeof status?.workspaceRoot === 'string' ? status.workspaceRoot.trim() : ''
      if (workspaceRoot) return workspaceRoot
    } catch {}

    try {
      const workspace = typeof rina?.workspaceDefault === 'function' ? await rina.workspaceDefault() : null
      const fallbackRoot = typeof workspace?.path === 'string' ? workspace.path.trim() : ''
      return fallbackRoot || null
    } catch {
      return null
    }
  }

  const previewConversationRoute = async () => {
    if (typeof rina?.conversationRoute !== 'function') {
      debugStatusEl.textContent = 'Conversation route API not available.'
      return
    }

    const prompt = String(debugPromptEl.value || '').trim()
    if (!prompt) {
      debugStatusEl.textContent = 'Enter a prompt first.'
      return
    }

    debugStatusEl.textContent = 'Previewing…'
    try {
      const workspaceRoot = await resolveWorkspaceRoot()
      const routed = await rina.conversationRoute(prompt, { workspaceRoot })
      lastConversationDebug = {
        prompt,
        workspaceRoot,
        ...routed,
      }
      renderDebugSummary(lastConversationDebug)
      debugStatusEl.textContent = 'Preview ready.'
    } catch (error) {
      debugStatusEl.textContent = `Preview failed: ${String(error)}`
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

  titleEl?.addEventListener('click', (event) => {
    if (!event.altKey) return
    debugRoot.hidden = !debugRoot.hidden
    debugStatusEl.textContent = debugRoot.hidden ? 'Hidden.' : 'Visible. Route previews do not start runs.'
  })

  debugRunBtn.addEventListener('click', () => void previewConversationRoute())

  debugCopyBtn.addEventListener('click', async () => {
    const ok = await copyToClipboard(lastConversationDebug ? JSON.stringify(lastConversationDebug, null, 2) : '')
    debugStatusEl.textContent = ok ? 'Debug JSON copied.' : 'Copy failed.'
  })

  await refresh()
}
