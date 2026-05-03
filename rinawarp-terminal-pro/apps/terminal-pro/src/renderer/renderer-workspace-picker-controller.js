(function () {
  'use strict';

  async function pickWorkspace() {
    const result = await openDirectory();
    if (result?.path) {
      document.getElementById("projectRoot").value = result.path;
      document.getElementById("wsPathText").textContent = result.path;
      saveWorkspaceToHistory(result.path);
      loadWorkspaceHistory();
      if (mode === "code") refreshCodeWorkspace().catch(() => {});
    }
  }

  function saveWorkspaceToHistory(path) {
    if (!path) return;
    let hist = JSON.parse(localStorage.getItem("rinawarp:ws_history") || "[]");
    hist = hist.filter(p => p !== path);
    hist.unshift(path);
    if (hist.length > 10) hist.pop();
    localStorage.setItem("rinawarp:ws_history", JSON.stringify(hist));
  }

  function loadWorkspaceHistory() {
    const hist = JSON.parse(localStorage.getItem("rinawarp:ws_history") || "[]");
    if (hist.length > 0) {
      const last = hist[0];
      document.getElementById("projectRoot").value = last;
      document.getElementById("wsPathText").textContent = last;
      return last;
    }
    return "";
  }

  async function ensureWorkspaceRoot() {
    const rootEl = document.getElementById("projectRoot");
    const wsTextEl = document.getElementById("wsPathText");
    let root = (rootEl?.value || "").trim();
    if (root) return root;

    root = loadWorkspaceHistory();
    if (root) return root;

    try {
      const res = await workspaceDefault();
      const fallback = (res?.path || "").trim();
      if (fallback) {
        if (rootEl) rootEl.value = fallback;
        if (wsTextEl) wsTextEl.textContent = fallback;
        saveWorkspaceToHistory(fallback);
        return fallback;
      }
    } catch {
      // keep empty; caller handles validation messaging
    }
    return "";
  }

  window.RinaWarpWorkspacePickerController = {
    pickWorkspace,
    saveWorkspaceToHistory,
    loadWorkspaceHistory,
    ensureWorkspaceRoot,
  };
})();
