(function () {
  'use strict';

  function renderPaletteItems(items) {
    paletteItems = [];
    paletteActions = [];
    paletteModels = [];
    const out = [];
    for (const it of items) {
      if (it.type === "section") {
        out.push(`<div class="palette-section"><div class="palette-section-title">${escapeHtml(it.title)}</div></div>`);
        continue;
      }
      const idx = paletteItems.length;
      paletteItems.push(it.action);
      paletteModels.push(it.model || {
        label: String(it.label || ""),
        meta: String(it.meta || ""),
        snippet: "",
      });
      out.push(`
        <div class="palette-item" data-idx="${idx}" onclick="executePaletteItem(${idx})" onmouseenter="setPaletteSelectedIndex(${idx})">
          <div class="palette-item-left">
            <div class="palette-item-icon ${escapeHtml(it.icon)}">${paletteIconGlyph(it.icon)}</div>
            <span class="palette-item-label">${escapeHtml(it.label)}</span>
          </div>
          <span class="palette-item-meta">${escapeHtml(it.meta)}</span>
        </div>
      `);
    }
    return out.join("");
  }

  function renderPalettePreview(model) {
    const pane = document.getElementById("palettePreview");
    if (!pane) return;
    const fallback = {
      label: "Quick Preview",
      meta: "Use ↑/↓ to browse results",
      snippet: "Select a command or search hit to preview details here.",
    };
    const m = model || fallback;
    pane.innerHTML = `
      <div class="palette-preview-title">${escapeHtml(m.label || fallback.label)}</div>
      <div class="palette-preview-meta">${escapeHtml(m.meta || fallback.meta)}</div>
      <div class="palette-preview-snippet">${escapeHtml(m.snippet || fallback.snippet)}</div>
      <div class="palette-preview-hint">Enter to run • Esc to close</div>
    `;
  }

  function setPaletteSelectedIndex(idx) {
    const items = Array.from(document.querySelectorAll(".palette-item"));
    if (!items.length) {
      paletteSelectedIndex = -1;
      renderPalettePreview(null);
      return;
    }
    let next = Number(idx);
    if (!Number.isFinite(next)) next = 0;
    if (next < 0) next = items.length - 1;
    if (next >= items.length) next = 0;
    paletteSelectedIndex = next;
    items.forEach((el) => el.classList.remove("selected"));
    const selected = items[next];
    if (selected) selected.classList.add("selected");
    const model = paletteModels[next] || null;
    renderPalettePreview(model);
  }

  function actionForUnifiedHit(hit) {
    if (hit.source === "share") {
      return () => manageShares();
    }
    if (hit.command) {
      return () => runPaletteCommand(hit.command);
    }
    if (hit.source === "structured") {
      return () => {
        setSidebarTab("structured");
        const input = document.getElementById("structuredSearchInput");
        if (input) {
          input.value = hit.label || "";
          runStructuredSearchFromInput().catch(() => {});
        }
      };
    }
    return () => setSidebarTab("sessions");
  }

  async function openPalette() {
    const overlay = document.getElementById("paletteOverlay");
    const input = document.getElementById("paletteInput");
    const results = document.getElementById("paletteResults");
    overlay.style.display = "flex";
    input.value = "";
    input.focus();
    paletteHistory = JSON.parse(localStorage.getItem("rinawarp:palette_history") || "[]");
    results.innerHTML = `<div class="palette-empty">Loading…</div>`;
    renderPalettePreview(null);
    await refreshPaletteResults();
  }

  function closePalette(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById("paletteOverlay").style.display = "none";
  }

  async function refreshPaletteResults() {
    const input = document.getElementById("paletteInput");
    const results = document.getElementById("paletteResults");
    const q = input.value.toLowerCase().trim();
    const seq = ++paletteRefreshSeq;

    const hist = paletteHistory || [];
    const items = [];

    const recent = hist.slice(0, 5);
    if (recent.length > 0 && !q) {
      items.push({ type: "section", title: "Recent Commands" });
      recent.forEach(cmd => {
        items.push({
          type: "item",
          icon: "history",
          label: cmd,
          meta: "history",
          model: { label: cmd, meta: "history", snippet: "Recent command from local command palette history." },
          action: () => runPaletteCommand(cmd),
        });
      });
    }

    const allCommands = [
      { label: "Clear timeline", icon: "terminal", action: () => { blocks = []; renderBlocks(); } },
      { label: "Use General Rina context", icon: "agent", action: () => setRinaContext("general") },
      { label: "Use Code Rina context", icon: "code", action: () => setRinaContext("code") },
      { label: "Use Diagnose Rina context", icon: "terminal", action: () => setRinaContext("diagnose") },
      { label: "Open Structured Inspector", icon: "settings", action: () => setSidebarTab("structured") },
      { label: "Export structured runbook", icon: "workflow", action: () => exportStructuredRunbook() },
      { label: "Quick Find structured history", icon: "history", action: () => quickFindStructured() },
      { label: "Replay latest runbook", icon: "workflow", action: () => replayLatestRunbook() },
      { label: "Share latest runbook", icon: "workflow", action: () => shareLatestRunbook() },
      { label: "Export audit log", icon: "settings", action: () => exportAuditLog() },
      { label: "Pick workspace folder", icon: "settings", action: () => pickWorkspace() },
      { label: "Download full report", icon: "workflow", action: () => downloadFullReport() },
    ];

    const matched = q
      ? allCommands.filter(c => c.label.toLowerCase().includes(q))
      : allCommands;

    if (matched.length > 0) {
      items.push({ type: "section", title: q ? "Commands" : "All Commands" });
      matched.forEach(c => {
        items.push({
          type: "item",
          icon: c.icon,
          label: c.label,
          meta: "action",
          model: { label: c.label, meta: "action", snippet: "Built-in command palette action." },
          action: c.action,
        });
      });
    }

    const wfs = listWorkflows();
    const wfMatched = q
      ? wfs.filter(w => (w.plan?.intent || "").toLowerCase().includes(q))
      : wfs.slice(0, 3);
    if (wfMatched.length > 0) {
      items.push({ type: "section", title: q ? "Workflows" : "Saved Workflows" });
      wfMatched.forEach(w => {
        const wfLabel = w.plan?.intent || "workflow";
        const wfSteps = Array.isArray(w.plan?.steps) ? w.plan.steps.length : 0;
        items.push({
          type: "item",
          icon: "workflow",
          label: wfLabel,
          meta: "workflow",
          model: { label: wfLabel, meta: "workflow", snippet: `Saved workflow (${wfSteps} steps).\nKey: ${String(w.key || "")}` },
          action: () => runWorkflow(w.key),
        });
      });
    }

    if (window.rina?.unifiedSearch) {
      try {
        const unified = await window.rina.unifiedSearch(q, q ? 12 : 8);
        if (seq !== paletteRefreshSeq) return;
        const safeUnified = Array.isArray(unified) ? unified : [];
        if (safeUnified.length > 0) {
          items.push({ type: "section", title: q ? "Unified Search" : "Recent Activity" });
          safeUnified.forEach((hit) => {
            const icon = hit?.source === "share" ? "settings" : hit?.source === "structured" ? "history" : "terminal";
            const label = String(hit?.label || "(result)");
            const meta = String(hit?.meta || hit?.source || "result");
            items.push({
              type: "item",
              icon,
              label,
              meta,
              model: {
                label,
                meta,
                snippet: String(hit?.snippet || ""),
              },
              action: actionForUnifiedHit(hit),
            });
          });
        }
      } catch (err) {
        console.warn("unifiedSearch failed", err);
      }
    }

    // Flatten for selection
    paletteActions = [];
    paletteItems = items.filter(it => it.type === "item").map(it => it.action);
    if (items.length === 0) {
      results.innerHTML = `<div class="palette-empty">No results for "${escapeHtml(q)}"</div>`;
      paletteSelectedIndex = -1;
      renderPalettePreview({
        label: "No results",
        meta: "Try a different query",
        snippet: `No entries matched "${q}".`,
      });
      return;
    }
    results.innerHTML = renderPaletteItems(items);
    setPaletteSelectedIndex(0);
  }

  function executePaletteItem(idx) {
    const action = paletteItems[idx];
    if (action) {
      action();
      closePalette();
    }
  }

  function runPaletteCommand(cmd) {
    const input = getComposerInput();
    input.value = cmd;
    autosizeIntentInput();
    input.focus();
    closePalette();
  }

  window.RinaWarpPaletteController = {
    renderItems: renderPaletteItems,
    renderPreview: renderPalettePreview,
    setSelectedIndex: setPaletteSelectedIndex,
    actionForUnifiedHit: actionForUnifiedHit,
    open: openPalette,
    close: closePalette,
    refreshResults: refreshPaletteResults,
    executeItem: executePaletteItem,
    runCommand: runPaletteCommand,
  };
  Object.assign(window, window.RinaWarpPaletteController);
})();
