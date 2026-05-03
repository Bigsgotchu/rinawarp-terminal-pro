(function () {
  function diagnosticsNodes() {
    return {
      runtimeNode: document.getElementById("diagnosticsRuntime"),
      agentNode: document.getElementById("diagnosticsAgent"),
      filesNode: document.getElementById("diagnosticsFiles"),
      warningsWrap: document.getElementById("diagnosticsWarningsWrap"),
      warningsNode: document.getElementById("diagnosticsWarnings"),
      notesWrap: document.getElementById("diagnosticsNotesWrap"),
      notesNode: document.getElementById("diagnosticsNotes"),
    };
  }

  function hideDiagnosticsSections(nodes) {
    if (nodes.filesNode) nodes.filesNode.innerHTML = "";
    if (nodes.warningsWrap) nodes.warningsWrap.style.display = "none";
    if (nodes.notesWrap) nodes.notesWrap.style.display = "none";
  }

  function renderDiagnosticsEmptyState({ diagnosticsLoading }) {
    const nodes = diagnosticsNodes();
    if (!nodes.runtimeNode) return;
    nodes.runtimeNode.innerHTML = `<div class="small">${diagnosticsLoading ? "Loading diagnostics…" : "Diagnostics not loaded yet."}</div>`;
    hideDiagnosticsSections(nodes);
  }

  function renderDiagnosticsLoadingState({ diagnosticsCache, daemonDiagnosticsCache }) {
    const nodes = diagnosticsNodes();
    if (nodes.runtimeNode && !diagnosticsCache) {
      nodes.runtimeNode.innerHTML = `<div class="small">Loading diagnostics…</div>`;
    }
    if (nodes.agentNode && !daemonDiagnosticsCache) {
      nodes.agentNode.innerHTML = `<div class="small">Loading agent daemon status…</div>`;
    }
  }

  function renderDiagnosticsError(message, { escapeHtml }) {
    const nodes = diagnosticsNodes();
    if (nodes.runtimeNode) {
      nodes.runtimeNode.innerHTML = `<div class="small settings-error">Diagnostics failed: ${escapeHtml(message)}</div>`;
    }
  }

  function renderDiagnosticsPanel(args) {
    const {
      diagnosticsCache,
      diagnosticsLoading,
      daemonDiagnosticsCache,
      daemonTasksCache,
      escapeHtml,
      renderDiagnosticsWarnings,
      renderDiagnosticsRuntime,
      renderDiagnosticsAgent,
      renderDiagnosticsFiles,
    } = args;
    const nodes = diagnosticsNodes();
    if (
      !nodes.runtimeNode ||
      !nodes.agentNode ||
      !nodes.filesNode ||
      !nodes.warningsWrap ||
      !nodes.warningsNode ||
      !nodes.notesWrap ||
      !nodes.notesNode
    ) return;

    if (!diagnosticsCache) {
      renderDiagnosticsEmptyState({ diagnosticsLoading });
      return;
    }

    const d = diagnosticsCache;
    const app = d.app || {};
    const warnings = [];
    const resolved = d.resolved || {};
    const fileList = [
      resolved.main,
      resolved.preload,
      resolved.renderer,
      resolved.themeRegistry,
      resolved.policyYaml,
    ].filter(Boolean);
    const missingCount = fileList.filter((x) => !x.exists).length;
    if (missingCount > 0) warnings.push(`${missingCount} required file(s) missing.`);
    if (!d.active?.themeRegistryPath) warnings.push("Theme registry active path not recorded yet.");
    if (!d.active?.policyYamlPath) warnings.push("Policy YAML active path not recorded yet.");

    nodes.warningsNode.innerHTML = renderDiagnosticsWarnings(warnings);
    nodes.warningsWrap.style.display = warnings.length ? "" : "none";
    nodes.runtimeNode.innerHTML = renderDiagnosticsRuntime(app, d.active || {});
    nodes.agentNode.innerHTML = renderDiagnosticsAgent(daemonDiagnosticsCache, daemonTasksCache);
    nodes.filesNode.innerHTML = renderDiagnosticsFiles(resolved);

    const notes = Array.isArray(d.notes) ? d.notes : [];
    nodes.notesNode.innerHTML = notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("");
    nodes.notesWrap.style.display = notes.length ? "" : "none";
  }

  async function refreshDiagnosticsPanel(args) {
    if (args.getDiagnosticsLoading()) return;
    args.setDiagnosticsLoading(true);
    renderDiagnosticsLoadingState({
      diagnosticsCache: args.getDiagnosticsCache(),
      daemonDiagnosticsCache: args.getDaemonDiagnosticsCache(),
    });
    try {
      const diag = await args.loadDiagnostics();
      args.setDiagnosticsState({
        diagnosticsCache: diag.diagnostics,
        daemonDiagnosticsCache: diag.daemon,
        daemonTasksCache: diag.daemonTasks,
      });
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || "failed");
      args.setDiagnosticsState({
        diagnosticsCache: null,
        daemonDiagnosticsCache: null,
        daemonTasksCache: [],
      });
      renderDiagnosticsError(msg, { escapeHtml: args.escapeHtml });
      args.toast(`Diagnostics failed: ${msg}`);
    } finally {
      args.setDiagnosticsLoading(false);
      renderDiagnosticsPanel(args.getRenderArgs());
    }
  }

  function applyDiagnosticsAutoRefreshButton(enabled) {
    const btn = document.getElementById("diagnosticsAutoRefreshBtn");
    if (!btn) return;
    btn.textContent = `Auto-refresh: ${enabled ? "On" : "Off"}`;
  }

  function applyDiagnosticsPollIntervalSelect(intervalMs) {
    const el = document.getElementById("diagnosticsPollIntervalSelect");
    if (!el) return;
    const val = String(intervalMs);
    if (el.value !== val) el.value = val;
  }

  window.RinaRendererDiagnosticsController = {
    renderDiagnosticsPanel,
    refreshDiagnosticsPanel,
    renderDiagnosticsEmptyState,
    renderDiagnosticsLoadingState,
    renderDiagnosticsError,
    applyDiagnosticsAutoRefreshButton,
    applyDiagnosticsPollIntervalSelect,
  };
})();
