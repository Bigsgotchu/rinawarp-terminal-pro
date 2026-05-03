(function () {
  const { usageLineText } = window.RinaRendererUsage || {};

  function getUsageLineElement() {
    return document.getElementById("usageLine");
  }

  function getUpgradeButtonElement() {
    return document.getElementById("usageUpgradeButton");
  }

  function updateUpgradeButton(isLimitHit) {
    const button = getUpgradeButtonElement();
    if (!button) return;
    button.textContent = isLimitHit ? "Upgrade required" : "Upgrade";
    button.disabled = false;
    button.style.display = "";
  }

  function renderUsageStatus(usage) {
    const el = getUsageLineElement();
    if (!el) return;

    const text = typeof usageLineText === "function" ? usageLineText(usage) : "";
    el.textContent = text;

    const limitHit = usage && (
      (typeof usage.remainingAgentRunsToday === "number" && usage.remainingAgentRunsToday <= 0) ||
      (typeof usage.remainingAgentRunsThisMonth === "number" && usage.remainingAgentRunsThisMonth <= 0)
    );

    el.classList.toggle("usage-limit-hit", !!limitHit);
    updateUpgradeButton(limitHit);

    return el;
  }

  function showUsageLimitMessage(message) {
    const el = getUsageLineElement();
    if (!el) return;

    el.textContent = String(message || "");
    el.classList.add("usage-limit-message");
    updateUpgradeButton(true);
  }

  async function refreshUsageLine() {
    const el = getUsageLineElement();
    if (!el || !window.RinaRendererIpc?.getRinaUsageStatus) return;

    try {
      const usage = await window.RinaRendererIpc.getRinaUsageStatus();
      renderUsageStatus(usage);
    } catch {
      el.textContent = "";
    }
  }

  window.RinaRendererUsageController = {
    refreshUsageLine,
    renderUsageStatus,
    showUsageLimitMessage,
  };
})();
