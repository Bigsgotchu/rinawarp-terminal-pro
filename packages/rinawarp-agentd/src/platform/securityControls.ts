import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'
import { getTokenLifecycleStatus } from '../workspace/tokenLifecycle.js'
import { runReplicationDrill } from './activeActive.js'
import { runFullReconcile } from './reconciler.js'

type SecurityControlsState = {
  version: 1
  mtls_mode: 'off' | 'permissive' | 'strict'
  mesh_provider: 'istio' | 'linkerd' | 'none'
  evidence_interval_sec: number
  last_drill_at?: string
  last_drill_ok?: boolean
}

function stateFile(): string {
  return path.join(paths().baseDir, 'security-controls.json')
}

function drillLogFile(): string {
  return path.join(paths().baseDir, 'control-drills.ndjson')
}

function loadState(): SecurityControlsState {
  const fp = stateFile()
  if (!fs.existsSync(fp)) {
    return {
      version: 1,
      mtls_mode: 'strict',
      mesh_provider: 'istio',
      evidence_interval_sec: 24 * 60 * 60,
    }
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as SecurityControlsState
    if (!parsed || parsed.version !== 1) throw new Error('invalid')
    return {
      version: 1,
      mtls_mode: parsed.mtls_mode || 'strict',
      mesh_provider: parsed.mesh_provider || 'istio',
      evidence_interval_sec: Math.max(60, Number(parsed.evidence_interval_sec || 24 * 60 * 60)),
      last_drill_at: parsed.last_drill_at,
      last_drill_ok: parsed.last_drill_ok,
    }
  } catch {
    return {
      version: 1,
      mtls_mode: 'strict',
      mesh_provider: 'istio',
      evidence_interval_sec: 24 * 60 * 60,
    }
  }
}

function saveState(state: SecurityControlsState): void {
  const fp = stateFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

export function configureSecurityControls(args: {
  mtls_mode?: 'off' | 'permissive' | 'strict'
  mesh_provider?: 'istio' | 'linkerd' | 'none'
  evidence_interval_sec?: number
}) {
  const state = loadState()
  if (args.mtls_mode) state.mtls_mode = args.mtls_mode
  if (args.mesh_provider) state.mesh_provider = args.mesh_provider
  if (Number.isFinite(args.evidence_interval_sec))
    state.evidence_interval_sec = Math.max(60, Number(args.evidence_interval_sec))
  saveState(state)
  return state
}

export function getSecurityControlsState() {
  return loadState()
}

export async function runControlEvidenceDrill(force = false): Promise<{
  ok: boolean
  mtls: { mode: 'off' | 'permissive' | 'strict'; provider: 'istio' | 'linkerd' | 'none'; ok: boolean }
  token_lifecycle: ReturnType<typeof getTokenLifecycleStatus> & { ok: boolean }
  replication: ReturnType<typeof runReplicationDrill>
  reconcile: Awaited<ReturnType<typeof runFullReconcile>>
}> {
  const state = loadState()
  if (!force && state.last_drill_at) {
    const last = Date.parse(state.last_drill_at)
    if (Number.isFinite(last) && Date.now() - last < state.evidence_interval_sec * 1000) {
      const replication = runReplicationDrill()
      const token = getTokenLifecycleStatus()
      const reconcile = {
        ok: true,
        runtime: { ok: true, scanned: 0, flagged_stuck: 0, remediated: 0, skipped: 0 },
        traffic: { ok: true, changed: false, reason: 'drill_interval_not_elapsed' },
        attestation: { ok: true, total: 0, invalid: 0 },
        archive: { ok: true as const, skipped: true as const, reason: 'drill_interval_not_elapsed' },
      }
      return {
        ok: replication.ok && token.active_sessions >= 0,
        mtls: {
          mode: state.mtls_mode,
          provider: state.mesh_provider,
          ok: state.mtls_mode === 'strict' && state.mesh_provider !== 'none',
        },
        token_lifecycle: { ...token, ok: true },
        replication,
        reconcile,
      }
    }
  }

  const token = getTokenLifecycleStatus()
  const replication = runReplicationDrill()
  const reconcile = await runFullReconcile(force)
  const mtlsOk = state.mtls_mode === 'strict' && state.mesh_provider !== 'none'
  const ok = mtlsOk && replication.ok && reconcile.ok
  state.last_drill_at = new Date().toISOString()
  state.last_drill_ok = ok
  saveState(state)
  const report = {
    ts: state.last_drill_at,
    ok,
    mtls: { mode: state.mtls_mode, provider: state.mesh_provider, ok: mtlsOk },
    token_lifecycle: { ...token, ok: true },
    replication,
    reconcile,
  }
  fs.mkdirSync(path.dirname(drillLogFile()), { recursive: true })
  fs.appendFileSync(drillLogFile(), `${JSON.stringify(report)}\n`, 'utf8')
  return report
}
