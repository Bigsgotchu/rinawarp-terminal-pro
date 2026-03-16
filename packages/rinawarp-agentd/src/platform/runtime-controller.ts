#!/usr/bin/env node
import { processRuntimeQueue } from './runtime.js'

const intervalMs = Math.max(500, Number(process.env.RINAWARP_RUNTIME_CONTROLLER_POLL_MS || 2000))
const batchSize = Math.max(1, Number(process.env.RINAWARP_RUNTIME_CONTROLLER_BATCH || 2))
const leaderElectionEnabled =
  String(process.env.RINAWARP_RUNTIME_CONTROLLER_LEADER_ELECTION || 'false')
    .trim()
    .toLowerCase() === 'true'

let stopping = false

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type LeaseResource = {
  apiVersion: 'coordination.k8s.io/v1'
  kind: 'Lease'
  metadata: {
    name: string
    namespace: string
    resourceVersion?: string
  }
  spec: {
    holderIdentity?: string
    acquireTime?: string
    renewTime?: string
    leaseDurationSeconds?: number
  }
}

class LeaseElector {
  private readonly apiServer: string
  private readonly token: string
  private readonly namespace: string
  private readonly leaseName: string
  private readonly holderId: string
  private readonly leaseDurationSec: number

  constructor() {
    this.apiServer = String(process.env.RINAWARP_K8S_API_SERVER || '').trim()
    this.token = String(process.env.RINAWARP_K8S_TOKEN || '').trim()
    this.namespace = String(process.env.RINAWARP_K8S_NAMESPACE || 'default').trim()
    this.leaseName = String(process.env.RINAWARP_RUNTIME_LEASE_NAME || 'rinawarp-runtime-controller').trim()
    this.holderId =
      String(process.env.RINAWARP_RUNTIME_CONTROLLER_ID || '').trim() ||
      `${String(process.env.HOSTNAME || 'controller').trim()}-${process.pid}`
    this.leaseDurationSec = Math.max(5, Number(process.env.RINAWARP_RUNTIME_LEASE_DURATION_SEC || 15))
  }

  isConfigured(): boolean {
    return Boolean(this.apiServer && this.token && this.namespace && this.leaseName && this.holderId)
  }

  private headers(contentType = 'application/json'): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': contentType,
    }
  }

  private leasePath(): string {
    return `/apis/coordination.k8s.io/v1/namespaces/${encodeURIComponent(this.namespace)}/leases/${encodeURIComponent(this.leaseName)}`
  }

  private leaseCollectionPath(): string {
    return `/apis/coordination.k8s.io/v1/namespaces/${encodeURIComponent(this.namespace)}/leases`
  }

  private isLeaseExpired(lease: LeaseResource): boolean {
    const renew = Date.parse(String(lease.spec.renewTime || ''))
    const duration = Math.max(1, Number(lease.spec.leaseDurationSeconds || this.leaseDurationSec))
    if (!Number.isFinite(renew)) return true
    return Date.now() > renew + duration * 1000
  }

  private buildLeaseBody(existing?: LeaseResource): LeaseResource {
    const now = new Date().toISOString()
    return {
      apiVersion: 'coordination.k8s.io/v1',
      kind: 'Lease',
      metadata: {
        name: this.leaseName,
        namespace: this.namespace,
        ...(existing?.metadata?.resourceVersion ? { resourceVersion: existing.metadata.resourceVersion } : {}),
      },
      spec: {
        holderIdentity: this.holderId,
        acquireTime: existing?.spec?.acquireTime || now,
        renewTime: now,
        leaseDurationSeconds: this.leaseDurationSec,
      },
    }
  }

  async ensureLeadership(): Promise<boolean> {
    const leaseRes = await fetch(`${this.apiServer}${this.leasePath()}`, {
      method: 'GET',
      headers: this.headers(),
    })

    if (leaseRes.status === 404) {
      const createRes = await fetch(`${this.apiServer}${this.leaseCollectionPath()}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(this.buildLeaseBody()),
      })
      return createRes.ok
    }

    if (!leaseRes.ok) return false
    const lease = (await leaseRes.json()) as LeaseResource
    const holder = String(lease?.spec?.holderIdentity || '').trim()
    const isMine = holder === this.holderId
    const expired = this.isLeaseExpired(lease)
    if (!isMine && !expired) return false

    const updateRes = await fetch(`${this.apiServer}${this.leasePath()}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(this.buildLeaseBody(lease)),
    })
    return updateRes.ok
  }
}

async function loop(): Promise<void> {
  const elector = new LeaseElector()
  const retryMs = Math.max(500, Number(process.env.RINAWARP_RUNTIME_RETRY_PERIOD_MS || 1500))
  const useLeaderElection = leaderElectionEnabled && elector.isConfigured()
  while (!stopping) {
    let isLeader = true
    try {
      isLeader = !useLeaderElection || (await elector.ensureLeadership())
      if (isLeader) {
        await processRuntimeQueue(batchSize)
      }
    } catch {
      // keep controller alive; errors are reflected in individual task status.
    }
    await sleep(useLeaderElection && !isLeader ? retryMs : intervalMs)
  }
}

async function main(): Promise<void> {
  process.on('SIGINT', () => {
    stopping = true
  })
  process.on('SIGTERM', () => {
    stopping = true
  })
  await loop()
}

void main()
