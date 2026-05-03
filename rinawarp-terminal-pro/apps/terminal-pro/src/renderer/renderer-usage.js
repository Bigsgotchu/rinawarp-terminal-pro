(function () {
  function usageLineText(usage) {
    const planLabel = usage?.plan === "team_seat_monthly" ? "Team" : usage?.plan === "pro_monthly" ? "Pro" : "Free";
    if (usage?.remainingAgentRunsToday != null) {
      return `${planLabel}: ${usage.remainingAgentRunsToday} agent runs left today`;
    }
    if (usage?.remainingAgentRunsThisMonth != null) {
      return `${planLabel}: ${usage.remainingAgentRunsThisMonth} agent runs left this month`;
    }
    return "";
  }

  function activationStatusText(state, doneCount, total, now = Date.now()) {
    if (state?.completedAt) {
      const ttfv = Math.max(0, Math.round(((state.completedAt || now) - (state.startedAt || now)) / 1000));
      return `Completed in ${ttfv}s.`;
    }
    const elapsedSec = Math.max(0, Math.round((now - (state?.startedAt || now)) / 1000));
    return `${doneCount}/${total} done • ${elapsedSec}s elapsed`;
  }

  function activationStepsHtml(steps = {}) {
    return [
      `${steps.safe_command ? "✓" : "○"} Run a safe command`,
      `${steps.plan_run ? "✓" : "○"} Run a plan`,
      `${steps.report_download ? "✓" : "○"} Download a report`,
    ].map((line) => `<div>${line}</div>`).join("");
  }

  window.RinaRendererUsage = {
    usageLineText,
    activationStatusText,
    activationStepsHtml,
  };
})();
