/**
 * SEO landing pages — problem-specific entry points for Terminal Pro.
 * Keep copy factual; do not invent metrics or customer counts.
 */


export const SEO_LANDING_PAGES = [
  {
    path: '/fix-typescript-errors',
    title: 'Fix TypeScript Errors in Your Repo | RinaWarp Terminal Pro',
    description:
      'Fix TypeScript build and type errors across your whole repository. RinaWarp scans, repairs, runs the build, and verifies tests — with proof in the terminal.',
    keywords:
      'fix typescript errors, typescript build failed, tsc errors, type mismatch, RinaWarp',
    eyebrow: 'TypeScript repairs',
    headline: 'Fix TypeScript errors without chasing files one by one.',
    lede:
      'When `tsc` or `next build` fails with dozens of type errors, the fix is rarely a single line. RinaWarp Terminal Pro analyzes the project, applies coordinated changes, and verifies the build.',
    problemTitle: 'Why TypeScript failures eat entire afternoons',
    problemBody:
      'Type errors cascade: a wrong interface in one package breaks imports in apps, tests, and CI. Manual fixes often treat symptoms (the error line) instead of the config or dependency drift that caused the spread.',
    symptoms: [
      'error TS2322 / TS2345 across many files after a dependency bump',
      'Path aliases or project references broken after a monorepo change',
      'Generated types out of sync with API or Prisma schema',
      'Strict mode enabled and hundreds of legacy violations surfaced at once',
    ],
    commonCauses: [
      'tsconfig paths or references misaligned with the actual folder layout',
      'Major version upgrades in @types/* or framework packages',
      'Mixed ESM/CJS resolution confusing the compiler',
      'Stale build artifacts or missing `tsc --build` clean step',
    ],
    rinaApproach: [
      'Scan the project and group errors by root cause (config vs code vs deps)',
      'Propose and apply fixes with visible diffs — high-impact changes wait for approval',
      'Run `npm run build` / `tsc` and your test script to confirm recovery',
      'Attach verification output (build passed, tests passed, exit code 0)',
    ],
    beforeLabel: 'Before',
    beforeOutput: `error TS2322: Type 'string' is not assignable to type 'number'.
error TS2307: Cannot find module '@/components/Header'.
Found 27 errors in 14 files.`,
    afterLabel: 'After verification',
    afterOutput: `Updated tsconfig paths and project references
Fixed interface mismatches in shared package
npm run build — exit 0
214 tests passed`,
    relatedPaths: [
      { href: '/fix-nextjs-build-failures', label: 'Next.js build failures' },
      { href: '/fix-react-build-errors', label: 'React build errors' },
      { href: '/fix-node-dependency-conflicts', label: 'Dependency conflicts' },
    ],
  },
  {
    path: '/fix-react-build-errors',
    title: 'Fix React Build Errors | RinaWarp Terminal Pro',
    description:
      'Repair failed React builds: missing modules, bad imports, config mistakes, and test failures. RinaWarp fixes the repo and verifies the result.',
    keywords: 'fix react build error, react scripts build failed, module not found react, RinaWarp',
    eyebrow: 'React repairs',
    headline: 'Fix React build failures across the whole project.',
    lede:
      'React build errors often look like a missing module when the real issue is config, peer dependencies, or a broken path alias. RinaWarp treats the repository as one system.',
    problemTitle: 'React builds fail for structural reasons',
    problemBody:
      'CRA, Vite, and Next.js each surface different error shapes, but the pattern is the same: one broken dependency or config poisons every import downstream.',
    symptoms: [
      'Module not found for components or hooks after a refactor',
      'Peer dependency warnings turned into hard build failures',
      'JSX runtime or React version mismatch after upgrade',
      'Environment variables missing at build time',
    ],
    commonCauses: [
      'Incorrect alias or baseUrl in bundler config',
      'Lockfile out of sync with package.json',
      'Server/client component boundary mistakes (Next.js App Router)',
      'Stale `.next` or `dist` confusing incremental builds',
    ],
    rinaApproach: [
      'Identify whether the failure is dependency, bundler config, or source',
      'Install missing packages and align React/React-DOM versions when needed',
      'Fix imports and config, then rerun the production build',
      'Verify with build + test commands your repo already defines',
    ],
    beforeLabel: 'Before',
    beforeOutput: `npm run build
Module not found: Can't resolve '@/components/Dashboard'
npm ERR! code ELIFECYCLE`,
    afterLabel: 'After verification',
    afterOutput: `Resolved path alias in vite.config.ts
Installed missing peer dependencies
npm run build — compiled successfully
vitest — 48 passed`,
    relatedPaths: [
      { href: '/fix-vite-projects', label: 'Vite project fixes' },
      { href: '/fix-typescript-errors', label: 'TypeScript errors' },
      { href: '/fix-npm-install-errors', label: 'npm install errors' },
    ],
  },
  {
    path: '/fix-nextjs-build-failures',
    title: 'Fix Next.js Build Failures | RinaWarp Terminal Pro',
    description:
      'Fix Next.js build and compile failures: TypeScript, env vars, module resolution, and App Router issues. Verified repairs with terminal proof.',
    keywords: 'fix nextjs build, next build failed, next.js typescript error, RinaWarp',
    eyebrow: 'Next.js repairs',
    headline: 'Fix Next.js build failures end to end.',
    lede:
      'Next.js combines TypeScript, bundling, static analysis, and framework rules. A single misconfigured env var or bad import can fail `next build` with a wall of errors.',
    problemTitle: 'Next.js failures are rarely one-file fixes',
    problemBody:
      'App Router, server components, and monorepo packages interact. Fixing only the first error in the log often uncovers the next layer underneath.',
    symptoms: [
      '`next build` fails during type checking or static generation',
      'Missing NEXT_PUBLIC_* or server-only env at build time',
      'Cannot find module for shared UI package in a monorepo',
      'ESLint or TypeScript step fails in CI before deploy',
    ],
    commonCauses: [
      'transpilePackages / experimental settings not listing project deps',
      'Incorrect `outputFileTracing` or standalone output paths',
      'Breaking changes after Next.js major upgrade',
      'Mixed default and named exports across package boundaries',
    ],
    rinaApproach: [
      'Run the same build command CI uses (`next build`)',
      'Repair tsconfig paths, package exports, and env templates',
      'Apply code fixes for imports and component boundaries',
      'Confirm build and critical tests pass before you merge',
    ],
    beforeLabel: 'Before',
    beforeOutput: `next build
Error: Failed to collect page data for /dashboard
Error: Cannot find module '@acme/ui'
Build failed`,
    afterLabel: 'After verification',
    afterOutput: `Added project package to transpilePackages
Fixed package.json exports in @acme/ui
next build — completed
exit code 0`,
    relatedPaths: [
      { href: '/fix-typescript-errors', label: 'TypeScript errors' },
      { href: '/fix-react-build-errors', label: 'React build errors' },
      { href: '/fix-node-dependency-conflicts', label: 'Dependency conflicts' },
    ],
  },
  {
    path: '/fix-vite-projects',
    title: 'Fix Vite Projects | RinaWarp Terminal Pro',
    description:
      'Repair broken Vite dev servers and production builds: config, plugins, aliases, and dependency issues. RinaWarp verifies the fix in your terminal.',
    keywords: 'fix vite build, vite module not found, vite config error, RinaWarp',
    eyebrow: 'Vite repairs',
    headline: 'Fix Vite dev and build failures fast.',
    lede:
      'Vite errors are usually config or dependency resolution, not mystery bundler bugs. RinaWarp reads your `vite.config` and package graph together with the source tree.',
    problemTitle: 'Vite breaks when config and deps disagree',
    problemBody:
      'Alias mistakes, outdated plugins, and Node polyfill gaps show up as cryptic rollup errors. The fix is often a small config change plus a clean install.',
    symptoms: [
      '`vite build` fails with unresolved imports',
      'Dev server starts but HMR breaks on certain files',
      'Plugin incompatibility after Vite major upgrade',
      'SSR / library mode misconfigured for a package',
    ],
    commonCauses: [
      'resolve.alias not matching tsconfig paths',
      'Missing `vite-plugin-*` after template drift',
      'Incorrect `define` or env prefix for client exposure',
      'Optional dependencies not installed on CI',
    ],
    rinaApproach: [
      'Compare tsconfig paths with vite resolve.alias',
      'Align plugin versions with your Vite major version',
      'Run `vite build` and your test script for verification',
      'Document what changed so you can trust the diff',
    ],
    beforeLabel: 'Before',
    beforeOutput: `vite build
[vite]: Rollup failed to resolve import "@/lib/api"
error during build`,
    afterLabel: 'After verification',
    afterOutput: `Synced alias in vite.config.ts with tsconfig
npm ci — clean install
vite build — built in 42s
exit code 0`,
    relatedPaths: [
      { href: '/fix-react-build-errors', label: 'React build errors' },
      { href: '/fix-typescript-errors', label: 'TypeScript errors' },
      { href: '/fix-npm-install-errors', label: 'npm install errors' },
    ],
  },
  {
    path: '/fix-node-dependency-conflicts',
    title: 'Fix Node Dependency Conflicts | RinaWarp Terminal Pro',
    description:
      'Resolve npm/pnpm peer dependency conflicts, lockfile drift, and broken installs. RinaWarp repairs the dependency graph and verifies builds.',
    keywords: 'fix npm dependency conflict, ERESOLVE, peer dependency, lockfile, RinaWarp',
    eyebrow: 'Dependency repairs',
    headline: 'Fix Node dependency conflicts without guesswork.',
    lede:
      'Peer dependency warnings become hard failures after upgrades. RinaWarp inspects package.json, lockfiles, and the errors your package manager prints.',
    problemTitle: 'Dependency graphs fail in CI first',
    problemBody:
      'What worked locally with `--legacy-peer-deps` breaks in CI with a clean install. The durable fix aligns versions or chooses a supported combination — not another force flag.',
    symptoms: [
      'ERESOLVE unable to resolve dependency tree',
      'Duplicate copies of React or other singleton packages',
      'Works on one machine, fails in CI with `npm ci`',
      'Patch/minor bump pulled incompatible transitive deps',
    ],
    commonCauses: [
      'Peer dependency range too loose across project packages',
      'Mixing package managers or stale lockfile',
      'Overrides/resolutions missing for known conflicts',
      'Optional deps required at runtime but not installed',
    ],
    rinaApproach: [
      'Read npm/pnpm error output and identify the conflicting packages',
      'Adjust versions, overrides, or workspace protocol as appropriate',
      'Reinstall with the same command CI uses',
      'Run build and tests to prove the graph is healthy',
    ],
    beforeLabel: 'Before',
    beforeOutput: `npm install
npm ERR! ERESOLVE could not resolve
peer react@"^18" from package-a
peer react@"^19" from package-b`,
    afterLabel: 'After verification',
    afterOutput: `Aligned react peer across project packages
Regenerated lockfile
npm ci — success
npm run build — exit 0`,
    relatedPaths: [
      { href: '/fix-npm-install-errors', label: 'npm install errors' },
      { href: '/fix-typescript-errors', label: 'TypeScript errors' },
      { href: '/fix-nextjs-build-failures', label: 'Next.js builds' },
    ],
  },
  {
    path: '/fix-npm-install-errors',
    title: 'Fix npm Install Errors | RinaWarp Terminal Pro',
    description:
      'Fix broken npm installs: permission errors, corrupted cache, registry issues, and script failures. Get back to a buildable project with verification.',
    keywords: 'fix npm install, npm install failed, EACCES npm, corrupted cache, RinaWarp',
    eyebrow: 'Install repairs',
    headline: 'Fix broken npm installs and get back to building.',
    lede:
      'When `npm install` fails, you cannot run anything else. RinaWarp focuses on restoring a clean dependency tree so build and test commands work again.',
    problemTitle: 'Install failures block every other task',
    problemBody:
      'Network blips, native module builds, and postinstall scripts all surface as install errors. The goal is a reproducible install path — usually `npm ci` on a correct lockfile.',
    symptoms: [
      'Install hangs or fails on postinstall scripts',
      'EACCES or permission errors writing to node_modules',
      'Integrity checksum failures or tarball errors',
      'Engine/node version mismatch warnings treated as errors',
    ],
    commonCauses: [
      'Lockfile out of date vs package.json',
      'Corrupted npm cache or partial node_modules',
      'Native addon build missing system toolchain',
      'Registry proxy or offline mirror misconfiguration',
    ],
    rinaApproach: [
      'Diagnose whether the failure is network, permissions, native build, or resolution',
      'Clean install path: remove node_modules, use lockfile, retry',
      'Fix package.json scripts or versions if postinstall is broken',
      'Verify with build/test after install succeeds',
    ],
    beforeLabel: 'Before',
    beforeOutput: `npm install
npm ERR! code ENOENT
npm ERR! syscall open postinstall.js
npm ERR! command failed`,
    afterLabel: 'After verification',
    afterOutput: `Removed broken postinstall hook
Regenerated lockfile from package.json
npm ci — completed
npm test — passed`,
    relatedPaths: [
      { href: '/fix-node-dependency-conflicts', label: 'Dependency conflicts' },
      { href: '/fix-react-build-errors', label: 'React build errors' },
      { href: '/fix-vite-projects', label: 'Vite projects' },
    ],
  },
  {
    path: '/fix-docker-issues',
    title: 'Fix Docker Build and Compose Failures | RinaWarp Terminal Pro',
    description:
      'Fix Docker build failures, compose errors, missing context paths, and image dependency issues. RinaWarp repairs the repo and verifies docker build or compose.',
    keywords: 'fix docker build failed, docker compose error, dockerfile fix, RinaWarp',
    eyebrow: 'Docker repairs',
    headline: 'Fix Docker build and compose failures in your repo.',
    lede:
      'When `docker build` or `docker compose up` fails, the fix is often Dockerfile syntax, build context, env files, or service dependencies — not just the last error line.',
    problemTitle: 'Docker failures hide upstream project issues',
    problemBody:
      'Container builds still depend on your application compiling and installing dependencies. A broken Node or Python layer inside Docker usually mirrors a broken host build.',
    symptoms: [
      'docker build fails on COPY or RUN npm ci',
      'compose service unhealthy — dependency not ready',
      'Image tag mismatch between compose and CI',
      'Build context includes node_modules and blows cache or fails',
    ],
    commonCauses: [
      'Dockerfile order invalidates cache on every change',
      'Missing multi-stage build for TypeScript compile step',
      '.dockerignore missing large folders',
      'Env vars not passed into build args or runtime',
    ],
    rinaApproach: [
      'Read Dockerfile, compose, and project build scripts together',
      'Fix application build first when the failure is compile/install',
      'Adjust Dockerfile stages, context, and ignore rules',
      'Verify with docker build or compose and capture exit code 0',
    ],
    beforeLabel: 'Before',
    beforeOutput: `docker compose build
failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1`,
    afterLabel: 'After verification',
    afterOutput: `Fixed app build (TypeScript + deps)
Updated Dockerfile COPY order
docker compose build — success
Health check passed`,
    relatedPaths: [
      { href: '/fix-node-dependency-conflicts', label: 'Dependency conflicts' },
      { href: '/fix-typescript-errors', label: 'TypeScript errors' },
      { href: '/fix-npm-install-errors', label: 'npm install errors' },
    ],
  },
]

const SEO_LANDING_BY_PATH = new Map(SEO_LANDING_PAGES.map((p) => [p.path, p]))

export function getSeoLandingPage(path) {
  const normalized = path === '/' ? '/' : path.replace(/\/$/, '')
  return SEO_LANDING_BY_PATH.get(normalized)
}

export function buildSeoLandingPageHtml(page) {
  const related = page.relatedPaths
    .map((r) => `<a href="${r.href}">${r.label}</a>`)
    .join(' · ')

  return `
    <section class="section">
      <p class="section-copy">${page.problemBody}</p>
      <h2 class="section-title">${page.problemTitle}</h2>
    </section>

    <section class="section">
      <h2 class="section-title">Symptoms we see often</h2>
      <ul class="feature-list">
        ${page.symptoms.map((s) => `<li>${s}</li>`).join('')}
      </ul>
    </section>

    <section class="section">
      <h2 class="section-title">Common causes</h2>
      <ul class="feature-list">
        ${page.commonCauses.map((s) => `<li>${s}</li>`).join('')}
      </ul>
    </section>

    <section class="section">
      <h2 class="section-title">How RinaWarp fixes it</h2>
      <p class="section-copy">Fix Project runs on your machine against the real repo — not a pasted snippet in a chat window.</p>
      <ul class="feature-list">
        ${page.rinaApproach.map((s) => `<li>${s}</li>`).join('')}
      </ul>
      <div class="cta-row" style="margin-top:20px">
        <a href="/download" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="seo_landing" data-analytics-prop-target="download">Download Free</a>
        <a href="https://rinawarptech.com/#demo" class="btn btn-secondary">Watch Demo</a>
      </div>
    </section>

    <section class="section section-proof">
      <h2 class="section-title">Before and after</h2>
      <p class="section-copy">Representative terminal output — your project will differ, but the verification pattern should look like this.</p>
      <div class="proof-grid">
        <article class="proof-item bad">
          <div class="kicker">${page.beforeLabel}</div>
          <pre>${page.beforeOutput}</pre>
        </article>
        <article class="proof-item good">
          <div class="kicker">${page.afterLabel}</div>
          <pre>${page.afterOutput}</pre>
        </article>
      </div>
      <div class="screenshot-frame" style="margin-top:20px">
        <img src="/assets/img/terminal-pro-agent-thread.png" alt="Current RinaWarp Terminal Pro Agent Thread interface" loading="lazy" decoding="async">
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Related fixes</h2>
      <p class="section-copy">${related}</p>
    </section>

    <section class="section">
      <div class="panel stack">
        <h2 class="section-title">Try it on your broken project</h2>
        <p class="section-copy">Free tier includes daily Fix Project runs on small and medium repos. Pro ($15/mo) removes limits for serious individual use.</p>
        <div class="cta-row">
          <a href="/download" class="btn btn-primary" data-analytics-event="site_download_clicked" data-analytics-prop-placement="seo_landing_footer" data-analytics-prop-target="download">Download Free</a>
          <a href="/pricing" class="btn btn-secondary">See pricing</a>
        </div>
      </div>
    </section>
  `
}
