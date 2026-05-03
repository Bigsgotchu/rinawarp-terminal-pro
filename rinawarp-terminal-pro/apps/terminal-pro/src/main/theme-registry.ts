export type ThemeSpec = {
  id: string;
  name: string;
  group?: string;
  vars: Record<string, string>;
  terminal?: {
    background: string;
    foreground: string;
    cursor?: string;
    selection?: string;
    ansi: string[];
  };
};

export type ThemeRegistry = { themes: ThemeSpec[] };

const ALLOWED_THEME_VAR_KEYS = new Set([
  "--rw-bg",
  "--rw-panel",
  "--rw-border",
  "--rw-text",
  "--rw-muted",
  "--rw-accent",
  "--rw-accent2",
  "--rw-danger",
  "--rw-success",
]);

export function createThemeRegistryRuntime(deps: {
  customThemesFile: () => string;
  themeSelectionFile: () => string;
  readJsonIfExists: <T>(file: string) => T | null;
  writeJsonFile: (file: string, data: unknown) => void;
  resolveResourcePath: (relPath: string, devBase: "repo" | "app") => string;
  warnIfUnexpectedPackagedResource: (resourceName: string, resolvedPath: string) => void;
  setLastLoadedThemePath: (path: string | null) => void;
}) {
  const {
    customThemesFile,
    themeSelectionFile,
    readJsonIfExists,
    writeJsonFile,
    resolveResourcePath,
    warnIfUnexpectedPackagedResource,
    setLastLoadedThemePath,
  } = deps;

function fallbackThemeRegistry(): ThemeRegistry {
  return {
    themes: [
      {
        id: "mermaid-teal",
        name: "Mermaid - Teal",
        group: "Mermaid",
        vars: {
          "--rw-bg": "#061013",
          "--rw-panel": "rgba(255,255,255,0.03)",
          "--rw-border": "rgba(255,255,255,0.10)",
          "--rw-text": "rgba(255,255,255,0.92)",
          "--rw-muted": "rgba(255,255,255,0.68)",
          "--rw-accent": "#2de2e6",
          "--rw-accent2": "#7af3f5",
          "--rw-danger": "#ff4d6d",
          "--rw-success": "#3cffb5",
        },
        terminal: {
          background: "#061013",
          foreground: "#eaffff",
          cursor: "#2de2e6",
          selection: "rgba(45, 226, 230, 0.18)",
          ansi: [
            "#07161a",
            "#ff4d6d",
            "#3cffb5",
            "#ffd166",
            "#61a0ff",
            "#b57bff",
            "#2de2e6",
            "#eaffff",
            "#23454f",
            "#ff7aa2",
            "#7bffd9",
            "#ffe199",
            "#92c0ff",
            "#d3a8ff",
            "#7af3f5",
            "#ffffff",
          ],
        },
      },
      {
        id: "unicorn",
        name: "Unicorn",
        group: "Fantasy",
        vars: {
          "--rw-bg": "#070614",
          "--rw-panel": "rgba(255,255,255,0.035)",
          "--rw-border": "rgba(255,255,255,0.11)",
          "--rw-text": "rgba(255,255,255,0.93)",
          "--rw-muted": "rgba(255,255,255,0.70)",
          "--rw-accent": "#b57bff",
          "--rw-accent2": "#ff3bbf",
          "--rw-danger": "#ff4d6d",
          "--rw-success": "#3cffb5",
        },
        terminal: {
          background: "#070614",
          foreground: "#f7e9ff",
          cursor: "#ff3bbf",
          selection: "rgba(181, 123, 255, 0.20)",
          ansi: [
            "#12102a",
            "#ff4d6d",
            "#3cffb5",
            "#ffd166",
            "#61a0ff",
            "#b57bff",
            "#ff3bbf",
            "#f7e9ff",
            "#3b2a4a",
            "#ff7aa2",
            "#7bffd9",
            "#ffe199",
            "#92c0ff",
            "#d3a8ff",
            "#ff7ad9",
            "#ffffff",
          ],
        },
      },
    ],
  };
}

function loadBaseThemeRegistry(): ThemeRegistry {
  const file = resolveResourcePath("themes/themes.json", "app");
  warnIfUnexpectedPackagedResource("theme registry", file);
  const parsed = readJsonIfExists<ThemeRegistry>(file);
  if (parsed?.themes?.length) {
    setLastLoadedThemePath(file);
    return parsed;
  }
  setLastLoadedThemePath(null);
  return fallbackThemeRegistry();
}

function loadCustomThemeRegistry(): ThemeRegistry {
  return readJsonIfExists<ThemeRegistry>(customThemesFile()) ?? { themes: [] };
}

function loadThemeRegistryMerged(): ThemeRegistry {
  const base = loadBaseThemeRegistry();
  const custom = loadCustomThemeRegistry();
  const map = new Map<string, ThemeSpec>();
  for (const t of base.themes || []) map.set(t.id, t);
  for (const t of custom.themes || []) map.set(t.id, t);
  return { themes: Array.from(map.values()) };
}

function loadSelectedThemeId(): string {
  const data = readJsonIfExists<{ id?: string }>(themeSelectionFile());
  return data?.id || "mermaid-teal";
}

function saveSelectedThemeId(id: string) {
  writeJsonFile(themeSelectionFile(), { id });
}

function validateTheme(theme: ThemeSpec): { ok: boolean; error?: string } {
  if (!theme?.id || !/^[a-z0-9-]{3,64}$/i.test(theme.id)) return { ok: false, error: "Invalid id" };
  if (!theme?.name || theme.name.length < 2) return { ok: false, error: "Invalid name" };
  if (!theme?.vars || typeof theme.vars !== "object") return { ok: false, error: "Missing vars" };
  for (const key of Object.keys(theme.vars)) {
    if (!ALLOWED_THEME_VAR_KEYS.has(key)) return { ok: false, error: `Disallowed var: ${key}` };
    if (typeof theme.vars[key] !== "string") return { ok: false, error: `Var not string: ${key}` };
  }
  if (theme.terminal) {
    if (!theme.terminal.background || !theme.terminal.foreground) {
      return { ok: false, error: "Terminal bg/fg required" };
    }
    if (!Array.isArray(theme.terminal.ansi) || theme.terminal.ansi.length !== 16) {
      return { ok: false, error: "Terminal ansi must have 16 colors" };
    }
  }
  return { ok: true };
}

  return {
    loadThemeRegistryMerged,
    loadSelectedThemeId,
    saveSelectedThemeId,
    loadCustomThemeRegistry,
    validateTheme,
  };
}
