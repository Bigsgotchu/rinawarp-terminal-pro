import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outdir = path.join(repoRoot, "website", ".pages-dist");
const packageJson = JSON.parse(await readFile(path.join(repoRoot, "apps", "terminal-pro", "package.json"), "utf8"));

const INSTALLERS_BASE = "https://pub-58c0b2f3cc8d43fa8cf6e1d4d2dcf94b.r2.dev";
const UPDATES_BASE = "https://pub-4df343f1b4524762a4f8ad3c744653c9.r2.dev";
const PRIMARY_UPDATES_BASE = "https://rinawarptech.com/releases";
const VERSION = String(packageJson.version);
const ASSET_VERSION = "20260322-success-handoff";

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
</svg>`;

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
  min-height: 70px;
  max-width: var(--content);
  margin: 0 auto;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.logo {
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
  box-shadow: 0 0 24px rgba(98, 246, 229, 0.25);
}
.nav-links {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 0.95rem;
  color: var(--muted);
}
.nav-links a.active,
.nav-links a:hover { color: var(--text); }
main { flex: 1; }
.hero,
.section {
  max-width: var(--content);
  margin: 0 auto;
  padding: 36px 28px;
}
.hero { padding-top: 72px; }
.eyebrow, .kicker, .pill, .note, .auth-subtitle, .footer-links {
  color: var(--muted);
}
.eyebrow, .kicker, .pill {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  font-weight: 700;
}
.hero h1 {
  margin-top: 12px;
  font-size: clamp(2.1rem, 4vw, 4.2rem);
  line-height: 1.05;
  max-width: 10ch;
}
.hero-copy, .section-copy, p, li {
  color: var(--muted);
  line-height: 1.65;
  font-size: 1rem;
}
.hero-copy { max-width: 72ch; margin-top: 18px; }
.cta-row, .link-row, .stack, .signal-list, .feature-list, .auth-container, .auth-card, .panel {
  display: grid;
  gap: 14px;
}
.cta-row, .link-row { grid-auto-flow: column; justify-content: start; gap: 12px; }
.grid.three-up, .download-grid, .pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 18px;
}
.card, .panel, .auth-card, .pricing-card, .platform-card, .proof-step {
  padding: 22px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow);
}
.pricing-card.featured {
  border-color: var(--line-strong);
  background: linear-gradient(180deg, rgba(98,246,229,0.09), rgba(13,28,42,0.95));
}
.section-title { font-size: 1.5rem; margin-bottom: 10px; }
.price { font-size: 2rem; font-weight: 700; color: var(--text); }
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
  gap: 20px;
  align-items: start;
}
.transcript-demo {
  display: grid;
  gap: 14px;
  padding: 24px;
  background: linear-gradient(180deg, rgba(6, 17, 26, 0.96), rgba(10, 21, 32, 0.88));
  border: 1px solid var(--line);
  border-radius: 24px;
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
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--line);
  line-height: 1.6;
  color: #dbe9f6;
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
  padding: 14px 16px;
  border-radius: 18px;
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
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.faq-item {
  padding: 20px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.03);
}
.faq-item h3 { margin-bottom: 10px; }
.trust-note {
  border-color: rgba(251, 191, 36, 0.22);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), rgba(10, 21, 32, 0.88));
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid transparent;
  font-weight: 700;
  cursor: pointer;
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
  padding: 22px 28px 32px;
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
        const payload = await withJson(await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, tier: 'pro', billingCycle }),
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
      const payload = await withJson(await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier: 'team', seats, workspaceId }),
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
  if (planEl) planEl.textContent = tier === 'team' ? 'Team / Business' : 'Pro Early Access';
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
  const ogImage = "https://rinawarptech.com/assets/img/rinawarp-logo.svg";
  const noindexPaths = new Set(["/account", "/login", "/register", "/forgot-password", "/reset-password", "/success/"]);
  const robots = noindexPaths.has(path) ? 'noindex, nofollow' : 'index, follow';
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
  <meta property="og:site_name" content="RinaWarp Terminal Pro">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="icon" href="/assets/img/rinawarp-logo.svg" type="image/svg+xml">
  <link rel="shortcut icon" href="/assets/img/rinawarp-logo.svg" type="image/svg+xml">
  `;
}

function nav(active) {
  const items = [
    ["/", "Home", "home"],
    ["/pricing/", "Pricing", "pricing"],
    ["/team/", "Team", "team"],
    ["/download/", "Download", "download"],
    ["/docs/", "Docs", "docs"],
    ["/agents", "Packs", "agents"],
    ["/feedback/", "Support", "feedback"],
    ["/account/", "Account", "account"],
  ];
  return items
    .map(([href, label, key]) => `<a href="${href}"${active === key ? ' class="active" aria-current="page"' : ''}>${label}</a>`)
    .join("");
}

function shell({ path, page, title, description, eyebrow, heading, copy, content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${seo(path, title, description)}
  <link rel="stylesheet" href="/assets/site.css?v=${ASSET_VERSION}">
</head>
<body data-page="${page}">
  <div class="site-shell">
    <header>
      <nav aria-label="Main navigation">
        <a href="/" class="logo" aria-label="RinaWarp Terminal Pro home">
          <img class="logo-mark" src="/assets/img/rinawarp-mark.svg" alt="RinaWarp Terminal Pro logo">
          <span>RinaWarp Terminal Pro</span>
        </a>
        <div class="nav-links">${nav(page)}</div>
      </nav>
    </header>
    <main>
      <section class="hero">
        <span class="eyebrow">${eyebrow}</span>
        <h1>${heading}</h1>
        <p class="hero-copy">${copy}</p>
      </section>
      ${content}
    </main>
    <footer>
      <div class="footer-inner">
        <div>© 2026 RinaWarp Technologies, LLC. Proof-first AI workbench.</div>
        <div class="footer-links">
          <a href="/docs/">Docs</a>
          <a href="/pricing/">Pricing</a>
          <a href="/download/">Download</a>
          <a href="/feedback/">Support</a>
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
    title: "RinaWarp Terminal Pro | Proof-First AI Workbench",
    description: "Talk to Rina naturally, let her act through one trusted path, and keep proof, receipts, and recovery attached to the work.",
    eyebrow: "Proof-first agent execution",
    heading: "Talk to Rina naturally. Ship with proof.",
    copy: "RinaWarp Terminal Pro is the AI workbench for people who want an agent they can actually talk to, trust, and recover with. Ask in plain language, let Rina inspect or act through one trusted path, and keep the run ID, receipts, and output attached to the thread.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><div class="kicker">Trust</div><h3>Claims stay tied to proof</h3><p>Run IDs, receipts, tails, and recovery state stay attached to the work instead of disappearing behind agent vibes.</p></article>
        <article class="card"><div class="kicker">Conversation</div><h3>Rina handles real human input</h3><p>Vague asks, follow-ups, frustration, and mixed conversation are part of the job. Rina stays coherent and grounded.</p></article>
        <article class="card"><div class="kicker">Recovery</div><h3>Interrupted work still makes sense</h3><p>When a run is interrupted or a session restarts, restored work remains understandable and actionable.</p></article>
      </div></section>
      <section class="section"><h2 class="section-title">What the product actually looks like in use</h2><p class="section-copy">The first trust win is visual: the thread stays readable, the proof stays attached, and recovery does not hide what happened. This is the shape customers see when RinaWarp is doing real work.</p><div class="proof-demo">
        <div class="transcript-demo">
          <div class="demo-windowbar"><span class="demo-dot"></span><span class="demo-dot"></span><span class="demo-dot"></span><span>RinaWarp Terminal Pro</span></div>
          <div class="demo-chat">
            <div class="demo-message user">Build the app, show me what failed, and tell me the safest next move.</div>
            <div class="demo-message assistant">I checked the workspace, ran the build through the trusted path, and attached the proof below. The failure is in one TypeScript import, so the next move is a scoped fix instead of retrying the whole pipeline blindly.</div>
            <div class="demo-proof">
              <div class="demo-proof-header"><span>Build receipt</span><span class="demo-proof-tag">Run ID rw_8f4c1d</span></div>
              <div class="demo-proof-lines"><span>npm run build</span><span>src/main/update/updateService.ts: missing export \`publishRelease\`</span><span>receipt attached • recovery available • output tail preserved</span></div>
            </div>
          </div>
        </div>
        <div class="proof-notes">
          <div class="proof-note"><strong>Cleaner than terminal archaeology</strong><p>You do not have to reconstruct what happened from disconnected tabs, old scrollback, and a vague success claim.</p></div>
          <div class="proof-note"><strong>Best fit for build, test, deploy, and recovery</strong><p>The strongest buyer story is not generic AI chat. It is doing real work with proof that stays attached.</p></div>
          <div class="proof-note"><strong>Honest early-access boundary</strong><p>RinaWarp is strongest when you want trusted execution and understandable recovery, not when you want a magic black box.</p></div>
        </div>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">Ask → Plan → Execute → Prove → Recover</h2>
        <p class="section-copy">The promise is simple: open the app, ask for real work, let it execute through the canonical path, and inspect proof only when you need more detail.</p>
        <div class="cta-row">
          <a href="/download/" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="home_hero" data-analytics-prop-target="download">Download the app</a>
          <a href="/pricing/" class="btn btn-secondary">See plans</a>
        </div>
      </div></section>
    `
  },
  {
    route: "pricing",
    path: "/pricing",
    page: "pricing",
    title: "RinaWarp Terminal Pro Pricing | Trust, Recovery, and Execution",
    description: "Choose the RinaWarp plan that fits your workflow. Pay for proof-backed execution, recovery, and an agent-first desktop experience.",
    eyebrow: "Early Access pricing",
    heading: "Price the trust, proof, and recovery people actually use.",
    copy: "RinaWarp Terminal Pro Early Access keeps the ladder simple: a real free tier to feel the workbench, a serious Pro tier for proof-backed execution, and a Team plan that now has a live checkout path tied to seats and workspace rollout.",
    content: `
      <section class="section"><div class="pricing-grid">
        <article class="card pricing-card"><span class="pill">Free</span><div class="price">$0 <span>/ month</span></div><p>Use the shell, try the agent-first flow, and make sure the product feels real before you pay.</p><ul class="feature-list"><li>Agent-first desktop workbench</li><li>Limited chats and proof-backed runs</li><li>Core inspectors and workspace-aware proof UI</li></ul><a href="/download/" class="btn btn-secondary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="pricing_free" data-analytics-prop-target="download">Get started</a></article>
        <article class="card pricing-card featured"><span class="pill">Pro Early Access</span><div class="price">$20 <span>/ month</span></div><p>For people who want Rina to take real action, keep proof attached, recover safely, and feel like a collaborator instead of a demo.</p><ul class="feature-list"><li>Trusted build, test, deploy, and fix flows</li><li>Recovery and proof-backed summaries</li><li>Rina cards, explicit preferences, and higher limits</li><li>Priority Early Access support</li></ul><div class="stack"><input id="checkout-email" type="email" placeholder="you@company.com" aria-label="Email for Pro checkout"><div class="link-row"><button class="btn btn-primary" data-checkout-cycle="monthly" type="button">Start Monthly</button><button class="btn btn-secondary" data-checkout-cycle="annual" type="button">Start Annual</button></div><p id="checkout-status" class="status-message">Monthly: $20. Annual: $192. Checkout opens in Stripe.</p></div></article>
        <article class="card pricing-card"><span class="pill">Team / Business</span><div class="price">$49 <span>/ user / month</span></div><p>For teams that need seats, role boundaries, invite management, audit visibility, and a truth-based path from checkout into workspace rollout.</p><ul class="feature-list"><li>Seat-based checkout and workspace-linked team rollout</li><li>Role-aware invite management and audit direction</li><li>Team memory, multi-agent limits, and proof-backed workflows</li><li>Priority support and migration help</li></ul><a href="/team/" class="btn btn-secondary">Start Team</a></article>
      </div></section>
      <section class="section"><h2 class="section-title">Quick answers before you buy</h2><p class="section-copy">The best conversion copy is the honest kind. These are the practical questions people have right before they decide whether to pay.</p><div class="faq-grid">
        <article class="faq-item"><h3>What happens after checkout?</h3><p>Checkout returns you to RinaWarp, where you can download the app, sign in or restore access, and confirm the paid tier from the account surface and desktop settings.</p></article>
        <article class="faq-item"><h3>How does restore work?</h3><p>Paid access is anchored to the billing email. If a device loses entitlement state, use the restore path in the app or account page before contacting support.</p></article>
        <article class="faq-item"><h3>Can I cancel later?</h3><p>Yes. Billing is handled through Stripe, and the billing portal is the canonical place to manage cancellation, plan changes, and payment method updates.</p></article>
        <article class="faq-item"><h3>What does Early Access mean here?</h3><p>It means the product is paid and supportable today, but platform edges like signing and broader rollout are still being tightened in public rather than hidden behind vague promises.</p></article>
      </div></section>
    `
  },
  {
    route: "team",
    path: "/team",
    page: "team",
    title: "RinaWarp Team | Seat-Based Team Workbench",
    description: "RinaWarp Team gives growing teams a seat-based path to proof-backed execution, invite management, audit visibility, and workspace-aware rollout.",
    eyebrow: "Team plan",
    heading: "RinaWarp Team is seat-based, proof-backed, and ready for real rollout.",
    copy: "The Team plan is for teams that need multi-seat rollout, role boundaries, proof-backed execution, and a cleaner path from checkout to workspace administration.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><div class="kicker">Pricing</div><h3>$49 per user / month</h3><p>Team pricing is seat-based so billing, workspace limits, and invite pressure stay aligned instead of drifting apart.</p></article>
        <article class="card"><div class="kicker">Roles</div><h3>Owner, admin, and member boundaries</h3><p>The product stack already includes role-aware workspace and invite primitives, so Team maps to real behavior instead of generic account fluff.</p></article>
        <article class="card"><div class="kicker">Support</div><h3>Priority rollout help</h3><p>We still help with the first rollout, but the checkout path, invite controls, and audit surface no longer depend on founder DMs to exist.</p></article>
      </div></section>
      <section class="section"><div class="panel stack">
        <h2 class="section-title">What Team includes now</h2>
        <div class="grid three-up">
          <article class="card"><h3>Proof-backed team workflows</h3><p>Shared expectations around receipts, run proof, recovery, and safer execution than generic AI terminal tooling.</p></article>
          <article class="card"><h3>Seat and invite management</h3><p>Roles, invite flows, seat tracking, and team state already exist in the product stack and now have a direct checkout path.</p></article>
          <article class="card"><h3>Workspace audit visibility</h3><p>Workspace events and audit history are already part of the backend surface, which means Team can ship with inspectable admin behavior instead of blind trust.</p></article>
        </div>
        <form id="team-checkout-form" class="stack">
          <label>Billing email<input type="email" name="email" placeholder="team@company.com" required></label>
          <div class="link-row">
            <label>Seats<input type="number" name="seats" min="2" max="500" value="5" required></label>
            <label>Workspace ID (optional)<input type="text" name="workspaceId" placeholder="ws_..." /></label>
          </div>
          <div class="cta-row">
            <button type="submit" class="btn btn-primary">Start Team checkout</button>
            <a href="/feedback/?topic=team" class="btn btn-secondary">Talk to support first</a>
          </div>
          <p id="team-checkout-status" class="status-message">Checkout opens in Stripe and uses automatic tax based on billing address.</p>
        </form>
        <div class="cta-row">
          <a href="mailto:hello@rinawarptech.com?subject=RinaWarp%20Team%20Plan" class="btn btn-secondary">Email the founder</a>
        </div>
      </div></section>
    `
  },
  {
    route: "download",
    path: "/download",
    page: "download",
    title: "Download RinaWarp Terminal Pro | Verified Releases",
    description: "Download verified RinaWarp releases for Linux and Windows, inspect the live manifest, and verify integrity with published checksums.",
    eyebrow: "Early Access releases",
    heading: "Download RinaWarp Terminal Pro.",
    copy: "Install the desktop workbench, inspect the live release manifest, and choose the package path that matches how you want updates delivered.",
    content: `
      <section class="section"><div class="download-grid">
        <article class="card platform-card"><span class="pill">Linux</span><h3>Choose your Linux path</h3><p><strong>.deb</strong> is the recommended Debian/Ubuntu install path and is the easiest way to get running on a clean machine, but you should expect to install newer <strong>.deb</strong> packages manually. <strong>AppImage</strong> is the Linux path for <strong>in-app updates</strong>. If you want the app to check for and stage future releases inside RinaWarp, choose AppImage and keep using that install type.</p><div class="link-row"><a href="/releases/${VERSION}/RinaWarp-Terminal-Pro-${VERSION}.deb" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_linux" data-analytics-prop-platform="linux" data-analytics-prop-artifact="deb">Download Linux .deb</a><a href="/releases/${VERSION}/RinaWarp-Terminal-Pro-${VERSION}.AppImage" class="btn btn-secondary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_linux" data-analytics-prop-platform="linux" data-analytics-prop-artifact="appimage">Download AppImage</a><a href="/releases/latest.json" class="btn btn-secondary">View manifest</a></div><p class="note"><strong>Already on .deb?</strong> Update by installing the next <code>.deb</code>. <strong>Want automatic in-app updates?</strong> Switch to AppImage and keep that as your main install.</p></article>
        <article class="card platform-card"><span class="pill">Windows</span><h3>.exe installer</h3><p>Windows Early Access builds use the same release flow and are the main automatic-update path on Windows.</p><div class="link-row"><a href="/releases/${VERSION}/RinaWarp-Terminal-Pro-${VERSION}.exe" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="download_windows" data-analytics-prop-platform="windows" data-analytics-prop-artifact="exe">Download Windows</a></div><p class="note"><strong>Plain trust note:</strong> Windows signing is still a follow-up investment. Depending on your system, SmartScreen may ask for extra confirmation before the installer runs. We would rather say that directly than pretend the trust path is finished.</p></article>
        <article class="card platform-card"><span class="pill">macOS</span><h3>Coming after signing</h3><p>macOS signing is not enabled yet. We would rather say that plainly than ship a rough installer path we cannot support.</p><div class="link-row"><a href="/feedback/" class="btn btn-secondary">Ask about macOS</a></div></article>
      </div></section>
      <section class="section"><div class="panel stack"><div class="card trust-note"><h3>Verification matters more than vibes</h3><p>Checksums, release feeds, and honest platform notes are the trust surface on the website. If anything about the download feels inconsistent, stop and verify before running the installer.</p></div><h2 class="section-title">How to verify your download</h2><div class="link-row"><a href="/releases/${VERSION}/SHASUMS256.txt" class="btn btn-secondary">Download SHASUMS256.txt</a><a href="/releases/latest.json" class="btn btn-secondary">Open latest.json</a><a href="/releases/latest.yml" class="btn btn-secondary">Open latest.yml</a><a href="/releases/latest-linux.yml" class="btn btn-secondary">Open latest-linux.yml</a></div><p class="section-copy">The canonical updater feed lives on <code>rinawarptech.com/releases/*</code>. If the checksum does not match, do not run the file. Reach out to support instead.</p></div></section>
    `
  },
  {
    route: "docs",
    path: "/docs",
    page: "docs",
    title: "RinaWarp Terminal Pro Docs | Getting Started",
    description: "Learn how to use RinaWarp: start from the Agent surface, inspect proof, recover work, and understand what Rina actually did.",
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
    route: "feedback",
    path: "/feedback",
    page: "feedback",
    title: "Support & Feedback | RinaWarp Terminal Pro",
    description: "Reach the RinaWarp team with product feedback, support requests, launch questions, and capability requests.",
    eyebrow: "Support & feedback",
    heading: "Tell us what happened.",
    copy: "Launch questions, feature requests, bug reports, and capability requests are all welcome. If something broke, give us the clearest description you can and we’ll use it to tighten the product.",
    content: `
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>Support</h3><p>If you are stuck on a paid workflow or launch issue, email <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>.</p></article>
        <article class="card"><h3>General contact</h3><p>For partnership, launch, or founder access questions, email <a href="mailto:hello@rinawarptech.com">hello@rinawarptech.com</a>.</p></article>
        <article class="card"><h3>Fastest useful bug report</h3><p>Tell us what you asked Rina to do, what you expected, what actually happened, and whether a run or recovery card was visible.</p></article>
      </div></section>
      <section class="section"><div class="panel stack"><h2 class="section-title">Send feedback</h2><form id="feedback-form"><label>Name<input type="text" name="name" placeholder="Your name" required></label><label>Email<input type="email" name="email" placeholder="you@rinawarptech.com" required></label><label>Topic<select name="topic"><option value="support">Support</option><option value="bug">Bug report</option><option value="billing">Billing</option><option value="team">Team plan</option><option value="feature">Feature request</option><option value="launch">Launch / partnership</option></select></label><label>Rating<select name="rating"><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Okay</option><option value="2">2 - Rough</option><option value="1">1 - Broken</option></select></label><label>Message<textarea name="message" placeholder="What happened, and what should RinaWarp Terminal Pro have done instead?" required></textarea></label><button type="submit" class="btn btn-primary">Send feedback</button><p id="feedback-status" class="status-message"></p></form></div></section>
    `
  },
  {
    route: "terms",
    path: "/terms",
    page: "legal",
    title: "Terms | RinaWarp Terminal Pro Early Access",
    description: "Terms for RinaWarp Terminal Pro Early Access.",
    eyebrow: "Terms",
    heading: "Terms for RinaWarp Terminal Pro Early Access.",
    copy: "These terms are intentionally plain. Early Access means real software, real support, and honest boundaries while the product is still hardening.",
    content: `<section class="section"><div class="panel stack"><h2 class="section-title">Use of the product</h2><p>RinaWarp Terminal Pro is provided by <strong>RinaWarp Technologies, LLC</strong> for professional and personal workflow use. You are responsible for reviewing outputs, especially for builds, deploys, file changes, and other high-impact actions.</p><p>Paid access is currently sold as an Early Access subscription. Billing is handled through Stripe.</p><p>Early Access support is provided on a reasonable-effort basis. We aim to be responsive and honest, but we do not promise enterprise-grade response times yet.</p></div></section>`
  },
  {
    route: "privacy",
    path: "/privacy",
    page: "legal",
    title: "Privacy | RinaWarp Terminal Pro",
    description: "Privacy and product data for RinaWarp Terminal Pro.",
    eyebrow: "Privacy",
    heading: "Privacy and product data.",
    copy: "RinaWarp should feel trustworthy not only in execution, but in how we handle purchase, support, and product data.",
    content: `<section class="section"><div class="panel stack"><h2 class="section-title">What we collect</h2><p>We may collect billing information through Stripe, support and feedback submissions you send to us, and limited product telemetry needed to understand reliability, updates, and launch issues.</p><p>Questions about privacy, billing, or support can be sent to <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>.</p></div></section>`
  },
  {
    route: "early-access",
    path: "/early-access",
    page: "legal",
    title: "Early Access Policy | RinaWarp Terminal Pro",
    description: "What Early Access means for RinaWarp Terminal Pro.",
    eyebrow: "Early Access policy",
    heading: "What Early Access means here.",
    copy: "Early Access should never be a vague excuse. It means the product is real, paid, and supportable, but some platform, update, and workflow edges are still being tightened in public.",
    content: `<section class="section"><div class="grid three-up"><article class="card"><h3>What is stable enough now</h3><p>Core trust, proof, recovery, and conversational workflow are real. Linux and Windows releases are validated against clean-machine install paths.</p></article><article class="card"><h3>What is still intentionally limited</h3><p>macOS is not launched yet. Platform support is still narrower than a broad stable release. Automatic updates are still being validated as a real installed-build pipeline.</p></article><article class="card"><h3>How billing and restore work</h3><p>Early Access access is currently anchored to billing email and entitlement restore. If access drifts, support can help recover it.</p></article></div></section>`
  },
  {
    route: "login",
    path: "/login",
    page: "login",
    title: "Login | RinaWarp Terminal Pro",
    description: "Sign in to your RinaWarp account.",
    eyebrow: "Welcome back",
    heading: "Sign in to your account",
    copy: "Use your RinaWarp account to manage billing, recover access on a new device, and keep your Early Access install connected.",
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
    title: "Account | RinaWarp Terminal Pro",
    description: "Manage your RinaWarp account, billing, and Early Access restore flow.",
    eyebrow: "Account",
    heading: "Your account",
    copy: "Manage your RinaWarp Terminal Pro account, billing, restore flow, and Early Access support boundaries.",
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
        <div class="auth-card stack" id="restore">
          <h2 class="section-title">Restore Pro access</h2>
          <p class="section-copy">Use the same billing email from checkout. This works even if your full account state has not loaded yet.</p>
          <form id="restore-form"><label>Billing email<input type="email" name="email" placeholder="Billing email used at checkout" required></label><button type="submit" class="btn btn-primary">Check restore status</button><p id="restore-status" class="status-message"></p></form>
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
        <article class="card"><div class="kicker">1. Install</div><h3>Download the app</h3><p>Use the Windows installer or choose the Linux path that matches how you want updates to work: <strong>.deb</strong> for the easiest Debian/Ubuntu install, or <strong>AppImage</strong> if you want Linux in-app updates.</p><div class="link-row"><a href="/download/" class="btn btn-primary">Open download page</a></div></article>
        <article class="card"><div class="kicker">2. Restore</div><h3>Use your billing email</h3><p>Open Account in the app and restore paid access using <strong data-success-email>the billing email you used at checkout</strong>.</p><div class="link-row"><a id="success-restore-link" href="/account/" class="btn btn-secondary">Open account help</a></div></article>
        <article class="card"><div class="kicker">3. Verify</div><h3>Make sure the tier shows up</h3><p>Your plan should show as <strong id="success-plan">Pro Early Access</strong>. If it does not, use billing restore or contact support.</p><div class="link-row"><a href="/feedback/?topic=billing" class="btn btn-secondary">Get billing help</a></div></article>
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
/download/windows ${INSTALLERS_BASE}/releases/${VERSION}/RinaWarp-Terminal-Pro-${VERSION}.exe 302
/download/windows/ ${INSTALLERS_BASE}/releases/${VERSION}/RinaWarp-Terminal-Pro-${VERSION}.exe 302
/download/linux ${INSTALLERS_BASE}/releases/${VERSION}/RinaWarp-Terminal-Pro-${VERSION}.AppImage 302
/download/linux/ ${INSTALLERS_BASE}/releases/${VERSION}/RinaWarp-Terminal-Pro-${VERSION}.AppImage 302
/download/linux/deb ${INSTALLERS_BASE}/releases/${VERSION}/RinaWarp-Terminal-Pro-${VERSION}.deb 302
/download/linux/deb/ ${INSTALLERS_BASE}/releases/${VERSION}/RinaWarp-Terminal-Pro-${VERSION}.deb 302
/download/checksums ${INSTALLERS_BASE}/releases/${VERSION}/SHASUMS256.txt 302
/download/checksums/ ${INSTALLERS_BASE}/releases/${VERSION}/SHASUMS256.txt 302
/downloads /download/ 301
/downloads/ /download/ 301
/downloads/* /download/:splat 301
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
  <url><loc>https://rinawarptech.com/pricing/</loc></url>
  <url><loc>https://rinawarptech.com/team/</loc></url>
  <url><loc>https://rinawarptech.com/download/</loc></url>
  <url><loc>https://rinawarptech.com/docs/</loc></url>
  <url><loc>https://rinawarptech.com/feedback/</loc></url>
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
await writeFile(path.join(outdir, "assets", "img", "rinawarp-mark.svg"), LOGO_SVG, "utf8");
await writeFile(path.join(outdir, "assets", "img", "rinawarp-logo.svg"), LOGO_SVG, "utf8");
await writeFile(path.join(outdir, "_redirects"), REDIRECTS, "utf8");
await writeFile(path.join(outdir, "robots.txt"), ROBOTS_TXT, "utf8");
await writeFile(path.join(outdir, "sitemap.xml"), SITEMAP_XML, "utf8");

for (const page of pages) {
  await writeRoute(page.route, shell(page));
}

console.log(`Built static Pages site: ${outdir}`);
