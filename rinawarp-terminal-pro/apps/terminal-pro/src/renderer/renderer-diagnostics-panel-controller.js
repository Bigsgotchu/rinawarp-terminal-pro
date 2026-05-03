(function () {
  'use strict';

  // -----------------------------
  // Diagnostics Panel Controller
  // -----------------------------
  // Provides high-level diagnostic operations and panel integration.
  // Relies on cache/state owned by the renderer.

  // -----------------------------
  // Diagnostics Render Args
  // -----------------------------
  // Given current cache/state values, produce the argument bundle
  // expected by the rendering controller.
  function renderArgs() {
    return {
      diagnosticsCache,
      diagnosticsLoading,
      daemonDiagnosticsCache,
      daemonTasksCache,
      escapeHtml,
      renderDiagnosticsWarnings,
      renderDiagnosticsRuntime,
      renderDiagnosticsAgent,
      renderDiagnosticsFiles,
    };
  }

  // -----------------------------
  // Render Diagnostics Panel
  // -----------------------------
  // Delegates to the core controller with the provided args.
  function renderPanel() {
    renderDiagnosticsPanelController(renderArgs());
  }

  // -----------------------------
  // Refresh Diagnostics Panel
  // -----------------------------
  // Delegates to the core controller with accessor functions.
  async function refresh() {
    await refreshDiagnosticsPanelController({
      getDiagnosticsLoading: () => diagnosticsLoading,
      setDiagnosticsLoading: (value) => { diagnosticsLoading = value; },
      getDiagnosticsCache: () => diagnosticsCache,
      getDaemonDiagnosticsCache: () => daemonDiagnosticsCache,
      setDiagnosticsState: (next) => {
        diagnosticsCache = next.diagnosticsCache;
        daemonDiagnosticsCache = next.daemonDiagnosticsCache;
        daemonTasksCache = next.daemonTasksCache;
      },
      loadDiagnostics,
      escapeHtml,
      toast,
      getRenderArgs: renderArgs,
    });
  }

  // -----------------------------
  // Copy Diagnostics Panel
  // -----------------------------
  async function copyDiagnosticsPanel() {
    if (!diagnosticsCache && !daemonDiagnosticsCache) {
      toast("No diagnostics loaded yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            runtime: diagnosticsCache,
            agentDaemon: daemonDiagnosticsCache,
            agentTasks: daemonTasksCache,
          },
          null,
          2,
        ),
      );
      toast("Diagnostics copied");
    } catch {
      toast("Copy failed");
    }
  }

  // -----------------------------
  // Inline Runs Inspector
  // -----------------------------

  function currentInlineRunsFilters() {
    return {
      triggerType: String(document.getElementById("inlineRunsTriggerFilter")?.value || ""),
      approved: String(document.getElementById("inlineRunsApprovedFilter")?.value || ""),
      executed: String(document.getElementById("inlineRunsExecutedFilter")?.value || ""),
      limit: 50,
    };
  }

  function renderInlineRunsInspector() {
    const summaryEl = document.getElementById("inlineRunsSummary");
    const outputEl = document.getElementById("inlineRunsOutput");
    if (!summaryEl || !outputEl) return;
    const rows = Array.isArray(inlineRunsInspectorCache) ? inlineRunsInspectorCache : [];
    const approved = rows.filter((r) => r?.approved).length;
    const executed = rows.filter((r) => r?.executed).length;
    const explanationOnly = rows.filter((r) => !r?.command).length;
    summaryEl.textContent = `${rows.length} run(s) • approved ${approved} • executed ${executed} • explanation-only ${explanationOnly}`;
    outputEl.value = JSON.stringify(rows, null, 2);
  }

  async function refreshInlineRunsInspector() {
    try {
      if (!window.rina?.inlineRunsList) {
        toast("Inline runs API unavailable");
        return;
      }
      inlineRunsInspectorCache = await inlineRunsList(currentInlineRunsFilters());
      renderInlineRunsInspector();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`Inline runs refresh failed: ${msg}`);
    }
  }

  async function exportInlineRuns(format) {
    try {
      if (!window.rina?.inlineRunsExport) {
        toast("Inline runs export API unavailable");
        return;
      }
      const res = await inlineRunsExport({
        ...currentInlineRunsFilters(),
        format,
        limit: 500,
      });
      if (!res?.ok) {
        toast("Inline runs export failed");
        return;
      }
      const blob = new Blob([String(res.content || "")], { type: format === "csv" ? "text/csv" : "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inline-rina-runs-${Date.now()}.${format === "csv" ? "csv" : "json"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Inline runs exported as ${String(format || "json").toUpperCase()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`Inline runs export failed: ${msg}`);
    }
  }

  // -----------------------------
  // Daemon Helpers
  // -----------------------------

  async function enqueueDaemonSmokeTask() {
    try {
      if (!window.rina?.daemonTaskAdd) {
        toast("Daemon task API unavailable");
        return;
      }
      const res = await daemonTaskAdd({
        type: "run_command",
        payload: { command: "echo rinawarp-agent-smoke" },
        maxAttempts: 2,
      });
      if (!res?.ok) {
        toast(`Queue failed: ${res?.error || "unknown error"}`);
        return;
      }
      toast("Agent smoke task queued");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`Queue failed: ${msg}`);
    }
  }

  async function startDaemonFromUi() {
    try {
      if (!window.rina?.daemonStart) {
        toast("Daemon control API unavailable");
        return;
      }
      const res = await daemonStart();
      if (!res?.ok) {
        toast(`Start failed: ${res?.error || "unknown error"}`);
        return;
      }
      toast(res.alreadyRunning ? "Agent daemon already running" : "Agent daemon started");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`Start failed: ${msg}`);
    }
  }

  async function stopDaemonFromUi() {
    try {
      if (!window.rina?.daemonStop) {
        toast("Daemon control API unavailable");
        return;
      }
      const res = await daemonStop();
      if (!res?.ok) {
        toast(`Stop failed: ${res?.error || "unknown error"}`);
        return;
      }
      toast(res.stale ? "Agent daemon already stopped" : "Agent daemon stopped");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`Stop failed: ${msg}`);
    }
  }

  // -----------------------------
  // Support Bundle
  // -----------------------------

  async function saveSupportBundle() {
    try {
      const api = window.rina;
      if (!api?.supportBundle && !api?.invoke) {
        toast("Support bundle API unavailable");
        return;
      }
      const res = api.supportBundle
        ? await api.supportBundle()
        : await api.invoke("rina:support:bundle");
      if (!res?.ok) {
        if (String(res?.error || "") !== "cancelled") {
          toast(`Support bundle failed: ${res?.error || "unknown error"}`);
        }
        return;
      }
      toast(`Support bundle saved (${formatBytes(res.bytes || 0)})`);
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || "failed");
      toast(`Support bundle failed: ${msg}`);
    }
  }

  // -----------------------------
  // Redaction Helpers
  // -----------------------------

  async function previewCurrentInputRedaction() {
    try {
      const text = (getComposerInput()?.value || "").trim();
      if (!text) {
        toast("Enter sample text in input first");
        return;
      }
      if (!window.rina?.redactionPreview) {
        toast("Redaction preview API unavailable");
        return;
      }
      const preview = await redactionPreview(text);
      const hits = Number(preview?.redactionCount || 0);
      toast(`Redaction preview: ${hits} hit${hits === 1 ? "" : "s"}`);
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || "preview failed");
      toast(`Redaction preview failed: ${msg}`);
    }
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.RinaWarpDiagnosticsPanelController = {
    renderArgs,
    renderPanel,
    refresh,
    copyDiagnosticsPanel,
    currentInlineRunsFilters,
    renderInlineRunsInspector,
    refreshInlineRunsInspector,
    exportInlineRuns,
    enqueueDaemonSmokeTask,
    startDaemonFromUi,
    stopDaemonFromUi,
    saveSupportBundle,
    previewCurrentInputRedaction,
  };
})();
