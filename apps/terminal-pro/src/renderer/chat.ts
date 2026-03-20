export function initChat(): void {
  console.warn('[ui] legacy chat.ts entry is disabled; use renderer.prod.ts')
}

if (typeof window !== 'undefined') {
  ;(window as unknown as { RINAWARP_READY?: boolean }).RINAWARP_READY = true
}
