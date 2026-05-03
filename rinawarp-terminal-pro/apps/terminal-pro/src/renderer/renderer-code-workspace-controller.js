(function () {
  'use strict';

  function renderCodeFiles() {
    const filesEl = document.getElementById("codeFiles");
    if (!filesEl) return;
    const q = String(document.getElementById("codeSearch")?.value || "").trim().toLowerCase();
    const files = q ? codeFileList.filter((p) => p.toLowerCase().includes(q)) : codeFileList;
    if (!files.length) {
      filesEl.innerHTML = `<div class="small">No files match this filter.</div>`;
      return;
    }
    filesEl.innerHTML = files.slice(0, 1200).map((p) => `
      <div class="code-file ${codeSelectedPath === p ? "active" : ""}" onclick="openCodeFile('${encodeURIComponent(p)}')">${escapeHtml(p)}</div>
    `).join("");
  }

  function lcsLineDiff(before, after) {
    const a = String(before || "").split("\n");
    const b = String(after || "").split("\n");
    const n = a.length;
    const m = b.length;
    if (n * m > 250000) {
      const max = Math.max(n, m);
      const out = [];
      for (let i = 0; i < max; i += 1) {
        const av = a[i];
        const bv = b[i];
        if (av === bv) continue;
        if (typeof av === "string") out.push({ type: "minus", line: av });
        if (typeof bv === "string") out.push({ type: "plus", line: bv });
      }
      return out;
    }
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const out = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) {
        i += 1;
        j += 1;
        continue;
      }
      if (dp[i + 1][j] >= dp[i][j + 1]) {
        out.push({ type: "minus", line: a[i] });
        i += 1;
      } else {
        out.push({ type: "plus", line: b[j] });
        j += 1;
      }
    }
    while (i < n) out.push({ type: "minus", line: a[i++] });
    while (j < m) out.push({ type: "plus", line: b[j++] });
    return out;
  }

  function renderCodeDiff(diffLines) {
    const el = document.getElementById("codeDiff");
    if (!el) return;
    if (!Array.isArray(diffLines) || !diffLines.length) {
      el.innerHTML = `<span class="meta">No changes in draft.</span>`;
      return;
    }
    const header = [
      `<span class="meta">--- a/${escapeHtml(codeSelectedPath || "file")}</span>`,
      `<span class="meta">+++ b/${escapeHtml(codeSelectedPath || "file")}</span>`,
    ];
    const body = diffLines.slice(0, 2500).map((d) => {
      if (d.type === "plus") return `<span class="plus">+${escapeHtml(d.line)}</span>`;
      if (d.type === "minus") return `<span class="minus">-${escapeHtml(d.line)}</span>`;
      return ` ${escapeHtml(d.line)}`;
    });
    if (diffLines.length > 2500) {
      body.push(`<span class="meta">... ${diffLines.length - 2500} more changed lines hidden</span>`);
    }
    el.innerHTML = [...header, ...body].join("\n");
  }

  function previewCodePatch() {
    if (!codeSelectedPath) return;
    const before = codeFileContents[codeSelectedPath] || "";
    const after = codeFileDrafts[codeSelectedPath] || "";
    const diff = lcsLineDiff(before, after);
    renderCodeDiff(diff);
    toast(diff.length ? `Patch preview: ${diff.length} changed lines` : "No draft changes");
  }

  function resetCodeDraft() {
    if (!codeSelectedPath) return;
    const original = codeFileContents[codeSelectedPath] || "";
    codeFileDrafts[codeSelectedPath] = original;
    const editor = document.getElementById("codeEditor");
    if (editor) editor.value = original;
    renderCodeDiff([]);
    toast("Draft reset");
  }

  function useDraftInPrompt() {
    if (!codeSelectedPath) return;
    const draft = codeFileDrafts[codeSelectedPath] || "";
    const before = codeFileContents[codeSelectedPath] || "";
    const diff = lcsLineDiff(before, draft);
    const prompt = getComposerInput();
    if (!prompt) return;
    const summary = diff.length
      ? `I edited ${codeSelectedPath}. Review and apply these changes.\n\n${diff.slice(0, 200).map((d) => (d.type === "plus" ? "+" : "-") + d.line).join("\n")}`
      : `Review ${codeSelectedPath}. I have no draft changes yet.`;
    prompt.value = summary;
    autosizeIntentInput();
    toast("Draft added to prompt");
  }

  async function refreshCodeWorkspace() {
    const filesEl = document.getElementById("codeFiles");
    const previewEl = document.getElementById("codePreview");
    if (!filesEl || !previewEl) return;
    const projectRoot = (document.getElementById("projectRoot")?.value || "").trim();
    if (!projectRoot) {
      filesEl.innerHTML = `<div class="small">Pick a workspace to browse files.</div>`;
      previewEl.textContent = "No workspace selected.";
      return;
    }
    filesEl.innerHTML = `<div class="small">Loading files…</div>`;
    try {
      const res = await window.rina?.codeListFiles?.({ projectRoot, limit: 1200 });
      if (!res?.ok) {
        filesEl.innerHTML = `<div class="small">Could not load files: ${escapeHtml(res?.error || "unknown error")}</div>`;
        previewEl.textContent = "File list unavailable.";
        return;
      }
      codeFileList = Array.isArray(res.files) ? res.files : [];
      if (!codeFileList.length) {
        filesEl.innerHTML = `<div class="small">No files found in workspace.</div>`;
        previewEl.textContent = "Workspace is empty.";
        return;
      }
      if (!codeSelectedPath || !codeFileList.includes(codeSelectedPath)) {
        codeSelectedPath = codeFileList[0];
      }
      renderCodeFiles();
      await openCodeFile(encodeURIComponent(codeSelectedPath), true);
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || "load failed");
      filesEl.innerHTML = `<div class="small">Error: ${escapeHtml(msg)}</div>`;
    }
  }

  async function openCodeFile(encodedPath, skipRender = false) {
    const previewEl = document.getElementById("codePreview");
    const editor = document.getElementById("codeEditor");
    if (!previewEl) return;
    const relativePath = decodeURIComponent(String(encodedPath || ""));
    if (!relativePath) return;
    codeSelectedPath = relativePath;
    if (!skipRender) renderCodeFiles();
    const projectRoot = (document.getElementById("projectRoot")?.value || "").trim();
    if (!projectRoot) {
      previewEl.textContent = "No workspace selected.";
      return;
    }
    previewEl.textContent = `Loading ${relativePath} ...`;
    try {
      const res = await window.rina?.codeReadFile?.({
        projectRoot,
        relativePath,
        maxBytes: 140000,
      });
      if (!res?.ok) {
        previewEl.textContent = `Could not open ${relativePath}\n\n${res?.error || "Unknown error"}`;
        if (editor) editor.value = "";
        renderCodeDiff([]);
        return;
      }
      const content = String(res.content || "");
      codeFileContents[relativePath] = content;
      if (!(relativePath in codeFileDrafts)) codeFileDrafts[relativePath] = content;
      previewEl.textContent = content;
      if (editor) editor.value = codeFileDrafts[relativePath];
      if (res.truncated) {
        previewEl.textContent += `\n\n[preview truncated]`;
      }
      previewCodePatch();
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || "read failed");
      previewEl.textContent = `Could not open ${relativePath}\n\n${msg}`;
      if (editor) editor.value = "";
      renderCodeDiff([]);
    }
  }

  window.RinaWarpCodeWorkspaceController = {
    renderFiles: renderCodeFiles,
    lcsLineDiff,
    renderDiff: renderCodeDiff,
    previewPatch: previewCodePatch,
    resetDraft: resetCodeDraft,
    useDraftInPrompt,
    refresh: refreshCodeWorkspace,
    openFile: openCodeFile,
  };
})();
