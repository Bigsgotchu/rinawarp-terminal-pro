/**
 * RinaWarp Marketplace Router
 *
 * Routes requests to API or Marketplace UI handlers
 */

import { apiRouter } from './api/index'
import { marketplaceUI } from './marketplace/ui'
import { injectSeoTags } from './seo'
import { handleAuthRequest } from './api/auth'

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

type SitePage = 'home' | 'pricing' | 'download' | 'docs' | 'agents' | 'feedback' | 'legal' | 'login' | 'register' | 'account'

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
    --shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
    --radius: 22px;
    --radius-sm: 14px;
    --content: 1160px;
  }
  body {
    min-height: 100vh;
    color: var(--text);
    font-family: "IBM Plex Sans", "Segoe UI", Inter, system-ui, sans-serif;
    background:
      radial-gradient(circle at top, rgba(255, 79, 216, 0.18), transparent 32%),
      radial-gradient(circle at 85% 12%, rgba(98, 246, 229, 0.16), transparent 24%),
      radial-gradient(circle at 50% 0%, rgba(255, 155, 107, 0.10), transparent 30%),
      linear-gradient(180deg, #090d18 0%, #0b1020 100%);
  }
  a { color: inherit; }
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
    height: 70px;
    max-width: var(--content);
    margin: 0 auto;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .logo {
    text-decoration: none;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .logo-mark {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    object-fit: cover;
    box-shadow: 0 8px 24px rgba(255, 79, 216, 0.18);
  }
  .nav-links { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .nav-links a {
    text-decoration: none;
    color: var(--muted);
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 0.93rem;
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
    padding: 88px 28px 44px;
    display: grid;
    gap: 18px;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    width: fit-content;
    color: #d8f3ff;
    font-size: 0.88rem;
    border: 1px solid var(--line-strong);
    background: linear-gradient(135deg, rgba(255, 79, 216, 0.11), rgba(98, 246, 229, 0.11));
    border-radius: 999px;
    padding: 8px 12px;
  }
  h1 {
    font-size: clamp(2.6rem, 6vw, 4.8rem);
    line-height: 0.96;
    letter-spacing: -0.04em;
    max-width: 12ch;
  }
  .hero-copy,
  .lede {
    color: var(--muted);
    font-size: 1.08rem;
    line-height: 1.7;
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
    min-height: 46px;
    padding: 0 18px;
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
    padding: 0 28px 40px;
  }
  .section-title {
    font-size: 1.7rem;
    margin-bottom: 12px;
    letter-spacing: -0.02em;
  }
  .section-copy {
    color: var(--muted);
    max-width: 62ch;
    line-height: 1.7;
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
    border-radius: var(--radius);
    padding: 22px;
    box-shadow: var(--shadow);
  }
  .card h3,
  .panel h3 {
    font-size: 1.08rem;
    margin-bottom: 10px;
    letter-spacing: -0.01em;
  }
  .card p,
  .panel p,
  .card li,
  .panel li {
    color: var(--muted);
    line-height: 1.65;
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
  .proof-step {
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 16px 18px;
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
    padding: 6px 10px;
    font-size: 0.8rem;
    border: 1px solid var(--line);
    color: #d5eaf9;
    background: rgba(255, 255, 255, 0.04);
  }
  .price {
    font-size: 2.4rem;
    line-height: 1;
    margin: 16px 0 4px;
    letter-spacing: -0.04em;
  }
  .price span { font-size: 1rem; color: var(--muted); }
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
    font-size: 0.94rem;
    line-height: 1.7;
  }
  .hash {
    font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
    font-size: 0.86rem;
    color: #d8f3ff;
    background: #06111a;
    border: 1px solid rgba(148, 163, 184, 0.13);
    border-radius: 16px;
    padding: 16px;
    overflow-x: auto;
    white-space: pre-wrap;
  }
  .info-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px;
    border-radius: 18px;
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
    padding: 26px 28px 40px;
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
  .auth-container { max-width: 420px; margin: 0 auto; padding: 40px 28px; }
  .auth-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 32px; }
  .auth-title { font-size: 1.8rem; margin-bottom: 8px; text-align: center; }
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
    nav { height: auto; padding-top: 18px; padding-bottom: 18px; align-items: flex-start; flex-direction: column; }
    .hero { padding-top: 58px; }
    h1 { max-width: 100%; }
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

function renderPage(path: string, active: SitePage, hero: string, content: string, script = ''): Response {
  const seo = injectSeoTags(path)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${seo}
  <style>${SITE_STYLES}</style>
</head>
<body>
  <div class="site-shell">
    <header>
      <nav aria-label="Main navigation">
        <a href="/" class="logo" aria-label="RinaWarp Terminal Pro home">
          <img class="logo-mark" src="/assets/img/rinawarp-mark.svg" alt="RinaWarp Terminal Pro logo">
          <span>RinaWarp Terminal Pro</span>
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
        <a href="/download" class="btn btn-primary">Download the app</a>
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
          <a href="/download" class="btn btn-secondary">Get started</a>
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
          <div class="price">$40–$49 <span>/ user / month later</span></div>
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
  `
  const script = `
    const emailInput = document.getElementById('checkout-email');
    const status = document.getElementById('checkout-status');
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
          const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, tier: 'pro', billingCycle }),
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

function renderDownload(): Response {
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
          <p>For <strong>Debian/Ubuntu desktops</strong>, use the <strong>.deb</strong> package. It is the recommended Early Access path because APT pulls the standard Electron desktop libraries automatically. Choose <strong>AppImage</strong> only if you specifically want the in-app automatic update path and you already have a desktop Linux runtime stack in place.</p>
          <div class="link-row">
            <a href="/download/linux/deb" class="btn btn-primary">Download Linux .deb</a>
            <a href="${PUBLIC_INSTALLERS_BASE}/releases/1.1.4/RinaWarp-Terminal-Pro-1.1.4.AppImage" class="btn btn-secondary">Download AppImage</a>
            <a href="${PUBLIC_UPDATES_BASE}/latest.json" class="btn btn-secondary">View manifest</a>
          </div>
          <p class="note">Recommended baseline: Debian 13 / Ubuntu desktop-class systems for Early Access. Minimal server images may need additional GUI/runtime packages if you choose the AppImage path.</p>
        </article>
        <article class="card platform-card">
          <span class="pill">Windows</span>
          <h3>.exe installer</h3>
          <p>Windows Early Access builds use the same release flow and are the main automatic-update path on Windows.</p>
          <div class="link-row">
            <a href="${PUBLIC_INSTALLERS_BASE}/releases/1.1.4/RinaWarp-Terminal-Pro-1.1.4.exe" class="btn btn-primary">Download Windows</a>
          </div>
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
        <div class="info-bar">
          <span class="status-ok">Checksums and release manifest are public.</span>
          <span class="note">Use them before running the installer.</span>
        </div>
        <h2 class="section-title">How to verify your download</h2>
        <div class="link-row">
          <a href="${PUBLIC_INSTALLERS_BASE}/releases/1.1.4/SHASUMS256.txt" class="btn btn-secondary">Download SHASUMS256.txt</a>
          <a href="${PUBLIC_UPDATES_BASE}/latest.json" class="btn btn-secondary">Open latest.json</a>
        </div>
        <div class="hash"># Download the checksum file
curl -O ${PUBLIC_INSTALLERS_BASE}/releases/1.1.4/SHASUMS256.txt

# Inspect the live release manifest
curl ${PUBLIC_UPDATES_BASE}/latest.json

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
    const returnTo = '${returnTo}';
    
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
        
        successDiv.textContent = 'Login successful! Redirecting...';
        successDiv.style.display = 'block';
        
        setTimeout(() => {
          window.location.href = returnTo || '/account';
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

function renderRegister(): Response {
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
          window.location.href = '/login';
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
            <h2 class="auth-title">Loading...</h2>
          </div>
          
          <div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--line);">
            <h3 style="margin-bottom:16px;">Subscription</h3>
            <div id="subscription-info">Loading...</div>
          </div>
          
          <div style="margin-top:24px; padding-top:24px; border-top:1px solid var(--line);">
            <button id="logout-btn" class="btn btn-secondary" style="width:100%;">Sign Out</button>
          </div>
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
          
          <a href="/login" class="btn btn-primary" style="width:100%; margin-bottom:12px;">Sign In</a>
          <a href="/register" class="btn btn-secondary" style="width:100%; margin-bottom:12px;">Create Account</a>
          <a href="/early-access" class="btn btn-secondary" style="width:100%;">Early Access Policy</a>
        </div>
      </div>
    </section>`
    
    script = `
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

    if (host === 'www.rinawarptech.com') {
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
      return renderLogin()
    }

    if (path === '/register' || path === '/register/') {
      return renderRegister()
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

    // Download page
    if (path === '/download' || path === '/download/') {
      return renderDownload()
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
      console.log('Event received:', body)
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

// Feedback submission handler with SendGrid email notification
async function handleFeedbackSubmit(
  request: Request,
  env: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json()
    const { name, email, rating, message } = body

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Log feedback for now
    console.log('Feedback received:', { name, email, rating, message, timestamp: new Date().toISOString() })

    // Send email notification via SendGrid if API key is configured
    if (env.SENDGRID_API_KEY) {
      try {
        const emailBody = {
          personalizations: [
            {
              to: [{ email: 'support@rinawarptech.com' }],
              subject: `New Feedback: ${rating ? `⭐${rating}` : ''} from ${name}`,
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
    const { email, tier = 'pro', billingCycle = 'monthly' } = body

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

    const resolvedTierKey =
      normalizedTier === 'pro'
        ? normalizedBillingCycle === 'annual'
          ? 'pro_annual'
          : 'pro_monthly'
        : normalizedTier

    const priceId = priceIds[resolvedTierKey] || priceIds.pro_monthly

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
            'line_items[0][quantity]': '1',
            success_url: 'https://rinawarptech.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://rinawarptech.com/pricing',
          }),
        })

        const session = await response.json()

        if (session.error) {
          return new Response(JSON.stringify({ error: session.error.message || 'Checkout could not be created.' }), {
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

    // Try to find customer in Stripe if API key is available
    if (env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.startsWith('sk_')) {
      const response = await fetch(
        `https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(email)}'`,
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

        // Check for active subscriptions
        const subscriptionsResponse = await fetch(
          `https://api.stripe.com/v1/customers/${customer.id}/subscriptions?status=active`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        )

        const subscriptionsData = await subscriptionsResponse.json()
        const subscriptions = subscriptionsData.data || []

        if (subscriptions.length > 0) {
          const sub = subscriptions[0]
          const priceId = sub.items?.data[0]?.price?.id

          // Map price IDs to tier names
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

          const tier = tierMap[priceId] || 'unknown'

          return new Response(
            JSON.stringify({
              ok: true,
              email: customer.email,
              tier: tier,
              status: 'active',
              customerId: customer.id,
            }),
            {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          )
        }

        // Customer exists but no active subscription
        return new Response(
          JSON.stringify({
            ok: true,
            email: customer.email,
            tier: null,
            status: 'no_subscription',
            customerId: customer.id,
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }
    }

    // No Stripe - return mock response for testing
    return new Response(
      JSON.stringify({
        ok: true,
        email: email,
        tier: null,
        status: 'not_found',
      }),
      {
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
