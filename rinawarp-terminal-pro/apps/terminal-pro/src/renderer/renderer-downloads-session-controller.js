(function () {
  "use strict";

  function downloadReport(blockId) {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const report = {
      id: block.id,
      title: block.title,
      type: block.type,
      status: block.status,
      command: block.command,
      stdout: block.stdout,
      stderr: block.stderr,
      report: block.report,
      createdAt: new Date(block.createdAt).toISOString()
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rina-report-${block.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Report downloaded");
  }

  function downloadFullReport() {
    const report = {
      exportedAt: new Date().toISOString(),
      mode,
      blocks: blocks.map(b => ({
        id: b.id,
        type: b.type,
        title: b.title,
        status: b.status,
        command: b.command,
        stdout: b.stdout,
        stderr: b.stderr,
        report: b.report,
        createdAt: new Date(b.createdAt).toISOString()
      }))
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rina-report-full-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Full report downloaded");
  }

  function buildHandoffBrief(blockId) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.plan) return "";
    const relatedSteps = blocks.filter((b) => b.type === "step" && b.planBlockId === blockId);
    const summary = summarizeAgentEval();
    return buildHandoffBriefFromParts({ block, relatedSteps, summary, mode });
  }

  function downloadHandoffBrief(blockId) {
    const text = buildHandoffBrief(blockId);
    if (!text) {
      toast("No plan available for handoff");
      return;
    }
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rina-handoff-${blockId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Handoff brief downloaded");
  }

  function downloadAgentEvalReport() {
    const rows = readAgentEval();
    const summary = summarizeAgentEval();
    const payload = {
      exportedAt: new Date().toISOString(),
      summary,
      runs: rows,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rina-agent-eval-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Agent eval report downloaded");
  }

  function workspaceKey() {
    const ws = (document.getElementById("projectRoot").value || "").trim() || "(default)";
    return `rinawarp:session:${ws}`;
  }

  function saveSession() {
    const key = workspaceKey();
    const session = {
      name: mode === "terminal" ? "Terminal session" : `${mode === "agent" ? "Agent" : "Code"} session`,
      when: new Date().toLocaleString(),
      mode,
      blocks: JSON.parse(JSON.stringify(blocks))
    };
    localStorage.setItem(key, JSON.stringify(session));
  }

  function loadSession(idx) {
    const s = sessions[idx];
    if (!s) return;
    blocks = JSON.parse(JSON.stringify(s.blocks || []));
    if (s.mode) setMode(s.mode);
    renderBlocks();
    closeSidebarPanel();
    toast("Session restored");
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  }

  window.RinaWarpDownloadsSessionController = {
    downloadReport,
    downloadFullReport,
    buildHandoffBrief,
    downloadHandoffBrief,
    downloadAgentEvalReport,
    workspaceKey,
    saveSession,
    loadSession,
    toast,
  };
})();
