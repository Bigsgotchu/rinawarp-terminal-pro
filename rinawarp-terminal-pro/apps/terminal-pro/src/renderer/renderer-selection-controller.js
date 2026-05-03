(function () {
  'use strict';

  function refreshSelectionAffordance() {
    const askBtn = document.getElementById("selectionAskBtn");
    const summary = document.getElementById("selectionSummary");
    if (!askBtn || !summary) return;
    const text = trimSelectionText(currentSelectionText);
    const show = text.length >= 8;
    askBtn.style.display = show ? "" : "none";
    summary.style.display = show ? "" : "none";
    summary.textContent = show ? `Selection: ${text.slice(0, 56)}${text.length > 56 ? "…" : ""}` : "";
  }

  function refreshCurrentSelection() {
    let text = "";
    let source = "";
    const termSelection = trimSelectionText(ptyTerm?.getSelection?.() || "");
    if (termSelection) {
      text = termSelection;
      source = "terminal";
    } else {
      const selection = window.getSelection();
      const raw = trimSelectionText(selection?.toString() || "");
      if (raw) {
        const anchorNode = selection?.anchorNode;
        const el = anchorNode && anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode?.parentElement;
        if (el?.closest?.("#timeline")) {
          text = raw;
          source = "timeline";
        }
      }
    }
    currentSelectionText = text;
    currentSelectionSource = source;
    refreshSelectionAffordance();
  }

  async function askRinaAboutSelection() {
    const selectedText = trimSelectionText(currentSelectionText);
    if (selectedText.length < 8) {
      toast("Select more terminal output first");
      return;
    }
    const ok = ptyConnected ? true : await ensurePty();
    if (!ok) {
      toast("Start the terminal session first");
      return;
    }
    try {
      await runInlineRinaPrompt("Explain this selected terminal output", {
        action: "explainSelection",
        selectedText,
        triggerType: "selection",
        sourceText: selectedText,
        loadingMessage: "Reviewing your selection...",
        successLabel: `Rina reviewed your ${currentSelectionSource || "terminal"} selection`,
      });
      currentSelectionText = "";
      currentSelectionSource = "";
      refreshSelectionAffordance();
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || "Selection help failed");
      addBlock({
        id: newId("assistant"),
        type: "assistant",
        status: "failed",
        createdAt: Date.now(),
        title: "Rina",
        markdown: `Selection help failed.\n\n${msg}`,
      });
    }
  }

  window.RinaWarpSelectionController = {
    refreshAffordance: refreshSelectionAffordance,
    refreshCurrentSelection,
    askRinaAboutSelection,
  };
})();
