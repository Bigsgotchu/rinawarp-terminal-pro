import type { IpcMain } from "electron";
import type { AppContext } from "../context.js";

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

type ThemeRegistry = { themes: ThemeSpec[] };

export function registerThemesIpc(args: {
  ipcMain: IpcMain;
  ctx: AppContext;
  loadThemeRegistryMerged: () => ThemeRegistry;
  loadSelectedThemeId: () => string;
  saveSelectedThemeId: (id: string) => void;
  loadCustomThemeRegistry: () => ThemeRegistry;
  validateTheme: (theme: ThemeSpec) => { ok: boolean; error?: string };
  writeJsonFile: (p: string, value: unknown) => void;
  customThemesFile: () => string;
}) {
  args.ipcMain.handle("rina:themes:list", async () => {
    return args.loadThemeRegistryMerged();
  });

  args.ipcMain.handle("rina:themes:get", async () => {
    return { id: args.loadSelectedThemeId() };
  });

  args.ipcMain.handle("rina:themes:set", async (_event, id: string) => {
    if (typeof id !== "string" || !id.trim()) return { ok: false, error: "Invalid theme id" };
    const reg = args.loadThemeRegistryMerged();
    const found = (reg.themes || []).some((t) => t.id === id);
    if (!found) return { ok: false, error: "Theme not found" };
    args.saveSelectedThemeId(id);
    return { ok: true };
  });

  args.ipcMain.handle("rina:themes:custom:get", async () => {
    return args.loadCustomThemeRegistry();
  });

  args.ipcMain.handle("rina:themes:custom:upsert", async (_event, theme: ThemeSpec) => {
    const v = args.validateTheme(theme);
    if (!v.ok) return { ok: false, error: v.error || "Invalid theme" };
    const cur = args.loadCustomThemeRegistry();
    const map = new Map<string, ThemeSpec>((cur.themes || []).map((t) => [t.id, t]));
    map.set(theme.id, theme);
    args.writeJsonFile(args.customThemesFile(), { themes: Array.from(map.values()) });
    return { ok: true };
  });

  args.ipcMain.handle("rina:themes:custom:delete", async (_event, id: string) => {
    const cur = args.loadCustomThemeRegistry();
    args.writeJsonFile(args.customThemesFile(), { themes: (cur.themes || []).filter((t) => t.id !== id) });
    return { ok: true };
  });
}
