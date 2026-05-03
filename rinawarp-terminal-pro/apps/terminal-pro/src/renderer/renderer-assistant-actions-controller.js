(function () {
  'use strict';

  function copySuggestedCommand(cmd) {
    if (!cmd) return;
    navigator.clipboard.writeText(String(cmd)).then(() => toast("Command copied"));
  }

  function findBlockById(id) {
    return blocks.find((b) => b.id === id) || null;
  }

  async function runInlineFailureAction(blockId, action) {
    const block = findBlockById(blockId);
    const ctx = block?.failureContext;
    const command = String(ctx?.command || "").trim();
    if (!command) return;
    const projectRoot = (document.getElementById("projectRoot")?.value || "").trim() || undefined;
    const prompt = inlineFailurePrompt(command, action);
    try {
      const result = await inlineAsk({
        prompt,
        projectRoot,
        triggerType: "failure",
        action: action === "fix" ? "debugCommandFailure" : "debugCommandFailure",
        sourceText: ctx?.output || command,
      });
      updateBlock(blockId, {
        status: "ok",
        title: "Rina",
        markdown: inlineFailureTitle(command, action),
        inlineRinaResult: result,
        inlineRinaRunId: result.runId,
        approvalState: "pending",
      });
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || "Inline failure action failed");
      updateBlock(blockId, {
        status: "failed",
        markdown: `Inline failure help failed.\n\n${msg}`,
      });
    }
  }

  async function runInlineRinaPrompt(prompt, opts = {}) {
    const projectRoot = opts.projectRoot || (document.getElementById("projectRoot")?.value || "").trim() || undefined;
    const targetBlockId = opts.blockId || newId("assistant");
    const existing = opts.blockId ? findBlockById(opts.blockId) : null;
    if (existing) {
      updateBlock(targetBlockId, {
        status: "planning",
        statusText: opts.loadingMessage || "Thinking...",
        statusTextTone: "thinking",
        title: "Rina",
        markdown: opts.loadingMessage || "Reviewing the recent terminal output...",
        pendingInput: undefined,
        inputDecision: undefined,
        inlineRinaResult: undefined,
        failureContext: undefined,
      });
    } else {
      addBlock({
        id: targetBlockId,
        type: "assistant_status",
        status: "planning",
        statusText: opts.loadingMessage || "Thinking...",
        statusTextTone: "thinking",
        createdAt: Date.now(),
        title: "Rina",
        markdown: opts.loadingMessage || "Reviewing the recent terminal output...",
      });
    }
    const result = await inlineAsk({
      prompt,
      projectRoot,
      action: opts.action,
      selectedText: opts.selectedText,
      triggerType: opts.triggerType,
      sourceText: opts.sourceText,
    });
    updateBlock(targetBlockId, {
      type: "assistant",
      status: "ok",
      title: "Rina",
      markdown: opts.successLabel || `Inline terminal guidance for: ${prompt}`,
      inlineRinaResult: result,
      inlineRinaRunId: result.runId,
      approvalState: "pending",
      pendingInput: undefined,
      inputDecision: undefined,
    });
    window.RinaRendererUsageController.refreshUsageLine().catch(() => {});
    return targetBlockId;
  }

  async function runSuggestedCommand(cmd) {
    const command = String(cmd || "").trim();
    if (!command) return;
    const input = getComposerInput();
    if (input) {
      input.value = command;
      autosizeIntentInput();
    }
    if (mode === "terminal") {
      await writeTerminalCommandToPty(
        command,
        (document.getElementById("projectRoot")?.value || "").trim() || undefined,
      );
    } else {
      toast("Loaded suggestion into input. Press Send or review first.");
    }
  }

  window.RinaWarpAssistantActionsController = {
    copySuggestedCommand,
    findBlockById,
    runInlineFailureAction,
    runInlineRinaPrompt,
    runSuggestedCommand,
  };
})();
