/**
 * Research Settings Panel
 * Web/docs grounding for agent flows with allowlist + citation support.
 * API: /v1/platform/research/*
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

function renderStatus(status: any): string {
  if (!status) {
    return `<div class="rw-muted">No research status. Click refresh to fetch.</div>`
  }

  const enabled = status.enabled ?? false
  const allowedDomains = status.allowedDomains || []
  const maxSizeBytes = status.maxSizeBytes || 0
  const maxTimeoutMs = status.maxTimeoutMs || 0
  const fetchCount = status.totalFetches || 0
  const successCount = status.successfulFetches || 0
  const blockedCount = status.blockedFetches || 0

  const domainList = allowedDomains.length
    ? allowedDomains.map((d: string) => `<span class="rw-tag">${esc(d)}</span>`).join(' ')
    : `<span class="rw-muted">No domains configured</span>`

  return `
    <div class="rw-panel-section">
      <h3>Research Status</h3>
      <div class="rw-kv"><div class="rw-k">Enabled</div><div class="rw-v"><span class="rw-badge ${enabled ? 'rw-ok' : 'rw-muted'}">${enabled ? 'Active' : 'Disabled'}</span></div></div>
      <div class="rw-kv"><div class="rw-k">Total Fetches</div><div class="rw-v">${fetchCount}</div></div>
      <div class="rw-kv"><div class="rw-k">Successful</div><div class="rw-v rw-ok">${successCount}</div></div>
      <div class="rw-kv"><div class="rw-k">Blocked</div><div class="rw-v rw-warn">${blockedCount}</div></div>
    </div>

    <div class="rw-panel-section">
      <h3>Current Policy</h3>
      <div class="rw-kv"><div class="rw-k">Max Response Size</div><div class="rw-v">${(maxSizeBytes / 1024 / 1024).toFixed(1)} MB</div></div>
      <div class="rw-kv"><div class="rw-k">Max Timeout</div><div class="rw-v">${(maxTimeoutMs / 1000).toFixed(1)}s</div></div>
      <div class="rw-kv"><div class="rw-k">Allowed Domains</div><div class="rw-v">${domainList}</div></div>
    </div>
  `
}

function renderConfig(config: any): string {
  const enabled = config?.enabled ?? true
  const allowedDomains = config?.allowedDomains || []
  const maxSizeMb = (config?.maxSizeBytes || 10 * 1024 * 1024) / (1024 * 1024)
  const maxTimeoutSec = (config?.maxTimeoutMs || 30000) / 1000

  const domainInput = allowedDomains.join(', ')

  return `
    <div class="rw-panel-section">
      <h3>Research Fetching</h3>
      <div class="rw-kv"><div class="rw-k">Enable Web Fetch</div><div class="rw-v"><input type="checkbox" id="rw-research-enabled" ${enabled ? 'checked' : ''}></div></div>
      <p class="rw-sub">When enabled, agents can fetch web pages and docs from allowed domains.</p>
    </div>

    <div class="rw-panel-section">
      <h3>Allowed Domains</h3>
      <div class="rw-textarea-wrap">
        <textarea id="rw-research-domains" class="rw-textarea" rows="4" placeholder="example.com, docs.example.com, wiki.example.org">${esc(domainInput)}</textarea>
      </div>
      <p class="rw-sub">Comma-separated list of allowed domains. Use * for wildcards (e.g., *.example.com).</p>
    </div>

    <div class="rw-panel-section">
      <h3>Limits</h3>
      <div class="rw-kv"><div class="rw-k">Max Response Size</div><div class="rw-v"><input type="number" id="rw-research-max-size" value="${maxSizeMb}" min="1" max="100" class="rw-input"> MB</div></div>
      <div class="rw-kv"><div class="rw-k">Max Timeout</div><div class="rw-v"><input type="number" id="rw-research-max-timeout" value="${maxTimeoutSec}" min="5" max="300" class="rw-input"> sec</div></div>
    </div>

    <div class="rw-panel-section">
      <h3>Test Fetch</h3>
      <div class="rw-kv"><div class="rw-k">URL</div><div class="rw-v"><input type="text" id="rw-research-test-url" class="rw-input" placeholder="https://example.com/docs"></div></div>
      <button id="rw-research-test-fetch" class="rw-btn rw-btn-ghost">Test Fetch</button>
      <div id="rw-research-test-result" class="rw-muted"></div>
    </div>
  `
}

export async function mountResearchPanel(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="rw-panel-head">
      <h2>Web / Docs Grounding</h2>
      <p class="rw-sub">Configure web and documentation fetching for agent flows. Agents can fetch content from allowlisted domains and attach citations to run reports.</p>
    </div>

    <div class="rw-card">
      <div class="rw-row rw-gap">
        <button id="rw-research-refresh" class="rw-btn">Refresh Status</button>
        <button id="rw-research-save" class="rw-btn rw-btn-primary">Save Config</button>
        <div id="rw-research-status" class="rw-muted"></div>
      </div>

      <div id="rw-research-config"></div>
      <div id="rw-research-status-display"></div>
    </div>

    <div class="rw-card">
      <h3>How It Works</h3>
      <div class="rw-prose">
        <p>Web/Docs grounding enables agents to fetch and cite external content:</p>
        <ul>
          <li><strong>Allowed Domains</strong>: Restrict fetching to trusted domains only</li>
          <li><strong>Size Limits</strong>: Prevent large responses from slowing down agents</li>
          <li><strong>Timeout Controls</strong>: Ensure fetch operations don't hang indefinitely</li>
          <li><strong>Citations</strong>: Fetched content is automatically cited in run reports</li>
        </ul>
        <p>Safety features prevent fetching from untrusted or excessive sources.</p>
      </div>
    </div>
  `

  const rina = getRina()
  const refreshBtn = container.querySelector<HTMLButtonElement>('#rw-research-refresh')
  const saveBtn = container.querySelector<HTMLButtonElement>('#rw-research-save')
  const testFetchBtn = container.querySelector<HTMLButtonElement>('#rw-research-test-fetch')
  const statusEl = container.querySelector<HTMLElement>('#rw-research-status')
  const configEl = container.querySelector<HTMLElement>('#rw-research-config')
  const statusDisplayEl = container.querySelector<HTMLElement>('#rw-research-status-display')
  const testResultEl = container.querySelector<HTMLElement>('#rw-research-test-result')

  if (!refreshBtn || !saveBtn || !testFetchBtn || !statusEl || !configEl || !statusDisplayEl || !testResultEl) {
    return
  }

  let currentStatus: any = null
  let currentConfig: any = null

  const loadStatus = async () => {
    statusEl.textContent = 'Loading...'
    try {
      if (rina?.researchStatus) {
        currentStatus = await rina.researchStatus()
      } else {
        currentStatus = (await rina?.api?.get?.('/v1/platform/research/status')) || null
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
      if (rina?.researchConfig) {
        currentConfig = await rina.researchConfig()
      } else {
        currentConfig = (await rina?.api?.get?.('/v1/platform/research/config')) || {
          enabled: true,
          allowedDomains: [],
          maxSizeBytes: 10485760,
          maxTimeoutMs: 30000,
        }
      }
      configEl.innerHTML = renderConfig(currentConfig)
    } catch (e) {
      configEl.innerHTML = renderConfig({
        enabled: true,
        allowedDomains: [],
        maxSizeBytes: 10485760,
        maxTimeoutMs: 30000,
      })
    }
  }

  const saveConfig = async () => {
    statusEl.textContent = 'Saving...'
    const enabledEl = container.querySelector<HTMLInputElement>('#rw-research-enabled')
    const domainsEl = container.querySelector<HTMLTextAreaElement>('#rw-research-domains')
    const maxSizeEl = container.querySelector<HTMLInputElement>('#rw-research-max-size')
    const maxTimeoutEl = container.querySelector<HTMLInputElement>('#rw-research-max-timeout')

    const domainsText = domainsEl?.value || ''
    const domains = domainsText
      .split(',')
      .map((d) => d.trim())
      .filter((d) => d.length > 0)

    const config = {
      enabled: enabledEl?.checked ?? true,
      allowedDomains: domains,
      maxSizeBytes: parseFloat(maxSizeEl?.value || '10') * 1024 * 1024,
      maxTimeoutMs: parseInt(maxTimeoutEl?.value || '30', 10) * 1000,
    }

    try {
      if (rina?.setResearchConfig) {
        await rina.setResearchConfig(config)
      } else {
        ;(await rina?.api?.put?.('/v1/platform/research/config', config)) || { ok: true }
      }
      currentConfig = config
      statusEl.textContent = 'Config saved.'
    } catch (e) {
      statusEl.textContent = `Save failed: ${String(e)}`
    }
  }

  const testFetch = async () => {
    const urlEl = container.querySelector<HTMLInputElement>('#rw-research-test-url')
    const url = urlEl?.value?.trim()
    if (!url) {
      testResultEl.textContent = 'Please enter a URL to test.'
      return
    }

    testResultEl.textContent = 'Fetching...'
    testFetchBtn.disabled = true

    try {
      let result
      if (rina?.researchFetch) {
        result = await rina.researchFetch({ url })
      } else {
        result = (await rina?.api?.post?.('/v1/platform/research/fetch', { url })) || {
          ok: false,
          error: 'API not available',
        }
      }

      if (result?.ok) {
        const size = result.content?.length || 0
        testResultEl.innerHTML = `<span class="rw-ok">✓ Fetched ${size} bytes from ${esc(url)}</span>`
      } else {
        testResultEl.innerHTML = `<span class="rw-warn">✗ Failed: ${esc(result?.error || 'Unknown error')}</span>`
      }
    } catch (e) {
      testResultEl.innerHTML = `<span class="rw-warn">✗ Error: ${String(e)}</span>`
    } finally {
      testFetchBtn.disabled = false
    }
  }

  refreshBtn.addEventListener('click', () => void loadStatus())
  saveBtn.addEventListener('click', () => void saveConfig())
  testFetchBtn.addEventListener('click', () => void testFetch())

  // Initial load
  await loadConfig()
  await loadStatus()
}
