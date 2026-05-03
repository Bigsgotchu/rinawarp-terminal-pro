(function () {
  async function qaStartLongRun() {
    const projectRootInput = (document.getElementById("projectRoot").value || "").trim();
    const projectRoot = projectRootInput || ".";
    const cmd = /windows/i.test(navigator.userAgent) ? "ping 127.0.0.1 -n 30" : "sleep 30";
    await runTerminalCommand(cmd, projectRoot);
    qaSetOutput(`[qa] started long run: ${cmd}\n[qa] projectRoot: ${projectRoot}`);
  }

  async function qaShowRunningStreams() {
    const running = blocks
      .filter((b) => b.type === "step" && b.status === "running" && !!b.streamId)
      .map((b) => ({
        blockId: b.id,
        streamId: b.streamId,
        command: b.command,
        planBlockId: b.planBlockId || null,
      }));
    qaSetOutput(JSON.stringify({ count: running.length, running }, null, 2));
  }

  async function qaDumpStructuredLast20() {
    try {
      const data = await window.rina?.exportStructuredRunbookJson?.();
      const steps = Array.isArray(data?.steps) ? data.steps : [];
      qaSetOutput(JSON.stringify({
        sessionId: data?.sessionId || null,
        totalSteps: steps.length,
        last20: steps.slice(-20),
      }, null, 2));
    } catch (err) {
      qaSetOutput(`[qa] dump failed: ${err?.message || err}`);
    }
  }

  function qaSetOutput(value) {
    const el = document.getElementById("qaOutput");
    if (!el) return;
    el.value = String(value || "");
  }

  window.RinaWarpQaController = {
    qaSetOutput,
    qaStartLongRun,
    qaShowRunningStreams,
    qaDumpStructuredLast20,
  };
})();
