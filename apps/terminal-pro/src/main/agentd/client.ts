// @ts-nocheck

export function createAgentdClient(deps) {
  const { AGENTD_BASE_URL, AGENTD_AUTH_TOKEN, getLicenseToken } = deps

  function buildAgentdHeaders(opts) {
    const headers = {
      'content-type': 'application/json',
      ...(opts?.headers || {}),
    }
    if (AGENTD_AUTH_TOKEN) {
      headers.authorization = `Bearer ${AGENTD_AUTH_TOKEN}`
    }
    const licenseToken = getLicenseToken()
    if (opts?.includeLicenseToken && licenseToken) {
      headers['x-rinawarp-license-token'] = licenseToken
    }
    return headers
  }

  async function agentdJson(path, init) {
    const res = await fetch(`${AGENTD_BASE_URL}${path}`, {
      method: init.method,
      headers: buildAgentdHeaders({
        includeLicenseToken: init.includeLicenseToken,
        headers: init.headers,
      }),
      body: init.body ? JSON.stringify(init.body) : undefined,
    })
    let data = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    if (!res.ok) {
      const msg = data?.error || `${init.method} ${path} failed (${res.status})`
      throw new Error(msg)
    }
    return data
  }

  return {
    buildAgentdHeaders,
    agentdJson,
  }
}
