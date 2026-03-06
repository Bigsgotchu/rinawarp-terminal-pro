/**
 * Recent commands persistence for palette.
 */

const KEY = "rinawarp.palette.recent.v1";
const MAX = 25;

export function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string").slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

export function saveRecent(commandId: string): void {
  const id = String(commandId || "").trim();
  if (!id) return;
  const cur = loadRecent();
  const next = [id, ...cur.filter((x) => x !== id)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // no-op
  }
}
