#!/usr/bin/env node

/**
 * Apply RinaWarp Theme to Terminal
 * This script applies the custom RinaWarp branded theme
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to apply theme class to HTML files
function applyThemeToHTML(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if body tag exists and add theme class
    if (content.includes('<body')) {
      // Remove any existing theme classes
      content = content.replace(/class="[^"]*theme-[^"\s]*[^"]*"/g, (match) => {
        return match.replace(/theme-\S+/g, '').replace(/\s+/g, ' ').trim();
      });
      
      // Add RinaWarp theme class
      if (content.includes('class="')) {
        content = content.replace(/<body\s+class="([^"]*)"/, '<body class="$1 theme-rinawarp"');
      } else {
        content = content.replace(/<body(\s|>)/, '<body class="theme-rinawarp"$1');
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Applied RinaWarp theme to: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Function to update theme in JavaScript files
function updateThemeInJS(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update default theme references
    if (content.includes('currentTheme')) {
      content = content.replace(
        /this\.currentTheme\s*=\s*['"][^'"]+['"]/g,
        'this.currentTheme = \'rinawarp\''
      );
      
      // Add RinaWarp theme to themes object if not present
      if (!content.includes('rinawarp:') && content.includes('themes = {')) {
        const rinawarpTheme = `
      rinawarp: {
        name: 'RinaWarp',
        description: 'Official RinaWarp branded theme with vibrant gradients',
        background: 'linear-gradient(135deg, #FF1493 0%, #FF6B9D 25%, #00CED1 75%, #4169E1 100%)',
        terminalBackground: 'rgba(5, 5, 8, 0.95)',
        terminalBorder: 'rgba(255, 20, 147, 0.3)',
        foreground: '#FFFFFF',
        cursor: '#FF1493',
        selection: 'rgba(255, 20, 147, 0.2)',
        colors: {
          black: '#0a0a0f',
          red: '#FF1493',
          green: '#00FF88',
          yellow: '#FFD93D',
          blue: '#4169E1',
          magenta: '#9B59B6',
          cyan: '#00CED1',
          white: '#FFFFFF',
          brightBlack: '#2a2a33',
          brightRed: '#FF69B4',
          brightGreen: '#00FA9A',
          brightYellow: '#FFFF00',
          brightBlue: '#00BFFF',
          brightMagenta: '#DA70D6',
          brightCyan: '#48D1CC',
          brightWhite: '#FFFFFF',
        },
      },`;
        
        content = content.replace(/themes\s*=\s*{/, 'themes = {' + rinawarpTheme);
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated theme defaults in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Main execution
console.log('🎨 Applying RinaWarp Theme...\n');

// Apply to main HTML files
const htmlFiles = [
  'src/renderer/index.html',
  'src/terminal.html',
  'src/terminal-simple.html',
  'src/minimal-terminal.html',
  'demo-car-theme.html',
  'demo-car-standalone.html'
];

htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    applyThemeToHTML(filePath);
  }
});

// Update theme defaults in JS files
const jsFiles = [
  'src/renderer/terminal-themes.js',
  'src/themes/unified-theme-manager.js',
  'src/ui/modern-theme-system.js'
];

jsFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    updateThemeInJS(filePath);
  }
});

// Create a startup configuration to set the theme
const startupConfig = {
  defaultTheme: 'rinawarp',
  autoApplyTheme: true,
  themeSettings: {
    enableGradients: true,
    enableAnimations: true,
    enableGlow: true
  }
};

fs.writeFileSync(
  path.join(__dirname, 'config/theme-config.json'),
  JSON.stringify(startupConfig, null, 2),
  'utf8'
);

console.log('\n✨ RinaWarp theme has been applied!');
console.log('🚀 The terminal will now use the RinaWarp branded theme by default.');
console.log('\nTo see the changes:');
console.log('1. Restart the terminal application');
console.log('2. Or reload the page if running in browser');
console.log('\nThe theme includes:');
console.log('- Vibrant gradient backgrounds');
console.log('- Hot pink and teal accents');
console.log('- Animated hover effects');
console.log('- Glowing focus states');
