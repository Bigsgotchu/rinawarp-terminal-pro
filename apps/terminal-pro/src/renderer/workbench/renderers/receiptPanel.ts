import { clear, el, mount } from '../dom.js'
import type { WorkbenchState } from '../store.js'
import { formatRunDate } from './format.js'
import { analyzeFailure, classifyRunIntent, extractUrls, formatRunIntentLabel } from './runIntelligence.js'

type StructuredReceipt = {
  kind?: string
  id?: string
  sessionId?: string
  commandId?: string
  session?: {
    id?: string | null
    createdAt?: string | null
    updatedAt?: string | null
    projectRoot?: string | null
    source?: string | null
    platform?: string | null
  }
  command?: {
    input?: string | null
    cwd?: string | null
    startedAt?: string | null
    endedAt?: string | null
    exitCode?: number | null
    ok?: boolean | null
    cancelled?: boolean
    error?: string | null
    risk?: string | null
  }
  artifacts?: {
    stdoutChunks?: number
    stderrChunks?: number
    metaChunks?: number
    stdoutPreview?: string
    stderrPreview?: string
    metaPreview?: string
    changedFiles?: string[]
    diffHints?: string[]
    urls?: string[]
  }
}

export function renderReceiptPanel(state: WorkbenchState): void {
  const root = document.getElementById('receipt-output')
  if (!root) return

  clear(root)

  if (!state.receipt) {
    mount(
      root,
      el(
        'div',
        { class: 'rw-empty-state' },
        el('div', { class: 'rw-empty-title' }, 'No Receipt Loaded'),
        el('div', { class: 'rw-empty-copy' }, 'Select a run to view its receipt.')
      )
    )
    return
  }

  const receipt = state.receipt as StructuredReceipt
  if (receipt.kind === 'structured_command_receipt' && receipt.command) {
    mount(root, buildStructuredReceiptPanel(receipt))
    return
  }

  mount(root, buildRawReceiptPanel(state.receipt))
}

function buildStructuredReceiptPanel(receipt: StructuredReceipt): HTMLElement {
  const command = receipt.command?.input || 'Unknown command'
  const intent = classifyRunIntent(command)
  const intentLabel = formatRunIntentLabel(intent)
  const commandCwd = receipt.command?.cwd || receipt.session?.projectRoot || 'No workspace path recorded'
  const artifactUrls = Array.from(
    new Set([...(receipt.artifacts?.urls || []), ...extractUrls(receipt.command?.error || ''), ...extractUrls(receipt.artifacts?.stdoutPreview || '')])
  )
  const previewText = [receipt.artifacts?.stderrPreview, receipt.artifacts?.stdoutPreview, receipt.artifacts?.metaPreview, receipt.command?.error]
    .filter(Boolean)
    .join('\n')
  const failure = analyzeFailure({
    command,
    exitCode: receipt.command?.exitCode,
    outputText: previewText,
    interrupted: Boolean(receipt.command?.cancelled),
    changedFiles: receipt.artifacts?.changedFiles || [],
    diffHints: receipt.artifacts?.diffHints || [],
    metaText: receipt.artifacts?.metaPreview || '',
  })
  const statusLabel =
    receipt.command?.cancelled
      ? 'Interrupted'
      : receipt.command?.ok === true
        ? 'Completed'
        : receipt.command?.ok === false || typeof receipt.command?.exitCode === 'number'
          ? 'Failed'
          : 'In progress'
  const guidanceTitle = receipt.command?.ok === true && !receipt.command?.cancelled ? 'Outcome Guidance' : 'Failure Guidance'
  const guidanceIntro =
    receipt.command?.cancelled
      ? 'This receipt is partial proof because the run stopped early. Start with the receipt, then decide whether resume or rerun is safer.'
      : receipt.command?.ok === true
        ? 'The run completed, but the receipt still keeps the evidence and safest follow-up visible if you need to inspect or repeat it.'
        : 'This receipt narrows down what most likely broke, why that call is credible, and what to do next without guessing.'
  const panel = el('div', { class: 'rw-receipt-panel' })

  panel.appendChild(
    el(
      'div',
      { class: 'rw-receipt-hero' },
      el(
        'div',
        { class: 'rw-receipt-header' },
        el('div', { class: 'rw-receipt-kicker' }, 'Execution proof'),
        el('h3', {}, receipt.id ? `Receipt ${receipt.id}` : 'Receipt'),
        el('p', { class: 'rw-receipt-copy' }, `${intentLabel} receipt showing intent, command, workspace, timestamps, exit path, evidence, and the safest next move.`)
      ),
      el(
        'div',
        { class: 'rw-receipt-chip-row' },
        buildChip('Intent', intentLabel),
        buildChip('Status', statusLabel),
        buildChip('Exit', receipt.command?.exitCode === null || receipt.command?.exitCode === undefined ? 'pending' : String(receipt.command.exitCode)),
        buildChip('Session', receipt.sessionId || receipt.session?.id || 'unknown'),
        buildChip('Confidence', failure.confidence)
      )
    )
  )

  panel.appendChild(
    buildReceiptSection(
      'Receipt Summary',
      buildKeyValueGrid([
        ['Intent', intentLabel],
        ['Outcome', statusLabel],
        ['Command', command],
        ['CWD', commandCwd],
        ['Started', formatNullableDate(receipt.command?.startedAt)],
        ['Ended', formatNullableDate(receipt.command?.endedAt)],
        ['Updated', formatNullableDate(receipt.session?.updatedAt)],
        ['Exit code', receipt.command?.exitCode === null || receipt.command?.exitCode === undefined ? 'pending' : String(receipt.command.exitCode)],
        ['Receipt ID', receipt.id || 'unknown'],
        ['Session ID', receipt.sessionId || receipt.session?.id || 'unknown'],
        ['Project root', receipt.session?.projectRoot || 'none recorded'],
        ['Source', receipt.session?.source || 'unknown'],
        ['Platform', receipt.session?.platform || 'unknown'],
      ])
    )
  )

  if (intent === 'deploy') {
    panel.appendChild(
      buildReceiptSection(
        'Deploy State',
        buildKeyValueGrid([
          ['Target', receipt.artifacts?.metaPreview?.match(/\b(cloudflare|vercel|netlify|docker|vps|ssh)\b/i)?.[1] || artifactUrls[0] || 'unknown'],
          ['Verification', receipt.command?.ok === true && artifactUrls.length > 0 ? 'passed' : receipt.command?.ok === true ? 'pending' : 'not cleared'],
          ['Rollback', /cloudflare|vercel|netlify/i.test(previewText) ? 'provider-backed or receipt-required' : 'manual or unsupported'],
          ['Next move', failure.nextActionLabel],
        ])
      )
    )
  }

  panel.appendChild(
    buildReceiptSection(
      'Execution Trail',
      buildArtifactBody(receipt, artifactUrls)
    )
  )

  panel.appendChild(
    buildReceiptSection(
      guidanceTitle,
      el(
        'div',
        { class: 'rw-receipt-guidance' },
        buildGuidanceCard('Summary', guidanceIntro),
        buildGuidanceCard('Likely cause', failure.likelyCause),
        buildGuidanceCard('Best next action', failure.nextActionLabel),
        buildGuidanceCard('Next safe action', failure.safestNextMove),
        buildGuidanceCard('Confidence', `${failure.confidence} confidence`),
        buildGuidanceCard('Confidence basis', failure.confidenceReason),
        buildGuidanceCard('What changed', failure.whatChanged),
        buildGuidanceList('Failure clues', failure.failureClues)
      )
    )
  )

  panel.appendChild(
    buildReceiptSection(
      'Preview',
      el(
        'div',
        { class: 'rw-receipt-preview-stack' },
        buildPreviewBlock('stderr', receipt.artifacts?.stderrPreview || ''),
        buildPreviewBlock('stdout', receipt.artifacts?.stdoutPreview || ''),
        buildPreviewBlock('meta', receipt.artifacts?.metaPreview || '')
      )
    )
  )

  return panel
}

function buildArtifactBody(receipt: StructuredReceipt, urls: string[]): HTMLElement {
  const changedFiles = receipt.artifacts?.changedFiles || []
  const diffHints = receipt.artifacts?.diffHints || []
  return el(
    'div',
    { class: 'rw-receipt-artifacts' },
    buildKeyValueGrid([
      ['Stdout chunks', String(receipt.artifacts?.stdoutChunks || 0)],
      ['Stderr chunks', String(receipt.artifacts?.stderrChunks || 0)],
      ['Meta chunks', String(receipt.artifacts?.metaChunks || 0)],
      ['Changed files', changedFiles.length ? String(changedFiles.length) : 'none'],
      ['URLs', urls.length ? String(urls.length) : 'none'],
    ]),
    el('div', { class: 'rw-receipt-guidance-card' }, el('span', { class: 'rw-receipt-grid-label' }, 'Command'), el('pre', { class: 'rw-receipt-content' }, receipt.command?.input || 'No command captured.')),
    changedFiles.length ? buildTagList('Changed files', changedFiles) : null,
    diffHints.length ? buildTagList('Diff hints', diffHints) : null,
    urls.length ? buildTagList('Artifacts / URLs', urls) : null
  )
}

function buildRawReceiptPanel(receipt: unknown): HTMLElement {
  return el(
    'div',
    { class: 'rw-receipt-panel' },
    el(
      'div',
      { class: 'rw-receipt-header' },
      el('div', { class: 'rw-receipt-kicker' }, 'Raw receipt'),
      el('h3', {}, 'Receipt payload'),
      el('p', { class: 'rw-receipt-copy' }, 'This receipt did not match the structured proof format yet, so it is shown as raw data.')
    ),
    el('pre', { class: 'rw-receipt-content' }, JSON.stringify(receipt, null, 2))
  )
}

function buildReceiptSection(title: string, body: HTMLElement): HTMLElement {
  return el(
    'section',
    { class: 'rw-receipt-section' },
    el('div', { class: 'rw-receipt-section-title' }, title),
    body
  )
}

function buildKeyValueGrid(rows: Array<[string, string]>): HTMLElement {
  const grid = el('div', { class: 'rw-receipt-grid' })
  for (const [label, value] of rows) {
    grid.appendChild(el('div', { class: 'rw-receipt-grid-cell' }, el('span', { class: 'rw-receipt-grid-label' }, label), el('code', undefined, value)))
  }
  return grid
}

function buildChip(label: string, value: string): HTMLElement {
  return el('div', { class: 'rw-receipt-chip' }, el('span', undefined, label), el('strong', undefined, value))
}

function buildGuidanceCard(label: string, value: string): HTMLElement {
  return el('div', { class: 'rw-receipt-guidance-card' }, el('span', { class: 'rw-receipt-grid-label' }, label), el('div', undefined, value))
}

function buildGuidanceList(label: string, items: string[]): HTMLElement {
  return el(
    'div',
    { class: 'rw-receipt-guidance-card' },
    el('span', { class: 'rw-receipt-grid-label' }, label),
    items.length ? el('div', { class: 'rw-receipt-list' }, ...items.map((item) => el('code', undefined, item))) : el('div', undefined, 'No strong failure clues captured yet.')
  )
}

function buildTagList(title: string, values: string[]): HTMLElement {
  return el(
    'div',
    { class: 'rw-receipt-tag-group' },
    el('div', { class: 'rw-receipt-grid-label' }, title),
    el('div', { class: 'rw-receipt-list' }, ...values.map((value) => el('code', undefined, value)))
  )
}

function buildPreviewBlock(label: string, value: string): HTMLElement {
  return el(
    'div',
    { class: 'rw-receipt-preview' },
    el('div', { class: 'rw-receipt-grid-label' }, label),
    value ? el('pre', { class: 'rw-receipt-content' }, value) : el('div', { class: 'rw-empty-copy' }, 'No preview captured.')
  )
}

function formatNullableDate(value?: string | null): string {
  return value ? formatRunDate(value) : 'not recorded'
}
