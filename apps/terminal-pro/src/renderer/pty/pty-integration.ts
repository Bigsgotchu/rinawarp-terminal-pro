export function sendPtyCommand(_cmd: string): void {
  console.warn('[ui] legacy PTY integration is disabled; use renderer.prod.ts')
}

;(window as any).RINAWARP_READY = true
