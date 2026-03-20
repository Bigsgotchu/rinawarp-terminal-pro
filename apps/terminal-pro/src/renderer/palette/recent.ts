export function loadRecent(): string[] {
  return []
}

export function saveRecent(_commandId: string): void {
  console.warn('[ui] legacy palette recents are disabled; use renderer.prod.ts')
}
