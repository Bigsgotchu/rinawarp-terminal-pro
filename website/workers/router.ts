/**
 * RinaWarp Marketplace Router
 *
 * Routes requests to API or Marketplace UI handlers
 */

import { handleAuthRequest } from './api/auth'
import { apiRouter } from './api/index'
import { createToken, extractToken, verifyToken } from './lib/auth'
import type { D1Database } from './lib/cloudflare-types'
import { marketplaceUI } from './marketplace/ui'
import { injectSeoTags } from './seo'

const LOGO_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="80" y1="60" x2="440" y2="460" gradientUnits="userSpaceOnUse">
      <stop stop-color="#62F6E5"/>
      <stop offset="0.38" stop-color="#8FEFFF"/>
      <stop offset="0.7" stop-color="#FF9B6B"/>
      <stop offset="1" stop-color="#FF4FD8"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect x="64" y="64" width="384" height="384" rx="96" fill="#0B1020"/>
  <path filter="url(#glow)" d="M150 335c54-155 140-190 212-190 0 0-42 22-77 79 0 0 58-30 115-18 0 0-73 37-110 130-40 102-144 116-140-1z" fill="url(#g)"/>
  <path d="M160 338c48-138 122-168 186-168" stroke="rgba(255,255,255,0.18)" stroke-width="10" stroke-linecap="round"/>
</svg>`

const PUBLIC_INSTALLERS_BASE = 'https://pub-58c0b2f3cc8d43fa8cf6e1d4d2dcf94b.r2.dev'
const PUBLIC_UPDATES_BASE = 'https://pub-4df343f1b4524762a4f8ad3c744653c9.r2.dev'
const DEMO_MP4_URL = `${PUBLIC_INSTALLERS_BASE}/demo/rinawarp-fix-project-demo.mp4`
const DEMO_WEBM_URL = `${PUBLIC_INSTALLERS_BASE}/demo/rinawarp-fix-project-demo.webm`
const DEMO_POSTER_URL = `${PUBLIC_INSTALLERS_BASE}/demo/rinawarp-fix-project-demo-poster.jpg`

function rwHeaders(headers = new Headers()): Headers {
  headers.set('Vary', 'Accept-Encoding')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  return headers
}

function rwText(status: number, message: string): Response {
  const headers = rwHeaders()
  headers.set('Content-Type', 'text/plain; charset=utf-8')
  headers.set('Cache-Control', 'public, max-age=60, must-revalidate')
  return new Response(message, { status, headers })
}

function rwRedirect(location: string, status = 302): Response {
  const headers = rwHeaders()
  headers.set('Location', location)
  headers.set('Cache-Control', 'public, max-age=60, must-revalidate')
  return new Response(null, { status, headers })
}

function getDb(env: any): D1Database | null {
  return env.RINAWARP_DB || null
}

function getR2Bucket(env: any): any | null {
  try {
    const bucket = env?.RINAWARP_CDN
    if (!bucket || typeof bucket.get !== 'function') {
      return null
    }
    return bucket
  } catch (error) {
    console.error('[R2] binding unavailable', error)
    return null
  }
}

let matterIntelligenceTablesInitialized = false

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

function generateReferralCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map((value) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[value % 32])
    .join('')
}

function normalizeReferralCode(value: unknown): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 24)
}

function isReferralAdminEmail(email: string): boolean {
  const normalized = String(email || '')
    .trim()
    .toLowerCase()
  return normalized === 'support@rinawarptech.com' || normalized === 'hello@rinawarptech.com'
}

async function getAuthenticatedUserFromRequest(
  request: Request,
  env: any
): Promise<{ userId: string; email: string } | null> {
  const token = extractToken(request.headers.get('Authorization'))
  if (!token || !env.AUTH_SECRET) return null
  const payload = await verifyToken(token, env.AUTH_SECRET)
  const userId = String(payload?.userId || '').trim()
  const email = String(payload?.email || '')
    .trim()
    .toLowerCase()
  if (!userId || !email) return null
  return { userId, email }
}

async function ensureReferralIdentity(env: any, userId: string): Promise<{ code: string; inviteUrl: string } | null> {
  const db = getDb(env)
  if (!db) return null
  try {
    const existing = await db
      .prepare('SELECT code FROM referral_codes WHERE user_id = ?')
      .bind(userId)
      .first<{ code: string }>()

    if (existing?.code) {
      return {
        code: existing.code,
        inviteUrl: `https://rinawarptech.com/download/?ref=${encodeURIComponent(existing.code)}`,
      }
    }

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const code = generateReferralCode()
      try {
        const ts = nowSeconds()
        await db
          .prepare('INSERT INTO referral_codes (id, user_id, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
          .bind(`refcode_${crypto.randomUUID()}`, userId, code, ts, ts)
          .run()

        return {
          code,
          inviteUrl: `https://rinawarptech.com/download/?ref=${encodeURIComponent(code)}`,
        }
      } catch (error) {
        console.warn('[referrals] could not create referral code on attempt', attempt + 1, error)
      }
    }
  } catch (error) {
    console.warn('[referrals] referral identity unavailable', error)
  }

  return null
}

async function getReferralSummary(
  env: any,
  userId: string
): Promise<{
  code: string
  inviteUrl: string
  stats: { clicks: number; checkouts: number; conversions: number }
} | null> {
  const identity = await ensureReferralIdentity(env, userId)
  const db = getDb(env)
  if (!identity || !db) return null
  try {
    const stats = await db
      .prepare(
        `
      SELECT
        SUM(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) AS checkouts,
        SUM(CASE WHEN event_type = 'checkout_completed' THEN 1 ELSE 0 END) AS conversions,
        COUNT(*) AS clicks
      FROM referral_events
      WHERE referrer_user_id = ?
    `
      )
      .bind(userId)
      .first<{ checkouts?: number; conversions?: number; clicks?: number }>()

    return {
      code: identity.code,
      inviteUrl: identity.inviteUrl,
      stats: {
        clicks: Number(stats?.clicks || 0),
        checkouts: Number(stats?.checkouts || 0),
        conversions: Number(stats?.conversions || 0),
      },
    }
  } catch (error) {
    console.warn('[referrals] referral summary unavailable', error)
    return {
      code: identity.code,
      inviteUrl: identity.inviteUrl,
      stats: { clicks: 0, checkouts: 0, conversions: 0 },
    }
  }
}

async function maybeTrackReferralEvent(
  env: any,
  input: {
    referralCode?: string | null
    eventType: 'checkout_started' | 'checkout_completed'
    referredEmail?: string | null
    checkoutSessionId?: string | null
    source?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  const db = getDb(env)
  const code = normalizeReferralCode(input.referralCode)
  if (!db || !code) return
  try {
    const referral = await db
      .prepare('SELECT user_id FROM referral_codes WHERE code = ?')
      .bind(code)
      .first<{ user_id: string }>()

    if (!referral?.user_id) return

    const ts = nowSeconds()
    if (input.eventType === 'checkout_completed' && input.checkoutSessionId) {
      const updated = await db
        .prepare(
          `
      UPDATE referral_events
      SET event_type = 'checkout_completed',
          checkout_session_id = COALESCE(checkout_session_id, ?),
          metadata_json = ?,
          converted_at = ?,
          referred_email = COALESCE(referred_email, ?)
      WHERE referral_code = ?
        AND referrer_user_id = ?
        AND (
          checkout_session_id = ?
          OR (checkout_session_id IS NULL AND event_type = 'checkout_started')
        )
    `
        )
        .bind(
          input.checkoutSessionId,
          JSON.stringify(input.metadata || {}),
          ts,
          String(input.referredEmail || '')
            .trim()
            .toLowerCase() || null,
          code,
          referral.user_id,
          input.checkoutSessionId
        )
        .run()

      if (Number(updated.meta?.changes || 0) > 0) {
        return
      }
    }

    await db
      .prepare(
        `
      INSERT INTO referral_events (
        id, referral_code, referrer_user_id, referred_email, event_type,
        checkout_session_id, source, metadata_json, created_at, converted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .bind(
        `refevt_${crypto.randomUUID()}`,
        code,
        referral.user_id,
        String(input.referredEmail || '')
          .trim()
          .toLowerCase() || null,
        input.eventType,
        input.checkoutSessionId || null,
        String(input.source || 'website').trim() || 'website',
        JSON.stringify(input.metadata || {}),
        ts,
        input.eventType === 'checkout_completed' ? ts : null
      )
      .run()
  } catch (error) {
    console.warn('[referrals] referral event tracking unavailable', error)
  }
}

function primaryReleaseUrl(origin: string, fileName: string): string {
  return `${origin}/releases/${fileName.replace(/^\/+/, '')}`
}

function primaryDownloadUrl(origin: string, kind: string): string {
  return `${origin}/download/${kind.replace(/^\/+/, '')}`
}

function rwSvg(svg: string): Response {
  const headers = rwHeaders()
  headers.set('Content-Type', 'image/svg+xml; charset=utf-8')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(svg, { status: 200, headers })
}

const GITHUB_RELEASES_BASE = 'https://github.com/Bigsgotchu/rinawarp-terminal-pro/releases'
const BETA_RELEASE_VERSION = '1.8.2-beta'
const BETA_RELEASE_TAG = `v${BETA_RELEASE_VERSION}`
const BETA_RELEASE_DOWNLOAD_BASE = `${GITHUB_RELEASES_BASE}/download/${BETA_RELEASE_TAG}`

const GITHUB_BETA_RELEASE_ASSETS: Record<string, string> = {
  'releases/latest.json': 'latest.json',
  'releases/latest.yml': 'latest.yml',
  'releases/latest-linux.yml': 'latest-linux.yml',
  'releases/SHASUMS256.txt': 'SHASUMS256.txt',
}

function normalizeArtifactKind(rawKind: string): string {
  const kind = (rawKind || '').toLowerCase().trim()

  if (['linux', 'terminal-pro-linux', 'appimage'].includes(kind)) return 'linux'
  if (['linux/deb', 'debian', 'deb', 'linux-deb', 'ubuntu', 'apt'].includes(kind)) return 'linux-deb'
  if (['linux/appimage', 'appimage-update'].includes(kind)) return 'linux'
  if (['windows', 'terminal-pro-windows', 'exe', 'win'].includes(kind)) return 'windows'
  if (['mac', 'macos', 'terminal-pro-mac', 'terminal-pro-macos', 'dmg'].includes(kind)) return 'mac'
  if (['checksums', 'checksum', 'sha256', 'shasums', 'shasums256.txt'].includes(kind)) return 'checksums'

  return kind
}

async function getReleaseManifest(env: any): Promise<any | null> {
  try {
    const bucket = getR2Bucket(env)
    if (!bucket) return null
    const object = await bucket.get('releases/latest.json')
    if (!object) return null
    return JSON.parse(await object.text())
  } catch (error) {
    console.error('[releases] failed to load latest.json', error)
    return null
  }
}

async function getChannelReleaseManifest(env: any, channel: 'stable' | 'beta' | 'alpha'): Promise<any | null> {
  try {
    const bucket = getR2Bucket(env)
    if (!bucket) return null
    const object = await bucket.get(`releases/${channel}/latest.json`)
    if (!object) return null
    return JSON.parse(await object.text())
  } catch (error) {
    console.error(`[releases] failed to load ${channel}/latest.json`, error)
    return null
  }
}

function buildChannelDownloadSummary(
  origin: string,
  channel: 'stable' | 'beta' | 'alpha',
  manifest: any
): {
  version: string
  url: string
  manifestUrl: string
  publishedAt: string | null
  downloads: { linux?: string; deb?: string; windows?: string }
} | null {
  const version = typeof manifest?.version === 'string' ? manifest.version : ''
  if (!version) return null
  const linuxPath = manifest?.files?.linux?.path ?? null
  const debPath = manifest?.files?.deb?.path ?? null
  const windowsPath = manifest?.files?.windows?.path ?? null
  const downloads = {
    ...(linuxPath ? { linux: toAbsoluteArtifactUrl(origin, linuxPath) || undefined } : {}),
    ...(debPath ? { deb: toAbsoluteArtifactUrl(origin, debPath) || undefined } : {}),
    ...(windowsPath ? { windows: toAbsoluteArtifactUrl(origin, windowsPath) || undefined } : {}),
  }
  return {
    version,
    url: downloads.windows || downloads.linux || downloads.deb || `${origin}/download/`,
    manifestUrl: `${origin}/releases/${channel}/latest.json`,
    publishedAt: typeof manifest?.pub_date === 'string' ? manifest.pub_date : null,
    downloads,
  }
}

function buildGitHubBetaReleaseSummary(): {
  version: string
  url: string
  manifestUrl: string
  publishedAt: string | null
  downloads: { linux?: string; deb?: string; windows?: string }
} {
  return {
    version: BETA_RELEASE_VERSION,
    url: `${GITHUB_RELEASES_BASE}/tag/${BETA_RELEASE_TAG}`,
    manifestUrl: `${BETA_RELEASE_DOWNLOAD_BASE}/latest.json`,
    publishedAt: '2026-05-29T02:09:11.000Z',
    downloads: {
      linux: `${BETA_RELEASE_DOWNLOAD_BASE}/RinaWarp-Terminal-Pro-${BETA_RELEASE_VERSION}.AppImage`,
      deb: `${BETA_RELEASE_DOWNLOAD_BASE}/RinaWarp-Terminal-Pro-${BETA_RELEASE_VERSION}.deb`,
    },
  }
}

function pickGitHubBetaArtifactUrl(kind: string): string | null {
  if (kind === 'linux') return `${BETA_RELEASE_DOWNLOAD_BASE}/RinaWarp-Terminal-Pro-${BETA_RELEASE_VERSION}.AppImage`
  if (kind === 'linux-deb') return `${BETA_RELEASE_DOWNLOAD_BASE}/RinaWarp-Terminal-Pro-${BETA_RELEASE_VERSION}.deb`
  if (kind === 'checksums') return `${BETA_RELEASE_DOWNLOAD_BASE}/SHASUMS256.txt`
  return null
}

async function renderReleasesJson(env: any, origin: string): Promise<Response> {
  const [stable, beta, alpha] = await Promise.all([
    getChannelReleaseManifest(env, 'stable'),
    getChannelReleaseManifest(env, 'beta'),
    getChannelReleaseManifest(env, 'alpha'),
  ])
  const payload = {
    stable: buildChannelDownloadSummary(origin, 'stable', stable),
    beta: buildChannelDownloadSummary(origin, 'beta', beta) ?? buildGitHubBetaReleaseSummary(),
    alpha: buildChannelDownloadSummary(origin, 'alpha', alpha),
  }
  const headers = rwHeaders()
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'public, max-age=60, must-revalidate')
  return new Response(JSON.stringify(payload, null, 2), { status: 200, headers })
}

function pickArtifactPath(manifest: any, kind: string): string | null {
  const version = manifest?.version
  const explicitLinuxPath = manifest?.files?.linux?.path ?? null
  const explicitLinuxDebPath = manifest?.files?.deb?.path ?? null
  const explicitWindowsPath = manifest?.files?.windows?.path ?? null
  const explicitMacPath =
    manifest?.files?.mac?.path ??
    manifest?.files?.macVariants?.dmg?.path ??
    manifest?.files?.macVariants?.zip?.path ??
    null
  const explicitChecksumsPath = manifest?.files?.checksums?.path ?? null
  const linuxPath = explicitLinuxPath ?? manifest?.platforms?.['linux-x86_64']?.url ?? null

  if (kind === 'linux') return linuxPath
  if (kind === 'linux-deb') return explicitLinuxDebPath
  if (kind === 'windows') return explicitWindowsPath
  if (kind === 'mac') return explicitMacPath
  if (kind === 'checksums' && explicitChecksumsPath) return explicitChecksumsPath
  if (kind === 'checksums' && version) return `releases/${version}/SHASUMS256.txt`
  return null
}

function compareReleaseVersions(a: string, b: string): number {
  const parse = (value: string) => {
    const [core, prerelease = ''] = value.split('-', 2)
    const parts = core.split('.').map((part) => Number.parseInt(part, 10) || 0)
    return { parts, prerelease }
  }

  const left = parse(a)
  const right = parse(b)
  for (let index = 0; index < Math.max(left.parts.length, right.parts.length); index += 1) {
    const delta = (left.parts[index] || 0) - (right.parts[index] || 0)
    if (delta !== 0) return delta
  }

  if (!left.prerelease && right.prerelease) return 1
  if (left.prerelease && !right.prerelease) return -1
  return left.prerelease.localeCompare(right.prerelease)
}

async function findLatestArtifactPath(env: any, kind: string): Promise<string | null> {
  const bucket = getR2Bucket(env)
  if (!bucket || !['windows', 'linux-deb', 'linux'].includes(kind)) return null

  const extensions: Record<string, string> = {
    windows: '.exe',
    'linux-deb': '.deb',
    linux: '.AppImage',
  }

  const extension = extensions[kind]
  let cursor: string | undefined
  let best: { version: string; key: string } | null = null

  do {
    const page = await bucket.list({ prefix: 'releases/', cursor, limit: 1000 })
    for (const object of page.objects || []) {
      const match = object.key.match(/^releases\/([^/]+)\/RinaWarp-Terminal-Pro-\1(\.AppImage|\.deb|\.exe)$/)
      if (!match) continue
      if (match[2] !== extension) continue
      const version = match[1]
      if (!best || compareReleaseVersions(version, best.version) > 0) {
        best = { version, key: object.key }
      }
    }
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor)

  return best?.key ?? null
}

function toAbsoluteArtifactUrl(origin: string, artifactPath: string | null): string | null {
  if (!artifactPath) return null
  if (/^https?:\/\//i.test(artifactPath)) return artifactPath
  if (artifactPath.startsWith('releases/')) {
    return `${PUBLIC_INSTALLERS_BASE}/${artifactPath.replace(/^\/+/, '')}`
  }
  return `${origin}/${artifactPath.replace(/^\/+/, '')}`
}

function contentTypeFor(key: string): string {
  const ext = key.slice(key.lastIndexOf('.'))
  const contentTypes: Record<string, string> = {
    '.AppImage': 'application/vnd.appimage',
    '.appimage': 'application/vnd.appimage',
    '.deb': 'application/vnd.debian.binary-package',
    '.exe': 'application/x-msdownload',
    '.dmg': 'application/x-apple-diskimage',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.yml': 'application/x-yaml; charset=utf-8',
    '.yaml': 'application/x-yaml; charset=utf-8',
    '.zip': 'application/zip',
  }
  return contentTypes[ext] || 'application/octet-stream'
}

async function serveReleaseObject(env: any, objectKey: string): Promise<Response | null> {
  try {
    const bucket = getR2Bucket(env)
    const object = bucket ? await bucket.get(objectKey) : null
    if (!object) {
      const githubAsset = GITHUB_BETA_RELEASE_ASSETS[objectKey]
      if (!githubAsset) return null
      const upstream = await fetch(`${BETA_RELEASE_DOWNLOAD_BASE}/${githubAsset}`, {
        headers: { Accept: '*/*' },
      })
      if (!upstream.ok || !upstream.body) return null
      const headers = rwHeaders()
      headers.set('Content-Type', contentTypeFor(objectKey))
      headers.set('Cache-Control', objectKey.endsWith('.json') ? 'public, max-age=60, must-revalidate' : 'public, max-age=300, must-revalidate')
      return new Response(upstream.body, { status: 200, headers })
    }

    const headers = rwHeaders()
    object.writeHttpMetadata(headers)
    headers.set('ETag', object.httpEtag)
    headers.set('Content-Type', contentTypeFor(objectKey))

    if (objectKey === 'releases/latest.json' || objectKey.endsWith('/latest.json')) {
      headers.set('Cache-Control', 'public, max-age=60, must-revalidate')
    } else if (objectKey.startsWith('releases/')) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    } else {
      headers.set('Cache-Control', 'public, max-age=86400')
    }

    return new Response(object.body, { headers })
  } catch (error) {
    console.error(`[releases] failed to serve ${objectKey}`, error)
    return null
  }
}

async function serveDownloadObject(env: any, objectKey: string): Promise<Response | null> {
  try {
    const bucket = getR2Bucket(env)
    if (!bucket) return null
    const object = await bucket.get(objectKey)
    if (!object) return null

    const headers = rwHeaders()
    object.writeHttpMetadata(headers)
    headers.set('ETag', object.httpEtag)
    headers.set('Content-Type', contentTypeFor(objectKey))
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    headers.set('Content-Disposition', `attachment; filename="${objectKey.split('/').pop() || 'download'}"`)

    return new Response(object.body, { headers })
  } catch (error) {
    console.error(`[downloads] failed to serve ${objectKey}`, error)
    return null
  }
}

type SitePage =
  | 'home'
  | 'products'
  | 'beta'
  | 'beta-feedback'
  | 'pricing'
  | 'download'
  | 'docs'
  | 'trust'
  | 'agents'
  | 'feedback'
  | 'legal'
  | 'login'
  | 'register'
  | 'account'

type SiteAnalyticsEvent =
  | 'site_home_viewed'
  | 'site_products_viewed'
  | 'site_pricing_viewed'
  | 'site_download_viewed'
  | 'site_download_clicked'
  | 'checkout_started'

const SITE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    color-scheme: light;
    --bg: #f7fbfc;
    --surface: #ffffff;
    --surface-strong: #eef7f8;
    --surface-soft: #f5fafb;
    --line: #dce9ec;
    --line-strong: #96d7d7;
    --text: #10242f;
    --muted: #5f7280;
    --accent: #0b7c83;
    --accent-2: #ff3ea5;
    --accent-warm: #ff6f61;
    --accent-blue: #2478bf;
    --accent-soft: #16d4c5;
    --success: #22c55e;
    --danger: #fb7185;
    --shadow: 0 18px 55px rgba(16, 36, 47, 0.10);
    --radius: 14px;
    --radius-sm: 8px;
    --content: 1180px;
  }
  body {
    min-height: 100vh;
    color: var(--text);
    font-family: "Inter", "Segoe UI", sans-serif;
    background: linear-gradient(180deg, #eefafa 0, #ffffff 430px, #f7fbfc 100%);
  }
  a { color: inherit; text-decoration: none; }
  .skip-link {
    position: absolute;
    left: 16px;
    top: -48px;
    z-index: 50;
    padding: 10px 14px;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--accent-2), var(--accent-warm), var(--accent));
    color: #08121b;
    font-weight: 700;
    transition: top 0.2s ease;
  }
  .skip-link:focus-visible {
    top: 16px;
  }
  .site-shell { min-height: 100vh; display: flex; flex-direction: column; }
  header {
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(16px);
    background: rgba(255, 255, 255, 0.92);
    border-bottom: 1px solid var(--line);
    box-shadow: 0 8px 30px rgba(16, 36, 47, 0.04);
  }
  nav {
    min-height: 64px;
    max-width: var(--content);
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .logo {
    display: inline-flex;
    align-items: center;
    gap: 0;
  }
  .logo-wordmark {
    height: 30px;
    width: auto;
    object-fit: contain;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 0.92rem;
    color: var(--muted);
  }
  .nav-links a {
    padding: 8px 12px;
    border-radius: 999px;
    transition: color 0.2s ease, background 0.2s ease;
  }
  .nav-links a:hover,
  .nav-links a.active {
    color: var(--accent);
    background: rgba(11, 124, 131, 0.08);
  }
  .hero {
    max-width: var(--content);
    margin: 0 auto;
    padding: 54px 24px 34px;
    display: grid;
    gap: 22px;
  }
  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.86fr) minmax(360px, 1.14fr);
    gap: 34px;
    align-items: center;
  }
  .hero-panel {
    display: grid;
    gap: 18px;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    width: fit-content;
    color: #0b7c83;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    border: 1px solid #b8e2e3;
    background: #ffffff;
    border-radius: 999px;
    padding: 6px 10px;
  }
  h1 {
    font-family: "Space Grotesk", "Inter", sans-serif;
    font-size: clamp(2.05rem, 4.4vw, 3.45rem);
    line-height: 1.06;
    letter-spacing: -0.025em;
    max-width: 14ch;
  }
  .hero-copy,
  .lede {
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.65;
    max-width: 56ch;
  }
  .cta-row,
  .link-row {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    padding: 0 18px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 650;
    transition: transform 0.18s ease, opacity 0.18s ease, border-color 0.18s ease;
    border: 1px solid transparent;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn-primary {
    color: #ffffff;
    background: #ff3ea5;
    box-shadow: 0 12px 28px rgba(255, 62, 165, 0.22);
  }
  .btn-secondary {
    color: var(--text);
    background: #ffffff;
    border-color: var(--line);
  }
  .btn-secondary-strong {
    color: var(--accent);
    border-color: #b8e2e3;
    background: #ffffff;
  }
  main { flex: 1; }
  .section {
    max-width: var(--content);
    margin: 0 auto;
    padding: 46px 24px;
  }
  .section-title {
    font-family: "Space Grotesk", "Inter", sans-serif;
    font-size: clamp(1.45rem, 2.55vw, 2rem);
    line-height: 1.16;
    margin-bottom: 10px;
    letter-spacing: -0.025em;
  }
  .section-copy {
    color: var(--muted);
    max-width: 56ch;
    line-height: 1.7;
    font-size: 1rem;
    margin-bottom: 22px;
  }
  .grid {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
  .card,
  .panel {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 20px;
    box-shadow: var(--shadow);
  }
  .card h3,
  .panel h3 {
    font-size: 1rem;
    margin-bottom: 8px;
    letter-spacing: -0.01em;
  }
  .card p,
  .panel p,
  .card li,
  .panel li {
    color: var(--muted);
    line-height: 1.58;
    font-size: 0.94rem;
  }
  .three-up { grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); }
  .stack { display: grid; gap: 16px; }
  .signal-list {
    list-style: none;
    display: grid;
    gap: 10px;
    margin-top: 12px;
  }
  .signal-list li::before {
    content: "•";
    color: var(--accent);
    margin-right: 10px;
  }
  .proof-strip {
    display: grid;
    gap: 12px;
    margin-top: 8px;
  }
  .proof-demo {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
    gap: 20px;
    align-items: start;
  }
  .transcript-demo {
    display: grid;
    gap: 14px;
    padding: 18px;
    background: linear-gradient(180deg, rgba(6, 17, 26, 0.96), rgba(10, 21, 32, 0.88));
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: var(--shadow);
  }
  .demo-windowbar {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .demo-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
  }
  .demo-chat { display: grid; gap: 12px; }
  .demo-message {
    max-width: 92%;
    padding: 12px 14px;
    border-radius: 16px;
    border: 1px solid var(--line);
    line-height: 1.6;
    color: #dbe9f6;
    font-size: 0.93rem;
  }
  .demo-message.user {
    justify-self: end;
    background: rgba(255, 255, 255, 0.05);
  }
  .demo-message.assistant {
    background: rgba(98, 246, 229, 0.07);
    border-color: rgba(98, 246, 229, 0.2);
  }
  .demo-proof {
    display: grid;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--line);
  }
  .demo-proof-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #dce9f5;
    font-weight: 600;
  }
  .demo-proof-tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    padding: 5px 10px;
    background: rgba(98, 246, 229, 0.12);
    border: 1px solid rgba(98, 246, 229, 0.22);
    color: #d8f3ff;
    font-size: 0.8rem;
  }
  .demo-proof-lines {
    display: grid;
    gap: 6px;
    color: var(--muted);
    font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
    font-size: 0.86rem;
  }
  .proof-notes {
    display: grid;
    gap: 14px;
  }
  .proof-note {
    padding: 16px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }
  .proof-note strong {
    display: block;
    margin-bottom: 8px;
  }
  .terminal-preview {
    display: grid;
    gap: 12px;
    padding: 22px;
    border-radius: 8px;
    border: 1px solid rgba(31, 214, 193, 0.22);
    background:
      radial-gradient(circle at top right, rgba(255, 79, 163, 0.16), transparent 34%),
      radial-gradient(circle at 0% 100%, rgba(78, 161, 255, 0.10), transparent 28%),
      linear-gradient(180deg, rgba(8, 8, 12, 0.98), rgba(17, 19, 27, 0.96));
    box-shadow: 0 20px 50px rgba(16, 36, 47, 0.16);
  }
  .terminal-line {
    font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
    font-size: 0.92rem;
    color: #dce9f5;
    line-height: 1.6;
  }
  .terminal-line.ok { color: #86efac; }
  .terminal-line.fail { color: #fda4af; }
  .terminal-line.dim { color: var(--muted); }
  .demo-video-shell {
    display: grid;
    gap: 14px;
    padding: 18px;
    border-radius: 8px;
    border: 1px solid rgba(31, 214, 193, 0.22);
    background:
      radial-gradient(circle at top right, rgba(255, 79, 163, 0.14), transparent 34%),
      linear-gradient(180deg, rgba(8, 8, 12, 0.98), rgba(17, 19, 27, 0.96));
    box-shadow:
      0 0 20px rgba(255, 79, 216, 0.18),
      0 0 26px rgba(98, 246, 229, 0.08);
  }
  .demo-video {
    width: 100%;
    display: block;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    background: #000;
  }
  .demo-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .demo-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    padding: 6px 12px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--line);
    color: var(--muted);
    font-size: 0.84rem;
  }
  .how-grid {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
  .hero-visual {
    display: grid;
    gap: 14px;
    padding: 24px;
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      radial-gradient(circle at top right, rgba(255, 79, 163, 0.16), transparent 34%),
      radial-gradient(circle at 0% 100%, rgba(31, 214, 193, 0.12), transparent 24%),
      linear-gradient(180deg, rgba(11, 11, 16, 0.98), rgba(24, 27, 34, 0.96));
    box-shadow: var(--shadow);
  }
  .hero-visual strong {
    font-family: "Space Grotesk", "Inter", sans-serif;
    font-size: 1.2rem;
    letter-spacing: -0.02em;
  }
  .hero-visual p {
    color: var(--muted);
    line-height: 1.65;
  }
  .visual-stack {
    display: grid;
    gap: 12px;
  }
  .visual-row {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
  .visual-card {
    padding: 14px 16px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.04);
  }
  .visual-card strong {
    display: block;
    margin-bottom: 6px;
    font-size: 0.98rem;
  }
  .visual-card p,
  .visual-card span {
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.55;
  }
  .duo-grid {
    display: grid;
    gap: 22px;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
  .product-showcase {
    position: relative;
    overflow: hidden;
    padding: 28px;
    border-radius: 28px;
    border: 1px solid var(--line);
    background:
      radial-gradient(circle at top right, rgba(255, 79, 163, 0.12), transparent 32%),
      linear-gradient(180deg, rgba(18, 19, 26, 0.96), rgba(11, 11, 16, 0.96));
    box-shadow: var(--shadow);
  }
  .product-showcase::after {
    content: "";
    position: absolute;
    inset: auto -40px -80px auto;
    width: 180px;
    height: 180px;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(31, 214, 193, 0.14), transparent 70%);
    pointer-events: none;
  }
  .product-showcase h2 {
    font-family: "Space Grotesk", "Inter", sans-serif;
    font-size: 2rem;
    letter-spacing: -0.03em;
    margin-bottom: 10px;
  }
  .product-showcase p {
    color: var(--muted);
    line-height: 1.68;
  }
  .signal-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  .signal-card {
    padding: 18px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.035);
  }
  .signal-card strong {
    display: block;
    margin-bottom: 8px;
    font-size: 1rem;
  }
  .signal-card p {
    color: var(--muted);
    line-height: 1.58;
  }
  .step-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 18px;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.04),
      0 0 18px rgba(98, 246, 229, 0.06);
  }
  .step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    margin-bottom: 12px;
    font-weight: 700;
    color: #08121b;
    background: linear-gradient(135deg, #ff4fa3, #ff7a6b, #1fd6c1, #4ea1ff);
  }
  .fix-before-after {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 18px;
  }
  .fix-state {
    border-radius: 18px;
    border: 1px solid var(--line);
    padding: 18px;
    background: rgba(255, 255, 255, 0.03);
  }
  .fix-state.bad {
    border-color: rgba(251, 113, 133, 0.26);
    background: linear-gradient(180deg, rgba(251, 113, 133, 0.08), rgba(255, 255, 255, 0.02));
  }
  .fix-state.good {
    border-color: rgba(98, 246, 229, 0.26);
    background: linear-gradient(180deg, rgba(98, 246, 229, 0.08), rgba(255, 255, 255, 0.02));
  }
  .fix-state code,
  .terminal-caption {
    display: block;
    margin-top: 10px;
    color: #d8f3ff;
    font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
    font-size: 0.86rem;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .trust-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .trust-chip {
    display: inline-flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(255,255,255,0.03);
    color: #d8f3ff;
    font-size: 0.86rem;
  }
  .final-cta {
    text-align: center;
    display: grid;
    gap: 14px;
    justify-items: center;
  }
  .faq-grid {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
  .faq-item {
    padding: 16px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }
  .faq-item h3 { margin-bottom: 10px; }
  .trust-note {
    border-color: rgba(251, 191, 36, 0.22);
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), rgba(10, 21, 32, 0.88));
  }
  .proof-step {
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 14px 16px;
    background: var(--surface-soft);
  }
  .proof-step strong { display: block; margin-bottom: 6px; }
  .kicker {
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.75rem;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .centered { text-align: center; margin-left: auto; margin-right: auto; }
  .feature-band {
    max-width: none;
    background: #f2f6f8;
  }
  .feature-band > * {
    max-width: var(--content);
    margin-left: auto;
    margin-right: auto;
  }
  .four-up { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
  .mini-card {
    min-height: 126px;
    padding: 18px;
    border: 1px solid #dce9ec;
    border-radius: 8px;
    background: #ffffff;
  }
  .mini-icon,
  .soft-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    margin-bottom: 12px;
    color: #0b7c83;
    background: #eef9fb;
    border: 1px solid #ccecef;
    font-size: 0.78rem;
    font-weight: 800;
  }
  .split-section {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 1fr);
    gap: 34px;
    align-items: center;
  }
  .step-list {
    display: grid;
    gap: 14px;
  }
  .step-list article {
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 12px;
    align-items: start;
  }
  .step-list span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    color: #ffffff;
    background: #ff3ea5;
    font-weight: 800;
  }
  .screenshot-frame {
    overflow: hidden;
    border: 1px solid #d9e8eb;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 12px 32px rgba(16, 36, 47, 0.08);
  }
  .screenshot-frame img {
    display: block;
    width: 100%;
    height: auto;
  }
  .proof-grid {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
  .proof-item {
    padding: 18px;
    border: 1px solid #dce9ec;
    border-radius: 8px;
    background: #ffffff;
  }
  .proof-item.bad { border-color: rgba(180, 35, 58, 0.28); }
  .proof-item.good { border-color: rgba(20, 125, 74, 0.28); }
  .proof-item pre {
    margin-top: 10px;
    white-space: pre-wrap;
    color: #10242f;
    font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
    font-size: 0.86rem;
    line-height: 1.55;
  }
  .developer-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  }
  .developer-grid article {
    text-align: center;
    padding: 18px;
    border-radius: 8px;
    background: #ffffff;
    border: 1px solid #dce9ec;
  }
  .accent-list {
    list-style: none;
    display: grid;
    gap: 8px;
    margin-top: 12px;
  }
  .accent-list li::before {
    content: "+";
    color: #ff3ea5;
    margin-right: 8px;
    font-weight: 900;
  }
  .btn-light {
    color: #ff3ea5;
    background: #ffffff;
  }
  body {
    color: #10242f;
    background: linear-gradient(180deg, #eefafa 0, #ffffff 430px, #f7fbfc 100%);
  }
  header {
    background: rgba(255, 255, 255, 0.92);
    border-bottom-color: rgba(16, 36, 47, 0.08);
  }
  .nav-links a:hover,
  .nav-links a.active {
    color: #0b7c83;
    background: rgba(11, 124, 131, 0.08);
  }
  h1,
  .section-title,
  .card h3,
  .panel h3 {
    color: #10242f;
  }
  .hero-copy,
  .lede,
  .section-copy,
  .card p,
  .panel p,
  .card li,
  .panel li {
    color: #5f7280;
  }
  .card,
  .panel {
    background: #ffffff;
    border-color: #dce9ec;
    box-shadow: 0 14px 38px rgba(16, 36, 47, 0.07);
  }
  .trust-chip {
    color: #48606f;
    border-color: #dce9ec;
    background: #ffffff;
  }
  .eyebrow {
    color: #0b7c83;
    border-color: #b8e2e3;
    background: #ffffff;
  }
  .final-cta {
    max-width: none;
    color: #ffffff;
    background: linear-gradient(135deg, #ff3ea5, #c83df0);
    padding-top: 56px;
    padding-bottom: 56px;
  }
  .final-cta h2,
  .final-cta p {
    color: #ffffff;
  }
  .final-cta .cta-row {
    justify-content: center;
  }
  @media (max-width: 840px) {
    .split-section,
    .hero-grid {
      grid-template-columns: 1fr;
    }
  }
  .pricing-grid {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  }
  .pricing-card { position: relative; }
  .pricing-card.featured {
    border-color: rgba(125, 211, 252, 0.36);
    background: linear-gradient(180deg, rgba(125, 211, 252, 0.08), rgba(10, 21, 32, 0.84));
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    border-radius: 999px;
    padding: 5px 10px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    border: 1px solid var(--line);
    color: #d5eaf9;
    background: rgba(255, 255, 255, 0.04);
  }
  .price {
    font-size: 1.8rem;
    line-height: 1;
    margin: 12px 0 4px;
    letter-spacing: -0.04em;
  }
  .price span { font-size: 0.9rem; color: var(--muted); }
  .feature-list {
    list-style: none;
    display: grid;
    gap: 10px;
    margin: 20px 0 24px;
  }
  .feature-list li::before {
    content: "✓";
    color: var(--success);
    margin-right: 10px;
  }
  .section-subnav {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
  }
  .section-subnav a {
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid var(--line);
    color: var(--muted);
    background: rgba(255, 255, 255, 0.03);
    font-size: 0.95rem;
    text-decoration: none;
  }
  .section-subnav a.active,
  .section-subnav a:hover {
    color: var(--text);
    border-color: rgba(143, 239, 255, 0.38);
    background: rgba(143, 239, 255, 0.1);
  }
  .download-grid {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
  .platform-status {
    display: grid;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: #ffffff;
    box-shadow: 0 14px 38px rgba(16, 36, 47, 0.07);
  }
  .platform-status-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
  }
  .platform-status-row:last-child { border-bottom: 0; }
  .status-available { color: #147d4a; font-weight: 700; }
  .status-unavailable { color: #5f7280; font-weight: 700; }
  .status-beta { color: #c27100; font-weight: 700; }
  .platform-card h3 { margin-top: 6px; }
  .note {
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.58;
  }
  .hash {
    font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
    font-size: 0.86rem;
    color: #d8f3ff;
    background: #06111a;
    border: 1px solid rgba(148, 163, 184, 0.13);
    border-radius: 14px;
    padding: 14px;
    overflow-x: auto;
    white-space: pre-wrap;
  }
  .info-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }
  .status-ok { color: #c6f6d5; }
  .status-warn { color: #fde68a; }
  form { display: grid; gap: 14px; }
  label { display: grid; gap: 8px; color: #dce9f5; font-weight: 600; }
  input, textarea, select {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 13px 14px;
    font: inherit;
  }
  textarea { min-height: 150px; resize: vertical; }
  .status-message {
    min-height: 24px;
    color: var(--muted);
    font-size: 0.95rem;
  }
  .status-message.success { color: #bbf7d0; }
  .status-message.error { color: #fecdd3; }
  footer {
    border-top: 1px solid var(--line);
    padding: 22px 24px 32px;
    color: var(--muted);
  }
  .footer-inner {
    max-width: var(--content);
    margin: 0 auto;
    display: flex;
    gap: 14px;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .footer-links {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .footer-links a {
    color: var(--muted);
    text-decoration: none;
  }
  .auth-container { max-width: 420px; margin: 0 auto; padding: 32px 24px; }
  .auth-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 24px; }
  .auth-title { font-size: 1.5rem; margin-bottom: 8px; text-align: center; }
  .auth-subtitle { color: var(--muted); text-align: center; margin-bottom: 28px; }
  .auth-divider { display: flex; align-items: center; gap: 16px; margin: 24px 0; color: var(--muted); font-size: 0.85rem; }
  .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: var(--line); }
  .password-requirements { font-size: 0.82rem; color: var(--muted); margin-top: 6px; }
  .password-requirements li { margin-bottom: 4px; }
  .password-requirements li.valid { color: var(--success); }
  .form-row { display: flex; gap: 12px; }
  .form-row > * { flex: 1; }
  .alert { padding: 14px 18px; border-radius: 12px; margin-bottom: 20px; font-size: 0.94rem; }
  .alert-error { background: rgba(251, 113, 133, 0.12); border: 1px solid rgba(251, 113, 133, 0.3); color: #fecdd3; }
  .alert-success { background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.3); color: #bbf7d0; }
  .alert-info { background: rgba(98, 246, 229, 0.12); border: 1px solid rgba(98, 246, 229, 0.3); color: #8fefff; }
  .user-menu { display: flex; align-items: center; gap: 12px; }
  .user-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #62f6e5, #ff4fd8); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; color: #08121b; }
  .user-email { color: var(--muted); font-size: 0.88rem; }
  @media (max-width: 860px) {
    nav { height: auto; padding-top: 16px; padding-bottom: 16px; align-items: flex-start; flex-direction: column; }
    .hero { padding-top: 40px; }
    h1 { max-width: 100%; }
    .hero-grid { grid-template-columns: 1fr; }
    .proof-demo { grid-template-columns: 1fr; }
    .logo-wordmark { height: 24px; }
  }
`

function navLink(href: string, label: string, active: SitePage, page: SitePage): string {
  const isActive = active === page
  return `<a href="${href}"${isActive ? ' class="active" aria-current="page"' : ''}>${label}</a>`
}

function navAccountLink(active: SitePage): string {
  const isActive = active === 'account'
  return `<a href="/account"${isActive ? ' class="active" aria-current="page"' : ''}>
    <span style="display:flex;align-items:center;gap:8px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      Account
    </span>
  </a>`
}

function robotsMetaForPath(path: string): string {
  const noindexPaths = new Set([
    '/account',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/success',
    '/feedback',
  ])
  if (noindexPaths.has(path)) return '<meta name="robots" content="noindex, nofollow">'
  return '<meta name="robots" content="index, follow">'
}

function renderRobotsTxt(origin: string): Response {
  const body = `User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /login\nDisallow: /register\nDisallow: /forgot-password\nDisallow: /reset-password\nDisallow: /success\n\nSitemap: ${origin}/sitemap.xml\n`
  const headers = rwHeaders()
  headers.set('Content-Type', 'text/plain; charset=utf-8')
  headers.set('Cache-Control', 'public, max-age=3600, must-revalidate')
  return new Response(body, { status: 200, headers })
}

function renderSitemapXml(origin: string): Response {
  const urls = [
    '/',
    '/products',
    '/beta',
    '/beta-feedback',
    '/pricing',
    '/download',
    '/docs',
    '/trust',
    '/support',
    '/matter-intelligence',
    '/matter-intelligence/pricing',
    '/matter-intelligence/security',
    '/matter-intelligence/demo',
    '/matter-intelligence/download',
    '/matter-intelligence/docs',
    '/matter-intelligence/contact',
    '/matter-intelligence/terms',
    '/matter-intelligence/privacy',
    '/docs',
    '/early-access',
    '/terms',
    '/privacy',
    '/agents',
  ]
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((pathname) => `  <url><loc>${origin}${pathname}</loc></url>`)
    .join('\n')}\n</urlset>\n`
  const headers = rwHeaders()
  headers.set('Content-Type', 'application/xml; charset=utf-8')
  headers.set('Cache-Control', 'public, max-age=3600, must-revalidate')
  return new Response(body, { status: 200, headers })
}

function pageViewEventForPath(path: string): SiteAnalyticsEvent | null {
  if (path === '/') return 'site_home_viewed'
  if (path === '/products') return 'site_products_viewed'
  if (path === '/pricing') return 'site_pricing_viewed'
  if (path === '/download') return 'site_download_viewed'
  return null
}

function matterIntelligenceSubnav(activePath: string): string {
  const items = [
    ['/matter-intelligence', 'Overview'],
    ['/matter-intelligence/pricing', 'Pricing'],
    ['/matter-intelligence/security', 'Security'],
    ['/matter-intelligence/demo', 'Demo'],
    ['/matter-intelligence/download', 'Download'],
  ] as const

  return `
    <div class="section-subnav" aria-label="Matter Intelligence section navigation">
      ${items
        .map(([href, label]) => {
          const active = href === activePath
          return `<a href="${href}"${active ? ' class="active" aria-current="page"' : ''}>${label}</a>`
        })
        .join('')}
    </div>
  `
}

function renderAnalyticsBootstrap(path: string): string {
  const pageEvent = pageViewEventForPath(path)
  return `
    <script>
      (function () {
        const pageEvent = ${JSON.stringify(pageEvent)};

        async function rwTrackEvent(event, properties) {
          try {
            await fetch('/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              keepalive: true,
              body: JSON.stringify({
                event,
                properties: properties || {},
                path: window.location.pathname,
                hostname: window.location.hostname,
                ts: Date.now(),
              }),
            });
          } catch {
            // Analytics is optional and should never block the main experience.
          }
        }

        window.rwTrackEvent = rwTrackEvent;

        if (pageEvent) {
          rwTrackEvent(pageEvent, {
            referrer: document.referrer ? 'present' : 'none',
          });
        }

        document.addEventListener('click', (event) => {
          const target = event.target instanceof Element ? event.target.closest('[data-analytics-event]') : null;
          if (!target) return;

          const name = target.getAttribute('data-analytics-event');
          if (!name) return;

          const properties = {};
          for (const attr of target.getAttributeNames()) {
            if (!attr.startsWith('data-analytics-prop-')) continue;
            const key = attr.slice('data-analytics-prop-'.length);
            properties[key] = target.getAttribute(attr) || '';
          }

          rwTrackEvent(name, properties);
        });
      })();
    </script>
  `
}

function renderPage(path: string, active: SitePage, hero: string, content: string, script = ''): Response {
  const seo = injectSeoTags(path)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#ff9b6b">
  <meta name="color-scheme" content="dark">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="msapplication-TileColor" content="#ff4fd8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <link rel="preconnect" href="https://pub-58c0b2f3cc8d43fa8cf6e1d4d2dcf94b.r2.dev" crossorigin>
  <link rel="preconnect" href="https://pub-4df343f1b4524762a4f8ad3c744653c9.r2.dev" crossorigin>
  ${seo}
  ${robotsMetaForPath(path)}
  <style>${SITE_STYLES}</style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="site-shell">
    <header>
      <nav aria-label="Main navigation">
        <a href="/" class="logo" aria-label="RinaWarp home">
          <img class="logo-wordmark" src="/assets/img/rinawarp-logo.png" alt="RinaWarp logo">
        </a>
        <div class="nav-links">
          ${navLink('/', 'Home', active, 'home')}
          ${navLink('/products', 'Products', active, 'products')}
          <a href="/matter-intelligence">Matter Intelligence</a>
          ${navLink('/pricing', 'Pricing', active, 'pricing')}
          ${navLink('/download', 'Download', active, 'download')}
          ${navLink('/docs', 'Docs', active, 'docs')}
          ${navLink('/trust', 'Trust', active, 'trust')}
          ${navLink('/agents', 'Agents', active, 'agents')}
          ${navLink('/support', 'Support', active, 'feedback')}
          ${navAccountLink(active)}
        </div>
      </nav>
    </header>
    <main id="main-content" tabindex="-1">
      ${hero}
      ${content}
    </main>
<footer>
       <div class="footer-inner">
         <div>© 2026 RinaWarp Technologies, LLC. One platform, two product surfaces.</div>
         <div class="footer-links">
           <a href="/products">Products</a>
           <a href="/docs">Docs</a>
           <a href="/pricing">Pricing</a>
           <a href="/download">Download</a>
           <a href="/trust">Trust</a>
           <a href="/support">Support</a>
           <a href="/terms">Terms</a>
           <a href="/privacy">Privacy</a>
         </div>
       </div>
     </footer>
  </div>
  ${renderAnalyticsBootstrap(path)}
  ${script ? `<script>${script}</script>` : ''}
</body>
</html>`

  const headers = rwHeaders()
  headers.set('Content-Type', 'text/html; charset=utf-8')
  headers.set('Cache-Control', 'public, max-age=120, must-revalidate')
  return new Response(html, { headers })
}

function renderHomepage(): Response {
  const hero = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-panel">
          <span class="eyebrow">RinaWarp Terminal Pro</span>
          <h1>Your project is broken. RinaWarp fixes it.</h1>
          <p class="hero-copy">Upload a repository. Let RinaWarp investigate, repair, verify, and explain every change.</p>
          <div class="cta-row">
            <a href="/download" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="home_hero" data-analytics-prop-target="download">Download Free</a>
            <a href="/#proof" class="btn btn-secondary btn-secondary-strong">Watch Demo</a>
          </div>
          <div class="trust-row">
            <span class="trust-chip">Real terminal output</span>
            <span class="trust-chip">Before-after repairs</span>
            <span class="trust-chip">Verification attached</span>
          </div>
        </div>
        <div class="terminal-preview" aria-label="Fix Project terminal preview">
          <div class="demo-windowbar">
            <span class="demo-dot"></span>
            <span class="demo-dot"></span>
            <span class="demo-dot"></span>
            <span>RinaWarp Terminal Pro</span>
          </div>
          <span class="terminal-line dim">&gt; npm run build</span>
          <span class="terminal-line fail">Module not found: react-scripts</span>
          <span class="terminal-line dim">&gt; rina fix</span>
          <span class="terminal-line ok">Installing missing dependency</span>
          <span class="terminal-line ok">Updating project config</span>
          <span class="terminal-line ok">Rebuilding project</span>
          <span class="terminal-line ok">Build successful</span>
          <div class="demo-proof">
            <div class="demo-proof-header">
              <span>Repair summary</span>
              <span class="demo-proof-tag">Confidence 94%</span>
            </div>
            <div class="demo-proof-lines">
              <span>What changed: installed react-scripts</span>
              <span>What worked: production build passed</span>
              <span>Receipt: proof attached to run output</span>
            </div>
          </div>
          <span class="terminal-caption">Show → Execute → Prove</span>
        </div>
      </div>
    </section>
  `

  const content = `
    <section class="section feature-band">
      <h2 class="section-title centered">What RinaWarp Can Do</h2>
      <p class="section-copy centered">Built for broken projects, failed builds, and messy dependency problems.</p>
      <div class="grid four-up">
        <article class="mini-card"><div class="mini-icon">A</div><h3>Analyze Repositories</h3><p>Find the dependency, config, and source errors blocking your project.</p></article>
        <article class="mini-card"><div class="mini-icon">R</div><h3>Repair Broken Builds</h3><p>Apply targeted fixes across files, package scripts, and project settings.</p></article>
        <article class="mini-card"><div class="mini-icon">V</div><h3>Verify Results</h3><p>Run builds and tests so success is proven in the terminal.</p></article>
        <article class="mini-card"><div class="mini-icon">E</div><h3>Explain Changes</h3><p>Show exactly what changed, why it changed, and how it was verified.</p></article>
      </div>
    </section>

    <section class="section split-section">
      <div class="terminal-preview" aria-label="Terminal Pro proof preview">
        <div class="demo-windowbar"><span class="demo-dot"></span><span class="demo-dot"></span><span class="demo-dot"></span><span>Repair proof</span></div>
        <span class="terminal-line dim">&gt; npm run build</span>
        <span class="terminal-line fail">Module not found: react-scripts</span>
        <span class="terminal-line dim">&gt; rina fix --verify</span>
        <span class="terminal-line ok">Installed missing dependency</span>
        <span class="terminal-line ok">Updated package scripts</span>
        <span class="terminal-line ok">Build successful</span>
      </div>
      <div class="step-list">
        <h2 class="section-title">Three Steps</h2>
        <article><span>1</span><div><h3>Scan</h3><p>Open the broken repo and let RinaWarp inspect the project, logs, config, and dependency state.</p></div></article>
        <article><span>2</span><div><h3>Fix</h3><p>Apply focused repairs to the files and settings that are actually causing the failure.</p></div></article>
        <article><span>3</span><div><h3>Verify</h3><p>Run the build, tests, or health checks and keep the proof attached to the repair.</p></div></article>
      </div>
    </section>

    <section id="proof" class="section proof-section">
      <h2 class="section-title centered">Before to After Repair Proof</h2>
      <p class="section-copy centered">Developers trust terminal output. Show the fix, then show the verification.</p>
      <div class="proof-grid">
        <article class="proof-item bad"><div class="kicker">Before</div><h3>React build</h3><pre>npm run build
Module not found: react-scripts</pre></article>
        <article class="proof-item good"><div class="kicker">After</div><h3>Build successful</h3><pre>Installed missing dependency
Updated package scripts
Build successful</pre></article>
        <article class="proof-item bad"><div class="kicker">Before</div><h3>TypeScript</h3><pre>error TS2322
Type 'string' is not assignable</pre></article>
        <article class="proof-item good"><div class="kicker">After</div><h3>Tests passing</h3><pre>Fixed type mismatch
Build successful
Tests passing</pre></article>
      </div>
    </section>

    <section class="section feature-band">
      <h2 class="section-title centered">Built for Developers</h2>
      <div class="developer-grid">
        <article><div class="soft-icon">R</div><h3>React</h3></article>
        <article><div class="soft-icon">TS</div><h3>TypeScript</h3></article>
        <article><div class="soft-icon">N</div><h3>Node</h3></article>
        <article><div class="soft-icon">Py</div><h3>Python</h3></article>
        <article><div class="soft-icon">Rs</div><h3>Rust</h3></article>
        <article><div class="soft-icon">Go</div><h3>Go</h3></article>
      </div>
    </section>

    <section class="section split-section">
      <div>
        <h2 class="section-title">Real Terminal Pro Interface</h2>
        <p class="section-copy">Use actual repair output, build logs, and product UI. No decorative robot art, no fake dashboards.</p>
        <ul class="accent-list">
          <li>Real terminal screenshots</li>
          <li>Build logs and verification output</li>
          <li>Before and after repair examples</li>
          <li>Readable explanations for every change</li>
        </ul>
      </div>
      <div class="terminal-preview" aria-label="Terminal Pro interface preview">
        <div class="demo-windowbar"><span class="demo-dot"></span><span class="demo-dot"></span><span class="demo-dot"></span><span>Terminal Pro</span></div>
        <span class="terminal-line dim">Repair report</span>
        <span class="terminal-line ok">Files changed: package.json</span>
        <span class="terminal-line ok">Verification: npm run build</span>
        <span class="terminal-line ok">Result: Build successful</span>
      </div>
    </section>

    <section class="section final-cta">
      <h2>Ready to stop debugging and start shipping?</h2>
      <p>Download Terminal Pro and fix the broken project blocking your next release.</p>
      <div class="cta-row">
        <a href="/download/" class="btn btn-light" data-analytics-event="site_download_clicked" data-analytics-prop-placement="home_final" data-analytics-prop-target="download">Download Terminal Pro</a>
      </div>
    </section>
  `

  return renderPage('/', 'home', hero, content)
}

function renderProducts(): Response {
  const hero = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-panel">
          <span class="eyebrow">Product hub</span>
          <h1>RinaWarp Products</h1>
          <p class="hero-copy">RinaWarp is growing into a two-product company. Each product has its own buyer, workflow, pricing, and trust story.</p>
          <div class="trust-row">
            <span class="trust-chip">Terminal Pro stays focused</span>
            <span class="trust-chip">Matter Intelligence stays separate</span>
            <span class="trust-chip">One brand, two revenue paths</span>
          </div>
        </div>
        <div class="hero-visual" aria-label="RinaWarp product family preview">
          <strong>Two product tracks. Two different buying moments.</strong>
          <div class="visual-stack">
            <div class="visual-card">
              <strong>Terminal Pro</strong>
              <span>Broken repo in. Verified repair out.</span>
            </div>
            <div class="visual-card">
              <strong>Matter Intelligence</strong>
              <span>Scattered evidence in. Cited answer and status memo out.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `

  const content = `
    <section class="section">
      <div class="duo-grid">
        <article class="product-showcase stack">
          <span class="pill">Developer product</span>
          <h2>RinaWarp Terminal Pro</h2>
          <p>Fix broken projects automatically.</p>
          <p>AI that reads your code, fixes issues, and verifies the result. Built for broken installs, failed builds, bad config, and crashed dev servers.</p>
          <div class="signal-grid">
            <div class="signal-card">
              <strong>What changed</strong>
              <p>Readable repair diff and execution narrative.</p>
            </div>
            <div class="signal-card">
              <strong>What worked</strong>
              <p>Builds, tests, and checks after the fix.</p>
            </div>
          </div>
          <div class="cta-row">
            <a href="/" class="btn btn-primary">View Terminal Pro</a>
            <a href="/pricing" class="btn btn-secondary">See pricing</a>
            <a href="/download" class="btn btn-secondary">Download</a>
          </div>
        </article>
        <article class="product-showcase stack">
          <span class="pill">Trust product</span>
          <h2>RinaWarp Matter Intelligence</h2>
          <p>Institutional memory for sensitive matters.</p>
          <p>AI for legal, finance, and compliance teams that connects matter documents, email, transcripts, obligations, and decisions into one evidence-grounded workspace.</p>
          <div class="signal-grid">
            <div class="signal-card">
              <strong>Ask any matter</strong>
              <p>Recover decisions, obligations, deadlines, and open risks.</p>
            </div>
            <div class="signal-card">
              <strong>See the evidence</strong>
              <p>Answers stay grounded in linked source material.</p>
            </div>
          </div>
          <div class="cta-row">
            <a href="/matter-intelligence" class="btn btn-primary">Explore Matter Intelligence</a>
            <a href="/matter-intelligence/demo" class="btn btn-secondary">Request demo</a>
          </div>
        </article>
      </div>
    </section>
  `

  return renderPage('/products', 'products', hero, content)
}

function renderMatterIntelligenceOverview(): Response {
  const hero = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-panel">
          <span class="eyebrow">RinaWarp Matter Intelligence</span>
          <h1>Institutional memory for sensitive matters.</h1>
          <p class="hero-copy">RinaWarp Matter Intelligence helps legal, finance, and compliance teams reconstruct what happened, what changed, what deadlines exist, and which evidence supports the answer.</p>
          <p class="lede">Connect Outlook and SharePoint. Open a matter. Ask a question. Get a cited answer and a draft status memo grounded in the source material.</p>
          <div class="cta-row">
            <a href="/matter-intelligence/demo" class="btn btn-primary">Request demo</a>
            <a href="/matter-intelligence/pricing" class="btn btn-secondary">See pricing</a>
          </div>
          <div class="trust-row">
            <span class="trust-chip">Source-linked answers</span>
            <span class="trust-chip">Matter-scoped memory</span>
            <span class="trust-chip">Reviewer-ready drafts</span>
          </div>
        </div>
        <div class="hero-visual" aria-label="Matter Intelligence evidence-grounded preview">
          <strong>Connected matter workspace</strong>
          <div class="visual-card">
            <strong>Question</strong>
            <p>What changed since the last review?</p>
          </div>
          <div class="visual-row">
            <div class="visual-card">
              <strong>Cited answer</strong>
              <span>Three new obligations, one approval, one missed date now visible.</span>
            </div>
            <div class="visual-card">
              <strong>Status memo</strong>
              <span>Draft recap generated with source-backed evidence references.</span>
            </div>
          </div>
          <div class="visual-card">
            <strong>Connected sources</strong>
            <span>Outlook mail, SharePoint files, notes, and timeline events.</span>
          </div>
        </div>
      </div>
      ${matterIntelligenceSubnav('/matter-intelligence')}
    </section>
  `

  const content = `
    <section class="section">
      <h2 class="section-title">What it does</h2>
      <div class="signal-grid">
        <article class="signal-card">
          <h3>Ask any matter</h3>
          <p>Find prior decisions, obligations, deadlines, approvals, and open risks in one place.</p>
        </article>
        <article class="signal-card">
          <h3>See the evidence</h3>
          <p>Every answer is grounded in source-linked documents, messages, and timeline events.</p>
        </article>
        <article class="signal-card">
          <h3>Generate reviewer-ready drafts</h3>
          <p>Create status memos and decision recaps with citations before anything leaves the workspace.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="duo-grid">
        <article class="product-showcase stack">
          <div class="kicker">Built for regulated workflows</div>
          <h2>Designed for teams where context loss is expensive.</h2>
          <ul class="feature-list">
            <li>Legal matters</li>
            <li>Finance investigations</li>
            <li>Internal compliance reviews</li>
            <li>Audit preparation</li>
            <li>Sensitive internal cases</li>
          </ul>
        </article>
        <article class="product-showcase stack">
          <div class="kicker">Why teams buy it</div>
          <h2>Keep the memory of the matter intact over time.</h2>
          <p>Sensitive work breaks when context is scattered. Matter Intelligence helps teams spend less time reconstructing history and more time making decisions with grounded evidence.</p>
          <div class="signal-grid">
            <div class="signal-card">
              <strong>Less reconstruction</strong>
              <p>Recover prior decisions without digging through disconnected folders and email threads.</p>
            </div>
            <div class="signal-card">
              <strong>More reviewer confidence</strong>
              <p>Generate draft memos that already point back to the underlying evidence.</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  `

  return renderPage('/matter-intelligence', 'products', hero, content)
}

function renderMatterIntelligencePricing(): Response {
  const hero = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-panel">
          <span class="eyebrow">Pricing</span>
          <h1>Pricing for Matter Intelligence</h1>
          <p class="hero-copy">Keep the purchase story simple: self-serve for solo use, guided setup for team workflows, and sales-led onboarding for enterprise trust requirements.</p>
          <div class="trust-row">
            <span class="trust-chip">Solo self-serve</span>
            <span class="trust-chip">Team guided setup</span>
            <span class="trust-chip">Enterprise trust controls</span>
          </div>
        </div>
        <div class="hero-visual" aria-label="Matter Intelligence pricing summary">
          <strong>Two go-to-market motions</strong>
          <div class="visual-row">
            <div class="visual-card">
              <strong>Solo</strong>
              <span>Self-serve monthly start for independent professionals.</span>
            </div>
            <div class="visual-card">
              <strong>Team / Enterprise</strong>
              <span>Founder-led setup for shared workspaces, governance, and rollout.</span>
            </div>
          </div>
        </div>
      </div>
      ${matterIntelligenceSubnav('/matter-intelligence/pricing')}
    </section>
  `

  const content = `
    <section class="section">
      <div class="grid three-up">
        <article class="card">
          <div class="kicker">Launch shape</div>
          <h3>Keep the offer intentionally narrow</h3>
          <p>Start with one matter, one connected workflow, one cited answer, and one status memo that proves the system works.</p>
        </article>
        <article class="card">
          <div class="kicker">Solo</div>
          <h3>Fastest path to revenue</h3>
          <p>Give independent professionals a clear monthly plan and a low-friction demo or trial start.</p>
        </article>
        <article class="card">
          <div class="kicker">Team</div>
          <h3>Sales-led when trust matters more</h3>
          <p>Use guided setup where shared workspace controls and deployment questions are part of the sale.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="pricing-grid">
        <article class="card pricing-card">
          <span class="pill">Solo</span>
          <div class="price">$99 <span>/ month</span></div>
          <p>For independent legal, finance, or compliance professionals working on sensitive matters.</p>
          <ul class="feature-list">
            <li>1 user</li>
            <li>Up to 25 active matters</li>
            <li>Outlook + SharePoint connectors</li>
            <li>Ask Matter</li>
            <li>Cited answers</li>
            <li>Status memo drafts</li>
          </ul>
          <a href="/matter-intelligence/demo" class="btn btn-primary">Start trial</a>
        </article>
        <article class="card pricing-card featured">
          <span class="pill">Team</span>
          <div class="price">$399 <span>/ month</span></div>
          <p>For small teams that need shared matter memory, reviewer workflows, and audit visibility.</p>
          <ul class="feature-list">
            <li>Up to 5 users</li>
            <li>Shared workspace</li>
            <li>Matter timeline</li>
            <li>Review queue</li>
            <li>Admin controls</li>
            <li>Audit log</li>
          </ul>
          <a href="/matter-intelligence/demo" class="btn btn-primary">Request setup</a>
        </article>
        <article class="card pricing-card">
          <span class="pill">Enterprise</span>
          <div class="price">Custom</div>
          <p>For teams that need SSO, private deployment, retention controls, or custom integrations.</p>
          <ul class="feature-list">
            <li>SSO</li>
            <li>Custom retention</li>
            <li>Advanced governance</li>
            <li>Private deployment options</li>
            <li>Priority support</li>
          </ul>
          <a href="/matter-intelligence/contact" class="btn btn-secondary">Talk to sales</a>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="duo-grid">
        <article class="panel stack">
          <div class="kicker">What customers are buying</div>
          <h2 class="section-title">Not generic AI. A matter-specific workflow with evidence.</h2>
          <p>Pricing works best when the scope is clear: connect the right sources, ask a matter question, get a cited answer, and draft a reviewer-ready memo.</p>
        </article>
        <article class="panel stack">
          <div class="kicker">Commercial design</div>
          <h2 class="section-title">Simple pricing outside, stronger controls inside.</h2>
          <p>Solo is simple enough to understand quickly. Team and Enterprise absorb the complexity of governance, rollout, and deployment without cluttering the core pricing table.</p>
        </article>
      </div>
    </section>
  `

  return renderPage('/matter-intelligence/pricing', 'products', hero, content)
}

function renderMatterIntelligenceSecurity(): Response {
  const hero = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-panel">
          <span class="eyebrow">Security and data handling</span>
          <h1>Designed for sensitive work.</h1>
          <p class="hero-copy">This page explains what data enters the system, what is stored, and how access is controlled.</p>
          <div class="trust-row">
            <span class="trust-chip">Matter-scoped access</span>
            <span class="trust-chip">Audit visibility</span>
            <span class="trust-chip">Retention controls</span>
          </div>
        </div>
        <div class="hero-visual" aria-label="Matter Intelligence security summary">
          <strong>Trust page, not hand-waving</strong>
          <div class="visual-stack">
            <div class="visual-card">
              <strong>Inputs</strong>
              <span>Outlook, SharePoint, notes, matter metadata, generated drafts.</span>
            </div>
            <div class="visual-card">
              <strong>Controls</strong>
              <span>Role-based permissions, exclusions, retention, deletion, audit logging.</span>
            </div>
          </div>
        </div>
      </div>
      ${matterIntelligenceSubnav('/matter-intelligence/security')}
    </section>
  `

  const content = `
    <section class="section">
      <div class="duo-grid">
        <article class="product-showcase stack">
          <h2>Data sources</h2>
          <ul class="feature-list">
            <li>Outlook mail and selected folders</li>
            <li>SharePoint files and selected libraries</li>
            <li>User-created matter notes and metadata</li>
            <li>Generated summaries and drafts</li>
          </ul>
        </article>
        <article class="product-showcase stack">
          <h2>Data controls</h2>
          <ul class="feature-list">
            <li>Matter-scoped access</li>
            <li>Role-based permissions</li>
            <li>Exclusion controls for folders, files, and fields</li>
            <li>Retention and deletion controls</li>
            <li>Audit logging for retrieval and generation actions</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="signal-grid">
        <article class="signal-card">
          <strong>Model usage</strong>
          <p>Generated responses are grounded in retrieved matter evidence. Customers should review outputs before relying on them.</p>
        </article>
        <article class="signal-card">
          <strong>Support</strong>
          <p>For security questions, contact <a href="mailto:security@rinawarptech.com">security@rinawarptech.com</a>.</p>
        </article>
      </div>
    </section>
  `

  return renderPage('/matter-intelligence/security', 'products', hero, content)
}

function renderMatterIntelligenceDemo(): Response {
  const hero = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-panel">
          <span class="eyebrow">Request demo</span>
          <h1>See one matter from source evidence to cited memo.</h1>
          <p class="hero-copy">The launch workflow is intentionally narrow: connect Outlook and SharePoint for one matter, ask what changed since last review, get a cited answer, and generate one status memo.</p>
          <div class="cta-row">
            <a href="mailto:hello@rinawarptech.com?subject=Matter%20Intelligence%20demo" class="btn btn-primary">Request demo</a>
            <a href="/matter-intelligence/contact" class="btn btn-secondary">Contact sales</a>
          </div>
        </div>
        <div class="hero-visual" aria-label="Matter Intelligence demo storyline">
          <strong>Launch demo flow</strong>
          <div class="visual-stack">
            <div class="visual-card">
              <strong>1. Connect sources</strong>
              <span>Outlook and SharePoint for one live matter.</span>
            </div>
            <div class="visual-card">
              <strong>2. Ask what changed</strong>
              <span>Recover obligations, approvals, and deadlines since last review.</span>
            </div>
            <div class="visual-card">
              <strong>3. Generate the memo</strong>
              <span>Produce a cited reviewer-ready status draft.</span>
            </div>
          </div>
        </div>
      </div>
      ${matterIntelligenceSubnav('/matter-intelligence/demo')}
    </section>
  `

  const content = `
    <section class="section">
      <div class="duo-grid">
        <article class="product-showcase stack">
          <h2>What we will show</h2>
          <ul class="feature-list">
            <li>Connect Outlook and SharePoint for one matter</li>
            <li>Ask what changed since last review</li>
            <li>See a cited answer grounded in retrieved evidence</li>
            <li>Generate one reviewer-ready status memo</li>
          </ul>
        </article>
        <article class="product-showcase stack">
          <h2>Book a demo</h2>
          <p>Send the team enough context to make the first conversation useful: your workflow, your team size, and whether you want Solo, Team, or Enterprise onboarding.</p>
          <form id="mi-demo-form">
            <label for="mi-demo-name">Name
              <input id="mi-demo-name" name="name" type="text" placeholder="Your name" required>
            </label>
            <label for="mi-demo-email">Email
              <input id="mi-demo-email" name="email" type="email" placeholder="you@company.com" required>
            </label>
            <label for="mi-demo-company">Company
              <input id="mi-demo-company" name="company" type="text" placeholder="Company or team name">
            </label>
            <label for="mi-demo-team-size">Team size
              <select id="mi-demo-team-size" name="teamSize">
                <option value="1">1</option>
                <option value="2-5">2-5</option>
                <option value="6-20">6-20</option>
                <option value="20+">20+</option>
              </select>
            </label>
            <label for="mi-demo-plan">Plan interest
              <select id="mi-demo-plan" name="planInterest">
                <option value="solo">Solo</option>
                <option value="team">Team</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label for="mi-demo-message">Workflow
              <textarea id="mi-demo-message" name="message" placeholder="What kind of matter workflow do you want to see?" required></textarea>
            </label>
            <button type="submit" class="btn btn-primary">Request demo</button>
            <p id="mi-demo-status" class="status-message" aria-live="polite"></p>
          </form>
          <div class="cta-row">
            <a href="mailto:hello@rinawarptech.com?subject=Matter%20Intelligence%20demo" class="btn btn-primary">Request demo</a>
            <a href="/matter-intelligence/contact" class="btn btn-secondary">Contact sales</a>
          </div>
        </article>
      </div>
    </section>
  `
  const script = `
    const demoForm = document.getElementById('mi-demo-form');
    const demoStatus = document.getElementById('mi-demo-status');
    demoForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      demoStatus.textContent = 'Sending demo request...';
      demoStatus.className = 'status-message';
      const formData = new FormData(demoForm);
      const payload = Object.fromEntries(formData);
      try {
        const response = await fetch('/api/matter-intelligence/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, requestType: 'demo', sourcePath: '/matter-intelligence/demo' }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Demo request could not be sent.');
        demoForm.reset();
        demoStatus.textContent = 'Thanks. Your demo request is in and the team will follow up.';
        demoStatus.className = 'status-message success';
      } catch (error) {
        demoStatus.textContent = error instanceof Error ? error.message : 'Demo request could not be sent.';
        demoStatus.className = 'status-message error';
      }
    });
  `

  return renderPage('/matter-intelligence/demo', 'products', hero, content, script)
}

function renderMatterIntelligenceDownload(): Response {
  const hero = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-panel">
          <span class="eyebrow">Access and download</span>
          <h1>Get access to Matter Intelligence.</h1>
          <p class="hero-copy">Matter Intelligence has its own access path. It is intentionally separate from the Terminal Pro installer and billing flow.</p>
          <div class="trust-row">
            <span class="trust-chip">Separate entitlement path</span>
            <span class="trust-chip">Guided onboarding</span>
            <span class="trust-chip">Workspace-first setup</span>
          </div>
        </div>
        <div class="hero-visual" aria-label="Matter Intelligence onboarding path">
          <strong>Access flow</strong>
          <div class="visual-stack">
            <div class="visual-card">
              <strong>Start</strong>
              <span>Trial, checkout, or founder-led setup.</span>
            </div>
            <div class="visual-card">
              <strong>Provision</strong>
              <span>Create workspace, assign members, and confirm entitlements.</span>
            </div>
            <div class="visual-card">
              <strong>Use</strong>
              <span>Connect Microsoft 365 and create the first matter.</span>
            </div>
          </div>
        </div>
      </div>
      ${matterIntelligenceSubnav('/matter-intelligence/download')}
    </section>
  `

  const content = `
    <section class="section">
      <div class="duo-grid">
        <article class="product-showcase stack">
          <h2>Current access model</h2>
          <p>Early customers are onboarded through a guided setup. That keeps account creation, entitlements, workspace creation, and connector setup aligned instead of mixing them with the Terminal Pro download path.</p>
          <div class="cta-row">
            <a href="/matter-intelligence/demo" class="btn btn-primary">Request demo</a>
            <a href="/matter-intelligence/contact" class="btn btn-secondary">Talk to sales</a>
          </div>
          <div class="cta-row">
            <a href="/matter-intelligence/pricing" class="btn btn-secondary" id="mi-start-solo">Start Solo checkout</a>
            <a href="/account" class="btn btn-secondary" id="mi-open-entitlements">Open account</a>
          </div>
        </article>
        <article class="product-showcase stack">
          <h2>What happens after approval</h2>
          <ul class="feature-list">
            <li>Account creation</li>
            <li>Billing or trial start</li>
            <li>Workspace creation</li>
            <li>Desktop access or onboarding instructions</li>
            <li>Microsoft 365 connector setup</li>
            <li>First matter created</li>
          </ul>
        </article>
      </div>
    </section>
  `
  const script = `
    const soloLink = document.getElementById('mi-start-solo');
    soloLink?.addEventListener('click', async (event) => {
      event.preventDefault();
      const email = window.prompt('Enter the billing email for your Matter Intelligence workspace:');
      if (!email) return;
      const response = await fetch('/api/matter-intelligence/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier: 'solo', product: 'matter-intelligence' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
        return;
      }
      window.alert(payload.error || 'Matter Intelligence checkout is not available right now.');
    });
  `

  return renderPage('/matter-intelligence/download', 'products', hero, content, script)
}

function renderMatterIntelligenceDocs(): Response {
  const hero = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-panel">
          <span class="eyebrow">Onboarding docs</span>
          <h1>Start with one matter and one trusted workflow.</h1>
          <p class="hero-copy">The first release is not a broad promise. It is a focused workflow for reconstructing what changed and generating one cited memo from connected matter evidence.</p>
          <div class="trust-row">
            <span class="trust-chip">Connect sources</span>
            <span class="trust-chip">Ask what changed</span>
            <span class="trust-chip">Draft with citations</span>
          </div>
        </div>
        <div class="hero-visual" aria-label="Matter Intelligence onboarding steps">
          <strong>First working session</strong>
          <div class="visual-stack">
            <div class="visual-card">
              <strong>Connect</strong>
              <span>Limit the sources to the exact folders and libraries that belong to the matter.</span>
            </div>
            <div class="visual-card">
              <strong>Review</strong>
              <span>Use one matter workspace to ask what changed and what now matters.</span>
            </div>
            <div class="visual-card">
              <strong>Draft</strong>
              <span>Generate one reviewer-ready status memo before anything leaves the workspace.</span>
            </div>
          </div>
        </div>
      </div>
      ${matterIntelligenceSubnav('')}
    </section>
  `

  const content = `
    <section class="section">
      <div class="signal-grid">
        <article class="signal-card">
          <div class="kicker">1. Connect sources</div>
          <h3>Outlook and SharePoint</h3>
          <p>Select the folders, libraries, and sources that belong to the matter you want to review.</p>
        </article>
        <article class="signal-card">
          <div class="kicker">2. Open the matter</div>
          <h3>Ask what changed</h3>
          <p>Use a single matter workspace to recover decisions, obligations, deadlines, and open risks without reconstructing history by hand.</p>
        </article>
        <article class="signal-card">
          <div class="kicker">3. Draft the memo</div>
          <h3>Review before anything leaves</h3>
          <p>Use the cited answer and draft status memo as a reviewer-ready starting point, not as an unchecked final output.</p>
        </article>
      </div>
    </section>
  `

  return renderPage('/matter-intelligence/docs', 'products', hero, content)
}

function renderMatterIntelligenceContact(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Contact</span>
      <h1>Talk to RinaWarp about Matter Intelligence.</h1>
      <p class="hero-copy">Use this route for sales, onboarding, security review, and deployment questions related to Matter Intelligence. Terminal Pro support stays on the main support path.</p>
      ${matterIntelligenceSubnav('')}
    </section>
  `

  const content = `
    <section class="section">
      <div class="duo-grid">
        <article class="product-showcase stack">
          <h2>Sales and onboarding</h2>
          <p>Use this form for pricing, rollout, and first-trial planning. Terminal Pro support should stay on the main support route.</p>
          <form id="mi-contact-form">
            <label for="mi-contact-name">Name
              <input id="mi-contact-name" name="name" type="text" placeholder="Your name" required>
            </label>
            <label for="mi-contact-email">Email
              <input id="mi-contact-email" name="email" type="email" placeholder="you@company.com" required>
            </label>
            <label for="mi-contact-company">Company
              <input id="mi-contact-company" name="company" type="text" placeholder="Company or department">
            </label>
            <label for="mi-contact-plan">Plan interest
              <select id="mi-contact-plan" name="planInterest">
                <option value="solo">Solo</option>
                <option value="team">Team</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label for="mi-contact-message">Message
              <textarea id="mi-contact-message" name="message" placeholder="Tell us about the workflow, deployment, or sales question." required></textarea>
            </label>
            <button type="submit" class="btn btn-primary">Send request</button>
            <p id="mi-contact-status" class="status-message" aria-live="polite"></p>
          </form>
        </article>
        <article class="product-showcase stack">
          <h2>Security review</h2>
          <p>Email <a href="mailto:security@rinawarptech.com?subject=Matter%20Intelligence%20security">security@rinawarptech.com</a> for data handling and security questions.</p>
          <div class="signal-grid">
            <div class="signal-card">
              <strong>Sales</strong>
              <p><a href="mailto:hello@rinawarptech.com?subject=Matter%20Intelligence%20sales">hello@rinawarptech.com</a></p>
            </div>
            <div class="signal-card">
              <strong>Security</strong>
              <p><a href="mailto:security@rinawarptech.com?subject=Matter%20Intelligence%20security">security@rinawarptech.com</a></p>
            </div>
          </div>
        </article>
      </div>
    </section>
  `
  const script = `
    const contactForm = document.getElementById('mi-contact-form');
    const contactStatus = document.getElementById('mi-contact-status');
    contactForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      contactStatus.textContent = 'Sending request...';
      contactStatus.className = 'status-message';
      const formData = new FormData(contactForm);
      const payload = Object.fromEntries(formData);
      try {
        const response = await fetch('/api/matter-intelligence/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, requestType: 'contact', sourcePath: '/matter-intelligence/contact' }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Request could not be sent.');
        contactForm.reset();
        contactStatus.textContent = 'Thanks. Your request is in and the team will follow up.';
        contactStatus.className = 'status-message success';
      } catch (error) {
        contactStatus.textContent = error instanceof Error ? error.message : 'Request could not be sent.';
        contactStatus.className = 'status-message error';
      }
    });
  `

  return renderPage('/matter-intelligence/contact', 'products', hero, content, script)
}

function renderMatterIntelligenceTerms(): Response {
  const hero = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-panel">
          <span class="eyebrow">Terms</span>
          <h1>Terms for RinaWarp Matter Intelligence.</h1>
          <p class="hero-copy">These terms apply to the Matter Intelligence product line and are separate from the Terminal Pro Early Access terms.</p>
        </div>
        <div class="hero-visual" aria-label="Matter Intelligence legal summary">
          <strong>Separate product terms</strong>
          <div class="visual-stack">
            <div class="visual-card">
              <strong>Professional use</strong>
              <span>Designed for legal, finance, compliance, and similar sensitive workflows.</span>
            </div>
            <div class="visual-card">
              <strong>Customer review still matters</strong>
              <span>Generated outputs should be reviewed before teams rely on them.</span>
            </div>
          </div>
        </div>
      </div>
      ${matterIntelligenceSubnav('')}
    </section>
  `

  const content = `
    <section class="section">
      <div class="duo-grid">
      <div class="product-showcase stack">
        <h2 class="section-title">Use of the product</h2>
        <p>RinaWarp Matter Intelligence is provided by <strong>RinaWarp Technologies, LLC</strong> for professional use in legal, finance, compliance, and related sensitive workflows. Customers are responsible for reviewing generated outputs before relying on them.</p>
      </div>
      <div class="product-showcase stack">
        <h2 class="section-title">Data and access</h2>
        <p>Access may be limited by workspace membership, product entitlements, trial status, and retention settings. Customers should configure access according to their internal approval and governance requirements.</p>
      </div>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Commercial terms</h2>
        <p>Billing, renewals, and deployment arrangements may vary by plan. Solo may be self-serve, while Team and Enterprise onboarding may be handled through direct setup with RinaWarp.</p>
      </div>
    </section>
  `

  return renderPage('/matter-intelligence/terms', 'products', hero, content)
}

function renderMatterIntelligencePrivacy(): Response {
  const hero = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-panel">
          <span class="eyebrow">Privacy</span>
          <h1>Privacy for RinaWarp Matter Intelligence.</h1>
          <p class="hero-copy">Matter Intelligence handles more sensitive workflows than Terminal Pro, so this page is intentionally product-specific.</p>
        </div>
        <div class="hero-visual" aria-label="Matter Intelligence privacy summary">
          <strong>Product-specific privacy</strong>
          <div class="visual-stack">
            <div class="visual-card">
              <strong>Scoped inputs</strong>
              <span>Only the sources and matter data the customer chooses to connect.</span>
            </div>
            <div class="visual-card">
              <strong>Operational use</strong>
              <span>Used for retrieval, generation, permissions, auditability, and retention workflows.</span>
            </div>
          </div>
        </div>
      </div>
      ${matterIntelligenceSubnav('')}
    </section>
  `

  const content = `
    <section class="section">
      <div class="duo-grid">
      <div class="product-showcase stack">
        <h2 class="section-title">What enters the system</h2>
        <p>Depending on customer configuration, Matter Intelligence may process Outlook mail, SharePoint files, matter notes, metadata, generated summaries, and workspace activity required to produce grounded responses.</p>
      </div>
      <div class="product-showcase stack">
        <h2 class="section-title">How it is used</h2>
        <p>Data is used to retrieve relevant matter evidence, generate cited answers and drafts, operate the workspace, enforce permissions, and support auditability and customer-requested retention controls.</p>
      </div>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Contact</h2>
        <p>Questions about Matter Intelligence privacy can be sent to <a href="mailto:security@rinawarptech.com">security@rinawarptech.com</a>.</p>
      </div>
    </section>
  `

  return renderPage('/matter-intelligence/privacy', 'products', hero, content)
}

function renderPricing(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Fix Project pricing</span>
      <h1>Plans mapped to real product access.</h1>
      <p class="hero-copy">Choose the level of repair, verification, and team control you need. Pricing stays focused on buying RinaWarp, not repeating the whole product tour.</p>
      <div class="trust-row">
        <span class="trust-chip">Free</span>
        <span class="trust-chip">One Fix</span>
        <span class="trust-chip">Pro</span>
        <span class="trust-chip">Team</span>
        <span class="trust-chip">Enterprise</span>
      </div>
    </section>
  `

  const content = `
    <section class="section">
      <div class="pricing-grid">
        <article class="card pricing-card">
          <span class="pill">Free</span>
          <div class="price">$0 <span>/ month</span></div>
          <p>Evaluate RinaWarp on a broken project before you pay.</p>
          <ul class="feature-list">
            <li>Chat with Rina</li>
            <li>Inspect workspace</li>
            <li>Limited build/test runs</li>
            <li>Local memory</li>
            <li>Limited proof history</li>
          </ul>
          <a href="/download" class="btn btn-secondary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="pricing_free" data-analytics-prop-target="download">Start free</a>
        </article>
        <article class="card pricing-card">
          <span class="pill">One Fix</span>
          <div class="price">$3 <span>/ repair</span></div>
          <p>Use one approval-gated repair when a single project is blocking you.</p>
          <ul class="feature-list">
            <li>One approval-gated repair</li>
            <li>Verification run</li>
            <li>Proof export</li>
          </ul>
          <button class="btn btn-secondary" data-checkout-tier="fix" type="button">Buy One Fix</button>
        </article>
        <article class="card pricing-card featured">
          <span class="pill">Pro</span>
          <div class="price">$15 <span>/ month</span></div>
          <p>For individual developers who want ongoing proof-backed repair work.</p>
          <ul class="feature-list">
            <li>Unlimited local proof-backed runs</li>
            <li>Safe mutation approvals</li>
            <li>Marketplace packs</li>
            <li>Proof export</li>
            <li>Local memory</li>
            <li>Priority updates</li>
          </ul>
          <button class="btn btn-primary" data-checkout-tier="pro" type="button">Start Pro</button>
        </article>
        <article class="card pricing-card">
          <span class="pill">Team</span>
          <div class="price">$40 <span>/ user / month</span></div>
          <p>Seat-based checkout for teams that need shared controls.</p>
          <ul class="feature-list">
            <li>Team seats</li>
            <li>Shared policy controls</li>
            <li>Shared project memory later</li>
            <li>Admin controls</li>
            <li>Shared proof history</li>
          </ul>
          <button class="btn btn-secondary" data-checkout-tier="team" type="button">Start Team</button>
        </article>
      </div>
    </section>

    <section class="section">
      <article class="panel stack">
        <h2 class="section-title">Secure checkout</h2>
        <p class="section-copy">Enter the email that should own the license, then choose One Fix, Pro, or Team.</p>
        <input id="checkout-email" type="email" placeholder="you@company.com" aria-label="Email for checkout" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,0.04);color:var(--text)">
        <div class="note" id="checkout-status" aria-live="polite">One Fix is $3. Pro is $15/month. Team is $40/user/month. Checkout opens in Stripe.</div>
      </article>
    </section>

    <section class="section"><div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>Feature</th><th>Free</th><th>One Fix</th><th>Pro</th><th>Team</th></tr></thead><tbody><tr><td>Workspace inspection</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td></tr><tr><td>Approval-gated repair</td><td class="mark-no">Limited</td><td class="mark-yes">1</td><td class="mark-yes">Unlimited</td><td class="mark-yes">Unlimited</td></tr><tr><td>Verification and proof export</td><td class="mark-no">Limited</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td></tr><tr><td>Marketplace packs</td><td class="mark-no">—</td><td class="mark-no">—</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td></tr><tr><td>Shared policy controls</td><td class="mark-no">—</td><td class="mark-no">—</td><td class="mark-no">—</td><td class="mark-yes">✓</td></tr></tbody></table></div></section>

    <section class="section">
      <article class="panel stack">
        <span class="pill">Enterprise</span>
        <h2 class="section-title">Need enterprise controls?</h2>
        <p class="section-copy">Enterprise adds SSO/SAML, custom model or BYOK options, audit logs, admin command policies, private marketplace access, and data retention controls.</p>
        <a href="/support" class="btn btn-secondary">Contact support</a>
      </article>
    </section>

    <section class="section">
      <h2 class="section-title">Quick answers before you buy</h2>
      <p class="section-copy">The practical questions people ask right before paying.</p>
      <div class="faq-grid">
        <article class="faq-item">
          <h3>Which plan should I choose?</h3>
          <p>Start with Free if you are evaluating one project. Choose Pro for ongoing individual repair work. Choose Team when multiple developers need seats.</p>
        </article>
        <article class="faq-item">
          <h3>Is there a one-time option?</h3>
          <p>Yes. One Fix is a single paid repair attempt without a subscription, meant for one-off blocked projects.</p>
        </article>
        <article class="faq-item">
          <h3>Can I cancel later?</h3>
          <p>Yes. Subscription billing is handled through Stripe and cancellation is available after purchase.</p>
        </article>
        <article class="faq-item">
          <h3>What has to work before access is production-grade?</h3>
          <p>Paid access depends on Stripe webhook signature verification, secure sessions, entitlement refresh, and license checks that do not fall back to a development user.</p>
        </article>
      </div>
    </section>
  `
  const script = `
    const emailInput = document.getElementById('checkout-email');
    const status = document.getElementById('checkout-status');
    const pricingParams = new URLSearchParams(window.location.search);
    const returnTo = pricingParams.get('return_to');
    document.querySelectorAll('[data-checkout-tier]').forEach((checkoutBtn) => {
      checkoutBtn.addEventListener('click', async () => {
        const email = emailInput?.value?.trim();
        const tier = checkoutBtn.getAttribute('data-checkout-tier') || 'pro';
        if (!email) {
          status.textContent = 'Add your email first so Stripe can create the checkout session.';
          emailInput?.focus();
          return;
        }
        status.textContent = 'Opening secure checkout…';
        checkoutBtn.disabled = true;
        try {
          if (typeof window.rwTrackEvent === 'function') {
            window.rwTrackEvent('checkout_started', {
              tier,
              placement: 'pricing',
            });
          }
          const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, tier, billingCycle: 'monthly', returnTo }),
          });
          const payload = await response.json();
          if (!response.ok || !payload.checkoutUrl) {
            throw new Error(payload.error || 'Checkout could not be created.');
          }
          window.location.href = payload.checkoutUrl;
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : 'Checkout could not be created.';
          checkoutBtn.disabled = false;
        }
      });
    });
  `

  return renderPage('/pricing', 'pricing', hero, content, script)
}

function renderTrust(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Trust & Safety</span>
      <h1>How RinaWarp keeps developer work inspectable.</h1>
      <p class="hero-copy">RinaWarp is built for real repositories, real commands, and real verification. The product should show what it inspected, ask before high-impact changes, and keep proof attached to every repair.</p>
      <div class="trust-row">
        <span class="trust-chip">Local-first execution</span>
        <span class="trust-chip">Approval before mutation</span>
        <span class="trust-chip">Proof-backed results</span>
      </div>
    </section>
  `

  const content = `
    <section class="section">
      <article class="panel stack">
        <span class="pill">Current production status</span>
        <h2 class="section-title">Linux production candidate. macOS and Windows pending.</h2>
        <p class="section-copy">The current public release is available for Linux as a checksum-verified .deb and AppImage. macOS and Windows are pending signed, notarized, and smoke-tested installers before they return to the download page.</p>
      </article>
    </section>
    <section class="section">
      <div class="grid three-up">
        <article class="card"><h3>Local-first execution</h3><p>RinaWarp runs developer work from the selected workspace and keeps repository inspection tied to the local project context.</p></article>
        <article class="card"><h3>Workspace boundaries</h3><p>Repairs should stay scoped to the project you opened. High-impact actions must be visible before they run.</p></article>
        <article class="card"><h3>Approval before mutation</h3><p>File changes, install steps, and risky commands should require clear approval instead of happening silently.</p></article>
      </div>
    </section>
    <section class="section">
      <div class="grid three-up">
        <article class="card"><h3>Rollback and recovery</h3><p>Repair work should preserve a recovery path so developers can understand and undo changes when a fix is not right.</p></article>
        <article class="card"><h3>Proof-backed results</h3><p>Build, test, and health-check output should stay attached to the repair so success is evidence-based.</p></article>
        <article class="card"><h3>Secret redaction</h3><p>Logs and telemetry should avoid secrets, tokens, file contents, command output, and private paths unless they are safely redacted or hashed.</p></article>
      </div>
    </section>
    <section class="section">
      <div class="grid two-up">
        <article class="panel stack"><h2 class="section-title">Memory and data controls</h2><p>Local memory should help RinaWarp remember project context without turning private code into a public profile. Cloud sync is optional, not the default. Developers should be able to export or delete saved memory.</p></article>
        <article class="panel stack"><h2 class="section-title">Marketplace permissions</h2><p>Capability packs need a manifest, publisher, version, permissions, risk level, install approval, disable control, changelog, and proof of what ran. Packs should not bypass Agent Thread, policy, execution, verification, and proof.</p></article>
      </div>
    </section>
    <section class="section">
      <div class="grid two-up">
        <article class="panel stack"><h2 class="section-title">Download verification</h2><p>Installers are linked through public release metadata and checksums. If the SHA256 checksum does not match the published file, do not run the installer.</p><a href="/download" class="btn btn-secondary">Verify downloads</a></article>
        <article class="panel stack"><h2 class="section-title">Privacy-safe telemetry</h2><p>RinaWarp should measure activation events like install, first launch, first scan, first proof, fix approval, proof export, marketplace install, memory saved, memory cleared, and crash report creation. It should not collect source files, terminal output, secrets, tokens, or private paths.</p><a href="/privacy" class="btn btn-secondary">Read privacy policy</a></article>
      </div>
    </section>
  `

  return renderPage('/trust', 'trust', hero, content)
}

function renderDocs(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Documentation</span>
      <h1>RinaWarp Terminal Pro docs</h1>
      <p class="hero-copy">Install, run your first repair, troubleshoot failures, and reference expected command behavior.</p>
    </section>
  `

  const content = `
    <section class="section">
      <nav class="docs-nav" aria-label="Documentation sections">
        <a href="#installation">Installation</a>
        <a href="#first-repair">First repair</a>
        <a href="#troubleshooting">Troubleshooting</a>
        <a href="#api-reference">API/reference</a>
      </nav>
    </section>
    <section class="section">
      <article id="installation" class="panel stack">
        <h2 class="section-title">Installation</h2>
        <ol class="signal-list">
          <li>Download <code>.deb</code> or AppImage from the download page.</li>
          <li>Verify SHA256 before install.</li>
          <li>Install the <code>.deb</code> on Debian/Ubuntu, or mark the AppImage executable and run it.</li>
          <li>Launch Terminal Pro and open your repository folder.</li>
        </ol>
      </article>
    </section>

    <section class="section">
      <article id="first-repair" class="panel stack">
        <h2 class="section-title">First repair</h2>
        <ol class="signal-list">
          <li><strong>Open the repo.</strong> Select the broken project root.</li>
          <li><strong>Click Fix Project.</strong> Rina scans dependencies, config, and build/test output.</li>
          <li><strong>Review the report.</strong> Read proposed file changes and the command plan.</li>
          <li><strong>Approve when prompted.</strong> High-impact steps pause until you confirm.</li>
          <li><strong>Verify.</strong> Confirm build, test, or boot checks show exit code 0.</li>
        </ol>
      </article>
    </section>

    <section class="section">
      <article id="troubleshooting" class="panel stack">
        <h2 class="section-title">Troubleshooting</h2>
        <h3>Build failures after repair</h3><p>Read the failing command in the terminal. One env var, flaky test, or remaining type error may need a narrower second pass.</p>
        <h3>Permission errors</h3><p>Ensure the workspace is writable and package managers are not blocked by sandboxed directories.</p>
        <h3>Broken install</h3><p>Re-verify checksums, try the other Linux artifact, or install missing GUI libraries on minimal images.</p>
      </article>
    </section>

    <section class="section">
      <article id="api-reference" class="panel stack">
        <h2 class="section-title">API/reference</h2>
        <div class="grid three-up">
          <article class="card"><h3>Repair commands</h3><p>RinaWarp favors project-scoped build, test, package, and diagnostic commands.</p></article>
          <article class="card"><h3>Exit codes</h3><p>A repair is complete only after the relevant command exits successfully and proof is visible.</p></article>
          <article class="card"><h3>Support data</h3><p>Include app version, platform, installer type, failing command, and a short workflow description.</p></article>
        </div>
      </article>
    </section>
  `

  return renderPage('/docs', 'docs', hero, content)
}

function renderSuccess(returnTo: string = '', sessionId: string = ''): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Checkout complete</span>
      <h1>Your purchase went through.</h1>
      <p class="hero-copy">The next step is simple: return to the product you came from and refresh your access so the new plan is visible.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="auth-container">
        <div class="auth-card">
          <h2 class="auth-title">What happens next</h2>
          <p class="auth-subtitle">If you started from the VS Code companion, use the return button below. If not, open your account and confirm your billing state there.</p>
          <div class="link-row">
            <a id="return-to-product" href="${returnTo || '/account'}" class="btn btn-primary">Return to VS Code</a>
            <a href="/account" class="btn btn-secondary">Open account</a>
          </div>
          <p class="note">If your paid tier does not appear immediately, use refresh inside the product after you return.</p>
          ${sessionId ? `<p class="note">Checkout session: <code>${sessionId}</code></p>` : ''}
        </div>
        <div class="auth-card">
          <h2 class="auth-title">Need help?</h2>
          <p class="auth-subtitle">If billing or restore state looks wrong, use the same billing email from checkout in the account restore flow or contact support.</p>
          <div class="link-row">
            <a href="/pricing" class="btn btn-secondary">See plans</a>
            <a href="/support" class="btn btn-secondary">Contact support</a>
          </div>
        </div>
      </div>
    </section>
  `

  const script = `
    const returnTo = ${JSON.stringify(returnTo)};
    const pendingReturnKey = 'rinawarp_pending_return_to';
    const returnBtn = document.getElementById('return-to-product');
    if (!returnTo && returnBtn) {
      returnBtn.textContent = 'Open account';
      returnBtn.setAttribute('href', '/account');
    }
  `

  return renderPage('/success', 'account', hero, content, script)
}

function renderCompanionPurchaseVerification(returnTo: string = ''): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Verification only</span>
      <h1>Test the Companion purchase return.</h1>
      <p class="hero-copy">This page does not create a Stripe charge. It exists only to verify that the VS Code purchase-complete callback returns cleanly and gives the user an honest next step.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="auth-container">
        <div class="auth-card">
          <h2 class="auth-title">No charge will happen here</h2>
          <p class="auth-subtitle">Use this only for release verification. It simulates the moment after a successful purchase return without touching live billing.</p>
          <div class="link-row">
            <a id="verify-return-to-product" href="${returnTo || '/account'}" class="btn btn-primary">Return to VS Code</a>
            <a href="/pricing" class="btn btn-secondary">Open live pricing</a>
          </div>
          <p class="note">If the browser does not switch back automatically, click <strong>Return to VS Code</strong>. Companion should then run the same purchase-complete flow it uses after a real checkout return.</p>
        </div>
        <div class="auth-card">
          <h2 class="auth-title">What this proves</h2>
          <ul class="signal-list">
            <li><strong>Callback plumbing.</strong> The browser can hand control back to the Companion purchase-complete callback.</li>
            <li><strong>Extension recovery messaging.</strong> Companion can refresh entitlements or tell the user what to do next.</li>
            <li><strong>No billing side effects.</strong> This page is isolated from live Stripe Checkout.</li>
          </ul>
        </div>
      </div>
    </section>
  `

  const script = `
    const returnTo = ${JSON.stringify(returnTo)};
    const returnBtn = document.getElementById('verify-return-to-product');
    if (!returnTo && returnBtn) {
      returnBtn.textContent = 'Open account';
      returnBtn.setAttribute('href', '/account');
    }

    if (returnTo) {
      setTimeout(() => {
        window.location.href = returnTo;
      }, 350);
    }
  `

  return renderPage('/verify/companion-purchase', 'account', hero, content, script)
}

function renderFeedback(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Support</span>
      <h1>Get help with RinaWarp.</h1>
      <p class="hero-copy">Contact, FAQ, known issues, and billing help in one support surface.</p>
    </section>
  `

  const content = `
    <section class="section">
      <h2 class="section-title">Contact</h2>
      <div class="grid three-up">
        <article class="card">
          <h3>Billing</h3>
          <p>Email <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>. Include your billing email and what changed.</p>
        </article>
        <article class="card">
          <h3>Technical</h3>
          <p>Send the app version, platform, installer type, failing command, and a short description of the workflow.</p>
        </article>
        <article class="card">
          <h3>Critical install issue</h3>
          <p>If the installer or checksum looks wrong, stop before running it and contact support.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">FAQ</h2>
      <div class="faq-grid">
        <article class="faq-item"><h3>My paid plan is not showing.</h3><p>Use the account restore flow with the billing email from checkout. If it still fails, email support with that billing email.</p></article>
        <article class="faq-item"><h3>The installer failed.</h3><p>Send the installer type, Linux distribution, error text, and whether the checksum matched.</p></article>
        <article class="faq-item"><h3>A repair did not work.</h3><p>Include the failing command, the expected result, and whether Terminal Pro showed verification output.</p></article>
        <article class="faq-item"><h3>I need billing help.</h3><p>Billing issues are handled through Stripe records and your billing email, not public referral or diagnostic tools.</p></article>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Known issues</h2>
        <ul class="signal-list">
          <li>Linux is the only public beta installer currently offered.</li>
          <li>Windows and macOS are not listed until signed, verified installers exist.</li>
          <li>Minimal Linux images may need GUI/runtime packages before AppImage starts cleanly.</li>
          <li>Package registry or network failures can block repair verification even when the code fix is correct.</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <div class="panel">
        <h2 class="section-title">Send feedback</h2>
        <p class="section-copy">This form sends directly to the team. We’ll never show a fake success if the submission fails.</p>
        <form id="feedback-form">
          <label for="name">Name
            <input type="text" id="name" name="name" placeholder="Your name" required>
          </label>
          <label for="email">Email
            <input type="email" id="email" name="email" placeholder="you@rinawarptech.com" required>
          </label>
          <label for="rating">Rating
            <select id="rating" name="rating">
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Okay</option>
              <option value="2">2 - Rough</option>
              <option value="1">1 - Broken</option>
            </select>
          </label>
          <label for="message">Message
            <textarea id="message" name="message" placeholder="What happened, and what should RinaWarp Terminal Pro have done instead?" required></textarea>
          </label>
          <button type="submit" class="btn btn-primary">Send feedback</button>
          <p id="feedback-status" class="status-message" aria-live="polite"></p>
        </form>
      </div>
    </section>
  `

  const script = `
    const form = document.getElementById("feedback-form");
    const status = document.getElementById("feedback-status");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "Sending feedback...";
      status.className = "status-message";
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || "Feedback could not be sent.");
        }
        form.reset();
        status.textContent = "Thanks. Your message is in and we’ll use it to improve the product.";
        status.className = "status-message success";
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "Feedback could not be sent right now. Please email support@rinawarptech.com.";
        status.className = "status-message error";
      }
    });
  `

  return renderPage('/support', 'feedback', hero, content, script)
}

function renderBetaSignup(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Terminal Pro beta</span>
      <h1>Join the RinaWarp Terminal Pro Beta</h1>
      <p class="hero-copy">RinaWarp Terminal Pro is a conversational AI copilot for real developer work with memory, controlled execution, and proof attached to every meaningful run.</p>
      <div class="hero-actions">
        <a href="#signup" class="btn btn-primary">Apply to test</a>
        <a href="/docs" class="btn btn-secondary">Read tester docs</a>
      </div>
      <p class="hero-support">Linux is production-candidate validated. macOS and Windows are unsigned beta previews.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Current beta status</h2>
        <p>RinaWarp Terminal Pro v1.8.2 beta now has Linux, macOS, and Windows beta artifacts. Linux is production-candidate validated. macOS and Windows builds are unsigned beta previews and may require OS security bypass steps. Production builds will be signed and notarized before full public release.</p>
      </div>
    </section>

    <section class="section">
      <div class="grid three-up">
        <article class="card"><h3>What you will test</h3><p>Select a real workspace, ask RinaWarp to build the project and explain what fails, then confirm proof appears.</p></article>
        <article class="card"><h3>What we need to learn</h3><p>Whether testers can install, reach first proof, export proof, reopen the app, and understand safe-fix approval.</p></article>
        <article class="card"><h3>What not to send</h3><p>Do not submit secrets, tokens, private keys, raw source code, private terminal output, or confidential file contents.</p></article>
      </div>
    </section>

    <section id="signup" class="section">
      <div class="panel stack">
        <h2 class="section-title">Beta signup</h2>
        <p class="section-copy">Tell us what platform and project type you can test. We will use this to match testers to the right unsigned beta artifact and checklist.</p>
        <form id="beta-signup-form">
          <label for="beta-name">Name
            <input type="text" id="beta-name" name="name" placeholder="Your name" required>
          </label>
          <label for="beta-email">Email
            <input type="email" id="beta-email" name="email" placeholder="you@company.com" required>
          </label>
          <label for="beta-os">OS
            <select id="beta-os" name="os" required>
              <option value="">Choose one</option>
              <option value="linux">Linux</option>
              <option value="macos">macOS</option>
              <option value="windows">Windows</option>
              <option value="multiple">Multiple platforms</option>
            </select>
          </label>
          <label for="beta-stack">Developer stack
            <input type="text" id="beta-stack" name="stack" placeholder="Node/TypeScript, Python, Go, Rust, monorepo..." required>
          </label>
          <label for="beta-project">Do you have a project to test with?
            <select id="beta-project" name="projectAvailable" required>
              <option value="">Choose one</option>
              <option value="yes-real-project">Yes, a real project</option>
              <option value="yes-broken-project">Yes, a broken project</option>
              <option value="sample-project">Only a sample project</option>
              <option value="not-yet">Not yet</option>
            </select>
          </label>
          <label for="beta-unsigned">Are you comfortable testing unsigned beta builds?
            <select id="beta-unsigned" name="unsignedComfort" required>
              <option value="">Choose one</option>
              <option value="yes">Yes</option>
              <option value="with-instructions">Yes, with clear bypass instructions</option>
              <option value="linux-only">Only on Linux</option>
              <option value="no">No</option>
            </select>
          </label>
          <button type="submit" class="btn btn-primary">Join beta list</button>
          <p id="beta-signup-status" class="status-message" aria-live="polite"></p>
        </form>
      </div>
    </section>
  `

  const script = `
    const form = document.getElementById("beta-signup-form");
    const status = document.getElementById("beta-signup-status");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const message = [
        "Beta signup request",
        "",
        "OS: " + String(data.os || ""),
        "Developer stack: " + String(data.stack || ""),
        "Project to test with: " + String(data.projectAvailable || ""),
        "Comfortable with unsigned builds: " + String(data.unsignedComfort || ""),
      ].join("\\n");

      status.textContent = "Sending beta signup...";
      status.className = "status-message";
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            topic: "beta-signup",
            rating: "5",
            message,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || "Beta signup could not be sent.");
        }
        form.reset();
        status.textContent = "Thanks. You are on the beta tester list.";
        status.className = "status-message success";
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "Beta signup could not be sent right now. Please email support@rinawarptech.com.";
        status.className = "status-message error";
      }
    });
  `

  return renderPage('/beta', 'beta', hero, content, script)
}

function renderBetaFeedback(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Beta feedback</span>
      <h1>Tell us if Terminal Pro reached first proof.</h1>
      <p class="hero-copy">This form is for beta testers after they install RinaWarp Terminal Pro, select a workspace, run the first proof-backed workflow, and try the safe-fix approval path.</p>
      <div class="hero-actions">
        <a href="#feedback" class="btn btn-primary">Submit feedback</a>
        <a href="/beta" class="btn btn-secondary">Join beta</a>
      </div>
      <p class="hero-support">Do not include secrets, tokens, private keys, raw source code, private terminal output, or confidential file contents.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="grid three-up">
        <article class="card"><h3>Install</h3><p>Tell us whether the artifact opened, whether security warnings were clear, and which platform you tested.</p></article>
        <article class="card"><h3>First proof</h3><p>Record whether you selected a workspace, generated proof, exported it, and saw persistence after restart.</p></article>
        <article class="card"><h3>Trust signal</h3><p>Share whether safe-fix approval made sense, what felt confusing, and whether you would use or pay for this.</p></article>
      </div>
    </section>

    <section id="feedback" class="section">
      <div class="panel stack">
        <h2 class="section-title">Beta feedback intake</h2>
        <p class="section-copy">Use this after a real test session. Short, specific answers are more useful than long logs.</p>
        <form id="beta-feedback-form">
          <label for="feedback-name">Name
            <input type="text" id="feedback-name" name="name" placeholder="Your name" required>
          </label>
          <label for="feedback-email">Email
            <input type="email" id="feedback-email" name="email" placeholder="you@company.com" required>
          </label>
          <label for="feedback-os">OS
            <select id="feedback-os" name="os" required>
              <option value="">Choose one</option>
              <option value="linux">Linux</option>
              <option value="macos">macOS</option>
              <option value="windows">Windows</option>
              <option value="multiple">Multiple platforms</option>
            </select>
          </label>
          <label for="feedback-artifact">Artifact used
            <input type="text" id="feedback-artifact" name="artifact" placeholder="AppImage, deb, macOS DMG, macOS ZIP, Windows installer" required>
          </label>
          <label for="feedback-install">Install success
            <select id="feedback-install" name="installSuccess" required>
              <option value="">Choose one</option>
              <option value="yes">Yes</option>
              <option value="with-help">Yes, with help</option>
              <option value="blocked">No, blocked</option>
            </select>
          </label>
          <label for="feedback-security">Security warning experience
            <textarea id="feedback-security" name="securityWarning" placeholder="Gatekeeper, SmartScreen, Linux permission prompt, or no warning" required></textarea>
          </label>
          <label for="feedback-workspace">Workspace selected
            <select id="feedback-workspace" name="workspaceSelected" required>
              <option value="">Choose one</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label for="feedback-proof">First proof generated
            <select id="feedback-proof" name="firstProofGenerated" required>
              <option value="">Choose one</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label for="feedback-proof-time">Time to first proof
            <input type="text" id="feedback-proof-time" name="timeToFirstProof" placeholder="Example: 4 minutes, or blocked before proof" required>
          </label>
          <label for="feedback-export">Proof exported
            <select id="feedback-export" name="proofExported" required>
              <option value="">Choose one</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="not-found">Could not find export</option>
            </select>
          </label>
          <label for="feedback-persistence">Restart persistence
            <select id="feedback-persistence" name="restartPersistence" required>
              <option value="">Choose one</option>
              <option value="worked">Worked</option>
              <option value="partial">Partially worked</option>
              <option value="failed">Failed</option>
              <option value="not-tested">Not tested</option>
            </select>
          </label>
          <label for="feedback-safe-fix">Safe-fix approval understood
            <select id="feedback-safe-fix" name="safeFixUnderstood" required>
              <option value="">Choose one</option>
              <option value="yes">Yes</option>
              <option value="mostly">Mostly</option>
              <option value="no">No</option>
              <option value="not-tested">Not tested</option>
            </select>
          </label>
          <label for="feedback-confusing">Confusing UI moments
            <textarea id="feedback-confusing" name="confusingMoments" placeholder="What slowed you down or made you uncertain?"></textarea>
          </label>
          <label for="feedback-errors">Crashes/errors
            <textarea id="feedback-errors" name="crashesErrors" placeholder="What happened? Do not paste private logs or source code."></textarea>
          </label>
          <label for="feedback-use">Would use again
            <select id="feedback-use" name="wouldUseAgain" required>
              <option value="">Choose one</option>
              <option value="yes">Yes</option>
              <option value="maybe">Maybe</option>
              <option value="no">No</option>
            </select>
          </label>
          <label for="feedback-pay">Would pay
            <select id="feedback-pay" name="wouldPay" required>
              <option value="">Choose one</option>
              <option value="yes">Yes</option>
              <option value="maybe">Maybe</option>
              <option value="no">No</option>
            </select>
          </label>
          <label for="feedback-notes">Additional notes
            <textarea id="feedback-notes" name="additionalNotes" placeholder="Anything else we should know?"></textarea>
          </label>
          <button type="submit" class="btn btn-primary">Send beta feedback</button>
          <p id="beta-feedback-status" class="status-message" aria-live="polite"></p>
        </form>
      </div>
    </section>
  `

  const script = `
    const form = document.getElementById("beta-feedback-form");
    const status = document.getElementById("beta-feedback-status");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const message = [
        "Beta feedback report",
        "",
        "OS: " + String(data.os || ""),
        "Artifact used: " + String(data.artifact || ""),
        "Install success: " + String(data.installSuccess || ""),
        "Security warning experience: " + String(data.securityWarning || ""),
        "Workspace selected: " + String(data.workspaceSelected || ""),
        "First proof generated: " + String(data.firstProofGenerated || ""),
        "Time to first proof: " + String(data.timeToFirstProof || ""),
        "Proof exported: " + String(data.proofExported || ""),
        "Restart persistence: " + String(data.restartPersistence || ""),
        "Safe-fix approval understood: " + String(data.safeFixUnderstood || ""),
        "Confusing UI moments: " + String(data.confusingMoments || ""),
        "Crashes/errors: " + String(data.crashesErrors || ""),
        "Would use again: " + String(data.wouldUseAgain || ""),
        "Would pay: " + String(data.wouldPay || ""),
        "Additional notes: " + String(data.additionalNotes || ""),
      ].join("\\n");

      status.textContent = "Sending beta feedback...";
      status.className = "status-message";
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            topic: "beta-feedback",
            rating: data.firstProofGenerated === "yes" ? "5" : "3",
            message,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || "Beta feedback could not be sent.");
        }
        form.reset();
        status.textContent = "Thanks. Your beta feedback is in.";
        status.className = "status-message success";
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "Beta feedback could not be sent right now. Please email support@rinawarptech.com.";
        status.className = "status-message error";
      }
    });
  `

  return renderPage('/beta-feedback', 'beta-feedback', hero, content, script)
}

function renderTerms(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Terms</span>
      <h1>Terms for RinaWarp Terminal Pro Early Access.</h1>
      <p class="hero-copy">These terms are intentionally plain, but specific enough for real purchase decisions and high-impact desktop workflows.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Use of the product</h2>
        <p>RinaWarp Terminal Pro is provided by <strong>RinaWarp Technologies, LLC</strong> for professional and personal workflow use. You are responsible for reviewing outputs, especially for builds, deploys, file changes, and other high-impact actions.</p>
        <p>Early Access access may change as the product evolves. We may improve, remove, or harden features as part of normal product development.</p>
        <p>You remain responsible for your repositories, infrastructure, secrets, and release decisions. RinaWarp assists execution but does not replace human review for production-impact actions.</p>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Billing and subscriptions</h2>
        <p>Paid access is currently sold as an Early Access subscription. Billing is handled through Stripe. If billing is canceled or payment fails, paid features may be limited or removed at the end of the applicable billing period.</p>
        <p>Subscriptions renew automatically until canceled. You can manage billing through the account portal. If something goes wrong with billing or entitlement state, contact <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a> and include the billing email used at checkout.</p>
        <p>Refund handling is case-by-case during Early Access. Cancellation stops future renewals and paid features remain available through the current paid period unless otherwise stated in writing.</p>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Acceptable use and restrictions</h2>
        <p>Do not use RinaWarp for unlawful activity, credential theft, malware operations, unauthorized system access, or abuse of third-party services.</p>
        <p>You may not attempt to bypass entitlement checks, tamper with update or licensing flows, or use the product to violate contracts or legal obligations tied to customer or employer systems.</p>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Warranties, liability, support, and termination</h2>
        <p>The product is provided “as is” and “as available” to the maximum extent allowed by law. We do not guarantee uninterrupted operation or that every suggested action is correct for your environment.</p>
        <p>To the maximum extent allowed by law, RinaWarp Technologies, LLC is not liable for indirect, incidental, special, consequential, or punitive damages, or for lost revenue, data, or goodwill from product use.</p>
        <p>Early Access support is provided on a reasonable-effort basis. We aim to be responsive and honest, but we do not promise enterprise-grade response times yet.</p>
        <p>We may suspend or terminate access for abuse, fraud, non-payment, or security risk. Continued use after policy updates means you accept the updated terms.</p>
      </div>
    </section>
  `

  return renderPage('/terms', 'legal', hero, content)
}

function renderPrivacy(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Privacy</span>
      <h1>Privacy and product data.</h1>
      <p class="hero-copy">RinaWarp should feel trustworthy in execution and in data handling. This page defines what is local, what can be sent off-device, and why.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">What we collect</h2>
        <p>We may collect billing information through Stripe, support and feedback submissions you send to us, and limited product telemetry needed to understand reliability, updates, and launch issues.</p>
        <p>We do not market the product as a hidden-memory or “store everything forever” system. Early Access personalization should remain explicit, inspectable, and owner-controlled.</p>
        <p>Website analytics may include page views, referrers, and interaction events. Desktop telemetry may include app version, platform, high-level workflow state, and error diagnostics required to improve reliability.</p>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Desktop execution and telemetry scope</h2>
        <p>Terminal Pro runs commands on your machine in your local environment. Command execution, file operations, and subprocesses happen where you run the app unless a specific cloud workflow is explicitly triggered.</p>
        <p>Telemetry is intended to capture product health and workflow outcomes, not full repository content. Support bundles or diagnostics are only transmitted when you intentionally submit them.</p>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">How we use and retain data</h2>
        <p>We use information to operate the service, process billing, restore access, respond to support requests, improve reliability, and understand where the product is failing or succeeding.</p>
        <p>If you send diagnostics or feedback, we may use that information to debug issues and improve the product. We retain data for as long as needed for operations, legal obligations, support continuity, and abuse prevention, then delete or anonymize where practical.</p>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Processors, transfers, and updates</h2>
        <p>Stripe processes billing data for payments and subscriptions. Infrastructure and analytics providers may process operational metadata on our behalf under contractual controls.</p>
        <p>Data may be processed in countries outside your home jurisdiction. If we materially change this policy, we will update this page and change the effective date in site deployment notes.</p>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Your rights and contact</h2>
        <p>You can request access, correction, or deletion of personal data we control, subject to legal and operational constraints. Questions about privacy, billing, or support can be sent to <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>.</p>
      </div>
    </section>
  `

  return renderPage('/privacy', 'legal', hero, content)
}

function renderEarlyAccess(version?: string): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Early Access policy</span>
      <h1>What Early Access means here.</h1>
      <p class="hero-copy">Early Access should never be a vague excuse. It means the product is real, paid, and supportable, but some platform, update, and workflow edges are still being tightened in public.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="panel stack">
        <div class="card trust-note">
          <h3>Current Early Access release</h3>
          <p><strong>${version || 'Current live release'}</strong> is the current public release. Linux and Windows installers, release metadata, and checksums are tied to the same live bundle.</p>
        </div>
        <div class="link-row">
          <a href="/pricing" class="btn btn-primary">See pricing</a>
          <a href="/download" class="btn btn-secondary">Download Terminal Pro</a>
          <a href="/support" class="btn btn-secondary">Contact support</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="grid three-up">
        <article class="card">
          <h3>What is stable enough now</h3>
          <p>Core trust, proof, recovery, and conversational workflow are real. Linux and Windows releases are being validated against clean-machine install paths, and the website routes are tied to live release metadata.</p>
        </article>
        <article class="card">
          <h3>What is still intentionally limited</h3>
          <p>macOS is not launched yet. Windows signing is still a follow-up trust investment. Automatic updates are still being validated as a real installed-build pipeline, so manual download remains the safest default expectation until that validation is fully complete.</p>
        </article>
        <article class="card">
          <h3>How billing and restore work</h3>
          <p>Early Access access is anchored to your billing email and the restore path in the app/account flow. If access drifts, use restore first, then contact support and we can recover it from the billing record without making you guess.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Refunds, cancellations, and updates</h2>
        <p>If you need help with cancellation, billing questions, or a reasonable launch-stage refund request, contact <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>. We would rather handle issues clearly than let a billing problem damage trust.</p>
        <p>Until the updater path is fully proven across installed builds, treat the canonical website download and published checksums as the safest release surface.</p>
      </div>
    </section>
  `

  return renderPage('/early-access', 'legal', hero, content)
}

async function renderDownload(env: any, origin: string): Promise<Response> {
  void env
  const publicBeta = buildGitHubBetaReleaseSummary()
  const linuxAppImageUrl = publicBeta.downloads.linux || primaryDownloadUrl(origin, 'linux')
  const linuxDebUrl = publicBeta.downloads.deb || primaryDownloadUrl(origin, 'linux/deb')
  const checksumsUrl = `${BETA_RELEASE_DOWNLOAD_BASE}/SHASUMS256.txt`
  const latestJsonUrl = publicBeta.manifestUrl
  const latestYmlUrl = `${BETA_RELEASE_DOWNLOAD_BASE}/latest.yml`
  const latestLinuxYmlUrl = `${BETA_RELEASE_DOWNLOAD_BASE}/latest-linux.yml`
  const hero = `
    <section class="hero">
      <span class="eyebrow">Download</span>
      <h1>Download RinaWarp Terminal Pro.</h1>
      <p class="hero-copy">Get the current release for Linux, verify the checksum, and install Terminal Pro. macOS and Windows beta previews are also available (unsigned builds pending signing).</p>
      <div class="hero-actions">
        <a href="${linuxDebUrl}" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_hero" data-analytics-prop-platform="linux" data-analytics-prop-artifact="deb">Download Linux .deb</a>
        <a href="${linuxAppImageUrl}" class="btn btn-secondary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_hero" data-analytics-prop-platform="linux" data-analytics-prop-artifact="appimage">Download AppImage</a>
      </div>
      <p class="hero-support">Version ${publicBeta.version} · Linux production candidate · macOS/Windows unsigned beta preview · <a href="${checksumsUrl}">Verify SHA256</a></p>
    </section>
  `

  const content = `
    <section class="section">
      <h2 class="section-title">Current release — platform availability</h2>
      <div class="platform-status">
        <div class="platform-status-row"><span>Linux</span><span class="status-available">Available (.deb + AppImage)</span></div>
        <div class="platform-status-row"><span>Windows</span><span class="status-beta">Unsigned beta preview — signing pending</span></div>
        <div class="platform-status-row"><span>macOS</span><span class="status-beta">Unsigned beta preview — signing pending</span></div>
      </div>
    </section>

    <section class="section">
      <div class="download-grid">
        <article class="card platform-card">
          <span class="pill">Linux .deb</span>
          <h3>Debian and Ubuntu</h3>
          <p>Use the <code>.deb</code> for the simplest manual install path on Debian or Ubuntu desktops. Update later by installing the next published <code>.deb</code>.</p>
        </article>
        <article class="card platform-card">
          <span class="pill">Linux AppImage</span>
          <h3>Portable Linux install</h3>
          <p>Use AppImage when you want a portable Linux app path and future in-app update behavior.</p>
        </article>
        <article class="card platform-card">
          <span class="pill">Windows</span>
          <h3>Unsigned beta preview — signing pending</h3>
          <p>Beta builds may be unsigned and require OS security bypass steps. Production builds will be signed and notarized where applicable.</p>
          <ul class="signal-list">
            <li>If SmartScreen blocks the installer, click "More info" → "Run anyway"</li>
            <li>These builds are for validation testing only</li>
          </ul>
          <div class="link-row">
            <a href="/support/" class="btn btn-secondary">Windows download</a>
          </div>
        </article>
        <article class="card platform-card">
          <span class="pill">macOS</span>
          <h3>Unsigned beta preview — signing pending</h3>
          <p>Beta builds may be unsigned and require OS security bypass steps. Production builds will be signed and notarized where applicable.</p>
          <ul class="signal-list">
            <li>If Gatekeeper blocks, right-click the app and select "Open"</li>
            <li>These builds are for validation testing only</li>
          </ul>
          <div class="link-row">
            <a href="/support" class="btn btn-secondary">macOS download</a>
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">System requirements</h2>
        <ul class="signal-list">
          <li>Linux desktop environment for this public beta</li>
          <li>Debian/Ubuntu for the <code>.deb</code> installer, or AppImage-capable Linux desktop</li>
          <li>4 GB RAM minimum; 8 GB+ recommended for large repositories</li>
          <li>Git and your project package manager available in PATH</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Install instructions</h2>
        <ol class="signal-list">
          <li>Download the Linux <code>.deb</code> or AppImage.</li>
          <li>Open <a href="${checksumsUrl}">SHASUMS256.txt</a> and verify the file hash.</li>
          <li>Install the <code>.deb</code> on Debian/Ubuntu, or mark the AppImage executable and run it.</li>
          <li>Open your repository folder in Terminal Pro.</li>
        </ol>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Checksums and release metadata</h2>
        <div class="link-row">
          <a href="${checksumsUrl}" class="btn btn-secondary">Download SHASUMS256.txt</a>
          <a href="${latestJsonUrl}" class="btn btn-secondary">Open latest.json</a>
          <a href="${latestYmlUrl}" class="btn btn-secondary">Open latest.yml</a>
          <a href="${latestLinuxYmlUrl}" class="btn btn-secondary">Open latest-linux.yml</a>
        </div>
        <div class="hash"># Download the checksum file
curl -O ${checksumsUrl}

# Inspect the canonical release feeds
curl ${latestJsonUrl}
curl ${latestYmlUrl}
curl ${latestLinuxYmlUrl}

# Verify the local file hash
sha256sum -c SHASUMS256.txt</div>
        <p class="note">If the checksum does not match, do not run the installer. Contact support before continuing.</p>
      </div>
    </section>
  `

  return renderPage('/download', 'download', hero, content)
}

function renderLogin(returnTo: string = ''): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Welcome back</span>
      <h1>Sign in to your account</h1>
      <p class="hero-copy">Use your RinaWarp account to manage billing, recover access on a new device, and return cleanly to VS Code when Companion asks you to reconnect.</p>
    </section>`

  const content = `
    <section class="section">
      <div class="auth-container">
        <div class="auth-card">
          <h2 class="auth-title">Sign In</h2>
          <p class="auth-subtitle">Use your email and password to reconnect the desktop flow or manage your account in the browser.</p>

          <div id="login-error" class="alert alert-error" style="display:none;"></div>
          <div id="login-success" class="alert alert-success" style="display:none;"></div>
          <div id="login-return" style="display:none; margin-top:12px;"></div>

          <form id="login-form">
            <label for="email">Email
              <input type="email" id="email" name="email" placeholder="you@company.com" required autocomplete="email">
            </label>
            <label for="password">Password
              <input type="password" id="password" name="password" placeholder="Enter your password" required autocomplete="current-password">
            </label>
            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:8px;">Sign In</button>
          </form>

          <div class="auth-divider">or</div>

          <p style="text-align:center; margin-bottom:16px;">
            <a href="/register" style="color:var(--accent);">Create an account</a>
          </p>
          <p style="text-align:center;">
            <a href="/forgot-password" style="color:var(--muted); font-size:0.9rem;">Forgot your password?</a>
          </p>
        </div>
      </div>
    </section>`

  const script = `
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    const successDiv = document.getElementById('login-success');
    const returnDiv = document.getElementById('login-return');
    const returnTo = ${JSON.stringify(returnTo)};
    const pendingReturnKey = 'rinawarp_pending_return_to';

    function normalizeReturnTarget(target) {
      if (!target) return '/account';
      try {
        const decodedTarget = decodeURIComponent(target);
        const url = new URL(decodedTarget);
        const encodedQueryIndex = url.pathname.indexOf('%3F');
        if (encodedQueryIndex >= 0) {
          const encodedQuery = url.pathname.slice(encodedQueryIndex + 3);
          url.pathname = url.pathname.slice(0, encodedQueryIndex);
          const carriedParams = new URLSearchParams(encodedQuery);
          carriedParams.forEach((value, key) => {
            if (!url.searchParams.has(key)) {
              url.searchParams.set(key, value);
            }
          });
        }
        return url;
      } catch {
        return null;
      }
    }

    function buildReturnTarget(target, token) {
      const normalizedUrl = normalizeReturnTarget(target);
      if (normalizedUrl) {
        normalizedUrl.searchParams.set('token', token);
        return normalizedUrl.toString();
      }

      const separator = target.includes('?') ? '&' : '?';
      return target + separator + 'token=' + encodeURIComponent(token);
    }

    function showReturnButton(target) {
      if (!returnDiv || !target) return;
      returnDiv.innerHTML = '<a class="btn btn-secondary" id="open-vscode-return" href="#">Open VS Code</a><p class="note" style="margin-top:10px;">If your browser does not switch back automatically, click the button.</p>';
      returnDiv.style.display = 'block';
      const returnLink = document.getElementById('open-vscode-return');
      if (returnLink) {
        returnLink.addEventListener('click', (event) => {
          event.preventDefault();
          window.location.href = target;
        });
      }
    }

    function rememberReturnTarget(target) {
      if (!target) return;
      try {
        sessionStorage.setItem(pendingReturnKey, target);
      } catch {}
    }

    function clearRememberedReturnTarget() {
      try {
        sessionStorage.removeItem(pendingReturnKey);
      } catch {}
    }

    const existingToken = localStorage.getItem('auth_token');
    if (returnTo) {
      rememberReturnTarget(returnTo);
    }

    if (existingToken && returnTo) {
      successDiv.textContent = 'You are already signed in. Sending you back to VS Code...';
      successDiv.style.display = 'block';
      const returnTarget = buildReturnTarget(returnTo, existingToken);
      showReturnButton(returnTarget);
      setTimeout(() => {
        window.location.href = returnTarget;
      }, 250);
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      const email = document.getElementById('email')?.value?.trim();
      const password = document.getElementById('password')?.value;
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!email || !password) {
        errorDiv.textContent = 'Please fill in all fields';
        errorDiv.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        // Store token
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_email', data.user?.email || email);
        rememberReturnTarget(returnTo);

        const returnTarget = buildReturnTarget(returnTo, data.token);
        const isExternalAppReturn = Boolean(returnTo);

        successDiv.textContent = isExternalAppReturn
          ? 'Login successful. We are trying to send you back to VS Code now.'
          : 'Login successful! Redirecting...';
        successDiv.style.display = 'block';

        if (isExternalAppReturn) {
          showReturnButton(returnTarget);
        }

        setTimeout(() => {
          window.location.href = returnTarget;
        }, 500);
      } catch (err) {
        clearRememberedReturnTarget();
        errorDiv.textContent = err instanceof Error ? err.message : 'Login failed';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  `

  return renderPage('/login', 'account', hero, content, script)
}

function renderRegister(returnTo: string = ''): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Get started</span>
      <h1>Create your account</h1>
      <p class="hero-copy">Create a RinaWarp account for billing access, password recovery, and future continuity features. Paid installs can still be restored by billing email today.</p>
    </section>`

  const content = `
    <section class="section">
      <div class="auth-container">
        <div class="auth-card">
          <h2 class="auth-title">Create Account</h2>
          <p class="auth-subtitle">Sign up with your email</p>

          <div id="register-error" class="alert alert-error" style="display:none;"></div>
          <div id="register-success" class="alert alert-success" style="display:none;"></div>

          <form id="register-form">
            <label for="name">Name (optional)
              <input type="text" id="name" name="name" placeholder="Your name" autocomplete="name">
            </label>
            <label for="email">Email
              <input type="email" id="email" name="email" placeholder="you@company.com" required autocomplete="email">
            </label>
            <label for="password">Password
              <input type="password" id="password" name="password" placeholder="Create a strong password" required autocomplete="new-password">
              <ul class="password-requirements">
                <li id="req-length">At least 8 characters</li>
                <li id="req-upper">One uppercase letter</li>
                <li id="req-lower">One lowercase letter</li>
                <li id="req-number">One number</li>
                <li id="req-special">One special character</li>
              </ul>
            </label>
            <label for="confirm-password">Confirm Password
              <input type="password" id="confirm-password" name="confirm-password" placeholder="Confirm your password" required autocomplete="new-password">
            </label>
            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:8px;">Create Account</button>
          </form>

          <p style="text-align:center; margin-top:20px; color:var(--muted); font-size:0.9rem;">
            Already have an account? <a href="/login" style="color:var(--accent);">Sign in</a>
          </p>
        </div>
      </div>
    </section>`

  const script = `
    const form = document.getElementById('register-form');
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');
    const passwordInput = document.getElementById('password');
    const returnTo = ${JSON.stringify(returnTo)};

    // Password validation
    const reqs = {
      length: document.getElementById('req-length'),
      upper: document.getElementById('req-upper'),
      lower: document.getElementById('req-lower'),
      number: document.getElementById('req-number'),
      special: document.getElementById('req-special'),
    };

    passwordInput?.addEventListener('input', () => {
      const pwd = passwordInput.value;
      reqs.length.classList.toggle('valid', pwd.length >= 8);
      reqs.upper.classList.toggle('valid', /[A-Z]/.test(pwd));
      reqs.lower.classList.toggle('valid', /[a-z]/.test(pwd));
      reqs.number.classList.toggle('valid', /[0-9]/.test(pwd));
      reqs.special.classList.toggle('valid', /[!@#$%^&*(),.?\":{}|<>]/.test(pwd));
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      const name = document.getElementById('name')?.value?.trim();
      const email = document.getElementById('email')?.value?.trim();
      const password = document.getElementById('password')?.value;
      const confirmPassword = document.getElementById('confirm-password')?.value;
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!email || !password || !confirmPassword) {
        errorDiv.textContent = 'Please fill in all required fields';
        errorDiv.style.display = 'block';
        return;
      }

      if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
      }

      if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) ||
          !/[0-9]/.test(password) || !/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
        errorDiv.textContent = 'Password does not meet requirements';
        errorDiv.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: name || undefined }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        successDiv.textContent = data.message || 'Account created! Please check your email.';
        successDiv.style.display = 'block';
        form.reset();

        setTimeout(() => {
          window.location.href = returnTo ? '/login?return_to=' + encodeURIComponent(returnTo) : '/login';
        }, 2000);
      } catch (err) {
        errorDiv.textContent = err instanceof Error ? err.message : 'Registration failed';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  `

  return renderPage('/register', 'account', hero, content, script)
}

function renderForgotPassword(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Reset password</span>
      <h1>Forgot your password?</h1>
      <p class="hero-copy">Enter your email and we'll send you a link to reset your password.</p>
    </section>`

  const content = `
    <section class="section">
      <div class="auth-container">
        <div class="auth-card">
          <h2 class="auth-title">Reset Password</h2>
          <p class="auth-subtitle">We'll email you a reset link</p>

          <div id="reset-error" class="alert alert-error" style="display:none;"></div>
          <div id="reset-success" class="alert alert-success" style="display:none;"></div>

          <form id="forgot-form">
            <label for="email">Email
              <input type="email" id="email" name="email" placeholder="you@company.com" required autocomplete="email">
            </label>
            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:8px;">Send Reset Link</button>
          </form>

          <p style="text-align:center; margin-top:20px; color:var(--muted); font-size:0.9rem;">
            Remember your password? <a href="/login" style="color:var(--accent);">Sign in</a>
          </p>
        </div>
      </div>
    </section>`

  const script = `
    const form = document.getElementById('forgot-form');
    const errorDiv = document.getElementById('reset-error');
    const successDiv = document.getElementById('reset-success');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      const email = document.getElementById('email')?.value?.trim();
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!email) {
        errorDiv.textContent = 'Please enter your email';
        errorDiv.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Request failed');
        }

        successDiv.textContent = data.message;
        successDiv.style.display = 'block';
        form.reset();
      } catch (err) {
        errorDiv.textContent = err instanceof Error ? err.message : 'Request failed';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
      }
    });
  `

  return renderPage('/forgot-password', 'account', hero, content, script)
}

function renderResetPassword(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Reset password</span>
      <h1>Create new password</h1>
      <p class="hero-copy">Enter your new password below. Make sure it's strong and different from previous passwords.</p>
    </section>`

  const content = `
    <section class="section">
      <div class="auth-container">
        <div class="auth-card">
          <h2 class="auth-title">New Password</h2>
          <p class="auth-subtitle">Enter your new password</p>

          <div id="reset-error" class="alert alert-error" style="display:none;"></div>
          <div id="reset-success" class="alert alert-success" style="display:none;"></div>

          <form id="reset-form">
            <input type="hidden" id="token" name="token">
            <label for="password">New Password
              <input type="password" id="password" name="password" placeholder="Create a strong password" required autocomplete="new-password">
              <ul class="password-requirements">
                <li id="req-length">At least 8 characters</li>
                <li id="req-upper">One uppercase letter</li>
                <li id="req-lower">One lowercase letter</li>
                <li id="req-number">One number</li>
                <li id="req-special">One special character</li>
              </ul>
            </label>
            <label for="confirm-password">Confirm Password
              <input type="password" id="confirm-password" name="confirm-password" placeholder="Confirm your password" required autocomplete="new-password">
            </label>
            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:8px;">Reset Password</button>
          </form>
        </div>
      </div>
    </section>`

  const script = `
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    document.getElementById('token').value = token || '';

    if (!token) {
      document.getElementById('reset-error').textContent = 'Invalid reset token. Please request a new password reset.';
      document.getElementById('reset-error').style.display = 'block';
      document.querySelector('button[type="submit"]').disabled = true;
    }

    const form = document.getElementById('reset-form');
    const errorDiv = document.getElementById('reset-error');
    const successDiv = document.getElementById('reset-success');
    const passwordInput = document.getElementById('password');

    // Password validation
    const reqs = {
      length: document.getElementById('req-length'),
      upper: document.getElementById('req-upper'),
      lower: document.getElementById('req-lower'),
      number: document.getElementById('req-number'),
      special: document.getElementById('req-special'),
    };

    passwordInput?.addEventListener('input', () => {
      const pwd = passwordInput.value;
      reqs.length.classList.toggle('valid', pwd.length >= 8);
      reqs.upper.classList.toggle('valid', /[A-Z]/.test(pwd));
      reqs.lower.classList.toggle('valid', /[a-z]/.test(pwd));
      reqs.number.classList.toggle('valid', /[0-9]/.test(pwd));
      reqs.special.classList.toggle('valid', /[!@#$%^&*(),.?\":{}|<>]/.test(pwd));
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      const tokenVal = document.getElementById('token')?.value;
      const password = document.getElementById('password')?.value;
      const confirmPassword = document.getElementById('confirm-password')?.value;
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!tokenVal) {
        errorDiv.textContent = 'Invalid reset token';
        errorDiv.style.display = 'block';
        return;
      }

      if (!password || !confirmPassword) {
        errorDiv.textContent = 'Please fill in all fields';
        errorDiv.style.display = 'block';
        return;
      }

      if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
      }

      if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) ||
          !/[0-9]/.test(password) || !/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
        errorDiv.textContent = 'Password does not meet requirements';
        errorDiv.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Resetting...';

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenVal, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Reset failed');
        }

        successDiv.textContent = 'Password reset successful! Redirecting to login...';
        successDiv.style.display = 'block';

        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } catch (err) {
        errorDiv.textContent = err instanceof Error ? err.message : 'Reset failed';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
      }
    });
  `

  return renderPage('/reset-password', 'account', hero, content, script)
}

function renderAccount(authToken: string | null): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Account</span>
      <h1>Manage your RinaWarp account</h1>
      <p class="hero-copy">View your plan, download Terminal Pro, restore access, and manage billing.</p>
    </section>`

  const content = `
    <section class="section">
      <div class="auth-container">
        <div class="auth-card">
          <div id="account-status" class="alert alert-success" style="display:none;"></div>
          <div id="account-shell-loading">
            <h2 class="auth-title">Your account</h2>
            <p class="auth-subtitle">Checking your plan status.</p>
          </div>

          <div id="account-shell-signed-out" style="display:none;">
            <h2 class="auth-title">Your account</h2>
            <div class="grid two-up" style="margin-top:16px;">
              <article class="card"><div class="kicker">Plan</div><h3>Free</h3></article>
              <article class="card"><div class="kicker">Subscription</div><h3>No paid subscription found</h3></article>
            </div>
            <div class="link-row" style="margin-top:16px;">
              <a href="/login" id="account-return-login-link" class="btn btn-primary" style="display:none;">Continue sign-in</a>
              <a href="#restore" class="btn btn-primary">Restore purchase</a>
              <a href="/download/" class="btn btn-secondary">Download Terminal Pro</a>
              <a href="/pricing/" class="btn btn-secondary">Upgrade to Pro</a>
            </div>
          </div>

          <div id="account-shell-signed-in" style="display:none;">
            <div id="account-info">
              <h2 class="auth-title">Your account</h2>
              <p class="auth-subtitle">Checking your plan status.</p>
            </div>

            <div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--line);">
              <div id="subscription-info" class="grid two-up">
                <article class="card"><div class="kicker">Plan</div><h3>Free</h3></article>
                <article class="card"><div class="kicker">Subscription</div><h3>No paid subscription found</h3></article>
              </div>
            </div>

            <div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--line);">
              <div class="link-row">
                <a href="#restore" class="btn btn-primary">Restore purchase</a>
                <a href="/download/" class="btn btn-secondary">Download Terminal Pro</a>
                <button id="billing-portal-btn" class="btn btn-secondary" type="button" hidden>Manage billing</button>
                <a href="/pricing/" id="account-upgrade-link" class="btn btn-secondary">Upgrade to Pro</a>
                <button id="logout-btn" class="btn btn-secondary" style="width:auto;" type="button">Sign out</button>
              </div>
            </div>
          </div>

          <div id="account-return" style="display:none; margin-top:16px;"></div>
        </div>

        <div class="auth-card">
          <h2 class="auth-title" id="restore">Restore access</h2>
          <p class="auth-subtitle" id="restore-copy">Enter the billing email you used at checkout.</p>
          <form id="restore-form">
            <label>Billing email
              <input type="email" name="email" placeholder="Billing email" required>
            </label>
            <button type="submit" class="btn btn-primary">Restore access</button>
            <p id="restore-status" class="status-message" aria-live="polite"></p>
          </form>
        </div>

        <div class="auth-card" id="account-referral" style="display:none;">
          <h2 class="auth-title">Referral link</h2>
          <p class="auth-subtitle">Invite a developer and track your rewards.</p>
          <div class="pill" style="margin-top:12px;"><span id="account-referral-code">—</span></div>
          <label style="margin-top:16px;">Invite link
            <input id="account-invite-link" type="text" value="" readonly>
          </label>
          <button class="btn btn-primary" id="copy-invite-link-btn" type="button" style="margin-top:12px;">Copy invite link</button>
          <p id="account-referral-stats" class="auth-subtitle" style="margin-top:12px;">0 checkouts started · 0 paid conversions</p>
          <p id="account-referral-status" class="status-message" aria-live="polite"></p>
        </div>
      </div>
    </section>`

  const script = `
    const params = new URLSearchParams(window.location.search);
    const pendingReturnKey = 'rinawarp_pending_return_to';
    const returnTo = params.get('return_to');
    const returnDiv = document.getElementById('account-return');
    const statusDiv = document.getElementById('account-status');
    const loadingShell = document.getElementById('account-shell-loading');
    const signedOutShell = document.getElementById('account-shell-signed-out');
    const signedInShell = document.getElementById('account-shell-signed-in');
    const restoreCopy = document.getElementById('restore-copy');
    const restoreForm = document.getElementById('restore-form');
    const restoreStatus = document.getElementById('restore-status');
    const returnLoginLink = document.getElementById('account-return-login-link');
    const referralCard = document.getElementById('account-referral');
    const referralCode = document.getElementById('account-referral-code');
    const referralInput = document.getElementById('account-invite-link');
    const referralStats = document.getElementById('account-referral-stats');
    const referralStatus = document.getElementById('account-referral-status');
    const initialServerToken = ${JSON.stringify(authToken)};

    function normalizeReturnTarget(target) {
      if (!target) return null;
      try {
        const decodedTarget = decodeURIComponent(target);
        const url = new URL(decodedTarget);
        const encodedQueryIndex = url.pathname.indexOf('%3F');
        if (encodedQueryIndex >= 0) {
          const encodedQuery = url.pathname.slice(encodedQueryIndex + 3);
          url.pathname = url.pathname.slice(0, encodedQueryIndex);
          const carriedParams = new URLSearchParams(encodedQuery);
          carriedParams.forEach((value, key) => {
            if (!url.searchParams.has(key)) {
              url.searchParams.set(key, value);
            }
          });
        }
        return url;
      } catch {
        return null;
      }
    }

    function buildReturnTarget(target, token) {
      const normalizedUrl = normalizeReturnTarget(target);
      if (normalizedUrl) {
        normalizedUrl.searchParams.set('token', token);
        return normalizedUrl.toString();
      }

      const separator = target.includes('?') ? '&' : '?';
      return target + separator + 'token=' + encodeURIComponent(token);
    }

    function readPendingReturnTarget() {
      try {
        return sessionStorage.getItem(pendingReturnKey);
      } catch {
        return null;
      }
    }

    function rememberReturnTarget(target) {
      if (!target) return;
      try {
        sessionStorage.setItem(pendingReturnKey, target);
      } catch {}
    }

    function clearPendingReturnTarget() {
      try {
        sessionStorage.removeItem(pendingReturnKey);
      } catch {}
    }

    function setShellState(state) {
      if (loadingShell) loadingShell.style.display = state === 'loading' ? 'block' : 'none';
      if (signedOutShell) signedOutShell.style.display = state === 'signed-out' ? 'block' : 'none';
      if (signedInShell) signedInShell.style.display = state === 'signed-in' ? 'block' : 'none';
    }

    function showStatus(message) {
      if (!statusDiv || !message) return;
      statusDiv.textContent = message;
      statusDiv.style.display = 'block';
    }

    function showReturnButton(target, label = 'Open VS Code') {
      if (!returnDiv || !target) return;
      returnDiv.innerHTML = '<a class="btn btn-secondary" id="account-open-vscode" href="#">' + label + '</a><p class="note" style="margin-top:10px;">If your browser does not switch back automatically, click the button.</p>';
      returnDiv.style.display = 'block';
      const returnLink = document.getElementById('account-open-vscode');
      if (returnLink) {
        returnLink.addEventListener('click', (event) => {
          event.preventDefault();
          window.location.href = target;
        });
      }
    }

    const effectiveReturnTo = returnTo || readPendingReturnTarget();
    if (effectiveReturnTo) {
      rememberReturnTarget(effectiveReturnTo);
      if (returnLoginLink) {
        returnLoginLink.href = '/login?return_to=' + encodeURIComponent(effectiveReturnTo);
        returnLoginLink.style.display = '';
      }
    }

    const storedToken = localStorage.getItem('auth_token');
    const activeToken = storedToken || initialServerToken || null;

    async function runRestoreLookup(email) {
      const response = await fetch('/api/license/lookup-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return response.json();
    }

    async function loadSignedInAccount(token) {
      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!response.ok) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_email');
          setShellState('signed-out');
          if (effectiveReturnTo) {
            showStatus('Your RinaWarp session expired. Sign in again, then return to VS Code.');
          }
          return;
        }

        const data = await response.json();
        const user = data.user;
        setShellState('signed-in');
        let hasPaidAccess = false;

        if (restoreCopy) {
          restoreCopy.textContent = 'Enter the billing email you used at checkout.';
        }

        document.getElementById('account-info').innerHTML = \`
          <h2 class="auth-title">Your account</h2>
          <h3>\${user.name || 'RinaWarp customer'}</h3>
          <p class="auth-subtitle">\${user.email}</p>
        \`;

        try {
          const subData = await runRestoreLookup(user.email);
          if (subData.ok && subData.tier) {
            hasPaidAccess = true;
            document.getElementById('subscription-info').innerHTML = \`
              <article class="card"><div class="kicker">Plan</div><h3>\${subData.tier.toUpperCase()}</h3></article>
              <article class="card"><div class="kicker">Subscription</div><h3>\${String(subData.status || 'active').replace(/^./, (c) => c.toUpperCase())}</h3></article>
            \`;
          } else {
            document.getElementById('subscription-info').innerHTML = \`
              <article class="card"><div class="kicker">Plan</div><h3>Free</h3></article>
              <article class="card"><div class="kicker">Subscription</div><h3>No paid subscription found</h3></article>
            \`;
          }
        } catch (error) {
          document.getElementById('subscription-info').innerHTML = \`
            <article class="card"><div class="kicker">Plan</div><h3>Free</h3></article>
            <article class="card"><div class="kicker">Subscription</div><h3>No paid subscription found</h3></article>
          \`;
        }

        const billingButton = document.getElementById('billing-portal-btn');
        const upgradeLink = document.getElementById('account-upgrade-link');
        if (billingButton) billingButton.hidden = !hasPaidAccess;
        if (upgradeLink) upgradeLink.hidden = hasPaidAccess;

        try {
          const referralResponse = await fetch('/api/referrals/me', {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          if (referralResponse.ok) {
            const referral = await referralResponse.json();
            if (referralCard) referralCard.style.display = 'block';
            if (referralCode) referralCode.textContent = referral.code || '—';
            if (referralInput) referralInput.value = referral.inviteUrl || '';
            if (referralStats) {
              referralStats.textContent =
                String(referral.stats?.checkouts || 0) + ' checkouts started · ' + String(referral.stats?.conversions || 0) + ' paid conversions';
            }
          }
        } catch {}

        document.getElementById('billing-portal-btn')?.addEventListener('click', async () => {
          if (!hasPaidAccess) {
            window.location.href = '/pricing/';
            return;
          }
          try {
            const response = await fetch('/api/portal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email })
            });
            const payload = await response.json();
            if (payload?.url) {
              window.location.href = payload.url;
            }
          } catch (error) {
            if (restoreStatus) {
              restoreStatus.textContent = 'Could not open billing portal right now.';
              restoreStatus.className = 'status-message error';
            }
          }
        }, { once: true });

        if (effectiveReturnTo) {
          showStatus('You are signed in. Use the button below to return to VS Code.');
          showReturnButton(buildReturnTarget(effectiveReturnTo, token), 'Return to VS Code');
        }
      } catch (error) {
        setShellState('signed-out');
      }
    }

    document.getElementById('logout-btn')?.addEventListener('click', () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_email');
      clearPendingReturnTarget();
      window.location.href = '/account';
    });

    restoreForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!restoreStatus) return;
      const emailField = restoreForm.querySelector('input[name="email"]');
      const email = emailField?.value?.trim();
      if (!email) {
        restoreStatus.textContent = 'Enter the billing email used at checkout.';
        restoreStatus.className = 'status-message error';
        return;
      }

      restoreStatus.textContent = 'Checking restore status...';
      restoreStatus.className = 'status-message';

      try {
        const data = await runRestoreLookup(email);
        if (data.ok && data.tier) {
          restoreStatus.textContent = 'Access found: ' + String(data.tier).toUpperCase() + '. Open Terminal Pro and restore with this billing email.';
          restoreStatus.className = 'status-message success';
        } else {
          restoreStatus.textContent = 'No paid access was found for that billing email yet.';
          restoreStatus.className = 'status-message error';
        }
      } catch (error) {
        restoreStatus.textContent = 'Restore lookup is temporarily unavailable.';
        restoreStatus.className = 'status-message error';
      }
    });

    if (activeToken) {
      loadSignedInAccount(activeToken);
    } else {
      setShellState('signed-out');
      if (effectiveReturnTo) {
        showStatus('Sign in, then return to VS Code to finish connecting your Companion session.');
      }
    }

    document.getElementById('copy-invite-link-btn')?.addEventListener('click', async () => {
      const value = referralInput?.value?.trim();
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        if (referralStatus) {
          referralStatus.textContent = 'Invite link copied.';
          referralStatus.className = 'status-message success';
        }
      } catch {
        if (referralStatus) {
          referralStatus.textContent = 'Could not copy the invite link right now.';
          referralStatus.className = 'status-message error';
        }
      }
    });
  `

  return renderPage('/account', 'account', hero, content, script)
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    try {
      const url = new URL(request.url)
      const path = url.pathname
      const downloadPath =
        path === '/v1/download' || path === '/v1/download/'
          ? '/download/'
          : path.startsWith('/v1/download/')
            ? `/download/${path.slice('/v1/download/'.length)}`
            : path
      const host = url.hostname.toLowerCase()

      if (host === 'www.rinawarptech.com' && !path.startsWith('/api/')) {
        const redirectUrl = new URL(request.url)
        redirectUrl.hostname = 'rinawarptech.com'
        return rwRedirect(redirectUrl.toString(), 301)
      }

      const legacyRedirects: Record<string, string> = {
        '/terminal-pro': '/',
        '/terminal-pro.html': '/',
        '/contact': '/support/',
        '/contact.html': '/support/',
        '/feedback': '/support/',
        '/feedback/': '/support/',
        '/team': '/pricing/',
        '/team/': '/pricing/',
        '/about': '/products/',
        '/about/': '/products/',
        '/about-rinawarp': '/products/',
        '/about-rinawarp/': '/products/',
        '/affiliates.html': '/pricing/',
      }

      const legacyTarget = legacyRedirects[path]
      if (legacyTarget) {
        return rwRedirect(`${url.origin}${legacyTarget}`, 301)
      }

      // CORS headers for API responses
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, stripe-signature',
      }

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        })
      }

      // API routes: /api/*
      if (path.startsWith('/api/')) {
        return handleApiRequest(request, env, path, corsHeaders)
      }

      if (path === '/assets/img/rinawarp-mark.svg' || path === '/assets/img/rinawarp-logo.svg') {
        return rwSvg(LOGO_SVG)
      }

      if (path === '/robots.txt') {
        return renderRobotsTxt(url.origin)
      }

      if (path === '/sitemap.xml') {
        return renderSitemapXml(url.origin)
      }

      if (path === '/releases.json') {
        return renderReleasesJson(env, url.origin)
      }

      if (path.startsWith('/downloads/terminal-pro/')) {
        const artifactName = path.split('/').pop()
        if (artifactName?.endsWith('.AppImage')) {
          return rwRedirect(`${url.origin}/download/linux`, 301)
        }
        if (artifactName?.endsWith('.deb')) {
          return rwRedirect(`${url.origin}/download/linux/deb`, 301)
        }
        if (artifactName?.endsWith('.exe')) {
          return rwRedirect(`${url.origin}/download/`, 301)
        }
        return rwRedirect(`${url.origin}/download/`, 301)
      }

      if (path === '/downloads' || path === '/downloads/') {
        return rwRedirect(`${url.origin}/download/`, 301)
      }

      if (path.startsWith('/downloads/')) {
        return rwRedirect(`${url.origin}/download/${path.slice('/downloads/'.length)}`, 301)
      }

      if (downloadPath === '/download' || downloadPath === '/download/') {
        return await renderDownload(env, url.origin)
      }

      if (downloadPath.startsWith('/download/')) {
        const manifest = await getReleaseManifest(env)
        if (!manifest) {
          const kind = normalizeArtifactKind(downloadPath.slice('/download/'.length))
          if (kind === 'windows') {
            return rwText(404, 'Windows artifact not available in this public beta')
          }
          const githubArtifactUrl = pickGitHubBetaArtifactUrl(kind)
          return githubArtifactUrl ? rwRedirect(githubArtifactUrl) : rwText(404, 'Artifact not available')
        }

        const kind = normalizeArtifactKind(downloadPath.slice('/download/'.length))
        if (kind === 'windows') {
          return rwText(404, 'Windows artifact not available in this public beta')
        }

        const artifactPath = pickArtifactPath(manifest, kind) ?? (await findLatestArtifactPath(env, kind))
        if (!artifactPath) {
          return rwText(404, 'Artifact not available')
        }

        if (kind === 'checksums') {
          const bucket = getR2Bucket(env)
          const checksumObject = bucket ? await bucket.get(artifactPath) : null
          if (!checksumObject) {
            return rwText(404, 'Artifact not available')
          }
        }

        const location = toAbsoluteArtifactUrl(url.origin, artifactPath)
        const firstPartyDownload = await serveDownloadObject(env, artifactPath.replace(/^\/+/, ''))
        if (firstPartyDownload) {
          return firstPartyDownload
        }

        if (!location) {
          return rwText(404, 'Artifact not available')
        }

        return rwRedirect(location)
      }

      if (path.startsWith('/releases/')) {
        const response = await serveReleaseObject(env, path.slice(1))
        if (response) return response
        return rwText(404, 'Not found')
      }

      // Homepage
      if (path === '/' || path === '') {
        return renderHomepage()
      }

      if (path === '/products' || path === '/products/') {
        return renderProducts()
      }

      if (path === '/beta' || path === '/beta/') {
        return renderBetaSignup()
      }

      if (path === '/beta-feedback' || path === '/beta-feedback/') {
        return renderBetaFeedback()
      }

      if (path === '/matter-intelligence' || path === '/matter-intelligence/') {
        return renderMatterIntelligenceOverview()
      }

      if (path === '/matter-intelligence/pricing' || path === '/matter-intelligence/pricing/') {
        return renderMatterIntelligencePricing()
      }

      if (path === '/matter-intelligence/security' || path === '/matter-intelligence/security/') {
        return renderMatterIntelligenceSecurity()
      }

      if (path === '/matter-intelligence/demo' || path === '/matter-intelligence/demo/') {
        return renderMatterIntelligenceDemo()
      }

      if (path === '/matter-intelligence/download' || path === '/matter-intelligence/download/') {
        return renderMatterIntelligenceDownload()
      }

      if (path === '/matter-intelligence/docs' || path === '/matter-intelligence/docs/') {
        return renderMatterIntelligenceDocs()
      }

      if (path === '/matter-intelligence/contact' || path === '/matter-intelligence/contact/') {
        return renderMatterIntelligenceContact()
      }

      if (path === '/matter-intelligence/terms' || path === '/matter-intelligence/terms/') {
        return renderMatterIntelligenceTerms()
      }

      if (path === '/matter-intelligence/privacy' || path === '/matter-intelligence/privacy/') {
        return renderMatterIntelligencePrivacy()
      }

      // Pricing page
      if (path === '/pricing' || path === '/pricing/') {
        return renderPricing()
      }

      if (path === '/trust' || path === '/trust/') {
        return renderTrust()
      }

      // Support page
      if (path === '/support' || path === '/support/') {
        return renderFeedback()
      }

      // Auth pages
      if (path === '/login' || path === '/login/') {
        return renderLogin(url.searchParams.get('return_to') || '')
      }

      if (path === '/register' || path === '/register/') {
        return renderRegister(url.searchParams.get('return_to') || '')
      }

      if (path === '/forgot-password' || path === '/forgot-password/') {
        return renderForgotPassword()
      }

      if (path === '/reset-password' || path === '/reset-password/') {
        return renderResetPassword()
      }

      if (path === '/account' || path === '/account/') {
        // Check for auth token in localStorage via client-side or Authorization header
        const authHeader = request.headers.get('Authorization')
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
        return renderAccount(token)
      }

      if (path === '/success' || path === '/success/') {
        return renderSuccess(url.searchParams.get('return_to') || '', url.searchParams.get('session_id') || '')
      }

      if (path === '/verify/companion-purchase' || path === '/verify/companion-purchase/') {
        return renderCompanionPurchaseVerification(url.searchParams.get('return_to') || '')
      }

      if (path === '/docs' || path === '/docs/') {
        return renderDocs()
      }

      if (path === '/terms' || path === '/terms/') {
        return renderTerms()
      }

      if (path === '/privacy' || path === '/privacy/') {
        return renderPrivacy()
      }

      if (path === '/early-access' || path === '/early-access/') {
        const manifest = await getReleaseManifest(env)
        return renderEarlyAccess(manifest?.version ? String(manifest.version) : undefined)
      }

      // Feedback API (POST)
      if ((path === '/api/feedback' || path === '/v1/feedback') && request.method === 'POST') {
        return handleFeedbackSubmit(request, env, corsHeaders)
      }

      if (path.startsWith('/v1/telemetry/') && request.method === 'POST') {
        try {
          const body = await request.json()
          const endpoint = path.slice('/v1/telemetry/'.length).replace(/\/+$/, '')
          const installId = typeof body?.installId === 'string' ? body.installId.slice(0, 80) : ''
          const version = typeof body?.version === 'string' ? body.version.slice(0, 40) : 'unknown'
          const platform = typeof body?.platform === 'string' ? body.platform.slice(0, 30) : 'unknown'
          const arch = typeof body?.arch === 'string' ? body.arch.slice(0, 30) : 'unknown'
          const rawEvent = typeof body?.event === 'string' ? body.event : ''
          const forbiddenKeys = new Set([
            'prompt',
            'promptText',
            'repo',
            'repoName',
            'repoPath',
            'repository',
            'sourceCode',
            'terminalOutput',
            'fileContents',
            'fileContent',
            'shellHistory',
            'username',
            'userName',
            'token',
            'secret',
          ])
          const containsForbiddenKey = Object.keys(body || {}).some((key) => forbiddenKeys.has(key))
          const allowedEvents = new Set([
            'task_started',
            'task_completed',
            'task_failed',
            'rollback_triggered',
            'approval_denied',
          ])

          const eventName =
            endpoint === 'install'
              ? 'desktop_install'
              : endpoint === 'active'
                ? 'desktop_active'
                : endpoint === 'event' && allowedEvents.has(rawEvent)
                  ? `desktop_${rawEvent}`
                  : ''

          if (!installId || !eventName || containsForbiddenKey) {
            return new Response(JSON.stringify({ error: 'Invalid telemetry payload' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            })
          }

          const properties = {
            version,
            platform,
            arch,
            source: 'desktop',
          }

          console.log('Desktop telemetry received:', {
            event: eventName,
            installId: `${installId.slice(0, 8)}...`,
            properties,
          })

          const posthogKey = String(env.RINAWARP_POSTHOG_KEY || env.POSTHOG_API_KEY || '').trim()
          const posthogHost = String(env.RINAWARP_POSTHOG_HOST || env.POSTHOG_HOST || 'https://app.posthog.com').trim()

          if (posthogKey) {
            try {
              await fetch(`${posthogHost.replace(/\/+$/, '')}/capture/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  api_key: posthogKey,
                  event: eventName,
                  distinct_id: installId,
                  properties,
                  timestamp: new Date().toISOString(),
                }),
              })
            } catch (error) {
              console.error('Desktop telemetry forward failed:', error)
            }
          }

          return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }
      }

      // API routes: /v1/*
      if (path.startsWith('/v1')) {
        return apiRouter(request, env)
      }

      // Marketplace UI: /agents
      if (path.startsWith('/agents')) {
        return marketplaceUI(request, env)
      }

      const lowerPath = path.toLowerCase()
      const staleGonePaths = new Set<string>([
        '/music-video-creator',
        '/music-video-creator/',
        '/music-video-creator.html',
      ])
      if (staleGonePaths.has(lowerPath)) {
        return rwText(410, 'Gone')
      }

      const passThroughPrefixes = ['/assets/', '/favicon', '/.well-known/', '/apple-touch-icon']
      const passThroughExtensions = [
        '.png',
        '.jpg',
        '.jpeg',
        '.svg',
        '.webp',
        '.gif',
        '.css',
        '.js',
        '.ico',
        '.txt',
        '.xml',
      ]
      if (
        passThroughPrefixes.some((prefix) => lowerPath.startsWith(prefix)) ||
        passThroughExtensions.some((extension) => lowerPath.endsWith(extension))
      ) {
        return fetch(request)
      }

      return rwText(404, 'Not found')
    } catch (error) {
      console.error('[worker] request failed', error)
      return rwText(500, 'Internal server error')
    }
  },
}

async function handleApiRequest(
  request: Request,
  env: any,
  path: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Health check
  if (path === '/api/health' && request.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // Feedback endpoint
  if (path === '/api/feedback' && request.method === 'POST') {
    return handleFeedbackSubmit(request, env, corsHeaders)
  }

  // Events endpoint
  if (path === '/api/events' && request.method === 'POST') {
    try {
      const body = await request.json()
      const event = typeof body?.event === 'string' ? body.event.trim() : ''
      const properties =
        body && typeof body.properties === 'object' && body.properties && !Array.isArray(body.properties)
          ? Object.fromEntries(
              Object.entries(body.properties as Record<string, unknown>)
                .slice(0, 12)
                .map(([key, value]) => [key, String(value ?? '').slice(0, 120)])
            )
          : {}
      const pathName = typeof body?.path === 'string' ? body.path.slice(0, 120) : ''
      const hostname = typeof body?.hostname === 'string' ? body.hostname.slice(0, 120) : ''

      if (!event) {
        return new Response(JSON.stringify({ error: 'Missing event name' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      const payload = {
        event,
        properties,
        path: pathName,
        hostname,
        timestamp: new Date().toISOString(),
        source: 'website',
      }

      console.log('Website event received:', payload)

      const posthogKey = String(env.RINAWARP_POSTHOG_KEY || env.POSTHOG_API_KEY || '').trim()
      const posthogHost = String(env.RINAWARP_POSTHOG_HOST || env.POSTHOG_HOST || 'https://app.posthog.com').trim()

      if (posthogKey) {
        try {
          await fetch(`${posthogHost.replace(/\/+$/, '')}/capture/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: posthogKey,
              event,
              distinct_id: 'website-anonymous',
              properties: {
                ...properties,
                path: pathName,
                hostname,
                source: 'website',
              },
              timestamp: payload.timestamp,
            }),
          })
        } catch (error) {
          console.error('Website event forward failed:', error)
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
  }

  // User endpoint
  if (path === '/api/me' && request.method === 'GET') {
    return handleAuthRequest(new Request(new URL('/api/auth/me', request.url).toString(), request), env, '/api/auth/me')
  }

  if (path === '/api/me/entitlements' && request.method === 'GET') {
    return handleMeEntitlements(request, env, corsHeaders)
  }

  if (path === '/api/vscode/entitlements' && request.method === 'GET') {
    return handleVscodeEntitlements(request, env, corsHeaders)
  }

  if (path === '/api/vscode/chat' && request.method === 'POST') {
    return handleVscodeChat(request, env, corsHeaders)
  }

  // License portal - now supports POST
  if (path === '/api/portal' && (request.method === 'GET' || request.method === 'POST')) {
    return handlePortalRequest(request, env, corsHeaders)
  }

  // Checkout session creation
  if (path === '/api/checkout' && request.method === 'POST') {
    return handleCheckoutRequest(request, env, corsHeaders)
  }

  if (path === '/api/matter-intelligence/checkout' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const patched = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ ...body, product: 'matter-intelligence' }),
    })
    return handleCheckoutRequest(patched, env, corsHeaders)
  }

  if (path === '/api/matter-intelligence/customer-portal' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const patched = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ ...body, product: 'matter-intelligence' }),
    })
    return handlePortalRequest(patched, env, corsHeaders)
  }

  if (path === '/api/auth/desktop-session' && request.method === 'POST') {
    return handleDesktopSessionRequest(request, env, corsHeaders)
  }

  if (path === '/api/matters' && request.method === 'GET') {
    return handleMatterIntelligenceListMatters(request, env, corsHeaders)
  }

  if (path === '/api/matters' && request.method === 'POST') {
    return handleMatterIntelligenceCreateMatter(request, env, corsHeaders)
  }

  if (path.startsWith('/api/matters/') && request.method === 'GET') {
    return handleMatterIntelligenceGetMatter(request, env, corsHeaders, path.slice('/api/matters/'.length))
  }

  if (path === '/api/connectors/microsoft/start' && request.method === 'POST') {
    return handleMatterIntelligenceMicrosoftStart(request, env, corsHeaders)
  }

  if (path === '/api/connectors/microsoft/sync' && request.method === 'POST') {
    return handleMatterIntelligenceMicrosoftSync(request, env, corsHeaders)
  }

  if (path === '/api/sync' && request.method === 'POST') {
    return handleMatterIntelligenceMicrosoftSync(request, env, corsHeaders)
  }

  if (path === '/api/search' && request.method === 'GET') {
    return handleMatterIntelligenceSearch(request, env, corsHeaders)
  }

  if (path === '/api/drafts/status-memo' && request.method === 'POST') {
    return handleMatterIntelligenceStatusMemoDraft(request, env, corsHeaders)
  }

  if (path === '/api/matter-intelligence/lead' && request.method === 'POST') {
    return handleMatterIntelligenceLeadRequest(request, env, corsHeaders)
  }

  // Stripe webhook
  if (path === '/api/stripe/webhook' && request.method === 'POST') {
    return handleStripeWebhook(request, env, corsHeaders)
  }

  // License endpoints
  if (path.startsWith('/api/license/')) {
    return handleLicenseRequest(request, env, corsHeaders, path)
  }

  // Auth endpoints
  if (path.startsWith('/api/auth/')) {
    return handleAuthRequest(request, env, path)
  }

  if (path === '/api/referrals/me' && request.method === 'GET') {
    return handleReferralMeRequest(request, env, corsHeaders)
  }

  if (path === '/api/referrals/admin' && request.method === 'GET') {
    return handleReferralAdminRequest(request, env, corsHeaders)
  }

  return new Response(JSON.stringify({ error: 'Not found', path }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function handleStripeWebhook(request: Request, env: any, corsHeaders: Record<string, string>): Promise<Response> {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response('No signature', { status: 400, headers: corsHeaders })
  }

  // Verify webhook signature if secret is available
  if (env.STRIPE_WEBHOOK_SECRET) {
    const timestamp = request.headers.get('stripe-timestamp')
    const payload = await request.text()
    const expectedSignature = env.STRIPE_WEBHOOK_SECRET
    // Note: Full signature verification would require computing HMAC
    // For now, we log the signature for debugging
    console.log('Stripe signature received:', signature.substring(0, 20) + '...')
  }

  try {
    const payload = await request.text()
    const event = JSON.parse(payload)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const customerEmail = session.customer_details?.email || session.customer_email
      const referralCode = normalizeReferralCode(session.metadata?.referral_code)
      await maybeTrackReferralEvent(env, {
        referralCode,
        eventType: 'checkout_completed',
        referredEmail: customerEmail,
        checkoutSessionId: session.id,
        source: 'stripe_webhook',
        metadata: {
          tier: session.metadata?.tier || null,
          workspaceId: session.metadata?.workspace_id || null,
          amountTotal: session.amount_total || null,
          currency: session.currency || null,
        },
      })
      console.log(`Payment completed: ${customerEmail}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return new Response(`Webhook error: ${err.message}`, { status: 400, headers: corsHeaders })
  }
}

async function handleReferralMeRequest(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const user = await getAuthenticatedUserFromRequest(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const summary = await getReferralSummary(env, user.userId)
  if (!summary) {
    return new Response(JSON.stringify({ error: 'Referral identity is unavailable right now.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  return new Response(
    JSON.stringify({
      ok: true,
      email: user.email,
      code: summary.code,
      inviteUrl: summary.inviteUrl,
      stats: summary.stats,
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

async function handleReferralAdminRequest(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const user = await getAuthenticatedUserFromRequest(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
  if (!isReferralAdminEmail(user.email)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const db = getDb(env)
  if (!db) {
    return new Response(JSON.stringify({ error: 'Referral database is unavailable right now.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const url = new URL(request.url)
  const code = normalizeReferralCode(url.searchParams.get('code'))
  const email = String(url.searchParams.get('email') || '')
    .trim()
    .toLowerCase()

  try {
    if (!code && !email) {
      const stats = await db
        .prepare(
          `
        SELECT
          SUM(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) AS checkouts,
          SUM(CASE WHEN event_type = 'checkout_completed' THEN 1 ELSE 0 END) AS conversions,
          COUNT(*) AS events
        FROM referral_events
      `
        )
        .first<{ checkouts?: number; conversions?: number; events?: number }>()

      const events = await db
        .prepare(
          `
        SELECT referral_code, event_type, referred_email, checkout_session_id, source, created_at, converted_at
        FROM referral_events
        ORDER BY created_at DESC
        LIMIT 20
      `
        )
        .all<{
          referral_code?: string
          event_type: string
          referred_email?: string
          checkout_session_id?: string
          source?: string
          created_at: number
          converted_at?: number
        }>()

      return new Response(
        JSON.stringify({
          ok: true,
          found: true,
          mode: 'recent',
          stats: {
            events: Number(stats?.events || 0),
            checkouts: Number(stats?.checkouts || 0),
            conversions: Number(stats?.conversions || 0),
          },
          events: Array.isArray(events.results) ? events.results : [],
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    const referral = code
      ? await db
          .prepare(
            `
          SELECT rc.code, rc.user_id, u.email, u.name
          FROM referral_codes rc
          LEFT JOIN users u ON u.id = rc.user_id
          WHERE rc.code = ?
        `
          )
          .bind(code)
          .first<{ code: string; user_id: string; email?: string; name?: string }>()
      : await db
          .prepare(
            `
          SELECT rc.code, rc.user_id, u.email, u.name
          FROM referral_codes rc
          LEFT JOIN users u ON u.id = rc.user_id
          WHERE lower(u.email) = ?
        `
          )
          .bind(email)
          .first<{ code: string; user_id: string; email?: string; name?: string }>()

    if (!referral?.code) {
      return new Response(JSON.stringify({ ok: true, found: false }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const stats = await db
      .prepare(
        `
      SELECT
        SUM(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) AS checkouts,
        SUM(CASE WHEN event_type = 'checkout_completed' THEN 1 ELSE 0 END) AS conversions,
        COUNT(*) AS events
      FROM referral_events
      WHERE referral_code = ?
    `
      )
      .bind(referral.code)
      .first<{ checkouts?: number; conversions?: number; events?: number }>()

    const events = await db
      .prepare(
        `
      SELECT event_type, referred_email, checkout_session_id, source, created_at, converted_at
      FROM referral_events
      WHERE referral_code = ?
      ORDER BY created_at DESC
      LIMIT 10
    `
      )
      .bind(referral.code)
      .all<{
        event_type: string
        referred_email?: string
        checkout_session_id?: string
        source?: string
        created_at: number
        converted_at?: number
      }>()

    return new Response(
      JSON.stringify({
        ok: true,
        found: true,
        referral: {
          code: referral.code,
          userId: referral.user_id,
          email: referral.email || null,
          name: referral.name || null,
        },
        stats: {
          events: Number(stats?.events || 0),
          checkouts: Number(stats?.checkouts || 0),
          conversions: Number(stats?.conversions || 0),
        },
        events: Array.isArray(events.results) ? events.results : [],
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Referral admin request failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

async function handleLicenseRequest(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>,
  path: string
): Promise<Response> {
  // License verify
  if (path === '/api/license/verify' && request.method === 'POST') {
    try {
      const body = await request.json()
      return new Response(
        JSON.stringify({
          valid: true,
          tier: 'free',
          message: 'License verification endpoint',
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
  }

  // License activate
  if (path === '/api/license/activate' && request.method === 'POST') {
    return new Response(
      JSON.stringify({
        message: 'License activation endpoint',
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }

  // License lookup by email
  if (path === '/api/license/lookup-by-email' && request.method === 'POST') {
    return handleLicenseLookup(request, env, corsHeaders)
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function lookupLicenseByEmail(
  email: string,
  env: any
): Promise<{
  customerId?: string
  email: string
  ok: boolean
  status: string
  tier: string | null
}> {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase()

  if (!normalizedEmail) {
    return {
      ok: false,
      email: '',
      tier: null,
      status: 'missing_email',
    }
  }

  if (env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    const response = await fetch(
      `https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(normalizedEmail)}'`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        },
      }
    )

    const customerData = await response.json()
    const customers = customerData.data || []

    if (customers.length > 0) {
      const customer = customers[0]

      const subscriptionsResponse = await fetch(
        'https://api.stripe.com/v1/subscriptions?' +
          new URLSearchParams({
            customer: String(customer.id),
            status: 'all',
            limit: '10',
          }).toString(),
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      const subscriptionsData = await subscriptionsResponse.json()
      const subscriptions = Array.isArray(subscriptionsData.data)
        ? subscriptionsData.data.filter((sub: any) =>
            ['active', 'trialing', 'past_due', 'unpaid'].includes(String(sub?.status || '').toLowerCase())
          )
        : []

      if (subscriptions.length > 0) {
        const sub = subscriptions[0]
        const priceId = sub.items?.data[0]?.price?.id

        const tierMap: Record<string, string> = {}
        const proPriceId = String(env.STRIPE_PRO_MONTHLY_PRICE_ID || env.STRIPE_PRO_PRICE_ID || '').trim()
        const proAnnualPriceId = String(env.STRIPE_PRO_ANNUAL_PRICE_ID || '').trim()
        const creatorPriceId = String(env.STRIPE_CREATOR_PRICE_ID || '').trim()
        const teamPriceId = String(env.STRIPE_TEAM_PRICE_ID || '').trim()
        const powerPriceId = String(env.STRIPE_POWER_PRICE_ID || '').trim()
        const founderPriceId = String(env.STRIPE_FOUNDER_PRICE_ID || '').trim()

        if (proPriceId) tierMap[proPriceId] = 'pro'
        if (proAnnualPriceId) tierMap[proAnnualPriceId] = 'pro'
        if (creatorPriceId) tierMap[creatorPriceId] = 'creator'
        if (teamPriceId) tierMap[teamPriceId] = 'team'
        if (powerPriceId) tierMap[powerPriceId] = 'team'
        if (founderPriceId) tierMap[founderPriceId] = 'founder'

        return {
          ok: true,
          email: customer.email || normalizedEmail,
          tier: tierMap[priceId] || 'unknown',
          status: 'active',
          customerId: customer.id,
        }
      }

      return {
        ok: true,
        email: customer.email || normalizedEmail,
        tier: null,
        status: 'no_subscription',
        customerId: customer.id,
      }
    }
  }

  return {
    ok: true,
    email: normalizedEmail,
    tier: null,
    status: 'not_found',
  }
}

async function lookupProductEntitlementsByEmail(
  email: string,
  env: any
): Promise<{
  email: string
  terminal_pro: { active: boolean; plan: string | null; status: string }
  matter_intelligence: { active: boolean; plan: string | null; status: string }
}> {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase()
  const empty = {
    email: normalizedEmail,
    terminal_pro: { active: false, plan: null, status: 'not_found' },
    matter_intelligence: { active: false, plan: null, status: 'not_found' },
  }

  if (!normalizedEmail || !(env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.startsWith('sk_'))) {
    return empty
  }

  const customerResponse = await fetch(
    `https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(normalizedEmail)}'`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    }
  )
  const customerData = await customerResponse.json()
  const customer = Array.isArray(customerData.data) ? customerData.data[0] : null
  if (!customer?.id) return empty

  const subscriptionsResponse = await fetch(
    'https://api.stripe.com/v1/subscriptions?' +
      new URLSearchParams({
        customer: String(customer.id),
        status: 'all',
        limit: '20',
      }).toString(),
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  const subscriptionsData = await subscriptionsResponse.json()
  const subscriptions = Array.isArray(subscriptionsData.data) ? subscriptionsData.data : []
  const activeStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid'])

  const terminalPriceToPlan: Record<string, string> = {}
  const matterPriceToPlan: Record<string, string> = {}

  const terminalPrices = {
    pro: [env.STRIPE_PRO_MONTHLY_PRICE_ID, env.STRIPE_PRO_PRICE_ID, env.STRIPE_PRO_ANNUAL_PRICE_ID],
    team: [env.STRIPE_TEAM_PRICE_ID, env.STRIPE_POWER_PRICE_ID, env.STRIPE_FOUNDER_PRICE_ID],
  }
  const matterPrices = {
    solo: [env.STRIPE_MI_SOLO_PRICE_ID, env.STRIPE_MATTER_INTELLIGENCE_SOLO_PRICE_ID],
    team: [env.STRIPE_MI_TEAM_PRICE_ID, env.STRIPE_MATTER_INTELLIGENCE_TEAM_PRICE_ID],
    enterprise: [env.STRIPE_MI_ENTERPRISE_PRICE_ID, env.STRIPE_MATTER_INTELLIGENCE_ENTERPRISE_PRICE_ID],
  }

  for (const priceId of terminalPrices.pro.map((value: unknown) => String(value || '').trim()).filter(Boolean))
    terminalPriceToPlan[priceId] = 'pro'
  for (const priceId of terminalPrices.team.map((value: unknown) => String(value || '').trim()).filter(Boolean))
    terminalPriceToPlan[priceId] = 'team'
  for (const priceId of matterPrices.solo.map((value: unknown) => String(value || '').trim()).filter(Boolean))
    matterPriceToPlan[priceId] = 'solo'
  for (const priceId of matterPrices.team.map((value: unknown) => String(value || '').trim()).filter(Boolean))
    matterPriceToPlan[priceId] = 'team'
  for (const priceId of matterPrices.enterprise.map((value: unknown) => String(value || '').trim()).filter(Boolean))
    matterPriceToPlan[priceId] = 'enterprise'

  const result = {
    email: normalizedEmail,
    terminal_pro: { active: false, plan: null as string | null, status: 'not_found' },
    matter_intelligence: { active: false, plan: null as string | null, status: 'not_found' },
  }

  for (const subscription of subscriptions) {
    const status = String(subscription?.status || '').toLowerCase()
    const active = activeStatuses.has(status)
    const priceId = String(subscription?.items?.data?.[0]?.price?.id || '').trim()
    if (!priceId) continue

    if (terminalPriceToPlan[priceId]) {
      result.terminal_pro = {
        active,
        plan: terminalPriceToPlan[priceId],
        status: status || 'unknown',
      }
    }

    if (matterPriceToPlan[priceId]) {
      result.matter_intelligence = {
        active,
        plan: matterPriceToPlan[priceId],
        status: status || 'unknown',
      }
    }
  }

  return result
}

async function handleMeEntitlements(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const token = extractToken(request.headers.get('Authorization'))
  if (!token) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const payload = await verifyToken(token, env.AUTH_SECRET)
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const email = String(payload.email || '')
    .trim()
    .toLowerCase()
  if (!email) {
    return new Response(JSON.stringify({ error: 'Authenticated email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const entitlements = await lookupProductEntitlementsByEmail(email, env)

  return new Response(
    JSON.stringify({
      email,
      entitlements: {
        terminalPro: entitlements.terminal_pro,
        matterIntelligence: entitlements.matter_intelligence,
      },
      active: Boolean(entitlements.terminal_pro.active) || Boolean(entitlements.matter_intelligence.active),
      updatedAt: new Date().toISOString(),
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

async function handleDesktopSessionRequest(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const authToken = extractToken(request.headers.get('Authorization'))
    let email = ''
    if (authToken) {
      const payload = await verifyToken(authToken, env.AUTH_SECRET)
      email = String(payload?.email || '')
        .trim()
        .toLowerCase()
    }

    if (!email) {
      const body = await request.json().catch(() => ({}))
      email = String(body?.email || '')
        .trim()
        .toLowerCase()
    }

    if (!email || !env.AUTH_SECRET) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const entitlements = await lookupProductEntitlementsByEmail(email, env)
    if (!entitlements.terminal_pro.active && !entitlements.matter_intelligence.active) {
      return new Response(
        JSON.stringify({
          error: 'No active subscription found for this account.',
          entitlements: {
            terminalPro: entitlements.terminal_pro,
            matterIntelligence: entitlements.matter_intelligence,
          },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }
    const sessionToken = await createToken(
      {
        email,
        type: 'desktop_session',
        terminalProActive: entitlements.terminal_pro.active,
        matterIntelligenceActive: entitlements.matter_intelligence.active,
      },
      env.AUTH_SECRET,
      60 * 60 * 12
    )

    return new Response(
      JSON.stringify({
        ok: true,
        email,
        sessionToken,
        entitlements: {
          terminalPro: entitlements.terminal_pro,
          matterIntelligence: entitlements.matter_intelligence,
        },
        accountUrl: 'https://rinawarptech.com/account',
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

async function ensureMatterIntelligenceTables(env: any): Promise<void> {
  if (matterIntelligenceTablesInitialized) return
  const db = getDb(env)
  if (!db) return

  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS matter_intelligence_matters (
        id TEXT PRIMARY KEY,
        owner_email TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_synced_at INTEGER
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_mi_matters_owner ON matter_intelligence_matters(owner_email)`),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_mi_matters_owner_status ON matter_intelligence_matters(owner_email, status)`
    ),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS matter_intelligence_connector_state (
        id TEXT PRIMARY KEY,
        owner_email TEXT NOT NULL,
        provider TEXT NOT NULL,
        status TEXT NOT NULL,
        config_json TEXT,
        started_at INTEGER NOT NULL,
        last_synced_at INTEGER
      )
    `),
    db.prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_mi_connector_owner_provider ON matter_intelligence_connector_state(owner_email, provider)`
    ),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS matter_intelligence_events (
        id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        owner_email TEXT NOT NULL,
        event_type TEXT NOT NULL,
        summary TEXT NOT NULL,
        citation TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (matter_id) REFERENCES matter_intelligence_matters(id) ON DELETE CASCADE
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_mi_events_matter ON matter_intelligence_events(matter_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_mi_events_owner ON matter_intelligence_events(owner_email)`),
  ])

  matterIntelligenceTablesInitialized = true
}

async function requireMatterIntelligenceAccess(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<{ email: string } | Response> {
  const token = extractToken(request.headers.get('Authorization'))
  if (!token) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const payload = await verifyToken(token, env.AUTH_SECRET)
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const email = String(payload.email || '')
    .trim()
    .toLowerCase()
  if (!email) {
    return new Response(JSON.stringify({ error: 'Authenticated email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const entitlements = await lookupProductEntitlementsByEmail(email, env)
  if (!entitlements.matter_intelligence.active) {
    return new Response(
      JSON.stringify({
        error: 'Matter Intelligence access is not active for this account.',
        entitlements: {
          terminalPro: entitlements.terminal_pro,
          matterIntelligence: entitlements.matter_intelligence,
        },
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }

  return { email }
}

function isMatterStatusAllowed(raw: unknown): boolean {
  const status = String(raw || '')
    .trim()
    .toLowerCase()
  return status === 'open' || status === 'in_review' || status === 'closed'
}

async function handleMatterIntelligenceListMatters(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const access = await requireMatterIntelligenceAccess(request, env, corsHeaders)
  if (access instanceof Response) return access

  await ensureMatterIntelligenceTables(env)
  const db = getDb(env)
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const statusFilter = String(new URL(request.url).searchParams.get('status') || '')
    .trim()
    .toLowerCase()
  const result =
    statusFilter && isMatterStatusAllowed(statusFilter)
      ? await db
          .prepare(
            `
        SELECT id, title, description, status, created_at AS createdAt, updated_at AS updatedAt, last_synced_at AS lastSyncedAt
        FROM matter_intelligence_matters
        WHERE owner_email = ? AND status = ?
        ORDER BY updated_at DESC
      `
          )
          .bind(access.email, statusFilter)
          .all()
      : await db
          .prepare(
            `
        SELECT id, title, description, status, created_at AS createdAt, updated_at AS updatedAt, last_synced_at AS lastSyncedAt
        FROM matter_intelligence_matters
        WHERE owner_email = ?
        ORDER BY updated_at DESC
      `
          )
          .bind(access.email)
          .all()

  return new Response(JSON.stringify(result.results || []), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function handleMatterIntelligenceCreateMatter(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const access = await requireMatterIntelligenceAccess(request, env, corsHeaders)
  if (access instanceof Response) return access

  await ensureMatterIntelligenceTables(env)
  const db = getDb(env)
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const body = await request.json().catch(() => ({}))
  const title = String(body?.title || '').trim()
  const description = String(body?.description || '').trim()
  const status = String(body?.status || 'open')
    .trim()
    .toLowerCase()
  if (!title || !description) {
    return new Response(JSON.stringify({ error: 'Title and description are required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
  if (!isMatterStatusAllowed(status)) {
    return new Response(JSON.stringify({ error: 'Status must be open, in_review, or closed.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const now = nowSeconds()
  const matterId = `matter_${crypto.randomUUID()}`

  await db
    .prepare(
      `
    INSERT INTO matter_intelligence_matters (id, owner_email, title, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
    )
    .bind(matterId, access.email, title, description, status, now, now)
    .run()

  await db
    .prepare(
      `
    INSERT INTO matter_intelligence_events (id, matter_id, owner_email, event_type, summary, citation, created_at)
    VALUES (?, ?, ?, 'matter_created', ?, ?, ?)
  `
    )
    .bind(`mievt_${crypto.randomUUID()}`, matterId, access.email, `Matter created: ${title}`, `matter:${matterId}`, now)
    .run()

  return new Response(
    JSON.stringify({
      id: matterId,
      title,
      description,
      status,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: null,
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

async function handleMatterIntelligenceGetMatter(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>,
  matterIdRaw: string
): Promise<Response> {
  const access = await requireMatterIntelligenceAccess(request, env, corsHeaders)
  if (access instanceof Response) return access

  await ensureMatterIntelligenceTables(env)
  const db = getDb(env)
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const matterId = String(matterIdRaw || '').trim()
  if (!matterId) {
    return new Response(JSON.stringify({ error: 'Matter id is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const matter = await db
    .prepare(
      `
    SELECT id, title, description, status, created_at AS createdAt, updated_at AS updatedAt, last_synced_at AS lastSyncedAt
    FROM matter_intelligence_matters
    WHERE id = ? AND owner_email = ?
  `
    )
    .bind(matterId, access.email)
    .first()

  if (!matter) {
    return new Response(JSON.stringify({ error: 'Matter not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const events = await db
    .prepare(
      `
    SELECT id, event_type AS eventType, summary, citation, created_at AS createdAt
    FROM matter_intelligence_events
    WHERE matter_id = ? AND owner_email = ?
    ORDER BY created_at DESC
    LIMIT 20
  `
    )
    .bind(matterId, access.email)
    .all()

  return new Response(
    JSON.stringify({
      ...matter,
      events: events.results || [],
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

async function handleMatterIntelligenceMicrosoftStart(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const access = await requireMatterIntelligenceAccess(request, env, corsHeaders)
  if (access instanceof Response) return access

  await ensureMatterIntelligenceTables(env)
  const db = getDb(env)
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const tenant = String(env.MS_TENANT_ID || 'common').trim()
  const clientId = String(env.MS_CLIENT_ID || '').trim()
  const redirectUri = String(env.MS_REDIRECT_URI || '').trim()
  const scope = String(env.MS_SCOPE || 'offline_access User.Read Mail.Read Files.Read.All').trim()
  const now = nowSeconds()
  const statePayload = {
    email: access.email,
    issuedAt: now,
  }
  const encodedState = btoa(JSON.stringify(statePayload))

  let authUrl: string | null = null
  if (clientId && redirectUri) {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      response_mode: 'query',
      redirect_uri: redirectUri,
      scope,
      state: encodedState,
    })
    authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`
  }

  await db
    .prepare(
      `
    INSERT INTO matter_intelligence_connector_state (id, owner_email, provider, status, config_json, started_at, last_synced_at)
    VALUES (?, ?, 'microsoft', ?, ?, ?, NULL)
    ON CONFLICT(owner_email, provider) DO UPDATE SET
      status = excluded.status,
      config_json = excluded.config_json,
      started_at = excluded.started_at
  `
    )
    .bind(
      `miconn_${crypto.randomUUID()}`,
      access.email,
      authUrl ? 'oauth_ready' : 'not_configured',
      JSON.stringify({
        tenant,
        scope,
        hasClientId: Boolean(clientId),
        hasRedirectUri: Boolean(redirectUri),
      }),
      now
    )
    .run()

  return new Response(
    JSON.stringify({
      ok: true,
      provider: 'microsoft',
      status: authUrl ? 'oauth_ready' : 'not_configured',
      authUrl,
      message: authUrl
        ? 'Open the auth URL to connect Outlook and SharePoint.'
        : 'Microsoft OAuth is not configured yet on the production API.',
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

async function handleMatterIntelligenceMicrosoftSync(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const access = await requireMatterIntelligenceAccess(request, env, corsHeaders)
  if (access instanceof Response) return access

  await ensureMatterIntelligenceTables(env)
  const db = getDb(env)
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const body = await request.json().catch(() => ({}))
  const matterId = String(body?.matterId || '').trim()
  const now = nowSeconds()

  const connector = await db
    .prepare(
      `
    SELECT status
    FROM matter_intelligence_connector_state
    WHERE owner_email = ? AND provider = 'microsoft'
  `
    )
    .bind(access.email)
    .first<{ status?: string }>()

  if (!connector) {
    return new Response(
      JSON.stringify({
        error: 'Microsoft connector has not been started. Call /api/connectors/microsoft/start first.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }

  await db
    .prepare(
      `
    UPDATE matter_intelligence_connector_state
    SET status = 'synced',
        last_synced_at = ?
    WHERE owner_email = ? AND provider = 'microsoft'
  `
    )
    .bind(now, access.email)
    .run()

  const matter = matterId
    ? await db
        .prepare(
          `
      SELECT id, title
      FROM matter_intelligence_matters
      WHERE id = ? AND owner_email = ?
    `
        )
        .bind(matterId, access.email)
        .first<{ id: string; title: string }>()
    : await db
        .prepare(
          `
      SELECT id, title
      FROM matter_intelligence_matters
      WHERE owner_email = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `
        )
        .bind(access.email)
        .first<{ id: string; title: string }>()

  if (matter) {
    await db
      .prepare(
        `
      UPDATE matter_intelligence_matters
      SET last_synced_at = ?, updated_at = ?
      WHERE id = ? AND owner_email = ?
    `
      )
      .bind(now, now, matter.id, access.email)
      .run()

    await db
      .prepare(
        `
      INSERT INTO matter_intelligence_events (id, matter_id, owner_email, event_type, summary, citation, created_at)
      VALUES (?, ?, ?, 'sync_completed', ?, ?, ?)
    `
      )
      .bind(
        `mievt_${crypto.randomUUID()}`,
        matter.id,
        access.email,
        `Microsoft sync completed for "${matter.title}".`,
        `matter:${matter.id}`,
        now
      )
      .run()
  }

  return new Response(
    JSON.stringify({
      ok: true,
      provider: 'microsoft',
      syncedAt: now,
      matterId: matter?.id || null,
      message: matter
        ? `Sync recorded for ${matter.title}.`
        : 'Sync recorded. Create a matter to attach timeline events.',
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

async function handleMatterIntelligenceSearch(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const access = await requireMatterIntelligenceAccess(request, env, corsHeaders)
  if (access instanceof Response) return access

  await ensureMatterIntelligenceTables(env)
  const db = getDb(env)
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const url = new URL(request.url)
  const q = String(url.searchParams.get('q') || '').trim()
  const matterId = String(url.searchParams.get('matterId') || '').trim()
  if (!q) {
    return new Response(JSON.stringify({ error: 'Query parameter q is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const qLike = `%${q.replace(/[%_]/g, '')}%`
  const matches = matterId
    ? await db
        .prepare(
          `
      SELECT id, title, description, status, updated_at AS updatedAt
      FROM matter_intelligence_matters
      WHERE owner_email = ? AND id = ? AND (title LIKE ? OR description LIKE ?)
      ORDER BY updated_at DESC
      LIMIT 10
    `
        )
        .bind(access.email, matterId, qLike, qLike)
        .all()
    : await db
        .prepare(
          `
      SELECT id, title, description, status, updated_at AS updatedAt
      FROM matter_intelligence_matters
      WHERE owner_email = ? AND (title LIKE ? OR description LIKE ?)
      ORDER BY updated_at DESC
      LIMIT 10
    `
        )
        .bind(access.email, qLike, qLike)
        .all()

  const results = (matches.results || []).map((item: any) => ({
    type: 'matter',
    matterId: item.id,
    title: item.title,
    status: item.status,
    snippet: String(item.description || '').slice(0, 240),
    citation: `matter:${item.id}`,
    updatedAt: item.updatedAt,
  }))

  return new Response(
    JSON.stringify({
      ok: true,
      query: q,
      count: results.length,
      results,
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

async function handleMatterIntelligenceStatusMemoDraft(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const access = await requireMatterIntelligenceAccess(request, env, corsHeaders)
  if (access instanceof Response) return access

  await ensureMatterIntelligenceTables(env)
  const db = getDb(env)
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const body = await request.json().catch(() => ({}))
  const matterId = String(body?.matterId || '').trim()
  if (!matterId) {
    return new Response(JSON.stringify({ error: 'matterId is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const matter = await db
    .prepare(
      `
    SELECT id, title, description, status, created_at AS createdAt, updated_at AS updatedAt, last_synced_at AS lastSyncedAt
    FROM matter_intelligence_matters
    WHERE id = ? AND owner_email = ?
  `
    )
    .bind(matterId, access.email)
    .first<any>()

  if (!matter) {
    return new Response(JSON.stringify({ error: 'Matter not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const timeline = await db
    .prepare(
      `
    SELECT summary, citation, created_at AS createdAt
    FROM matter_intelligence_events
    WHERE matter_id = ? AND owner_email = ?
    ORDER BY created_at DESC
    LIMIT 8
  `
    )
    .bind(matterId, access.email)
    .all()

  const entries = (timeline.results || []) as Array<{ summary: string; citation: string | null; createdAt: number }>
  const generatedAt = new Date().toISOString()
  const timelineLines =
    entries.length > 0
      ? entries.map((entry) => `- ${entry.summary} [${entry.citation || `matter:${matterId}`}]`).join('\n')
      : `- Matter opened and awaiting first timeline event. [matter:${matterId}]`

  const memo = [
    `Status memo for "${matter.title}" (${generatedAt})`,
    '',
    `Current status: ${matter.status}`,
    `Matter summary: ${matter.description}`,
    '',
    'What changed since last review:',
    timelineLines,
    '',
    'Recommended reviewer checks:',
    '- Confirm open obligations and deadlines are still accurate.',
    '- Validate connector sync completeness before distribution.',
    '',
    `Primary citation: [matter:${matterId}]`,
  ].join('\n')

  return new Response(
    JSON.stringify({
      ok: true,
      matterId,
      draft: memo,
      citations: [`matter:${matterId}`, ...entries.map((entry) => entry.citation).filter(Boolean)],
      generatedAt,
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

async function handleMatterIntelligenceLeadRequest(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json()
    const email = String(body?.email || '')
      .trim()
      .toLowerCase()
    const requestType = String(body?.requestType || '')
      .trim()
      .toLowerCase()
    if (!email || !requestType) {
      return new Response(JSON.stringify({ error: 'Email and request type are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const db = getDb(env)
    if (db) {
      const now = nowSeconds()
      await db
        .prepare(
          `
        INSERT INTO matter_intelligence_leads (
          id, request_type, name, email, company, team_size, plan_interest, message, source_path, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .bind(
          `mi_lead_${crypto.randomUUID()}`,
          requestType,
          String(body?.name || '').trim() || null,
          email,
          String(body?.company || '').trim() || null,
          String(body?.teamSize || '').trim() || null,
          String(body?.planInterest || '').trim() || null,
          String(body?.message || '').trim() || null,
          String(body?.sourcePath || '').trim() || null,
          now
        )
        .run()
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

async function handleVscodeEntitlements(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const token = extractToken(request.headers.get('Authorization'))
  if (!token) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const payload = await verifyToken(token, env.AUTH_SECRET)
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const email = String(payload.email || '')
    .trim()
    .toLowerCase()
  if (!email) {
    return new Response(JSON.stringify({ error: 'Authenticated email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const license = await lookupLicenseByEmail(email, env)
  const plan =
    license.tier === 'pro' || license.tier === 'team' || license.tier === 'power'
      ? license.tier === 'power'
        ? 'team'
        : license.tier
      : 'free'
  const packs =
    plan === 'team'
      ? ['docker-repair', 'system-diagnostics', 'npm-audit', 'security-audit', 'test-runner']
      : plan === 'pro'
        ? ['docker-repair', 'system-diagnostics', 'npm-audit', 'security-audit']
        : ['system-diagnostics']

  return new Response(
    JSON.stringify({
      email,
      plan,
      packs,
      status: license.status,
      updatedAt: new Date().toISOString(),
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

async function handleVscodeChat(request: Request, env: any, corsHeaders: Record<string, string>): Promise<Response> {
  const token = extractToken(request.headers.get('Authorization'))
  if (!token) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const payload = await verifyToken(token, env.AUTH_SECRET)
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const email = String(payload.email || '')
    .trim()
    .toLowerCase()
  if (!email) {
    return new Response(JSON.stringify({ error: 'Authenticated email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const body = (await request.json().catch(() => null)) as {
    client?: { product?: string; extensionVersion?: string }
    messages?: Array<{ role?: string; content?: string }>
    workspaceContext?: {
      diagnostic?: {
        findings?: string[]
        recommendedPack?: string
        recommendedReason?: string
        workspaceName?: string
      }
      hasWorkspace?: boolean
      markers?: string[]
      packageManagerHint?: string
      packageName?: string
      packageScripts?: string[]
      plan?: string
      topLevelEntries?: string[]
      workspaceName?: string
      workspaceSummary?: string
    }
  } | null

  const messages = Array.isArray(body?.messages)
    ? body!.messages
        .filter(
          (message): message is { role: 'user' | 'assistant'; content: string } =>
            (message?.role === 'user' || message?.role === 'assistant') &&
            typeof message.content === 'string' &&
            message.content.trim().length > 0
        )
        .slice(-10)
    : []

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')
    ?.content?.trim()
  if (!latestUserMessage) {
    return new Response(JSON.stringify({ error: 'A user message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const plan =
    body?.workspaceContext?.plan === 'pro' ||
    body?.workspaceContext?.plan === 'team' ||
    body?.workspaceContext?.plan === 'power'
      ? body.workspaceContext.plan === 'power'
        ? 'team'
        : body.workspaceContext.plan
      : 'free'
  const diagnostic = body?.workspaceContext?.diagnostic
  const fallback = buildCompanionChatFallback({
    diagnostic,
    hasWorkspace: Boolean(body?.workspaceContext?.hasWorkspace),
    latestUserMessage,
    plan,
  })

  if (!env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({
        actions: fallback.actions,
        message: fallback.message,
        mode: 'fallback',
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }

  try {
    const systemPrompt = [
      'You are Rina for RinaWarp Companion inside VS Code.',
      'Be concise, practical, and safe.',
      'Do not claim to have executed commands.',
      'Do not ask for secrets or file contents.',
      'Focus on diagnostics, capability packs, pricing boundaries, and next safe steps.',
      'If the user sounds like they want execution, recommend Companion actions instead of pretending you ran anything.',
      'Keep the response under 140 words.',
    ].join(' ')

    const contextLines = [
      `Plan: ${plan}`,
      `Connected email: ${email}`,
      `Workspace open: ${body?.workspaceContext?.hasWorkspace ? 'yes' : 'no'}`,
      body?.workspaceContext?.workspaceName ? `Workspace: ${body.workspaceContext.workspaceName}` : null,
      body?.workspaceContext?.workspaceSummary ? `Workspace summary: ${body.workspaceContext.workspaceSummary}` : null,
      Array.isArray(body?.workspaceContext?.markers) && body?.workspaceContext?.markers?.length
        ? `Markers: ${body.workspaceContext.markers.join(', ')}`
        : null,
      body?.workspaceContext?.packageName ? `Package name: ${body.workspaceContext.packageName}` : null,
      body?.workspaceContext?.packageManagerHint
        ? `Package manager: ${body.workspaceContext.packageManagerHint}`
        : null,
      Array.isArray(body?.workspaceContext?.packageScripts) && body?.workspaceContext?.packageScripts?.length
        ? `Package scripts: ${body.workspaceContext.packageScripts.join(', ')}`
        : null,
      Array.isArray(body?.workspaceContext?.topLevelEntries) && body?.workspaceContext?.topLevelEntries?.length
        ? `Top level entries: ${body.workspaceContext.topLevelEntries.join(', ')}`
        : null,
      diagnostic?.workspaceName ? `Last diagnostic workspace: ${diagnostic.workspaceName}` : null,
      diagnostic?.recommendedPack ? `Recommended pack: ${diagnostic.recommendedPack}` : null,
      diagnostic?.recommendedReason ? `Recommended reason: ${diagnostic.recommendedReason}` : null,
      Array.isArray(diagnostic?.findings) && diagnostic?.findings?.length
        ? `Findings: ${diagnostic.findings.join('; ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n')

    const llmMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `Context:\n${contextLines}` },
      ...messages.map((message) => ({ role: message.role, content: message.content })),
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: llmMessages,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI returned ${response.status}`)
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = json.choices?.[0]?.message?.content?.trim() || fallback.message

    return new Response(
      JSON.stringify({
        actions: fallback.actions,
        message: content,
        mode: 'model',
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (error) {
    console.warn('[vscode/chat] model-backed response failed, falling back', error)
    return new Response(
      JSON.stringify({
        actions: fallback.actions,
        message: fallback.message,
        mode: 'fallback',
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

function buildCompanionChatFallback(input: {
  diagnostic?: {
    findings?: string[]
    recommendedPack?: string
    recommendedReason?: string
    workspaceName?: string
  }
  hasWorkspace: boolean
  latestUserMessage: string
  plan: 'free' | 'pro' | 'team'
}): { actions: Array<{ command: string; label: string; args?: unknown[] }>; message: string } {
  const normalized = input.latestUserMessage.toLowerCase()
  const recommendedPack = input.diagnostic?.recommendedPack || 'system-diagnostics'
  const actions: Array<{ command: string; label: string; args?: unknown[] }> = []

  if (!input.hasWorkspace) {
    return {
      actions,
      message:
        'Open a workspace folder first if you want project-specific guidance. You can still ask about plans, packs, or how Companion works.',
    }
  }

  if (/\bdiagnostic|check|scan|health|inspect\b/.test(normalized)) {
    actions.push({ command: 'rinawarp.runFreeDiagnostic', label: 'Run Free Diagnostic' })
    return {
      actions,
      message: input.diagnostic
        ? `Your last diagnostic for ${input.diagnostic.workspaceName || 'this workspace'} pointed toward ${recommendedPack}. ${input.diagnostic.recommendedReason || 'That is the safest next place to start.'}`
        : 'The safest next step is to run the free diagnostic so Companion can inspect local workspace markers and recommend a pack.',
    }
  }

  if (/\bpack|docker|security|audit|test|npm\b/.test(normalized)) {
    actions.push({
      command: 'rinawarp.openPack',
      label: `Open ${recommendedPack}`,
      args: [recommendedPack, 'chat_recommended_pack'],
    })
    actions.push({ command: 'rinawarp.openPacks', label: 'Open All Packs' })
    return {
      actions,
      message: `Based on the current workspace signals, I would start with ${recommendedPack}. ${input.diagnostic?.recommendedReason || 'That pack is the best fit for the strongest signal Companion has seen so far.'}`,
    }
  }

  if (/\bprice|upgrade|pro|team|billing\b/.test(normalized)) {
    if (input.plan === 'free') {
      actions.push({ command: 'rinawarp.upgradeToPro', label: 'Upgrade to Pro' })
      return {
        actions,
        message:
          'You are currently on the free plan. Pro is the next step if you want richer pack coverage and higher-velocity workflows from Companion.',
      }
    }
    return {
      actions: [{ command: 'rinawarp.refreshEntitlements', label: 'Refresh Entitlements' }],
      message: `Your current plan is ${input.plan.toUpperCase()}. If Companion looks out of sync, refresh entitlements here before changing billing.`,
    }
  }

  actions.push({ command: 'rinawarp.runFreeDiagnostic', label: 'Run Free Diagnostic' })
  actions.push({
    command: 'rinawarp.openPack',
    label: `Open ${recommendedPack}`,
    args: [recommendedPack, 'chat_default_pack'],
  })
  return {
    actions,
    message: input.diagnostic
      ? `A good next step is ${recommendedPack} for ${input.diagnostic.workspaceName || 'this workspace'}. If you want fresher context first, rerun the free diagnostic and I can interpret it with you.`
      : 'A good first move is to run the free diagnostic. Once Companion sees your workspace markers, I can recommend the safest pack and explain why.',
  }
}

// Feedback submission handler with SendGrid email notification
async function handleFeedbackSubmit(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json()
    const { name, email, rating, message, topic } = body

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Log feedback for now
    console.log('Feedback received:', { name, email, rating, topic, message, timestamp: new Date().toISOString() })

    // Send email notification via SendGrid if API key is configured
    if (env.SENDGRID_API_KEY) {
      try {
        const safeName = escapeHtml(String(name || ''))
        const safeEmail = escapeHtml(String(email || ''))
        const safeTopic = escapeHtml(String(topic || 'General'))
        const safeRating = escapeHtml(String(rating || 'Not provided'))
        const safeMessage = escapeHtml(String(message || '')).replace(/\n/g, '<br>')
        const emailBody = {
          personalizations: [
            {
              to: [{ email: 'support@rinawarptech.com' }],
              subject: `[${String(topic || 'general').toUpperCase()}] New Feedback: ${rating ? `rating ${rating}` : ''} from ${String(name || '')}`,
            },
          ],
          from: { email: 'noreply@rinawarptech.com', name: 'RinaWarp Feedback' },
          content: [
            {
              type: 'text/html',
              value: `
              <h2>New Feedback Received</h2>
              <p><strong>Name:</strong> ${safeName}</p>
              <p><strong>Email:</strong> ${safeEmail}</p>
              <p><strong>Topic:</strong> ${safeTopic}</p>
              <p><strong>Rating:</strong> ${safeRating}</p>
              <p><strong>Message:</strong></p>
              <p>${safeMessage}</p>
              <hr>
              <p><small>Submitted: ${new Date().toISOString()}</small></p>
            `,
            },
          ],
        }

        const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailBody),
        })

        if (!emailResponse.ok) {
          console.error('SendGrid error:', await emailResponse.text())
        }
      } catch (emailErr) {
        console.error('Failed to send feedback email:', emailErr)
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Feedback received' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return char
    }
  })
}

// Stripe Checkout session creation handler
async function handleCheckoutRequest(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json()
    const {
      email,
      tier = 'pro',
      billingCycle = 'monthly',
      seats,
      workspaceId,
      returnTo,
      referralCode,
      product = 'terminal-pro',
    } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const normalizedTier = String(tier || 'pro')
      .trim()
      .toLowerCase()
    const normalizedBillingCycle = String(billingCycle || 'monthly')
      .trim()
      .toLowerCase()
    const normalizedProduct = String(product || 'terminal-pro')
      .trim()
      .toLowerCase()

    const priceIds: Record<string, string> = {
      pro_monthly: String(env.STRIPE_PRO_MONTHLY_PRICE_ID || env.STRIPE_PRO_PRICE_ID || '').trim(),
      pro_annual: String(env.STRIPE_PRO_ANNUAL_PRICE_ID || '').trim(),
      power: String(env.STRIPE_POWER_PRICE_ID || env.STRIPE_TEAM_PRICE_ID || '').trim(),
      pay_per_fix: String(env.STRIPE_PAY_PER_FIX_PRICE_ID || '').trim(),
      creator: String(env.STRIPE_CREATOR_PRICE_ID || '').trim(),
      team: String(env.STRIPE_TEAM_PRICE_ID || '').trim(),
      founder: String(env.STRIPE_FOUNDER_PRICE_ID || '').trim(),
      mi_solo: String(env.STRIPE_MI_SOLO_PRICE_ID || env.STRIPE_MATTER_INTELLIGENCE_SOLO_PRICE_ID || '').trim(),
      mi_team: String(env.STRIPE_MI_TEAM_PRICE_ID || env.STRIPE_MATTER_INTELLIGENCE_TEAM_PRICE_ID || '').trim(),
      mi_enterprise: String(
        env.STRIPE_MI_ENTERPRISE_PRICE_ID || env.STRIPE_MATTER_INTELLIGENCE_ENTERPRISE_PRICE_ID || ''
      ).trim(),
    }

    if (normalizedProduct === 'matter-intelligence') {
      if (normalizedTier !== 'solo' && normalizedTier !== 'team' && normalizedTier !== 'enterprise') {
        return new Response(
          JSON.stringify({ error: 'Only Solo, Team, and Enterprise are configured for Matter Intelligence.' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }
    } else if (
      normalizedTier !== 'pro' &&
      normalizedTier !== 'power' &&
      normalizedTier !== 'team' &&
      normalizedTier !== 'fix'
    ) {
      return new Response(
        JSON.stringify({ error: 'Only Pro, Power, and one-fix checkout are configured right now.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    const resolvedTierKey =
      normalizedProduct === 'matter-intelligence'
        ? normalizedTier === 'team'
          ? 'mi_team'
          : normalizedTier === 'enterprise'
            ? 'mi_enterprise'
            : 'mi_solo'
        : normalizedTier === 'power' || normalizedTier === 'team'
          ? 'power'
          : normalizedTier === 'fix'
            ? 'pay_per_fix'
            : normalizedBillingCycle === 'annual'
              ? 'pro_annual'
              : 'pro_monthly'
    const normalizedReferralCode = normalizeReferralCode(referralCode)

    const successUrl = new URL(
      normalizedProduct === 'matter-intelligence'
        ? 'https://rinawarptech.com/matter-intelligence/download/'
        : 'https://rinawarptech.com/success/'
    )
    if (String(returnTo || '').trim()) {
      successUrl.searchParams.set('return_to', String(returnTo).trim())
    }
    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}')

    const priceId =
      normalizedProduct === 'matter-intelligence'
        ? priceIds[resolvedTierKey]
        : priceIds[resolvedTierKey] || priceIds.pro_monthly
    const quantity =
      (normalizedProduct === 'matter-intelligence' && normalizedTier === 'team') ||
      (normalizedProduct !== 'matter-intelligence' && (normalizedTier === 'power' || normalizedTier === 'team'))
        ? String(Math.max(1, Math.min(500, Number(seats || 1) || 1)))
        : '1'

    if (!priceId) {
      return new Response(
        JSON.stringify({
          error: `Checkout is not configured for ${normalizedTier}${normalizedTier === 'pro' ? ` (${normalizedBillingCycle})` : ''}.`,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    await maybeTrackReferralEvent(env, {
      referralCode: normalizedReferralCode,
      eventType: 'checkout_started',
      referredEmail: email,
      source: 'website_checkout',
      metadata: {
        tier:
          normalizedProduct === 'matter-intelligence'
            ? normalizedTier
            : normalizedTier === 'team'
              ? 'power'
              : normalizedTier,
        product: normalizedProduct,
        billingCycle: normalizedBillingCycle,
        seats: Number(quantity),
        workspaceId: String(workspaceId || '').trim() || null,
      },
    })

    // If Stripe secret key is available, create a real checkout session
    if (env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.startsWith('sk_')) {
      try {
        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            mode: normalizedTier === 'fix' ? 'payment' : 'subscription',
            customer_email: email,
            'line_items[0][price]': priceId,
            'line_items[0][quantity]': quantity,
            billing_address_collection: 'required',
            'automatic_tax[enabled]': 'true',
            'tax_id_collection[enabled]': 'true',
            'metadata[tier]':
              normalizedProduct === 'matter-intelligence'
                ? normalizedTier
                : normalizedTier === 'team'
                  ? 'power'
                  : normalizedTier,
            'metadata[product]': normalizedProduct,
            ...(normalizedReferralCode ? { 'metadata[referral_code]': normalizedReferralCode } : {}),
            ...(String(workspaceId || '').trim() ? { 'metadata[workspace_id]': String(workspaceId).trim() } : {}),
            ...(normalizedTier !== 'fix' ? { 'subscription_data[metadata][product]': normalizedProduct } : {}),
            ...(normalizedTier !== 'fix' &&
            normalizedProduct !== 'matter-intelligence' &&
            (normalizedTier === 'power' || normalizedTier === 'team')
              ? { 'subscription_data[metadata][tier]': 'power' }
              : {}),
            ...(normalizedTier !== 'fix' && normalizedProduct === 'matter-intelligence'
              ? { 'subscription_data[metadata][tier]': normalizedTier }
              : {}),
            ...(normalizedTier !== 'fix' && normalizedReferralCode
              ? { 'subscription_data[metadata][referral_code]': normalizedReferralCode }
              : {}),
            ...(normalizedTier !== 'fix' &&
            normalizedProduct !== 'matter-intelligence' &&
            (normalizedTier === 'power' || normalizedTier === 'team') &&
            String(workspaceId || '').trim()
              ? { 'subscription_data[metadata][workspace_id]': String(workspaceId).trim() }
              : {}),
            success_url: successUrl.toString(),
            cancel_url:
              normalizedProduct === 'matter-intelligence'
                ? 'https://rinawarptech.com/matter-intelligence/pricing/'
                : 'https://rinawarptech.com/pricing/',
          }),
        })

        const session = await response.json()

        if (session.error) {
          const stripeMessage = String(session.error.message || 'Checkout could not be created.')
          const inactivePrice = /price specified is inactive|only accepts active prices/i.test(stripeMessage)
          return new Response(
            JSON.stringify({
              error: inactivePrice
                ? 'Checkout is temporarily unavailable because the configured Stripe price is inactive. Update the live Stripe price ID and try again.'
                : stripeMessage,
              code: inactivePrice ? 'stripe_price_inactive' : 'stripe_checkout_failed',
            }),
            {
              status: 502,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          )
        }

        return new Response(JSON.stringify({ checkoutUrl: session.url }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Checkout could not be created.'
        return new Response(JSON.stringify({ error: message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

    return new Response(
      JSON.stringify({
        error: 'Checkout is not configured on this environment.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

// Stripe Customer Portal handler
async function handlePortalRequest(request: Request, env: any, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    let email: string | undefined
    let returnUrl = 'https://rinawarptech.com/account'

    if (request.method === 'POST') {
      const body = await request.json()
      email = body.email
      if (
        String(body?.product || '')
          .trim()
          .toLowerCase() === 'matter-intelligence'
      ) {
        returnUrl = 'https://rinawarptech.com/matter-intelligence/download'
      }
      if (String(body?.returnUrl || '').trim()) {
        returnUrl = String(body.returnUrl).trim()
      }
    } else {
      // For GET, try to get email from query param
      const url = new URL(request.url)
      email = url.searchParams.get('email') || undefined
      if (url.searchParams.get('product') === 'matter-intelligence') {
        returnUrl = 'https://rinawarptech.com/matter-intelligence/download'
      }
      if (url.searchParams.get('return_url')) {
        returnUrl = String(url.searchParams.get('return_url') || returnUrl)
      }
    }

    // If Stripe secret key is available, create a real portal session
    if (env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.startsWith('sk_') && email) {
      // First, try to find or create a customer
      const customerResponse = await fetch(
        `https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(email)}'`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          },
        }
      )

      const customerData = await customerResponse.json()
      const customers = customerData.data || []

      let customerId: string | null = null

      // Find customer by email
      for (const customer of customers) {
        if (customer.email === email) {
          customerId = customer.id
          break
        }
      }

      // If no customer found, we can't create a portal session without one
      if (!customerId) {
        return new Response(
          JSON.stringify({
            error: 'No existing subscription was found for that email.',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }

      // Create portal session
      const portalResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          customer: customerId,
          return_url: returnUrl,
        }),
      })

      const portalSession = await portalResponse.json()

      if (portalSession.error) {
        return new Response(JSON.stringify({ error: portalSession.error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }

      return new Response(JSON.stringify({ url: portalSession.url }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    return new Response(JSON.stringify({ error: 'Billing portal is not available right now.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

// License lookup by email handler
async function handleLicenseLookup(request: Request, env: any, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const result = await lookupLicenseByEmail(email, env)
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}
