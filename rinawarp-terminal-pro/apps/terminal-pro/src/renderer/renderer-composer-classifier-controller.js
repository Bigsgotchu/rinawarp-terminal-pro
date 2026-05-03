(function () {
  'use strict';

  function isExplicitRinaPrompt(text) {
    return /^\/rina\b/i.test(String(text || "").trim());
  }

  function normalizeRinaPrompt(text) {
    const value = String(text || "").trim();
    return isExplicitRinaPrompt(value) ? value.replace(/^\/rina\b/i, "").trim() : value;
  }

  function classifyInput(text, mode) {
    const value = String(text || "").trim();
    const terminalIntent = mode === "terminal"
      ? window.RinaRendererNormalizers.classifyTerminalInput(value)
      : "terminal";
    const rinaPrompt = normalizeRinaPrompt(value);
    const issueCmd = window.RinaRendererNormalizers.parseFixIssueCommand(value);
    const prefersChat = /^chat[:\s]/i.test(value) || /\?$/.test(value);
    const isWorkIntent = window.RinaRendererNormalizers.isWorkIntent(value);
    const chatText = value.replace(/^chat[:\s]*/i, "").trim() || value;

    return {
      text: value,
      terminalIntent,
      isDeveloperModeToggle: mode !== "terminal" && /^(toggle|toogle)\s+developer\s+mode$/i.test(value),
      isRinaTerminalIntent: mode === "terminal" && terminalIntent === "rina",
      isExplicitRinaPrompt: isExplicitRinaPrompt(value),
      rinaPrompt,
      isEmptyRinaPrompt: !rinaPrompt,
      isDirectRinaGreeting: !isExplicitRinaPrompt(value) && window.RinaRendererNormalizers.isDirectChatGreeting(rinaPrompt),
      isAmbiguousTerminalIntent: mode === "terminal" && terminalIntent === "ambiguous",
      ambiguousReason: getAmbiguousReason(value),
      isTerminalCommand: mode === "terminal",
      issueCmd,
      prefersChat,
      isWorkIntent,
      shouldRouteToChat: !isWorkIntent || prefersChat,
      chatText,
    };
  }

  function getAmbiguousReason(text) {
    const classifier = window.RinaWarpInputClassifier?.classifyTerminalInput;
    const route = classifier ? classifier(String(text || "").trim()) : null;
    return route?.reason || "ambiguous terminal input";
  }

  function sessionNameForInput(mode, text) {
    const label = mode === "terminal" ? "Cmd" : (mode === "agent" ? "Agent" : "Code");
    return `${label}: ${String(text || "").slice(0, 40)}`;
  }

  function inlineRinaSuccessLabel(inputText, prompt) {
    return isExplicitRinaPrompt(inputText)
      ? `Inline terminal guidance for: ${prompt}`
      : `Rina interpreted: ${prompt}`;
  }

  function developerModeMarkdown(result) {
    const ok = !!result?.ok;
    if (ok) return `Developer mode ${result?.open ? "enabled" : "disabled"}.`;
    return `Could not toggle developer mode.\n\n${result?.error || "Unknown error"}`;
  }

  function planMarkdown(plan) {
    return `${plan?.reasoning || ""}\n\nSteps:\n${(plan?.steps || []).map((step) =>
      `- ${step.stepId ?? ""} \`${(step.input?.command ?? "").replaceAll("`","")}\``
    ).join("\n")}`;
  }

  function inlineRinaFailureMarkdown(message) {
    return `Inline Rina failed.\n\n${message}`;
  }

  function codePlanningFailureMarkdown(message) {
    return `Code planning failed.\n\n${message}`;
  }

  function orchestratorStartedMarkdown({ started, issueCmd, issueId, graphSummary = "" }) {
    return (
      `Started issue workflow \`${started.workflowId}\` for issue \`${issueId}\`.\n` +
      `Queued task: \`${started.taskId}\`.\n` +
      `Branch: \`${issueCmd.branchName || `rina/fix-${issueId}`}\`.\n` +
      `PR mode: \`${issueCmd.prDryRun ? "dry-run" : "live"}\`.\n` +
      `Use Diagnostics > Agent Daemon to monitor status.${graphSummary}`
    );
  }

  function userBlock(id, markdown) {
    return {
      id,
      type: "user",
      status: "ok",
      createdAt: Date.now(),
      title: "You",
      markdown,
    };
  }

  function assistantMarkdownBlock(id, markdown, opts = {}) {
    return {
      id,
      type: opts.type || "assistant",
      status: opts.status || "ok",
      createdAt: Date.now(),
      title: opts.title || "Rina",
      markdown,
    };
  }

  function developerModeBlock(id, result) {
    return {
      id,
      type: "assistant",
      status: result?.ok ? "ok" : "failed",
      createdAt: Date.now(),
      title: "Rina",
      markdown: developerModeMarkdown(result),
    };
  }

  function emptyRinaPromptBlock(id) {
    return {
      id,
      type: "assistant_status",
      status: "failed",
      statusText: "Use `/rina <prompt>` to ask for inline terminal help.",
      statusTextTone: "failed",
      createdAt: Date.now(),
      title: "Rina",
      markdown: "Use `/rina <prompt>` to ask for inline terminal help.",
    };
  }

  function terminalUnavailableBlock(id) {
    return {
      id,
      type: "assistant_status",
      status: "failed",
      statusText: "I couldn't reach the terminal.",
      statusTextTone: "failed",
      createdAt: Date.now(),
      title: "Rina",
      markdown: "I couldn't reach the terminal, so I can't run this suggestion yet.",
    };
  }

  function inlineThinkingBlock(id) {
    return {
      id,
      type: "assistant_status",
      status: "planning",
      statusText: "Thinking...",
      statusTextTone: "thinking",
      createdAt: Date.now(),
      title: "Rina",
      markdown: "Thinking...",
    };
  }

  function inlineFailureBlock(id, message) {
    return {
      id,
      type: "assistant",
      status: "failed",
      createdAt: Date.now(),
      title: "Rina",
      markdown: inlineRinaFailureMarkdown(message),
    };
  }

  function ambiguousChoiceBlock(id, text, reason) {
    return {
      id,
      type: "choice",
      status: "queued",
      createdAt: Date.now(),
      title: "Rina",
      markdown: `I can either run "${text}" in the terminal or treat it as a request for Rina.`,
      pendingInput: text,
      inputDecision: "ambiguous",
      inputDecisionReason: reason,
    };
  }

  function orchestratorErrorBlock(id, message) {
    return {
      id,
      type: "assistant",
      status: "failed",
      createdAt: Date.now(),
      title: "Rina — Orchestrator",
      markdown: `Could not start issue workflow.\n\n${message}`,
    };
  }

  function orchestratorStartedBlock(id, args) {
    return {
      id,
      type: "assistant",
      status: "ok",
      createdAt: Date.now(),
      title: "Rina — Orchestrator",
      markdown: orchestratorStartedMarkdown(args),
    };
  }

  function codeThinkingBlock(id) {
    return {
      id,
      type: "assistant",
      status: "planning",
      createdAt: Date.now(),
      title: "Rina",
      markdown: "Thinking through your request...",
    };
  }

  function planBlock(id, plan, prefix = "") {
    const markdown = planMarkdown(plan);
    return {
      id,
      type: "plan",
      status: "queued",
      createdAt: Date.now(),
      title: "Rina — Plan",
      markdown: prefix ? `${prefix}\n\n${markdown}` : markdown,
      plan,
    };
  }

  function codeErrorBlock(id, message) {
    return {
      id,
      type: "assistant",
      status: "failed",
      createdAt: Date.now(),
      title: "Rina — Error",
      markdown: codePlanningFailureMarkdown(message),
    };
  }

  window.RinaWarpComposerClassifierController = {
    classifyInput,
    sessionNameForInput,
    inlineRinaSuccessLabel,
    developerModeMarkdown,
    planMarkdown,
    inlineRinaFailureMarkdown,
    codePlanningFailureMarkdown,
    orchestratorStartedMarkdown,
    userBlock,
    assistantMarkdownBlock,
    developerModeBlock,
    emptyRinaPromptBlock,
    terminalUnavailableBlock,
    inlineThinkingBlock,
    inlineFailureBlock,
    ambiguousChoiceBlock,
    orchestratorErrorBlock,
    orchestratorStartedBlock,
    codeThinkingBlock,
    planBlock,
    codeErrorBlock,
  };
})();
