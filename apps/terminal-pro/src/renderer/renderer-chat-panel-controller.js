(function () {
  'use strict';

  function renderChatThread() {
    const thread = document.getElementById("chatThread");
    if (!thread) return;
    const rows = blocks.filter((b) => b.type === "user" || b.type === "assistant" || (b.type === "assistant_status" && b.inlineRinaResult));
    if (!rows.length) {
      thread.innerHTML = `
         <div class="first-run-card" data-testid="first-run-card">
           <div class="first-run-title">Talk to Rina</div>
           <div class="first-run-body">Describe what’s broken in plain English. Rina will inspect safely, explain what she finds, ask before changing anything, and verify what improved.</div>
           <div class="first-run-actions">
             <button class="suggestion-btn" data-testid="first-run-example" data-prompt="Why is my disk full?">Why is my disk full?</button>
             <button class="suggestion-btn" data-testid="first-run-example" data-prompt="What is using port 3000?">What is using port 3000?</button>
             <button class="suggestion-btn" data-testid="first-run-example" data-prompt="My build is failing">My build is failing</button>
           </div>
         </div>
       `;
      // Attach click handlers
      thread.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const prompt = btn.getAttribute('data-prompt');
          const input = document.getElementById('composerInput');
          if (input) {
            input.value = prompt;
            submitInput();
          }
        });
      });
      return;
    }
    thread.innerHTML = rows.map((b) => {
      const who = b.type === "user" ? "You" : "Rina";
      const side = b.type === "user" ? "user" : "rina";
      return `
        <div class="chat-row ${side}">
          <div class="chat-author">${who}</div>
          <div class="chat-bubble">${chatBubbleHtml(b)}</div>
        </div>
      `;
    }).join("");
    scrollChatToLatest(thread);
    requestAnimationFrame(() => {
      scrollChatToLatest(thread);
    });
    window.setTimeout(() => {
      scrollChatToLatest(thread);
    }, 50);
  }

  function scrollChatToLatest(thread) {
    const latest = thread.lastElementChild;
    if (latest?.scrollIntoView) {
      latest.scrollIntoView({ block: "end" });
      return;
    }
    thread.scrollTop = thread.scrollHeight;
  }

  function chatBubbleHtml(block) {
    const result = block?.inlineRinaResult;
    if (result) {
      const command = String(result.command || "").trim();
      const explanation = String(result.explanation || block.markdown || "").trim();
      const risk = String(result.risk || "low").trim();
      const approvalMeta = window.RinaWarpApprovalController?.renderApprovalMeta?.(block) || "";
      const approvalControls = window.RinaWarpApprovalController?.renderApprovalControls?.(block) || "";
      return [
        `<div>${escapeHtml(explanation || "(empty)")}</div>`,
        `<div class="meta"><span class="pill ${escapeHtml(risk)}">Risk: ${escapeHtml(risk)}</span>${approvalMeta}</div>`,
        command ? `<div class="code">${escapeHtml(command)}</div>` : "",
        approvalControls,
      ].join("");
    }

    const text = String(block.markdown || block.command || "").trim();
    return `${escapeHtml(text || "(empty)")}${block.type === "assistant" ? suggestionButtonsHtml(text) : ""}`;
  }

  function applySidePanelsVisibility() {
    const chatPanel = document.getElementById("chatPanel");
    const codePanel = document.getElementById("codePanel");
    const main = document.querySelector(".main");
    const toggleBtn = document.getElementById("chatToggleBtn");
    if (!chatPanel || !codePanel || !main) return;
    const showChat = chatPanelVisible;
    const showCode = mode === "code";
    chatPanel.style.display = showChat ? "flex" : "none";
    codePanel.style.display = showCode ? "flex" : "none";
    main.classList.toggle("chat-collapsed", !showChat && !showCode);
    if (toggleBtn) toggleBtn.textContent = showChat ? "Close" : "Open";
  }

  function toggleChatPanel() {
    chatPanelVisible = !chatPanelVisible;
    applySidePanelsVisibility();
    persistUiSnapshot();
  }

  function clearChatThread() {
    const hadChat = blocks.some((b) => b.type === "user" || b.type === "assistant" || (b.type === "assistant_status" && b.inlineRinaResult));
    if (!hadChat) {
      toast("Chat is already empty.");
      return;
    }
    blocks = blocks.filter((b) => b.type !== "user" && b.type !== "assistant" && !(b.type === "assistant_status" && b.inlineRinaResult));
    renderBlocks();
    persistUiSnapshot();
    toast("Chat cleared.");
  }

  window.RinaWarpChatPanelController = {
    renderThread: renderChatThread,
    applyVisibility: applySidePanelsVisibility,
    toggle: toggleChatPanel,
    clear: clearChatThread,
  };
})();
