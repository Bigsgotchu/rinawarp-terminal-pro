type ThemeSpec = {
  id: string;
  name: string;
  group?: string;
  vars: Record<string, string>;
};

type ThemeRegistry = { themes: ThemeSpec[] };
type ThemeGetResp = { id: string };

type ThemeApi = {
  themesList?: () => Promise<ThemeRegistry>;
  themesGet?: () => Promise<ThemeGetResp>;
  themesSet?: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

const RECENTS_KEY = "rinawarp.theme.recents.v1";
const QUICK_PICKS = ["mermaid-teal", "dracula-plus", "cyberpunk-neon", "ocean-babyblue", "obsidian-black"];

function getRina(): ThemeApi | null {
  return ((window as unknown as { rina?: ThemeApi }).rina || null) as ThemeApi | null;
}

function applyThemeVars(vars: Record<string, string>): void {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars || {})) {
    if (!k.startsWith("--rw-")) continue;
    root.style.setProperty(k, String(v));
  }
}

function byGroup(themes: ThemeSpec[]): Array<{ group: string; themes: ThemeSpec[] }> {
  const map = new Map<string, ThemeSpec[]>();
  for (const t of themes) {
    const g = (t.group || "Other").trim() || "Other";
    map.set(g, [...(map.get(g) || []), t]);
  }
  return Array.from(map.entries())
    .map(([group, list]) => ({ group, themes: list.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function hexToRgb(input: string): { r: number; g: number; b: number } | null {
  const s = String(input || "").trim();
  const m = s.match(/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const v = parseInt(h, 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function srgbToLinear(v: number): number {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(c: { r: number; g: number; b: number }): number {
  const r = srgbToLinear(c.r);
  const g = srgbToLinear(c.g);
  const b = srgbToLinear(c.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function scoreTheme(theme: ThemeSpec): number {
  const bg = hexToRgb(theme.vars?.["--rw-bg"] || "");
  const accent = hexToRgb(theme.vars?.["--rw-accent"] || "");
  if (!bg || !accent) return 0;
  return clamp01((contrastRatio(bg, accent) - 2.5) / 8.5);
}

function qualityLabel(score: number): string {
  if (score >= 0.72) return "High contrast";
  if (score >= 0.5) return "Balanced";
  return "Low contrast";
}

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

function writeRecent(id: string): void {
  const cur = readRecents().filter((x) => x !== id);
  cur.unshift(id);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(cur.slice(0, 12)));
  } catch {
    // ignore
  }
}

function section(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<div class="rw-group"><div class="rw-group-title">${title}</div>${body}</div>`;
}

// eslint-disable-next-line complexity
function renderThemeCard(t: ThemeSpec, activeId: string): string {
  const active = t.id === activeId;
  const bg = t.vars?.["--rw-bg"] || "#111";
  const panel = t.vars?.["--rw-panel"] || "rgba(255,255,255,0.08)";
  const text = t.vars?.["--rw-text"] || "#fff";
  const accent = t.vars?.["--rw-accent"] || "#5eead4";
  const accent2 = t.vars?.["--rw-accent2"] || accent;
  const quality = qualityLabel(scoreTheme(t));
  return `
    <button type="button" class="rw-theme ${active ? "rw-theme-active" : ""}" data-theme-id="${t.id}">
      <div class="rw-theme-top">
        <div class="rw-theme-name">${t.name}</div>
        <div class="rw-theme-id">${t.id}</div>
      </div>
      <div class="rw-theme-preview" style="background:${bg}; border-color:${accent}66;">
        <div class="rw-theme-preview-head" style="background:${panel};">
          <span class="rw-swatch" style="background:${accent}"></span>
          <span class="rw-swatch" style="background:${accent2}"></span>
        </div>
        <div class="rw-theme-preview-line" style="background:${text}33;"></div>
        <div class="rw-theme-preview-line short" style="background:${accent}55;"></div>
      </div>
      <div class="rw-theme-meta">
        <span class="rw-badge">${t.group || "Other"}</span>
        <span class="rw-badge rw-badge-contrast">${quality}</span>
      </div>
    </button>
  `;
}

// eslint-disable-next-line complexity
export async function mountThemesPanel(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>Themes</h2>
      <p class="rw-sub">Premium palettes with quick picks, recents, and contrast labels.</p>
    </div>
    <div class="rw-card rw-flex rw-gap">
      <div class="rw-row rw-space">
        <div class="rw-muted">Current theme</div>
        <div id="rw-theme-current" class="rw-pill">—</div>
      </div>
      <div class="rw-theme-toolbar">
        <input id="rw-theme-search" class="rw-input" placeholder="Search themes…" />
        <select id="rw-theme-group" class="rw-input">
          <option value="">All groups</option>
        </select>
        <button type="button" id="rw-theme-random" class="rw-btn rw-btn-ghost">Surprise me</button>
      </div>
      <div id="rw-theme-list" class="rw-theme-list"></div>
    </div>
  `;

  const rina = getRina();
  const listEl = container.querySelector<HTMLElement>("#rw-theme-list");
  const currentEl = container.querySelector<HTMLElement>("#rw-theme-current");
  const searchEl = container.querySelector<HTMLInputElement>("#rw-theme-search");
  const groupEl = container.querySelector<HTMLSelectElement>("#rw-theme-group");
  const randomEl = container.querySelector<HTMLButtonElement>("#rw-theme-random");
  if (!listEl || !currentEl || !searchEl || !groupEl || !randomEl) return;

  if (!rina?.themesList || !rina?.themesGet || !rina?.themesSet) {
    listEl.innerHTML = `<div class="rw-warn">Themes API not available. Check preload bridge.</div>`;
    return;
  }

  const reg = await rina.themesList();
  const selected = await rina.themesGet();
  const allThemes = (reg?.themes || []).slice();
  const themeById = new Map(allThemes.map((t) => [t.id, t]));

  const groups = Array.from(new Set(allThemes.map((t) => (t.group || "Other").trim() || "Other"))).sort((a, b) =>
    a.localeCompare(b),
  );
  groupEl.innerHTML = `<option value="">All groups</option>${groups.map((g) => `<option value="${g}">${g}</option>`).join("")}`;

  const setCurrentLabel = () => {
    const t = themeById.get(selected.id);
    currentEl.textContent = t ? `${t.name} (${qualityLabel(scoreTheme(t))})` : selected.id || "—";
  };

  const render = () => {
    const q = searchEl.value.trim().toLowerCase();
    const g = groupEl.value.trim();
    const visible = allThemes.filter((t) => {
      const txt = `${t.name} ${t.id} ${t.group || ""}`.toLowerCase();
      const qOk = !q || txt.includes(q);
      const gOk = !g || (t.group || "Other") === g;
      return qOk && gOk;
    });
    const quick = visible.filter((t) => QUICK_PICKS.includes(t.id));
    const recents = readRecents()
      .map((id) => themeById.get(id))
      .filter((t): t is ThemeSpec => !!t)
      .filter((t) => visible.some((x) => x.id === t.id))
      .slice(0, 6);
    const grouped = byGroup(visible);

    const quickGrid = quick.length ? `<div class="rw-grid">${quick.map((t) => renderThemeCard(t, selected.id)).join("")}</div>` : "";
    const recentGrid = recents.length ? `<div class="rw-grid">${recents.map((t) => renderThemeCard(t, selected.id)).join("")}</div>` : "";
    const groupsHtml = grouped
      .map((entry) =>
        section(
          entry.group,
          `<div class="rw-grid">${entry.themes.map((t) => renderThemeCard(t, selected.id)).join("")}</div>`,
        ),
      )
      .join("");

    listEl.innerHTML = `${section("Quick Picks", quickGrid)}${section("Recent", recentGrid)}${groupsHtml}`;
  };

  const applyById = async (id: string) => {
    const t = themeById.get(id);
    if (!t) return;
    const okResp = await rina.themesSet?.(id);
    if (!okResp?.ok) return;
    selected.id = id;
    writeRecent(id);
    setCurrentLabel();
    render();
    applyThemeVars(t.vars);
  };

  setCurrentLabel();
  render();

  searchEl.addEventListener("input", () => render());
  groupEl.addEventListener("change", () => render());
  randomEl.addEventListener("click", async () => {
    const candidates = allThemes.filter((t) => t.id !== selected.id);
    if (!candidates.length) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    await applyById(pick.id);
  });

  listEl.addEventListener("click", async (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLElement>("[data-theme-id]");
    if (!btn) return;
    const id = String(btn.getAttribute("data-theme-id") || "").trim();
    if (!id) return;
    await applyById(id);
  });
}
