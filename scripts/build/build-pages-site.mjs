import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const outdir = path.join(repoRoot, "website", ".pages-dist");
const packageJson = JSON.parse(await readFile(path.join(repoRoot, "apps", "terminal-pro", "package.json"), "utf8"));

const INSTALLERS_BASE = "https://pub-58c0b2f3cc8d43fa8cf6e1d4d2dcf94b.r2.dev";
const UPDATES_BASE = "https://pub-4df343f1b4524762a4f8ad3c744653c9.r2.dev";
const PRIMARY_UPDATES_BASE = "https://rinawarptech.com/releases";
const DEMO_MP4_URL = `${INSTALLERS_BASE}/demo/rinawarp-fix-project-demo.mp4`;
const DEMO_WEBM_URL = `${INSTALLERS_BASE}/demo/rinawarp-fix-project-demo.webm`;
const DEMO_POSTER_URL = `${INSTALLERS_BASE}/demo/rinawarp-fix-project-demo-poster.jpg`;
const VERSION = String(packageJson.version);
const GITHUB_RELEASES_BASE = "https://github.com/Bigsgotchu/rinawarp-terminal-pro/releases";
const PUBLIC_BETA_TAG = `v${VERSION}`;
const PUBLIC_BETA_DOWNLOAD_BASE = `${GITHUB_RELEASES_BASE}/download/${PUBLIC_BETA_TAG}`;
const PUBLIC_BETA_DEB_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/RinaWarp-Terminal-Pro-${VERSION}.deb`;
const PUBLIC_BETA_APPIMAGE_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/RinaWarp-Terminal-Pro-${VERSION}.AppImage`;
const PUBLIC_BETA_CHECKSUMS_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/SHASUMS256.txt`;
const PUBLIC_BETA_LATEST_JSON_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/latest.json`;
const PUBLIC_BETA_LATEST_YML_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/latest.yml`;
const PUBLIC_BETA_LATEST_LINUX_YML_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/latest-linux.yml`;
const ASSET_VERSION = "20260329-brand-refresh";
const GA_MEASUREMENT_ID = "G-YGX1R0MEB6";
const SCREENSHOT_SOURCES = [
  ["agent-empty-state.png", path.join(repoRoot, "apps", "terminal-pro", "test-results", "visual-qa", "agent-empty-state.png")],
  ["agent-active-thread.png", path.join(repoRoot, "apps", "terminal-pro", "test-results", "visual-qa", "agent-active-thread.png")],
  ["diagnostics-inspector.png", path.join(repoRoot, "apps", "terminal-pro", "test-results", "visual-qa", "diagnostics-inspector.png")],
  ["settings-memory.png", path.join(repoRoot, "apps", "terminal-pro", "test-results", "visual-qa", "settings-memory.png")],
  ["proof-after-fixed-project.png", path.join(repoRoot, "output", "playwright", "rinawarp-live-after-status.png")],
];
const BRAND_MARK_PATH = path.join(repoRoot, "apps", "terminal-pro", "src", "assets", "rinawarp-mark.svg");
const BRAND_LOGO_PATH = path.join(repoRoot, "apps", "terminal-pro", "src", "assets", "rinawarp-logo.png");
const BRAND_ICON_PATH = path.join(repoRoot, "apps", "terminal-pro", "src", "assets", "icon.png");
const DEMO_GIF_PATH = path.join("/tmp", "rinawarp-site-demo.gif");
const BRAND_MARK_SVG = await readFile(BRAND_MARK_PATH, "utf8");

const SITE_CSS = `
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
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 0.88rem;
  color: var(--muted);
}
.nav-links a {
  padding: 6px 10px;
  border-radius: 999px;
}
.nav-links a.nav-cta {
  padding: 9px 14px;
  background: linear-gradient(135deg, var(--accent), var(--accent-soft));
  color: #04121a;
  font-weight: 700;
}
.nav-links a.active,
.nav-links a:hover {
  color: var(--text);
  background: rgba(255,255,255,0.04);
}
.nav-links a.nav-cta.active,
.nav-links a.nav-cta:hover {
  color: #04121a;
  background: linear-gradient(135deg, var(--accent), var(--accent-soft));
}
main { flex: 1; }
.hero,
.section {
  max-width: var(--content);
  margin: 0 auto;
  padding: 26px 24px;
}
.hero { padding-top: 56px; }
.hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(320px, 1.1fr);
  gap: 24px;
  align-items: center;
}
.hero-body {
  display: grid;
  gap: 14px;
}
.eyebrow, .kicker, .pill, .note, .auth-subtitle, .footer-links {
  color: var(--muted);
}
.eyebrow, .kicker, .pill {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.68rem;
  font-weight: 700;
}
.hero h1 {
  margin-top: 10px;
  font-size: clamp(1.85rem, 3vw, 3.2rem);
  line-height: 1.02;
  max-width: 12ch;
  letter-spacing: -0.04em;
}
.hero-copy, .section-copy, p, li {
  color: var(--muted);
  line-height: 1.58;
  font-size: 0.95rem;
}
.hero-copy { max-width: 64ch; margin-top: 14px; }
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}
.hero-support {
  color: var(--muted);
  font-size: 0.9rem;
}
.hero-proof-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 8px;
}
.hero-proof-item {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.03);
}
.hero-proof-label {
  display: block;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}
.hero-proof-value {
  color: var(--text);
  font-size: 0.92rem;
  line-height: 1.45;
}
.hero-media {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(98, 246, 229, 0.18);
  background:
    radial-gradient(circle at top left, rgba(255, 79, 216, 0.14), transparent 32%),
    linear-gradient(180deg, rgba(7, 17, 26, 0.96), rgba(10, 21, 32, 0.92));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
}
.hero-media::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent 28%);
}
.hero-media .screenshot-frame {
  border: 0;
  border-radius: 24px;
  background: transparent;
  box-shadow: none;
}
[data-page="home"] .hero {
  padding-top: 42px;
  padding-bottom: 12px;
}
[data-page="home"] .hero h1,
[data-page="download"] .hero h1 {
  max-width: 10ch;
  font-size: clamp(2.4rem, 5vw, 4.7rem);
}
[data-page="home"] .hero-copy,
[data-page="download"] .hero-copy {
  max-width: 48ch;
  font-size: 1.02rem;
}
[data-page="home"] .hero-media video,
[data-page="download"] .hero-media video {
  min-height: 100%;
  object-fit: cover;
}
.cta-row, .link-row, .stack, .signal-list, .feature-list, .auth-container, .auth-card, .panel {
  display: grid;
  gap: 12px;
}
.cta-row, .link-row { grid-auto-flow: column; justify-content: start; gap: 12px; }
.grid.three-up, .download-grid, .pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
}
.card, .panel, .auth-card, .pricing-card, .platform-card, .proof-step {
  padding: 18px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow);
}
.pricing-card.featured {
  border-color: var(--line-strong);
  background: linear-gradient(180deg, rgba(98,246,229,0.09), rgba(13,28,42,0.95));
}
.section-title { font-size: 1.28rem; margin-bottom: 8px; letter-spacing: -0.02em; }
.price { font-size: 1.8rem; font-weight: 700; color: var(--text); }
.price span { font-size: 0.9rem; color: var(--muted); font-weight: 500; }
.proof-strip, .signal-list, .feature-list {
  display: grid;
  gap: 12px;
  padding-left: 0;
  list-style: none;
}
.proof-demo {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 16px;
  align-items: start;
}
.transcript-demo {
  display: grid;
  gap: 12px;
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
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.03);
}
.proof-note strong {
  display: block;
  margin-bottom: 8px;
}
.faq-grid {
  display: grid;
  gap: 16px;
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
.screenshot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.screenshot-card {
  display: grid;
  gap: 10px;
}
.screenshot-frame {
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: var(--shadow);
}
.screenshot-frame img {
  display: block;
  width: 100%;
  height: auto;
}
.screenshot-frame video {
  display: block;
  width: 100%;
  height: auto;
}
.screenshot-caption {
  color: var(--muted);
  font-size: 0.94rem;
  line-height: 1.6;
}
.fit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.fit-card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.03);
}
.fit-card h3 {
  margin-bottom: 10px;
}
.founder-note {
  padding: 20px;
  border-radius: 18px;
  border: 1px solid rgba(98, 246, 229, 0.22);
  background: linear-gradient(180deg, rgba(98, 246, 229, 0.08), rgba(10, 21, 32, 0.92));
  box-shadow: var(--shadow);
}
.founder-note blockquote {
  color: var(--text);
  font-size: 0.96rem;
  line-height: 1.7;
}
.founder-note cite {
  color: var(--muted);
  display: block;
  margin-top: 12px;
  font-style: normal;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.92rem;
}
.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-soft));
  color: #04121a;
}
.btn-secondary {
  border-color: var(--line);
  background: rgba(255,255,255,0.03);
  color: var(--text);
}
label {
  display: grid;
  gap: 8px;
  color: var(--text);
  font-weight: 600;
}
input, textarea, select {
  width: 100%;
  min-height: 46px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.03);
  color: var(--text);
}
textarea { min-height: 140px; resize: vertical; }
.status-message.success { color: var(--success); }
.status-message.error { color: var(--danger); }
.auth-container { max-width: 720px; }
footer {
  border-top: 1px solid var(--line);
  padding: 20px 24px 30px;
}
.footer-inner {
  max-width: var(--content);
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  color: var(--muted);
}
.footer-links {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
@media (max-width: 840px) {
  nav, .hero, .section, footer { padding-left: 18px; padding-right: 18px; }
  .cta-row, .link-row { grid-auto-flow: row; }
  .proof-demo { grid-template-columns: 1fr; }
  .logo-wordmark { height: 24px; }
  .hero-layout { grid-template-columns: 1fr; }
  .hero-proof-strip { grid-template-columns: 1fr; }
  [data-page="home"] .hero,
  [data-page="download"] .hero { padding-top: 28px; }
}
`;

const SITE_JS = `
const page = document.body.dataset.page || '';

async function trackSiteEvent(event, properties = {}) {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event,
        properties,
        path: window.location.pathname,
        hostname: window.location.hostname,
        ts: Date.now(),
      }),
    });
  } catch {
    // Analytics is optional and should never block the user path.
  }
}

const pageViewEventMap = {
  home: 'site_home_viewed',
  pricing: 'site_pricing_viewed',
  download: 'site_download_viewed',
};

const pageViewEvent = pageViewEventMap[page];
if (pageViewEvent) {
  trackSiteEvent(pageViewEvent, { referrer: document.referrer ? 'present' : 'none' });
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

  trackSiteEvent(name, properties);
});

function setStatus(id, message, state = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = state ? 'status-message ' + state : 'status-message';
}

async function withJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || 'Request failed.');
  return payload;
}

function getToken() {
  return localStorage.getItem('auth_token');
}

function setToken(token) {
  if (token) localStorage.setItem('auth_token', token);
}

function clearToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_email');
}

function getReferralCode() {
  return localStorage.getItem('referral_code') || '';
}

function setReferralCode(code) {
  if (!code) return;
  localStorage.setItem('referral_code', code);
}

const referralCodeFromUrl = new URLSearchParams(window.location.search).get('ref') || '';
if (referralCodeFromUrl) {
  setReferralCode(referralCodeFromUrl.trim().toUpperCase());
}

if (page === 'pricing') {
  document.querySelectorAll('[data-checkout-cycle]')?.forEach((button) => {
    button.addEventListener('click', async () => {
      const emailInput = document.getElementById('checkout-email');
      const email = emailInput?.value?.trim();
      const billingCycle = button.getAttribute('data-checkout-cycle') || 'monthly';
      if (!email) {
        setStatus('checkout-status', 'Add your email first so Stripe can create the checkout session.');
        emailInput?.focus();
        return;
      }
      setStatus('checkout-status', 'Opening secure checkout…');
      try {
        trackSiteEvent('checkout_started', {
          tier: 'pro',
          billingCycle,
          placement: 'pricing_pro',
        });
        localStorage.setItem('checkout_email', email);
        localStorage.setItem('checkout_tier', 'pro');
        localStorage.setItem('checkout_billing_cycle', billingCycle);
        const referralCode = getReferralCode();
        const payload = await withJson(await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, tier: 'pro', billingCycle, referralCode }),
        }));
        if (!payload.checkoutUrl) throw new Error('Checkout could not be created.');
        window.location.href = payload.checkoutUrl;
      } catch (error) {
        setStatus('checkout-status', error instanceof Error ? error.message : 'Checkout could not be created.', 'error');
      }
    });
  });
}

if (page === 'team') {
  document.getElementById('team-checkout-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const seats = Math.max(1, Number(formData.get('seats') || 1));
    const workspaceId = String(formData.get('workspaceId') || '').trim();
    if (!email) {
      setStatus('team-checkout-status', 'Add the billing email first.', 'error');
      return;
    }
    setStatus('team-checkout-status', 'Opening secure Team checkout…');
    try {
      trackSiteEvent('checkout_started', {
        tier: 'team',
        placement: 'team_page',
        seats,
      });
      localStorage.setItem('checkout_email', email);
      localStorage.setItem('checkout_tier', 'team');
      localStorage.setItem('checkout_seats', String(seats));
      if (workspaceId) localStorage.setItem('checkout_workspace_id', workspaceId);
      const referralCode = getReferralCode();
      const payload = await withJson(await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier: 'team', seats, workspaceId, referralCode }),
      }));
      if (!payload.checkoutUrl) throw new Error('Checkout could not be created.');
      window.location.href = payload.checkoutUrl;
    } catch (error) {
      setStatus('team-checkout-status', error instanceof Error ? error.message : 'Team checkout could not be created.', 'error');
    }
  });
}

if (page === 'success') {
  const email = localStorage.getItem('checkout_email') || '';
  const tier = localStorage.getItem('checkout_tier') || 'pro';
  const seats = localStorage.getItem('checkout_seats') || '';
  const workspaceId = localStorage.getItem('checkout_workspace_id') || '';
  const sessionId = new URLSearchParams(window.location.search).get('session_id') || '';
  const emailEls = document.querySelectorAll('[data-success-email]');
  emailEls.forEach((el) => { el.textContent = email || 'the billing email you used at checkout'; });
  const sessionEl = document.getElementById('success-session-id');
  if (sessionEl) sessionEl.textContent = sessionId || 'Pending';
  const planEl = document.getElementById('success-plan');
  if (planEl) planEl.textContent = tier === 'team' ? 'Power / Team' : 'Pro';
  const seatEl = document.getElementById('success-seats');
  if (seatEl) seatEl.textContent = tier === 'team' ? (seats || 'Seat count saved in checkout') : '1';
  const workspaceEl = document.getElementById('success-workspace');
  if (workspaceEl) workspaceEl.textContent = workspaceId || 'Not attached during checkout';
  const accountLink = document.getElementById('success-account-link');
  if (accountLink && email) accountLink.href = '/account/?email=' + encodeURIComponent(email);
  const restoreLink = document.getElementById('success-restore-link');
  if (restoreLink && email) restoreLink.href = '/account/?email=' + encodeURIComponent(email) + '#restore';
}

if (page === 'feedback') {
  const topicField = document.querySelector('[name="topic"]');
  const topicFromUrl = new URLSearchParams(window.location.search).get('topic');
  if (topicField && topicFromUrl) topicField.value = topicFromUrl;
  document.getElementById('feedback-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus('feedback-status', 'Sending feedback...');
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await withJson(await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }));
      form.reset();
      setStatus('feedback-status', 'Thanks. Your message is in and we’ll use it to improve the product.', 'success');
    } catch (error) {
      setStatus('feedback-status', error instanceof Error ? error.message : 'Feedback could not be sent right now.', 'error');
    }
  });
}

if (page === 'login') {
  document.getElementById('login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const payload = await withJson(await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }));
      setToken(payload.token);
      localStorage.setItem('user_email', payload.user?.email || data.email || '');
      window.location.href = new URLSearchParams(window.location.search).get('returnTo') || '/account/';
    } catch (error) {
      setStatus('login-status', error instanceof Error ? error.message : 'Login failed.', 'error');
    }
  });
}

if (page === 'register') {
  document.getElementById('register-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    if (password !== confirmPassword) {
      setStatus('register-status', 'Passwords do not match.', 'error');
      return;
    }
    try {
      const payload = await withJson(await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name') || undefined,
          email: formData.get('email'),
          password,
        }),
      }));
      form.reset();
      setStatus('register-status', payload.message || 'Account created. Check your email.', 'success');
    } catch (error) {
      setStatus('register-status', error instanceof Error ? error.message : 'Registration failed.', 'error');
    }
  });
}

if (page === 'forgot-password') {
  document.getElementById('forgot-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const payload = await withJson(await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }));
      form.reset();
      setStatus('forgot-status', payload.message || 'If the account exists, a reset email is on the way.', 'success');
    } catch (error) {
      setStatus('forgot-status', error instanceof Error ? error.message : 'Could not send reset email.', 'error');
    }
  });
}

if (page === 'reset-password') {
  document.getElementById('reset-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    if (password !== confirmPassword) {
      setStatus('reset-status', 'Passwords do not match.', 'error');
      return;
    }
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('reset-status', 'Reset token missing from the URL.', 'error');
      return;
    }
    try {
      const payload = await withJson(await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      }));
      form.reset();
      setStatus('reset-status', payload.message || 'Password reset successful. You can sign in now.', 'success');
    } catch (error) {
      setStatus('reset-status', error instanceof Error ? error.message : 'Password reset failed.', 'error');
    }
  });
}

if (page === 'account') {
  const token = getToken();
  const authGate = document.getElementById('account-gate');
  const authState = document.getElementById('account-state');
  const restoreForm = document.getElementById('restore-form');
  const emailFromQuery = new URLSearchParams(window.location.search).get('email') || '';
  const checkoutEmail = emailFromQuery || localStorage.getItem('checkout_email') || localStorage.getItem('user_email') || '';

  async function loadAccount() {
    if (!token) {
      if (authGate) authGate.hidden = false;
      if (authState) authState.hidden = true;
      const restoreInput = restoreForm?.querySelector('input[name=\"email\"]');
      if (restoreInput && checkoutEmail) restoreInput.value = checkoutEmail;
      return;
    }
    try {
      const payload = await withJson(await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token },
      }));
      if (authGate) authGate.hidden = true;
      if (authState) authState.hidden = false;
      document.getElementById('account-name').textContent = payload.user?.name || 'RinaWarp account';
      document.getElementById('account-email').textContent = payload.user?.email || localStorage.getItem('user_email') || '';
      if (payload.user?.email) localStorage.setItem('user_email', payload.user.email);
      try {
        const sub = await withJson(await fetch('/api/license/lookup-by-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: payload.user?.email }),
        }));
        document.getElementById('account-tier').textContent = sub.tier ? String(sub.tier).toUpperCase() : 'FREE';
        document.getElementById('account-tier-note').textContent = sub.tier ? 'Status: ' + (sub.status || 'active') : 'No paid entitlement found yet.';
      } catch {
        document.getElementById('account-tier').textContent = 'UNKNOWN';
        document.getElementById('account-tier-note').textContent = 'Could not load billing state.';
      }

      try {
        const referral = await withJson(await fetch('/api/referrals/me', {
          headers: { Authorization: 'Bearer ' + token },
        }));
        document.getElementById('account-referral').hidden = false;
        document.getElementById('account-invite-link').value = referral.inviteUrl || '';
        document.getElementById('account-referral-code').textContent = referral.code || '—';
        document.getElementById('account-referral-stats').textContent =
          (referral.stats?.checkouts || 0) + ' checkout(s) started • ' + (referral.stats?.conversions || 0) + ' paid conversion(s)';
      } catch {
        document.getElementById('account-referral').hidden = true;
      }

      try {
        const adminCard = document.getElementById('account-referral-admin');
        const form = document.getElementById('account-referral-admin-form');
        const output = document.getElementById('account-referral-admin-output');
        if (adminCard && form && output) {
          adminCard.hidden = false;
          form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const code = String(formData.get('code') || '').trim();
            const email = String(formData.get('email') || '').trim();
            setStatus('account-referral-admin-status', 'Looking up referral activity...');
            try {
              const params = new URLSearchParams();
              if (code) params.set('code', code);
              if (email) params.set('email', email);
              const payload = await withJson(await fetch('/api/referrals/admin?' + params.toString(), {
                headers: { Authorization: 'Bearer ' + token },
              }));
              if (!payload.found) {
                output.textContent = 'No referral record found for that code or email.';
                setStatus('account-referral-admin-status', 'Lookup finished.', 'success');
                return;
              }
              const lines = [
                'Referral code: ' + (payload.referral?.code || '—'),
                'Owner email: ' + (payload.referral?.email || '—'),
                'Events: ' + (payload.stats?.events || 0),
                'Checkouts: ' + (payload.stats?.checkouts || 0),
                'Conversions: ' + (payload.stats?.conversions || 0),
                '',
                'Recent events:',
                ...((payload.events || []).map((entry) =>
                  '- ' + String(entry.event_type || 'event') + ' · ' + String(entry.referred_email || '—') + ' · ' + String(entry.source || '—')
                )),
              ];
              output.textContent = lines.join('\\n');
              setStatus('account-referral-admin-status', 'Lookup finished.', 'success');
            } catch (error) {
              output.textContent = '';
              setStatus('account-referral-admin-status', error instanceof Error ? error.message : 'Lookup failed.', 'error');
            }
          });
        }
      } catch {
        document.getElementById('account-referral-admin')?.setAttribute('hidden', 'hidden');
      }
    } catch {
      clearToken();
      if (authGate) authGate.hidden = false;
      if (authState) authState.hidden = true;
    }
  }

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken();
    window.location.reload();
  });

  document.getElementById('copy-invite-link-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('account-invite-link');
    const value = input?.value?.trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus('account-referral-status', 'Invite link copied.', 'success');
    } catch {
      setStatus('account-referral-status', 'Could not copy the invite link right now.', 'error');
    }
  });

  document.getElementById('billing-portal-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('account-email').textContent.trim() || localStorage.getItem('user_email') || '';
    try {
      const payload = await withJson(await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }));
      if (payload.url) window.location.href = payload.url;
    } catch (error) {
      setStatus('restore-status', error instanceof Error ? error.message : 'Could not open billing portal.', 'error');
    }
  });

  restoreForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email') || '').trim();
    if (!email) {
      setStatus('restore-status', 'Enter the billing email you used at checkout.', 'error');
      return;
    }
    try {
      const lookup = await withJson(await fetch('/api/license/lookup-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }));
      setStatus('restore-status', lookup.tier ? 'Entitlement found. Open the desktop app and use the restore flow with this billing email.' : 'No paid entitlement found for that email yet.', lookup.tier ? 'success' : 'error');
    } catch (error) {
      setStatus('restore-status', error instanceof Error ? error.message : 'Restore lookup failed.', 'error');
    }
  });

  loadAccount();
}
`;

function seo(path, title, description) {
  const canonical = `https://rinawarptech.com${path}`;
  const ogImage = "https://rinawarptech.com/assets/img/rinawarp-logo.png";
  const normalizedPath = path === "/" ? "/" : path.replace(/\/$/, "");
  const isMatterPage = normalizedPath === "/products" || normalizedPath.startsWith("/matter-intelligence");
  const noindexPaths = new Set(["/account", "/login", "/register", "/forgot-password", "/reset-password", "/success/"]);
  const robots = noindexPaths.has(path) ? 'noindex, nofollow' : 'index, follow';
  const structuredData = buildStructuredData(path, title, description);
  return `
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="author" content="RinaWarp Technologies, LLC">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:site_name" content="${isMatterPage ? "RinaWarp" : "RinaWarp Terminal Pro"}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="theme-color" content="#ff9b6b">
  <meta name="color-scheme" content="dark">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="msapplication-TileColor" content="#ff4fd8">
  <link rel="preconnect" href="https://pub-58c0b2f3cc8d43fa8cf6e1d4d2dcf94b.r2.dev" crossorigin>
  <link rel="preconnect" href="https://pub-4df343f1b4524762a4f8ad3c744653c9.r2.dev" crossorigin>
  <link rel="preconnect" href="https://www.googletagmanager.com">
  <link rel="preconnect" href="https://www.google-analytics.com">
  <link rel="icon" href="/assets/img/icon.png" type="image/png">
  <link rel="shortcut icon" href="/assets/img/icon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/img/icon.png">
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}');
  </script>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://static.cloudflareinsights.com; font-src 'self';">
  <script type="application/ld+json">${structuredData}</script>
  `;
}

function buildStructuredData(path, title, description) {
  const canonical = `https://rinawarptech.com${path}`;
  const normalizedPath = path === "/" ? "/" : path.replace(/\/$/, "");
  const isMatterPage = normalizedPath === "/products" || normalizedPath.startsWith("/matter-intelligence");
  const offerPrice = normalizedPath === "/team" ? "40" : "15";
  const graph = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "RinaWarp Technologies, LLC",
      url: "https://rinawarptech.com",
      logo: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    },
    {
      "@context": "https://schema.org",
      "@type": isMatterPage ? "SoftwareApplication" : "SoftwareApplication",
      name: isMatterPage
        ? normalizedPath === "/products"
          ? "RinaWarp"
          : "RinaWarp Matter Intelligence"
        : "RinaWarp Terminal Pro",
      applicationCategory: isMatterPage ? "BusinessApplication" : "DeveloperApplication",
      operatingSystem: isMatterPage ? "Web, Windows, Linux" : "Windows, Linux",
      url: canonical,
      description,
      publisher: {
        "@type": "Organization",
        name: "RinaWarp Technologies, LLC",
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: isMatterPage
          ? normalizedPath === "/matter-intelligence/pricing"
            ? "99"
            : "0"
          : offerPrice,
        availability: "https://schema.org/InStock",
      },
    },
  ];

  if (normalizedPath === "/what-is-rinawarp" || normalizedPath === "/what-is-a-proof-first-ai-terminal") {
    graph.push({
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      name: normalizedPath === "/what-is-rinawarp" ? "RinaWarp Terminal Pro" : "Proof-first AI terminal",
      description: normalizedPath === "/what-is-rinawarp"
        ? "A proof-first AI terminal workbench that keeps receipts, recovery, and trust attached to real developer work."
        : "A terminal workflow surface where AI actions stay connected to receipts, recovery, and proof instead of only producing opaque answers.",
      url: canonical,
      inDefinedTermSet: canonical,
    });
  }

  if (normalizedPath === "/pricing" || normalizedPath === "/early-access") {
    graph.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is RinaWarp Terminal Pro?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "RinaWarp Terminal Pro is a proof-first AI workbench for build, test, deploy, and recovery workflows.",
          },
        },
        {
          "@type": "Question",
          name: "How do restore and updates work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The canonical release surface is rinawarptech.com/releases, and paid access can be recovered through the billing-email restore path.",
          },
        },
      ],
    });
  }

  if (normalizedPath === "/rinawarp-vs-ai-terminals" || normalizedPath === "/rinawarp-vs-warp") {
    graph.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      mainEntityOfPage: canonical,
      author: {
        "@type": "Organization",
        name: "RinaWarp Technologies, LLC",
      },
      publisher: {
        "@type": "Organization",
        name: "RinaWarp Technologies, LLC",
        logo: {
          "@type": "ImageObject",
          url: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
        },
      },
    });
  }

  return JSON.stringify(graph);
}

function nav(active) {
  const items = [
    ["/", "Home", "home"],
    ["/products/", "Products", "products"],
    ["/matter-intelligence/", "Matter Intelligence", "products"],
    ["/pricing/", "Pricing", "pricing"],
    ["/download/", "Download", "download"],
    ["/docs/", "Docs", "docs"],
    ["/agents/", "Agents", "docs"],
    ["/support/", "Support", "feedback"],
    ["/account/", "Account", "account"],
  ];
  return items
    .map(([href, label, key]) => {
      const classes = [];
      if (active === key) classes.push("active");
      if (key === "download") classes.push("nav-cta");
      const classAttr = classes.length ? ` class="${classes.join(" ")}"` : "";
      const currentAttr = active === key ? ' aria-current="page"' : "";
      return `<a href="${href}"${classAttr}${currentAttr}>${label}</a>`;
    })
    .join("");
}

function shell({ path, page, title, description, eyebrow, heading, copy, heroActions = "", heroSupport = "", heroProof = "", heroMedia = "", content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${seo(path, title, description)}
  <link rel="stylesheet" href="/assets/site.css?v=${ASSET_VERSION}">
</head>
<body data-page="${page}">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="site-shell">
    <header>
      <nav aria-label="Main navigation">
        <a href="/" class="logo" aria-label="RinaWarp home">
          <img class="logo-wordmark" src="/assets/img/rinawarp-logo.png" alt="RinaWarp logo">
        </a>
        <div class="nav-links">${nav(page)}</div>
      </nav>
    </header>
    <main id="main-content" tabindex="-1">
      <section class="hero">
        <div class="hero-layout">
          <div class="hero-body">
            <span class="eyebrow">${eyebrow}</span>
            <h1>${heading}</h1>
            <p class="hero-copy">${copy}</p>
            ${heroActions ? `<div class="hero-actions">${heroActions}</div>` : ""}
            ${heroSupport ? `<p class="hero-support">${heroSupport}</p>` : ""}
            ${heroProof ? `<div class="hero-proof-strip">${heroProof}</div>` : ""}
          </div>
          ${heroMedia ? `<div class="hero-media">${heroMedia}</div>` : ""}
        </div>
      </section>
      ${content}
    </main>
    <footer>
      <div class="footer-inner">
        <div>© 2026 RinaWarp Technologies, LLC. Proof-first AI workbench.</div>
        <div class="footer-links">
          <a href="/products/">Products</a>
          <a href="/docs/">Docs</a>
          <a href="/pricing/">Pricing</a>
          <a href="/download/">Download</a>
          <a href="/support/">Support</a>
          <a href="/terms/">Terms</a>
          <a href="/privacy/">Privacy</a>
          <a href="/early-access/">Early Access</a>
        </div>
      </div>
    </footer>
  </div>
  <script src="/assets/site.js?v=${ASSET_VERSION}"></script>
</body>
</html>`;
}

const pages = [
  {
    route: "",
    path: "/",
    page: "home",
    title: "Fix Your Broken Project Automatically | RinaWarp",
    description: "RinaWarp detects, repairs, and verifies broken developer projects automatically. Click Fix Project, watch the repair flow, and see proof that it worked.",
    eyebrow: "Fix Project",
    heading: "Fix your broken project automatically.",
    copy: "AI that reads your code, fixes issues, and verifies it works. Open the project, click Fix Project, and watch the repair happen live.",
    heroActions: `
      <a href="/download/" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="home_hero" data-analytics-prop-target="download">Download Now</a>
      <a href="/pricing/" class="btn btn-secondary">See pricing</a>
      <a href="/#demo" class="btn btn-secondary">Watch demo</a>
    `,
    heroSupport: "Broken build, dead install, bad config, crashed dev server. The first screen should make the outcome obvious.",
    heroProof: `
      <div class="hero-proof-item"><span class="hero-proof-label">Outcome</span><span class="hero-proof-value">Broken project to verified working result</span></div>
      <div class="hero-proof-item"><span class="hero-proof-label">Proof</span><span class="hero-proof-value">What changed, what worked, confidence attached</span></div>
      <div class="hero-proof-item"><span class="hero-proof-label">Demo</span><span class="hero-proof-value">21-second real repair flow above the fold</span></div>
    `,
    heroMedia: `
      <div class="screenshot-frame">
        <video id="demo" controls preload="metadata" poster="${DEMO_POSTER_URL}" playsinline>
          <source src="${DEMO_WEBM_URL}" type="video/webm">
          <source src="${DEMO_MP4_URL}" type="video/mp4">
        </video>
      </div>
    `,
    content: `
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Broken projects waste hours</h2>
        <p class="section-copy">A broken install, failed build, bad config, or dead dev server all create the same problem: progress stops. RinaWarp is built to get the project working again without turning the website into a wall of explanation.</p>
        <div class="grid three-up">
          <article class="card"><h3>Missing dependencies</h3><p>Get stalled installs moving again.</p></article>
          <article class="card"><h3>Broken builds</h3><p>Recover from config and compile failures faster.</p></article>
          <article class="card"><h3>Dev server crashes</h3><p>Diagnose, repair, and verify the path back to running.</p></article>
        </div>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Verified success</h2>
        <p class="section-copy">This is the app after a real repair. One strong proof screen is more convincing than a dozen feature blocks.</p>
        <div class="screenshot-frame"><img src="/assets/img/proof-after-fixed-project.png" alt="RinaWarp showing the project fixed with verified status after repair" width="1356" height="697" loading="lazy" decoding="async"></div>
      </div></section>
      <section id="products" class="section"><h2 class="section-title">How it works</h2><p class="section-copy">The flow should feel obvious in seconds, not after a long read.</p><div class="grid three-up">
        <article class="card"><div class="kicker">1</div><h3>Open your project</h3><p>Start inside the real broken repo.</p></article>
        <article class="card"><div class="kicker">2</div><h3>Click Fix Project</h3><p>RinaWarp analyzes the workspace and runs the repair.</p></article>
        <article class="card"><div class="kicker">3</div><h3>Check the result</h3><p>See what changed, what worked, and how confident the fix is.</p></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Trust the result</h2>
        <p class="section-copy">The trust story is simple: show the change, show the verification, show the confidence.</p>
        <div class="grid three-up">
          <article class="card"><div class="kicker">What changed</div><h3>Readable summary</h3><p>Dependency installs, config edits, and fixes stay visible.</p></article>
          <article class="card"><div class="kicker">What worked</div><h3>Verified outcome</h3><p>The app confirms whether the recovery actually succeeded.</p></article>
          <article class="card"><div class="kicker">Confidence</div><h3>Honest score</h3><p>You see how safe the result looks before you move on.</p></article>
        </div>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Start free. Upgrade when you need more.</h2>
        <p class="section-copy">The homepage only needs one pricing idea: try it on a broken project, then pay if it saves you time.</p>
        <div class="cta-row">
          <a href="/download/" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="home_final_cta" data-analytics-prop-target="download">Download Now</a>
          <a href="/pricing/" class="btn btn-secondary">See pricing</a>
          <a href="/#demo" class="btn btn-secondary">Watch demo</a>
        </div>
      </div></section>
    `
  },
  {
    route: "products",
    path: "/products",
    page: "products",
    title: "RinaWarp Products | Terminal Pro and Matter Intelligence",
    description: "Explore RinaWarp Terminal Pro for broken projects and RinaWarp Matter Intelligence for sensitive legal, finance, and compliance workflows.",
    eyebrow: "Products",
    heading: "RinaWarp products",
    copy: "Terminal Pro stays focused on fixing broken projects automatically. Matter Intelligence is a separate product line for sensitive legal, finance, and compliance workflows.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card" style="grid-column: span 2;">
          <div class="kicker">RinaWarp Terminal Pro</div>
          <h3>Fix broken projects automatically.</h3>
          <p>AI that reads your code, fixes issues, and verifies the result. Built for broken installs, failed builds, bad config, and crashed dev servers.</p>
          <div class="link-row">
            <a href="/" class="btn btn-primary">View Terminal Pro</a>
            <a href="/pricing/" class="btn btn-secondary">See pricing</a>
            <a href="/download/" class="btn btn-secondary">Download</a>
          </div>
        </article>
        <article class="card">
          <div class="kicker">RinaWarp Matter Intelligence</div>
          <h3>Institutional memory for sensitive matters.</h3>
          <p>AI for legal, finance, and compliance teams that connects matter documents, email, transcripts, obligations, and decisions into one evidence-grounded workspace.</p>
          <div class="link-row">
            <a href="/matter-intelligence/" class="btn btn-primary">Explore Matter Intelligence</a>
            <a href="/matter-intelligence/demo/" class="btn btn-secondary">Request demo</a>
          </div>
        </article>
      </div></section>
    `
  },
  {
    route: "matter-intelligence",
    path: "/matter-intelligence",
    page: "products",
    title: "RinaWarp Matter Intelligence | Institutional Memory for Sensitive Matters",
    description: "RinaWarp Matter Intelligence gives legal, finance, and compliance teams cited answers and reviewer-ready drafts grounded in matter evidence.",
    eyebrow: "RinaWarp Matter Intelligence",
    heading: "Institutional memory for sensitive matters.",
    copy: "RinaWarp Matter Intelligence helps legal, finance, and compliance teams reconstruct what happened, what changed, what deadlines exist, and which evidence supports the answer.",
    heroActions: `
      <a href="/matter-intelligence/demo/" class="btn btn-primary">Request demo</a>
      <a href="/matter-intelligence/pricing/" class="btn btn-secondary">See pricing</a>
    `,
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><div class="kicker">Ask any matter</div><h3>Find prior decisions fast</h3><p>Find prior decisions, obligations, deadlines, approvals, and open risks in one place.</p></article>
        <article class="card"><div class="kicker">See the evidence</div><h3>Every answer is grounded</h3><p>Every answer is grounded in source-linked documents, messages, and timeline events.</p></article>
        <article class="card"><div class="kicker">Generate drafts</div><h3>Reviewer-ready status memos</h3><p>Create status memos and decision recaps with citations before anything leaves the workspace.</p></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Built for regulated workflows</h2>
        <div class="grid three-up">
          <article class="card"><h3>Legal matters</h3><p>Keep matter history, evidence, and decisions connected over time.</p></article>
          <article class="card"><h3>Finance investigations</h3><p>Reconstruct facts, approvals, and changes without scattered context.</p></article>
          <article class="card"><h3>Compliance reviews</h3><p>Support internal reviews, audit prep, and sensitive internal cases.</p></article>
        </div>
      </div></section>
    `
  },
  {
    route: "matter-intelligence/pricing",
    path: "/matter-intelligence/pricing",
    page: "products",
    title: "Matter Intelligence Pricing | RinaWarp",
    description: "See Solo, Team, and Enterprise pricing for RinaWarp Matter Intelligence.",
    eyebrow: "Pricing",
    heading: "Pricing for Matter Intelligence",
    copy: "Start with clear pricing and a guided onboarding path. The product and trust model stay separate from Terminal Pro.",
    content: `
      <section class="section"><div class="pricing-grid">
        <article class="card pricing-card"><span class="pill">Solo</span><div class="price">$99 <span>/ month</span></div><p>For independent legal, finance, or compliance professionals working on sensitive matters.</p><ul class="feature-list"><li>1 user</li><li>Up to 25 active matters</li><li>Outlook + SharePoint connectors</li><li>Cited answers</li><li>Status memo drafts</li></ul><a href="/matter-intelligence/demo/" class="btn btn-primary">Request guided access</a></article>
        <article class="card pricing-card featured"><span class="pill">Team</span><div class="price">$399 <span>/ month</span></div><p>For small teams that need shared matter memory, reviewer workflows, and audit visibility.</p><ul class="feature-list"><li>Up to 5 users</li><li>Shared workspace</li><li>Matter timeline</li><li>Review queue</li><li>Admin controls</li><li>Audit log</li></ul><a href="/matter-intelligence/demo/" class="btn btn-primary">Request setup</a></article>
        <article class="card pricing-card"><span class="pill">Enterprise</span><div class="price">Custom</div><p>For teams that need SSO, private deployment, retention controls, or custom integrations.</p><ul class="feature-list"><li>SSO</li><li>Custom retention</li><li>Advanced governance</li><li>Private deployment options</li><li>Priority support</li></ul><a href="/matter-intelligence/contact/" class="btn btn-secondary">Talk to sales</a></article>
      </div></section>
    `
  },
  {
    route: "matter-intelligence/security",
    path: "/matter-intelligence/security",
    page: "products",
    title: "Matter Intelligence Security | RinaWarp",
    description: "Review data sources, access controls, retention expectations, and support contacts for RinaWarp Matter Intelligence.",
    eyebrow: "Security",
    heading: "Security and data handling",
    copy: "RinaWarp Matter Intelligence is designed for sensitive work. This page explains what data enters the system, what is stored, and how access is controlled.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>Data sources</h3><p>Outlook mail, selected SharePoint files, matter notes, metadata, generated summaries, and drafts.</p></article>
        <article class="card"><h3>Data controls</h3><p>Matter-scoped access, role-based permissions, exclusion controls, retention expectations, and audit logging.</p></article>
        <article class="card"><h3>Model usage</h3><p>Generated responses are grounded in retrieved matter evidence. Customers should review outputs before relying on them.</p></article>
      </div></section>
      <section class="section"><div class="panel stack"><h2 class="section-title">Security contact</h2><p>Email <a href="mailto:security@rinawarptech.com">security@rinawarptech.com</a> for security and data handling questions.</p></div></section>
    `
  },
  {
    route: "matter-intelligence/demo",
    path: "/matter-intelligence/demo",
    page: "products",
    title: "Request a Matter Intelligence Demo | RinaWarp",
    description: "Request a RinaWarp Matter Intelligence demo to see cited answers and status memo generation for one sensitive matter workflow.",
    eyebrow: "Demo",
    heading: "See one matter workflow in action.",
    copy: "Connect Outlook and SharePoint for one matter. Ask what changed since last review. Get a cited answer and a grounded status memo draft.",
    content: `
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Request a guided demo</h2>
        <p class="section-copy">Use the live Matter Intelligence intake flow so we can scope the workflow, deployment needs, and trust questions before access is granted.</p>
        <div class="cta-row">
          <a href="/matter-intelligence/contact/" class="btn btn-primary">Request demo</a>
          <a href="/matter-intelligence/security/" class="btn btn-secondary">Review security</a>
        </div>
      </div></section>
    `
  },
  {
    route: "matter-intelligence/download",
    path: "/matter-intelligence/download",
    page: "products",
    title: "Matter Intelligence Access | RinaWarp",
    description: "Learn how guided access, onboarding, billing, and workspace setup work for RinaWarp Matter Intelligence.",
    eyebrow: "Access",
    heading: "Get access to Matter Intelligence.",
    copy: "Matter Intelligence has its own access path. It is intentionally separate from the Terminal Pro installer and billing flow.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><div class="kicker">1</div><h3>Request or buy access</h3><p>Start with guided onboarding or the live paid path we are validating for early customers.</p></article>
        <article class="card"><div class="kicker">2</div><h3>Provision workspace</h3><p>Create the workspace, confirm entitlements, and assign the right members before data connectors go live.</p></article>
        <article class="card"><div class="kicker">3</div><h3>Connect sources</h3><p>Connect Microsoft 365, create the first matter, and prove the cited-answer workflow on real data.</p></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <div class="cta-row">
          <a href="/matter-intelligence/demo/" class="btn btn-primary">Request demo</a>
          <a href="/matter-intelligence/pricing/" class="btn btn-secondary">See pricing</a>
          <a href="/matter-intelligence/contact/" class="btn btn-secondary">Talk to sales</a>
        </div>
      </div></section>
    `
  },
  {
    route: "matter-intelligence/docs",
    path: "/matter-intelligence/docs",
    page: "products",
    title: "Matter Intelligence Docs | RinaWarp",
    description: "Start with one matter, connected evidence, and a cited status memo workflow in RinaWarp Matter Intelligence.",
    eyebrow: "Docs",
    heading: "Start with one matter and one trusted workflow.",
    copy: "The launch workflow is intentionally narrow: connect the right sources, ask one matter question, and produce one grounded status memo.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><div class="kicker">1</div><h3>Connect Outlook and SharePoint</h3><p>Limit the scope to the sources needed for the first matter.</p></article>
        <article class="card"><div class="kicker">2</div><h3>Ask what changed</h3><p>Use one concrete question to prove the evidence-grounded retrieval path.</p></article>
        <article class="card"><div class="kicker">3</div><h3>Draft a status memo</h3><p>Generate a reviewer-ready draft with citations before anything leaves the workspace.</p></article>
      </div></section>
    `
  },
  {
    route: "matter-intelligence/contact",
    path: "/matter-intelligence/contact",
    page: "products",
    title: "Contact Matter Intelligence | RinaWarp",
    description: "Talk to RinaWarp about Matter Intelligence sales, onboarding, and security review.",
    eyebrow: "Contact",
    heading: "Talk to RinaWarp about Matter Intelligence.",
    copy: "Use this route for sales, onboarding, security review, and deployment questions related to Matter Intelligence. Terminal Pro support stays on the main support path.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>Sales</h3><p><a href="mailto:hello@rinawarptech.com?subject=Matter%20Intelligence%20sales">hello@rinawarptech.com</a></p></article>
        <article class="card"><h3>Security</h3><p><a href="mailto:security@rinawarptech.com?subject=Matter%20Intelligence%20security">security@rinawarptech.com</a></p></article>
        <article class="card"><h3>Onboarding</h3><p>Use demo and contact requests to scope rollout, access, and data connector setup.</p></article>
      </div></section>
    `
  },
  {
    route: "matter-intelligence/terms",
    path: "/matter-intelligence/terms",
    page: "products",
    title: "Matter Intelligence Terms | RinaWarp",
    description: "Read the product-specific terms for RinaWarp Matter Intelligence.",
    eyebrow: "Terms",
    heading: "Terms for RinaWarp Matter Intelligence.",
    copy: "These terms apply to the Matter Intelligence product line and are separate from the Terminal Pro Early Access terms.",
    content: `<section class="section"><div class="panel stack"><p>RinaWarp Matter Intelligence is provided by <strong>RinaWarp Technologies, LLC</strong> for professional use in legal, finance, compliance, and related sensitive workflows. Customers are responsible for reviewing generated outputs before relying on them.</p></div></section>`
  },
  {
    route: "matter-intelligence/privacy",
    path: "/matter-intelligence/privacy",
    page: "products",
    title: "Matter Intelligence Privacy | RinaWarp",
    description: "Read the product-specific privacy summary for RinaWarp Matter Intelligence.",
    eyebrow: "Privacy",
    heading: "Privacy for RinaWarp Matter Intelligence.",
    copy: "Matter Intelligence handles more sensitive workflows than Terminal Pro, so this page is intentionally product-specific.",
    content: `<section class="section"><div class="panel stack"><p>Depending on customer configuration, Matter Intelligence may process Outlook mail, SharePoint files, matter notes, metadata, generated summaries, and workspace activity required to produce grounded responses.</p><p>Questions about Matter Intelligence privacy can be sent to <a href="mailto:security@rinawarptech.com">security@rinawarptech.com</a>.</p></div></section>`
  },
  {
    route: "pricing",
    path: "/pricing",
    page: "pricing",
    title: "RinaWarp Terminal Pro Pricing | AI Terminal Plans",
    description: "See RinaWarp Terminal Pro pricing for individual and team plans with trusted execution, receipts, recovery, and proof-backed repair workflows.",
    eyebrow: "Pricing",
    heading: "Start fixing your projects for free.",
    copy: "Try it free. If it fixes your project, upgrade. One fix can save hours, so the next step should feel obvious.",
    content: `
      <section class="section"><div class="pricing-grid">
        <article class="card pricing-card"><span class="pill">Free</span><div class="price">$0 <span>/ month</span></div><p>Try the workflow on a broken project first. If it fixes the repo, you will know quickly.</p><ul class="feature-list"><li>Try the Fix Project workflow</li><li>Visible repair steps and proof-backed runs</li><li>Best for first-time use and simple fixes</li></ul><a href="/download/" class="btn btn-secondary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="pricing_free" data-analytics-prop-target="download">Choose installer</a></article>
        <article class="card pricing-card featured"><span class="pill">Pro</span><div class="price">$15 <span>/ month</span></div><p>Upgrade when you are blocked and want the fastest path from broken project to verified result.</p><ul class="feature-list"><li>Unlimited fixes on real projects</li><li>Trusted build, test, deploy, and repair flows</li><li>What changed, what worked, and confidence summaries</li><li>Priority support while the product keeps hardening</li></ul><div class="stack"><input id="checkout-email" type="email" placeholder="you@company.com" aria-label="Email for Pro checkout"><div class="link-row"><button class="btn btn-primary" data-checkout-cycle="monthly" type="button">Start Pro checkout</button></div><p id="checkout-status" class="status-message" aria-live="polite">Pro is $15 per month. Checkout opens in Stripe.</p></div></article>
        <article class="card pricing-card"><span class="pill">Power / Team</span><div class="price">$40 <span>/ user / month</span></div><p>For teams that want seat-based rollout, shared proof, role boundaries, and a cleaner path to fixing broken projects together.</p><ul class="feature-list"><li>Seat-based checkout and workspace rollout</li><li>Role-aware invite management and audit direction</li><li>Shared proof-backed workflows for teams</li><li>Priority support and migration help</li></ul><a href="/pricing/" class="btn btn-secondary">Start Team checkout</a></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Why people pay for Pro</h2>
        <div class="grid three-up">
          <article class="card"><div class="kicker">Unlimited</div><h3>Fix more than one repo</h3><p>Pro is for people who hit broken installs, failed builds, and config damage often enough that speed matters.</p></article>
          <article class="card"><div class="kicker">Confidence</div><h3>Trust the outcome</h3><p>The value is not only the repair. It is knowing what changed and whether the result really worked.</p></article>
          <article class="card"><div class="kicker">Support</div><h3>Get help if the edge case is rough</h3><p>Support exists so the product keeps getting better on real broken projects, not just polished demos.</p></article>
        </div>
      </div></section>
      <section class="section"><h2 class="section-title">Quick answers before you buy</h2><p class="section-copy">The practical questions people ask right before paying.</p><div class="faq-grid">
        <article class="faq-item"><h3>What happens after checkout?</h3><p>Checkout returns you to RinaWarp so you can download the app, restore access if needed, and start fixing projects immediately.</p></article>
        <article class="faq-item"><h3>How does restore work?</h3><p>Paid access is tied to your billing email. If a device loses entitlement state, use the restore path in the app or account page first.</p></article>
        <article class="faq-item"><h3>Can I cancel later?</h3><p>Yes. Billing is handled through Stripe, and the billing portal is the place to cancel, change plans, or update payment details.</p></article>
        <article class="faq-item"><h3>Why is there only one Pro button?</h3><p>The pricing page only advertises plans that are active in the current checkout catalog. If annual returns later, it should come back with a live Stripe price first.</p></article>
      </div></section>
    `
  },
  {
    route: "download",
    path: "/download",
    page: "download",
    title: "Download RinaWarp Terminal Pro | Verified AI Terminal Releases",
    description: "Download verified RinaWarp Terminal Pro releases for Linux and Windows, inspect the live manifest, and verify integrity with published checksums.",
    eyebrow: "Download",
    heading: "Fix your project in under 30 seconds.",
    copy: "Download RinaWarp and let it fix your code automatically. Open the broken repo, click Fix Project, and see the proof.",
    heroActions: `
      <a href="${PUBLIC_BETA_DEB_URL}" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_hero" data-analytics-prop-platform="linux" data-analytics-prop-artifact="deb">Download Linux .deb</a>
      <a href="${PUBLIC_BETA_APPIMAGE_URL}" class="btn btn-secondary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_hero" data-analytics-prop-platform="linux" data-analytics-prop-artifact="appimage">Download AppImage</a>
      <a href="/pricing/" class="btn btn-secondary">See pricing</a>
    `,
    heroSupport: "Use the live download routes below. Checksums and release manifests stay published so the trust story remains explicit.",
    heroProof: `
      <div class="hero-proof-item"><span class="hero-proof-label">Step 1</span><span class="hero-proof-value">Download and open the broken repo</span></div>
      <div class="hero-proof-item"><span class="hero-proof-label">Step 2</span><span class="hero-proof-value">Click Fix Project and watch the repair</span></div>
      <div class="hero-proof-item"><span class="hero-proof-label">Step 3</span><span class="hero-proof-value">Check proof, verification, and confidence</span></div>
    `,
    heroMedia: `
      <div class="screenshot-frame">
        <video controls preload="metadata" poster="${DEMO_POSTER_URL}" playsinline>
          <source src="${DEMO_WEBM_URL}" type="video/webm">
          <source src="${DEMO_MP4_URL}" type="video/mp4">
        </video>
      </div>
    `,
    content: `
      <section class="section"><div class="panel stack">
        <h2 class="section-title">How it works</h2>
        <div class="grid three-up">
          <article class="card"><div class="kicker">1</div><h3>Download</h3><p>Install the Linux public beta and open the repo that is blocking you.</p></article>
          <article class="card"><div class="kicker">2</div><h3>Open the project</h3><p>Let the app inspect the actual workspace instead of explaining the problem from memory.</p></article>
          <article class="card"><div class="kicker">3</div><h3>Click Fix Project</h3><p>Watch the repair happen, then check the proof to confirm the project is working again.</p></article>
        </div>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">See it fix a real project</h2>
        <p class="section-copy">One real RinaWarp screen is enough here. The goal is fast belief, not more clutter.</p>
        <div class="screenshot-frame"><img src="/assets/img/proof-after-fixed-project.png" alt="Project after RinaWarp repair showing verified success" width="1356" height="697" loading="lazy" decoding="async"></div>
      </div></section>
      <section class="section"><div class="download-grid">
        <article class="card platform-card"><span class="pill">Linux</span><h3>Choose your Linux path</h3><p><strong>.deb</strong> is the fastest way to get running on Debian and Ubuntu. <strong>AppImage</strong> is the better choice if you want the in-app update path later.</p><div class="link-row"><a href="${PUBLIC_BETA_DEB_URL}" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_linux" data-analytics-prop-platform="linux" data-analytics-prop-artifact="deb">Download Linux .deb</a><a href="${PUBLIC_BETA_APPIMAGE_URL}" class="btn btn-secondary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_linux" data-analytics-prop-platform="linux" data-analytics-prop-artifact="appimage">Download AppImage</a><a href="${PUBLIC_BETA_LATEST_JSON_URL}" class="btn btn-secondary">View manifest</a></div><p class="note"><strong>Update note:</strong> If you install with <code>.deb</code>, update with the next <code>.deb</code>. If you want automatic in-app updates, use AppImage and keep that as your main install.</p></article>
        <article class="card platform-card"><span class="pill">Windows</span><h3>Not in this public beta</h3><p>The current public beta release only includes Linux installers. Windows should come back once a matching <code>.exe</code> artifact is published and verified.</p><div class="link-row"><a href="/support/" class="btn btn-secondary">Ask about Windows</a></div><p class="note"><strong>Trust note:</strong> The website should not offer a Windows download until the release actually contains a Windows installer.</p></article>
        <article class="card platform-card"><span class="pill">macOS</span><h3>Coming after signing</h3><p>macOS is not live yet because we do not want to ship a rough installer path we cannot support well.</p><div class="link-row"><a href="/support/" class="btn btn-secondary">Ask about macOS</a></div></article>
      </div></section>
      <section class="section"><div class="panel stack"><div class="card trust-note"><h3>Verification matters more than vibes</h3><p>Checksums, release feeds, and honest platform notes are the trust surface on the website. If anything about the download feels inconsistent, stop and verify before running the installer.</p></div><h2 class="section-title">How to verify your download</h2><div class="link-row"><a href="${PUBLIC_BETA_CHECKSUMS_URL}" class="btn btn-secondary">Download SHASUMS256.txt</a><a href="${PUBLIC_BETA_LATEST_JSON_URL}" class="btn btn-secondary">Open latest.json</a><a href="${PUBLIC_BETA_LATEST_YML_URL}" class="btn btn-secondary">Open latest.yml</a><a href="${PUBLIC_BETA_LATEST_LINUX_YML_URL}" class="btn btn-secondary">Open latest-linux.yml</a></div><p class="section-copy">The public beta updater feed lives on the GitHub release for <code>${PUBLIC_BETA_TAG}</code>. If the checksum does not match, do not run the file. Reach out to support instead.</p></div></section>
    `
  },
  {
    route: "what-is-a-proof-first-ai-terminal",
    path: "/what-is-a-proof-first-ai-terminal",
    page: "docs",
    title: "What Is a Proof-First AI Terminal? | Definition and Meaning",
    description: "A proof-first AI terminal keeps receipts, recovery, and trust attached to execution instead of relying on opaque assistant claims alone.",
    eyebrow: "Category definition",
    heading: "What a proof-first AI terminal actually means.",
    copy: "A proof-first AI terminal is a workflow surface where AI help stays attached to evidence. Instead of only giving you an answer, it keeps the receipt, recovery path, and execution context visible when the work matters.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>More than chat</h3><p>The category is not just terminal chat. It is AI guidance plus a reliable trail of what actually happened.</p></article>
        <article class="card"><h3>Proof over confidence</h3><p>If an AI suggests a build, deploy, or fix path, a proof-first terminal keeps the evidence and recovery path attached instead of hiding them behind a polished reply.</p></article>
        <article class="card"><h3>Why developers care</h3><p>For high-impact work, developers need to trust the result, not just the tone. That is the wedge behind proof-first terminal tools.</p></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Where RinaWarp fits</h2>
        <p>RinaWarp Terminal Pro is one implementation of this idea: a proof-first AI workbench for build, test, deploy, and recovery workflows where the thread, receipts, and recovery state stay connected.</p>
        <div class="link-row">
          <a href="/what-is-rinawarp/" class="btn btn-secondary">Read the RinaWarp definition</a>
          <a href="/download/" class="btn btn-primary">Try the app</a>
        </div>
      </div></section>
    `
  },
  {
    route: "what-is-rinawarp",
    path: "/what-is-rinawarp",
    page: "docs",
    title: "What Is RinaWarp Terminal Pro? | AI Terminal Definition",
    description: "RinaWarp Terminal Pro is a proof-first AI terminal workbench for developers who want chat, receipts, recovery, and trusted execution in one place.",
    eyebrow: "Definition",
    heading: "What RinaWarp Terminal Pro actually is.",
    copy: "RinaWarp Terminal Pro is a proof-first AI terminal workbench. It lets developers talk naturally, run work through one trusted path, and keep receipts and recovery attached to the result.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>AI terminal, but not black-box</h3><p>RinaWarp is built for developers who want natural-language help without losing the proof of what happened.</p></article>
        <article class="card"><h3>Thread first, inspectors second</h3><p>The main surface is the conversation. Runs, diagnostics, and terminal detail are there when you need to inspect them.</p></article>
        <article class="card"><h3>Best fit for real build and recovery work</h3><p>The strongest use case is not generic chat. It is build, test, deploy, and recovery work where trust matters.</p></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Short definition</h2>
        <p>RinaWarp Terminal Pro is a proof-first AI workbench for developers. It combines conversational interaction with trusted execution, receipts, and recovery so work does not disappear into opaque agent claims.</p>
        <div class="link-row">
          <a href="/download/" class="btn btn-primary">Download Terminal Pro</a>
          <a href="/pricing/" class="btn btn-secondary">See pricing</a>
          <a href="/what-is-a-proof-first-ai-terminal/" class="btn btn-secondary">Define proof-first AI terminal</a>
        </div>
      </div></section>
    `
  },
  {
    route: "rinawarp-vs-ai-terminals",
    path: "/rinawarp-vs-ai-terminals",
    page: "docs",
    title: "RinaWarp vs AI Terminals | Why Proof Matters",
    description: "See how RinaWarp differs from generic AI terminals: proof-backed execution, receipts, recovery, and a clearer trust model for real developer work.",
    eyebrow: "Comparison",
    heading: "Why RinaWarp is not just another AI terminal.",
    copy: "The difference is not that RinaWarp has chat. The difference is that it keeps trust, receipts, and recovery attached to the work instead of hiding everything behind a confident answer.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>Generic AI terminals</h3><p>Often optimize for speed and novelty first. You get output, but not always a strong trail of proof or recovery.</p></article>
        <article class="card"><h3>RinaWarp Terminal Pro</h3><p>Optimizes for proof-first execution: thread continuity, run receipts, diagnostics, and recovery all stay attached to the workflow.</p></article>
        <article class="card"><h3>Why that matters</h3><p>When build, deploy, or system work goes wrong, you need evidence and next steps, not just a confident summary.</p></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">The real wedge</h2>
        <p>RinaWarp is strongest for developers and teams who distrust black-box AI. It is meant to help you act faster without making the workflow less understandable.</p>
        <div class="link-row">
          <a href="/what-is-a-proof-first-ai-terminal/" class="btn btn-secondary">Define proof-first AI terminal</a>
          <a href="/what-is-rinawarp/" class="btn btn-secondary">Read the definition</a>
          <a href="/download/" class="btn btn-primary">Try the app</a>
        </div>
      </div></section>
    `
  },
  {
    route: "rinawarp-vs-warp",
    path: "/rinawarp-vs-warp",
    page: "docs",
    title: "RinaWarp vs Warp | Proof-First AI Terminal Comparison",
    description: "Compare RinaWarp and Warp across trust, proof, recovery, and AI terminal workflow design so developers can see where RinaWarp is intentionally different.",
    eyebrow: "Comparison",
    heading: "RinaWarp vs Warp: where the product philosophy diverges.",
    copy: "This is not a claim that one terminal is universally better. It is a clearer statement of what RinaWarp is optimizing for: proof, recovery, and trusted execution instead of speed, polish, or novelty alone.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>Warp</h3><p>Warp is widely known as a modern terminal with polished UI, strong command workflows, and broad awareness in the terminal category.</p></article>
        <article class="card"><h3>RinaWarp</h3><p>RinaWarp is focused on proof-first AI execution: conversational work, run receipts, recovery, and trust signals that stay attached to real actions.</p></article>
        <article class="card"><h3>Why compare them</h3><p>People searching for AI terminals often know Warp already. This page helps explain where RinaWarp is intentionally different instead of pretending the products are identical.</p></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Where RinaWarp is strongest</h2>
        <div class="grid three-up">
          <article class="card"><div class="kicker">Trust</div><h3>Receipts stay attached</h3><p>RinaWarp keeps proof, diagnostics, and recovery tied to the conversation instead of leaving you to reconstruct what happened later.</p></article>
          <article class="card"><div class="kicker">Conversation</div><h3>Natural language stays central</h3><p>The primary workflow is ask, inspect, recover, and continue. The thread is meant to feel like a real collaborator surface, not just a command launcher.</p></article>
          <article class="card"><div class="kicker">Recovery</div><h3>Failure handling is part of the story</h3><p>When work breaks or a session restarts, RinaWarp treats recovery as a first-class surface instead of an afterthought.</p></article>
        </div>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Where Warp still has advantages</h2>
        <p>Warp has more mainstream awareness, a more established brand in the terminal category, and a broader public reputation today. RinaWarp should win by being clearer about its trust model, not by pretending that market reality does not exist.</p>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Short buyer takeaway</h2>
        <p>Choose RinaWarp when you want an AI terminal that keeps proof, receipts, and recovery attached to real work. Choose the more generic category leader when brand familiarity matters more than a proof-first workflow.</p>
        <div class="link-row">
          <a href="/download/" class="btn btn-primary">Try RinaWarp</a>
          <a href="/pricing/" class="btn btn-secondary">See pricing</a>
          <a href="/what-is-a-proof-first-ai-terminal/" class="btn btn-secondary">Define proof-first AI terminal</a>
        </div>
      </div></section>
    `
  },
  {
    route: "docs",
    path: "/docs",
    page: "docs",
    title: "RinaWarp Terminal Pro Docs | AI Terminal Guides",
    description: "Read RinaWarp Terminal Pro docs, setup guides, and proof-first AI terminal workflows for trusted execution, receipts, and recovery.",
    eyebrow: "Getting started",
    heading: "Use RinaWarp Terminal Pro like a collaborator, not a command form.",
    copy: "The desktop app is built around one simple flow: ask in the Agent surface, let Rina inspect or act, and inspect proof only when you need more detail.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><div class="kicker">1. Ask naturally</div><h3>Start in the Agent thread</h3><p>Use normal language. Rina can handle questions, vague asks, follow-ups, and real execution requests without forcing you into terminal-shaped commands.</p></article>
        <article class="card"><div class="kicker">2. Trust the route</div><h3>Execution only happens through the canonical path</h3><p>If Rina needs to build, test, deploy, fix, or inspect, the work goes through the trusted execution spine.</p></article>
        <article class="card"><div class="kicker">3. Inspect only when needed</div><h3>Runs, code, diagnostics, and terminal are inspectors</h3><p>The thread is primary. Proof is there when you need it.</p></article>
      </div></section>
    `
  },
  {
    route: "agents",
    path: "/agents",
    page: "docs",
    title: "RinaWarp Agents | Agents That Analyze and Fix Code",
    description: "Explore RinaWarp agents for deployment, diagnostics, security, and repeated code-fix workflows that help analyze and fix projects automatically.",
    eyebrow: "Agents",
    heading: "Agents that analyze and fix your code automatically.",
    copy: "These agents extend what Rina can fix inside the desktop app. Think deployment helpers, diagnostics, security, and repeated repair workflows, not abstract system architecture.",
    content: `
      <section class="section"><div class="panel stack">
        <h2 class="section-title">What agents are for</h2>
        <p class="section-copy">Agents should tie directly to outcomes: analyze the repo, diagnose the failure, run the repair workflow, and keep proof attached so the result is easier to trust.</p>
      </div></section>
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>Deployment agents</h3><p>Handle repeated deploy and environment workflows without turning every release into manual terminal archaeology.</p></article>
        <article class="card"><h3>Diagnostics agents</h3><p>Inspect failures, gather the useful context, and move the project toward a fix faster.</p></article>
        <article class="card"><h3>Security and repair agents</h3><p>Help with repeated code-fix flows where clear steps, visible changes, and proof matter.</p></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Need an agent we do not ship yet?</h2>
        <p class="section-copy">Tell us what broke and what you want Rina to fix. We are prioritizing real deploy, diagnostics, security, and code-fix workflows over random breadth.</p>
        <div class="cta-row">
          <a href="/support/" class="btn btn-primary">Request an agent</a>
          <a href="/download/" class="btn btn-secondary">Try RinaWarp now</a>
        </div>
      </div></section>
    `
  },
  {
    route: "support",
    path: "/support",
    page: "feedback",
    title: "RinaWarp Support | Help, Feedback, and Contact",
    description: "Contact RinaWarp for product support, billing help, restore issues, feedback, launch questions, and capability requests.",
    eyebrow: "Support & feedback",
    heading: "Help us fix more broken projects.",
    copy: "Tell us what broke and we’ll make it more fixable. Good reports turn directly into better fixes, better trust, and better recovery paths.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>Support</h3><p>If you are blocked on billing, restore, or launch issues, email <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>.</p></article>
        <article class="card"><h3>General contact</h3><p>For partnerships, launch questions, or founder access, email <a href="mailto:hello@rinawarptech.com">hello@rinawarptech.com</a>.</p></article>
        <article class="card"><h3>Best report format</h3><p>Tell us what was broken, what you asked Rina to do, what changed, and whether the final proof matched reality.</p></article>
      </div></section>
      <section class="section"><div class="panel stack"><h2 class="section-title">Send feedback</h2><form id="feedback-form"><label>Name<input type="text" name="name" placeholder="Your name" required></label><label>Email<input type="email" name="email" placeholder="you@rinawarptech.com" required></label><label>Topic<select name="topic"><option value="support">Support</option><option value="bug">Bug report</option><option value="billing">Billing</option><option value="team">Team plan</option><option value="feature">Feature request</option><option value="launch">Launch / partnership</option></select></label><label>Rating<select name="rating"><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Okay</option><option value="2">2 - Rough</option><option value="1">1 - Broken</option></select></label><label>Message<textarea name="message" placeholder="What happened, and what should RinaWarp Terminal Pro have done instead?" required></textarea></label><button type="submit" class="btn btn-primary">Send feedback</button><p id="feedback-status" class="status-message" aria-live="polite"></p></form></div></section>
    `
  },
  {
    route: "terms",
    path: "/terms",
    page: "legal",
    title: "RinaWarp Terms | Early Access Terms",
    description: "Read the RinaWarp Early Access terms for licensing, acceptable use, billing, and product limitations.",
    eyebrow: "Terms",
    heading: "Terms for RinaWarp Terminal Pro Early Access.",
    copy: "These terms are intentionally plain. Early Access means real software, real support, and honest boundaries while the product is still hardening.",
    content: `
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Use of the product</h2>
        <p>RinaWarp Terminal Pro is provided by <strong>RinaWarp Technologies, LLC</strong> for professional and personal workflow use. You are responsible for reviewing outputs, especially for builds, deploys, file changes, and other high-impact actions.</p>
        <p>You remain responsible for repositories, infrastructure, secrets, and release decisions. RinaWarp assists execution but does not replace human review for production-impact actions.</p>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Billing and subscriptions</h2>
        <p>Paid access is sold as an Early Access subscription through Stripe. Subscriptions renew automatically until canceled, and paid features remain available through the current paid period unless otherwise stated.</p>
        <p>If billing is canceled or payment fails, paid features may be limited or removed at the end of the applicable billing period. For billing issues, contact <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a> with your billing email.</p>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Acceptable use</h2>
        <p>Do not use the product for unlawful activity, credential theft, malware operations, unauthorized system access, or abuse of third-party systems. We may suspend access for abuse, fraud, non-payment, or security risk.</p>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Warranties, liability, and support boundaries</h2>
        <p>The product is provided “as is” and “as available” to the maximum extent allowed by law. We do not guarantee uninterrupted operation or that every suggested action is correct for your environment.</p>
        <p>To the maximum extent allowed by law, RinaWarp Technologies, LLC is not liable for indirect, incidental, special, consequential, or punitive damages, or for lost revenue, data, or goodwill from product use.</p>
        <p>Early Access support is provided on a reasonable-effort basis. We aim to be responsive and honest, but we do not promise enterprise-grade response times yet.</p>
      </div></section>
    `
  },
  {
    route: "privacy",
    path: "/privacy",
    page: "legal",
    title: "RinaWarp Privacy | Product and Website Data",
    description: "Read the RinaWarp privacy policy for website analytics, product telemetry, support data, and account information.",
    eyebrow: "Privacy",
    heading: "Privacy and product data.",
    copy: "RinaWarp should feel trustworthy not only in execution, but in how we handle purchase, support, and product data.",
    content: `
      <section class="section"><div class="panel stack">
        <h2 class="section-title">What we collect</h2>
        <p>We may collect billing information through Stripe, support and feedback submissions, website analytics, and limited product telemetry needed to understand reliability, updates, and launch issues.</p>
        <p>Desktop telemetry is intended for product health and workflow outcomes, not full repository content by default.</p>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Execution model and data flow</h2>
        <p>Terminal Pro runs commands and file operations on your machine in your local environment unless you explicitly trigger a cloud workflow.</p>
        <p>Support bundles or diagnostics are transmitted when you intentionally submit them. We use submitted diagnostics to debug issues and improve reliability.</p>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Retention and processors</h2>
        <p>We retain data for operations, legal obligations, support continuity, and abuse prevention, then delete or anonymize where practical.</p>
        <p>Stripe processes billing data. Infrastructure and analytics providers may process operational metadata on our behalf under contractual controls.</p>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Your rights and contact</h2>
        <p>You can request access, correction, or deletion of personal data we control, subject to legal and operational constraints.</p>
        <p>Questions about privacy, billing, or support can be sent to <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>.</p>
      </div></section>
    `
  },
  {
    route: "early-access",
    path: "/early-access",
    page: "legal",
    title: "RinaWarp Early Access | Release and Restore Policy",
    description: "Understand the RinaWarp Early Access policy, including release safety, restore guidance, update expectations, and current platform limits.",
    eyebrow: "Early Access policy",
    heading: "What Early Access means here.",
    copy: "Early Access should never be a vague excuse. It means the product is real, paid, and supportable, but some platform, update, and workflow edges are still being tightened in public.",
    content: `
      <section class="section"><div class="panel stack">
        <div class="card trust-note">
          <h3>Current Early Access release</h3>
          <p><strong>${VERSION}</strong> is the current public Linux release. The website download routes always point at the latest working installer for each platform, with release metadata and checksums published alongside them.</p>
        </div>
        <div class="link-row">
          <a href="/pricing/" class="btn btn-primary">See pricing</a>
          <a href="/download/" class="btn btn-secondary">Download Terminal Pro</a>
          <a href="/support/" class="btn btn-secondary">Contact support</a>
        </div>
      </div></section>
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>What is stable enough now</h3><p>Core trust, proof, recovery, and conversational workflow are real. The website download routes are tied to live release metadata so each platform can keep serving the latest verified installer.</p></article>
        <article class="card"><h3>What is still intentionally limited</h3><p>macOS is not launched yet. Windows signing is still a follow-up trust investment. Automatic updates are still being validated as a real installed-build pipeline, so manual download remains the safest default expectation until that validation is fully complete.</p></article>
        <article class="card"><h3>How billing and restore work</h3><p>Early Access access is anchored to your billing email and the restore path in the app/account flow. If access drifts, use restore first, then contact support and we can recover it from the billing record without making you guess.</p></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Refunds, cancellations, and updates</h2>
        <p>If you need help with cancellation, billing questions, or a reasonable launch-stage refund request, contact <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>. We would rather handle an issue clearly than let a billing or trust problem sit unresolved.</p>
        <p>Until the updater path is fully proven across installed builds, treat the canonical website download and published checksums as the safest release surface.</p>
      </div></section>
    `
  },
  {
    route: "login",
    path: "/login",
    page: "login",
    title: "Login | RinaWarp Terminal Pro",
    description: "Sign in to your RinaWarp account.",
    eyebrow: "Welcome back",
    heading: "Sign in to your account",
    copy: "Use your RinaWarp account to manage billing, recover access on a new device, and keep your install connected.",
    content: `<section class="section"><div class="auth-container"><div class="auth-card stack"><h2 class="section-title">Sign In</h2><form id="login-form"><label>Email<input type="email" name="email" placeholder="you@company.com" required></label><label>Password<input type="password" name="password" placeholder="Enter your password" required></label><button type="submit" class="btn btn-primary">Sign In</button><p id="login-status" class="status-message"></p></form><div class="link-row"><a class="btn btn-secondary" href="/register/">Create account</a><a class="btn btn-secondary" href="/forgot-password/">Forgot password</a></div></div></div></section>`
  },
  {
    route: "register",
    path: "/register",
    page: "register",
    title: "Register | RinaWarp Terminal Pro",
    description: "Create your RinaWarp account.",
    eyebrow: "Get started",
    heading: "Create your account",
    copy: "Create a RinaWarp account for billing access, password recovery, and future continuity features. Paid installs can still be restored by billing email today.",
    content: `<section class="section"><div class="auth-container"><div class="auth-card stack"><h2 class="section-title">Create Account</h2><form id="register-form"><label>Name (optional)<input type="text" name="name" placeholder="Your name"></label><label>Email<input type="email" name="email" placeholder="you@company.com" required></label><label>Password<input type="password" name="password" placeholder="Create a strong password" required></label><label>Confirm password<input type="password" name="confirmPassword" placeholder="Confirm password" required></label><button type="submit" class="btn btn-primary">Create Account</button><p id="register-status" class="status-message"></p></form></div></div></section>`
  },
  {
    route: "forgot-password",
    path: "/forgot-password",
    page: "forgot-password",
    title: "Forgot Password | RinaWarp Terminal Pro",
    description: "Request a password reset.",
    eyebrow: "Reset password",
    heading: "Forgot your password?",
    copy: "Enter your email and we’ll send you a link to reset your password.",
    content: `<section class="section"><div class="auth-container"><div class="auth-card stack"><h2 class="section-title">Reset Password</h2><form id="forgot-form"><label>Email<input type="email" name="email" placeholder="you@company.com" required></label><button type="submit" class="btn btn-primary">Send Reset Link</button><p id="forgot-status" class="status-message"></p></form></div></div></section>`
  },
  {
    route: "reset-password",
    path: "/reset-password",
    page: "reset-password",
    title: "Reset Password | RinaWarp Terminal Pro",
    description: "Create a new password for your RinaWarp account.",
    eyebrow: "Reset password",
    heading: "Create new password",
    copy: "Enter your new password below. Make sure it’s strong and different from previous passwords.",
    content: `<section class="section"><div class="auth-container"><div class="auth-card stack"><h2 class="section-title">New Password</h2><form id="reset-form"><label>New password<input type="password" name="password" placeholder="Create a strong password" required></label><label>Confirm password<input type="password" name="confirmPassword" placeholder="Confirm your password" required></label><button type="submit" class="btn btn-primary">Reset Password</button><p id="reset-status" class="status-message"></p></form></div></div></section>`
  },
  {
    route: "account",
    path: "/account",
    page: "account",
    title: "RinaWarp Account | Billing, Restore, and Access",
    description: "Manage your RinaWarp account, billing, restore flow, and paid access in one place.",
    eyebrow: "Account",
    heading: "Your account",
    copy: "Manage your RinaWarp Terminal Pro account, billing, restore flow, and support boundaries.",
    content: `
      <section class="section"><div class="auth-container stack">
        <div class="auth-card stack" id="account-gate" hidden>
          <h2 class="section-title">Sign in to your account</h2>
          <p class="section-copy">Use your billing email to restore paid access in the desktop app, or sign in if you already created a password.</p>
          <div class="link-row"><a href="/login/" class="btn btn-primary">Sign In</a><a href="/register/" class="btn btn-secondary">Create Account</a><a href="/early-access/" class="btn btn-secondary">Early Access Policy</a></div>
        </div>
        <div class="auth-card stack" id="account-state" hidden>
          <h2 class="section-title" id="account-name">Loading your account</h2>
          <p id="account-email" class="section-copy"></p>
          <div class="pill" id="account-tier">—</div>
          <p id="account-tier-note" class="section-copy">We verify your signed-in tier and billing state before showing live controls.</p>
          <div class="link-row"><button class="btn btn-primary" id="billing-portal-btn" type="button">Open billing portal</button><button class="btn btn-secondary" id="logout-btn" type="button">Sign out</button></div>
        </div>
        <div class="auth-card stack" id="account-referral" hidden>
          <h2 class="section-title">Invite someone who has a broken project</h2>
          <p class="section-copy">Share your link right after a win. We track started checkouts and paid conversions here so the loop is real, not hand-wavy.</p>
          <div class="pill">Referral code: <span id="account-referral-code">—</span></div>
          <label>Invite link<input id="account-invite-link" type="text" value="" readonly></label>
          <div class="link-row"><button class="btn btn-primary" id="copy-invite-link-btn" type="button">Copy invite link</button></div>
          <p id="account-referral-stats" class="section-copy">0 checkout(s) started • 0 paid conversion(s)</p>
          <p id="account-referral-status" class="status-message" aria-live="polite"></p>
        </div>
        <div class="auth-card stack" id="account-referral-admin" hidden>
          <h2 class="section-title">Referral lookup</h2>
          <p class="section-copy">Support can look up a referral code or owner email here without querying the database manually.</p>
          <form id="account-referral-admin-form" class="stack">
            <label>Referral code<input type="text" name="code" placeholder="A44K5"></label>
            <label>Owner email<input type="email" name="email" placeholder="founder@company.com"></label>
            <button class="btn btn-secondary" type="submit">Lookup referral</button>
            <p id="account-referral-admin-status" class="status-message" aria-live="polite"></p>
          </form>
          <pre id="account-referral-admin-output" class="status-message" style="white-space:pre-wrap"></pre>
        </div>
        <div class="auth-card stack" id="restore">
          <h2 class="section-title">Restore Pro access</h2>
          <p class="section-copy">Use the same billing email from checkout. This works even if your full account state has not loaded yet.</p>
          <form id="restore-form"><label>Billing email<input type="email" name="email" placeholder="Billing email used at checkout" required></label><button type="submit" class="btn btn-primary">Check restore status</button><p id="restore-status" class="status-message" aria-live="polite"></p></form>
        </div>
      </div></section>
    `
  },
  {
    route: "success",
    path: "/success/",
    page: "success",
    title: "Payment successful | RinaWarp Terminal Pro",
    description: "Your RinaWarp payment went through. Install the app, restore the paid entitlement, and get moving.",
    eyebrow: "Payment received",
    heading: "You’re through checkout. Now let’s get you into the product.",
    copy: "Stripe payment succeeded. The next step is simple: install the app, open Account inside the app, and restore the purchase with the same billing email you just used.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><div class="kicker">1. Install</div><h3>Download the app</h3><p>Install the Linux public beta: <strong>.deb</strong> for the easiest Debian/Ubuntu install, or <strong>AppImage</strong> if you want Linux in-app updates. Windows is not available in this beta.</p><div class="link-row"><a href="/download/" class="btn btn-primary">Open download page</a></div></article>
        <article class="card"><div class="kicker">2. Restore</div><h3>Use your billing email</h3><p>Open Account in the app and restore paid access using <strong data-success-email>the billing email you used at checkout</strong>.</p><div class="link-row"><a id="success-restore-link" href="/account/" class="btn btn-secondary">Open account help</a></div></article>
        <article class="card"><div class="kicker">3. Verify</div><h3>Make sure the tier shows up</h3><p>Your plan should show as <strong id="success-plan">Pro</strong>. If it does not, use billing restore or contact support.</p><div class="link-row"><a href="/support/?topic=billing" class="btn btn-secondary">Get billing help</a></div></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Checkout receipt details</h2>
        <div class="grid three-up">
          <article class="card"><div class="kicker">Billing email</div><h3 data-success-email>Waiting for checkout sync</h3><p>This will update from the Stripe session when available. Use the same billing email for restore on this or another device.</p></article>
          <article class="card"><div class="kicker">Session ID</div><h3 id="success-session-id">Waiting for checkout sync</h3><p>This appears after the success page receives the checkout session details. Keep it handy if support needs to trace the payment.</p></article>
          <article class="card"><div class="kicker">Seats / workspace</div><h3><span id="success-seats">1</span> seat(s)</h3><p>Workspace: <span id="success-workspace">Not attached during checkout</span></p></article>
        </div>
        <div class="cta-row">
          <a href="/download/" class="btn btn-primary">Download RinaWarp Terminal Pro</a>
          <a id="success-account-link" href="/account/" class="btn btn-secondary">Open account page</a>
        </div>
      </div></section>
    `
  }
];

async function writeRoute(route, html) {
  const dir = route ? path.join(outdir, route) : outdir;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html, "utf8");
}

const REDIRECTS = `
/download/linux /v1/download/linux 302
/download/linux/ /v1/download/linux 302
/download/linux/deb /v1/download/linux/deb 302
/download/linux/deb/ /v1/download/linux/deb 302
/download/checksums /v1/download/checksums 302
/download/checksums/ /v1/download/checksums 302
/downloads/terminal-pro/linux/*.AppImage /download/linux 301
/downloads/terminal-pro/linux/*.deb /download/linux/deb 301
/downloads/terminal-pro/windows/*.exe /download/ 301
/downloads /download/ 301
/downloads/ /download/ 301
/downloads/* /download/:splat 301
/terminal-pro / 301
/terminal-pro.html / 301
/contact /support/ 301
/contact.html /support/ 301
/feedback /support/ 301
/feedback/ /support/ 301
/team /pricing/ 301
/team/ /pricing/ 301
/about /products/ 301
/about/ /products/ 301
/about-rinawarp /products/ 301
/about-rinawarp/ /products/ 301
/music-video-creator /products/ 301
/music-video-creator/ /products/ 301
/affiliates.html /pricing/ 301
`.trim() + "\n";

const ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /account/
Disallow: /login/
Disallow: /register/
Disallow: /forgot-password/
Disallow: /reset-password/
Disallow: /success/

Sitemap: https://rinawarptech.com/sitemap.xml
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://rinawarptech.com/</loc></url>
  <url><loc>https://rinawarptech.com/products/</loc></url>
  <url><loc>https://rinawarptech.com/matter-intelligence/</loc></url>
  <url><loc>https://rinawarptech.com/matter-intelligence/pricing/</loc></url>
  <url><loc>https://rinawarptech.com/matter-intelligence/security/</loc></url>
  <url><loc>https://rinawarptech.com/matter-intelligence/demo/</loc></url>
  <url><loc>https://rinawarptech.com/matter-intelligence/download/</loc></url>
  <url><loc>https://rinawarptech.com/matter-intelligence/docs/</loc></url>
  <url><loc>https://rinawarptech.com/matter-intelligence/contact/</loc></url>
  <url><loc>https://rinawarptech.com/matter-intelligence/terms/</loc></url>
  <url><loc>https://rinawarptech.com/matter-intelligence/privacy/</loc></url>
  <url><loc>https://rinawarptech.com/pricing/</loc></url>
  <url><loc>https://rinawarptech.com/download/</loc></url>
  <url><loc>https://rinawarptech.com/docs/</loc></url>
  <url><loc>https://rinawarptech.com/support/</loc></url>
  <url><loc>https://rinawarptech.com/early-access/</loc></url>
  <url><loc>https://rinawarptech.com/terms/</loc></url>
  <url><loc>https://rinawarptech.com/privacy/</loc></url>
  <url><loc>https://rinawarptech.com/agents</loc></url>
</urlset>
`;

await rm(outdir, { recursive: true, force: true });
await mkdir(path.join(outdir, "assets", "img"), { recursive: true });
await writeFile(path.join(outdir, "assets", "site.css"), SITE_CSS, "utf8");
await writeFile(path.join(outdir, "assets", "site.js"), SITE_JS, "utf8");
await writeFile(path.join(outdir, "assets", "img", "rinawarp-mark.svg"), BRAND_MARK_SVG, "utf8");
await writeFile(path.join(outdir, "assets", "img", "rinawarp-logo.svg"), BRAND_MARK_SVG, "utf8");
await copyFile(BRAND_LOGO_PATH, path.join(outdir, "assets", "img", "rinawarp-logo.png"));
await copyFile(BRAND_ICON_PATH, path.join(outdir, "assets", "img", "icon.png"));
async function copyIfPresent(sourcePath, destinationPath) {
  try {
    await copyFile(sourcePath, destinationPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      console.warn(`[build:pages-site] Skipping missing asset: ${sourcePath}`);
      return;
    }
    throw error;
  }
}
for (const [filename, sourcePath] of SCREENSHOT_SOURCES) {
  await copyIfPresent(sourcePath, path.join(outdir, "assets", "img", filename));
}
await copyIfPresent(DEMO_GIF_PATH, path.join(outdir, "assets", "img", "rinawarp-demo.gif"));
await writeFile(path.join(outdir, "_redirects"), REDIRECTS, "utf8");
await writeFile(path.join(outdir, "robots.txt"), ROBOTS_TXT, "utf8");
await writeFile(path.join(outdir, "sitemap.xml"), SITEMAP_XML, "utf8");

for (const page of pages) {
  await writeRoute(page.route, shell(page));
}

console.log(`Built static Pages site: ${outdir}`);
