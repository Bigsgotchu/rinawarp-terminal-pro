export async function trackRendererEvent(event: string, properties?: Record<string, unknown>): Promise<void> {
  const rina = window.rina as any
  try {
    await rina.trackEvent?.(event, properties)
  } catch {
    // Analytics is optional.
  }
}

export async function trackRendererBootTiming(durationMs: number, properties?: Record<string, unknown>): Promise<void> {
  await trackRendererEvent('renderer_boot_timing', {
    duration_ms: Math.max(0, Math.round(durationMs)),
    ...properties,
  })
}

export async function trackProofLatencySample(durationMs: number, properties?: Record<string, unknown>): Promise<void> {
  await trackRendererEvent('proof_latency_sampled', {
    duration_ms: Math.max(0, Math.round(durationMs)),
    ...properties,
  })
}

export async function trackRendererFunnel(
  step: 'first_run' | 'first_block',
  properties?: Record<string, unknown>
): Promise<void> {
  const rina = window.rina as any
  try {
    await rina.trackFunnelStep?.(step, properties)
  } catch {
    // Analytics is optional.
  }
}

export async function startRendererTelemetrySession(): Promise<void> {
  try {
    await window.rina.invoke('telemetry:sessionStart')
  } catch {
    // Telemetry is optional.
  }
}

export function bindRendererTelemetrySessionEnd(): () => void {
  const onBeforeUnload = async () => {
    try {
      await window.rina.invoke('telemetry:sessionEnd')
    } catch {
      // Ignore
    }
  }

  window.addEventListener('beforeunload', onBeforeUnload)
  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload)
  }
}
