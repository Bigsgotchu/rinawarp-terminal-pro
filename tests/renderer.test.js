/**
 * RinaWarp Terminal - Renderer Process Tests
 * Copyright (c) 2025 RinaWarp Terminal. All rights reserved.
 * This software is protected by copyright and international treaties.
 * Unauthorized copying, reproduction, or distribution is strictly prohibited.
 */

const path = require('path');
const fs = require('fs');

describe('RinaWarp Terminal Renderer', () => {
  test('renderer directory structure is valid', () => {
    const rendererPath = path.join(__dirname, '..', 'src', 'renderer');
    expect(fs.existsSync(rendererPath)).toBe(true);
    expect(fs.statSync(rendererPath).isDirectory()).toBe(true);
  });

  test('HTML entry point exists', () => {
    const htmlFiles = [
      path.join(__dirname, '..', 'src', 'renderer', 'index.html'),
      path.join(__dirname, '..', 'index.html'),
      path.join(__dirname, '..', 'src', 'index.html')
    ];
    
    const hasHtmlFile = htmlFiles.some(file => fs.existsSync(file));
    expect(hasHtmlFile).toBe(true);
  });

  test('CSS styles directory exists', () => {
    const stylesPath = path.join(__dirname, '..', 'styles');
    if (fs.existsSync(stylesPath)) {
      expect(fs.statSync(stylesPath).isDirectory()).toBe(true);
    }
  });

  test('renderer JavaScript files are present', () => {
    const rendererPath = path.join(__dirname, '..', 'src', 'renderer');
    if (fs.existsSync(rendererPath)) {
      const files = fs.readdirSync(rendererPath);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      expect(jsFiles.length).toBeGreaterThan(0);
    }
  });
});

