const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadWithVscodeStub } = require('./helpers/load-module.cjs');

const distPath = (...parts) => path.join(__dirname, '..', 'dist', ...parts);

function createVscodeStub(overrides = {}) {
  const configValues = {
    apiBaseUrl: 'https://api.rinawarptech.com',
    baseUrl: 'https://www.rinawarptech.com',
    enableTelemetry: true,
    ...overrides.configValues,
  };

  class TreeItem {
    constructor(label, collapsibleState) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  }

  class EventEmitter {
    constructor() {
      this.event = () => ({ dispose() {} });
    }

    fire() {}
  }

  return {
    workspace: {
      getConfiguration: () => ({
        get: (key, fallback) => (key in configValues ? configValues[key] : fallback),
      }),
      ...overrides.workspace,
    },
    EventEmitter,
    TreeItem,
    TreeItemCollapsibleState: {
      None: 0,
    },
    ...overrides.extra,
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

function createContext(initialSecrets = {}) {
  return {
    secrets: createSecretStorage(initialSecrets),
  };
}

function createOutput() {
  const lines = [];
  return {
    lines,
    appendLine(line) {
      lines.push(line);
    },
  };
}

function serialTest(name, fn) {
  return test(name, { concurrency: false }, fn);
}

serialTest('refreshFromApi succeeds from the primary endpoint and stores a clean snapshot', async () => {
  const entitlementsModule = loadWithVscodeStub(
    distPath('entitlements.js'),
    createVscodeStub(),
  );
  const context = createContext({ 'rinawarp.sessionToken': 'session-token' });
  const service = new entitlementsModule.EntitlementService(context);

  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    return {
      ok: true,
      json: async () => ({
        email: 'pro@example.com',
        plan: 'pro',
        packs: ['npm-audit', 'docker-repair'],
      }),
    };
  };

  try {
    const snapshot = await service.refreshFromApi();
    assert.equal(snapshot.plan, 'pro');
    assert.equal(snapshot.email, 'pro@example.com');
    assert.deepEqual(snapshot.packs, ['npm-audit', 'docker-repair']);
    assert.equal(snapshot.refreshStatus, 'idle');
    assert.equal(calls.length, 1);

    const stored = JSON.parse(context.secrets.dump()['rinawarp.entitlementSnapshot']);
    assert.equal(stored.plan, 'pro');
    assert.equal(stored.refreshStatus, undefined);
    assert.equal(stored.lastRefreshError, undefined);
  } finally {
    global.fetch = originalFetch;
  }
});

serialTest('refreshFromApi falls back to the secondary entitlement endpoint', async () => {
  const entitlementsModule = loadWithVscodeStub(
    distPath('entitlements.js'),
    createVscodeStub(),
  );
  const context = createContext({ 'rinawarp.sessionToken': 'session-token' });
  const service = new entitlementsModule.EntitlementService(context);

  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    if (calls.length === 1) {
      throw new Error('network unavailable');
    }
    return {
      ok: true,
      json: async () => ({ email: 'fallback@example.com', plan: 'team', packs: ['security-audit'] }),
    };
  };

  try {
    const snapshot = await service.refreshFromApi();
    assert.equal(snapshot.plan, 'team');
    assert.equal(snapshot.email, 'fallback@example.com');
    assert.equal(calls.length, 2);
    assert.match(calls[0], /api\.rinawarptech\.com/);
    assert.match(calls[1], /rinawarptech\.com\/api\/vscode\/entitlements/);
  } finally {
    global.fetch = originalFetch;
  }
});

serialTest('refreshFromApi accepts nested entitlement envelopes from the backend', async () => {
  const entitlementsModule = loadWithVscodeStub(
    distPath('entitlements.js'),
    createVscodeStub(),
  );
  const context = createContext({ 'rinawarp.sessionToken': 'session-token' });
  const service = new entitlementsModule.EntitlementService(context);

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      data: {
        email: 'nested@example.com',
        plan: 'pro',
        packs: ['npm-audit'],
        updatedAt: '2026-03-30T06:00:00.000Z',
      },
    }),
  });

  try {
    const snapshot = await service.refreshFromApi();
    assert.equal(snapshot.plan, 'pro');
    assert.equal(snapshot.email, 'nested@example.com');
    assert.deepEqual(snapshot.packs, ['npm-audit']);
    assert.equal(snapshot.updatedAt, '2026-03-30T06:00:00.000Z');
  } finally {
    global.fetch = originalFetch;
  }
});

serialTest('refreshFromApi accepts tier and enabledPacks aliases from the backend', async () => {
  const entitlementsModule = loadWithVscodeStub(
    distPath('entitlements.js'),
    createVscodeStub(),
  );
  const context = createContext({ 'rinawarp.sessionToken': 'session-token' });
  const service = new entitlementsModule.EntitlementService(context);

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      entitlements: {
        userEmail: 'aliases@example.com',
        tier: 'team',
        enabledPacks: {
          'docker-repair': true,
          'npm-audit': true,
          'security-audit': false,
        },
        refreshedAt: '2026-03-30T06:05:00.000Z',
      },
    }),
  });

  try {
    const snapshot = await service.refreshFromApi();
    assert.equal(snapshot.plan, 'team');
    assert.equal(snapshot.email, 'aliases@example.com');
    assert.deepEqual(snapshot.packs, ['docker-repair', 'npm-audit']);
    assert.equal(snapshot.updatedAt, '2026-03-30T06:05:00.000Z');
  } finally {
    global.fetch = originalFetch;
  }
});

serialTest('refreshFromApi classifies missing session tokens', async () => {
  const entitlementsModule = loadWithVscodeStub(
    distPath('entitlements.js'),
    createVscodeStub(),
  );
  const service = new entitlementsModule.EntitlementService(createContext());

  await assert.rejects(
    () => service.refreshFromApi(),
    (error) => error?.code === 'missing_token',
  );
});

serialTest('refreshFromApi classifies rejected sessions', async () => {
  const entitlementsModule = loadWithVscodeStub(
    distPath('entitlements.js'),
    createVscodeStub(),
  );
  const context = createContext({ 'rinawarp.sessionToken': 'session-token' });
  const service = new entitlementsModule.EntitlementService(context);

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 401,
  });

  try {
    await assert.rejects(
      () => service.refreshFromApi(),
      (error) => error?.code === 'auth_rejected',
    );
  } finally {
    global.fetch = originalFetch;
  }
});

serialTest('refreshFromApi classifies network failures when all endpoints are unavailable', async () => {
  const entitlementsModule = loadWithVscodeStub(
    distPath('entitlements.js'),
    createVscodeStub(),
  );
  const context = createContext({ 'rinawarp.sessionToken': 'session-token' });
  const service = new entitlementsModule.EntitlementService(context);

  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error('socket hang up');
  };

  try {
    await assert.rejects(
      () => service.refreshFromApi(),
      (error) => error?.code === 'endpoint_unavailable',
    );
  } finally {
    global.fetch = originalFetch;
  }
});

serialTest('refreshFromApi classifies malformed entitlement responses', async () => {
  const entitlementsModule = loadWithVscodeStub(
    distPath('entitlements.js'),
    createVscodeStub(),
  );
  const context = createContext({ 'rinawarp.sessionToken': 'session-token' });
  const service = new entitlementsModule.EntitlementService(context);

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ ok: true, data: { plan: 123, packs: 'npm-audit' } }),
  });

  try {
    await assert.rejects(
      () => service.refreshFromApi(),
      (error) => error?.code === 'malformed_response',
    );
  } finally {
    global.fetch = originalFetch;
  }
});

serialTest('runEntitlementRefresh preserves the previous snapshot on refresh failure', async () => {
  const stubVscode = createVscodeStub();
  const entitlementsModule = loadWithVscodeStub(distPath('entitlements.js'), stubVscode);
  const refreshFlow = loadWithVscodeStub(distPath('refreshFlow.js'), stubVscode);
  const output = createOutput();
  const states = [];
  let snapshot = {
    email: 'test2@example.com',
    plan: 'pro',
    packs: ['npm-audit'],
    updatedAt: '2026-03-30T00:00:00.000Z',
    refreshStatus: 'idle',
  };

  const result = await refreshFlow.runEntitlementRefresh({
    source: 'manual',
    entitlements: {
      refreshFromApi: async () => {
        throw new entitlementsModule.EntitlementRefreshError('endpoint_unavailable', 'api down');
      },
    },
    getSnapshot: () => snapshot,
    setSnapshot: (next) => {
      snapshot = next;
      states.push(next);
    },
    output,
  });

  assert.equal(result.ok, false);
  assert.equal(result.failureCode, 'endpoint_unavailable');
  assert.equal(snapshot.plan, 'pro');
  assert.equal(snapshot.email, 'test2@example.com');
  assert.equal(snapshot.refreshStatus, 'failed');
  assert.match(result.toastMessage, /Retry in a moment/i);
  assert.equal(states[0].refreshStatus, 'refreshing');
  assert.equal(states[1].refreshStatus, 'failed');
});

serialTest('runEntitlementRefresh reuses fallback callback data on auth refresh failure', async () => {
  const stubVscode = createVscodeStub();
  const entitlementsModule = loadWithVscodeStub(distPath('entitlements.js'), stubVscode);
  const refreshFlow = loadWithVscodeStub(distPath('refreshFlow.js'), stubVscode);
  let snapshot = entitlementsModule.defaultSnapshot();

  const result = await refreshFlow.runEntitlementRefresh({
    source: 'auth-callback',
    entitlements: {
      refreshFromApi: async () => {
        throw new entitlementsModule.EntitlementRefreshError('endpoint_unavailable', 'api down');
      },
    },
    getSnapshot: () => snapshot,
    setSnapshot: (next) => {
      snapshot = next;
    },
    output: createOutput(),
    fallbackSnapshot: {
      email: 'callback@example.com',
      plan: 'pro',
      packs: ['security-audit'],
      updatedAt: '2026-03-30T01:00:00.000Z',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(snapshot.email, 'callback@example.com');
  assert.equal(snapshot.plan, 'pro');
  assert.equal(snapshot.refreshStatus, 'failed');
  assert.match(result.toastMessage, /connected, but entitlements could not be fully verified yet/i);
});

serialTest('runEntitlementRefresh ignores duplicate refresh requests while a refresh is already in progress', async () => {
  const refreshFlow = loadWithVscodeStub(distPath('refreshFlow.js'), createVscodeStub());
  const snapshot = {
    email: 'busy@example.com',
    plan: 'pro',
    packs: [],
    updatedAt: '2026-03-30T00:00:00.000Z',
    refreshStatus: 'refreshing',
  };

  const result = await refreshFlow.runEntitlementRefresh({
    source: 'manual',
    entitlements: {
      refreshFromApi: async () => {
        throw new Error('should not run');
      },
    },
    getSnapshot: () => snapshot,
    setSnapshot: () => {
      throw new Error('should not update while already refreshing');
    },
    output: createOutput(),
  });

  assert.equal(result.ignored, true);
  assert.match(result.toastMessage, /already refreshing/i);
});

serialTest('sidebar renders refresh status labels for refreshing, stale, and current entitlement states', () => {
  const sidebarModule = loadWithVscodeStub(distPath('sidebar.js'), createVscodeStub());

  const refreshingProvider = new sidebarModule.CompanionTreeProvider({
    email: 'test2@example.com',
    plan: 'pro',
    packs: [],
    updatedAt: '2026-03-30T00:00:00.000Z',
    refreshStatus: 'refreshing',
  });
  const failedProvider = new sidebarModule.CompanionTreeProvider({
    email: 'test2@example.com',
    plan: 'pro',
    packs: [],
    updatedAt: '2026-03-30T00:00:00.000Z',
    refreshStatus: 'failed',
    lastRefreshError: 'RinaWarp could not reach the entitlement service.',
  });
  const currentProvider = new sidebarModule.CompanionTreeProvider({
    email: 'test2@example.com',
    plan: 'pro',
    packs: [],
    updatedAt: '2026-03-30T00:00:00.000Z',
    refreshStatus: 'idle',
    lastRefreshAttemptAt: '2026-03-30T01:00:00.000Z',
  });

  assert.equal(refreshingProvider.getChildren()[2].label, 'Entitlements: refreshing...');
  assert.match(failedProvider.getChildren()[2].label, /Entitlements: stale\./);
  assert.equal(currentProvider.getChildren()[2].label, 'Entitlements: current');
});
