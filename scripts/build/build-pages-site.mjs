import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEO_LANDING_PAGES, buildSeoLandingPageHtml } from "../../website/seo-landings.mjs";
import {
  ABOUT_PAGE_HTML,
  CASE_STUDIES_INDEX_HTML,
  CASE_STUDY_PAGES,
  DOCS_BODY_HTML,
  HERO_REPAIR_REPORT,
  buildCaseStudyHtml,
} from "../../website/site-shared.mjs";
import {
  PHONE_TOOLKIT_BODY_HTML,
  PHONE_TOOLKIT_DESCRIPTION,
  PHONE_TOOLKIT_TITLE,
} from "../../website/phone-toolkit-page.mjs";

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
const PUBLIC_BETA_DEB_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/RinaWarp-Terminal-Pro-${VERSION}-linux-amd64.deb`;
const PUBLIC_BETA_APPIMAGE_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/RinaWarp-Terminal-Pro-${VERSION}-linux-x86_64.AppImage`;
const PUBLIC_BETA_CHECKSUMS_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/SHASUMS256.txt`;
const PUBLIC_BETA_LATEST_JSON_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/latest.json`;
const PUBLIC_BETA_LATEST_YML_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/latest.yml`;
const PUBLIC_BETA_LATEST_LINUX_YML_URL = `${PUBLIC_BETA_DOWNLOAD_BASE}/latest-linux.yml`;
const ASSET_VERSION = "20260602-site-consistency";
const GA_MEASUREMENT_ID = "G-YGX1R0MEB6";
const SCREENSHOT_SOURCES = [
  ["agent-empty-state.png", path.join(repoRoot, "apps", "terminal-pro", "test-results", "visual-qa", "agent-empty-state.png")],
  ["agent-active-thread.png", path.join(repoRoot, "apps", "terminal-pro", "test-results", "visual-qa", "agent-active-thread.png")],
  ["diagnostics-inspector.png", path.join(repoRoot, "apps", "terminal-pro", "test-results", "visual-qa", "diagnostics-inspector.png")],
  ["settings-memory.png", path.join(repoRoot, "apps", "terminal-pro", "test-results", "visual-qa", "settings-memory.png")],
  ["proof-after-fixed-project.png", path.join(repoRoot, "output", "playwright", "rinawarp-live-after-status.png")],
  ["terminal-pro-interface.png", path.join(repoRoot, "website", "assets", "img", "terminal-pro-interface.png")],
  ["terminal-pro-agent-thread.png", path.join(repoRoot, "website", "assets", "img", "terminal-pro-agent-thread.png")],
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
  --bg: #0B0F14;
  --surface: rgba(13, 17, 23, 0.88);
  --surface-strong: #181b22;
  --surface-soft: rgba(255, 255, 255, 0.03);
  --line: rgba(148, 163, 184, 0.12);
  --line-strong: rgba(22, 212, 193, 0.25);
  --text: #F5F7FA;
  --muted: #A3B6C9;
  --accent: #FF3EA5;
  --accent-2: #16D4C5;
  --accent-warm: #FF6F61;
  --accent-blue: #7FD3FF;
  --success: #22c55e;
  --danger: #fb7185;
  --shadow: 0 30px 80px rgba(0, 0, 0, 0.42);
  --radius: 20px;
  --radius-sm: 14px;
  --content: 1200px;
}
body {
  min-height: 100vh;
  color: var(--text);
  font-family: "Inter", "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at 82% 8%, rgba(22, 212, 197, 0.1), transparent 42%),
    radial-gradient(circle at 12% 88%, rgba(255, 62, 165, 0.04), transparent 36%),
    #0B0F14;
}
a { color: inherit; text-decoration: none; }
.skip-link {
  position: absolute;
  left: 16px;
  top: -48px;
  z-index: 50;
  padding: 10px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #0B0F14;
  font-weight: 700;
  transition: top 0.2s ease;
}
.skip-link:focus-visible { top: 16px; }
.site-shell { min-height: 100vh; display: flex; flex-direction: column; }
header {
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(16px);
  background: rgba(7, 12, 18, 0.72);
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
.logo { display: inline-flex; align-items: center; gap: 0; }
.logo-wordmark { height: 30px; width: auto; object-fit: contain; }
.nav-links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 0.88rem;
  color: var(--muted);
}
.nav-links a { padding: 8px 12px; border-radius: 999px; transition: color 0.2s ease, background 0.2s ease; }
.nav-links a:hover, .nav-links a.active { color: var(--text); background: rgba(255, 255, 255, 0.05); }
.nav-links a.nav-cta { padding: 9px 14px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #0B0F14; font-weight: 700; }
.nav-links a.nav-cta:hover { color: #0B0F14; }
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
.hero h1,
.section-title {
  font-family: "Space Grotesk", "Inter", sans-serif;
}
.hero h1 {
  margin-top: 10px;
  font-size: clamp(1.85rem, 3vw, 3.2rem);
  line-height: 1.02;
  max-width: 12ch;
  letter-spacing: -0.04em;
}
.hero-terminal {
  padding: 28px;
  border-radius: var(--radius);
  border: 1px solid var(--line-strong);
  background:
    radial-gradient(circle at top right, rgba(22, 212, 197, 0.12), transparent 40%),
    linear-gradient(180deg, rgba(11, 15, 20, 0.98), rgba(14, 18, 24, 0.94));
  box-shadow: var(--shadow);
}
.hero-terminal pre {
  font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text);
  overflow-x: auto;
}
.hero-terminal .terminal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.hero-terminal .terminal-line.ok { color: #86efac; }
.hero-terminal .terminal-line.dim { color: var(--muted); opacity: 0.85; }
.how-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.step-card {
  padding: 24px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--surface);
}
.step-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  margin-bottom: 14px;
  background: rgba(22, 212, 197, 0.12);
  border: 1px solid rgba(22, 212, 197, 0.32);
  color: var(--accent-2);
}
.proof-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
.proof-item {
  padding: 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--surface-soft);
}
.proof-item.bad { border-color: rgba(251, 113, 133, 0.25); }
.proof-item.good { border-color: rgba(34, 197, 94, 0.25); }
.proof-item pre {
  margin-top: 10px;
  font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 0.84rem;
  line-height: 1.6;
  white-space: pre-wrap;
  color: #d8f3ff;
}
.section-proof { padding-top: 56px; padding-bottom: 56px; }
.section-proof .section-title { font-size: clamp(1.6rem, 3vw, 2.4rem); }
.demo-frame {
  border-radius: var(--radius);
  border: 1px solid var(--line-strong);
  overflow: hidden;
  background: #070b10;
  box-shadow: var(--shadow);
}
.demo-frame video { display: block; width: 100%; height: auto; }
.case-study { display: grid; gap: 16px; padding: 24px; border-radius: var(--radius); border: 1px solid var(--line-strong); background: var(--surface); box-shadow: var(--shadow); }
.case-study dl { display: grid; gap: 12px; font-size: 0.92rem; }
.case-study dt { color: var(--accent-2); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.case-study dd { color: var(--text); line-height: 1.55; margin: 0; }
.case-study ul { list-style: none; display: grid; gap: 6px; }
.case-study li::before { content: "→ "; color: var(--accent-2); }
.verification-list { list-style: none; display: grid; gap: 6px; font-family: "IBM Plex Mono", Consolas, monospace; font-size: 0.86rem; }
.verification-list li.ok { color: #86efac; }
.repair-report {
  padding: 20px 22px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line-strong);
  background: rgba(22, 212, 197, 0.06);
  margin-bottom: 16px;
}
.repair-report-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.repair-report-badge { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent-2); border: 1px solid var(--line-strong); padding: 4px 10px; border-radius: 999px; }
.repair-report-grid { display: grid; gap: 12px 20px; grid-template-columns: repeat(2, minmax(0, 1fr)); font-size: 0.92rem; }
.repair-report-grid dt { color: var(--muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.repair-report-grid dd { color: var(--text); font-weight: 600; }
.repair-report-span { grid-column: 1 / -1; }
.repair-report-span ul { margin: 6px 0 0; padding-left: 18px; color: var(--muted); font-weight: 400; }
.repair-report-note { margin-top: 12px; font-size: 0.86rem; color: var(--muted); }
.proof-screenshots { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.proof-screenshots figcaption { margin-top: 8px; font-size: 0.82rem; color: var(--muted); }
.download-trust-bar {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line-strong);
  background: var(--surface);
  font-size: 0.92rem;
}
.download-trust-bar a { color: var(--accent-2); text-decoration: underline; }
.use-case-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(168px, 1fr)); }
.use-case-card { padding: 14px 16px; border-radius: var(--radius-sm); border: 1px solid var(--line); background: var(--surface); font-size: 0.9rem; font-weight: 600; display: block; transition: border-color 0.2s; }
a.use-case-card:hover { border-color: var(--line-strong); color: var(--accent-2); }
.platform-status { display: grid; border-radius: var(--radius-sm); border: 1px solid var(--line-strong); overflow: hidden; background: var(--surface); }
.platform-status-row { display: flex; justify-content: space-between; gap: 16px; padding: 14px 20px; border-bottom: 1px solid var(--line); font-size: 0.95rem; }
.platform-status-row:last-child { border-bottom: 0; }
.status-available { color: var(--success); font-weight: 600; }
.status-unavailable { color: var(--muted); font-weight: 600; }
.compare-table-wrap { overflow-x: auto; }
.compare-table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
.compare-table th, .compare-table td { padding: 12px 14px; border-bottom: 1px solid var(--line); text-align: left; }
.compare-table th { color: var(--muted); }
.mark-yes { color: var(--success); font-weight: 700; }
.mark-no { color: var(--muted); }
.product-compare { display: grid; gap: 24px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.product-card { padding: 28px; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); }
.product-card.muted-product { border-style: dashed; }
.video-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.docs-nav { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
.docs-nav a { padding: 8px 12px; border-radius: 999px; border: 1px solid var(--line); font-size: 0.88rem; color: var(--muted); }
.btn-primary {
  color: #0B0F14;
  background: var(--accent);
  border-color: transparent;
}
@media (max-width: 860px) {
  .hero-layout { grid-template-columns: 1fr; }
  .hero-terminal { order: -1; }
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
[data-page="home"] .hero h1 {
  max-width: 10ch;
  font-size: clamp(2.4rem, 5vw, 4.7rem);
}
[data-page="home"] .hero-copy {
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
  [data-page="home"] .hero { padding-top: 28px; }
}

/* Bright service-site refresh inspired by polished B12-style layouts. */
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
  --accent-soft: #7ee0d8;
  --accent-2: #0f9f9a;
  --accent-warm: #ff8a5b;
  --accent-blue: #2478bf;
  --success: #147d4a;
  --danger: #b4233a;
  --shadow: 0 18px 55px rgba(16, 36, 47, 0.1);
  --radius: 14px;
  --radius-sm: 10px;
  --content: 1160px;
}

body {
  color: var(--text);
  background:
    linear-gradient(180deg, #eefafa 0, #ffffff 430px, #f7fbfc 100%);
  font-family: Inter, "Segoe UI", Arial, sans-serif;
}

header {
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(16, 36, 47, 0.08);
  box-shadow: 0 8px 30px rgba(16, 36, 47, 0.04);
}

nav {
  min-height: 76px;
}

.logo-wordmark {
  height: 34px;
}

.nav-links {
  color: #48606f;
  font-size: 0.9rem;
  font-weight: 650;
}

.nav-links a {
  border-radius: 8px;
}

.nav-links a:hover,
.nav-links a.active {
  color: var(--accent);
  background: rgba(11, 124, 131, 0.08);
}

.nav-links a.nav-cta {
  border-radius: 8px;
  background: #0b7c83;
  color: #ffffff;
  box-shadow: 0 10px 26px rgba(11, 124, 131, 0.18);
}

.nav-links a.nav-cta:hover {
  color: #ffffff;
  background: #075f66;
}

.hero,
.section {
  padding: 56px 24px;
}

[data-page="home"] .hero {
  padding-top: 76px;
  padding-bottom: 46px;
}

.hero-layout {
  grid-template-columns: minmax(0, 0.92fr) minmax(360px, 1.08fr);
  gap: 52px;
}

.hero-body {
  align-content: center;
  gap: 18px;
}

.eyebrow {
  display: none;
}

.kicker,
.pill {
  color: var(--accent);
  letter-spacing: 0.12em;
}

.hero h1,
.section-title {
  color: #10242f;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
  font-weight: 800;
  letter-spacing: -0.03em;
}

[data-page="home"] .hero h1,
.hero h1 {
  max-width: 11.5ch;
  font-size: clamp(2.75rem, 5.8vw, 5.7rem);
  line-height: 0.94;
}

.hero-copy,
[data-page="home"] .hero-copy {
  max-width: 54ch;
  color: #4d6573;
  font-size: clamp(1rem, 1.4vw, 1.2rem);
  line-height: 1.65;
}

.hero-support,
.section-copy,
p,
li {
  color: #5f7280;
  font-size: 0.98rem;
  line-height: 1.66;
}

.hero-actions,
.cta-row,
.link-row {
  gap: 12px;
}

.btn {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 0.94rem;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn-primary {
  background: #0b7c83;
  color: #ffffff;
  border-color: #0b7c83;
  box-shadow: 0 12px 28px rgba(11, 124, 131, 0.2);
}

.btn-primary:hover {
  background: #075f66;
  border-color: #075f66;
}

.btn-secondary {
  background: #ffffff;
  color: #163543;
  border-color: #c7d9de;
}

.btn-secondary:hover {
  border-color: #8fcbd0;
  box-shadow: 0 10px 24px rgba(16, 36, 47, 0.08);
}

.hero-media {
  border-radius: 18px;
  border: 1px solid rgba(150, 215, 215, 0.72);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.96), rgba(236, 250, 250, 0.9));
  box-shadow: 0 28px 70px rgba(16, 36, 47, 0.14);
}

.hero-media::before {
  background: linear-gradient(135deg, rgba(11,124,131,0.08), transparent 44%);
}

.case-study,
.card,
.panel,
.auth-card,
.pricing-card,
.platform-card,
.proof-step,
.product-card,
.repair-report,
.step-card,
.proof-item,
.faq-item,
.fit-card,
.founder-note,
.download-trust-bar,
.platform-status,
.transcript-demo {
  border: 1px solid var(--line);
  background: #ffffff;
  box-shadow: 0 14px 38px rgba(16, 36, 47, 0.07);
}

.case-study {
  padding: 20px;
}

.repair-report {
  background: #f6fcfc;
  border-color: #cde9ea;
}

.repair-report-badge {
  color: var(--accent);
  border-color: #b8e2e3;
  background: #ffffff;
}

.repair-report-grid dd,
.price,
.demo-proof-header,
.founder-note blockquote {
  color: var(--text);
}

.repair-report-span ul {
  color: var(--muted);
}

.verification-list li.ok {
  color: var(--success);
}

.screenshot-frame {
  border-color: #d9e8eb;
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(16, 36, 47, 0.08);
}

.proof-screenshots {
  grid-template-columns: 1fr;
}

.proof-screenshots figcaption {
  padding: 0 2px 2px;
  color: #667a86;
}

.section-title {
  max-width: 760px;
  margin-bottom: 12px;
  font-size: clamp(1.65rem, 3vw, 2.75rem);
  line-height: 1.08;
}

.section > .section-copy {
  max-width: 680px;
  margin-bottom: 24px;
}

.use-case-grid,
.how-grid,
.grid.three-up,
.download-grid,
.pricing-grid,
.faq-grid,
.fit-grid {
  gap: 18px;
}

.use-case-card {
  min-height: 64px;
  display: flex;
  align-items: center;
  border-radius: 10px;
  background: #ffffff;
  color: #183847;
  box-shadow: 0 10px 28px rgba(16, 36, 47, 0.05);
}

a.use-case-card:hover {
  color: var(--accent);
  border-color: #9ed9dc;
}

.step-card,
.card,
.pricing-card,
.platform-card,
.product-card,
.panel {
  padding: 24px;
}

.step-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  margin-bottom: 18px;
  background: #e8f7f7;
  border-color: #b9e5e5;
  color: #0b7c83;
  font-weight: 800;
}

.proof-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.proof-item {
  background: #ffffff;
}

.proof-item.bad {
  border-color: #f2c3c9;
}

.proof-item.good {
  border-color: #b7dfc8;
}

.proof-item pre,
.hero-terminal pre {
  color: #244453;
  background: #f3f8f9;
  border: 1px solid #d9e8eb;
  border-radius: 10px;
  padding: 12px;
}

.demo-frame {
  border-color: #cde9ea;
  background: #ffffff;
  box-shadow: 0 18px 46px rgba(16, 36, 47, 0.1);
}

.pricing-card.featured {
  border-color: #73c9cb;
  background: linear-gradient(180deg, #eafafa, #ffffff);
  transform: translateY(-8px);
}

.compare-table th,
.compare-table td {
  border-bottom-color: #dce9ec;
}

input,
textarea,
select {
  background: #ffffff;
  color: var(--text);
  border-color: #cfe0e4;
}

footer {
  margin-top: 48px;
  background: #10242f;
  border-top: 0;
  color: #d8e5e8;
}

.footer-inner,
.footer-links {
  color: #c2d1d6;
}

footer a:hover {
  color: #ffffff;
}

.skip-link {
  background: #0b7c83;
  color: #ffffff;
}

@media (max-width: 840px) {
  nav {
    min-height: auto;
    padding-top: 14px;
    padding-bottom: 14px;
  }

  .nav-links {
    width: 100%;
    gap: 6px;
  }

  .nav-links a {
    padding: 7px 9px;
  }

  .hero-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }

  .hero-body,
  .hero-media,
  .case-study,
  .screenshot-frame {
    min-width: 0;
    width: 100%;
  }

  .case-study {
    padding: 14px;
  }

  .repair-report {
    padding: 16px;
  }

  .repair-report-grid {
    grid-template-columns: 1fr;
  }

  .hero,
  .section {
    padding-top: 38px;
    padding-bottom: 38px;
  }

  [data-page="home"] .hero h1,
  .hero h1 {
    max-width: 12ch;
    font-size: clamp(2.5rem, 14vw, 4rem);
  }

  .pricing-card.featured {
    transform: none;
  }
}

/* B12 reference alignment for the homepage. */
:root {
  --b12-magenta: #f72585;
  --b12-pink: #ff3ea5;
  --b12-red: #ff6f61;
  --b12-teal: #16d4c5;
  --b12-blue: #bdefff;
  --b12-ink: #08121b;
  --b12-gray: #f1f1f1;
}

[data-page="home"] body,
body[data-page="home"] {
  background: #ffffff;
}

[data-page="home"] header {
  background: rgba(255, 255, 255, 0.96);
  border-bottom-color: rgba(16, 36, 47, 0.08);
  box-shadow: 0 8px 30px rgba(16, 36, 47, 0.04);
}

[data-page="home"] nav {
  min-height: 48px;
  max-width: 820px;
  padding: 0 18px;
}

[data-page="home"] .logo-wordmark {
  height: 22px;
}

[data-page="home"] .nav-links {
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #48606f;
}

[data-page="home"] .nav-links a {
  padding: 6px 8px;
  border-radius: 3px;
}

[data-page="home"] .nav-links a:hover,
[data-page="home"] .nav-links a.active {
  color: var(--b12-teal);
  background: rgba(11, 124, 131, 0.08);
}

[data-page="home"] .nav-links a.nav-cta {
  color: #ffffff;
  background: var(--b12-magenta);
  box-shadow: none;
}

[data-page="home"] .hero,
[data-page="home"] .section {
  max-width: 820px;
  padding: 42px 22px;
}

[data-page="home"] .hero {
  max-width: none;
  background: #ffffff;
  color: #111111;
  padding-top: 42px;
  padding-bottom: 34px;
}

[data-page="home"] .hero-layout {
  max-width: 820px;
  margin: 0 auto;
}

[data-page="home"] .hero-layout,
[data-page="home"] .split-section {
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.95fr);
  gap: 32px;
  align-items: center;
}

[data-page="home"] .hero h1 {
  max-width: 12ch;
  color: #111111;
  font-size: clamp(2.15rem, 4.8vw, 3.4rem);
  line-height: 1.08;
  letter-spacing: -0.025em;
}

[data-page="home"] .hero-copy {
  max-width: 46ch;
  color: #4d6573;
  font-size: 0.9rem;
  line-height: 1.7;
}

[data-page="home"] .btn {
  min-height: 34px;
  padding: 0 14px;
  border-radius: 4px;
  font-size: 0.74rem;
}

[data-page="home"] .btn-primary {
  background: var(--b12-magenta);
  border-color: var(--b12-magenta);
  color: #ffffff;
  box-shadow: none;
}

[data-page="home"] .btn-primary:hover {
  background: #a72fd0;
  border-color: #a72fd0;
}

[data-page="home"] .btn-secondary {
  background: #ffffff;
  border-color: #c7d9de;
  color: #163543;
}

[data-page="home"] .hero-media {
  border: 0;
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
}

[data-page="home"] .hero-media::before {
  content: none;
}

[data-page="home"] .hero-product-shot,
[data-page="home"] .split-section .screenshot-frame {
  border: 1px solid rgba(189, 239, 255, 0.28);
  border-radius: 5px;
  background: #0b1020;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.34);
}

[data-page="home"] .hero-product-shot img,
[data-page="home"] .split-section .screenshot-frame img {
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

[data-page="home"] .feature-band {
  max-width: none;
  background: var(--b12-gray);
  padding: 44px max(22px, calc((100vw - 820px) / 2 + 22px));
}

[data-page="home"] .section-title {
  margin-bottom: 10px;
  color: #111111;
  font-size: clamp(1.45rem, 2.5vw, 2rem);
  line-height: 1.18;
  letter-spacing: -0.02em;
}

[data-page="home"] .centered {
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

[data-page="home"] .section-copy.centered {
  margin-bottom: 26px;
}

.four-up {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.mini-card {
  min-height: 92px;
  padding: 18px;
  border: 1px solid #dedede;
  border-radius: 3px;
  background: #ffffff;
}

.mini-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  margin-bottom: 12px;
  border-radius: 999px;
  background: var(--b12-blue);
  color: #075f66;
  font-size: 1rem;
}

.mini-card h3,
.developer-grid h3,
.step-list h3 {
  margin-bottom: 7px;
  color: #111111;
  font-size: 0.86rem;
}

.mini-card p,
.developer-grid p,
.step-list p,
.accent-list li {
  color: #64666b;
  font-size: 0.74rem;
  line-height: 1.58;
}

.split-section {
  display: grid;
}

.step-list {
  display: grid;
  gap: 14px;
}

.step-list article {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.step-list article span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: var(--b12-magenta);
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 800;
}

.developer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 42px;
  max-width: 760px;
  margin: 30px auto 0;
  text-align: center;
}

.stack-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 18px;
}

.stack-grid article {
  display: grid;
  justify-items: center;
  gap: 8px;
}

.soft-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin: 0 auto 14px;
  border-radius: 999px;
  background: #e9faff;
  color: #0b7c83;
  font-size: 0.84rem;
  font-weight: 800;
}

.interface-section {
  grid-template-columns: minmax(0, 0.92fr) minmax(300px, 1.08fr);
}

.accent-list {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  list-style: none;
}

.accent-list li::before {
  content: "+";
  margin-right: 8px;
  color: var(--b12-teal);
  font-weight: 800;
}

[data-page="home"] .proof-section {
  max-width: 820px;
}

[data-page="home"] .proof-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

[data-page="home"] .proof-item {
  border-radius: 5px;
  box-shadow: none;
}

[data-page="home"] .proof-item.bad {
  border-color: rgba(255, 111, 97, 0.38);
  background: #fff8f6;
}

[data-page="home"] .proof-item.good {
  border-color: rgba(22, 212, 197, 0.38);
  background: #f4fffd;
}

[data-page="home"] .proof-item pre {
  background: #08121b;
  border-color: #162737;
  color: #d8f3ff;
}

.final-cta {
  max-width: none;
  display: grid;
  justify-items: center;
  text-align: center;
  background: linear-gradient(135deg, #f72585, #c23be8);
  color: #ffffff;
  padding: 52px 22px;
}

.final-cta h2 {
  color: #ffffff;
  font-size: clamp(1.7rem, 3vw, 2.35rem);
}

.final-cta p {
  color: rgba(255, 255, 255, 0.88);
}

.final-cta .cta-row {
  margin-top: 8px;
}

.btn-light {
  background: #ffffff;
  border-color: #ffffff;
  color: var(--b12-magenta);
}

.btn-outline-light {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.72);
  color: #ffffff;
}

@media (max-width: 760px) {
  [data-page="home"] nav,
  [data-page="home"] .hero,
  [data-page="home"] .section {
    max-width: 100%;
  }

  [data-page="home"] .hero-layout,
  [data-page="home"] .split-section,
  [data-page="home"] .interface-section,
  .four-up,
  .developer-grid {
    grid-template-columns: 1fr;
  }

  [data-page="home"] .proof-grid {
    grid-template-columns: 1fr;
  }

  .stack-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  [data-page="home"] .hero h1 {
    max-width: 12ch;
    font-size: clamp(2rem, 11vw, 3rem);
  }

  .developer-grid {
    gap: 24px;
  }
}

/* Shared page typography: keep secondary pages visually consistent. */
body:not([data-page="home"]) .hero {
  padding-top: 54px;
  padding-bottom: 38px;
}

body:not([data-page="home"]) .hero h1 {
  max-width: 14ch;
  font-size: clamp(2.05rem, 4.4vw, 3.45rem);
  line-height: 1.06;
  letter-spacing: -0.025em;
}

body:not([data-page="home"]) .hero-copy {
  max-width: 56ch;
  font-size: 1rem;
  line-height: 1.65;
}

body:not([data-page="home"]) .section-title {
  font-size: clamp(1.45rem, 2.55vw, 2rem);
  line-height: 1.16;
}

body:not([data-page="home"]) .section-copy,
body:not([data-page="home"]) p,
body:not([data-page="home"]) li {
  font-size: 0.96rem;
  line-height: 1.64;
}

@media (max-width: 760px) {
  body:not([data-page="home"]) .hero h1 {
    font-size: clamp(2rem, 10vw, 3rem);
  }
}
`;

const SITE_JS = `
const page = document.body.dataset.page || '';

async function trackSiteEvent(event, properties = {}) {
  const safeProperties = {
    ...properties,
    version: ${JSON.stringify(VERSION)},
    path: window.location.pathname,
    referrer: document.referrer ? 'present' : 'none',
  };
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event,
        properties: safeProperties,
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
  home: 'homepage_view',
  pricing: 'pricing_view',
  download: 'download_view',
  docs: window.location.pathname === '/docs/proof/' ? 'docs_proof_view' : '',
};

const pageViewEvent = pageViewEventMap[page];
if (pageViewEvent) {
  trackSiteEvent(pageViewEvent);
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
  document.querySelectorAll('[data-checkout-tier]')?.forEach((button) => {
    button.addEventListener('click', async () => {
      const emailInput = document.getElementById('checkout-email');
      const email = emailInput?.value?.trim();
      const tier = button.getAttribute('data-checkout-tier') || 'pro';
      if (!email) {
        setStatus('checkout-status', 'Add your email first so Stripe can create the checkout session.', 'error');
        emailInput?.focus();
        return;
      }
      setStatus('checkout-status', 'Opening secure checkout…');
      button.disabled = true;
      try {
        trackSiteEvent('checkout_click', {
          tier,
          billingCycle: 'monthly',
          placement: tier === 'team' ? 'pricing_team' : tier === 'fix' ? 'pricing_one_fix' : 'pricing_pro',
        });
        localStorage.setItem('checkout_email', email);
        localStorage.setItem('checkout_tier', tier);
        localStorage.setItem('checkout_billing_cycle', 'monthly');
        const referralCode = getReferralCode();
        const payload = await withJson(await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, tier, billingCycle: 'monthly', referralCode }),
        }));
        if (!payload.checkoutUrl) throw new Error('Checkout could not be created.');
        window.location.href = payload.checkoutUrl;
      } catch (error) {
        setStatus('checkout-status', error instanceof Error ? error.message : 'Checkout could not be created.', 'error');
        button.disabled = false;
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
      trackSiteEvent('checkout_click', {
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
  if (planEl) planEl.textContent = tier === 'team' ? 'Team' : tier === 'fix' ? 'One Fix' : 'Pro';
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

if (page === 'beta') {
  document.getElementById('beta-signup-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const message = [
      'Beta signup request',
      '',
      'OS: ' + String(data.os || ''),
      'Developer stack: ' + String(data.stack || ''),
      'Project to test with: ' + String(data.projectAvailable || ''),
      'Comfortable with unsigned builds: ' + String(data.unsignedComfort || ''),
    ].join('\\n');

    setStatus('beta-signup-status', 'Sending beta signup...');
    try {
      await withJson(await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          topic: 'beta-signup',
          rating: '5',
          message,
        }),
      }));
      form.reset();
      setStatus('beta-signup-status', 'Thanks. You are on the beta tester list.', 'success');
    } catch (error) {
      setStatus('beta-signup-status', error instanceof Error ? error.message : 'Beta signup could not be sent right now.', 'error');
    }
  });
}

if (page === 'beta-feedback') {
  document.getElementById('beta-feedback-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const message = [
      'Beta feedback report',
      '',
      'OS: ' + String(data.os || ''),
      'Artifact used: ' + String(data.artifact || ''),
      'Install success: ' + String(data.installSuccess || ''),
      'Security warning experience: ' + String(data.securityWarning || ''),
      'Workspace selected: ' + String(data.workspaceSelected || ''),
      'First proof generated: ' + String(data.firstProofGenerated || ''),
      'Time to first proof: ' + String(data.timeToFirstProof || ''),
      'Proof exported: ' + String(data.proofExported || ''),
      'Restart persistence: ' + String(data.restartPersistence || ''),
      'Safe-fix approval understood: ' + String(data.safeFixUnderstood || ''),
      'Confusing UI moments: ' + String(data.confusingMoments || ''),
      'Crashes/errors: ' + String(data.crashesErrors || ''),
      'Would use again: ' + String(data.wouldUseAgain || ''),
      'Would pay: ' + String(data.wouldPay || ''),
      'Additional notes: ' + String(data.additionalNotes || ''),
    ].join('\\n');

    setStatus('beta-feedback-status', 'Sending beta feedback...');
    try {
      await withJson(await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          topic: 'beta-feedback',
          rating: data.firstProofGenerated === 'yes' ? '5' : '3',
          message,
        }),
      }));
      form.reset();
      setStatus('beta-feedback-status', 'Thanks. Your beta feedback is in.', 'success');
    } catch (error) {
      setStatus('beta-feedback-status', error instanceof Error ? error.message : 'Beta feedback could not be sent right now.', 'error');
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
      const accountNameEl = document.getElementById('account-display-name');
      if (accountNameEl) accountNameEl.textContent = payload.user?.name || 'RinaWarp customer';
      const accountEmailEl = document.getElementById('account-email');
      if (accountEmailEl) accountEmailEl.textContent = payload.user?.email || localStorage.getItem('user_email') || '';
      if (payload.user?.email) localStorage.setItem('user_email', payload.user.email);
      try {
        const sub = await withJson(await fetch('/api/license/lookup-by-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: payload.user?.email }),
        }));
        document.getElementById('account-tier').textContent = sub.tier ? String(sub.tier).toUpperCase() : 'FREE';
        document.getElementById('account-tier-note').textContent = sub.tier ? String(sub.status || 'active').replace(/^./, (c) => c.toUpperCase()) : 'No paid subscription found';
        const billingBtn = document.getElementById('billing-portal-btn');
        const upgradeLink = document.getElementById('account-upgrade-link');
        if (billingBtn) billingBtn.hidden = !sub.tier;
        if (upgradeLink) upgradeLink.hidden = Boolean(sub.tier);
      } catch {
        document.getElementById('account-tier').textContent = 'UNKNOWN';
        document.getElementById('account-tier-note').textContent = 'No paid subscription found';
        document.getElementById('billing-portal-btn')?.setAttribute('hidden', 'hidden');
        document.getElementById('account-upgrade-link')?.removeAttribute('hidden');
      }

      try {
        const referral = await withJson(await fetch('/api/referrals/me', {
          headers: { Authorization: 'Bearer ' + token },
        }));
        document.getElementById('account-referral').hidden = false;
        document.getElementById('account-invite-link').value = referral.inviteUrl || '';
        document.getElementById('account-referral-code').textContent = referral.code || '—';
        document.getElementById('account-referral-stats').textContent =
          (referral.stats?.checkouts || 0) + ' checkouts started · ' + (referral.stats?.conversions || 0) + ' paid conversions';
      } catch {
        document.getElementById('account-referral').hidden = true;
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
    if (document.getElementById('billing-portal-btn')?.hidden) {
      window.location.href = '/pricing/';
      return;
    }
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
      setStatus('restore-status', lookup.tier ? 'Access found: ' + String(lookup.tier).toUpperCase() + '. Open Terminal Pro and restore with this billing email.' : 'No paid access was found for that billing email yet.', lookup.tier ? 'success' : 'error');
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
  const isProductsPage = normalizedPath === "/products" || normalizedPath.startsWith("/products");
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
  <meta property="og:site_name" content="RinaWarp Terminal Pro">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="theme-color" content="#f7fbfc">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <meta name="color-scheme" content="light">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="msapplication-TileColor" content="#0b7c83">
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.google.com https://www.googletagmanager.com https://static.cloudflareinsights.com; font-src 'self' https://fonts.gstatic.com;">
  <script type="application/ld+json">${structuredData}</script>
  `;
}

function buildStructuredData(path, title, description) {
  const canonical = `https://rinawarptech.com${path}`;
  const normalizedPath = path === "/" ? "/" : path.replace(/\/$/, "");
  const offerPrice = "15";
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
      "@type": "SoftwareApplication",
      name: "RinaWarp Terminal Pro",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Linux",
      url: canonical,
      description,
      publisher: {
        "@type": "Organization",
        name: "RinaWarp Technologies, LLC",
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: offerPrice,
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
    ["/products/", "Features", "products"],
    ["/phone-toolkit/", "Phone Toolkit", "phone-toolkit"],
    ["/pricing/", "Pricing", "pricing"],
    ["/download/", "Download", "download"],
    ["/docs/", "Docs", "docs"],
    ["/trust/", "Trust", "trust"],
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

function shell({ path, page, title, description, eyebrow, heading, copy, heroActions = "", heroSupport = "", heroProof = "", heroMedia = "", content, stylesheets = "" }) {
  const extraStylesheets = stylesheets ? `<link rel="stylesheet" href="${stylesheets}">` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${seo(path, title, description)}
  <link rel="stylesheet" href="/assets/site.css?v=${ASSET_VERSION}">
  ${extraStylesheets}
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
          <a href="/trust/">Trust</a>
          <a href="/case-studies/">Case studies</a>
          <a href="/fix-typescript-errors/">Fix guides</a>
          <a href="/about/">About</a>
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
    title: "Your Project Is Broken. RinaWarp Fixes It. | Terminal Pro",
    description: "RinaWarp investigates broken repositories, repairs build errors, verifies results, and explains every change.",
    eyebrow: "RinaWarp Terminal Pro",
    heading: "Your project is broken. RinaWarp fixes it.",
    copy: "Upload a repository. Let RinaWarp investigate, repair, verify, and explain every change.",
    heroActions: `
      <a href="/download/" class="btn btn-primary" data-analytics-event="download_click" data-analytics-prop-placement="home_hero" data-analytics-prop-target="download">Download Free</a>
      <a href="/#proof" class="btn btn-secondary">Watch Demo</a>
    `,
    heroMedia: `
      <div class="screenshot-frame hero-product-shot">
        <img src="/assets/img/terminal-pro-interface.png" alt="Current RinaWarp Terminal Pro interface" width="1400" height="768" loading="eager" decoding="async">
      </div>
    `,
    content: `
      <section class="section feature-band">
        <h2 class="section-title centered">What RinaWarp Can Do</h2>
        <p class="section-copy centered">Built for broken projects, failed builds, and messy dependency problems.</p>
        <div class="grid four-up">
          <article class="mini-card"><div class="mini-icon">🔍</div><h3>Analyze Repositories</h3><p>Find the dependency, config, and source errors blocking your project.</p></article>
          <article class="mini-card"><div class="mini-icon">⚡</div><h3>Repair Broken Builds</h3><p>Apply targeted fixes across files, package scripts, and project settings.</p></article>
          <article class="mini-card"><div class="mini-icon">✅</div><h3>Verify Results</h3><p>Run builds and tests so success is proven in the terminal.</p></article>
          <article class="mini-card"><div class="mini-icon">📋</div><h3>Explain Changes</h3><p>Show exactly what changed, why it changed, and how it was verified.</p></article>
        </div>
      </section>
      <section class="section split-section">
        <div class="screenshot-frame">
          <img src="/assets/img/terminal-pro-agent-thread.png" alt="RinaWarp Agent Thread with current quick actions" width="1400" height="768" loading="lazy" decoding="async">
        </div>
        <div class="step-list">
          <h2 class="section-title">Three Steps</h2>
          <article><span>1</span><div><h3>Scan</h3><p>Open the broken repo and let RinaWarp inspect the project, logs, config, and dependency state.</p></div></article>
          <article><span>2</span><div><h3>Fix</h3><p>Apply focused repairs to the files and settings that are actually causing the failure.</p></div></article>
          <article><span>3</span><div><h3>Verify</h3><p>Run the build, tests, or health checks and keep the proof attached to the repair.</p></div></article>
        </div>
      </section>
      <section id="proof" class="section proof-section">
        <h2 class="section-title centered">Before → After Repair Proof</h2>
        <p class="section-copy centered">Developers trust terminal output. Show the fix, then show the verification.</p>
        <div class="proof-grid">
          <article class="proof-item bad"><div class="kicker">Before</div><h3>React build</h3><pre>npm run build
Module not found: react-scripts</pre></article>
          <article class="proof-item good"><div class="kicker">After</div><h3>Build successful</h3><pre>Installed missing dependency
Updated package scripts
✓ Build successful</pre></article>
          <article class="proof-item bad"><div class="kicker">Before</div><h3>TypeScript</h3><pre>error TS2322
Type 'string' is not assignable</pre></article>
          <article class="proof-item good"><div class="kicker">After</div><h3>Tests passing</h3><pre>Fixed type mismatch
✓ Build successful
✓ Tests passing</pre></article>
        </div>
      </section>
      <section class="section feature-band">
        <h2 class="section-title centered">Built for Developers</h2>
        <div class="developer-grid stack-grid">
          <article><div class="soft-icon">R</div><h3>React</h3></article>
          <article><div class="soft-icon">TS</div><h3>TypeScript</h3></article>
          <article><div class="soft-icon">N</div><h3>Node</h3></article>
          <article><div class="soft-icon">Py</div><h3>Python</h3></article>
          <article><div class="soft-icon">Rs</div><h3>Rust</h3></article>
          <article><div class="soft-icon">Go</div><h3>Go</h3></article>
        </div>
      </section>
      <section class="section split-section interface-section">
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
        <div class="screenshot-frame">
          <img src="/assets/img/terminal-pro-agent-thread.png" alt="Current Terminal Pro Agent Thread interface" width="1400" height="768" loading="lazy" decoding="async">
        </div>
      </section>
      <section class="section final-cta">
        <h2>Ready to stop debugging and start shipping?</h2>
        <p>Download Terminal Pro and fix the broken project blocking your next release.</p>
        <div class="cta-row">
          <a href="/download/" class="btn btn-light" data-analytics-event="download_click" data-analytics-prop-placement="home_final" data-analytics-prop-target="download">Download Terminal Pro</a>
        </div>
      </section>
    `
  },
{
    route: "products",
    path: "/products",
    page: "products",
    title: "RinaWarp Products | Terminal Pro",
    description: "RinaWarp Terminal Pro detects, repairs, and verifies broken developer projects automatically.",
    eyebrow: "Products",
    heading: "Two products. Two audiences.",
    copy: "Terminal Pro is for developers. Phone Toolkit is for device workflows. Matter Intelligence is separate and not GA — do not mix the pitches.",
    content: `
      <section class="section"><div class="product-compare">
        <article class="product-card stack"><span class="pill">For developers</span><h2>Terminal Pro</h2><p><strong>Fixes broken repos.</strong></p><div class="link-row"><a href="/download/" class="btn btn-primary">Download Free</a><a href="/pricing/" class="btn btn-secondary">Pricing</a></div></article>
        <article class="product-card stack"><span class="pill">For device workflows</span><h2>Phone Toolkit</h2><p><strong>Professional phone tools.</strong></p><div class="link-row"><a href="/phone-toolkit/" class="btn btn-primary">Explore Phone Toolkit</a></div></article>
        <article class="product-card muted-product stack"><span class="pill">Legal &amp; compliance</span><h2>Matter Intelligence</h2><p><strong>Coming Soon</strong></p><a href="/matter-intelligence/contact" class="btn btn-secondary">Join waitlist</a></div></article>
      </div></section>
    `
  },
  {
    route: "phone-toolkit",
    path: "/phone-toolkit",
    page: "phone-toolkit",
    title: PHONE_TOOLKIT_TITLE,
    description: PHONE_TOOLKIT_DESCRIPTION,
    eyebrow: "Phone Toolkit",
    heading: "RinaWarp Phone Toolkit",
    copy: "Professional phone tools with guided workflows, clear results, and customer-first safeguards.",
    heroActions: `
      <a href="#windows" class="btn btn-primary" data-analytics-event="phone_toolkit_download_click">Get Phone Toolkit for Windows</a>
      <a href="#capabilities" class="btn btn-secondary">Explore capabilities</a>
    `,
    heroMedia: `
      <div class="screenshot-frame">
        <img src="/assets/img/phone-toolkit/hero-brand-board.webp" alt="RinaWarp Phone Toolkit branding" width="1536" height="1024" loading="eager" decoding="async">
      </div>
    `,
    stylesheets: "/assets/phone-toolkit.css",
    content: PHONE_TOOLKIT_BODY_HTML
  },
  {
    route: "beta",
    path: "/beta",
    page: "beta",
    title: "Join the RinaWarp Terminal Pro Beta | RinaWarp",
    description: "Join the RinaWarp Terminal Pro v1.8.2 beta for a conversational AI workbench with memory, controlled execution, and proof-backed runs.",
    eyebrow: "Terminal Pro beta",
    heading: "Join the RinaWarp Terminal Pro Beta",
    copy: "RinaWarp Terminal Pro is a conversational AI workbench for real developer work with memory, controlled execution, and proof attached to every meaningful run.",
    heroActions: `
      <a href="#signup" class="btn btn-primary">Apply to test</a>
      <a href="/docs/" class="btn btn-secondary">Read tester docs</a>
    `,
    heroSupport: "Linux is production-candidate validated. macOS and Windows are unsigned beta previews.",
    content: `
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
            <label>Name
              <input type="text" name="name" placeholder="Your name" required>
            </label>
            <label>Email
              <input type="email" name="email" placeholder="you@company.com" required>
            </label>
            <label>OS
              <select name="os" required>
                <option value="">Choose one</option>
                <option value="linux">Linux</option>
                <option value="macos">macOS</option>
                <option value="windows">Windows</option>
                <option value="multiple">Multiple platforms</option>
              </select>
            </label>
            <label>Developer stack
              <input type="text" name="stack" placeholder="Node/TypeScript, Python, Go, Rust, monorepo..." required>
            </label>
            <label>Do you have a project to test with?
              <select name="projectAvailable" required>
                <option value="">Choose one</option>
                <option value="yes-real-project">Yes, a real project</option>
                <option value="yes-broken-project">Yes, a broken project</option>
                <option value="sample-project">Only a sample project</option>
                <option value="not-yet">Not yet</option>
              </select>
            </label>
            <label>Are you comfortable testing unsigned beta builds?
              <select name="unsignedComfort" required>
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
  },
  {
    route: "beta-feedback",
    path: "/beta-feedback",
    page: "beta-feedback",
    title: "RinaWarp Beta Feedback | Terminal Pro",
    description: "Submit structured RinaWarp Terminal Pro beta feedback covering install, first proof, proof export, persistence, safe-fix approval, and use/pay signal.",
    eyebrow: "Beta feedback",
    heading: "Tell us if Terminal Pro reached first proof.",
    copy: "This form is for beta testers after they install RinaWarp Terminal Pro, select a workspace, run the first proof-backed workflow, and try the safe-fix approval path.",
    heroActions: `
      <a href="#feedback" class="btn btn-primary">Submit feedback</a>
      <a href="/beta/" class="btn btn-secondary">Join beta</a>
    `,
    heroSupport: "Do not include secrets, tokens, private keys, raw source code, private terminal output, or confidential file contents.",
    content: `
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
            <label>Name
              <input type="text" name="name" placeholder="Your name" required>
            </label>
            <label>Email
              <input type="email" name="email" placeholder="you@company.com" required>
            </label>
            <label>OS
              <select name="os" required>
                <option value="">Choose one</option>
                <option value="linux">Linux</option>
                <option value="macos">macOS</option>
                <option value="windows">Windows</option>
                <option value="multiple">Multiple platforms</option>
              </select>
            </label>
            <label>Artifact used
              <input type="text" name="artifact" placeholder="AppImage, deb, macOS DMG, macOS ZIP, Windows installer" required>
            </label>
            <label>Install success
              <select name="installSuccess" required>
                <option value="">Choose one</option>
                <option value="yes">Yes</option>
                <option value="with-help">Yes, with help</option>
                <option value="blocked">No, blocked</option>
              </select>
            </label>
            <label>Security warning experience
              <textarea name="securityWarning" placeholder="Gatekeeper, SmartScreen, Linux permission prompt, or no warning" required></textarea>
            </label>
            <label>Workspace selected
              <select name="workspaceSelected" required>
                <option value="">Choose one</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>First proof generated
              <select name="firstProofGenerated" required>
                <option value="">Choose one</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>Time to first proof
              <input type="text" name="timeToFirstProof" placeholder="Example: 4 minutes, or blocked before proof" required>
            </label>
            <label>Proof exported
              <select name="proofExported" required>
                <option value="">Choose one</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="not-found">Could not find export</option>
              </select>
            </label>
            <label>Restart persistence
              <select name="restartPersistence" required>
                <option value="">Choose one</option>
                <option value="worked">Worked</option>
                <option value="partial">Partially worked</option>
                <option value="failed">Failed</option>
                <option value="not-tested">Not tested</option>
              </select>
            </label>
            <label>Safe-fix approval understood
              <select name="safeFixUnderstood" required>
                <option value="">Choose one</option>
                <option value="yes">Yes</option>
                <option value="mostly">Mostly</option>
                <option value="no">No</option>
                <option value="not-tested">Not tested</option>
              </select>
            </label>
            <label>Confusing UI moments
              <textarea name="confusingMoments" placeholder="What slowed you down or made you uncertain?"></textarea>
            </label>
            <label>Crashes/errors
              <textarea name="crashesErrors" placeholder="What happened? Do not paste private logs or source code."></textarea>
            </label>
            <label>Would use again
              <select name="wouldUseAgain" required>
                <option value="">Choose one</option>
                <option value="yes">Yes</option>
                <option value="maybe">Maybe</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>Would pay
              <select name="wouldPay" required>
                <option value="">Choose one</option>
                <option value="yes">Yes</option>
                <option value="maybe">Maybe</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>Additional notes
              <textarea name="additionalNotes" placeholder="Anything else we should know?"></textarea>
            </label>
            <button type="submit" class="btn btn-primary">Send beta feedback</button>
            <p id="beta-feedback-status" class="status-message" aria-live="polite"></p>
          </form>
        </div>
      </section>
    `
  },
   {
     route: "pricing",
    path: "/pricing",
    page: "pricing",
    title: "RinaWarp Terminal Pro Pricing | AI Terminal Plans",
    description: "See RinaWarp Terminal Pro pricing for Free, One Fix, Pro, Team, and Enterprise access mapped to repair, verification, proof export, and team controls.",
    eyebrow: "Pricing",
    heading: "Plans mapped to real product access.",
    copy: "Choose the level of repair, verification, and team control you need. Pricing stays focused on buying RinaWarp, not repeating the whole product tour.",
    content: `
      <section class="section"><div class="pricing-grid">
        <article class="card pricing-card"><span class="pill">Free</span><div class="price">$0 <span>/ month</span></div><p>Evaluate RinaWarp on a broken project before you pay.</p><ul class="feature-list"><li>Chat with Rina</li><li>Inspect workspace</li><li>Limited build/test runs</li><li>Local memory</li><li>Limited proof history</li></ul><a href="/download/" class="btn btn-secondary" data-analytics-event="download_click" data-analytics-prop-placement="pricing_free" data-analytics-prop-target="download">Start free</a></article>
        <article class="card pricing-card"><span class="pill">One Fix</span><div class="price">$3 <span>/ repair</span></div><p>Use one approval-gated repair when a single project is blocking you.</p><ul class="feature-list"><li>One approval-gated repair</li><li>Verification run</li><li>Proof export</li></ul><button class="btn btn-secondary" data-checkout-tier="fix" type="button">Buy One Fix — $3</button></article>
        <article class="card pricing-card featured"><span class="pill">Pro</span><div class="price">$15 <span>/ month</span></div><p>For individual developers who want ongoing proof-backed repair work.</p><ul class="feature-list"><li>Unlimited local proof-backed runs</li><li>Safe mutation approvals</li><li>Marketplace packs</li><li>Proof export</li><li>Local memory</li><li>Priority updates</li></ul><button class="btn btn-primary" data-checkout-tier="pro" type="button">Start Pro — $15/mo</button></article>
        <article class="card pricing-card"><span class="pill">Team</span><div class="price">$40 <span>/ user / month</span></div><p>Seat-based checkout for teams that need shared controls.</p><ul class="feature-list"><li>Team seats</li><li>Shared policy controls</li><li>Shared project memory later</li><li>Admin controls</li><li>Shared proof history</li></ul><button class="btn btn-secondary" data-checkout-tier="team" type="button">Start Team — $40/user/mo</button></article>
      </div></section>
      <section class="section"><article class="panel stack"><h2 class="section-title">Secure checkout</h2><p class="section-copy">Enter the email that should own the license, then choose One Fix, Pro, or Team.</p><input id="checkout-email" type="email" placeholder="you@company.com" aria-label="Email for checkout"><p id="checkout-status" class="status-message" aria-live="polite">One Fix is $3. Pro is $15/month. Team is $40/user/month. Checkout opens in Stripe.</p></article></section>
      <section class="section"><div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>Feature</th><th>Free</th><th>One Fix</th><th>Pro</th><th>Team</th></tr></thead><tbody><tr><td>Workspace inspection</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td></tr><tr><td>Approval-gated repair</td><td class="mark-no">Limited</td><td class="mark-yes">1</td><td class="mark-yes">Unlimited</td><td class="mark-yes">Unlimited</td></tr><tr><td>Verification and proof export</td><td class="mark-no">Limited</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td></tr><tr><td>Marketplace packs</td><td class="mark-no">—</td><td class="mark-no">—</td><td class="mark-yes">✓</td><td class="mark-yes">✓</td></tr><tr><td>Shared policy controls</td><td class="mark-no">—</td><td class="mark-no">—</td><td class="mark-no">—</td><td class="mark-yes">✓</td></tr></tbody></table></div></section>
      <section class="section"><article class="panel stack"><span class="pill">Enterprise</span><h2 class="section-title">Need enterprise controls?</h2><p class="section-copy">Enterprise adds SSO/SAML, custom model or BYOK options, audit logs, admin command policies, private marketplace access, and data retention controls.</p><a href="/support/" class="btn btn-secondary">Contact support</a></article></section>
      <section class="section"><h2 class="section-title">Quick answers before you buy</h2><p class="section-copy">The practical questions people ask right before paying.</p><div class="faq-grid">
        <article class="faq-item"><h3>Which plan should I choose?</h3><p>Start with Free if you are evaluating one project. Choose Pro for ongoing individual repair work. Choose Team when multiple developers need seats.</p></article>
        <article class="faq-item"><h3>Is there a one-time option?</h3><p>Yes. One Fix is a single paid repair attempt without a subscription, meant for one-off blocked projects.</p></article>
        <article class="faq-item"><h3>Can I cancel later?</h3><p>Yes. Subscription billing is handled through Stripe and cancellation is available after purchase.</p></article>
        <article class="faq-item"><h3>What has to work before access is production-grade?</h3><p>Paid access depends on Stripe webhook signature verification, secure sessions, entitlement refresh, and license checks that do not fall back to a development user.</p></article>
      </div></section>
    `
  },
  {
    route: "download",
    path: "/download",
    page: "download",
    title: "Download RinaWarp Terminal Pro | Verified AI Terminal Releases",
    description: "Download RinaWarp Terminal Pro for Linux (.deb and AppImage). Verify SHA256 checksums before install. Windows and macOS are not in this public beta.",
    eyebrow: "Download",
    heading: "Download RinaWarp Terminal Pro.",
    copy: "Get the current Linux public beta, verify the checksum, and install Terminal Pro.",
    heroActions: `
      <a href="${PUBLIC_BETA_DEB_URL}" class="btn btn-primary" data-analytics-event="download_click" data-analytics-prop-placement="download_hero" data-analytics-prop-platform="linux" data-analytics-prop-artifact="deb">Download Linux .deb</a>
      <a href="${PUBLIC_BETA_APPIMAGE_URL}" class="btn btn-secondary" data-analytics-event="download_click" data-analytics-prop-placement="download_hero" data-analytics-prop-platform="linux" data-analytics-prop-artifact="appimage">Download AppImage</a>
    `,
    heroSupport: `Version ${VERSION} · Linux only in this public beta · <a href="${PUBLIC_BETA_CHECKSUMS_URL}">Verify SHA256</a>`,
    heroMedia: `
      <div class="screenshot-frame">
        <img src="/assets/img/terminal-pro-interface.png" alt="Current RinaWarp Terminal Pro interface after install" loading="eager" decoding="async">
      </div>
    `,
    content: `
      <section class="section">
        <h2 class="section-title">Current release — platform availability</h2>
        <div class="platform-status">
          <div class="platform-status-row"><span>Linux</span><span class="status-available">Available (.deb + AppImage)</span></div>
          <div class="platform-status-row"><span>Windows</span><span class="status-unavailable">Not in this beta</span></div>
          <div class="platform-status-row"><span>macOS</span><span class="status-unavailable">Coming after signing</span></div>
        </div>
      </section>
      <section class="section"><div class="download-grid">
        <article class="card platform-card"><span class="pill">Linux .deb</span><h3>Debian and Ubuntu</h3><p>Use the <code>.deb</code> for the simplest manual install path on Debian or Ubuntu desktops. Update later by installing the next published <code>.deb</code>.</p></article>
        <article class="card platform-card"><span class="pill">Linux AppImage</span><h3>Portable Linux install</h3><p>Use AppImage when you want a portable Linux app path and future in-app update behavior.</p></article>
        <article class="card platform-card"><span class="pill">Windows</span><h3>Not in this public beta</h3><p>The current public beta release only includes Linux installers. Windows should come back once a matching <code>.exe</code> artifact is published and verified.</p><div class="link-row"><a href="/support/" class="btn btn-secondary">Ask about Windows</a></div><p class="note"><strong>Trust note:</strong> The website should not offer a Windows download until the release actually contains a Windows installer.</p></article>
        <article class="card platform-card"><span class="pill">macOS</span><h3>Coming after signing</h3><p>macOS is not live yet because we do not want to ship a rough installer path we cannot support well.</p><div class="link-row"><a href="/support/" class="btn btn-secondary">Ask about macOS</a></div></article>
      </div></section>
      <section class="section"><div class="panel stack"><h2 class="section-title">System requirements</h2><ul class="signal-list"><li>Linux desktop environment for this public beta</li><li>Debian/Ubuntu for the <code>.deb</code> installer, or AppImage-capable Linux desktop</li><li>4 GB RAM minimum; 8 GB+ recommended for large repositories</li><li>Git and your project package manager available in PATH</li></ul></div></section>
      <section class="section"><div class="panel stack"><h2 class="section-title">Install instructions</h2><ol class="signal-list"><li>Download the Linux <code>.deb</code> or AppImage.</li><li>Open <a href="${PUBLIC_BETA_CHECKSUMS_URL}">SHASUMS256.txt</a> and verify the file hash.</li><li>Install the <code>.deb</code> on Debian/Ubuntu, or mark the AppImage executable and run it.</li><li>Open your repository folder in Terminal Pro.</li></ol></div></section>
      <section class="section"><div class="panel stack"><h2 class="section-title">Checksums and release metadata</h2><div class="link-row"><a href="${PUBLIC_BETA_CHECKSUMS_URL}" class="btn btn-secondary">Download SHASUMS256.txt</a><a href="${PUBLIC_BETA_LATEST_JSON_URL}" class="btn btn-secondary">Open latest.json</a><a href="${PUBLIC_BETA_LATEST_YML_URL}" class="btn btn-secondary">Open latest.yml</a><a href="${PUBLIC_BETA_LATEST_LINUX_YML_URL}" class="btn btn-secondary">Open latest-linux.yml</a></div><p class="section-copy">If the checksum does not match, do not run the installer. Contact support before continuing.</p></div></section>
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
    route: "trust",
    path: "/trust",
    page: "trust",
    title: "RinaWarp Trust & Safety | Local-First Proof-Backed AI Workbench",
    description: "Learn how RinaWarp handles local execution, approval-gated repairs, rollback, proof, privacy-safe telemetry, marketplace permissions, and current platform readiness.",
    eyebrow: "Trust & Safety",
    heading: "How RinaWarp keeps developer work inspectable.",
    copy: "RinaWarp is built for real repositories, real commands, and real verification. The product should show what it inspected, ask before high-impact changes, and keep proof attached to every repair.",
    heroActions: `
      <a href="/download/" class="btn btn-primary">Download Terminal Pro</a>
      <a href="/docs/" class="btn btn-secondary">Read docs</a>
    `,
    content: `
      <section class="section"><article class="panel stack">
        <span class="pill">Current production status</span>
        <h2 class="section-title">Linux production candidate. macOS and Windows pending.</h2>
        <p class="section-copy">The current public release is available for Linux as a checksum-verified .deb and AppImage. macOS and Windows are pending signed, notarized, and smoke-tested installers before they return to the download page.</p>
      </article></section>
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>Local-first execution</h3><p>RinaWarp runs developer work from the selected workspace and keeps repository inspection tied to the local project context.</p></article>
        <article class="card"><h3>Workspace boundaries</h3><p>Repairs should stay scoped to the project you opened. High-impact actions must be visible before they run.</p></article>
        <article class="card"><h3>Approval before mutation</h3><p>File changes, install steps, and risky commands should require clear approval instead of happening silently.</p></article>
      </div></section>
      <section class="section"><div class="grid three-up">
        <article class="card"><h3>Rollback and recovery</h3><p>Repair work should preserve a recovery path so developers can understand and undo changes when a fix is not right.</p></article>
        <article class="card"><h3>Proof-backed results</h3><p>Build, test, and health-check output should stay attached to the repair so success is evidence-based.</p></article>
        <article class="card"><h3>Secret redaction</h3><p>Logs and telemetry should avoid secrets, tokens, file contents, command output, and private paths unless they are safely redacted or hashed.</p></article>
      </div></section>
      <section class="section"><div class="grid two-up">
        <article class="panel stack"><h2 class="section-title">Memory and data controls</h2><p>Local memory should help RinaWarp remember project context without turning private code into a public profile. Cloud sync is optional, not the default. Developers should be able to export or delete saved memory.</p></article>
        <article class="panel stack"><h2 class="section-title">Marketplace permissions</h2><p>Capability packs need a manifest, publisher, version, permissions, risk level, install approval, disable control, changelog, and proof of what ran. Packs should not bypass Agent Thread, policy, execution, verification, and proof.</p></article>
      </div></section>
      <section class="section"><div class="grid two-up">
        <article class="panel stack"><h2 class="section-title">Download verification</h2><p>Installers are linked through public release metadata and checksums. If the SHA256 checksum does not match the published file, do not run the installer.</p><a href="/download/" class="btn btn-secondary">Verify downloads</a></article>
        <article class="panel stack"><h2 class="section-title">Privacy-safe telemetry</h2><p>RinaWarp should measure activation events like install, first launch, first scan, first proof, fix approval, proof export, marketplace install, memory saved, memory cleared, and crash report creation. It should not collect source files, terminal output, secrets, tokens, or private paths.</p><a href="/privacy/" class="btn btn-secondary">Read privacy policy</a></article>
      </div></section>
    `
  },
  {
    route: "docs",
    path: "/docs",
    page: "docs",
    title: "RinaWarp Terminal Pro Docs | Installation & First Repair",
    description: "Install RinaWarp Terminal Pro, run your first Fix Project repair, and learn permissions, safety, and troubleshooting.",
    eyebrow: "Documentation",
    heading: "RinaWarp Terminal Pro docs",
    copy: "Install, run your first repair, and understand permissions, safety, and troubleshooting.",
    content: DOCS_BODY_HTML
  },
  {
    route: "docs/proof",
    path: "/docs/proof",
    page: "docs",
    title: "Proof Workflow | RinaWarp Terminal Pro",
    description: "Observe → Plan → Approve → Execute → Proof: The proof-first AI copilot workflow for real developer work.",
    eyebrow: "Proof workflow",
    heading: "Observe → Plan → Approve → Execute → Proof",
    copy: "The proof-first AI copilot for real computer work. Nothing executes without approval.",
    content: `
      <section class="section">
        <article class="panel stack">
          <h2 class="section-title">The proof-first workflow</h2>
          <p>RinaWarp Terminal Pro follows a deliberate workflow designed for trust and verification.</p>
          <div class="proof-step">
            <strong>Step 1: Observe</strong>
            <p>Open a project. Rina reads the codebase, configuration, logs, and runtime state. Workspace Knowledge comes from observation and verified proof.</p>
          </div>
          <div class="proof-step">
            <strong>Step 2: Plan</strong>
            <p>Review proposed changes and commands. Nothing executes until you approve. High-impact actions require explicit approval.</p>
          </div>
          <div class="proof-step">
            <strong>Step 3: Approve</strong>
            <p>Confirm the plan before execution. Safe changes can auto-apply on paid tiers, but high-impact actions always pause for approval.</p>
          </div>
          <div class="proof-step">
            <strong>Step 4: Execute</strong>
            <p>Commands run in your project context. All output is captured and attached to the action.</p>
          </div>
          <div class="proof-step">
            <strong>Step 5: Proof</strong>
            <p>Verification output shows success or failure. Build exit code 0, tests passing, health checks green — all attached as evidence.</p>
          </div>
        </article>
      </section>

      <section class="section">
        <div class="grid two-up">
          <article class="panel stack">
            <h2 class="section-title">Trust signals</h2>
            <ul class="signal-list">
              <li><strong>Nothing executes without approval</strong> — All changes are visible and approved before they run.</li>
              <li><strong>Commands visible before execution</strong> — Every command appears in the Agent Thread before running.</li>
              <li><strong>Proof from runtime evidence</strong> — Build and test output stays attached to every action.</li>
              <li><strong>Workspace Knowledge</strong> — Memory comes from observation and verified proof, not speculation.</li>
            </ul>
          </article>
          <article class="panel stack">
            <h2 class="section-title">Example terminal flow</h2>
            <div class="terminal-preview">
              <div class="demo-windowbar"><span class="demo-dot"></span><span class="demo-dot"></span><span class="demo-dot"></span><span>Terminal Pro</span></div>
              <span class="terminal-line dim"># Observe</span>
              <span class="terminal-line dim">rina observe --project ./my-app</span>
              <span class="terminal-line dim"># Plan</span>
              <span class="terminal-line dim">rina plan --changes "Fix type errors"</span>
              <span class="terminal-line ok"># Approve</span>
              <span class="terminal-line ok">Approve: Run npm install, tsc --build</span>
              <span class="terminal-line dim"># Execute</span>
              <span class="terminal-line ok">npm install</span>
              <span class="terminal-line ok">tsc --build</span>
              <span class="terminal-line ok"># Proof</span>
              <span class="terminal-line ok">Build: exit code 0</span>
              <span class="terminal-line ok">Tests: 214 passed</span>
            </div>
          </article>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title centered">Proof workflow screenshots</h2>
        <p class="section-copy centered">Real screenshots from Terminal Pro showing each step of the workflow.</p>
        <div class="screenshots-grid">
          <article class="screenshot-card">
            <div class="screenshot-frame">
              <img src="/assets/img/terminal-pro-agent-thread.png" alt="Agent Thread showing Observe step" loading="lazy" decoding="async">
            </div>
            <h3>Agent Thread: Observe</h3>
            <p>Rina scans the project and presents findings before any changes.</p>
          </article>
          <article class="screenshot-card">
            <div class="screenshot-frame">
              <img src="/assets/img/terminal-pro-interface.png" alt="Planner Approval showing Plan step" loading="lazy" decoding="async">
            </div>
            <h3>Planner: Approval</h3>
            <p>The plan is reviewed and approved before execution begins.</p>
          </article>
          <article class="screenshot-card">
            <div class="screenshot-frame">
              <img src="/assets/img/terminal-pro-agent-thread.png" alt="Execute step in progress" loading="lazy" decoding="async">
            </div>
            <h3>Execute: AgentRuntime</h3>
            <p>Commands run with full output capture in the Agent Thread.</p>
          </article>
          <article class="screenshot-card">
            <div class="screenshot-frame">
              <img src="/assets/img/terminal-pro-interface.png" alt="Proof verification output" loading="lazy" decoding="async">
            </div>
            <h3>Proof: Verification</h3>
            <p>Build exit codes, test results, and health checks prove success.</p>
          </article>
        </div>
      </section>

      <section class="section final-cta">
        <h2>Ready to try the proof-first workflow?</h2>
        <p>Download Terminal Pro Beta and experience the difference verification makes.</p>
        <div class="cta-row">
          <a href="/download/" class="btn btn-light">Download Beta</a>
        </div>
      </section>
    `
  },
  {
    route: "about",
    path: "/about",
    page: "legal",
    title: "About RinaWarp | Remote-First Developer Tools Company",
    description: "RinaWarp Technologies, LLC builds proof-first Terminal Pro and Matter Intelligence. Remote-first team; Utah operations.",
    eyebrow: "About",
    heading: "About RinaWarp",
    copy: "Proof-first developer tools. Remote-first company headquartered in Utah.",
    content: ABOUT_PAGE_HTML
  },
  {
    route: "case-studies",
    path: "/case-studies",
    page: "docs",
    title: "Repair Case Studies | RinaWarp Terminal Pro",
    description: "Real repair reports from Early Access: TypeScript, React builds, and npm dependency conflicts with verification output.",
    eyebrow: "Case studies",
    heading: "Real repair reports",
    copy: "Example repairs with actions, verification, and timing — no fabricated usage metrics.",
    content: CASE_STUDIES_INDEX_HTML
  },
  ...CASE_STUDY_PAGES.map((study) => ({
    route: study.slug,
    path: study.path,
    page: "docs",
    title: study.title,
    description: study.description,
    eyebrow: "Case study",
    heading: study.headline,
    copy: study.problem,
    content: buildCaseStudyHtml(study),
  })),
  {
     route: "support",
    path: "/support",
    page: "feedback",
    title: "RinaWarp Support | Contact, FAQ, Known Issues, and Billing Help",
    description: "Contact RinaWarp for product support, billing help, known issues, and troubleshooting guidance.",
    eyebrow: "Support",
    heading: "Get help with RinaWarp.",
    copy: "Contact, FAQ, known issues, and billing help in one support surface.",
    content: `
      <section class="section">
        <h2 class="section-title">Contact</h2>
        <div class="grid three-up">
          <article class="card"><h3>Billing</h3><p>Email <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a>. Include your billing email and what changed.</p></article>
          <article class="card"><h3>Technical</h3><p>Send the app version, platform, installer type, failing command, and a short description of the workflow.</p></article>
          <article class="card"><h3>Critical install issue</h3><p>If the installer or checksum looks wrong, stop before running it and contact support.</p></article>
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
      <section class="section"><div class="panel stack"><h2 class="section-title">Known issues</h2><ul class="signal-list"><li>Linux is the only public beta installer currently offered.</li><li>Windows and macOS are not listed until signed, verified installers exist.</li><li>Minimal Linux images may need GUI/runtime packages before AppImage starts cleanly.</li><li>Package registry or network failures can block repair verification even when the code fix is correct.</li></ul></div></section>
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
    copy: "These terms are intentionally plain. Early Access means real software, real support, and honest expectations while the product is still hardening.",
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
        <h2 class="section-title">Warranties, liability, and support</h2>
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
        <h2 class="section-title">Developer-specific answers</h2>
        <p><strong>Is my code uploaded?</strong> By default: No — repairs run locally in your workspace.</p>
        <p><strong>Telemetry:</strong> App version, OS, install id (hashed), workflow events, error diagnostics — not full repo contents.</p>
        <p><strong>Disable telemetry:</strong> Limited during Early Access; contact support for enterprise review.</p>
        <p><strong>Repositories stored:</strong> No for default Fix Project. Cloud features are labeled separately when enabled.</p>
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
    heading: "Manage your RinaWarp account",
    copy: "View your plan, download Terminal Pro, restore access, and manage billing.",
    content: `
      <section class="section"><div class="auth-container stack">
        <div class="auth-card stack" id="account-gate" hidden>
          <h2 class="section-title">Your account</h2>
          <div class="grid three-up">
            <article class="card"><div class="kicker">Plan</div><h3>Free</h3></article>
            <article class="card"><div class="kicker">Subscription</div><h3>No paid subscription found</h3></article>
          </div>
          <div class="link-row"><a href="#restore" class="btn btn-primary">Restore purchase</a><a href="/download/" class="btn btn-secondary">Download Terminal Pro</a><a href="/pricing/" class="btn btn-secondary">Upgrade to Pro</a></div>
        </div>
        <div class="auth-card stack" id="account-state" hidden>
          <h2 class="section-title">Your account</h2>
          <h3 id="account-display-name">RinaWarp customer</h3>
          <p id="account-email" class="section-copy"></p>
          <div class="grid three-up">
            <article class="card"><div class="kicker">Plan</div><h3 id="account-tier">Free</h3></article>
            <article class="card"><div class="kicker">Subscription</div><h3 id="account-tier-note">No paid subscription found</h3></article>
          </div>
          <div class="link-row"><a href="#restore" class="btn btn-primary">Restore purchase</a><a href="/download/" class="btn btn-secondary">Download Terminal Pro</a><button class="btn btn-secondary" id="billing-portal-btn" type="button" hidden>Manage billing</button><a href="/pricing/" class="btn btn-secondary" id="account-upgrade-link">Upgrade to Pro</a><button class="btn btn-secondary" id="logout-btn" type="button">Sign out</button></div>
        </div>
        <div class="auth-card stack" id="restore">
          <h2 class="section-title">Restore access</h2>
          <p class="section-copy">Enter the billing email you used at checkout.</p>
          <form id="restore-form"><label>Billing email<input type="email" name="email" placeholder="Billing email" required></label><button type="submit" class="btn btn-primary">Restore access</button><p id="restore-status" class="status-message" aria-live="polite"></p></form>
        </div>
        <div class="auth-card stack" id="account-referral" hidden>
          <h2 class="section-title">Referral link</h2>
          <p class="section-copy">Invite a developer and track your rewards.</p>
          <div class="pill"><span id="account-referral-code">—</span></div>
          <label>Invite link<input id="account-invite-link" type="text" value="" readonly></label>
          <div class="link-row"><button class="btn btn-primary" id="copy-invite-link-btn" type="button">Copy invite link</button></div>
          <p id="account-referral-stats" class="section-copy">0 checkouts started · 0 paid conversions</p>
          <p id="account-referral-status" class="status-message" aria-live="polite"></p>
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
  },
  ...SEO_LANDING_PAGES.map((seoPage) => ({
    route: seoPage.path.replace(/^\//, ""),
    path: seoPage.path,
    page: "docs",
    title: seoPage.title,
    description: seoPage.description,
    eyebrow: seoPage.eyebrow,
    heading: seoPage.headline,
    copy: seoPage.lede,
    heroActions: `
      <a href="/download/" class="btn btn-primary" data-analytics-event="download_click" data-analytics-prop-placement="seo_hero" data-analytics-prop-target="download">Download Free</a>
      <a href="/pricing/" class="btn btn-secondary">See pricing</a>
    `,
    content: buildSeoLandingPageHtml(seoPage),
  })),
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
/about-rinawarp /about/ 301
/about-rinawarp/ /about/ 301
/agents https://rinawarptech.com/agents 302
/agents/ https://rinawarptech.com/agents 302
/music-video-creator /products/ 301
/music-video-creator/ /products/ 301
/matter-intelligence /products/ 301
/matter-intelligence/ /products/ 301
/matter-intelligence/* /products/ 301
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
  <url><loc>https://rinawarptech.com/phone-toolkit/</loc></url>
  <url><loc>https://rinawarptech.com/beta/</loc></url>
  <url><loc>https://rinawarptech.com/beta-feedback/</loc></url>
  <url><loc>https://rinawarptech.com/pricing/</loc></url>
  <url><loc>https://rinawarptech.com/download/</loc></url>
  <url><loc>https://rinawarptech.com/docs/</loc></url>
  <url><loc>https://rinawarptech.com/trust/</loc></url>
  <url><loc>https://rinawarptech.com/support/</loc></url>
  <url><loc>https://rinawarptech.com/early-access/</loc></url>
  <url><loc>https://rinawarptech.com/terms/</loc></url>
  <url><loc>https://rinawarptech.com/privacy/</loc></url>
${SEO_LANDING_PAGES.map((p) => `  <url><loc>https://rinawarptech.com${p.path}/</loc></url>`).join("\n")}
  <url><loc>https://rinawarptech.com/about/</loc></url>
  <url><loc>https://rinawarptech.com/case-studies/</loc></url>
${CASE_STUDY_PAGES.map((s) => `  <url><loc>https://rinawarptech.com${s.path}/</loc></url>`).join("\n")}
</urlset>
`;

await rm(outdir, { recursive: true, force: true });
await mkdir(path.join(outdir, "assets", "img"), { recursive: true });
await mkdir(path.join(outdir, "assets", "img", "phone-toolkit"), { recursive: true });
await writeFile(path.join(outdir, "assets", "site.css"), SITE_CSS, "utf8");
await writeFile(path.join(outdir, "assets", "phone-toolkit.css"), await readFile(path.join(repoRoot, "website", "assets", "phone-toolkit.css"), "utf8"), "utf8");
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
await copyIfPresent(
  path.join(repoRoot, "website", "assets", "img", "phone-toolkit", "hero-brand-board.webp"),
  path.join(outdir, "assets", "img", "phone-toolkit", "hero-brand-board.webp")
);
await copyIfPresent(
  path.join(repoRoot, "website", "assets", "img", "phone-toolkit", "social-card.jpg"),
  path.join(outdir, "assets", "img", "phone-toolkit", "social-card.jpg")
);
await writeFile(path.join(outdir, "_redirects"), REDIRECTS, "utf8");
await writeFile(path.join(outdir, "robots.txt"), ROBOTS_TXT, "utf8");
await writeFile(path.join(outdir, "sitemap.xml"), SITEMAP_XML, "utf8");

for (const page of pages) {
  await writeRoute(page.route, shell(page));
}

console.log(`Built static Pages site: ${outdir}`);
