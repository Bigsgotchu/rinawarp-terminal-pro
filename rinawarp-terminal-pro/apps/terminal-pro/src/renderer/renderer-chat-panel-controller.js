(function () {
  'use strict';

  function renderChatThread() {
    const thread = document.getElementById("chatThread");
    if (!thread) return;
    const rows = blocks.filter((b) => b.type === "user" || b.type === "assistant");
    if (!rows.length) {
      thread.innerHTML = `<div class="small">Start in the terminal flow. Rina can explain, suggest, and approve work inline when needed.</div>`;
      return;
    }
    thread.innerHTML = rows.map((b) => {
      const who = b.type === "user" ? "You" : "Rina";
      const side = b.type === "user" ? "user" : "rina";
      const text = String(b.markdown || b.command || "").trim();
      return `
        <div class="chat-row ${side}">
          <div class="chat-author">${who}</div>
          <div class="chat-bubble">${escapeHtml(text || "(empty)")}${b.type === "assistant" && !b.inlineRinaResult ? suggestionButtonsHtml(text) : ""}</div>
        </div>
      `;
    }).join("");
    thread.scrollTop = thread.scrollHeight;
  }

  function applySidePanelsVisibility() {
    const chatPanel = document.getElementById("chatPanel");
    const codePanel = document.getElementById("codePanel");
    const main = document.querySelector(".main");
    const toggleBtn = document.getElementById("chatToggleBtn");
    if (!chatPanel || !codePanel || !main) return;
    const showChat = false;
    const showCode = mode !== "terminal";
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
    const hadChat = blocks.some((b) => b.type === "user" || b.type === "assistant");
    if (!hadChat) {
      toast("Chat is already empty.");
      return;
    }
    blocks = blocks.filter((b) => b.type !== "user" && b.type !== "assistant");
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
