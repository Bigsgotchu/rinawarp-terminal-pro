/**
 * RinaWarp Terminal - Main.Test
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
const path = require('path');
const fs = require('fs');

describe('RinaWarp Terminal Main Process', () => {
  test('main.js exists and is readable', () => {
    const mainPath = path.join(__dirname, '..', 'src', 'main.js');
    expect(fs.existsSync(mainPath)).toBe(true);
    expect(fs.statSync(mainPath).isFile()).toBe(true);
  });

  test('package.json contains required fields', () => {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = require(packagePath);

    expect(packageJson.name).toBeDefined();
    expect(packageJson.version).toBeDefined();
    expect(packageJson.main).toBeDefined();
    expect(packageJson.description).toBeDefined();
  });

  test('application directories exist', () => {
    const srcPath = path.join(__dirname, '..', 'src');
    const assetsPath = path.join(__dirname, '..', 'assets');

    expect(fs.existsSync(srcPath)).toBe(true);
    expect(fs.existsSync(assetsPath)).toBe(true);
  });

  test('critical source files exist', () => {
    const mainJs = path.join(__dirname, '..', 'src', 'main.js');
    const rendererDir = path.join(__dirname, '..', 'src', 'renderer');
    const integrationDir = path.join(__dirname, '..', 'src', 'integration-layer');

    expect(fs.existsSync(mainJs)).toBe(true);
    expect(fs.existsSync(rendererDir)).toBe(true);
    expect(fs.existsSync(integrationDir)).toBe(true);
  });
});
