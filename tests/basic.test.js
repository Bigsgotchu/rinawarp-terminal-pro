/**
 * RinaWarp Terminal - Basic Tests
 * Copyright (c) 2025 RinaWarp Technologies
 */

describe('RinaWarp Terminal - Basic Tests', () => {
  it('should pass basic sanity check', () => {
    expect(true).toBe(true);
  });

  it('should have correct environment setup', () => {
    expect(typeof global.fetch).toBe('function');
    expect(typeof global.localStorage).toBe('object');
    expect(typeof global.window).toBe('object');
  });

  it('should validate package.json structure', () => {
    const packageJson = require('../package.json');
    expect(packageJson.name).toBe('rinawarp-terminal');
    expect(packageJson.version).toBeDefined();
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.dependencies).toBeDefined();
  });

  it('should verify server.js exists', () => {
    const fs = require('fs');
    const path = require('path');
    const serverPath = path.join(__dirname, '..', 'server.js');
    expect(fs.existsSync(serverPath)).toBe(true);
  });
});
