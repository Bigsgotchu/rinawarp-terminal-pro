(function () {
  "use strict";

  function ensureAnsiGrid() {
    const wrap = document.getElementById("teAnsi");
    if (!wrap) return;
    if (wrap.children.length === 16) return;
    wrap.innerHTML = "";
    for (let i = 0; i < 16; i += 1) {
      const cell = document.createElement("div");
      cell.className = "ansi-cell";
      cell.innerHTML = `<div class="muted">${i}</div><input type="color" id="teAnsi${i}" />`;
      wrap.appendChild(cell);
    }
  }

  function themeEditorReadFromUI() {
    ensureAnsiGrid();
    const id = (document.getElementById("teId")?.value || "").trim();
    const name = (document.getElementById("teName")?.value || "").trim();
    const group = (document.getElementById("teGroup")?.value || "").trim();
    const bg = document.getElementById("teBg")?.value || "#000000";
    const accent = document.getElementById("teAccent")?.value || "#888888";
    const accent2 = document.getElementById("teAccent2")?.value || "#aaaaaa";
    const text = document.getElementById("teText")?.value || "#ffffff";
    const muted = document.getElementById("teMuted")?.value || "#bbbbbb";
    const border = document.getElementById("teBorder")?.value || "#222222";
    const danger = document.getElementById("teDanger")?.value || "#ff4d6d";
    const success = document.getElementById("teSuccess")?.value || "#3cffb5";
    const ansi = [];
    for (let i = 0; i < 16; i += 1) {
      ansi.push(document.getElementById(`teAnsi${i}`)?.value || "#000000");
    }
    return {
      id,
      name,
      group: group || undefined,
      vars: {
        [THEME_VAR_KEYS.bg]: bg,
        [THEME_VAR_KEYS.panel]: "rgba(255,255,255,0.03)",
        [THEME_VAR_KEYS.border]: hexToRgba(border, 0.35),
        [THEME_VAR_KEYS.text]: hexToRgba(text, 0.92),
        [THEME_VAR_KEYS.muted]: hexToRgba(muted, 0.68),
        [THEME_VAR_KEYS.accent]: accent,
        [THEME_VAR_KEYS.accent2]: accent2,
        [THEME_VAR_KEYS.danger]: danger,
        [THEME_VAR_KEYS.success]: success,
      },
      terminal: {
        background: bg,
        foreground: text,
        cursor: accent,
        selection: hexToRgba(accent, 0.18),
        ansi,
      },
    };
  }

  function themeEditorFillUI(theme) {
    if (!theme) return;
    ensureAnsiGrid();
    const vars = theme.vars || {};
    const term = theme.terminal || {};
    document.getElementById("teId").value = theme.id || "";
    document.getElementById("teName").value = theme.name || "";
    document.getElementById("teGroup").value = theme.group || "";
    document.getElementById("teBg").value = vars["--rw-bg"] || term.background || "#070818";
    document.getElementById("teAccent").value = vars["--rw-accent"] || "#2de2e6";
    document.getElementById("teAccent2").value = vars["--rw-accent2"] || "#b57bff";
    document.getElementById("teText").value = term.foreground || "#f7f2ff";
    document.getElementById("teMuted").value = "#bfbfd0";
    document.getElementById("teBorder").value = "#2a2a33";
    document.getElementById("teDanger").value = vars["--rw-danger"] || "#ff4d6d";
    document.getElementById("teSuccess").value = vars["--rw-success"] || "#3cffb5";
    const ansi = Array.isArray(term.ansi) && term.ansi.length === 16 ? term.ansi : Array(16).fill("#000000");
    for (let i = 0; i < 16; i += 1) {
      const el = document.getElementById(`teAnsi${i}`);
      if (el) el.value = ansi[i];
    }
  }

  async function renderThemeGrid() {
    const grid = document.getElementById("themeGrid");
    if (!grid) return;
    await loadThemeState();
    const themes = themeRegistry?.themes || [];
    grid.innerHTML = renderThemeTiles(themes, activeThemeId);
    grid.querySelectorAll(".theme-tile").forEach((el) => {
      el.addEventListener("click", async () => {
        const id = el.getAttribute("data-theme");
        if (!id) return;
        await applyThemeById(id);
        const theme = findThemeById(id);
        themeEditorFillUI(theme);
        await renderThemeGrid();
      });
    });
    const active = findThemeById(activeThemeId) || themes[0];
    if (active) themeEditorFillUI(active);
  }

  async function themeEditorApplyPreview() {
    const theme = themeEditorReadFromUI();
    applyThemeSpec(theme);
  }

  async function themeEditorSave() {
    const theme = themeEditorReadFromUI();
    if (!theme.id || !theme.name) {
      toast("Theme ID + Name required");
      return;
    }
    const res = await window.rina?.themesCustomUpsert?.(theme);
    if (!res?.ok) {
      toast(res?.error || "Failed to save theme");
      return;
    }
    await loadThemeState();
    await applyThemeById(theme.id);
    await renderThemeGrid();
    toast("Custom theme saved");
  }

  async function themeEditorDelete() {
    const id = (document.getElementById("teId")?.value || "").trim();
    if (!id) return;
    const ok = confirm(`Delete custom theme "${id}"?`);
    if (!ok) return;
    await window.rina?.themesCustomDelete?.(id);
    await loadThemeState();
    if (!findThemeById(activeThemeId)) {
      const fallback = themeRegistry?.themes?.[0]?.id || "mermaid-teal";
      await applyThemeById(fallback);
    }
    await renderThemeGrid();
    toast("Custom theme deleted");
  }

  function themeEditorExport() {
    const theme = themeEditorReadFromUI();
    const out = document.getElementById("teJson");
    if (out) out.value = JSON.stringify(theme, null, 2);
  }

  async function themeEditorImport() {
    const src = (document.getElementById("teJson")?.value || "").trim();
    if (!src) return;
    let parsed;
    try {
      parsed = JSON.parse(src);
    } catch {
      toast("Invalid JSON");
      return;
    }
    themeEditorFillUI(parsed);
    await themeEditorApplyPreview();
  }

  function themeEditorClear() {
    const out = document.getElementById("teJson");
    if (out) out.value = "";
  }

  window.RinaWarpThemeEditorController = {
    ensureAnsiGrid,
    readFromUI: themeEditorReadFromUI,
    fillUI: themeEditorFillUI,
    renderGrid: renderThemeGrid,
    applyPreview: themeEditorApplyPreview,
    save: themeEditorSave,
    deleteTheme: themeEditorDelete,
    exportTheme: themeEditorExport,
    importTheme: themeEditorImport,
    clear: themeEditorClear,
  };
  Object.assign(window, window.RinaWarpThemeEditorController);
})();
