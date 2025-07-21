/**
 * Vendor Entry Point
 * Bundles all external dependencies that were previously loaded from CDN
 */

// XTerm.js and addons - core terminal functionality
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

// Monaco Editor for advanced text editing
import * as monaco from 'monaco-editor';

// Core browser polyfills
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// CSS frameworks and themes
import './vendor-styles.css';

// Export everything to global scope for UMD compatibility
if (typeof window !== 'undefined') {
  // XTerm.js global exports
  window.Terminal = Terminal;
  window.FitAddon = FitAddon;
  window.WebLinksAddon = WebLinksAddon;
  
  // Monaco Editor global export
  window.monaco = monaco;
  
  // Version info
  window.RinaWarpVendor = {
    version: '1.0.19',
    buildDate: typeof process !== 'undefined' ? process.env.BUILD_DATE : 'Unknown',
    components: {
      xterm: Terminal.prototype.constructor.name,
      monaco: monaco.editor ? 'loaded' : 'failed'
    }
  };
  
  console.log('🦾 RinaWarp Vendor Bundle loaded:', window.RinaWarpVendor);
}

// ES Module exports
export {
  Terminal,
  FitAddon,
  WebLinksAddon,
  monaco
};
