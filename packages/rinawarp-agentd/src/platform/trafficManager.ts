import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'

type TrafficState = {
  version: 1
  enabled: boolean
  provider: 'route53' | 'cloudflare'
  // Route53 config
  hosted_zone_id?: string
  record_name?: string
  primary_dns?: string
  secondary_dns?: string
  ttl: number
  region_primary: 'us-east-1' | 'eu-west-1'
  // Cloudflare config
  cloudflare_api_token?: string
  cloudflare_zone_id?: string
  last_run_at?: string
  last_result?: 'ok' | 'error'
}

function stateFile(): string {
  return path.join(paths().baseDir, 'traffic-manager-state.json')
}

function loadState(): TrafficState {
  const fp = stateFile()
  if (!fs.existsSync(fp)) {
    return {
      version: 1,
      enabled: false,
      provider: 'route53',
      ttl: 30,
      region_primary: 'us-east-1',
    }
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as TrafficState
    if (!parsed || parsed.version !== 1) throw new Error('invalid')
    return {
      version: 1,
      enabled: Boolean(parsed.enabled),
      provider: parsed.provider === 'cloudflare' ? 'cloudflare' : 'route53',
      hosted_zone_id: parsed.hosted_zone_id,
      record_name: parsed.record_name,
      primary_dns: parsed.primary_dns,
      secondary_dns: parsed.secondary_dns,
      cloudflare_api_token: parsed.cloudflare_api_token,
      cloudflare_zone_id: parsed.cloudflare_zone_id,
      ttl: Math.max(1, Number(parsed.ttl || 30)),
      region_primary: parsed.region_primary === 'eu-west-1' ? 'eu-west-1' : 'us-east-1',
      last_run_at: parsed.last_run_at,
      last_result: parsed.last_result,
    }
  } catch {
    return {
      version: 1,
      enabled: false,
      provider: 'route53',
      ttl: 30,
      region_primary: 'us-east-1',
    }
  }
}

function saveState(state: TrafficState): void {
  const fp = stateFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

export function configureTrafficManager(args: {
  enabled?: boolean
  provider?: 'route53' | 'cloudflare'
  hosted_zone_id?: string
  record_name?: string
  primary_dns?: string
  secondary_dns?: string
  ttl?: number
  region_primary?: 'us-east-1' | 'eu-west-1'
  cloudflare_api_token?: string
  cloudflare_zone_id?: string
}) {
  const current = loadState()
  const next: TrafficState = {
    ...current,
    ...(typeof args.enabled === 'boolean' ? { enabled: args.enabled } : {}),
    ...(args.provider ? { provider: args.provider } : {}),
    ...(args.hosted_zone_id ? { hosted_zone_id: args.hosted_zone_id } : {}),
    ...(args.record_name ? { record_name: args.record_name } : {}),
    ...(args.primary_dns ? { primary_dns: args.primary_dns } : {}),
    ...(args.secondary_dns ? { secondary_dns: args.secondary_dns } : {}),
    ...(Number.isFinite(args.ttl) ? { ttl: Math.max(1, Number(args.ttl)) } : {}),
    ...(args.region_primary ? { region_primary: args.region_primary } : {}),
    ...(args.cloudflare_api_token ? { cloudflare_api_token: args.cloudflare_api_token } : {}),
    ...(args.cloudflare_zone_id ? { cloudflare_zone_id: args.cloudflare_zone_id } : {}),
  }
  saveState(next)
  return next
}

export function getTrafficManagerState() {
  return loadState()
}

export async function reconcileTrafficManager(force = false): Promise<{
  ok: boolean
  changed?: boolean
  error?: string
}> {
  const state = loadState()
  if (!force && !state.enabled) return { ok: false, error: 'traffic_manager_disabled' }

  // Validate required fields based on provider
  if (state.provider === 'cloudflare') {
    const token = String(state.cloudflare_api_token || process.env.RINAWARP_CLOUDFLARE_API_TOKEN || '').trim()
    const zoneId = String(state.cloudflare_zone_id || state.hosted_zone_id || '').trim()
    if (!token || !zoneId || !state.record_name || !state.primary_dns || !state.secondary_dns) {
      return { ok: false, error: 'traffic_manager_not_configured' }
    }
  } else {
    if (!state.hosted_zone_id || !state.record_name || !state.primary_dns || !state.secondary_dns) {
      return { ok: false, error: 'traffic_manager_not_configured' }
    }
  }

  try {
    if (state.provider === 'cloudflare') {
      await cloudflareUpsertFailoverRecord({
        apiToken: String(state.cloudflare_api_token || process.env.RINAWARP_CLOUDFLARE_API_TOKEN || '').trim(),
        zoneId: String(state.cloudflare_zone_id || state.hosted_zone_id || '').trim(),
        recordName: state.record_name,
        primaryDns: state.primary_dns!,
        secondaryDns: state.secondary_dns!,
        regionPrimary: state.region_primary,
        ttl: state.ttl,
      })
    } else {
      await route53UpsertFailoverRecord({
        hostedZoneId: state.hosted_zone_id!,
        recordName: state.record_name,
        primaryDns: state.primary_dns!,
        secondaryDns: state.secondary_dns!,
        ttl: state.ttl,
      })
    }
    saveState({
      ...state,
      last_run_at: new Date().toISOString(),
      last_result: 'ok',
    })
    return { ok: true, changed: true }
  } catch (error) {
    saveState({
      ...state,
      last_run_at: new Date().toISOString(),
      last_result: 'error',
    })
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function route53UpsertFailoverRecord(args: {
  hostedZoneId: string
  recordName: string
  primaryDns: string
  secondaryDns: string
  ttl: number
}) {
  const mod = await loadRoute53()
  const client = new mod.Route53Client({})
  await client.send(
    new mod.ChangeResourceRecordSetsCommand({
      HostedZoneId: args.hostedZoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: args.recordName,
              Type: 'CNAME',
              SetIdentifier: 'primary',
              Failover: 'PRIMARY',
              TTL: args.ttl,
              ResourceRecords: [{ Value: args.primaryDns }],
            },
          },
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: args.recordName,
              Type: 'CNAME',
              SetIdentifier: 'secondary',
              Failover: 'SECONDARY',
              TTL: args.ttl,
              ResourceRecords: [{ Value: args.secondaryDns }],
            },
          },
        ],
      },
    })
  )
}

async function cloudflareUpsertFailoverRecord(args: {
  apiToken: string
  zoneId: string
  recordName: string
  primaryDns: string
  secondaryDns: string
  regionPrimary: 'us-east-1' | 'eu-west-1'
  ttl: number
}) {
  const cfTtl = args.ttl < 120 ? 120 : args.ttl
  const isIpv4 = (value: string) => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value.trim())
  const desiredContent = args.regionPrimary === 'us-east-1' ? args.primaryDns : args.secondaryDns
  const recordType = isIpv4(desiredContent) ? 'A' : 'CNAME'

  // First, list and delete any existing records with this name (all types)
  // Cloudflare doesn't support native failover like Route53, so we manage two records
  const listResp = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${args.zoneId}/dns_records?name=${encodeURIComponent(args.recordName)}`,
    {
      headers: {
        Authorization: `Bearer ${args.apiToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!listResp.ok) {
    const err = await listResp.text()
    throw new Error(`Cloudflare list failed: ${err}`)
  }

  const listData = (await listResp.json()) as {
    success?: boolean
    result?: Array<{ id: string; name: string; type: string; comment?: string }>
  }
  if (!listData.success) throw new Error('Cloudflare list returned unsuccessful response')

  // Delete existing records that match our record name
  if (listData.result && listData.result.length > 0) {
    for (const record of listData.result) {
      if (record.name === args.recordName || record.name === `${args.recordName}.`) {
        const deleteResp = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${args.zoneId}/dns_records/${record.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${args.apiToken}`,
              'Content-Type': 'application/json',
            },
          }
        )
        if (!deleteResp.ok) {
          const err = await deleteResp.text()
          console.error(`Failed to delete existing record ${record.id}: ${err}`)
        }
      }
    }
  }

  // Now create the primary record (for primary region)
  const primaryContent = args.primaryDns
  const primaryType = isIpv4(primaryContent) ? 'A' : 'CNAME'
  const primaryResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${args.zoneId}/dns_records`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: args.recordName,
      type: primaryType,
      content: primaryContent,
      ttl: cfTtl,
      proxied: false,
      comment: 'rinawarp-primary',
    }),
  })
  if (!primaryResp.ok) {
    const err = await primaryResp.text()
    throw new Error(`Cloudflare primary record create failed: ${err}`)
  }
  const primaryData = (await primaryResp.json()) as { success?: boolean }
  if (!primaryData.success) throw new Error('Cloudflare primary record create returned unsuccessful response')

  // Create the secondary record (for failover region)
  const secondaryContent = args.secondaryDns
  const secondaryType = isIpv4(secondaryContent) ? 'A' : 'CNAME'
  const secondaryResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${args.zoneId}/dns_records`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: args.recordName,
      type: secondaryType,
      content: secondaryContent,
      ttl: cfTtl,
      proxied: false,
      comment: 'rinawarp-secondary',
    }),
  })
  if (!secondaryResp.ok) {
    const err = await secondaryResp.text()
    throw new Error(`Cloudflare secondary record create failed: ${err}`)
  }
  const secondaryData = (await secondaryResp.json()) as { success?: boolean }
  if (!secondaryData.success) throw new Error('Cloudflare secondary record create returned unsuccessful response')
}

let route53Cache: null | { Route53Client: any; ChangeResourceRecordSetsCommand: any } = null

async function loadRoute53(): Promise<{ Route53Client: any; ChangeResourceRecordSetsCommand: any }> {
  if (route53Cache) return route53Cache
  const importer = new Function('m', 'return import(m);') as (m: string) => Promise<any>
  const mod = await importer('@aws-sdk/client-route-53')
  route53Cache = {
    Route53Client: mod.Route53Client,
    ChangeResourceRecordSetsCommand: mod.ChangeResourceRecordSetsCommand,
  }
  return route53Cache
}
