import { renderPrivacyTelemetryPanel } from './privacyTelemetrySurface.js'

function getRina(): any {
  return (window as unknown as { rina: unknown }).rina
}

export async function mountPrivacyTelemetryPanel(container: HTMLElement): Promise<void> {
  container.innerHTML = renderPrivacyTelemetryPanel(null)

  const rina = getRina()
  const statusEl = container.querySelector<HTMLElement>('#rw-telemetry-status')

  const render = async () => {
    try {
      const settings = typeof rina?.telemetryPrivacyGet === 'function' ? await rina.telemetryPrivacyGet() : null
      container.innerHTML = renderPrivacyTelemetryPanel(settings)
    } catch {
      container.innerHTML = renderPrivacyTelemetryPanel(null)
    }
    bind()
  }

  const bind = () => {
    const toggle = container.querySelector<HTMLInputElement>('#rw-telemetry-enabled')
    const status = container.querySelector<HTMLElement>('#rw-telemetry-status')
    if (!toggle || !status) return

    toggle.addEventListener('change', async () => {
      status.textContent = 'Saving...'
      try {
        if (typeof rina?.telemetryPrivacySet === 'function') {
          await rina.telemetryPrivacySet({ enabled: toggle.checked })
          status.textContent = toggle.checked ? 'Anonymous operational telemetry is on.' : 'Telemetry is off.'
        } else {
          status.textContent = 'Telemetry settings API not available.'
        }
      } catch (error) {
        status.textContent = `Save failed: ${String(error)}`
      }
    })
  }

  if (statusEl) statusEl.textContent = 'Loading...'
  await render()
}
