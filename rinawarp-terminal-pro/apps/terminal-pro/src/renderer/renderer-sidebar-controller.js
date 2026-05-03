(function () {
  function getAppShell() {
    return document.querySelector(".app");
  }

  function openSidebarPanel(tab = "sessions") {
    getAppShell()?.classList.add("sidebar-open");
    window.setSidebarTab?.(tab);
  }

  function closeSidebarPanel() {
    getAppShell()?.classList.remove("sidebar-open");
  }

  function updateTerminalTimelineVisibility() {
    const timeline = document.getElementById("timeline");
    if (!timeline) return;
    timeline.style.display = "flex";
  }

  function updatePrimaryNav(active) {
    document.querySelector('[data-testid="nav-sessions"]')?.classList.toggle("active", active === "sessions");
    document.querySelector('[data-testid="nav-diagnostics"]')?.classList.toggle("active", active === "diagnostics");
  }

  window.RinaRendererSidebarController = {
    getAppShell,
    openSidebarPanel,
    closeSidebarPanel,
    updateTerminalTimelineVisibility,
    updatePrimaryNav,
  };

  window.getAppShell = getAppShell;
  window.openSidebarPanel = openSidebarPanel;
  window.closeSidebarPanel = closeSidebarPanel;
  window.updateTerminalTimelineVisibility = updateTerminalTimelineVisibility;
  window.updatePrimaryNav = updatePrimaryNav;
})();
