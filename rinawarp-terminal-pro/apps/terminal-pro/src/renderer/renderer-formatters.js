(function () {
  function hexToRgba(hex, alpha) {
    const h = String(hex || "").replace("#", "").trim();
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const num = Number.parseInt(full || "000000", 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function toXtermTheme(theme) {
    if (!theme || !Array.isArray(theme.ansi) || theme.ansi.length !== 16) return null;
    return {
      background: theme.background,
      foreground: theme.foreground,
      cursor: theme.cursor || theme.foreground,
      selectionBackground: theme.selection || "rgba(255,255,255,0.18)",
      black: theme.ansi[0],
      red: theme.ansi[1],
      green: theme.ansi[2],
      yellow: theme.ansi[3],
      blue: theme.ansi[4],
      magenta: theme.ansi[5],
      cyan: theme.ansi[6],
      white: theme.ansi[7],
      brightBlack: theme.ansi[8],
      brightRed: theme.ansi[9],
      brightGreen: theme.ansi[10],
      brightYellow: theme.ansi[11],
      brightBlue: theme.ansi[12],
      brightMagenta: theme.ansi[13],
      brightCyan: theme.ansi[14],
      brightWhite: theme.ansi[15],
    };
  }

  function paletteIconGlyph(icon) {
    if (icon === "agent") return "🤖";
    if (icon === "code") return "🧠";
    if (icon === "terminal") return "⬡";
    if (icon === "workflow") return "⚡";
    if (icon === "settings") return "⚙";
    return "⌘";
  }

  function getChatFallbackReply() {
    return "I’m here with you.\n\nIf you want to keep chatting, just talk. If you want to work, tell me what outcome you want and I’ll run with it.";
  }

  function inlineFailurePrompt(command, action) {
    return action === "fix"
      ? `Suggest a fix for the failed command: ${command}`
      : `Explain why this command failed: ${command}`;
  }

  function inlineFailureTitle(command, action) {
    return action === "fix" ? `Suggested fix for: ${command}` : `Failure explanation for: ${command}`;
  }

  function buildHandoffBriefFromParts({ block, relatedSteps = [], summary = {}, mode = "terminal", exportedAt = new Date().toISOString() } = {}) {
    if (!block?.plan) return "";
    const failed = relatedSteps.filter((step) => step.status === "failed" || step.status === "cancelled");
    return [
      `# Rina Handoff Brief`,
      ``,
      `- Exported: ${exportedAt}`,
      `- Mode: ${mode}`,
      `- Plan block: ${block.id}`,
      `- Plan status: ${block.status}`,
      `- Intent: ${block.plan.intent || "(unknown)"}`,
      ``,
      `## Plan Steps`,
      ...(Array.isArray(block.plan.steps) ? block.plan.steps.map((step, idx) =>
        `${idx + 1}. ${step.stepId || `step_${idx + 1}`} - \`${(step.input?.command || "").replaceAll("`", "")}\``
      ) : ["1. (no steps available)"]),
      ``,
      `## Recent Failures`,
      ...(failed.length
        ? failed.slice(-5).map((step) => `- ${step.stepId || step.id}: ${(step.stderr || step.stdout || "").slice(0, 260)}`)
        : ["- No failing step blocks recorded."]),
      ``,
      `## Reliability Snapshot`,
      `- Historical runs: ${summary.runs}`,
      `- Success rate: ${(summary.successRate * 100).toFixed(1)}%`,
      `- Median duration: ${Math.round(summary.medianDurationMs / 1000)}s`,
      ...(summary.topHaltReasons?.length
        ? [`- Top halt reasons: ${summary.topHaltReasons.map((item) => `${item.reason} (${item.count})`).join("; ")}`]
        : ["- Top halt reasons: none"]),
      ``,
      `## Next Actions`,
      `1. Re-run with \`Auto-fix run\` if the plan halted.`,
      `2. Review failed step output and use \`Edit in composer\` for command refinement.`,
      `3. Export report + transcript and attach to ticket/PR.`,
    ].join("\n");
  }

  window.RinaRendererFormatters = {
    hexToRgba,
    toXtermTheme,
    paletteIconGlyph,
    getChatFallbackReply,
    inlineFailurePrompt,
    inlineFailureTitle,
    buildHandoffBriefFromParts,
  };
})();
