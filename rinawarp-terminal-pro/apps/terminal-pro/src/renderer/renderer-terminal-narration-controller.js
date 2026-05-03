(function () {
  "use strict";

  function createTerminalNarration(command) {
    const id = newId("assistant");
    addBlock({
      id,
      type: "assistant_status",
      status: "running",
      statusText: "Running in terminal...",
      statusTextTone: "running",
      createdAt: Date.now(),
      title: "Rina",
      markdown: "Running in terminal...",
      command,
    });
    lastTerminalCommand = String(command || "").trim() || null;
    pendingTerminalNarrations.push({ id, command: String(command || "").trim() });
    return id;
  }

  function completeTerminalNarration(payload) {
    const command = String(payload?.command || "").trim();
    if (!command) return;
    const index = pendingTerminalNarrations.findIndex((item) => item.command === command);
    if (index === -1) return;
    const [item] = pendingTerminalNarrations.splice(index, 1);
    const failed = !!payload?.failed;
    updateBlock(item.id, {
      status: failed ? "failed" : "completed",
      statusText: failed ? "Command finished with errors." : "Completed successfully.",
      statusTextTone: failed ? "failed" : "completed",
      markdown: failed
        ? String(payload?.failureSummary || "Command finished with errors.")
        : "Completed successfully.",
    });
  }

  function appendTerminalNarrationChunk(chunk) {
    void chunk;
  }

  async function writeTerminalCommandToPty(command, projectRoot) {
    const narrationId = createTerminalNarration(command);
    const ok = ptyConnected ? true : await ensurePty();
    if (!ok) {
      updateBlock(narrationId, {
        status: "failed",
        statusText: "Command was not sent to the terminal.",
        statusTextTone: "failed",
        markdown: `Command was not sent.\n\nTerminal did not start.`,
      });
      await runTerminalCommand(command, projectRoot);
      return false;
    }
    const res = await window.rina?.ptyWrite?.(`${command}\n`);
    if (res?.ok) {
      updateBlock(narrationId, {
        status: "completed",
        statusText: "Running in terminal.",
        statusTextTone: "completed",
        markdown: "Running in terminal.",
      });
      return true;
    }
    const msg = res?.error || "PTY write failed";
    pendingTerminalNarrations = pendingTerminalNarrations.filter((item) => item.id !== narrationId);
    updateBlock(narrationId, {
      status: "failed",
      statusText: "Command was not sent to the terminal.",
      statusTextTone: "failed",
      markdown: `Command was not sent.\n\n${msg}`,
    });
    toast(`Terminal send failed: ${msg}`);
    return false;
  }

  function flushPendingTerminalChunk() {
    if (pendingTerminalFlushTimer) {
      window.clearTimeout(pendingTerminalFlushTimer);
      pendingTerminalFlushTimer = null;
    }
    const output = pendingTerminalChunk.trimEnd();
    pendingTerminalChunk = "";
    if (!output) return;
    addBlock({
      id: newId("terminal"),
      type: "terminal_output",
      status: "ok",
      createdAt: Date.now(),
      title: "Terminal",
      command: lastTerminalCommand || undefined,
      markdown: output,
    });
  }

  function queueTerminalOutput(chunk) {
    pendingTerminalChunk += String(chunk || "");
    if (pendingTerminalFlushTimer) {
      window.clearTimeout(pendingTerminalFlushTimer);
    }
    pendingTerminalFlushTimer = window.setTimeout(() => {
      flushPendingTerminalChunk();
    }, 120);
  }

  window.RinaWarpTerminalNarrationController = {
    create: createTerminalNarration,
    complete: completeTerminalNarration,
    appendChunk: appendTerminalNarrationChunk,
    writeCommandToPty: writeTerminalCommandToPty,
    flushPendingChunk: flushPendingTerminalChunk,
    queueOutput: queueTerminalOutput,
  };
  Object.assign(window, window.RinaWarpTerminalNarrationController);
})();
