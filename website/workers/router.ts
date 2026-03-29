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
    gap: 12px;
  }
  .logo-mark {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    object-fit: contain;
  }
  .logo-wordmark {
    height: 28px;
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
  const urls = ['/', '/pricing', '/download', '/docs', '/feedback', '/early-access', '/terms', '/privacy', '/agents']
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
  ${seo}
  ${robotsMetaForPath(path)}
  <style>${SITE_STYLES}</style>
</head>
<body>
  <div class="site-shell">
    <header>
      <nav aria-label="Main navigation">
        <a href="/" class="logo" aria-label="RinaWarp Terminal Pro home">
          <img class="logo-mark" src="/assets/img/rinawarp-mark.svg" alt="RinaWarp Terminal Pro mark">
          <img class="logo-wordmark" src="/assets/img/rinawarp-logo.png" alt="RinaWarp Terminal Pro logo">
        </a>
        <div class="nav-links">
          ${navLink('/', 'Home', active, 'home')}
          ${navLink('/pricing', 'Pricing', active, 'pricing')}
          ${navLink('/download', 'Download', active, 'download')}
          ${navLink('/docs', 'Docs', active, 'docs')}
          ${navLink('/agents', 'Packs', active, 'agents')}
          ${navLink('/feedback', 'Support', active, 'feedback')}
          ${navAccountLink(active)}
        </div>
      </nav>
    </header>
    <main>
      ${hero}
      ${content}
    </main>
    <footer>
      <div class="footer-inner">
        <div>© 2026 RinaWarp Technologies, LLC. Proof-first AI workbench.</div>
        <div class="footer-links">
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
      <span class="eyebrow">Proof-first agent execution</span>
      <h1>Talk to Rina naturally. Ship with proof.</h1>
      <p class="hero-copy">RinaWarp Terminal Pro is the AI workbench for people who want an agent they can actually talk to, trust, and recover with. Ask in plain language, let Rina inspect or act through one trusted path, and keep the run ID, receipts, and output attached to the thread.</p>
      <div class="cta-row">
        <a href="/download" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="home_hero" data-analytics-prop-target="download">Download the app</a>
        <a href="/pricing" class="btn btn-secondary">See plans</a>
      </div>
    </section>
  `

  const content = `
    <section class="section">
      <div class="grid three-up">
        <article class="card">
          <div class="kicker">Trust</div>
          <h3>Claims stay tied to proof</h3>
          <p>RinaWarp Terminal Pro is built around run IDs, receipts, tails, and recovery state. The goal is fewer fake wins, fewer mystery actions, and less terminal archaeology when something matters.</p>
        </article>
        <article class="card">
          <div class="kicker">Conversation</div>
          <h3>Rina handles real human input</h3>
          <p>Vague asks, follow-ups, frustration, messy phrasing, and casual turns are part of the job. Rina stays coherent, asks one sharp clarification when needed, and does not break proof discipline to sound confident.</p>
        </article>
        <article class="card">
          <div class="kicker">Recovery</div>
          <h3>Interrupted work still makes sense</h3>
          <p>When a run is interrupted or a session restarts, RinaWarp Terminal Pro keeps the state visible. You can see what happened, what was restored, and what the next safe move is.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">What the product actually looks like in use</h2>
      <p class="section-copy">The first trust win is visual: the thread stays readable, the proof stays attached, and recovery does not hide what happened. This is the shape customers see when RinaWarp is doing real work.</p>
      <div class="proof-demo">
        <div class="transcript-demo">
          <div class="demo-windowbar">
            <span class="demo-dot"></span>
            <span class="demo-dot"></span>
            <span class="demo-dot"></span>
            <span>RinaWarp Terminal Pro</span>
          </div>
          <div class="demo-chat">
            <div class="demo-message user">Build the app, show me what failed, and tell me the safest next move.</div>
            <div class="demo-message assistant">I checked the workspace, ran the build through the trusted path, and attached the proof below. The failure is in one TypeScript import, so the next move is a scoped fix instead of retrying the whole pipeline blindly.</div>
            <div class="demo-proof">
              <div class="demo-proof-header">
                <span>Build receipt</span>
                <span class="demo-proof-tag">Run ID rw_8f4c1d</span>
              </div>
              <div class="demo-proof-lines">
                <span>npm run build</span>
                <span>src/main/update/updateService.ts: missing export \`publishRelease\`</span>
                <span>receipt attached • recovery available • output tail preserved</span>
              </div>
            </div>
          </div>
        </div>
        <div class="proof-notes">
          <div class="proof-note">
            <strong>Cleaner than terminal archaeology</strong>
            You do not have to reconstruct what happened from disconnected tabs, old scrollback, and a vague success claim.
          </div>
          <div class="proof-note">
            <strong>Best fit for build, test, deploy, and recovery</strong>
            The strongest buyer story is not generic AI chat. It is doing real work with proof that stays attached.
          </div>
          <div class="proof-note">
            <strong>Honest early-access boundary</strong>
            RinaWarp is strongest when you want trusted execution and understandable recovery, not when you want a magic black box.
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">What the product promise actually is</h2>
      <p class="section-copy">RinaWarp Terminal Pro is not another vague AI shell. The paid promise is simple: you open the app, Rina understands the workspace, you ask for real work, the action goes through the canonical path, and the result is understandable without digging through raw logs unless you want to.</p>
      <div class="proof-strip">
        <div class="proof-step">
          <strong>1. Ask in the Agent thread</strong>
          Rina can inspect first, plan the work, or ask one necessary clarification.
        </div>
        <div class="proof-step">
          <strong>2. Execute through one trusted spine</strong>
          No silent fallback execution, no hidden terminal bypass, no fake completion layer.
        </div>
        <div class="proof-step">
          <strong>3. Inspect proof when you care</strong>
          Inline run blocks, receipts, output tails, and recovery state stay attached to the work instead of getting lost in another surface.
        </div>
      </div>
    </section>

    <section class="section">
      <div class="panel">
        <div class="kicker">Why people switch</div>
        <h2 class="section-title">Sell certainty, not just speed</h2>
      <p class="section-copy">Warp is terminal-native. Cursor is editor-native. Copilot is ecosystem-native. RinaWarp Terminal Pro is agent-native: chat is the primary surface, runs and terminal are inspectors, and trust stays visible from the first ten minutes forward.</p>
        <div class="link-row">
          <a href="/docs" class="btn btn-secondary">Read the workflow</a>
          <a href="/agents" class="btn btn-secondary">Browse capability packs</a>
        </div>
      </div>
    </section>
  `

  return renderPage('/', 'home', hero, content)
}

function renderPricing(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Early Access pricing</span>
      <h1>Price the trust, proof, and recovery people actually use.</h1>
      <p class="hero-copy">RinaWarp Terminal Pro Early Access keeps the ladder simple: a real free tier to feel the workbench, a serious Pro tier for proof-backed execution, and team pricing later when the admin and governance surface is ready.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="pricing-grid">
        <article class="card pricing-card">
          <span class="pill">Free</span>
          <div class="price">$0 <span>/ month</span></div>
          <p>Use the shell, try the agent-first flow, and make sure the product feels real before you pay.</p>
          <ul class="feature-list">
            <li>Agent-first desktop workbench</li>
            <li>Limited chats and proof-backed runs</li>
            <li>Core inspectors and workspace-aware proof UI</li>
            <li>Download and use on your own machine</li>
          </ul>
          <a href="/download" class="btn btn-secondary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="pricing_free" data-analytics-prop-target="download">Get started</a>
        </article>
        <article class="card pricing-card featured">
          <span class="pill">Pro Early Access</span>
          <div class="price">$20 <span>/ month</span></div>
          <p>For people who want Rina to take real action, keep proof attached, recover safely, and feel like a collaborator instead of a demo.</p>
          <ul class="feature-list">
            <li>Trusted build, test, deploy, and fix flows</li>
            <li>Recovery and proof-backed summaries</li>
            <li>Rina cards, cross-session explicit preferences, and higher usage limits</li>
            <li>Priority Early Access support and faster feature access</li>
          </ul>
          <div class="stack" style="gap:12px">
            <input id="checkout-email" type="email" placeholder="you@company.com" aria-label="Email for Pro checkout" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,0.04);color:var(--text)">
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <button class="btn btn-primary" data-checkout-cycle="monthly" type="button">Start Monthly</button>
              <button class="btn btn-secondary" data-checkout-cycle="annual" type="button">Start Annual</button>
            </div>
            <div class="note" id="checkout-status">Monthly: $20. Annual: $192. Checkout opens in Stripe.</div>
          </div>
        </article>
        <article class="card pricing-card">
          <span class="pill">Team / Business</span>
          <div class="price">$49 <span>/ user / month later</span></div>
          <p>Planned for teams that need policy controls, audit export, reliability guarantees, and admin support.</p>
          <ul class="feature-list">
            <li>Org-level trust and governance controls</li>
            <li>Team memory boundaries and admin support</li>
            <li>Audit/export features and stronger operational guarantees</li>
            <li>Join the waitlist while Early Access hardens</li>
          </ul>
          <a href="/feedback" class="btn btn-secondary">Talk to us</a>
        </article>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Quick answers before you buy</h2>
      <p class="section-copy">The best conversion copy is the honest kind. These are the practical questions people have right before they decide whether to pay.</p>
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
          <h3>What does Early Access mean here?</h3>
          <p>It means the product is paid and supportable today, but platform edges like signing and broader rollout are still being tightened in public rather than hidden behind vague promises.</p>
        </article>
      </div>
    </section>
  `
  const script = `
    const emailInput = document.getElementById('checkout-email');
    const status = document.getElementById('checkout-status');
    const pricingParams = new URLSearchParams(window.location.search);
    const returnTo = pricingParams.get('return_to');
    document.querySelectorAll('[data-checkout-cycle]').forEach((checkoutBtn) => {
      checkoutBtn.addEventListener('click', async () => {
        const email = emailInput?.value?.trim();
        const billingCycle = checkoutBtn.getAttribute('data-checkout-cycle') || 'monthly';
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
              tier: 'pro',
              billingCycle,
              placement: 'pricing_pro',
            });
          }
          const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, tier: 'pro', billingCycle, returnTo }),
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
    const returnBtn = document.getElementById('return-to-product');
    if (!returnTo && returnBtn) {
      returnBtn.textContent = 'Open account';
      returnBtn.setAttribute('href', '/account');
    }
  `

  return renderPage('/success', 'account', hero, content, script)
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

function renderEarlyAccess(): Response {
  const hero = `
    <section class="hero">
      <span class="eyebrow">Early Access policy</span>
      <h1>What Early Access means here.</h1>
      <p class="hero-copy">Early Access should never be a vague excuse. It means the product is real, paid, and supportable, but some platform, update, and workflow edges are still being tightened in public.</p>
    </section>
  `

  const content = `
    <section class="section">
      <div class="grid three-up">
        <article class="card">
          <h3>What is stable enough now</h3>
          <p>Core trust, proof, recovery, and conversational workflow are real. Linux and Windows releases are being validated against clean-machine install paths, and the website routes are tied to live release metadata.</p>
        </article>
        <article class="card">
          <h3>What is still intentionally limited</h3>
          <p>macOS is not launched yet. Platform support is still narrower than a broad stable release. Automatic updates are still being validated as a real installed-build pipeline, not just a code path.</p>
        </article>
        <article class="card">
          <h3>How billing and restore work</h3>
          <p>Early Access access is currently anchored to billing email and entitlement restore, not a full password-based account system. If access drifts, support can help recover it.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Refunds and cancellations</h2>
        <p>If you need help with cancellation, billing questions, or a reasonable launch-stage refund request, contact <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>. We would rather handle issues clearly than let a billing problem damage trust.</p>
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
      <p class="hero-copy">Install the desktop workbench, inspect the live release manifest, and choose the package path that matches how you want updates delivered. Trust on the site should match trust in the product.</p>
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
      <p class="hero-copy">Use your RinaWarp account to manage billing, recover access on a new device, and keep your Early Access install connected.</p>
    </section>`

  const content = `
    <section class="section">
      <div class="auth-container">
        <div class="auth-card">
          <h2 class="auth-title">Sign In</h2>
          <p class="auth-subtitle">Use your email and password</p>
          
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

    function buildReturnTarget(target, token) {
      if (!target) return '/account';
      try {
        const url = new URL(target);
        url.searchParams.set('token', token);
        return url.toString();
      } catch {
        const separator = target.includes('?') ? '&' : '?';
        return target + separator + 'token=' + encodeURIComponent(token);
      }
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

    const existingToken = localStorage.getItem('auth_token');
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
      <p class="hero-copy">Manage your RinaWarp Terminal Pro account, billing, restore flow, and Early Access support boundaries.</p>
    </section>`

  let content = ''
  let script = ''
  
  if (authToken) {
    content = `
    <section class="section">
      <div class="auth-container">
        <div class="auth-card">
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
              <button id="logout-btn" class="btn btn-secondary" style="width:auto;">Sign Out</button>
            </div>
            <p class="note">If billing controls do not appear, use the restore form below with your checkout email.</p>
          </div>
        </div>
        <div class="auth-card">
          <h2 class="auth-title">Restore Pro access</h2>
          <p class="auth-subtitle">Use the same billing email from checkout. This works even before your full account state finishes loading.</p>
          <form id="restore-form"><label>Billing email<input type="email" name="email" placeholder="Billing email used at checkout" required></label><button type="submit" class="btn btn-primary">Check restore status</button><p id="restore-status" class="status-message"></p></form>
        </div>
      </div>
    </section>`
    
    script = `
      async function loadAccount() {
        try {
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': 'Bearer ${authToken}' }
          });
          
          if (!response.ok) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_email');
            window.location.href = '/login';
            return;
          }
          
          const data = await response.json();
          const user = data.user;
          
          document.getElementById('account-info').innerHTML = \`
            <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
              <div class="user-avatar">\${(user.name || user.email || 'U').charAt(0).toUpperCase()}</div>
              <div>
                <h3 style="margin:0;">\${user.name || 'User'}</h3>
                <p style="margin:4px 0 0; color:var(--muted); font-size:0.9rem;">\${user.email}</p>
              </div>
            </div>
          \`;
          
          // Load subscription
          try {
            const subResponse = await fetch('/api/license/lookup-by-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email })
            });
            const subData = await subResponse.json();
            
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
          } catch (e) {
            document.getElementById('subscription-info').innerHTML = '<p style="color:var(--muted);">Unable to load subscription</p>';
          }
          document.getElementById('billing-portal-btn')?.addEventListener('click', async () => {
            try {
              const response = await fetch('/api/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
              });
              const payload = await response.json();
              if (payload?.url) window.location.href = payload.url;
            } catch (e) {
              const status = document.getElementById('restore-status');
              if (status) status.textContent = 'Could not open billing portal right now.';
            }
          });
        } catch (err) {
          console.error('Failed to load account:', err);
        }
      }
      
      document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_email');
        window.location.href = '/';
      });
      
      loadAccount();
    `
  } else {
    content = `
    <section class="section">
      <div class="auth-container">
        <div class="auth-card" style="text-align:center;">
          <h2 class="auth-title">Sign in to your account</h2>
          <p class="auth-subtitle">Sign in, restore by billing email, or start from the Early Access support path.</p>
          
          <a href="/login" id="account-login-link" class="btn btn-primary" style="width:100%; margin-bottom:12px;">Sign In</a>
          <a href="/register" id="account-register-link" class="btn btn-secondary" style="width:100%; margin-bottom:12px;">Create Account</a>
          <a href="/early-access" class="btn btn-secondary" style="width:100%;">Early Access Policy</a>
          <div id="account-return" style="display:none; margin-top:12px;"></div>
        </div>
      </div>
    </section>`
    
    script = `
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get('return_to');
      const existingToken = localStorage.getItem('auth_token');
      const returnDiv = document.getElementById('account-return');

      function showReturnButton(target) {
        if (!returnDiv || !target) return;
        returnDiv.innerHTML = '<a class="btn btn-secondary" id="account-open-vscode" href="#">Open VS Code</a><p class="note" style="margin-top:10px;">If your browser does not switch back automatically, click the button.</p>';
        returnDiv.style.display = 'block';
        const returnLink = document.getElementById('account-open-vscode');
        if (returnLink) {
          returnLink.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.href = target;
          });
        }
      }

      function buildReturnTarget(target, token) {
        try {
          const url = new URL(target);
          url.searchParams.set('token', token);
          return url.toString();
        } catch {
          const separator = target.includes('?') ? '&' : '?';
          return target + separator + 'token=' + encodeURIComponent(token);
        }
      }

      if (returnTo) {
        const loginLink = document.getElementById('account-login-link');
        const registerLink = document.getElementById('account-register-link');
        if (loginLink) loginLink.href = '/login?return_to=' + encodeURIComponent(returnTo);
        if (registerLink) registerLink.href = '/register?return_to=' + encodeURIComponent(returnTo);
      }

      if (existingToken && returnTo) {
        const returnTarget = buildReturnTarget(returnTo, existingToken);
        showReturnButton(returnTarget);
        window.location.href = returnTarget;
      }

      // Check for existing token in URL (e.g., from OAuth)
      const hash = window.location.hash;
      if (hash && hash.includes('token=')) {
        const token = hash.split('token=')[1]?.split('&')[0];
        if (token) {
          localStorage.setItem('auth_token', token);
          window.location.href = '/account';
        }
      }
    `
  }

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
      const artifactPath = pickArtifactPath(manifest, kind)
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
      return renderEarlyAccess()
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
        const founderPriceId = String(env.STRIPE_FOUNDER_PRICE_ID || '').trim()

        if (proPriceId) tierMap[proPriceId] = 'pro'
        if (proAnnualPriceId) tierMap[proAnnualPriceId] = 'pro'
        if (creatorPriceId) tierMap[creatorPriceId] = 'creator'
        if (teamPriceId) tierMap[teamPriceId] = 'team'
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
  const plan = license.tier === 'pro' || license.tier === 'team' ? license.tier : 'free'
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

  const plan = body?.workspaceContext?.plan === 'pro' || body?.workspaceContext?.plan === 'team'
    ? body.workspaceContext.plan
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
    const { email, tier = 'pro', billingCycle = 'monthly', seats, workspaceId, returnTo } = body

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
      creator: String(env.STRIPE_CREATOR_PRICE_ID || '').trim(),
      team: String(env.STRIPE_TEAM_PRICE_ID || '').trim(),
      founder: String(env.STRIPE_FOUNDER_PRICE_ID || '').trim(),
    }

    if (normalizedTier !== 'pro' && normalizedTier !== 'team') {
      return new Response(JSON.stringify({ error: 'Only Pro Early Access and Team are configured for checkout right now.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const resolvedTierKey =
      normalizedTier === 'team'
        ? 'team'
        : normalizedBillingCycle === 'annual'
          ? 'pro_annual'
          : 'pro_monthly'

    const successUrl = new URL('https://rinawarptech.com/success/')
    if (String(returnTo || '').trim()) {
      successUrl.searchParams.set('return_to', String(returnTo).trim())
    }
    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}')

    const priceId = priceIds[resolvedTierKey] || priceIds.pro_monthly
    const quantity =
      normalizedTier === 'team'
        ? String(Math.max(1, Math.min(500, Number(seats || 1) || 1)))
        : '1'

    if (!priceId) {
      return new Response(JSON.stringify({ error: `Checkout is not configured for ${normalizedTier}${normalizedTier === 'pro' ? ` (${normalizedBillingCycle})` : ''}.` }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

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
            mode: 'subscription',
            customer_email: email,
            'line_items[0][price]': priceId,
            'line_items[0][quantity]': quantity,
            billing_address_collection: 'required',
            'automatic_tax[enabled]': 'true',
            'tax_id_collection[enabled]': 'true',
            'metadata[tier]': normalizedTier,
            ...(String(workspaceId || '').trim() ? { 'metadata[workspace_id]': String(workspaceId).trim() } : {}),
            ...(normalizedTier === 'team' ? { 'subscription_data[metadata][tier]': 'team' } : {}),
            ...(normalizedTier === 'team' && String(workspaceId || '').trim()
              ? { 'subscription_data[metadata][workspace_id]': String(workspaceId).trim() }
              : {}),
            success_url: successUrl.toString(),
            cancel_url: normalizedTier === 'team' ? 'https://rinawarptech.com/team/' : 'https://rinawarptech.com/pricing/',
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
