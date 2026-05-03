(function () {
  function newId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(text) {
    if (text == null) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
  }

  function truncateOutput(text, maxLen = 200_000) {
    if (!text || text.length <= maxLen) return text;
    const kept = text.slice(0, maxLen);
    const cut = text.length - maxLen;
    return `${kept}\n… (${cut} more bytes hidden. Download report for full output.)`;
  }

  function trimSelectionText(text, maxLen = 1400) {
    const cleaned = String(text || "").replace(/\s+/g, " ").trim();
    if (!cleaned) return "";
    return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
  }

  function formatBytes(n) {
    if (typeof n !== "number" || !Number.isFinite(n)) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  function getById(id) {
    return document.getElementById(id);
  }

  function getComposerInput() {
    return getById("composerInput");
  }

  function autosizeTextarea(el, opts = {}) {
    if (!el) return;
    const min = Number.isFinite(opts.min) ? Number(opts.min) : 44;
    const max = Number.isFinite(opts.max) ? Number(opts.max) : 160;
    el.style.height = "0px";
    const next = Math.min(max, Math.max(min, el.scrollHeight));
    el.style.height = `${next}px`;
  }

  function getOrCreateLocalStorageId(key, prefix = "local") {
    let value = "";
    try {
      value = localStorage.getItem(key) || "";
    } catch {}
    if (!value) {
      value = `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      try {
        localStorage.setItem(key, value);
      } catch {}
    }
    return value;
  }

  window.RinaRendererUtils = {
    newId,
    makeId: newId,
    escapeHtml,
    truncateOutput,
    trimSelectionText,
    formatBytes,
    getById,
    getComposerInput,
    autosizeTextarea,
    getOrCreateLocalStorageId,
  };
})();
