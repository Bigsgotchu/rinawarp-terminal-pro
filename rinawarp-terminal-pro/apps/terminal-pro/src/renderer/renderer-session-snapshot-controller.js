(function () {
  'use strict';

  function persistUiSnapshot() {
    try {
      const payload = {
        savedAt: Date.now(),
        mode,
        blocks: blocks.slice(-300),
        blockCollapsed,
        structuredSearchQuery,
        sessions: sessions.slice(0, 50),
        projectRoot: (document.getElementById("projectRoot")?.value || "").trim(),
        activeSidebarTab,
        chatPanelVisible,
      };
      localStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify(payload));
    } catch {}
  }

  function restoreUiSnapshot() {
    try {
      const raw = localStorage.getItem(SESSION_SNAPSHOT_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw);
      if (!snap || !Array.isArray(snap.blocks)) return;
      blocks = snap.blocks;
      blockCollapsed = snap.blockCollapsed || {};
      structuredSearchQuery = snap.structuredSearchQuery || "";
      sessions = Array.isArray(snap.sessions) ? snap.sessions : sessions;
      if (typeof snap.projectRoot === "string" && snap.projectRoot) {
        const root = document.getElementById("projectRoot");
        const ws = document.getElementById("wsPathText");
        if (root) root.value = snap.projectRoot;
        if (ws) ws.textContent = snap.projectRoot;
      }
      if (snap.mode === "terminal" || snap.mode === "agent" || snap.mode === "code") {
        setMode(snap.mode);
      }
      if (typeof snap.chatPanelVisible === "boolean") {
        chatPanelVisible = snap.chatPanelVisible;
      }
      applySidePanelsVisibility();
      renderBlocks();
      if (snap.activeSidebarTab) setSidebarTab(snap.activeSidebarTab);
    } catch {}
  }

  window.RinaWarpSessionSnapshotController = {
    persist: persistUiSnapshot,
    restore: restoreUiSnapshot,
  };
})();
