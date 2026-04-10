// @ts-nocheck
import { HttpAgentdClient } from '../../../../../packages/runtime-feature-agentd/dist/index.js'

export function createAgentdClient(deps) {
  const { AGENTD_BASE_URL, AGENTD_AUTH_TOKEN, getLicenseToken } = deps

  const client = new HttpAgentdClient(
    {
      baseUrl: AGENTD_BASE_URL,
      authToken: AGENTD_AUTH_TOKEN,
      fetchImpl: fetch,
    },
    {
      getSnapshot() {
        const licenseToken = getLicenseToken()
        return {
          tier: 'free',
          hasToken: Boolean(licenseToken),
          licenseToken,
          expiresAt: null,
          customerId: null,
          status: 'unknown',
        }
      },
      refresh() {
        throw new Error('refresh() is not supported in the agentd adapter')
      },
      applyVerifiedLicense() {
        throw new Error('applyVerifiedLicense() is not supported in the agentd adapter')
      },
      resetToStarter() {
        throw new Error('resetToStarter() is not supported in the agentd adapter')
      },
    },
  )

  return {
    buildAgentdHeaders(opts) {
      return client.buildHeaders(opts)
    },
    agentdJson(path, init) {
      return client.json(path, init)
    },
  }
}
