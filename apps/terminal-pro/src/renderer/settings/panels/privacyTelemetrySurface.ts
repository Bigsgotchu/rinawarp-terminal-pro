type PrivacyTelemetrySettings = {
  enabled?: boolean
  installId?: string
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function shortInstallId(id: unknown): string {
  const value = String(id || '')
  if (!value) return 'Not generated yet'
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

export function renderPrivacyTelemetryPanel(settings: PrivacyTelemetrySettings | null): string {
  const enabled = settings?.enabled !== false
  return `
    <div class="rw-panel-head">
      <h2>Privacy & Telemetry</h2>
      <p class="rw-sub">Anonymous operational telemetry helps improve reliability.</p>
    </div>

    <div class="rw-card">
      <div class="rw-panel-section">
        <h3>Anonymous Operational Telemetry</h3>
        <div class="rw-kv">
          <div class="rw-k">Send reliability counters</div>
          <div class="rw-v">
            <input type="checkbox" id="rw-telemetry-enabled" ${enabled ? 'checked' : ''} aria-label="Send anonymous operational telemetry">
          </div>
        </div>
        <div class="rw-kv"><div class="rw-k">Install ID</div><div class="rw-v">${esc(shortInstallId(settings?.installId))}</div></div>
        <div id="rw-telemetry-status" class="rw-muted">${enabled ? 'Anonymous operational telemetry is on.' : 'Telemetry is off.'}</div>
      </div>
    </div>

    <div class="rw-card">
      <h3>What Rina Sends</h3>
      <div class="rw-prose">
        <p>RinaWarp sends app version, platform, architecture, anonymous install ID, and lightweight counters such as workspace_selected, first_build_run, first_proof_generated, proof_exported, safe_fix_proposed, safe_fix_approved, memory_saved, marketplace_opened, crash_report_created, task_started, task_completed, task_failed, rollback_triggered, approval_denied, update_check_started, update_available, update_downloaded, update_restart_requested, and update_success.</p>
        <p>RinaWarp never sends prompts, source code, repo contents, terminal output, shell history, file contents, or secrets.</p>
      </div>
    </div>
  `
}
