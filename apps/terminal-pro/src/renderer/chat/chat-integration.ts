export {}

// Legacy chat integration intentionally disabled.
// The canonical chat-first workbench lives in renderer.prod.ts + workbench store/render.
if (typeof window !== 'undefined') {
  console.warn('[ui] legacy chat integration is disabled; use renderer.prod.ts')
}
