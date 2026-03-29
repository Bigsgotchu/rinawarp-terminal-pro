const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { loadWithVscodeStub } = require('./helpers/load-module.cjs');

const distPath = (...parts) => path.join(__dirname, '..', 'dist', ...parts);

function createVscodeStub(workspaceFolder) {
  return {
    workspace: {
      workspaceFolders: workspaceFolder ? [{ name: path.basename(workspaceFolder), uri: { fsPath: workspaceFolder } }] : undefined,
    },
  };
}

function createOutputChannel() {
  const lines = [];
  return {
    lines,
    clear() {
      lines.length = 0;
    },
    appendLine(line) {
      lines.push(line);
    },
    show() {},
  };
}

async function createWorkspace(structure) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rinawarp-companion-diagnostic-'));

  for (const [relativePath, content] of Object.entries(structure)) {
    const target = path.join(root, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf8');
  }

  return root;
}

async function runDiagnosticForWorkspace(structure) {
  const root = await createWorkspace(structure);
  const output = createOutputChannel();
  const diagnostics = loadWithVscodeStub(distPath('diagnostics.js'), createVscodeStub(root));
  const summary = await diagnostics.runWorkspaceDiagnostic(output);
  return { output, root, summary };
}

test('runWorkspaceDiagnostic requires an open workspace', async () => {
  const diagnostics = loadWithVscodeStub(distPath('diagnostics.js'), createVscodeStub(undefined));
  const output = createOutputChannel();

  await assert.rejects(
    () => diagnostics.runWorkspaceDiagnostic(output),
    /Open a workspace folder before running the free diagnostic\./i,
  );
});

test('runWorkspaceDiagnostic recommends docker-repair when Docker assets are present', async () => {
  const { output, summary } = await runDiagnosticForWorkspace({
    'Dockerfile': 'FROM node:20\nEXPOSE 3000\nCMD ["npm","start"]\n',
    'package.json': JSON.stringify({ name: 'demo-app', scripts: { start: 'node server.js' } }, null, 2),
  });

  assert.equal(summary.recommendedPack, 'docker-repair');
  assert.match(summary.recommendedReason, /Docker assets are present/i);
  assert.match(summary.proofSummary, /Recommended next pack: docker-repair/i);
  assert.ok(output.lines.some((line) => /Open pack: docker-repair/i.test(line)));
  assert.ok(summary.findings.some((line) => /Docker assets: present/i.test(line)));
});

test('runWorkspaceDiagnostic recommends npm-audit when a package manager lockfile is present', async () => {
  const { summary } = await runDiagnosticForWorkspace({
    'package.json': JSON.stringify({ name: 'demo-app', scripts: { build: 'tsc' } }, null, 2),
    'pnpm-lock.yaml': 'lockfileVersion: 9.0\n',
  });

  assert.equal(summary.recommendedPack, 'npm-audit');
  assert.match(summary.recommendedReason, /package manager is present/i);
  assert.ok(summary.findings.some((line) => /Package manager hints: pnpm lockfile detected/i.test(line)));
});

test('runWorkspaceDiagnostic recommends security-audit for CI or environment signals without stronger package-manager signals', async () => {
  const { summary } = await runDiagnosticForWorkspace({
    '.env': 'API_KEY=secret\n',
    '.github/workflows/ci.yml': 'name: ci\n',
  });

  assert.equal(summary.recommendedPack, 'security-audit');
  assert.match(summary.recommendedReason, /Environment or CI files are present/i);
  assert.ok(summary.findings.some((line) => /CI workflows: present/i.test(line)));
  assert.ok(summary.findings.some((line) => /Environment file: present/i.test(line)));
});

test('runWorkspaceDiagnostic recommends test-runner when tests are the strongest remaining signal', async () => {
  const { summary } = await runDiagnosticForWorkspace({
    'package.json': JSON.stringify({ name: 'demo-app', scripts: { test: 'vitest run' } }, null, 2),
    'tests/example.test.ts': 'export {};\n',
  });

  assert.equal(summary.recommendedPack, 'test-runner');
  assert.match(summary.recommendedReason, /workspace appears to have tests/i);
  assert.ok(summary.findings.some((line) => /Tests: present/i.test(line)));
});

test('runWorkspaceDiagnostic falls back to system-diagnostics when no stronger signal exists', async () => {
  const { output, summary } = await runDiagnosticForWorkspace({
    'README.md': '# Demo\n\nA tiny project.\n',
  });

  assert.equal(summary.recommendedPack, 'system-diagnostics');
  assert.match(summary.recommendedReason, /No stronger pack signal was found/i);
  assert.match(output.lines.join('\n'), /Proof-backed diagnostic summary/i);
});
