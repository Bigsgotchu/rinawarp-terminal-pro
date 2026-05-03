(function () {
  'use strict';

  async function quickFindStructured() {
    setSidebarTab("structured");
    setTimeout(() => {
      const input = document.getElementById("structuredSearchInput");
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
    toast("Quick Find ready. Type query + Enter.");
  }

  function loadSavedSearches() {
    try {
      structuredSearchSaved = JSON.parse(localStorage.getItem(SEARCH_SAVED_KEY) || "[]");
      if (!Array.isArray(structuredSearchSaved)) structuredSearchSaved = [];
    } catch {
      structuredSearchSaved = [];
    }
  }

  function persistSavedSearches() {
    localStorage.setItem(SEARCH_SAVED_KEY, JSON.stringify(structuredSearchSaved.slice(0, 15)));
  }

  function renderSavedSearches() {
    const root = document.getElementById("structuredSavedSearches");
    if (!root) return;
    loadSavedSearches();
    root.innerHTML = renderSavedSearchChips(structuredSearchSaved);
  }

  async function performStructuredSearch(q) {
    if (activeSidebarTab !== "structured") setSidebarTab("structured");
    const started = performance.now();
    if (!window.rina?.structuredSearch) {
      toast("Structured search API unavailable");
      return;
    }
    const { sortMode, queryForEngine } = structuredSearchParts(q);
    const hitsRaw = await window.rina.structuredSearch(queryForEngine || q, 30);
    const hits = sortStructuredHits(hitsRaw, sortMode);
    const elapsed = Math.round(performance.now() - started);
    if (!Array.isArray(hits) || hits.length === 0) {
      const resultsNode = document.getElementById("structuredSearchResults");
      if (resultsNode) resultsNode.innerHTML = `<div class="small">No matches for <code>${escapeHtml(q)}</code>.</div>`;
      toast(`No structured matches (${elapsed}ms)`);
      return;
    }
    const resultsNode = document.getElementById("structuredSearchResults");
    if (resultsNode) {
      resultsNode.innerHTML = renderStructuredSearchHits(hits);
    }
    toast(`Search: ${hits.length} hit(s) in ${elapsed}ms${elapsed > 200 ? " (optimize target: <200ms)" : ""}`);
  }

  async function runStructuredSearchFromInput() {
    const input = document.getElementById("structuredSearchInput");
    const q = (input?.value || "").trim();
    if (!q) return;
    structuredSearchQuery = q;
    await performStructuredSearch(q);
  }

  function applyStructuredSearchChip(query) {
    structuredSearchQuery = String(query || "").trim();
    const input = document.getElementById("structuredSearchInput");
    if (input) input.value = structuredSearchQuery;
    runStructuredSearchFromInput().catch(() => {});
  }

  function saveStructuredSearch() {
    const input = document.getElementById("structuredSearchInput");
    const q = (input?.value || "").trim();
    if (!q) return;
    loadSavedSearches();
    structuredSearchSaved = [q, ...structuredSearchSaved.filter((s) => s !== q)];
    persistSavedSearches();
    renderSavedSearches();
    toast("Saved search");
  }

  window.RinaWarpStructuredSearchController = {
    quickFind: quickFindStructured,
    loadSaved: loadSavedSearches,
    persistSaved: persistSavedSearches,
    renderSaved: renderSavedSearches,
    perform: performStructuredSearch,
    runFromInput: runStructuredSearchFromInput,
    applyChip: applyStructuredSearchChip,
    saveSearch: saveStructuredSearch,
  };
})();
