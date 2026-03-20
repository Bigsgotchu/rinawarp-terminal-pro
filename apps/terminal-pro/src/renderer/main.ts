export {}

// Legacy alternate renderer entrypoint intentionally left inert.
// The canonical desktop shell is src/renderer.html -> renderer.prod.ts.
if (typeof window !== 'undefined') {
  console.warn('[ui] legacy renderer entry is disabled; use renderer.prod.ts')
}
