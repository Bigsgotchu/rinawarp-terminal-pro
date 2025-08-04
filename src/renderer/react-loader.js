/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// React loader for Electron
// This file helps load React properly in the Electron renderer process

const _path = require('node:path');

// Function to load React from node_modules
function loadReact() {
  try {
    // Try to load React from node_modules
    const reactPath = require.resolve('react');
    const reactDOMPath = require.resolve('react-dom');

    // Load React modules
    window.React = require(reactPath);
    window.ReactDOM = require(reactDOMPath);

    return true;
  } catch (error) {
    console.error('Failed to load React from node_modules:', error);
    return false;
  }
}

// Export the loader function
module.exports = { loadReact };
