(function () {
  function classifyTerminalInput(text) {
    const value = String(text || "").trim();
    const classifier = window.RinaWarpInputClassifier?.classifyTerminalInput;
    const route = classifier ? classifier(value) : {
      kind: /^\/rina\b/i.test(value) ? "rina" : "ambiguous",
      reason: "classifier module unavailable",
    };
    return route.kind;
  }

  function applyRunbookParams(cmd, params) {
    return String(cmd || "").replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/gi, (_m, key) => {
      const v = params[String(key || "").toUpperCase()];
      return v == null ? "" : String(v);
    });
  }

  function extractRunbookParams(cmd) {
    const keys = new Set();
    for (const m of String(cmd || "").matchAll(/\{\{\s*([A-Z0-9_]+)\s*\}\}/gi)) {
      if (m[1]) keys.add(String(m[1]).toUpperCase());
    }
    return Array.from(keys);
  }

  function isDirectChatGreeting(text) {
    const value = String(text || "").trim();
    if (!value) return false;
    return [
      /^(?:hi|hello|hey)(?:\s+rina)?[!.?]*$/i,
      /^help[!.?]*$/i,
      /^what can you do[?.!]*$/i,
      /^can you help me[?.!]*$/i,
      /^who are you[?.!]*$/i,
    ].some((pattern) => pattern.test(value));
  }

  function isWorkIntent(text) {
    const t = (text || "").trim().toLowerCase();
    if (!t) return false;
    if (/\b(fix|build|deploy|diagnose|debug|scan|install|setup|configure|run|test|profile|optimize|ship|release|production|prod|error|bug|crash|slow|failing|broken)\b/.test(t)) {
      return true;
    }
    if (/^(git|npm|pnpm|yarn|node|python|pip|cargo|go|docker|kubectl|helm|ps|df|free|top|ls|cd|cat|grep|rg|curl|wget|sudo)\b/.test(t)) {
      return true;
    }
    if (/[`$]|&&|\|\|/.test(t)) return true;
    return false;
  }

  function tokenizeCommand(raw) {
    const tokens = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(String(raw || ""))) !== null) {
      tokens.push(m[1] ?? m[2] ?? m[3] ?? "");
    }
    return tokens;
  }

  function parseFixIssueCommand(text) {
    const tokens = tokenizeCommand(text);
    if (tokens.length < 3) return null;
    const first = String(tokens[0] || "").toLowerCase();
    const second = String(tokens[1] || "").toLowerCase();
    if (!((first === "/fix" || first === "fix") && second === "issue")) return null;

    const issueId = String(tokens[2] || "").trim();
    if (!issueId) return null;
    const out = {
      issueId,
      branchName: undefined,
      repoSlug: undefined,
      push: false,
      prDryRun: true,
      baseBranch: "main",
      command: "npm test",
    };
    for (let i = 3; i < tokens.length; i++) {
      const t = String(tokens[i] || "");
      if (t === "--push") {
        out.push = true;
        continue;
      }
      if (t === "--live-pr") {
        out.prDryRun = false;
        continue;
      }
      if (t === "--dry-pr") {
        out.prDryRun = true;
        continue;
      }
      if ((t === "--branch" || t === "-b") && i + 1 < tokens.length) {
        out.branchName = String(tokens[++i] || "").trim() || undefined;
        continue;
      }
      if ((t === "--repo" || t === "-r") && i + 1 < tokens.length) {
        out.repoSlug = String(tokens[++i] || "").trim() || undefined;
        continue;
      }
      if (t === "--base" && i + 1 < tokens.length) {
        out.baseBranch = String(tokens[++i] || "").trim() || "main";
        continue;
      }
      if (t === "--cmd" && i + 1 < tokens.length) {
        out.command = String(tokens[++i] || "").trim() || "npm test";
        continue;
      }
    }
    return out;
  }

  function sortStructuredHits(hits, sortMode) {
    const rows = Array.isArray(hits) ? [...hits] : [];
    if (sortMode === "newest") {
      rows.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
    } else if (sortMode === "oldest") {
      rows.sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
    } else if (sortMode === "duration") {
      rows.sort((a, b) => (Number(b.durationMs || 0) - Number(a.durationMs || 0)));
    }
    return rows;
  }

  function structuredSearchParts(query) {
    const sortMatch = String(query || "").match(/\bsort:(score|newest|oldest|duration)\b/i);
    const sortMode = sortMatch ? sortMatch[1].toLowerCase() : "score";
    const queryForEngine = String(query || "").replace(/\bsort:(score|newest|oldest|duration)\b/gi, "").trim();
    return { sortMode, queryForEngine };
  }

  window.RinaRendererNormalizers = {
    classifyTerminalInput,
    applyRunbookParams,
    extractRunbookParams,
    isDirectChatGreeting,
    isWorkIntent,
    tokenizeCommand,
    parseFixIssueCommand,
    sortStructuredHits,
    structuredSearchParts,
  };
})();
