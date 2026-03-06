/**
 * Palette commands registry - builds the list of available commands.
 */

import type { PaletteCommand } from "./model.js";

// Re-export SettingsTabId to avoid circular dependency
type SettingsTabId = "general" | "license" | "themes" | "diagnostics" | "about" | "retrieval" | "research" | "updates";

declare global {
  interface Window {
    addBlock?: (block: any) => void;
    newId?: (prefix: string) => string;
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

function emitInfoBlock(title: string, markdown: string): void {
  const add = (window as any).addBlock;
  const newId = (window as any).newId;
  if (typeof add !== "function" || typeof newId !== "function") return;
  add({
    id: newId("assistant"),
    type: "assistant",
    status: "ok",
    createdAt: Date.now(),
    title,
    markdown,
  });
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

function buildOpsCommands(): PaletteCommand[] {
  return [
    {
      id: "ops.importHistory",
      title: "Import Shell History",
      subtitle: "Load recent shell commands into local history",
      icon: "🧾",
      keywords: ["history", "shell", "commands", "import"],
      run: async () => {
        const rina = safeRina();
        if (!rina?.importShellHistory) return;
        const res = await rina.importShellHistory(500);
        const imported = Number(res?.imported || (Array.isArray(res?.commands) ? res.commands.length : 0));
        emitInfoBlock("Rina — Shell History Import", `Imported ${imported} command(s).`);
      },
    },
    {
      id: "ops.teamSnapshot",
      title: "Team Snapshot",
      subtitle: "Summarize current team roles",
      icon: "👥",
      keywords: ["team", "roles", "members"],
      run: async () => {
        const rina = safeRina();
        if (!rina?.teamGet) return;
        const res = await rina.teamGet();
        const members = Array.isArray(res?.members) ? res.members : [];
        const lines = members.map((m: any) => `- ${m.email || "unknown"} (${m.role || "viewer"})`);
        emitInfoBlock(
          "Rina — Team Snapshot",
          lines.length ? lines.join("\n") : "No team members configured.",
        );
      },
    },
    {
      id: "ops.agentEvalExport",
      title: "Export Agent Eval Report",
      subtitle: "Download local reliability metrics",
      icon: "📈",
      keywords: ["eval", "metrics", "success rate", "reliability"],
      run: async () => {
        const fn = (window as any).downloadAgentEvalReport;
        if (typeof fn === "function") fn();
      },
    },
  ];
}

function buildBaseCommands(): PaletteCommand[] {
  return [
    {
      id: "settings.open",
      title: "Open Settings",
      subtitle: "General / Themes / Retrieval / License / Diagnostics / About",
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
      id: "settings.open.retrieval",
      title: "Open Settings → Retrieval",
      icon: "🔍",
      keywords: ["retrieval", "index", "search", "context"],
      run: async () => openSettings("retrieval"),
    },
    {
      id: "settings.open.research",
      title: "Open Settings → Research",
      icon: "🌐",
      keywords: ["research", "web", "docs", "grounding", "fetch"],
      run: async () => openSettings("research"),
    },
    {
      id: "settings.open.updates",
      title: "Open Settings → Updates",
      icon: "🔄",
      keywords: ["updates", "upgrade", "auto-update", "trust", "verification"],
      run: async () => openSettings("updates"),
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
    ...buildOpsCommands(),
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
