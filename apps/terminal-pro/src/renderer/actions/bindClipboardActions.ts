import type { WorkbenchActionControllerDeps } from './actionController.js'
import { WorkbenchStore } from '../workbench/store.js'
import { receiptReferenceForFix } from '../state/receiptOwnership.js'
import { recordActivationTelemetry } from '../services/rendererTelemetry.js'

type ReceiptExportPayload = {
  exportedAt: string
  receiptId: string
  timestamp: string | null
  intent: string
  command: string
  exitCode: number | null
  verification: {
    ok: boolean | null
    results: string[]
  }
  proofBlockIds: string[]
  verificationResult: {
    ok: boolean | null
    exitCode: number | null
    results: string[]
  }
  runtimeReceipt: unknown
}

type ShareCardPayload = {
  title: string
  subtitle: string
  highlights: string[]
  confidence: string
}

function sanitizeReceiptFilename(receiptId: string): string {
  const safe = receiptId.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '')
  return `rinawarp-proof-${safe || Date.now()}.json`
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {}
}

function pickReceiptId(receipt: Record<string, any>): string {
  return String(receipt.id || receipt.receiptId || receipt.runId || receipt.sessionId || receipt.session?.id || '').trim()
}

function pickReceiptRunId(receipt: Record<string, any>, store: WorkbenchStore): string | null {
  const receiptId = pickReceiptId(receipt)
  const direct = String(receipt.runId || '').trim()
  if (direct) return direct
  const sessionId = String(receipt.sessionId || receipt.session?.id || '').trim()
  const run = store.getState().runs.find((entry) => {
    return (
      String(entry.latestReceiptId || '').trim() === receiptId ||
      String(entry.id || '').trim() === receiptId ||
      (sessionId && String(entry.sessionId || '').trim() === sessionId)
    )
  })
  return run?.id || null
}

function buildCurrentReceiptExport(store: WorkbenchStore): ReceiptExportPayload | null {
  const receipt = store.getState().receipt
  if (!receipt) return null

  const state = store.getState()
  const source = asRecord(receipt)
  const receiptId = pickReceiptId(source)
  const runId = pickReceiptRunId(source, store)
  const runtimeReceipt = runId ? state.executionReceiptsByRunId[runId] : null
  const command = asRecord(source.command)
  const commandText = String(command.input || command.command || source.commandText || source.intent || '').trim()
  const exitCode =
    typeof command.exitCode === 'number'
      ? command.exitCode
      : typeof runtimeReceipt?.exitCode === 'number'
        ? runtimeReceipt.exitCode
        : null
  const proofBlockIds = Object.values(state.runBlocksById)
    .filter((block) => {
      const receiptMatch = block.receipts.some((item) => item.id === receiptId)
      return receiptMatch || Boolean(runId && block.runId === runId)
    })
    .map((block) => block.id)

  const verificationResults = Array.isArray(runtimeReceipt?.verificationResults)
    ? runtimeReceipt.verificationResults
    : Array.isArray(source.verificationResults)
      ? source.verificationResults.map(String)
      : []

  return {
    exportedAt: new Date().toISOString(),
    receiptId: receiptId || 'unknown',
    timestamp:
      String(command.endedAt || command.startedAt || source.completedAt || source.startedAt || source.session?.updatedAt || '').trim() ||
      null,
    intent: String(source.intent || source.workflow || source.kind || command.input || 'unknown'),
    command: commandText || String(source.intent || source.workflow || source.kind || 'unknown'),
    exitCode,
    verification: {
      ok: typeof command.ok === 'boolean' ? command.ok : typeof exitCode === 'number' ? exitCode === 0 : null,
      results: verificationResults,
    },
    proofBlockIds,
    verificationResult: {
      ok: typeof command.ok === 'boolean' ? command.ok : typeof exitCode === 'number' ? exitCode === 0 : null,
      exitCode,
      results: verificationResults,
    },
    runtimeReceipt: receipt,
  }
}

function formatReceiptExportText(payload: ReceiptExportPayload): string {
  return [
    `RinaWarp proof ${payload.receiptId}`,
    `Timestamp: ${payload.timestamp || 'not recorded'}`,
    `Intent: ${payload.intent}`,
    `Proof blocks: ${payload.proofBlockIds.join(', ') || 'none recorded'}`,
    `Verification: ${payload.verificationResult.results.join(' · ') || (payload.verificationResult.ok === true ? 'passed' : payload.verificationResult.ok === false ? 'failed' : 'not recorded')}`,
    `Exit code: ${payload.verificationResult.exitCode ?? 'not recorded'}`,
  ].join('\n')
}

function downloadReceiptJson(payload: ReceiptExportPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = sanitizeReceiptFilename(payload.receiptId)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function formatShareSummary(store: WorkbenchStore, fixId: string): string | null {
  const fix = store.getState().fixBlocks.find((entry) => entry.id === fixId)
  if (!fix) return null

  const highlights = (fix.summary?.highlights || [])
    .filter(Boolean)
    .slice(0, 3)
    .map((item) => `- ${item}`)

  const confidence =
    fix.confidence?.score != null
      ? `${fix.confidence.level.toUpperCase()} confidence (${fix.confidence.score}%)`
      : fix.summary?.confidence
        ? `${fix.summary.confidence} confidence`
        : fix.verificationStatus === 'passed'
          ? 'High confidence fix'
          : 'Fix completed'

  return [
    'I just fixed my broken project in seconds using RinaWarp.',
    '',
    ...(highlights.length > 0 ? highlights : ['- Project repaired', '- Verification completed']),
    '',
    `${confidence}.`,
    'This is wild:',
    'https://rinawarptech.com',
  ].join('\n')
}

function buildShareCardPayload(store: WorkbenchStore, fixId: string): ShareCardPayload | null {
  const fix = store.getState().fixBlocks.find((entry) => entry.id === fixId)
  if (!fix) return null

  const highlights = (fix.summary?.highlights || [])
    .filter(Boolean)
    .slice(0, 3)

  const confidence =
    fix.confidence?.score != null
      ? `${fix.confidence.score}% confidence`
      : fix.summary?.confidence
        ? `${fix.summary.confidence} confidence`
        : fix.verificationStatus === 'passed'
          ? 'High confidence'
          : 'Fix complete'

  return {
    title: 'Project fixed',
    subtitle: fix.summary?.result || fix.verificationText || 'Your project is back in a working state.',
    highlights: highlights.length > 0 ? highlights : ['Project repaired', 'Verification completed'],
    confidence,
  }
}

function formatDetailedSummary(store: WorkbenchStore, fixId: string): string | null {
  const fix = store.getState().fixBlocks.find((entry) => entry.id === fixId)
  if (!fix) return null
  const summaryLines = (fix.summary?.highlights || [])
    .filter(Boolean)
    .slice(0, 5)
    .map((item) => `- ${item}`)

  return [
    'RinaWarp fix summary',
    '',
    ...(summaryLines.length > 0 ? summaryLines : ['- Applied safe repair steps']),
    fix.summary?.result ? '' : '',
    fix.summary?.result || fix.verificationText || 'Verification completed.',
    fix.confidence?.score != null
      ? `Confidence: ${fix.confidence.level} (${fix.confidence.score}%)`
      : fix.summary?.confidence
        ? `Confidence: ${fix.summary.confidence}`
        : undefined,
    'https://rinawarptech.com',
  ]
    .filter(Boolean)
    .join('\n')
}

function escapeSvg(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function wrapSvgText(text: string, maxChars = 38): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 3)
}

function buildShareCardSvg(payload: ShareCardPayload): string {
  const subtitleLines = wrapSvgText(payload.subtitle, 42)
  const highlightLines = payload.highlights.slice(0, 3)

  const subtitleSvg = subtitleLines
    .map((line, index) => `<text x="48" y="${150 + index * 26}" fill="rgba(231,238,249,0.88)" font-size="20" font-family="Arial, sans-serif">${escapeSvg(line)}</text>`)
    .join('')

  const highlightsSvg = highlightLines
    .map(
      (line, index) =>
        `<text x="72" y="${270 + index * 40}" fill="#f8fbff" font-size="22" font-family="Arial, sans-serif">• ${escapeSvg(line)}</text>`
    )
    .join('')

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1a1324" />
          <stop offset="55%" stop-color="#0c1220" />
          <stop offset="100%" stop-color="#0f1d2e" />
        </linearGradient>
        <radialGradient id="glowA" cx="0.15" cy="0.12" r="0.45">
          <stop offset="0%" stop-color="rgba(255,122,168,0.34)" />
          <stop offset="100%" stop-color="rgba(255,122,168,0)" />
        </radialGradient>
        <radialGradient id="glowB" cx="0.92" cy="0.18" r="0.34">
          <stop offset="0%" stop-color="rgba(87,231,255,0.25)" />
          <stop offset="100%" stop-color="rgba(87,231,255,0)" />
        </radialGradient>
      </defs>
      <rect width="1200" height="630" rx="36" fill="url(#bg)" />
      <rect width="1200" height="630" rx="36" fill="url(#glowA)" />
      <rect width="1200" height="630" rx="36" fill="url(#glowB)" />
      <rect x="40" y="40" width="1120" height="550" rx="28" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
      <text x="48" y="86" fill="#ffd8ea" font-size="18" font-weight="700" font-family="Arial, sans-serif" letter-spacing="2">RINAWARP</text>
      <text x="48" y="126" fill="#ffffff" font-size="58" font-weight="700" font-family="Arial, sans-serif">${escapeSvg(payload.title)}</text>
      ${subtitleSvg}
      <rect x="48" y="228" width="236" height="40" rx="20" fill="rgba(97,226,167,0.12)" stroke="rgba(97,226,167,0.26)" />
      <text x="72" y="254" fill="#c4ffe0" font-size="18" font-weight="700" font-family="Arial, sans-serif">${escapeSvg(payload.confidence)}</text>
      ${highlightsSvg}
      <text x="48" y="560" fill="rgba(231,238,249,0.78)" font-size="24" font-family="Arial, sans-serif">rinawarptech.com</text>
    </svg>
  `.trim()
}

async function copyShareCardImage(store: WorkbenchStore, fixId: string): Promise<boolean> {
  const payload = buildShareCardPayload(store, fixId)
  if (!payload || typeof ClipboardItem === 'undefined') return false

  const svg = buildShareCardSvg(payload)
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = new Image()
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not render share card image.'))
    })
    image.src = svgUrl
    await loaded

    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630
    const context = canvas.getContext('2d')
    if (!context) return false
    context.drawImage(image, 0, 0)

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!pngBlob) return false
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
    return true
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

async function resolveInviteLink(): Promise<string> {
  try {
    const token = String((await window.rina?.authToken?.())?.token || '').trim()
    if (!token) return 'https://rinawarptech.com/download/'
    const response = await fetch('https://rinawarptech.com/api/referrals/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = (await response.json().catch(() => null)) as { inviteUrl?: string } | null
    return String(payload?.inviteUrl || '').trim() || 'https://rinawarptech.com/download/'
  } catch {
    return 'https://rinawarptech.com/download/'
  }
}

export function createClipboardActionHandler(
  store: WorkbenchStore,
  deps: Pick<WorkbenchActionControllerDeps, 'buildTrustSnapshot' | 'setTransientStatusSummary'>
): (target: HTMLElement) => Promise<boolean> {
  return async (target: HTMLElement): Promise<boolean> => {
    const copyRunBtn = target.closest<HTMLElement>('[data-run-copy]')
    if (copyRunBtn?.dataset.runCopy) {
      const run = store.getState().runs.find((entry) => entry.id === copyRunBtn.dataset.runCopy)
      if (run?.command) {
        await navigator.clipboard.writeText(run.command)
        deps.setTransientStatusSummary(store, 'Run command copied')
      }
      return true
    }

    const receiptBtn = target.closest<HTMLElement>('[data-fix-receipt]')
    if (receiptBtn?.dataset.fixId) {
      const fix = store.getState().fixBlocks.find((entry) => entry.id === receiptBtn.dataset.fixId)
      const receiptId = receiptReferenceForFix(store, fix)
      if (receiptId) {
        await navigator.clipboard.writeText(receiptId)
        deps.setTransientStatusSummary(store, 'Proof ID copied')
      }
      return true
    }

    const shareFixBtn = target.closest<HTMLElement>('[data-share-fix]')
    if (shareFixBtn?.dataset.shareFix) {
      const shareText = formatShareSummary(store, shareFixBtn.dataset.shareFix)
      if (shareText) {
        await navigator.clipboard.writeText(shareText)
        deps.setTransientStatusSummary(store, 'Share summary copied')
      }
      return true
    }

    const copyFixSummaryBtn = target.closest<HTMLElement>('[data-copy-fix-summary]')
    if (copyFixSummaryBtn?.dataset.copyFixSummary) {
      const summaryText = formatDetailedSummary(store, copyFixSummaryBtn.dataset.copyFixSummary)
      if (summaryText) {
        await navigator.clipboard.writeText(summaryText)
        deps.setTransientStatusSummary(store, 'Fix summary copied')
      }
      return true
    }

    const copyShareImageBtn = target.closest<HTMLElement>('[data-copy-fix-share-image]')
    if (copyShareImageBtn?.dataset.copyFixShareImage) {
      const copied = await copyShareCardImage(store, copyShareImageBtn.dataset.copyFixShareImage)
      if (copied) {
        deps.setTransientStatusSummary(store, 'Share image copied')
      } else {
        const fallbackText = formatShareSummary(store, copyShareImageBtn.dataset.copyFixShareImage)
        if (fallbackText) {
          await navigator.clipboard.writeText(fallbackText)
          deps.setTransientStatusSummary(store, 'Share text copied instead')
        }
      }
      return true
    }

    if (target.closest('[data-copy-invite-link]')) {
      const inviteLink = await resolveInviteLink()
      await navigator.clipboard.writeText(inviteLink)
      deps.setTransientStatusSummary(store, 'Invite link copied')
      return true
    }

    if (target.closest('[data-copy-trust-snapshot]')) {
      await navigator.clipboard.writeText(deps.buildTrustSnapshot(store))
      deps.setTransientStatusSummary(store, 'Workspace trust snapshot copied')
      return true
    }

    if (target.closest('[data-copy-current-receipt]')) {
      const payload = buildCurrentReceiptExport(store)
      if (!payload) {
        deps.setTransientStatusSummary(store, 'No runtime proof is loaded to copy.')
        return true
      }
      await navigator.clipboard.writeText(formatReceiptExportText(payload))
      deps.setTransientStatusSummary(store, 'Proof copied.')
      return true
    }

    if (target.closest('[data-export-current-receipt]')) {
      const payload = buildCurrentReceiptExport(store)
      if (!payload) {
        deps.setTransientStatusSummary(store, 'No runtime proof is loaded to export.')
        return true
      }
      try {
        downloadReceiptJson(payload)
        void recordActivationTelemetry('proof_exported')
        deps.setTransientStatusSummary(store, 'Proof JSON export started.')
      } catch (error) {
        deps.setTransientStatusSummary(store, `Proof export failed: ${error instanceof Error ? error.message : 'unknown error'}`)
      }
      return true
    }

    return false
  }
}
