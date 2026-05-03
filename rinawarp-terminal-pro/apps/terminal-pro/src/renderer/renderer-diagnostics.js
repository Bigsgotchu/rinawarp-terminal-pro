(function () {
  const { escapeHtml, formatBytes } = window.RinaRendererUtils;
  const { renderEmptyListRow } = window.RinaRendererDrawer;

  function diagnosticsBadgeClass(info) {
    if (!info || !info.exists) return "diag-badge missing";
    if (info.sha256) return "diag-badge ok";
    return "diag-badge warn";
  }

  function diagnosticsBadgeText(info) {
    if (!info || !info.exists) return "Missing";
    if (info.sha256) return "OK";
    return "No hash";
  }

  function diagnosticsFileCard(label, info) {
    if (!info) return "";
    return `
      <div class="diag-card">
        <div class="diag-card__header">
          <div class="diag-card-title">${escapeHtml(label)}</div>
          <span class="${diagnosticsBadgeClass(info)}">${diagnosticsBadgeText(info)}</span>
        </div>
        <div class="small diag-card-path">${escapeHtml(info.path || "—")}</div>
        <div class="diag-kv"><div class="k">SHA256</div><div class="v">${escapeHtml(info.sha256 || "—")}</div></div>
        <div class="diag-kv"><div class="k">Size</div><div class="v">${escapeHtml(formatBytes(info.sizeBytes))}</div></div>
      </div>
    `;
  }

  function renderDiagnosticsWarnings(warnings) {
    return (Array.isArray(warnings) ? warnings : []).map((w) => `<li>${escapeHtml(w)}</li>`).join("");
  }

  function renderDiagnosticsRuntime(app = {}, active = {}) {
    return `
      <div class="settings-card-title">Runtime</div>
      <div class="settings-row"><span>Packaged</span><span class="${app.isPackaged ? "diag-badge ok" : "diag-badge warn"}">${app.isPackaged ? "Yes" : "No"}</span></div>
      <div class="settings-row"><span>Platform</span><span class="settings-value">${escapeHtml(`${app.platform || "unknown"} / ${app.arch || "unknown"}`)}</span></div>
      <div class="settings-row"><span>CWD</span><span class="settings-value settings-value--mono">${escapeHtml(app.cwd || "—")}</span></div>
      <div class="settings-row"><span>app.getAppPath()</span><span class="settings-value settings-value--mono">${escapeHtml(app.appPath || "—")}</span></div>
      <div class="settings-row"><span>resourcesPath</span><span class="settings-value settings-value--mono">${escapeHtml(app.resourcesPath || "—")}</span></div>
      <div class="settings-row"><span>Active theme</span><span class="settings-value settings-value--mono">${escapeHtml(active?.themeRegistryPath || "—")}</span></div>
      <div class="settings-row"><span>Active policy</span><span class="settings-value settings-value--mono">${escapeHtml(active?.policyYamlPath || "—")}</span></div>
    `;
  }

  function renderDaemonTaskRows(tasks) {
    const recentTasks = Array.isArray(tasks) ? tasks.slice(0, 5) : [];
    if (!recentTasks.length) {
      return renderEmptyListRow("No recent daemon tasks yet", "Queued, running, and completed tasks will appear here.");
    }
    return recentTasks
      .map((t) => {
        const cls =
          t.status === "completed"
            ? "diag-badge ok"
            : t.status === "failed" || t.deadLetter
              ? "diag-badge warn"
              : "settings-value";
        return `
          <div class="settings-row">
            <span class="settings-value settings-value--mono settings-value--left settings-value--narrow">${escapeHtml(String(t.type || "task"))}</span>
            <span class="${cls}">${escapeHtml(String(t.status || "unknown"))}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderDiagnosticsAgent(daemonDiagnostics, daemonTasks) {
    if (!daemonDiagnostics || !daemonDiagnostics.ok) {
      const daemonError = daemonDiagnostics?.error
        ? `Agent daemon diagnostics unavailable: ${escapeHtml(String(daemonDiagnostics.error))}`
        : "Agent daemon diagnostics unavailable.";
      return `
        <div class="settings-card-title">Agent Daemon</div>
        <div class="small">${daemonError}</div>
      `;
    }
    const daemon = daemonDiagnostics.daemon || {};
    const taskInfo = daemonDiagnostics.tasks || {};
    const counts = taskInfo.counts || {};
    const running = !!daemon.running;
    const statusClass = running ? "diag-badge ok" : "diag-badge warn";
    const statusText = running ? "Running" : "Stopped";
    return `
      <div class="settings-card-title">Agent Daemon</div>
      <div class="settings-row"><span>Status</span><span class="${statusClass}">${statusText}</span></div>
      <div class="settings-row"><span>PID</span><span class="settings-value">${escapeHtml(String(daemon.pid || "—"))}</span></div>
      <div class="settings-row"><span>Store</span><span class="settings-value settings-value--mono">${escapeHtml(String(daemon.storeDir || "—"))}</span></div>
      <div class="settings-row"><span>Tasks total</span><span class="settings-value">${escapeHtml(String(taskInfo.total ?? 0))}</span></div>
      <div class="settings-row"><span>Queued / Running</span><span class="settings-value">${escapeHtml(String(counts.queued || 0))} / ${escapeHtml(String(counts.running || 0))}</span></div>
      <div class="settings-row"><span>Failed / Dead-letter</span><span class="settings-value">${escapeHtml(String(counts.failed || 0))} / ${escapeHtml(String(counts.dead_letter || 0))}</span></div>
      <div class="small settings-note">Recent tasks</div>
      ${renderDaemonTaskRows(daemonTasks)}
    `;
  }

  function renderDiagnosticsFiles(resolved = {}) {
    return [
      diagnosticsFileCard("Main", resolved.main),
      diagnosticsFileCard("Preload", resolved.preload),
      diagnosticsFileCard("Renderer", resolved.renderer),
      diagnosticsFileCard("Theme Registry", resolved.themeRegistry),
      diagnosticsFileCard("Policy YAML", resolved.policyYaml),
    ].join("");
  }

  window.RinaRendererDiagnostics = {
    diagnosticsBadgeClass,
    diagnosticsBadgeText,
    diagnosticsFileCard,
    renderDiagnosticsWarnings,
    renderDiagnosticsRuntime,
    renderDiagnosticsAgent,
    renderDiagnosticsFiles,
  };
})();
