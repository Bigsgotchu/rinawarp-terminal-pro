(function () {
  'use strict';

  function openWorkspace() {
    setMode("terminal");
    closeSidebarPanel();
  }

  function openDiagnosticsFromTop() {
    openSidebarPanel("settings");
    setSettingsTab("diagnostics");
  }

  function setRinaContext(next) {
    if (next !== "code" && next !== "diagnose") next = "general";
    rinaContext = next;
    updatePrimaryRunStatus();
    const input = getComposerInput();
    if (input) input.placeholder = "Ask Rina or run a command...";
  }

  function setMode(next) {
    if (next !== "code" && next !== "terminal" && next !== "agent") next = "terminal";
    mode = next;
    document.getElementById("modeCode")?.classList.toggle("active", next === "code");
    document.getElementById("modeAgent")?.classList.toggle("active", next === "agent");
    document.getElementById("modeTerminal")?.classList.toggle("active", next === "terminal");
    document.getElementById("terminalDrawer").classList.toggle("active", next === "terminal");
    const composerStack = document.getElementById("composerStack");
    const sendBtn = document.getElementById("composerSend");
    applySidePanelsVisibility();
    updateTerminalTimelineVisibility();

    const input = getComposerInput();
    if (next === "code" || next === "agent") {
      if (composerStack) composerStack.style.display = "";
      if (sendBtn) sendBtn.style.display = "";
      input.placeholder = "Ask Rina or run a command...";
      refreshCodeWorkspace().catch(() => {});
    } else {
      if (composerStack) composerStack.style.display = "";
      if (sendBtn) sendBtn.style.display = "";
      input.placeholder = "Ask Rina or run a command...";
      ensurePty().catch((e) => toast(`PTY error: ${String(e)}`));
    }
    updatePrimaryRunStatus();
  }

  function updatePrimaryRunStatus() {
    const status = document.getElementById("ptyStatus");
    if (status) {
      status.textContent = ptyConnected ? "Terminal ready" : "Terminal offline";
    }
  }

  window.RinaWarpUiModeController = {
    openWorkspace,
    openDiagnosticsFromTop,
    setRinaContext,
    setMode,
    updatePrimaryRunStatus,
  };
})();
