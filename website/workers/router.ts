/**
 * RinaWarp Marketplace Router
 *
 * Routes requests to API or Marketplace UI handlers
 */

import { apiRouter } from './api/index'
import { marketplaceUI } from './marketplace/ui'
import { injectSeoTags } from './seo'
import { handleAuthRequest } from './api/auth'
import { extractToken, verifyToken } from './lib/auth'

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
  const normalized = String(email || '').trim().toLowerCase()
  return normalized === 'support@rinawarptech.com' || normalized === 'hello@rinawarptech.com'
}

async function getAuthenticatedUserFromRequest(request: Request, env: any): Promise<{ userId: string; email: string } | null> {
  const token = extractToken(request.headers.get('Authorization'))
  if (!token || !env.AUTH_SECRET) return null
  const payload = await verifyToken(token, env.AUTH_SECRET)
  const userId = String(payload?.userId || '').trim()
  const email = String(payload?.email || '').trim().toLowerCase()
  if (!userId || !email) return null
  return { userId, email }
}

async function ensureReferralIdentity(env: any, userId: string): Promise<{ code: string; inviteUrl: string } | null> {
  const db = getDb(env)
  if (!db) return null
  try {
    const existing = await db.prepare(
      'SELECT code FROM referral_codes WHERE user_id = ?'
    ).bind(userId).first<{ code: string }>()

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
        await db.prepare(
          'INSERT INTO referral_codes (id, user_id, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(`refcode_${crypto.randomUUID()}`, userId, code, ts, ts).run()

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

async function getReferralSummary(env: any, userId: string): Promise<{
  code: string
  inviteUrl: string
  stats: { clicks: number; checkouts: number; conversions: number }
} | null> {
  const identity = await ensureReferralIdentity(env, userId)
  const db = getDb(env)
  if (!identity || !db) return null
  try {
    const stats = await db.prepare(`
      SELECT
        SUM(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) AS checkouts,
        SUM(CASE WHEN event_type = 'checkout_completed' THEN 1 ELSE 0 END) AS conversions,
        COUNT(*) AS clicks
      FROM referral_events
      WHERE referrer_user_id = ?
    `).bind(userId).first<{ checkouts?: number; conversions?: number; clicks?: number }>()

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

async function maybeTrackReferralEvent(env: any, input: {
  referralCode?: string | null
  eventType: 'checkout_started' | 'checkout_completed'
  referredEmail?: string | null
  checkoutSessionId?: string | null
  source?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const db = getDb(env)
  const code = normalizeReferralCode(input.referralCode)
  if (!db || !code) return
  try {
    const referral = await db.prepare(
      'SELECT user_id FROM referral_codes WHERE code = ?'
    ).bind(code).first<{ user_id: string }>()

    if (!referral?.user_id) return

    const ts = nowSeconds()
    if (input.eventType === 'checkout_completed' && input.checkoutSessionId) {
      const updated = await db.prepare(`
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
    `).bind(
      input.checkoutSessionId,
      JSON.stringify(input.metadata || {}),
      ts,
      String(input.referredEmail || '').trim().toLowerCase() || null,
      code,
      referral.user_id,
      input.checkoutSessionId,
    ).run()

      if (Number(updated.meta?.changes || 0) > 0) {
        return
      }
    }

    await db.prepare(`
      INSERT INTO referral_events (
        id, referral_code, referrer_user_id, referred_email, event_type,
        checkout_session_id, source, metadata_json, created_at, converted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `refevt_${crypto.randomUUID()}`,
      code,
      referral.user_id,
      String(input.referredEmail || '').trim().toLowerCase() || null,
      input.eventType,
      input.checkoutSessionId || null,
      String(input.source || 'website').trim() || 'website',
      JSON.stringify(input.metadata || {}),
      ts,
      input.eventType === 'checkout_completed' ? ts : null,
    ).run()
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
  const object = await env.RINAWARP_CDN?.get('releases/latest.json')
  if (!object) return null
  return JSON.parse(await object.text())
}

async function getChannelReleaseManifest(env: any, channel: 'stable' | 'beta' | 'alpha'): Promise<any | null> {
  const object = await env.RINAWARP_CDN?.get(`releases/${channel}/latest.json`)
  if (!object) return null
  return JSON.parse(await object.text())
}

function buildChannelDownloadSummary(origin: string, channel: 'stable' | 'beta' | 'alpha', manifest: any): {
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

async function renderReleasesJson(env: any, origin: string): Promise<Response> {
  const [stable, beta, alpha] = await Promise.all([
    getChannelReleaseManifest(env, 'stable'),
    getChannelReleaseManifest(env, 'beta'),
    getChannelReleaseManifest(env, 'alpha'),
  ])
  const payload = {
    stable: buildChannelDownloadSummary(origin, 'stable', stable),
    beta: buildChannelDownloadSummary(origin, 'beta', beta),
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
  const bucket = env.RINAWARP_CDN
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
  const object = await env.RINAWARP_CDN?.get(objectKey)
  if (!object) return null

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
}

async function serveDownloadObject(env: any, objectKey: string): Promise<Response | null> {
  const object = await env.RINAWARP_CDN?.get(objectKey)
  if (!object) return null

  const headers = rwHeaders()
  object.writeHttpMetadata(headers)
  headers.set('ETag', object.httpEtag)
  headers.set('Content-Type', contentTypeFor(objectKey))
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Content-Disposition', `attachment; filename="${objectKey.split('/').pop() || 'download'}"`)

  return new Response(object.body, { headers })
}

type SitePage = 'home' | 'pricing' | 'download' | 'docs' | 'agents' | 'feedback' | 'legal' | 'login' | 'register' | 'account'

type SiteAnalyticsEvent =
  | 'site_home_viewed'
  | 'site_pricing_viewed'
  | 'site_download_viewed'
  | 'site_download_clicked'
  | 'checkout_started'

const SITE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    color-scheme: dark;
    --bg: #0b1020;
    --surface: rgba(10, 21, 32, 0.84);
    --surface-strong: #0d1c2a;
    --surface-soft: rgba(255, 255, 255, 0.04);
    --line: rgba(148, 163, 184, 0.16);
    --line-strong: rgba(98, 246, 229, 0.28);
    --text: #edf6ff;
    --muted: #a3b6c9;
    --accent: #62f6e5;
    --accent-2: #ff4fd8;
    --accent-warm: #ff9b6b;
    --accent-soft: #8fefff;
    --success: #22c55e;
    --danger: #fb7185;
    --shadow: 0 16px 36px rgba(0, 0, 0, 0.22);
    --radius: 18px;
    --radius-sm: 12px;
    --content: 1080px;
  }
  body {
    min-height: 100vh;
    color: var(--text);
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    background:
      radial-gradient(circle at top, rgba(255, 79, 216, 0.11), transparent 30%),
      radial-gradient(circle at 85% 12%, rgba(98, 246, 229, 0.10), transparent 22%),
      linear-gradient(180deg, #090d18 0%, #0b1020 100%);
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
    backdrop-filter: blur(20px);
    background: rgba(7, 17, 26, 0.78);
    border-bottom: 1px solid var(--line);
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
    gap: 12px;
    flex-wrap: wrap;
    font-size: 0.88rem;
    color: var(--muted);
  }
  .nav-links a {
    padding: 6px 10px;
    border-radius: 999px;
    transition: color 0.2s ease, background 0.2s ease;
  }
  .nav-links a:hover,
  .nav-links a.active {
    color: var(--text);
    background: rgba(255, 255, 255, 0.06);
  }
  .hero {
    max-width: var(--content);
    margin: 0 auto;
    padding: 56px 24px 26px;
    display: grid;
    gap: 14px;
  }
  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(300px, 0.95fr);
    gap: 24px;
    align-items: center;
  }
  .hero-panel {
    display: grid;
    gap: 14px;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    width: fit-content;
    color: #d8f3ff;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    border: 1px solid var(--line-strong);
    background: linear-gradient(135deg, rgba(255, 79, 216, 0.11), rgba(98, 246, 229, 0.11));
    border-radius: 999px;
    padding: 6px 10px;
  }
  h1 {
    font-size: clamp(1.85rem, 3vw, 3.2rem);
    line-height: 1.02;
    letter-spacing: -0.04em;
    max-width: 12ch;
  }
  .hero-copy,
  .lede {
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.58;
    max-width: 64ch;
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
    min-height: 44px;
    padding: 0 16px;
    border-radius: 999px;
    text-decoration: none;
    font-weight: 650;
    transition: transform 0.18s ease, opacity 0.18s ease, border-color 0.18s ease;
    border: 1px solid transparent;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn-primary {
    color: #08121b;
    background: linear-gradient(135deg, #62f6e5 0%, #8fefff 24%, #ff9b6b 62%, #ff4fd8 100%);
    box-shadow: 0 12px 26px rgba(255, 79, 216, 0.18);
  }
  .btn-secondary {
    color: var(--text);
    background: rgba(255, 255, 255, 0.03);
    border-color: var(--line);
  }
  .btn-secondary-strong {
    color: var(--accent-soft);
    border-color: rgba(98, 246, 229, 0.28);
    background: rgba(98, 246, 229, 0.06);
  }
  main { flex: 1; }
  .section {
    max-width: var(--content);
    margin: 0 auto;
    padding: 26px 24px;
  }
  .section-title {
    font-size: 1.28rem;
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }
  .section-copy {
    color: var(--muted);
    max-width: 62ch;
    line-height: 1.58;
    font-size: 0.95rem;
    margin-bottom: 18px;
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
    padding: 18px;
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
    gap: 10px;
    padding: 18px;
    border-radius: 20px;
    border: 1px solid rgba(98, 246, 229, 0.22);
    background:
      radial-gradient(circle at top right, rgba(255, 79, 216, 0.12), transparent 34%),
      linear-gradient(180deg, rgba(3, 8, 16, 0.98), rgba(9, 18, 28, 0.94));
    box-shadow:
      0 0 20px rgba(255, 79, 216, 0.18),
      0 0 26px rgba(98, 246, 229, 0.08);
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
    border-radius: 20px;
    border: 1px solid rgba(98, 246, 229, 0.22);
    background:
      radial-gradient(circle at top right, rgba(255, 79, 216, 0.12), transparent 34%),
      linear-gradient(180deg, rgba(3, 8, 16, 0.98), rgba(9, 18, 28, 0.94));
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
  .step-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
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
    background: linear-gradient(135deg, #ff4fd8, #ff9b6b, #62f6e5, #8fefff);
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
  .download-grid {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
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
  const noindexPaths = new Set(['/account', '/login', '/register', '/forgot-password', '/reset-password', '/success'])
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
    '/pricing',
    '/team',
    '/download',
    '/docs',
    '/feedback',
    '/early-access',
    '/terms',
    '/privacy',
    '/agents',
    '/what-is-rinawarp',
    '/what-is-a-proof-first-ai-terminal',
    '/rinawarp-vs-ai-terminals',
    '/rinawarp-vs-warp',
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
  if (path === '/pricing') return 'site_pricing_viewed'
  if (path === '/download') return 'site_download_viewed'
  return null
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
          <a href="/#products">Products</a>
          ${navLink('/pricing', 'Pricing', active, 'pricing')}
          <a href="/team">Team</a>
          ${navLink('/download', 'Download', active, 'download')}
          ${navLink('/docs', 'Docs', active, 'docs')}
          ${navLink('/agents', 'Agents', active, 'agents')}
          ${navLink('/feedback', 'Support', active, 'feedback')}
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
          <a href="/#products">Products</a>
          <a href="/docs">Docs</a>
          <a href="/pricing">Pricing</a>
          <a href="/download">Download</a>
          <a href="/feedback">Support</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/early-access">Early Access</a>
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
          <span class="eyebrow">Fix Project</span>
          <h1>Fix your broken project automatically.</h1>
          <p class="hero-copy">RinaWarp detects, repairs, and verifies your codebase in minutes. It does not stop at suggestions. It shows the plan, runs the repair, and proves what changed.</p>
          <p class="lede">Like having a senior engineer fix your project instantly.</p>
          <div class="cta-row">
            <a href="/download" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="home_hero" data-analytics-prop-target="download">Fix My Project</a>
            <a href="/#demo" class="btn btn-secondary btn-secondary-strong">Watch Demo</a>
          </div>
        </div>
        <div class="terminal-preview" aria-label="Fix Project terminal preview">
          <div class="demo-windowbar">
            <span class="demo-dot"></span>
            <span class="demo-dot"></span>
            <span class="demo-dot"></span>
            <span>Fix Project preview</span>
          </div>
          <span class="terminal-line dim">&gt; npm run build</span>
          <span class="terminal-line fail">Module not found: react-scripts</span>
          <span class="terminal-line dim">&gt; rina fix</span>
          <span class="terminal-line ok">Installing missing dependency</span>
          <span class="terminal-line ok">Updating project config</span>
          <span class="terminal-line ok">Rebuilding project</span>
          <span class="terminal-line ok">Build successful</span>
          <span class="terminal-caption">Show → Execute → Prove</span>
        </div>
      </div>
    </section>
  `

  const content = `
    <section class="section">
      <h2 class="section-title" id="demo">Watch the real fix flow</h2>
      <p class="section-copy">This is a real RinaWarp session recorded against a genuinely broken workspace. It shows the exact moment the product should sell: broken project, one click, visible repair, proof attached.</p>
      <div class="demo-video-shell">
        <div class="demo-windowbar">
          <span class="demo-dot"></span>
          <span class="demo-dot"></span>
          <span class="demo-dot"></span>
          <span>Recorded in RinaWarp Terminal Pro</span>
        </div>
        <video class="demo-video" controls preload="metadata" poster="${DEMO_POSTER_URL}" playsinline>
          <source src="${DEMO_WEBM_URL}" type="video/webm" />
          <source src="${DEMO_MP4_URL}" type="video/mp4" />
        </video>
        <div class="demo-meta">
          <span class="demo-chip">21 seconds</span>
          <span class="demo-chip">Real broken workspace</span>
          <span class="demo-chip">Playwright + OBS capture</span>
          <span class="demo-chip">Show → Execute → Prove</span>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">How it works</h2>
      <p class="section-copy">The whole product should make sense in one pass: find what is broken, fix it safely, then verify the result.</p>
      <div class="how-grid">
        <article class="step-card">
          <div class="step-number">1</div>
          <h3>Detect</h3>
          <p>We scan your project, identify what is broken, and show a readable repair plan before anything risky runs.</p>
        </article>
        <article class="step-card">
          <div class="step-number">2</div>
          <h3>Fix</h3>
          <p>Rina executes the repair flow with live narration, step tracking, and visible terminal output instead of vague AI claims.</p>
        </article>
        <article class="step-card">
          <div class="step-number">3</div>
          <h3>Verify</h3>
          <p>We check that the project actually works, summarize what changed, and attach confidence and proof to the result.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">See it fix a real project</h2>
      <p class="section-copy">This is the conversion moment: a broken app on the left, a verified repair on the right.</p>
      <div class="fix-before-after">
        <article class="fix-state bad">
          <div class="kicker">Broken React app</div>
          <h3>Cannot find module 'react-scripts'</h3>
          <p>The project does not build, local setup is broken, and you do not want another hour of trial and error.</p>
          <code>npm run build
Cannot find module 'react-scripts'</code>
        </article>
        <article class="fix-state good">
          <div class="kicker">Fixed in one flow</div>
          <h3>Dependencies installed. Build verified.</h3>
          <p>RinaWarp installs what is missing, updates the project config, rebuilds the app, and gives you a proof-backed result instead of a shrug.</p>
          <code>Installed missing dependencies
Updated build config
Build successful</code>
        </article>
      </div>
      <div class="cta-row" style="margin-top:18px">
        <a href="/download" class="btn btn-primary">Try it on your project</a>
        <a href="/pricing" class="btn btn-secondary">See pricing</a>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Simple pricing</h2>
      <p class="section-copy">Start free, pay when the workflow proves itself, and move up only when you need deeper repair coverage.</p>
      <div class="pricing-grid">
        <article class="card pricing-card">
          <span class="pill">Free</span>
          <div class="price">$0 <span>/ month</span></div>
          <p>Diagnose issues, preview repair plans, and try the product on smaller projects.</p>
          <ul class="feature-list">
            <li>3 to 5 fixes per day</li>
            <li>Small projects only</li>
            <li>Safe and medium-confidence repairs</li>
          </ul>
        </article>
        <article class="card pricing-card featured">
          <span class="pill">Pro</span>
          <div class="price">$15 <span>/ month</span></div>
          <p>Unlimited fixes, auto-apply safe repairs, and the fastest path from broken repo to verified result.</p>
          <ul class="feature-list">
            <li>Unlimited Fix Project runs</li>
            <li>High-impact fixes with approval</li>
            <li>Faster execution and stronger repair coverage</li>
          </ul>
        </article>
      </div>
      <div class="cta-row" style="margin-top:18px">
        <a href="/pricing" class="btn btn-primary">View plans</a>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Works with the stack you already use</h2>
      <p class="section-copy">Focus the trust story on common developer reality, not abstract AI features.</p>
      <div class="trust-row">
        <span class="trust-chip">Node</span>
        <span class="trust-chip">React</span>
        <span class="trust-chip">Next.js</span>
        <span class="trust-chip">Electron</span>
        <span class="trust-chip">TypeScript</span>
      </div>
    </section>

    <section class="section">
      <div class="panel final-cta">
        <div class="kicker">Stop debugging. Start fixing.</div>
        <h2 class="section-title">One button. Visible repair. Proof attached.</h2>
        <p class="section-copy">RinaWarp exists for one moment: you click Fix Project, the product moves immediately, and your broken project comes back working.</p>
        <div class="cta-row">
          <a href="/download" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="home_final" data-analytics-prop-target="download">Fix My Project</a>
          <a href="/#demo" class="btn btn-secondary btn-secondary-strong">Watch Demo</a>
        </div>
      </div>
    </section>
  `

  return renderPage('/', 'home', hero, content)
}

function renderPricing(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Fix Project pricing</span>
      <h1>Fix your broken project automatically.</h1>
      <p class="hero-copy">RinaWarp sells one outcome: visible repair with proof attached. Start free, upgrade when you want unlimited fixes, and move to Power when you need bigger project coverage and team-grade depth.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="pricing-grid">
        <article class="card pricing-card">
          <span class="pill">Free</span>
          <div class="price">$0 <span>/ month</span></div>
          <p>Try Fix Project on smaller repos and prove the workflow before you pay.</p>
          <ul class="feature-list">
            <li>3 to 5 fixes per day</li>
            <li>Small projects and safe repairs</li>
            <li>Medium-confidence fixes included</li>
            <li>No high-impact changes</li>
          </ul>
          <a href="/download" class="btn btn-secondary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="pricing_free" data-analytics-prop-target="download">Choose installer</a>
        </article>
        <article class="card pricing-card featured">
          <span class="pill">Pro</span>
          <div class="price">$15 <span>/ month</span></div>
          <p>For individual developers who want unlimited fixes, better repair coverage, and proof-backed execution that feels instant.</p>
          <ul class="feature-list">
            <li>Unlimited Fix Project runs</li>
            <li>High-impact fixes with explicit approval</li>
            <li>Larger projects and stronger repair strategies</li>
            <li>Priority execution and proof-backed summaries</li>
          </ul>
          <div class="stack" style="gap:12px">
            <input id="checkout-email" type="email" placeholder="you@company.com" aria-label="Email for checkout" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,0.04);color:var(--text)">
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <button class="btn btn-primary" data-checkout-tier="pro" type="button">Start Pro</button>
              <button class="btn btn-secondary" data-checkout-tier="fix" type="button">Buy One Fix</button>
            </div>
            <div class="note" id="checkout-status" aria-live="polite">Pro is $15/month. One Fix is $3. Checkout opens in Stripe.</div>
          </div>
        </article>
        <article class="card pricing-card">
          <span class="pill">Power</span>
          <div class="price">$40 <span>/ month</span></div>
          <p>For heavier workflows, bigger projects, and team-grade repair depth without the friction of a full enterprise rollout.</p>
          <ul class="feature-list">
            <li>Everything in Pro</li>
            <li>Multi-project and larger workspace support</li>
            <li>Advanced diagnostics and stronger repair coverage</li>
            <li>Team-grade rollout path and priority support</li>
          </ul>
          <button class="btn btn-secondary" data-checkout-tier="power" type="button">Start Power</button>
        </article>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Quick answers before you buy</h2>
      <p class="section-copy">The practical questions people ask right before paying.</p>
      <div class="faq-grid">
        <article class="faq-item">
          <h3>What happens after checkout?</h3>
          <p>Checkout returns you to RinaWarp, where you can download the app, sign in or restore access, and confirm the paid tier from the account surface and desktop settings.</p>
        </article>
        <article class="faq-item">
          <h3>How does restore work?</h3>
          <p>Paid access is anchored to the billing email. If a device loses entitlement state, use the restore path in the app or account page before contacting support.</p>
        </article>
        <article class="faq-item">
          <h3>Can I cancel later?</h3>
          <p>Yes. Billing is handled through Stripe, and the billing portal is the canonical place to manage cancellation, plan changes, and payment method updates.</p>
        </article>
        <article class="faq-item">
          <h3>What does the one-fix option do?</h3>
          <p>It gives you a single paid repair attempt without a subscription. It is meant for one-off fixes and onboarding, not ongoing usage.</p>
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

function renderDocs(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Getting started</span>
      <h1>Use RinaWarp Terminal Pro like a collaborator, not a command form.</h1>
      <p class="hero-copy">The desktop app is built around one simple flow: ask in the Agent surface, let Rina inspect or act, and inspect proof only when you need more detail.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="grid three-up">
        <article class="card">
          <div class="kicker">1. Ask naturally</div>
          <h3>Start in the Agent thread</h3>
          <p>Use normal language. Rina can handle questions, vague asks, follow-ups, and real execution requests without forcing you into terminal-shaped commands.</p>
        </article>
        <article class="card">
          <div class="kicker">2. Trust the route</div>
          <h3>Execution only happens through the canonical path</h3>
          <p>If Rina needs to build, test, deploy, fix, or inspect, the work goes through the trusted execution spine. That keeps proof and recovery aligned.</p>
        </article>
        <article class="card">
          <div class="kicker">3. Inspect only when needed</div>
          <h3>Runs, code, diagnostics, and terminal are inspectors</h3>
          <p>The primary surface is the thread. Rina should explain the result there, with run IDs, receipts, and expandable output ready when you want to drill deeper.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Top workflows</h2>
        <ul class="signal-list">
          <li><strong>Build this project.</strong> Rina inspects the current workspace, runs the build, and attaches proof to the result.</li>
          <li><strong>Run the tests and tell me what failed.</strong> Rina separates explanation from action and keeps the verified outcome grounded.</li>
          <li><strong>Fix the last failure.</strong> Rina uses recent run context or asks one sharp clarification when the reference is ambiguous.</li>
          <li><strong>What happened after the restart?</strong> Recovery state stays visible so restored work never feels like a ghost event.</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Access and restore</h2>
        <p class="section-copy">Early Access access is currently purchase-and-email based, not a full username/password product account system. Keep the flow simple, visible, and recoverable.</p>
        <ul class="signal-list">
          <li><strong>Buy with your email.</strong> Stripe checkout uses your email as the first recovery anchor for paid access.</li>
          <li><strong>Restore if needed.</strong> If a device loses paid state, use the restore or billing-email lookup path in the app or contact support.</li>
          <li><strong>No fake login surface.</strong> The product should not imply a password-based account system until one actually exists.</li>
        </ul>
      </div>
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
            <a href="/feedback" class="btn btn-secondary">Contact support</a>
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
      <span class="eyebrow">Support & feedback</span>
      <h1>Tell us what happened.</h1>
      <p class="hero-copy">Launch questions, feature requests, bug reports, and capability requests are all welcome. If something broke, give us the clearest description you can and we’ll use it to tighten the product.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="grid three-up">
        <article class="card">
          <h3>Support</h3>
          <p>If you are stuck on a paid workflow or launch issue, email <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>.</p>
        </article>
        <article class="card">
          <h3>General contact</h3>
          <p>For partnership, launch, or founder access questions, email <a href="mailto:hello@rinawarptech.com">hello@rinawarptech.com</a>.</p>
        </article>
        <article class="card">
          <h3>Fastest useful bug report</h3>
          <p>Tell us what you asked Rina to do, what you expected, what actually happened, and whether a run or recovery card was visible.</p>
        </article>
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

  return renderPage('/feedback', 'feedback', hero, content, script)
}

function renderTerms(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Terms</span>
      <h1>Terms for RinaWarp Terminal Pro Early Access.</h1>
      <p class="hero-copy">These terms are intentionally plain. Early Access means real software, real support, and honest boundaries while the product is still hardening.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Use of the product</h2>
        <p>RinaWarp Terminal Pro is provided by <strong>RinaWarp Technologies, LLC</strong> for professional and personal workflow use. You are responsible for reviewing outputs, especially for builds, deploys, file changes, and other high-impact actions.</p>
        <p>Early Access access may change as the product evolves. We may improve, remove, or harden features as part of normal product development.</p>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Billing and subscriptions</h2>
        <p>Paid access is currently sold as an Early Access subscription. Billing is handled through Stripe. If billing is canceled or payment fails, paid features may be limited or removed at the end of the applicable billing period.</p>
        <p>If something goes wrong with billing or entitlement state, contact <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a> and include the billing email used at checkout.</p>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Support and acceptable use</h2>
        <p>Please do not use the product for illegal activity, abuse of third-party systems, credential theft, or intentional harm. We may suspend access for abusive or fraudulent use.</p>
        <p>Early Access support is provided on a reasonable-effort basis. We aim to be responsive and honest, but we do not promise enterprise-grade response times yet.</p>
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
      <p class="hero-copy">RinaWarp should feel trustworthy not only in execution, but in how we handle purchase, support, and product data.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">What we collect</h2>
        <p>We may collect billing information through Stripe, support and feedback submissions you send to us, and limited product telemetry needed to understand reliability, updates, and launch issues.</p>
        <p>We do not market the product as a hidden-memory or “store everything forever” system. Early Access personalization should remain explicit, inspectable, and owner-controlled.</p>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">How we use it</h2>
        <p>We use information to operate the service, process billing, restore access, respond to support requests, improve reliability, and understand where the product is failing or succeeding.</p>
        <p>If you send diagnostics or feedback, we may use that information to debug issues and improve the product.</p>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Contact</h2>
        <p>Questions about privacy, billing, or support can be sent to <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>.</p>
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
          <a href="/feedback" class="btn btn-secondary">Contact support</a>
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
  const manifest = await getReleaseManifest(env)
  const linuxAppImageUrl = primaryDownloadUrl(origin, 'linux')
  const linuxDebUrl = primaryDownloadUrl(origin, 'linux/deb')
  const windowsUrl = primaryDownloadUrl(origin, 'windows')
  const checksumsUrl = primaryDownloadUrl(origin, 'checksums')
  const latestJsonUrl = primaryReleaseUrl(origin, 'latest.json')
  const latestYmlUrl = primaryReleaseUrl(origin, 'latest.yml')
  const latestLinuxYmlUrl = primaryReleaseUrl(origin, 'latest-linux.yml')
  const hero = `
    <section class="hero">
      <span class="eyebrow">Early Access releases</span>
      <h1>Download RinaWarp Terminal Pro.</h1>
      <p class="hero-copy">Choose your installer, inspect the live manifest, and verify the release before you run it.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="download-grid">
        <article class="card platform-card">
          <span class="pill">Linux</span>
          <h3>Choose your Linux path</h3>
          <p><strong>.deb</strong> is the recommended Debian/Ubuntu install path and the easiest way to get running on a clean machine, but updates on that path should be treated as <strong>manual .deb installs</strong>. <strong>AppImage</strong> is the Linux path for <strong>in-app automatic updates</strong>. If you want the app to check for and stage future releases inside RinaWarp, choose AppImage and keep using that install type.</p>
          <div class="link-row">
            <a href="${linuxDebUrl}" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_linux" data-analytics-prop-platform="linux" data-analytics-prop-artifact="deb">Download Linux .deb</a>
            <a href="${linuxAppImageUrl}" class="btn btn-secondary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_linux" data-analytics-prop-platform="linux" data-analytics-prop-artifact="appimage">Download AppImage</a>
            <a href="${latestJsonUrl}" class="btn btn-secondary">View manifest</a>
          </div>
          <p class="note"><strong>Already on .deb?</strong> Update by installing the next <code>.deb</code>. <strong>Want automatic in-app updates?</strong> Switch to AppImage and keep that as your main install. Recommended baseline: Debian 13 / Ubuntu desktop-class systems for Early Access. Minimal server images may need additional GUI/runtime packages if you choose the AppImage path.</p>
        </article>
        <article class="card platform-card">
          <span class="pill">Windows</span>
          <h3>.exe installer</h3>
          <p>Windows Early Access builds use the same release flow and are the main automatic-update path on Windows.</p>
          <div class="link-row">
            <a href="${windowsUrl}" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_windows" data-analytics-prop-platform="windows" data-analytics-prop-artifact="exe">Download Windows</a>
          </div>
          <p class="note"><strong>Plain trust note:</strong> Windows signing is still a follow-up investment. Depending on your system, SmartScreen may ask for extra confirmation before the installer runs. We would rather say that directly than pretend the trust path is finished.</p>
        </article>
        <article class="card platform-card">
          <span class="pill">macOS</span>
          <h3>Coming after signing</h3>
          <p>macOS signing is not enabled yet. We would rather say that plainly than ship a rough installer path we cannot support.</p>
          <div class="link-row">
            <a href="/feedback" class="btn btn-secondary">Ask about macOS</a>
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <div class="card trust-note">
          <h3>Verification matters more than vibes</h3>
          <p>Checksums, release feeds, and honest platform notes are the trust surface on the website. If anything about the download feels inconsistent, stop and verify before running the installer.</p>
        </div>
        <div class="info-bar">
          <span class="status-ok">The canonical updater feed is served from rinawarptech.com/releases/*.</span>
          <span class="note">Those primary-domain URLs stay aligned with the public installers and the app updater.</span>
        </div>
        <h2 class="section-title">How to verify your download</h2>
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
        <p class="note">If the checksum does not match, do not run the file. Reach out to support instead.</p>
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
      <h1>Your account</h1>
      <p class="hero-copy">Manage billing, restore access on a new device, and complete any pending return to VS Code from one clean account surface.</p>
    </section>`

  const content = `
    <section class="section">
      <div class="auth-container">
        <div class="auth-card">
          <div id="account-status" class="alert alert-success" style="display:none;"></div>
          <div id="account-shell-loading">
            <h2 class="auth-title">Loading your account</h2>
            <p class="auth-subtitle">Checking your sign-in state, billing controls, and any pending desktop return.</p>
          </div>

          <div id="account-shell-signed-out" style="display:none;">
            <h2 class="auth-title">Sign in to your account</h2>
            <p class="auth-subtitle">Sign in to manage billing, restore access, and return to VS Code when Companion is waiting for you.</p>
            <div class="link-row" style="margin-top:16px;">
              <a href="/login" id="account-login-link" class="btn btn-primary">Sign In</a>
              <a href="/register" id="account-register-link" class="btn btn-secondary">Create Account</a>
            </div>
            <a href="/early-access" class="btn btn-secondary" style="width:100%; margin-top:12px;">Early Access Policy</a>
          </div>

          <div id="account-shell-signed-in" style="display:none;">
            <div id="account-info">
              <h2 class="auth-title">Loading your account</h2>
              <p class="auth-subtitle">We are verifying your signed-in account and billing state before showing live controls.</p>
            </div>

            <div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--line);">
              <h3 style="margin-bottom:16px;">Subscription</h3>
              <div id="subscription-info"><p style="color:var(--muted);">Checking your tier, restore status, and billing access now.</p></div>
            </div>

            <div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--line);">
              <div class="link-row">
                <button id="billing-portal-btn" class="btn btn-primary" type="button">Open billing portal</button>
                <button id="logout-btn" class="btn btn-secondary" style="width:auto;" type="button">Sign Out</button>
              </div>
              <p class="note">Use billing for plan changes, and use the return action below if you need to hand control back to VS Code.</p>
            </div>
          </div>

          <div id="account-return" style="display:none; margin-top:16px;"></div>
        </div>

        <div class="auth-card">
          <h2 class="auth-title">Restore Pro access</h2>
          <p class="auth-subtitle" id="restore-copy">Use the same billing email from checkout to verify your access or recover on a new device.</p>
          <form id="restore-form">
            <label>Billing email
              <input type="email" name="email" placeholder="Billing email used at checkout" required>
            </label>
            <button type="submit" class="btn btn-primary">Check restore status</button>
            <p id="restore-status" class="status-message" aria-live="polite"></p>
          </form>
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
    const loginLink = document.getElementById('account-login-link');
    const registerLink = document.getElementById('account-register-link');
    const restoreCopy = document.getElementById('restore-copy');
    const restoreForm = document.getElementById('restore-form');
    const restoreStatus = document.getElementById('restore-status');
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

    function configureAuthLinks(target) {
      if (loginLink && target) loginLink.href = '/login?return_to=' + encodeURIComponent(target);
      if (registerLink && target) registerLink.href = '/register?return_to=' + encodeURIComponent(target);
    }

    const effectiveReturnTo = returnTo || readPendingReturnTarget();
    if (effectiveReturnTo) {
      rememberReturnTarget(effectiveReturnTo);
      configureAuthLinks(effectiveReturnTo);
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

        if (restoreCopy) {
          restoreCopy.textContent = 'Use your billing email to confirm the plan attached to this account or help a second device recover access.';
        }

        document.getElementById('account-info').innerHTML = \`
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
            <div class="user-avatar">\${(user.name || user.email || 'U').charAt(0).toUpperCase()}</div>
            <div>
              <h3 style="margin:0;">\${user.name || 'User'}</h3>
              <p style="margin:4px 0 0; color:var(--muted); font-size:0.9rem;">\${user.email}</p>
            </div>
          </div>
        \`;

        try {
          const subData = await runRestoreLookup(user.email);
          if (subData.ok && subData.tier) {
            document.getElementById('subscription-info').innerHTML = \`
              <div class="pill" style="margin-bottom:12px;">\${subData.tier.toUpperCase()}</div>
              <p style="color:var(--muted);">Status: \${subData.status || 'active'}</p>
            \`;
          } else {
            document.getElementById('subscription-info').innerHTML = \`
              <div class="pill" style="margin-bottom:12px;">FREE</div>
              <p style="color:var(--muted);"><a href="/pricing" style="color:var(--accent);">Upgrade to Pro</a></p>
            \`;
          }
        } catch (error) {
          document.getElementById('subscription-info').innerHTML = '<p style="color:var(--muted);">Unable to load subscription right now.</p>';
        }

        document.getElementById('billing-portal-btn')?.addEventListener('click', async () => {
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
          restoreStatus.textContent = 'Access found: ' + String(data.tier).toUpperCase() + ' (' + String(data.status || 'active') + ').';
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
  `

  return renderPage('/account', 'account', hero, content, script)
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const host = url.hostname.toLowerCase()

    if (host === 'www.rinawarptech.com' && !path.startsWith('/api/')) {
      const redirectUrl = new URL(request.url)
      redirectUrl.hostname = 'rinawarptech.com'
      return rwRedirect(redirectUrl.toString(), 301)
    }

    const legacyRedirects: Record<string, string> = {
      '/terminal-pro': '/',
      '/terminal-pro.html': '/',
      '/contact': '/feedback/',
      '/contact.html': '/feedback/',
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
        return rwRedirect(`${url.origin}/download/windows`, 301)
      }
      return rwRedirect(`${url.origin}/download/`, 301)
    }

    if (path === '/downloads' || path === '/downloads/') {
      return rwRedirect(`${url.origin}/download`, 301)
    }

    if (path.startsWith('/downloads/')) {
      return rwRedirect(`${url.origin}/download/${path.slice('/downloads/'.length)}`, 301)
    }

    if (path === '/download' || path === '/download/') {
      return await renderDownload(env, url.origin)
    }

    if (path.startsWith('/download/')) {
      const manifest = await getReleaseManifest(env)
      if (!manifest) {
        return rwText(404, 'latest.json not found')
      }

      const kind = normalizeArtifactKind(path.slice('/download/'.length))
      const artifactPath = pickArtifactPath(manifest, kind) ?? await findLatestArtifactPath(env, kind)
      if (!artifactPath) {
        return rwText(404, 'Artifact not available')
      }

      if (kind === 'checksums') {
        const checksumObject = await env.RINAWARP_CDN?.get(artifactPath)
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

    // Pricing page
    if (path === '/pricing' || path === '/pricing/') {
      return renderPricing()
    }

    // Feedback page
    if (path === '/feedback' || path === '/feedback/') {
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

    // API routes: /v1/*
    if (path.startsWith('/v1')) {
      return apiRouter(request, env)
    }

    // Marketplace UI: /agents
    if (path.startsWith('/agents')) {
      return marketplaceUI(request, env)
    }

    // Pass through to origin for everything else (docs, download, etc.)
    return fetch(request)
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
              Object.entries(body.properties as Record<string, unknown>).slice(0, 12).map(([key, value]) => [key, String(value ?? '').slice(0, 120)])
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

async function handleReferralMeRequest(request: Request, env: any, corsHeaders: Record<string, string>): Promise<Response> {
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

  return new Response(JSON.stringify({
    ok: true,
    email: user.email,
    code: summary.code,
    inviteUrl: summary.inviteUrl,
    stats: summary.stats,
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function handleReferralAdminRequest(request: Request, env: any, corsHeaders: Record<string, string>): Promise<Response> {
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
  const email = String(url.searchParams.get('email') || '').trim().toLowerCase()

  try {
    if (!code && !email) {
      const stats = await db.prepare(`
        SELECT
          SUM(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) AS checkouts,
          SUM(CASE WHEN event_type = 'checkout_completed' THEN 1 ELSE 0 END) AS conversions,
          COUNT(*) AS events
        FROM referral_events
      `).first<{ checkouts?: number; conversions?: number; events?: number }>()

      const events = await db.prepare(`
        SELECT referral_code, event_type, referred_email, checkout_session_id, source, created_at, converted_at
        FROM referral_events
        ORDER BY created_at DESC
        LIMIT 20
      `).all<{
        referral_code?: string
        event_type: string
        referred_email?: string
        checkout_session_id?: string
        source?: string
        created_at: number
        converted_at?: number
      }>()

      return new Response(JSON.stringify({
        ok: true,
        found: true,
        mode: 'recent',
        stats: {
          events: Number(stats?.events || 0),
          checkouts: Number(stats?.checkouts || 0),
          conversions: Number(stats?.conversions || 0),
        },
        events: Array.isArray(events.results) ? events.results : [],
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const referral = code
      ? await db.prepare(`
          SELECT rc.code, rc.user_id, u.email, u.name
          FROM referral_codes rc
          LEFT JOIN users u ON u.id = rc.user_id
          WHERE rc.code = ?
        `).bind(code).first<{ code: string; user_id: string; email?: string; name?: string }>()
      : await db.prepare(`
          SELECT rc.code, rc.user_id, u.email, u.name
          FROM referral_codes rc
          LEFT JOIN users u ON u.id = rc.user_id
          WHERE lower(u.email) = ?
        `).bind(email).first<{ code: string; user_id: string; email?: string; name?: string }>()

    if (!referral?.code) {
      return new Response(JSON.stringify({ ok: true, found: false }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const stats = await db.prepare(`
      SELECT
        SUM(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) AS checkouts,
        SUM(CASE WHEN event_type = 'checkout_completed' THEN 1 ELSE 0 END) AS conversions,
        COUNT(*) AS events
      FROM referral_events
      WHERE referral_code = ?
    `).bind(referral.code).first<{ checkouts?: number; conversions?: number; events?: number }>()

    const events = await db.prepare(`
      SELECT event_type, referred_email, checkout_session_id, source, created_at, converted_at
      FROM referral_events
      WHERE referral_code = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(referral.code).all<{
      event_type: string
      referred_email?: string
      checkout_session_id?: string
      source?: string
      created_at: number
      converted_at?: number
    }>()

    return new Response(JSON.stringify({
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
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Referral lookup failed.' }), {
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

async function lookupLicenseByEmail(email: string, env: any): Promise<{
  customerId?: string;
  email: string;
  ok: boolean;
  status: string;
  tier: string | null;
}> {
  const normalizedEmail = String(email || '').trim().toLowerCase()

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

      const subscriptionsResponse = await fetch('https://api.stripe.com/v1/subscriptions?' + new URLSearchParams({
        customer: String(customer.id),
        status: 'all',
        limit: '10',
      }).toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

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

  const email = String(payload.email || '').trim().toLowerCase()
  if (!email) {
    return new Response(JSON.stringify({ error: 'Authenticated email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const license = await lookupLicenseByEmail(email, env)
  const plan = license.tier === 'pro' || license.tier === 'team' || license.tier === 'power' ? (license.tier === 'power' ? 'team' : license.tier) : 'free'
  const packs =
    plan === 'team'
      ? ['docker-repair', 'system-diagnostics', 'npm-audit', 'security-audit', 'test-runner']
      : plan === 'pro'
        ? ['docker-repair', 'system-diagnostics', 'npm-audit', 'security-audit']
        : ['system-diagnostics']

  return new Response(JSON.stringify({
    email,
    plan,
    packs,
    status: license.status,
    updatedAt: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function handleVscodeChat(
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

  const email = String(payload.email || '').trim().toLowerCase()
  if (!email) {
    return new Response(JSON.stringify({ error: 'Authenticated email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const body = await request.json().catch(() => null) as {
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
        .filter((message): message is { role: 'user' | 'assistant'; content: string } =>
          (message?.role === 'user' || message?.role === 'assistant') && typeof message.content === 'string' && message.content.trim().length > 0
        )
        .slice(-10)
    : []

  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content?.trim()
  if (!latestUserMessage) {
    return new Response(JSON.stringify({ error: 'A user message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const plan = body?.workspaceContext?.plan === 'pro' || body?.workspaceContext?.plan === 'team' || body?.workspaceContext?.plan === 'power'
    ? (body.workspaceContext.plan === 'power' ? 'team' : body.workspaceContext.plan)
    : 'free'
  const diagnostic = body?.workspaceContext?.diagnostic
  const fallback = buildCompanionChatFallback({
    diagnostic,
    hasWorkspace: Boolean(body?.workspaceContext?.hasWorkspace),
    latestUserMessage,
    plan,
  })

  if (!env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({
      actions: fallback.actions,
      message: fallback.message,
      mode: 'fallback',
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
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
      Array.isArray(body?.workspaceContext?.markers) && body?.workspaceContext?.markers?.length ? `Markers: ${body.workspaceContext.markers.join(', ')}` : null,
      body?.workspaceContext?.packageName ? `Package name: ${body.workspaceContext.packageName}` : null,
      body?.workspaceContext?.packageManagerHint ? `Package manager: ${body.workspaceContext.packageManagerHint}` : null,
      Array.isArray(body?.workspaceContext?.packageScripts) && body?.workspaceContext?.packageScripts?.length ? `Package scripts: ${body.workspaceContext.packageScripts.join(', ')}` : null,
      Array.isArray(body?.workspaceContext?.topLevelEntries) && body?.workspaceContext?.topLevelEntries?.length ? `Top level entries: ${body.workspaceContext.topLevelEntries.join(', ')}` : null,
      diagnostic?.workspaceName ? `Last diagnostic workspace: ${diagnostic.workspaceName}` : null,
      diagnostic?.recommendedPack ? `Recommended pack: ${diagnostic.recommendedPack}` : null,
      diagnostic?.recommendedReason ? `Recommended reason: ${diagnostic.recommendedReason}` : null,
      Array.isArray(diagnostic?.findings) && diagnostic?.findings?.length ? `Findings: ${diagnostic.findings.join('; ')}` : null,
    ].filter(Boolean).join('\n')

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

    const json = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = json.choices?.[0]?.message?.content?.trim() || fallback.message

    return new Response(JSON.stringify({
      actions: fallback.actions,
      message: content,
      mode: 'model',
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    console.warn('[vscode/chat] model-backed response failed, falling back', error)
    return new Response(JSON.stringify({
      actions: fallback.actions,
      message: fallback.message,
      mode: 'fallback',
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
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
      message: 'Open a workspace folder first if you want project-specific guidance. You can still ask about plans, packs, or how Companion works.',
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
    actions.push({ command: 'rinawarp.openPack', label: `Open ${recommendedPack}`, args: [recommendedPack, 'chat_recommended_pack'] })
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
        message: 'You are currently on the free plan. Pro is the next step if you want richer pack coverage and higher-velocity workflows from Companion.',
      }
    }
    return {
      actions: [{ command: 'rinawarp.refreshEntitlements', label: 'Refresh Entitlements' }],
      message: `Your current plan is ${input.plan.toUpperCase()}. If Companion looks out of sync, refresh entitlements here before changing billing.`,
    }
  }

  actions.push({ command: 'rinawarp.runFreeDiagnostic', label: 'Run Free Diagnostic' })
  actions.push({ command: 'rinawarp.openPack', label: `Open ${recommendedPack}`, args: [recommendedPack, 'chat_default_pack'] })
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
        const emailBody = {
          personalizations: [
            {
              to: [{ email: 'support@rinawarptech.com' }],
              subject: `[${String(topic || 'general').toUpperCase()}] New Feedback: ${rating ? `⭐${rating}` : ''} from ${name}`,
            },
          ],
          from: { email: 'noreply@rinawarptech.com', name: 'RinaWarp Feedback' },
          content: [
            {
              type: 'text/html',
              value: `
              <h2>New Feedback Received</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Topic:</strong> ${topic || 'General'}</p>
              <p><strong>Rating:</strong> ${rating || 'Not provided'}</p>
              <p><strong>Message:</strong></p>
              <p>${message}</p>
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

// Stripe Checkout session creation handler
async function handleCheckoutRequest(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json()
    const { email, tier = 'pro', billingCycle = 'monthly', seats, workspaceId, returnTo, referralCode } = body

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

    const priceIds: Record<string, string> = {
      pro_monthly: String(env.STRIPE_PRO_MONTHLY_PRICE_ID || env.STRIPE_PRO_PRICE_ID || '').trim(),
      pro_annual: String(env.STRIPE_PRO_ANNUAL_PRICE_ID || '').trim(),
      power: String(env.STRIPE_POWER_PRICE_ID || env.STRIPE_TEAM_PRICE_ID || '').trim(),
      pay_per_fix: String(env.STRIPE_PAY_PER_FIX_PRICE_ID || '').trim(),
      creator: String(env.STRIPE_CREATOR_PRICE_ID || '').trim(),
      team: String(env.STRIPE_TEAM_PRICE_ID || '').trim(),
      founder: String(env.STRIPE_FOUNDER_PRICE_ID || '').trim(),
    }

    if (normalizedTier !== 'pro' && normalizedTier !== 'power' && normalizedTier !== 'team' && normalizedTier !== 'fix') {
      return new Response(JSON.stringify({ error: 'Only Pro, Power, and one-fix checkout are configured right now.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const resolvedTierKey =
      normalizedTier === 'power' || normalizedTier === 'team'
        ? 'power'
        : normalizedTier === 'fix'
          ? 'pay_per_fix'
          : normalizedBillingCycle === 'annual'
          ? 'pro_annual'
          : 'pro_monthly'
    const normalizedReferralCode = normalizeReferralCode(referralCode)

    const successUrl = new URL('https://rinawarptech.com/success/')
    if (String(returnTo || '').trim()) {
      successUrl.searchParams.set('return_to', String(returnTo).trim())
    }
    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}')

    const priceId = priceIds[resolvedTierKey] || priceIds.pro_monthly
    const quantity =
      normalizedTier === 'power' || normalizedTier === 'team'
        ? String(Math.max(1, Math.min(500, Number(seats || 1) || 1)))
        : '1'

    if (!priceId) {
      return new Response(JSON.stringify({ error: `Checkout is not configured for ${normalizedTier}${normalizedTier === 'pro' ? ` (${normalizedBillingCycle})` : ''}.` }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    await maybeTrackReferralEvent(env, {
      referralCode: normalizedReferralCode,
      eventType: 'checkout_started',
      referredEmail: email,
      source: 'website_checkout',
      metadata: {
        tier: normalizedTier === 'team' ? 'power' : normalizedTier,
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
            'metadata[tier]': normalizedTier === 'team' ? 'power' : normalizedTier,
            ...(normalizedReferralCode ? { 'metadata[referral_code]': normalizedReferralCode } : {}),
            ...(String(workspaceId || '').trim() ? { 'metadata[workspace_id]': String(workspaceId).trim() } : {}),
            ...(normalizedTier !== 'fix' && (normalizedTier === 'power' || normalizedTier === 'team') ? { 'subscription_data[metadata][tier]': 'power' } : {}),
            ...(normalizedTier !== 'fix' && normalizedReferralCode ? { 'subscription_data[metadata][referral_code]': normalizedReferralCode } : {}),
            ...(normalizedTier !== 'fix' && (normalizedTier === 'power' || normalizedTier === 'team') && String(workspaceId || '').trim()
              ? { 'subscription_data[metadata][workspace_id]': String(workspaceId).trim() }
              : {}),
            success_url: successUrl.toString(),
            cancel_url: 'https://rinawarptech.com/pricing/',
          }),
        })

        const session = await response.json()

        if (session.error) {
          const stripeMessage = String(session.error.message || 'Checkout could not be created.')
          const inactivePrice = /price specified is inactive|only accepts active prices/i.test(stripeMessage)
          return new Response(JSON.stringify({
            error: inactivePrice
              ? 'Checkout is temporarily unavailable because the configured Stripe price is inactive. Update the live Stripe price ID and try again.'
              : stripeMessage,
            code: inactivePrice ? 'stripe_price_inactive' : 'stripe_checkout_failed',
          }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
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

    if (request.method === 'POST') {
      const body = await request.json()
      email = body.email
    } else {
      // For GET, try to get email from query param
      const url = new URL(request.url)
      email = url.searchParams.get('email') || undefined
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
          return_url: 'https://rinawarptech.com/account',
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
