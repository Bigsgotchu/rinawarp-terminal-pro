const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');

const { loadWithVscodeStub } = require('./helpers/load-module.cjs');

const distPath = (...parts) => path.join(__dirname, '..', 'dist', ...parts);

function createVscodeStub(overrides = {}) {
  const configValues = {
    apiBaseUrl: 'https://api.rinawarptech.com',
    baseUrl: 'https://www.rinawarptech.com',
    enableTelemetry: true,
    ...overrides.configValues,
  };

  return {
    env: {
      isTelemetryEnabled: true,
      ...overrides.env,
    },
    workspace: {
      getConfiguration: () => ({
        get: (key, fallback) => (key in configValues ? configValues[key] : fallback),
      }),
      workspaceFolders: overrides.workspaceFolders,
      isTrusted: true,
      ...overrides.workspace,
    },
    Uri: {
      file: (value) => ({ fsPath: value }),
      parse: (value) => ({ toString: () => value }),
    },
    commands: {
      executeCommand: async () => undefined,
      ...overrides.commands,
    },
    window: {
      showWarningMessage: async () => undefined,
      showInformationMessage: async () => undefined,
      createOutputChannel: () => ({ appendLine() {}, clear() {}, show() {} }),
      ...overrides.window,
    },
  };
}

function createSecretStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    async get(key) {
      return values.get(key);
    },
    async store(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    },
    dump() {
      return Object.fromEntries(values.entries());
    },
  };
}

function createWebviewView() {
  let handler = async () => undefined;
  const posted = [];

  return {
    posted,
    webview: {
      options: undefined,
      html: '',
      async postMessage(message) {
        posted.push(message);
        return true;
      },
      onDidReceiveMessage(nextHandler) {
        handler = nextHandler;
        return { dispose() {} };
      },
      async simulateMessage(message) {
        await handler(message);
      },
    },
  };
}

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function serialTest(name, fn) {
  return test(name, { concurrency: false }, fn);
}

serialTest('workspace context heuristics recommend the strongest pack and relevant file', () => {
  const stubVscode = createVscodeStub();
  const workspaceContext = loadWithVscodeStub(distPath('workspaceContext.js'), stubVscode);

  const context = {
    hasWorkspace: true,
    markers: ['docker', 'node-project', 'tests'],
    summary: 'Workspace: demo.',
    fileSummaries: [
      { name: 'Dockerfile', path: '/tmp/Dockerfile', summary: 'Dockerfile summary' },
      { name: 'package.json', path: '/tmp/package.json', summary: 'package summary' },
      { name: 'README.md', path: '/tmp/README.md', summary: 'readme summary' },
    ],
    packageScripts: ['build', 'test'],
    packageManagerHint: 'pnpm',
  };

  const ranked = workspaceContext.rankPackCandidates(context);
  assert.equal(ranked[0].pack, 'docker-repair');
  assert.match(ranked[0].reason, /docker/i);

  const recommendation = workspaceContext.inferRecommendedPack(context);
  const relevantFile = workspaceContext.findRelevantConfigFile(context, recommendation);
  assert.equal(recommendation.pack, 'docker-repair');
  assert.equal(relevantFile?.name, 'Dockerfile');

  const requested = workspaceContext.findRequestedFile('please inspect package json', context.fileSummaries);
  assert.equal(requested?.name, 'package.json');
});

serialTest('workspace context answers local workspace questions and ignores generic chat', async () => {
  const stubVscode = createVscodeStub();
  const workspaceContext = loadWithVscodeStub(distPath('workspaceContext.js'), stubVscode);

  const context = {
    hasWorkspace: true,
    workspaceName: 'demo',
    markers: ['node-project', 'tests'],
    summary: 'Workspace: demo. Scripts: build, test.',
    topLevelEntries: ['package.json', 'tests', 'README.md'],
    packageScripts: ['build', 'test'],
    dependencyNames: ['react'],
    devDependencyNames: ['vitest'],
    fileSummaries: [{ name: 'README.md', path: '/tmp/README.md', summary: 'README summary: title=Demo' }],
  };

  assert.equal(workspaceContext.canAnswerLocally('what scripts do you see here'), true);
  assert.equal(workspaceContext.canAnswerLocally('tell me a joke'), false);

  const answer = await workspaceContext.answerWorkspaceQuestion('what scripts do you see here', context);
  assert.match(answer, /build, test/i);

  const summary = await workspaceContext.answerWorkspaceQuestion('summarize this repo', context);
  assert.match(summary, /Decision card/i);
  assert.match(summary, /test coverage present/i);

  const risks = await workspaceContext.answerWorkspaceQuestion('what should I watch out for here', context);
  assert.match(risks, /Risks to watch/i);
});

serialTest('chat action selection prefers inspection and explicit workflow intents', () => {
  const stubVscode = createVscodeStub();
  const chat = loadWithVscodeStub(distPath('chat.js'), stubVscode);

  const actions = [
    { command: 'rinawarp.openPacks', label: 'Open Packs' },
    { command: 'rinawarp.openWorkspaceFile', label: 'Inspect package.json', args: ['/tmp/package.json'] },
    { command: 'rinawarp.runFreeDiagnostic', label: 'Run Free Diagnostic' },
    { command: 'rinawarp.upgradeToPro', label: 'Upgrade to Pro' },
  ];

  assert.equal(chat.isApprovalPrompt('yes do it'), true);
  assert.equal(chat.isApprovalPrompt('maybe later'), false);
  assert.equal(chat.pickPrimaryAction(actions).command, 'rinawarp.openWorkspaceFile');
  assert.equal(chat.pickActionForPrompt('inspect it', actions).command, 'rinawarp.openWorkspaceFile');
  assert.equal(chat.pickActionForPrompt('run the diagnostic', actions).command, 'rinawarp.runFreeDiagnostic');
  assert.equal(chat.pickActionForPrompt('upgrade me', actions).command, 'rinawarp.upgradeToPro');
});

serialTest('chat API client requires auth and sends the expected payload shape', async () => {
  const stubVscode = createVscodeStub({
    configValues: {
      baseUrl: 'https://www.rinawarptech.com/',
      apiBaseUrl: 'https://api.rinawarptech.com/',
      enableTelemetry: true,
    },
  });
  const { CompanionChatApiClient } = loadWithVscodeStub(distPath('chatApi.js'), stubVscode);

  const unauthenticatedClient = new CompanionChatApiClient({
    getSessionToken: async () => undefined,
  });

  await assert.rejects(
    () =>
      unauthenticatedClient.sendChat({
        messages: [],
        snapshot: { plan: 'free' },
      }),
    /Connect your account before chatting with Rina\./i,
  );

  const fetchCalls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, init) => {
    fetchCalls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ message: 'ok', mode: 'model', actions: [] }),
    };
  };

  try {
    const client = new CompanionChatApiClient({
      getSessionToken: async () => 'session-token',
    });

    const reply = await client.sendChat({
      messages: [{ role: 'user', content: 'What should I do next?' }],
      snapshot: { plan: 'pro' },
      diagnostic: {
        findings: ['Node project: yes'],
        recommendedPack: 'npm-audit',
        recommendedReason: 'Package manager detected.',
        workspaceName: 'demo',
      },
      workspaceContext: {
        hasWorkspace: true,
        markers: ['node-project'],
        packageManagerHint: 'pnpm',
        packageName: 'demo',
        packageScripts: ['build', 'test'],
        summary: 'Workspace: demo.',
        topLevelEntries: ['package.json'],
        workspaceName: 'demo',
      },
    });

    assert.equal(reply.message, 'ok');
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, 'https://www.rinawarptech.com/api/vscode/chat');
    assert.equal(fetchCalls[0].init.headers.Authorization, 'Bearer session-token');

    const body = JSON.parse(fetchCalls[0].init.body);
    assert.equal(body.client.product, 'rinawarp-companion');
    assert.equal(body.workspaceContext.plan, 'pro');
    assert.equal(body.workspaceContext.workspaceName, 'demo');
    assert.equal(body.workspaceContext.diagnostic.recommendedPack, 'npm-audit');
  } finally {
    global.fetch = originalFetch;
  }
});

serialTest('chat provider blocks send when the user is not connected', async () => {
  const stubVscode = createVscodeStub();
  const { CompanionChatProvider } = loadWithVscodeStub(distPath('chat.js'), stubVscode);
  const context = { secrets: createSecretStorage() };
  const client = {
    async sendChat() {
      throw new Error('sendChat should not be called when disconnected');
    },
  };

  const provider = new CompanionChatProvider(context, { path: '/extension' }, { plan: 'free', packs: [], updatedAt: '', email: undefined }, client);
  const view = createWebviewView();
  provider.resolveWebviewView(view);
  await flushMicrotasks();

  await view.webview.simulateMessage({ type: 'send', text: 'What should I do first?' });
  await flushMicrotasks();

  const lastState = view.posted.at(-1).value;
  assert.equal(lastState.isConnected, false);
  assert.equal(lastState.lastError, 'Connect your RinaWarp account before using chat.');
  assert.equal(lastState.messages.length, 0);
});

serialTest('chat provider answers local workspace questions and stages a follow-up action', async () => {
  const stubVscode = createVscodeStub({
    workspaceFolders: undefined,
  });
  const { CompanionChatProvider } = loadWithVscodeStub(distPath('chat.js'), stubVscode);
  const context = { secrets: createSecretStorage() };
  const client = {
    async sendChat() {
      throw new Error('local-answer path should not call remote chat');
    },
  };

  const provider = new CompanionChatProvider(
    context,
    { path: '/extension' },
    { plan: 'free', packs: [], updatedAt: '', email: 'user@example.com' },
    client,
  );
  const view = createWebviewView();
  provider.resolveWebviewView(view);
  await flushMicrotasks();

  await view.webview.simulateMessage({ type: 'send', text: 'what scripts do you see here' });
  await flushMicrotasks();

  const lastState = view.posted.at(-1).value;
  assert.equal(lastState.lastError, undefined);
  assert.equal(lastState.pending, false);
  assert.equal(lastState.messages.length, 2);
  assert.match(lastState.messages[1].content, /No workspace folder is open right now/i);
  assert.equal(lastState.messages[1].actions.some((action) => action.command === 'rinawarp.upgradeToPro'), true);
  assert.equal(lastState.nextActionLabel, 'Open system-diagnostics');
});

serialTest('workspace context recommends a starter file for local reasoning prompts', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rinawarp-chat-'));
  await fs.writeFile(
    path.join(tempRoot, 'package.json'),
    JSON.stringify({ name: 'demo', scripts: { build: 'tsc', test: 'node --test' } }, null, 2),
  );
  await fs.writeFile(path.join(tempRoot, 'README.md'), '# Demo\n\nWorkspace summary file.\n');

  const stubVscode = createVscodeStub({
    workspaceFolders: [{ name: 'demo', uri: { fsPath: tempRoot } }],
  });
  const workspaceContext = loadWithVscodeStub(distPath('workspaceContext.js'), stubVscode);

  try {
    const context = await workspaceContext.gatherWorkspaceContext();
    const recommendation = workspaceContext.inferRecommendedPack(context);
    const file = workspaceContext.findRelevantConfigFile(context, recommendation);
    const answer = await workspaceContext.answerWorkspaceQuestion('what file should I inspect first', context);

    assert.equal(file?.name, 'package.json');
    assert.match(answer, /Best first file: package\.json/i);
    assert.match(answer, /Run the free diagnostic/i);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

serialTest('chat provider routes action clicks into VS Code commands', async () => {
  const executed = [];
  const stubVscode = createVscodeStub({
    commands: {
      async executeCommand(command, ...args) {
        executed.push({ command, args });
      },
    },
  });
  const { CompanionChatProvider } = loadWithVscodeStub(distPath('chat.js'), stubVscode);
  const context = { secrets: createSecretStorage() };

  const provider = new CompanionChatProvider(
    context,
    { path: '/extension' },
    { plan: 'pro', packs: [], updatedAt: '', email: 'user@example.com' },
    { async sendChat() { return { message: 'ok', actions: [] }; } },
  );
  const view = createWebviewView();
  provider.resolveWebviewView(view);
  await flushMicrotasks();

  await view.webview.simulateMessage({
    type: 'action',
    command: 'rinawarp.openPack',
    args: ['docker-repair', 'chat_local_tool'],
  });
  await flushMicrotasks();

  assert.deepEqual(executed, [
    {
      command: 'rinawarp.openPack',
      args: ['docker-repair', 'chat_local_tool'],
    },
  ]);
});

serialTest('chat provider clears conversation state and staged action', async () => {
  const stubVscode = createVscodeStub({
    workspaceFolders: undefined,
  });
  const { CompanionChatProvider } = loadWithVscodeStub(distPath('chat.js'), stubVscode);
  const secrets = createSecretStorage();
  const context = { secrets };

  const provider = new CompanionChatProvider(
    context,
    { path: '/extension' },
    { plan: 'free', packs: [], updatedAt: '', email: 'user@example.com' },
    { async sendChat() { return { message: 'ok', actions: [] }; } },
  );
  const view = createWebviewView();
  provider.resolveWebviewView(view);
  await flushMicrotasks();

  await view.webview.simulateMessage({ type: 'send', text: 'what scripts do you see here' });
  await flushMicrotasks();
  await view.webview.simulateMessage({ type: 'clear' });
  await flushMicrotasks();

  const lastState = view.posted.at(-1).value;
  assert.equal(lastState.messages.length, 0);
  assert.equal(lastState.nextActionLabel, undefined);

  const stored = JSON.parse(secrets.dump()['rinawarp.chatState']);
  assert.deepEqual(stored.messages, []);
  assert.equal(stored.stagedAction, undefined);
});

serialTest('chat provider surfaces remote failures as system messages', async () => {
  const stubVscode = createVscodeStub({
    workspaceFolders: undefined,
  });
  const { CompanionChatProvider } = loadWithVscodeStub(distPath('chat.js'), stubVscode);
  const context = { secrets: createSecretStorage() };

  const provider = new CompanionChatProvider(
    context,
    { path: '/extension' },
    { plan: 'pro', packs: [], updatedAt: '', email: 'user@example.com' },
    {
      async sendChat() {
        throw new Error('Remote service unavailable');
      },
    },
  );
  const view = createWebviewView();
  provider.resolveWebviewView(view);
  await flushMicrotasks();

  await view.webview.simulateMessage({ type: 'send', text: 'tell me a joke' });
  await flushMicrotasks();

  const lastState = view.posted.at(-1).value;
  assert.equal(lastState.lastError, 'Remote service unavailable');
  assert.equal(lastState.messages.length, 2);
  assert.equal(lastState.messages[1].role, 'system');
  assert.match(lastState.messages[1].content, /could not answer right now: Remote service unavailable/i);
});
