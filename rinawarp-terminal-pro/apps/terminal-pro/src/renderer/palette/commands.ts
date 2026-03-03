/**
 * Palette commands registry - builds the list of available commands.
 */

import type { PaletteCommand } from "./model.js";

// Re-export SettingsTabId to avoid circular dependency
type SettingsTabId = "general" | "license" | "themes" | "diagnostics" | "about";

declare global {
  interface Window {
    __rinaSettings?: {
      open: (tabId?: SettingsTabId) => void;
      close: () => void;
      isOpen: () => boolean;
    };
  }
}

type ThemeSpec = { id: string; name: string; group?: string };

function safeRina(): Window["rina"] | null {
  return (window as any).rina ?? null;
}

function openSettings(tabId?: SettingsTabId): void {
  const api = window.__rinaSettings;
  if (api?.open) api.open(tabId);
}

async function listThemes(): Promise<ThemeSpec[]> {
  const rina = safeRina();
  if (!rina?.themesList) return [];
  const reg = await rina.themesList();
  const themes = Array.isArray(reg?.themes) ? reg.themes : [];
  return themes
    .filter((t: any) => t && typeof t.id === "string" && typeof t.name === "string")
    .map((t: any) => ({ id: t.id, name: t.name, group: t.group }));
}

async function setTheme(id: string): Promise<void> {
  const rina = safeRina();
  if (!rina?.themesSet) return;
  await rina.themesSet(id);
}

function buildBaseCommands(): PaletteCommand[] {
  return [
    {
      id: "settings.open",
      title: "Open Settings",
      subtitle: "General / License / Themes / Diagnostics / About",
      icon: "⚙️",
      keywords: ["preferences", "settings", "options"],
      run: async () => openSettings(),
    },
    {
      id: "settings.open.license",
      title: "Open Settings → License",
      icon: "🔑",
      keywords: ["license", "subscription", "purchase", "restore"],
      run: async () => openSettings("license"),
    },
    {
      id: "settings.open.themes",
      title: "Open Settings → Themes",
      icon: "🎨",
      keywords: ["theme", "appearance", "colors"],
      run: async () => openSettings("themes"),
    },
    {
      id: "settings.open.diagnostics",
      title: "Open Settings → Diagnostics",
      icon: "🧪",
      keywords: ["diagnostics", "paths", "support"],
      run: async () => openSettings("diagnostics"),
    },
    {
      id: "support.bundle",
      title: "Create Support Bundle",
      subtitle: "Diagnostics + redacted transcript + renderer errors",
      icon: "📦",
      keywords: ["bundle", "zip", "support"],
      run: async () => {
        const rina = safeRina();
        if (rina?.supportBundle) await rina.supportBundle();
      },
    },
    {
      id: "devtools.toggle",
      title: "Toggle DevTools",
      subtitle: "Dev / debugging",
      icon: "🛠️",
      keywords: ["devtools", "inspect", "debug"],
      run: async () => {
        const rina = safeRina();
        if (rina?.toggleDevtools) await rina.toggleDevtools();
      },
    },
  ];
}

function buildThemeCommands(themes: ThemeSpec[]): PaletteCommand[] {
  return themes.map((t) => ({
    id: `theme.set.${t.id}`,
    title: `Switch Theme → ${t.name}`,
    subtitle: t.group ? `Group: ${t.group}` : undefined,
    meta: t.id,
    icon: "🎨",
    keywords: ["theme", "appearance", t.name, t.group ?? "", t.id],
    run: async () => {
      await setTheme(t.id);
      openSettings("themes");
    },
  }));
}

export async function buildDefaultCommands(): Promise<PaletteCommand[]> {
  const base = buildBaseCommands();
  const themes = await listThemes();
  const themeCommands = buildThemeCommands(themes);

  // E2E-only command for testing Enter no double-fire
  const e2eCommands: PaletteCommand[] = [];
  const envFlag =
    typeof process !== "undefined" &&
    typeof process.env === "object" &&
    !!process.env?.RINAWARP_E2E;
  if ((window as any).RINAWARP_E2E || envFlag) {
    e2eCommands.push({
      id: "e2e.increment",
      title: "E2E: Increment Counter",
      icon: "🧪",
      keywords: ["e2e", "test"],
      run: async () => {
        const w = window as any;
        w.__e2eExecCount = (w.__e2eExecCount ?? 0) + 1;
      },
    });
  }

  return [...base, ...themeCommands, ...e2eCommands];
}
