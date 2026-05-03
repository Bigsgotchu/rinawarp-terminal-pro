(function () {
  'use strict';

  function errorMessage(err, fallback) {
    return (err && err.message) ? err.message : String(err || fallback);
  }

  async function handleDirectChatInput(ctx) {
    const {
      input,
      addBlock,
      assistantMarkdownBlock,
      getSmallTalkReply,
      newId,
      projectRoot,
      sendChatMessage,
    } = ctx;

    if (!sendChatMessage) {
      const fallback = await getSmallTalkReply(input, false);
      addBlock(assistantMarkdownBlock(newId("assistant"), fallback));
      return;
    }

    try {
      const replies = await sendChatMessage(input, projectRoot || undefined);
      if (!Array.isArray(replies) || replies.length === 0) {
        const fallback = await getSmallTalkReply(input, false);
        addBlock(assistantMarkdownBlock(newId("assistant"), fallback));
        return;
      }
      for (const reply of replies) {
        const text = String(reply?.text || "").trim() || "I'm here.";
        addBlock(assistantMarkdownBlock(newId("assistant"), text));
      }
    } catch {
      const fallback = await getSmallTalkReply(input, false);
      addBlock(assistantMarkdownBlock(newId("assistant"), fallback));
    }
  }

  async function handleTerminalCommandInput(ctx) {
    const {
      input,
      projectRoot,
      runTerminalCommand,
      writeTerminalCommandToPty,
    } = ctx;

    if (writeTerminalCommandToPty) {
      await writeTerminalCommandToPty(input, projectRoot);
      return;
    }
    await runTerminalCommand(input, projectRoot);
  }

  async function handleAgentIntentInput(ctx) {
    const {
      addBlock,
      classification,
      emptyRinaPromptBlock,
      ensurePty,
      inlineFailureBlock,
      inlineRinaSuccessLabel,
      inlineThinkingBlock,
      input,
      newId,
      orchestratorErrorBlock,
      orchestratorStartedBlock,
      projectRoot,
      rina,
      runInlineRinaPrompt,
      terminalUnavailableBlock,
      toast,
    } = ctx;

    if (classification.isRinaTerminalIntent) {
      const prompt = classification.rinaPrompt;
      if (classification.isEmptyRinaPrompt) {
        addBlock(emptyRinaPromptBlock(newId("assistant")));
        return true;
      }

      if (!(ctx.isPtyConnected() ? true : await ensurePty())) {
        addBlock(terminalUnavailableBlock(newId("assistant")));
        return true;
      }

      if (classification.isDirectRinaGreeting) {
        await handleDirectChatInput({ ...ctx, input: prompt });
        return true;
      }

      try {
        const statusId = newId("assistant");
        addBlock(inlineThinkingBlock(statusId));
        await runInlineRinaPrompt(prompt, {
          blockId: statusId,
          projectRoot,
          triggerType: "input",
          sourceText: prompt,
          loadingMessage: "Thinking...",
          successLabel: inlineRinaSuccessLabel(input, prompt),
        });
      } catch (err) {
        addBlock(inlineFailureBlock(newId("assistant"), errorMessage(err, "Inline Rina failed")));
      }
      return true;
    }

    const issueCmd = classification.issueCmd;
    if (!issueCmd) return false;

    const issueId = issueCmd.issueId;
    if (!rina?.orchestratorIssueToPr) {
      toast("Orchestrator API unavailable");
      return true;
    }

    const started = await rina.orchestratorIssueToPr({
      issueId,
      repoPath: projectRoot,
      branchName: issueCmd.branchName,
      command: issueCmd.command,
      repoSlug: issueCmd.repoSlug,
      push: issueCmd.push,
      prDryRun: issueCmd.prDryRun,
      baseBranch: issueCmd.baseBranch,
    });
    if (!started?.ok) {
      const msg = started?.error || "Failed to start issue workflow";
      addBlock(orchestratorErrorBlock(newId("assistant"), msg));
      toast(`Orchestrator error: ${msg}`);
      return true;
    }

    let graphSummary = "";
    if (rina?.orchestratorGraph) {
      const graphRes = await rina.orchestratorGraph();
      if (graphRes?.ok) {
        const nodes = Array.isArray(graphRes?.graph?.nodes) ? graphRes.graph.nodes.length : 0;
        const edges = Array.isArray(graphRes?.graph?.edges) ? graphRes.graph.edges.length : 0;
        graphSummary = `\n\nWorkspace graph: ${nodes} node(s), ${edges} edge(s).`;
      }
    }

    addBlock(orchestratorStartedBlock(newId("assistant"), { started, issueCmd, issueId, graphSummary }));
    toast(`Workflow started for issue ${issueId}`);
    return true;
  }

  async function handleCodeIntentInput(ctx) {
    const {
      addBlock,
      codeErrorBlock,
      codeThinkingBlock,
      currentPlanByBlockId,
      getWorkPrefix,
      input,
      newId,
      planBlock,
      projectRoot,
      removeBlock,
      rina,
      toast,
      updateBlock,
    } = ctx;

    const thinkingId = newId("assistant");
    addBlock(codeThinkingBlock(thinkingId));

    try {
      const plan = await rina.agentPlan({ intentText: input, projectRoot });
      removeBlock(thinkingId);
      const planBlockId = newId("plan");
      currentPlanByBlockId[planBlockId] = plan;

      const prefix = await getWorkPrefix(input);
      addBlock(planBlock(planBlockId, plan, prefix));
      toast("Plan ready. Review and click Run plan.");
    } catch (err) {
      updateBlock(thinkingId, { status: "failed" });
      const msg = errorMessage(err, "Code planning failed");
      addBlock(codeErrorBlock(newId("error"), msg));
      toast(`Code planning error: ${msg}`);
    }
  }

  async function handleRunbookIntentInput(ctx) {
    const {
      addBlock,
      applyRunbookParams,
      extractRunbookParams,
      fallbackProjectRoot,
      input,
      newId,
      prompt,
      rina,
      toast,
    } = ctx;

    const shouldReplay = ctx.classification?.isRunbookIntent || /^replay\s+(latest\s+)?runbook$/i.test(String(input || "").trim());
    if (!shouldReplay) return false;

    if (!rina?.exportStructuredRunbookJson) {
      toast("Runbook replay API unavailable");
      return true;
    }

    const runbook = await rina.exportStructuredRunbookJson();
    if (!runbook || !Array.isArray(runbook.steps) || runbook.steps.length === 0) {
      toast("No runbook steps available");
      return true;
    }

    const params = {};
    const paramKeys = new Set(runbook.parameters || []);
    runbook.steps.forEach((step) => extractRunbookParams(step.command).forEach((key) => paramKeys.add(key)));
    for (const key of Array.from(paramKeys)) {
      const value = prompt(`Runbook parameter ${key}:`, "") ?? "";
      if (!value.trim()) {
        toast(`Replay cancelled (missing ${key})`);
        return true;
      }
      params[key] = value.trim();
    }

    const plan = runbook.steps.map((step, index) => {
      const command = applyRunbookParams(step.command, params);
      return {
        tool: "terminal.write",
        stepId: step.stepId || `rb_${index + 1}`,
        input: {
          command,
          cwd: step.cwd || runbook.projectRoot || fallbackProjectRoot || "/",
          timeoutMs: 300000,
        },
        ...(step.risk === "high-impact" ? { confirmationScope: `terminal.write:${command}` } : {}),
      };
    });

    const needsYes = plan.some((step) => !!step.confirmationScope);
    let confirmed = true;
    let confirmationText = "";
    if (needsYes) {
      confirmationText = prompt('Replay has high-impact steps. Type "YES" to continue') ?? "";
      confirmed = confirmationText === "YES";
      if (!confirmed) {
        toast("Replay cancelled");
        return true;
      }
    }

    addBlock({
      id: newId("assistant"),
      type: "assistant",
      status: "queued",
      createdAt: Date.now(),
      title: "Rina — Runbook Replay",
      markdown: `Replaying \`${runbook.id}\` with ${plan.length} step(s).`,
    });

    await rina.executePlanStream({
      plan,
      projectRoot: runbook.projectRoot || fallbackProjectRoot || "",
      confirmed,
      confirmationText,
    });
    toast("Runbook replay started");
    return true;
  }

  window.RinaWarpComposerActionsController = {
    handleDirectChatInput,
    handleTerminalCommandInput,
    handleAgentIntentInput,
    handleCodeIntentInput,
    handleRunbookIntentInput,
  };
})();
