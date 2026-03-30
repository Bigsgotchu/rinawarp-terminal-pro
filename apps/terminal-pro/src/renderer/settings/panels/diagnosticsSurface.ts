import { buildDiagnosticsPanelModel, type DiagnosticsPanelModel } from './diagnosticsModel.js'

function esc(s: unknown): string {
  return String(s ?? '')
    .replaceAll('&', '&')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
}

function renderFileRow(row: DiagnosticsPanelModel['fileRows'][number]): string {
  const badge = row.exists ? `<span class="rw-badge rw-ok">OK</span>` : `<span class="rw-badge rw-bad">MISSING</span>`
  return `
    <div class="rw-file">
      <div class="rw-file-head">
        <div class="rw-file-title">${esc(row.label)} ${badge}</div>
        <div class="rw-muted">${esc(row.sizeLabel)}</div>
      </div>
      <div class="rw-file-path">${esc(row.path)}</div>
      <div class="rw-file-hash">${esc(row.sha256)}</div>
    </div>
  `
}

export function renderDiagnosticsPanelShell(): string {
  return `
    <div class="rw-panel-head">
      <h2 id="rw-diag-title">Diagnostics</h2>
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

    <div id="rw-rina-debug" class="rw-card rw-flex rw-gap" hidden>
      <div class="rw-row rw-gap" style="align-items:center; justify-content:space-between;">
        <div>
          <strong>Rina Route Preview</strong>
          <div class="rw-muted">Alt-click the Diagnostics title to toggle this hidden view. Previewing does not start runs.</div>
        </div>
        <div id="rw-rina-debug-status" class="rw-muted">Hidden.</div>
      </div>
      <label class="rw-muted" for="rw-rina-debug-prompt">Prompt preview</label>
      <textarea id="rw-rina-debug-prompt" class="rw-code" rows="3">help me</textarea>
      <div class="rw-row rw-gap">
        <button id="rw-rina-debug-run" class="rw-btn">Preview route</button>
        <button id="rw-rina-debug-copy" class="rw-btn rw-btn-ghost">Copy debug JSON</button>
      </div>
      <div id="rw-rina-debug-summary" class="rw-diag-grid"></div>
      <pre id="rw-rina-debug-raw" class="rw-code"></pre>
    </div>
  `
}

export function renderDiagnosticsPanelPayload(payload: any): {
  runtimeHtml: string
  filesHtml: string
  notesHtml: string
  rawJson: string
} {
  const model = buildDiagnosticsPanelModel(payload)
  return {
    runtimeHtml: model.runtimeRows
      .map((row) => `<div class="rw-kv"><div class="rw-k">${esc(row.label)}</div><div class="rw-v">${esc(row.value)}</div></div>`)
      .join(''),
    filesHtml: model.fileRows.map((row) => renderFileRow(row)).join(''),
    notesHtml: model.notes.length
      ? `<div class="rw-warn">${model.notes.map((note) => `<div>• ${esc(note)}</div>`).join('')}</div>`
      : `<div class="rw-muted">No notes.</div>`,
    rawJson: model.rawJson,
  }
}
