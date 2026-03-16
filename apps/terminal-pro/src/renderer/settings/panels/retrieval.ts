/**
 * Retrieval Settings Panel
 * Fast large-repo context retrieval with hybrid indexing.
 * API: /v1/platform/retrieval/*
 */

function getRina(): any {
  return (window as unknown as { rina: unknown }).rina
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replaceAll('&', '&')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
  if (ms < 1000) return `${ms.toFixed(1)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function renderStatus(status: any): string {
  if (!status) {
    return `<div class="rw-muted">No retrieval status. Click refresh to fetch.</div>`
  }

  const mode = status.mode || 'unknown'
  const indexedPaths = status.indexedPaths || []
  const lastIndexTime = status.lastIndexTime ? new Date(status.lastIndexTime).toLocaleString() : 'Never'
  const metrics = status.metrics || {}

  const pathRows = indexedPaths.length
    ? indexedPaths
        .map(
          (p: string) =>
            `<div class="rw-kv"><div class="rw-k">${esc(p)}</div><div class="rw-v rw-ok">indexed</div></div>`
        )
        .join('')
    : `<div class="rw-muted">No paths indexed yet.</div>`

  const latencyRow =
    metrics.p95LatencyMs != null
      ? `<div class="rw-kv"><div class="rw-k">P95 Latency</div><div class="rw-v">${fmtMs(metrics.p95LatencyMs)}</div></div>`
      : `<div class="rw-kv"><div class="rw-k">P95 Latency</div><div class="rw-muted">—</div></div>`

  const retrievalCount = metrics.totalRetrievals ?? 0
  const indexHits = metrics.indexHits ?? 0
  const fallbackHits = metrics.fallbackHits ?? 0

  return `
    <div class="rw-panel-section">
      <h3>Index Status</h3>
      <div class="rw-kv"><div class="rw-k">Mode</div><div class="rw-v"><span class="rw-badge">${esc(mode)}</span></div></div>
      <div class="rw-kv"><div class="rw-k">Last Indexed</div><div class="rw-v">${esc(lastIndexTime)}</div></div>
      <div class="rw-kv"><div class="rw-k">Indexed Paths</div><div class="rw-v">${indexedPaths.length}</div></div>
      ${pathRows}
    </div>

    <div class="rw-panel-section">
      <h3>Performance Metrics</h3>
      ${latencyRow}
      <div class="rw-kv"><div class="rw-k">Total Retrievals</div><div class="rw-v">${retrievalCount}</div></div>
      <div class="rw-kv"><div class="rw-k">Index Hits</div><div class="rw-v rw-ok">${indexHits}</div></div>
      <div class="rw-kv"><div class="rw-k">Fallback Hits</div><div class="rw-v rw-warn">${fallbackHits}</div></div>
      ${indexHits + fallbackHits > 0 ? `<div class="rw-kv"><div class="rw-k">Index Rate</div><div class="rw-v">${((indexHits / (indexHits + fallbackHits)) * 100).toFixed(1)}%</div></div>` : ''}
    </div>
  `
}

function renderConfig(config: any): string {
  const mode = config?.mode || 'hybrid'
  const maxPaths = config?.maxPaths || 10
  const p95TargetMs = config?.p95TargetMs || 500

  return `
    <div class="rw-panel-section">
      <h3>Retrieval Mode</h3>
      <div class="rw-radio-group">
        <label class="rw-radio">
          <input type="radio" name="retrievalMode" value="hybrid" ${mode === 'hybrid' ? 'checked' : ''}>
          <span>Hybrid (Index + Grep)</span>
        </label>
        <label class="rw-radio">
          <input type="radio" name="retrievalMode" value="index" ${mode === 'index' ? 'checked' : ''}>
          <span>Index Only (Fast)</span>
        </label>
        <label class="rw-radio">
          <input type="radio" name="retrievalMode" value="grep" ${mode === 'grep' ? 'checked' : ''}>
          <span>Grep Fallback (Slow, Complete)</span>
        </label>
      </div>
      <p class="rw-sub">Hybrid uses index when available, falls back to grep for unmatched patterns.</p>
    </div>

    <div class="rw-panel-section">
      <h3>Configuration</h3>
      <div class="rw-kv"><div class="rw-k">Max Indexed Paths</div><div class="rw-v"><input type="number" id="rw-retrieval-max-paths" value="${maxPaths}" min="1" max="100" class="rw-input"></div></div>
      <div class="rw-kv"><div class="rw-k">P95 Latency Target</div><div class="rw-v"><input type="number" id="rw-retrieval-p95-target" value="${p95TargetMs}" min="100" max="10000" step="100" class="rw-input"> ms</div></div>
    </div>
  `
}

export async function mountRetrievalPanel(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>Context Retrieval</h2>
      <p class="rw-sub">Fast large-repo code retrieval with hybrid indexing. Configure indexing strategy and view performance metrics.</p>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-gap">
        <button id="rw-retrieval-refresh" class="rw-btn">Refresh Status</button>
        <button id="rw-retrieval-save" class="rw-btn rw-btn-primary">Save Config</button>
        <button id="rw-retrieval-benchmark" class="rw-btn rw-btn-ghost">Run Benchmark</button>
        <div id="rw-retrieval-status" class="rw-muted"></div>
      </div>

      <div id="rw-retrieval-config"></div>
      <div id="rw-retrieval-status-display"></div>
    </div>

    <div class="rw-card">
      <h3>How It Works</h3>
      <div class="rw-prose">
        <p>RinaWarp uses hybrid indexing to provide low-latency code retrieval for large repositories:</p>
        <ul>
          <li><strong>Hybrid Mode</strong>: Uses indexed search when available, falls back to grep for complex patterns</li>
          <li><strong>Index Only</strong>: Fastest path, uses symbol + path + lexical index</li>
          <li><strong>Grep Fallback</strong>: Complete but slower, searches raw file contents</li>
        </ul>
        <p>Run benchmarks to measure P95 retrieval latency against your repositories.</p>
      </div>
    </div>
  `

  const rina = getRina()
  const refreshBtn = container.querySelector<HTMLButtonElement>('#rw-retrieval-refresh')
  const saveBtn = container.querySelector<HTMLButtonElement>('#rw-retrieval-save')
  const benchmarkBtn = container.querySelector<HTMLButtonElement>('#rw-retrieval-benchmark')
  const statusEl = container.querySelector<HTMLElement>('#rw-retrieval-status')
  const configEl = container.querySelector<HTMLElement>('#rw-retrieval-config')
  const statusDisplayEl = container.querySelector<HTMLElement>('#rw-retrieval-status-display')

  if (!refreshBtn || !saveBtn || !benchmarkBtn || !statusEl || !configEl || !statusDisplayEl) {
    return
  }

  let currentStatus: any = null
  let currentConfig: any = null

  const loadStatus = async () => {
    statusEl.textContent = 'Loading...'
    try {
      if (rina?.retrievalStatus) {
        currentStatus = await rina.retrievalStatus()
      } else {
        // Fallback: call API via IPC
        currentStatus = (await rina?.api?.get?.('/v1/platform/retrieval/status')) || null
      }
      statusDisplayEl.innerHTML = renderStatus(currentStatus)
      statusEl.textContent = currentStatus ? 'Ready.' : 'No status available.'
    } catch (e) {
      statusDisplayEl.innerHTML = renderStatus(null)
      statusEl.textContent = `Failed: ${String(e)}`
    }
  }

  const loadConfig = async () => {
    try {
      if (rina?.retrievalConfig) {
        currentConfig = await rina.retrievalConfig()
      } else {
        // Fallback: call API via IPC
        currentConfig = (await rina?.api?.get?.('/v1/platform/retrieval/config')) || {
          mode: 'hybrid',
          maxPaths: 10,
          p95TargetMs: 500,
        }
      }
      configEl.innerHTML = renderConfig(currentConfig)
    } catch (e) {
      configEl.innerHTML = renderConfig({ mode: 'hybrid', maxPaths: 10, p95TargetMs: 500 })
    }
  }

  const saveConfig = async () => {
    statusEl.textContent = 'Saving...'
    const modeEl = container.querySelector<HTMLInputElement>('input[name="retrievalMode"]:checked')
    const maxPathsEl = container.querySelector<HTMLInputElement>('#rw-retrieval-max-paths')
    const p95TargetEl = container.querySelector<HTMLInputElement>('#rw-retrieval-p95-target')

    const config = {
      mode: modeEl?.value || 'hybrid',
      maxPaths: parseInt(maxPathsEl?.value || '10', 10),
      p95TargetMs: parseInt(p95TargetEl?.value || '500', 10),
    }

    try {
      if (rina?.setRetrievalConfig) {
        await rina.setRetrievalConfig(config)
      } else {
        ;(await rina?.api?.put?.('/v1/platform/retrieval/config', config)) || { ok: true }
      }
      currentConfig = config
      statusEl.textContent = 'Config saved.'
    } catch (e) {
      statusEl.textContent = `Save failed: ${String(e)}`
    }
  }

  const runBenchmark = async () => {
    statusEl.textContent = 'Running benchmark...'
    benchmarkBtn.disabled = true
    try {
      let result
      if (rina?.runRetrievalBenchmark) {
        result = await rina.runRetrievalBenchmark()
      } else {
        result = (await rina?.api?.post?.('/v1/platform/retrieval/benchmark', {})) || { ok: true, metrics: {} }
      }
      statusEl.textContent = result?.ok ? 'Benchmark complete.' : `Benchmark failed: ${result?.error || 'unknown'}`
      await loadStatus() // Refresh metrics
    } catch (e) {
      statusEl.textContent = `Benchmark failed: ${String(e)}`
    } finally {
      benchmarkBtn.disabled = false
    }
  }

  refreshBtn.addEventListener('click', () => void loadStatus())
  saveBtn.addEventListener('click', () => void saveConfig())
  benchmarkBtn.addEventListener('click', () => void runBenchmark())

  // Initial load
  await loadConfig()
  await loadStatus()
}
