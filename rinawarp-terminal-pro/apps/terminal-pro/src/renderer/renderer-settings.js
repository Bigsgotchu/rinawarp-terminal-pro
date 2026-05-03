(function () {
  const { escapeHtml } = window.RinaRendererUtils;

  function themeTileHtml(theme, activeThemeId) {
    const accent = theme.vars?.["--rw-accent"] || "#888";
    const accent2 = theme.vars?.["--rw-accent2"] || "#aaa";
    const bg = theme.vars?.["--rw-bg"] || "#000";
    const txt = theme.vars?.["--rw-text"] || "#fff";
    const mark = theme.id === activeThemeId ? " ✓" : "";
    const testId = `theme-${String(theme.id || "custom").toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`;
    return `
      <div class="theme-tile" data-theme="${escapeHtml(theme.id)}" data-testid="${escapeHtml(testId)}" title="Apply ${escapeHtml(theme.name)}">
        <div class="theme-name">${escapeHtml(theme.name)}${mark}</div>
        <div class="small">${escapeHtml(theme.group || "Custom")}</div>
        <div class="theme-swatches">
          <span class="sw" style="background:${escapeHtml(bg)}"></span>
          <span class="sw" style="background:${escapeHtml(accent)}"></span>
          <span class="sw" style="background:${escapeHtml(accent2)}"></span>
          <span class="sw" style="background:${escapeHtml(txt)}"></span>
        </div>
      </div>`;
  }

  function renderThemeTiles(themes, activeThemeId) {
    return (Array.isArray(themes) ? themes : []).map((theme) => themeTileHtml(theme, activeThemeId)).join("");
  }

  function renderSavedSearchChips(searches) {
    const rows = Array.isArray(searches) ? searches : [];
    return rows.length
      ? rows.map((q) => `<span class="search-chip" onclick='applyStructuredSearchChip(${JSON.stringify(q)})'>${escapeHtml(q)}</span>`).join("")
      : `<span class="small">No saved searches</span>`;
  }

  function structuredSearchHitHtml(hit, index) {
    return `
      <div class="item">
        <div style="display:flex;justify-content:space-between;gap:8px;">
          <div>
            <div><b>${index + 1}. ${escapeHtml(hit.command || "(empty)")}</b></div>
            <div class="small">session: <code>${escapeHtml(hit.sessionId || "")}</code> • score: ${escapeHtml(String(hit.score))} • result: ${escapeHtml(hit.ok === false ? "failed" : (hit.ok === true ? "ok" : "unknown"))}</div>
            <div class="small">${escapeHtml(String(hit.snippet || "").replace(/\n/g, " "))}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap;">
            <button onclick='applyIntentHint(${JSON.stringify(String(hit.command || ""))})'>Load</button>
            <button onclick='navigator.clipboard.writeText(${JSON.stringify(String(hit.command || ""))})'>Copy</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderStructuredSearchHits(hits) {
    return (Array.isArray(hits) ? hits : []).slice(0, 20).map(structuredSearchHitHtml).join("");
  }

  window.RinaRendererSettings = {
    themeTileHtml,
    renderThemeTiles,
    renderSavedSearchChips,
    structuredSearchHitHtml,
    renderStructuredSearchHits,
  };
})();
