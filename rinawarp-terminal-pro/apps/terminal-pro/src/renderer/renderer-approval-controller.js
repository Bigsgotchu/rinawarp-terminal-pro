(function () {
  const { escapeHtml } = window.RinaRendererUtils;

  function getPendingApproval(block) {
    return block?.inlineRinaResult?.pendingApproval || null;
  }

  function getApprovalMeta(block) {
    const result = block?.inlineRinaResult || {};
    const command = String(result.command || "").trim();
    const pendingApproval = getPendingApproval(block);
    const pendingKind = String(pendingApproval?.kind || "");
    const patchTarget = String(pendingApproval?.payload?.path || "").trim();
    const approvalState = String(block?.approvalState || "pending");
    const isUsageLimit = /used.*agent runs/i.test(String(result.explanation || "")) ||
      /upgrade to pro/i.test(String(result.confirmationMessage || ""));
    const approvalLabel =
      approvalState === "approved"
        ? pendingKind === "file_patch"
          ? "Patch applied"
          : "Command sent"
        : approvalState === "copied"
          ? "Command copied"
          : pendingKind === "file_patch"
            ? "Patch approval required"
            : command && result.confirmation
              ? "Ready to run"
              : "No command proposed";

    return {
      command,
      pendingApproval,
      pendingKind,
      patchTarget,
      approvalState,
      approvalLabel,
      isUsageLimit,
    };
  }

  function renderApprovalMeta(block) {
    const meta = getApprovalMeta(block);
    return `<span class="pill">${escapeHtml(meta.approvalLabel)}</span>`;
  }

  function renderApprovalControls(block) {
    const meta = getApprovalMeta(block);
    if (meta.command) {
      return `
        <div class="suggestions">
          <button class="suggestion-btn" data-testid="approve-inline-command" onclick="approveInlineRinaCommand('${escapeHtml(block.id)}')" ${meta.approvalState === "approved" ? "disabled" : ""}>
            ${meta.approvalState === "approved" ? "Sent" : "Run command"}
          </button>
          <button class="suggestion-btn copy" onclick="copyInlineRinaCommand('${escapeHtml(block.id)}')">Copy</button>
        </div>
      `;
    }
    if (meta.pendingKind === "file_patch") {
      return `
        <div class="suggestions">
          <button class="suggestion-btn" data-testid="approve-inline-command" onclick="approveInlineRinaCommand('${escapeHtml(block.id)}')" ${meta.approvalState === "approved" ? "disabled" : ""}>
            ${meta.approvalState === "approved" ? "Applied" : "Apply patch"}
          </button>
        </div>
      `;
    }
    if (meta.isUsageLimit) {
      return `
        <div class="suggestions">
          <button class="suggestion-btn" onclick="window.open('https://www.rinawarptech.com/pricing/', '_blank')">Upgrade</button>
        </div>
      `;
    }
    return "";
  }

  function createApprovalHandlers(deps) {
    async function copyInlineRinaCommand(blockId) {
      const block = deps.findBlockById(blockId);
      const command = String(block?.inlineRinaResult?.command || "").trim();
      if (!command) return;
      await navigator.clipboard.writeText(command);
      deps.updateBlock(blockId, { approvalState: "copied" });
      deps.toast("Rina command copied");
    }

    async function approveInlineRinaCommand(blockId) {
      const block = deps.findBlockById(blockId);
      const command = String(block?.inlineRinaResult?.command || "").trim();
      const pendingApproval = getPendingApproval(block);
      const runId = String(block?.inlineRinaRunId || "").trim();
      const isPatchApproval = String(pendingApproval?.kind || "") === "file_patch";
      if (!command && !isPatchApproval) return;

      const ok = deps.isPtyConnected() ? true : await deps.ensurePty();
      if (!isPatchApproval && !ok) {
        deps.toast("Start the terminal session first");
        return;
      }

      const narrationId = command ? deps.createTerminalNarration(command) : null;
      const statusId = deps.newId("assistant");
      deps.addBlock({
        id: statusId,
        type: "assistant_status",
        status: "running",
        statusText: isPatchApproval ? "Applying suggested patch..." : "Approving suggested command...",
        statusTextTone: "running",
        createdAt: Date.now(),
        title: "Rina",
        markdown: isPatchApproval ? "Applying suggested patch..." : "Approving suggested command...",
        command: command || undefined,
      });
      if (command) deps.setLastTerminalCommand(command);

      const res = isPatchApproval
        ? await deps.approveFilePatch({ runId, command, patch: pendingApproval?.payload })
        : await deps.approveInlineCommand({ runId, command });

      if (!res?.ok) {
        if (narrationId) {
          deps.removePendingTerminalNarration(narrationId);
          deps.updateBlock(narrationId, {
            status: "failed",
            statusText: "Suggested command was not sent to the terminal.",
            statusTextTone: "failed",
            markdown: res?.error || "Inline approve unavailable",
          });
        }
        deps.updateBlock(statusId, {
          status: "failed",
          statusText: "Approval failed.",
          statusTextTone: "failed",
          markdown: res?.error || "Inline approve unavailable",
        });
        deps.toast(`Approve failed: ${res?.error || "unknown error"}`);
        return;
      }

      deps.updateBlock(blockId, { approvalState: "approved", status: "ok" });
      deps.updateBlock(statusId, {
        status: "completed",
        statusText: isPatchApproval ? "Suggested patch applied." : "Suggested command approved.",
        statusTextTone: "completed",
        markdown: isPatchApproval ? "Suggested patch applied." : "Suggested command approved.",
        stdout: res?.rerunOutput ? String(res.rerunOutput) : undefined,
      });

      if (res?.rerunCommand) {
        deps.addBlock({
          id: deps.newId("assistant"),
          type: "assistant",
          status: "ok",
          createdAt: Date.now(),
          title: "Rina",
          markdown: `I applied the patch and reran \`${res.rerunCommand}\`.`,
          stdout: res?.rerunOutput ? String(res.rerunOutput) : undefined,
        });
      }
      deps.refreshUsageLine().catch(() => {});
      deps.toast(isPatchApproval ? "Patch applied" : "Command sent");
    }

    return {
      copyInlineRinaCommand,
      approveInlineRinaCommand,
    };
  }

  window.RinaWarpApprovalController = {
    getPendingApproval,
    getApprovalMeta,
    renderApprovalMeta,
    renderApprovalControls,
    createApprovalHandlers,
  };
})();
