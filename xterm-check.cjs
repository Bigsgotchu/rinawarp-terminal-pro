#!/usr/bin/env node

// Create global 'self' for browser-targeted UMD modules
global.self = global;

console.log('🔍 Testing XTerm Module Resolution...\n');

try {
  // Test core xterm
  console.log('Testing @xterm/xterm...');
  const xterm = require('@xterm/xterm');
  console.log('✅ Terminal:', typeof xterm.Terminal === 'function');
  console.log('   - Version info available:', !!xterm.Terminal.version || 'unknown');
  
  // Test fit addon
  console.log('\nTesting @xterm/addon-fit...');
  const fit = require('@xterm/addon-fit');
  console.log('✅ FitAddon:', typeof fit.FitAddon === 'function');
  
  // Test web-links addon
  console.log('\nTesting @xterm/addon-web-links...');
  const web = require('@xterm/addon-web-links');
  console.log('✅ WebLinksAddon:', typeof web.WebLinksAddon === 'function');
  
  console.log('\n🎉 All XTerm modules loaded successfully!');
  
  // Test instantiation
  console.log('\n🧪 Testing module instantiation...');
  try {
    const terminal = new xterm.Terminal({ rows: 24, cols: 80 });
    const fitAddon = new fit.FitAddon();
    const webLinksAddon = new web.WebLinksAddon();
    
    console.log('✅ Terminal instance created');
    console.log('✅ FitAddon instance created');  
    console.log('✅ WebLinksAddon instance created');
    
    // Clean up
    terminal.dispose();
    
  } catch (instErr) {
    console.log('⚠️  Instantiation test failed:', instErr.message);
  }
  
} catch (err) {
  console.log('❌ Module resolution failed:', err.message);
  console.log('Stack:', err.stack);
  process.exit(1);
}
