/**
 * Shared marketing/docs HTML fragments for Pages build and Worker router.
 */

export const HERO_REPAIR_REPORT = `
<aside class="repair-report" aria-label="Example proof report">
  <div class="repair-report-header">
    <span class="kicker">Proof report</span>
    <span class="repair-report-badge">Verified run</span>
  </div>
  <dl class="repair-report-grid">
    <div><dt>Repository</dt><dd>Next.js SaaS</dd></div>
    <div><dt>Problem</dt><dd>27 TypeScript errors</dd></div>
    <div class="repair-report-span"><dt>Actions</dt><dd>
      <ul>
        <li>Fixed imports</li>
        <li>Updated tsconfig</li>
        <li>Rebuilt types</li>
      </ul>
    </dd></div>
    <div class="repair-report-span"><dt>Verification</dt><dd>
      <ul class="verification-list">
        <li class="ok">✓ Build succeeded</li>
        <li class="ok">✓ Tests passed</li>
      </ul>
    </dd></div>
    <div><dt>Time</dt><dd>2m 11s</dd></div>
  </dl>
  <p class="repair-report-note">Representative Early Access proof — your repo will differ. Screenshots below are from real Terminal Pro runs, not illustrations.</p>
</aside>
`

export const DOCS_BODY_HTML = `
<section class="section">
  <nav class="docs-nav" aria-label="Documentation sections">
    <a href="#installation">Installation</a>
    <a href="#first-repair">First proof workflow</a>
    <a href="/docs/proof">Proof workflow</a>
    <a href="#frameworks">Frameworks</a>
    <a href="#permissions">Permissions</a>
    <a href="#security">Security model</a>
    <a href="#troubleshooting">Troubleshooting</a>
    <a href="#api-reference">API/reference</a>
    <a href="#fix-guides">Fix guides</a>
  </nav>

<article id="installation" class="panel stack">
    <h2 class="section-title">Installation</h2>
    <h3>Linux (available now)</h3>
    <ol class="signal-list">
      <li>Download <code>.deb</code> or AppImage from the <a href="/download/">download page</a>.</li>
      <li>Verify SHA256 using <a href="/download/">SHASUMS256.txt</a> before install.</li>
      <li><strong>.deb:</strong> Install on Debian/Ubuntu. Updates are manual <code>.deb</code> reinstalls unless you switch paths.</li>
      <li><strong>AppImage:</strong> Portable build with in-app update checks when configured.</li>
      <li>Launch Terminal Pro and open your repository folder.</li>
    </ol>
    <h3>macOS/Windows (unsigned beta preview)</h3>
    <p><strong>Important:</strong> These beta builds may be unsigned and require OS security bypass steps. Production builds will be signed and notarized.</p>
    <ul class="signal-list">
      <li>Download the unsigned .dmg or .exe installer from the <a href="/download/">download page</a>.</li>
      <li><strong>macOS:</strong> Right-click the app and select "Open" to bypass Gatekeeper on first launch.</li>
      <li><strong>Windows:</strong> Click "More info" → "Run anyway" if SmartScreen blocks the installer.</li>
      <li>These builds are for validation testing only — production builds will be signed.</li>
    </ul>
    <h3>Requirements</h3>
    <ul class="signal-list">
      <li>4 GB RAM minimum; 8 GB+ recommended for large monorepos</li>
      <li>Node.js 18+ and npm/pnpm in PATH for JavaScript/TypeScript projects</li>
      <li>Git recommended so you can review diffs and roll back</li>
      <li>Outbound network for package registries during repairs</li>
    </ul>
  </article>

  <article id="first-repair" class="panel stack">
    <h2 class="section-title">First proof workflow</h2>
    <ol class="signal-list">
      <li><strong>Open the repo.</strong> Select the project root folder.</li>
      <li><strong>Ask Rina.</strong> Describe what's broken. Rina follows the Observe → Plan → Approve → Execute → Proof workflow.</li>
      <li><strong>Review the plan.</strong> Read proposed file changes and the command plan.</li>
      <li><strong>Approve when prompted.</strong> High-impact steps pause until you confirm.</li>
      <li><strong>Verify proof.</strong> Confirm build, test, or boot checks show exit code 0.</li>
    </ol>
    <div class="screenshot-frame">
      <img src="/assets/img/terminal-pro-agent-thread.png" alt="Current Terminal Pro Agent Thread interface" width="1400" height="768" loading="lazy" decoding="async">
    </div>
    <p class="section-copy">If verification fails, read the failing command in the terminal and run another proof workflow pass with a narrower scope or after fixing network/registry access.</p>
  </article>

  <article id="first-repair" class="panel stack">
    <h2 class="section-title">First repair (step by step)</h2>
<ol class="signal-list">
       <li><strong>Open the repo.</strong> Select the project root folder.</li>
       <li><strong>Ask Rina.</strong> Describe what's broken or what you want to change. Rina follows the Observe → Plan → Approve → Execute → Proof workflow.</li>
       <li><strong>Review the plan.</strong> Read proposed file changes and the command plan.</li>
       <li><strong>Approve when prompted.</strong> High-impact steps pause until you confirm.</li>
       <li><strong>Verify proof.</strong> Confirm build, test, or boot checks show exit code 0.</li>
     </ol>
    <div class="screenshot-frame">
      <img src="/assets/img/terminal-pro-agent-thread.png" alt="Current Terminal Pro Agent Thread interface" width="1400" height="768" loading="lazy" decoding="async">
    </div>
    <p class="section-copy">If verification fails, read the failing command output and run the proof workflow again with a narrower scope or after fixing network/registry access.</p>
  </article>

  <article id="frameworks" class="panel stack">
    <h2 class="section-title">Supported frameworks</h2>
    <p>Best results on JavaScript/TypeScript stacks with standard npm tooling:</p>
    <div class="use-case-grid">
      <div class="use-case-card">React</div>
      <div class="use-case-card">Next.js</div>
      <div class="use-case-card">Node</div>
      <div class="use-case-card">TypeScript</div>
      <div class="use-case-card">Vite</div>
      <div class="use-case-card">Express</div>
      <div class="use-case-card">Docker</div>
      <div class="use-case-card">Prisma</div>
    </div>
    <p class="section-copy">Other stacks may work when they use conventional build commands; unsupported cases should fail visibly rather than silently.</p>
  </article>

  <article id="permissions" class="panel stack">
    <h2 class="section-title">Permissions</h2>
    <h3>What files can Rina modify?</h3>
    <p>Files inside the opened project and paths required to fix it (lockfiles, config, generated types). Rina should not modify arbitrary paths outside the project.</p>
    <h3>What commands can it run?</h3>
    <p>Package managers, compilers, test runners, and diagnostics relevant to the proof workflow (<code>npm</code>, <code>pnpm</code>, <code>tsc</code>, <code>vite build</code>, <code>docker compose build</code>, etc.).</p>
    <h3>Approval workflow</h3>
    <p>Safe changes can auto-apply on paid tiers. High-impact actions (mass deletes, publish, deploy hooks) require explicit approval in the UI.</p>
  </article>

  <article id="security" class="panel stack">
    <h2 class="section-title">Security model</h2>
    <ul class="signal-list">
      <li><strong>Local-first execution</strong> — The proof workflow runs against your disk unless a feature is explicitly labeled cloud.</li>
      <li><strong>Command allowlisting</strong> — Proof workflow uses project-scoped tooling; unexpected system-wide commands should surface for approval.</li>
      <li><strong>Rollback</strong> — Use git to revert bad changes; the proof report lists files touched so rollback is explicit.</li>
      <li><strong>No secret exfiltration by default</strong> — <code>.env</code> values are not uploaded as part of the default proof workflow path; see <a href="/privacy/">privacy</a> for telemetry scope.</li>
    </ul>
  </article>

  <article id="troubleshooting" class="panel stack">
    <h2 class="section-title">Troubleshooting</h2>
    <h3>Build failures after proof</h3>
    <p>Read the failing command in the terminal. Often one env var, flaky test, or remaining type error needs a second proof workflow pass.</p>
    <h3>Permission errors</h3>
    <p>Ensure the project is writable and package managers are not blocked by sandboxed directories. On Linux, avoid running as root inside the project tree.</p>
    <h3>Broken install</h3>
    <p>Re-verify checksums, try the other Linux artifact (.deb vs AppImage), or install missing GUI libraries on minimal images.</p>
  </article>

  <article id="api-reference" class="panel stack">
    <h2 class="section-title">API/reference</h2>
    <p>Use these references when you need exact command, permission, or verification behavior instead of sales copy.</p>
    <div class="grid three-up">
      <article class="card"><h3>Proof commands</h3><p>RinaWarp favors project-scoped build, test, package, and diagnostic commands. Destructive or publishing actions require explicit approval.</p></article>
      <article class="card"><h3>Exit codes</h3><p>A proof is not complete until the relevant build, test, install, or boot command exits successfully and the proof is visible.</p></article>
      <article class="card"><h3>Support data</h3><p>When you contact support, include app version, platform, installer type, failing command, and a short description of the broken workflow.</p></article>
    </div>
  </article>

  <article id="fix-guides" class="panel stack">
    <h2 class="section-title">Problem-specific fix guides</h2>
    <div class="use-case-grid">
      <a class="use-case-card" href="/fix-typescript-errors/">TypeScript errors</a>
      <a class="use-case-card" href="/fix-react-build-errors/">React build errors</a>
      <a class="use-case-card" href="/fix-nextjs-build-failures/">Next.js build failures</a>
      <a class="use-case-card" href="/fix-vite-projects/">Vite projects</a>
      <a class="use-case-card" href="/fix-node-dependency-conflicts/">Dependency conflicts</a>
      <a class="use-case-card" href="/fix-npm-install-errors/">npm install errors</a>
      <a class="use-case-card" href="/fix-docker-issues/">Docker issues</a>
    </div>
  </article>
</section>
`

export const CASE_STUDY_PAGES = [
  {
    slug: 'case-study-nextjs-typescript',
    path: '/case-studies/nextjs-typescript-repair',
    title: 'Case Study: 27 TypeScript Errors in a Next.js SaaS | RinaWarp',
    description:
      'How RinaWarp fixed 27 TypeScript errors across a Next.js monorepo, updated tsconfig, and verified build and tests in 2m 11s.',
    headline: 'Next.js SaaS: 27 TypeScript errors → verified build',
    repo: 'Next.js SaaS (monorepo)',
    problem: '27 TypeScript errors after a dependency bump — broken paths, stale generated types, and failing CI.',
    actions: ['Aligned tsconfig paths and project references', 'Fixed cross-package imports', 'Regenerated types and ran full build'],
    verification: ['npm run build — exit 0', '214 tests passed', 'App boot health check passed'],
    duration: '2m 11s',
    relatedSeo: '/fix-typescript-errors/',
  },
  {
    slug: 'case-study-react-build',
    path: '/case-studies/react-build-module-not-found',
    title: 'Case Study: React Build Module Not Found | RinaWarp',
    description:
      'Repair report: missing modules and broken aliases in a React app — dependencies installed, config fixed, build verified.',
    headline: 'React app: module not found → build verified',
    repo: 'React + Vite dashboard',
    problem: 'Production build failed with missing modules and broken path aliases.',
    actions: ['Installed missing dependencies', 'Synced Vite alias with tsconfig', 'Cleared stale cache and rebuilt'],
    verification: ['vite build — exit 0', 'Smoke test script passed'],
    duration: '3m 42s',
    relatedSeo: '/fix-react-build-errors/',
  },
  {
    slug: 'case-study-npm-install',
    path: '/case-studies/npm-install-dependency-conflict',
    title: 'Case Study: npm ERESOLVE Dependency Conflict | RinaWarp',
    description:
      'How RinaWarp resolved peer dependency conflicts, aligned lockfile entries, and restored a clean npm install with verification.',
    headline: 'Monorepo: ERESOLVE conflict → clean install',
    repo: 'Node monorepo (pnpm workspaces)',
    problem: 'npm install failed with ERESOLVE — React peer mismatch across packages blocked all development.',
    actions: ['Aligned peer versions across workspace packages', 'Updated lockfile consistently', 'Removed conflicting postinstall hook'],
    verification: ['npm install — exit 0', 'npm run build — exit 0', 'CI install script passed locally'],
    duration: '4m 05s',
    relatedSeo: '/fix-node-dependency-conflicts/',
  },
]

export function buildCaseStudyHtml(study) {
  return `
    <section class="section">
      <div class="repair-report">
        <div class="repair-report-header"><span class="kicker">Proof report</span></div>
        <dl class="repair-report-grid">
          <div><dt>Repository</dt><dd>${study.repo}</dd></div>
          <div><dt>Problem</dt><dd>${study.problem}</dd></div>
          <div class="repair-report-span"><dt>Actions</dt><dd><ul>${study.actions.map((a) => `<li>${a}</li>`).join('')}</ul></dd></div>
          <div class="repair-report-span"><dt>Verification</dt><dd><ul class="verification-list">${study.verification.map((v) => `<li class="ok">✓ ${v.replace(/^✓\s*/, '')}</li>`).join('')}</ul></dd></div>
          <div><dt>Time</dt><dd>${study.duration}</dd></div>
        </dl>
      </div>
    </section>
    <section class="section">
      <div class="screenshot-frame">
        <img src="/assets/img/terminal-pro-agent-thread.png" alt="Current Terminal Pro Agent Thread interface" loading="lazy" decoding="async">
      </div>
      <p class="section-copy">Early Access example — identifiers anonymized. <a href="${study.relatedSeo}">Read the fix guide</a> for this problem type.</p>
      <div class="cta-row">
        <a href="/download/" class="btn btn-primary">Try on your repo</a>
        <a href="/case-studies/" class="btn btn-secondary">More case studies</a>
      </div>
    </section>
  `
}

export const CASE_STUDIES_INDEX_HTML = `
<section class="section">
  <p class="section-copy">Three detailed proof examples from Early Access — real terminal verification patterns, not invented metrics.</p>
  <div class="grid three-up">
    ${CASE_STUDY_PAGES.map(
      (s) => `
    <article class="card stack">
      <div class="kicker">${s.duration}</div>
      <h3><a href="${s.path}/">${s.headline}</a></h3>
      <p>${s.problem}</p>
      <a href="${s.path}/" class="btn btn-secondary">Read case study</a>
    </article>`
    ).join('')}
  </div>
</section>
`

export const PRICING_ROI_HTML = `
<section class="section">
  <div class="panel stack">
    <div class="kicker">Why Pro pays for itself</div>
    <h2 class="section-title">Time and cost comparison</h2>
    <div class="grid three-up">
      <article class="card">
        <h3>Average debugging session</h3>
        <p><strong>2–6 hours</strong> lost on installs, type errors, and config loops — especially before a deadline.</p>
      </article>
      <article class="card">
        <h3>Average verified repair</h3>
        <p><strong>Under 5 minutes</strong> from scan to verified build when the workflow fits your stack.</p>
      </article>
      <article class="card">
        <h3>One avoided session</h3>
        <p>Often pays for <strong>a month of Pro ($15)</strong> — before counting team downtime.</p>
      </article>
    </div>
  </div>
</section>
`

export const ABOUT_PAGE_HTML = `
<section class="section">
  <div class="panel stack">
    <h2 class="section-title">RinaWarp Technologies, LLC</h2>
    <p>RinaWarp builds proof-first developer tools. <strong>Terminal Pro</strong> fixes broken repositories with visible terminal verification. <strong>Matter Intelligence</strong> (separate product) targets legal and compliance workflows.</p>
    <h3>How we work</h3>
    <p><strong>Remote-first company.</strong> Team and contractors work across the US; there is no public storefront office. Product and support operations are centered in <strong>Utah</strong> (company domicile). We do not list a San Francisco office — if you see conflicting address copy elsewhere, treat this page as canonical.</p>
    <h3>Contact</h3>
    <p>Product support: <a href="mailto:support@rinawarptech.com">support@rinawarptech.com</a> · General: <a href="mailto:hello@rinawarptech.com">hello@rinawarptech.com</a></p>
    <div class="link-row">
      <a href="/products/" class="btn btn-secondary">Products</a>
      <a href="/download/" class="btn btn-primary">Download Terminal Pro</a>
    </div>
  </div>
</section>
`
