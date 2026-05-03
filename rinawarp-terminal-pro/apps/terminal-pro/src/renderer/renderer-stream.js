(function () {
  const { escapeHtml, truncateOutput } = window.RinaRendererUtils;
  const {
    getApprovalMeta,
    renderApprovalMeta,
    renderApprovalControls,
  } = window.RinaWarpApprovalController;

  function extractSuggestedCommands(text) {
    const found = new Set();
    const src = String(text || "");
    for (const m of src.matchAll(/`([^`\n]{2,220})`/g)) {
      const cmd = String(m[1] || "").trim();
      if (!cmd) continue;
      if (/^(https?:\/\/|session_|status:|risk:|after:|before:|sort:)/i.test(cmd)) continue;
      found.add(cmd);
    }
    for (const line of src.split(/\n+/g)) {
      const maybe = line.replace(/^\s*[-*]\s*/, "").trim();
      if (!maybe) continue;
      if (/^(git|npm|pnpm|yarn|node|python|pip|cargo|go|docker|kubectl|helm|ps|df|free|top|ls|cd|cat|grep|rg|curl|wget|sudo|systemctl|find|ss|lsof|netstat)\b/i.test(maybe)) {
        found.add(maybe);
      }
    }
    return Array.from(found).slice(0, 4);
  }

  function suggestionButtonsHtml(text) {
    const cmds = extractSuggestedCommands(text);
    if (!cmds.length) return "";
    return `<div class="suggestions">${
      cmds.map((c) => `
        <button class="suggestion-btn" onclick="runSuggestedCommand(decodeURIComponent('${encodeURIComponent(c)}'))">Run \`${escapeHtml(c.slice(0, 42))}${c.length > 42 ? "…" : ""}\`</button>
        <button class="suggestion-btn copy" onclick="copySuggestedCommand(decodeURIComponent('${encodeURIComponent(c)}'))">Copy</button>
      `).join("")
    }</div>`;
  }

  function renderAgentActivity(events) {
    const rows = Array.isArray(events) ? events : [];
    if (!rows.length) return "";
    return `
      <div class="suggestions" style="display:flex; flex-direction:column; align-items:stretch;">
        ${rows.map((event) => {
          const type = String(event?.type || "");
          if (type === "tool_started") {
            return `<div class="small">Using ${escapeHtml(String(event?.tool || "tool"))}: ${escapeHtml(String(event?.summary || ""))}</div>`;
          }
          if (type === "tool_result") {
            return `<div class="small">${escapeHtml(String(event?.tool || "tool"))}: ${escapeHtml(String(event?.summary || ""))}</div>`;
          }
          if (type === "approval_requested") {
            return `<div class="small">Approval needed: ${escapeHtml(String(event?.details || event?.action || ""))}</div>`;
          }
          if (type === "task_complete") {
            return `<div class="small">${escapeHtml(String(event?.summary || ""))}</div>`;
          }
          return `<div class="small">${escapeHtml(String(event?.text || ""))}</div>`;
        }).join("")}
      </div>
    `;
  }

  function renderInlineRinaResult(block) {
    const result = block?.inlineRinaResult;
    if (!result) return "";
    const command = String(result.command || "").trim();
    const { patchTarget } = getApprovalMeta(block);
    return `
      <div class="rina-inline-result" data-testid="inline-rina-result">
        <div>${escapeHtml(String(result.explanation || ""))}</div>
        <div class="meta">
          <span class="pill ${escapeHtml(String(result.risk || "low"))}">Risk: ${escapeHtml(String(result.risk || "low"))}</span>
          ${renderApprovalMeta(block)}
        </div>
        ${renderAgentActivity(result.agentEvents)}
        ${command ? `<div class="code">${escapeHtml(command)}</div>` : ""}
        ${patchTarget ? `<div class="code">Patch target: ${escapeHtml(patchTarget)}</div>` : ""}
        ${renderApprovalControls(block)}
      </div>
    `;
  }

  function renderFailureActions(block) {
    const cmd = String(block?.failureContext?.command || "").trim();
    if (!cmd) return "";
    return `
      <div class="suggestions">
        <button class="suggestion-btn" data-testid="explain-failure" onclick="runInlineFailureAction('${escapeHtml(block.id)}','explain')">Explain failure</button>
        <button class="suggestion-btn" data-testid="suggest-fix" onclick="runInlineFailureAction('${escapeHtml(block.id)}','fix')">Suggest fix</button>
      </div>
    `;
  }

  function renderBlockActionButtons(block, opts = {}) {
    const blockCollapsed = opts.blockCollapsed || {};
    if (block.type === "plan") {
      return `
        <div class="stream-controls">
          <button onclick="toggleBlockCollapse('${escapeHtml(block.id)}')">${blockCollapsed[block.id] ? "Expand" : "Collapse"}</button>
          <button class="btn-run" onclick="runPlan('${escapeHtml(block.id)}')" ${block.status === "running" ? "disabled" : ""}>Run plan</button>
          <button class="btn-run" onclick="runPlanWithAutoRepair('${escapeHtml(block.id)}')" ${block.status === "running" ? "disabled" : ""}>Auto-fix run</button>
          <button class="btn-stop" data-testid="stop-stream" onclick="stopPlan('${escapeHtml(block.id)}')" ${block.status !== "running" ? "disabled" : ""}>Stop</button>
          <button class="btn-stop" data-testid="kill-stream" onclick="stopPlan('${escapeHtml(block.id)}', true)" ${block.status !== "running" ? "disabled" : ""}>Force stop</button>
          <button class="btn-download" onclick="downloadReport('${escapeHtml(block.id)}')">Report</button>
          <button class="btn-download" onclick="downloadHandoffBrief('${escapeHtml(block.id)}')">Handoff</button>
          <button class="btn-save" onclick="saveWorkflowFromPlanBlock('${escapeHtml(block.id)}')">Save</button>
        </div>
      `;
    }
    if (block.type === "step") {
      return `
        <div class="stream-controls">
          <button onclick="toggleBlockCollapse('${escapeHtml(block.id)}')">${blockCollapsed[block.id] ? "Expand" : "Collapse"}</button>
          <button class="btn-run" onclick="runStep('${escapeHtml(block.id)}')" ${block.status === "running" ? "disabled" : ""}>Run</button>
          <button class="btn-rerun" onclick="rerunStep('${escapeHtml(block.id)}')" ${block.status === "running" ? "disabled" : ""}>Re-run</button>
          <button class="btn-rerun" onclick="rerunStepEdited('${escapeHtml(block.id)}')" ${block.status === "running" ? "disabled" : ""}>Re-run edited</button>
          <button class="btn-rerun" onclick="editStepInComposer('${escapeHtml(block.id)}')">Edit in composer</button>
          <button class="btn-rerun" onclick="rerunStepWithCwdEnv('${escapeHtml(block.id)}')" ${block.status === "running" ? "disabled" : ""}>Re-run cwd/env</button>
          ${block.command ? `<button class="btn-copy" onclick="copyCommand('${escapeHtml(block.id)}')">Copy</button>` : ""}
          ${(block.stdout || block.stderr) ? `<button class="btn-copy" onclick="copyOutput('${escapeHtml(block.id)}')">Copy output</button>` : ""}
          ${(block.stdout || block.stderr) ? `<button class="btn-copy" onclick="copyOutputAnsi('${escapeHtml(block.id)}')">Copy ANSI</button>` : ""}
          <button class="btn-copy" onclick="jumpToPrevError('${escapeHtml(block.id)}')">Prev error</button>
          <button class="btn-copy" onclick="jumpToNextError('${escapeHtml(block.id)}')">Next error</button>
          ${block.streamId && block.status === "running" ? `<button class="btn-cancel" data-testid="stop-stream" onclick="cancelStream('${escapeHtml(block.streamId)}')">Cancel</button>` : ""}
          ${block.streamId && block.status === "running" ? `<button class="btn-stop" data-testid="kill-stream" onclick="cancelStream('${escapeHtml(block.streamId)}', true)">Force kill</button>` : ""}
        </div>
      `;
    }
    return "";
  }

  function renderStreamStatus(block, statusText) {
    const statusClass =
      block.status === "running" || block.status === "planning"
        ? (block.statusTextTone || (block.status === "planning" ? "thinking" : "running"))
        : block.status === "failed"
          ? "failed"
          : block.status === "blocked"
            ? "blocked"
            : block.status === "cancelled"
              ? "blocked"
              : "completed";
    return `
      <div class="stream-status stream-status--${escapeHtml(statusClass)}" ${block.status === "running" ? 'data-testid="stream-running"' : ""}>
        ${escapeHtml(statusText)}
      </div>
    `;
  }

  function renderStreamOutput(text, extraClass = "") {
    const value = String(text || "");
    if (!value) return "";
    const lineCount = value.split("\n").length;
    const long = value.length > 3000 || lineCount > 40;
    const safeText = escapeHtml(truncateOutput(value));
    if (!long) {
      return `<pre class="stream-output ${escapeHtml(extraClass)}">${safeText}</pre>`;
    }
    const preview = escapeHtml(truncateOutput(value.split("\n").slice(0, 16).join("\n")));
    return `
      <div class="stream-output-shell">
        <pre class="stream-output ${escapeHtml(extraClass)}">${preview}</pre>
        <details class="stream-output-details">
          <summary>Show full output (${lineCount} lines)</summary>
          <pre class="stream-output ${escapeHtml(extraClass)}">${safeText}</pre>
        </details>
      </div>
    `;
  }

  function renderStreamItem(block, opts = {}) {
    const type = String(block.type || "assistant");
    const text = String(block.markdown || block.statusText || "").trim();
    const command = String(block.command || "").trim();
    const stdout = String(block.stdout || "").trim();
    const stderr = String(block.stderr || "").trim();
    const statusText = String(
      block.statusText
        || (type === "assistant_status"
          ? text
          : type === "terminal_output"
            ? "Terminal output"
            : block.title || ""),
    ).trim();

    if (type === "user") {
      return `
        <article class="stream-item block user stream-item--user" data-id="${escapeHtml(block.id)}" data-testid="block" data-block-id="${escapeHtml(block.id)}">
          <div class="stream-accent" aria-hidden="true"></div>
          <div class="stream-body">
            <div class="stream-avatar">You</div>
            <div class="stream-bubble stream-bubble--user">
              <div class="stream-text markdown">${escapeHtml(text || "(empty)")}</div>
            </div>
          </div>
        </article>
      `;
    }

    if (type === "assistant_status") {
      return `
        <article class="stream-item block assistant stream-item--assistant" data-id="${escapeHtml(block.id)}" data-testid="block" data-block-id="${escapeHtml(block.id)}">
          <div class="stream-accent" aria-hidden="true"></div>
          <div class="stream-body">
            <div class="stream-avatar">Rina</div>
            <div class="stream-bubble stream-bubble--assistant">
            ${renderStreamStatus(block, statusText || "Working...")}
            ${text && text !== statusText ? `<div class="stream-text markdown">${escapeHtml(text)}</div>` : ""}
            ${command ? `<div class="stream-meta">Command: ${escapeHtml(command)}</div>` : ""}
            </div>
          </div>
        </article>
      `;
    }

    if (type === "terminal_output" || type === "step") {
      const terminalLabel = type === "step"
        ? `${block.title || "Terminal step"}${command ? ` · ${command}` : ""}`
        : (command ? `${command}` : "Terminal");
      return `
        <article class="stream-item block ${escapeHtml(type)} stream-item--terminal" data-id="${escapeHtml(block.id)}" data-testid="block" data-block-id="${escapeHtml(block.id)}">
          <div class="stream-accent" aria-hidden="true"></div>
          <div class="stream-body">
            <div class="stream-avatar">Terminal</div>
            <div class="stream-bubble stream-bubble--terminal">
            ${type === "step" ? renderStreamStatus(block, statusText || block.status || "Running") : ""}
            ${command ? `<div class="stream-terminal-label">${escapeHtml(terminalLabel)}</div>` : ""}
            ${stdout ? renderStreamOutput(stdout, "stdout") : ""}
            ${stderr ? renderStreamOutput(stderr, "stream-output--stderr stderr") : ""}
            ${type === "terminal_output" && text ? renderStreamOutput(text, "stdout") : ""}
            ${block.exitCode != null ? `<div class="stream-meta">Exit code: ${escapeHtml(String(block.exitCode))}</div>` : ""}
            ${renderBlockActionButtons(block, opts)}
            </div>
          </div>
        </article>
      `;
    }

    if (type === "choice" || (type === "assistant" && block.pendingInput)) {
      const pendingInput = String(block.pendingInput || "").trim();
      const copy = text || `I can either run "${pendingInput}" in the terminal or treat it as a request for Rina.`;
      return `
        <article class="stream-item block assistant stream-item--assistant" data-id="${escapeHtml(block.id)}" data-testid="block" data-block-id="${escapeHtml(block.id)}">
          <div class="stream-accent" aria-hidden="true"></div>
          <div class="stream-body">
            <div class="stream-avatar">Rina</div>
            <div class="stream-bubble stream-bubble--assistant">
            <div class="stream-text markdown">${escapeHtml(copy)}</div>
            <div class="route-choice" data-testid="input-route-choice">
              <button class="route-choice__button" data-route-choice="terminal" onclick="resolveIntentDecision('${escapeHtml(block.id)}', 'terminal')">Run in terminal</button>
              <button class="route-choice__button" data-route-choice="rina" onclick="resolveIntentDecision('${escapeHtml(block.id)}', 'rina')">Ask Rina</button>
            </div>
            </div>
          </div>
        </article>
      `;
    }

    return `
      <article class="stream-item block ${escapeHtml(type)} stream-item--assistant" data-id="${escapeHtml(block.id)}" data-testid="block" data-block-id="${escapeHtml(block.id)}">
        <div class="stream-accent" aria-hidden="true"></div>
        <div class="stream-body">
          <div class="stream-avatar">${type === "plan" ? "Plan" : "Rina"}</div>
          <div class="stream-bubble stream-bubble--assistant">
          ${statusText && type === "plan" ? renderStreamStatus(block, statusText || block.status || "Ready") : ""}
          ${text ? `<div class="stream-text markdown">${escapeHtml(text)}</div>` : ""}
          ${command ? `<div class="stream-meta">Command: ${escapeHtml(command)}</div>` : ""}
          ${type === "assistant" ? renderInlineRinaResult(block) : ""}
          ${type === "assistant" && block.failureContext && !block.inlineRinaResult ? renderFailureActions(block) : ""}
          ${type === "assistant" && !block.inlineRinaResult && !block.failureContext && !block.pendingInput ? suggestionButtonsHtml(block.markdown || block.command || "") : ""}
          ${stdout ? renderStreamOutput(stdout, "stdout") : ""}
          ${stderr ? renderStreamOutput(stderr, "stream-output--stderr stderr") : ""}
          ${renderBlockActionButtons(block, opts)}
          </div>
        </div>
      </article>
    `;
  }

  function renderConversationStream(blocks, opts = {}) {
    return (Array.isArray(blocks) ? blocks : []).map((block) => renderStreamItem(block, opts)).join("");
  }

  window.RinaRendererStream = {
    extractSuggestedCommands,
    suggestionButtonsHtml,
    renderAgentActivity,
    renderAgentEvents: renderAgentActivity,
    renderInlineRinaResult,
    renderFailureActions,
    renderStreamItem,
    renderStreamBlock: renderStreamItem,
    renderConversationStream,
  };
})();
