export function mountGeneralPanel(container: HTMLElement): void {
  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>General</h2>
      <p class="rw-sub">App behavior and defaults.</p>
    </div>
    <div class="rw-card">
      <div class="rw-row">
        <div>
          <div class="rw-label">Keyboard shortcuts</div>
          <div class="rw-muted">Open Settings: Ctrl/⌘ + ,</div>
        </div>
      </div>
      <div class="rw-row">
        <div>
          <div class="rw-label">Safety mode</div>
          <div class="rw-muted">High-impact commands require explicit confirmation.</div>
        </div>
      </div>
    </div>
  `
}
