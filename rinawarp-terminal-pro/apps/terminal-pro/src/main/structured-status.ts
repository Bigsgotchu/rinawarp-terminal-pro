import type { StructuredSessionStore } from "../structured-session.js";

export function withStructuredSessionWrite(
  getStore: () => StructuredSessionStore | null,
  fn: () => void,
): void {
  if (!getStore()) return;
  try {
    fn();
  } catch {
    // Shadow-write path must never break runtime execution.
  }
}

export function ensureStructuredSession(
  getStore: () => StructuredSessionStore | null,
  args: { source: string; projectRoot?: string; preferredId?: string },
): string | null {
  const store = getStore();
  if (!store) return null;
  try {
    return store.startSession(args);
  } catch {
    return null;
  }
}
