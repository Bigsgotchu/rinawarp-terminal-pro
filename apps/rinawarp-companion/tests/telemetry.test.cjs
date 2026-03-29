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

  return {
    env: {
      isTelemetryEnabled: true,
      ...overrides.env,
    },
    workspace: {
      getConfiguration: () => ({
        get: (key, fallback) => (key in configValues ? configValues[key] : fallback),
      }),
    },
  };
}

function createOutputChannel() {
  const lines = [];
  return {
    lines,
    appendLine(line) {
      lines.push(line);
    },
  };
}

test('TelemetryService records a minimal event line when telemetry is enabled', () => {
  const stubVscode = createVscodeStub({
    configValues: { enableTelemetry: true },
    env: { isTelemetryEnabled: true },
  });
  const telemetry = loadWithVscodeStub(distPath('telemetry.js'), stubVscode);
  const output = createOutputChannel();
  const service = new telemetry.TelemetryService(output);

  service.record({
    name: 'chat_prompt_sent',
    properties: { plan: 'free', hasWorkspace: 'yes' },
  });

  assert.equal(output.lines.length, 1);
  assert.match(output.lines[0], /^\[telemetry\] \d{4}-\d{2}-\d{2}T.* chat_prompt_sent /);
  assert.match(output.lines[0], /"plan":"free"/);
  assert.match(output.lines[0], /"hasWorkspace":"yes"/);
});

test('TelemetryService does not record when extension telemetry is disabled in config', () => {
  const stubVscode = createVscodeStub({
    configValues: { enableTelemetry: false },
    env: { isTelemetryEnabled: true },
  });
  const telemetry = loadWithVscodeStub(distPath('telemetry.js'), stubVscode);
  const output = createOutputChannel();
  const service = new telemetry.TelemetryService(output);

  service.record({ name: 'chat_response_received', properties: { mode: 'model', plan: 'pro' } });

  assert.deepEqual(output.lines, []);
});

test('TelemetryService does not record when VS Code telemetry is disabled', () => {
  const stubVscode = createVscodeStub({
    configValues: { enableTelemetry: true },
    env: { isTelemetryEnabled: false },
  });
  const telemetry = loadWithVscodeStub(distPath('telemetry.js'), stubVscode);
  const output = createOutputChannel();
  const service = new telemetry.TelemetryService(output);

  service.record({ name: 'upgrade_clicked', properties: { placement: 'command' } });

  assert.deepEqual(output.lines, []);
});

test('recordTelemetry delegates to the configured singleton service', () => {
  const stubVscode = createVscodeStub({
    configValues: { enableTelemetry: true },
    env: { isTelemetryEnabled: true },
  });
  const telemetry = loadWithVscodeStub(distPath('telemetry.js'), stubVscode);
  const output = createOutputChannel();
  telemetry.setTelemetryService(new telemetry.TelemetryService(output));

  telemetry.recordTelemetry({ name: 'chat_cleared' });

  assert.equal(output.lines.length, 1);
  assert.match(output.lines[0], /chat_cleared$/);
});
