(function () {
  'use strict';

  function applyCssVars(vars) {
    if (!vars) return;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  function findThemeById(id) {
    return (themeRegistry?.themes || []).find((t) => t.id === id);
  }

  async function loadThemeState() {
    try {
      themeRegistry = await window.rina?.themesList?.() || { themes: [] };
      const current = await window.rina?.themesGet?.();
      activeThemeId = current?.id || activeThemeId;
    } catch {
      themeRegistry = { themes: [] };
    }
  }

  function applyThemeSpec(theme) {
    if (!theme) return;
    applyCssVars(theme.vars);
    if (ptyTerm && theme.terminal) {
      const mapped = toXtermTheme(theme.terminal);
      if (mapped) {
        if (typeof ptyTerm.setOption === "function") {
          ptyTerm.setOption("theme", mapped);
        } else {
          ptyTerm.options.theme = mapped;
        }
      }
    }
  }

  async function applyThemeById(id) {
    const t = findThemeById(id);
    if (!t) return;
    activeThemeId = id;
    applyThemeSpec(t);
    await window.rina?.themesSet?.(id);
  }

  window.RinaWarpThemeRuntimeController = {
    applyCssVars,
    findThemeById,
    loadThemeState,
    applyThemeSpec,
    applyThemeById,
  };
})();
