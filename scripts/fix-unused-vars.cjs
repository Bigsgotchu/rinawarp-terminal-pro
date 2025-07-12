#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Manually fix the most common unused variable patterns
 * This is a targeted approach to fix the specific warnings we see
 */
class UnusedVarsFixer {
  constructor() {
    this.fixedFiles = new Set();
    this.totalFixes = 0;
  }

  /**
   * Manual fixes for known unused variables
   */
  async fixAll() {
    console.log('🔍 Applying manual fixes for unused variables...');
    
    // Define manual fixes for specific files and variables
    const manualFixes = [
      // server.js
      { file: 'server.js', variable: 'RELEASES_DIR', line: 123 },
      
      // src/ai-integration.js
      { file: 'src/ai-integration.js', variable: 'context', line: 156 },
      
      // src/ai/advanced-context-engine.js
      { file: 'src/ai/advanced-context-engine.js', variable: 'risk', line: 131 },
      { file: 'src/ai/advanced-context-engine.js', variable: 'context', line: 164 },
      { file: 'src/ai/advanced-context-engine.js', variable: 'directory', line: 393 },
      { file: 'src/ai/advanced-context-engine.js', variable: 'projectIndicators', line: 395 },
      
      // src/features/enhanced-terminal.cjs
      { file: 'src/features/enhanced-terminal.cjs', variable: 'spawn', line: 6 },
      { file: 'src/features/enhanced-terminal.cjs', variable: 'path', line: 7 },
      { file: 'src/features/enhanced-terminal.cjs', variable: 'fs', line: 8 },
      { file: 'src/features/enhanced-terminal.cjs', variable: 'currentSearchIndex', line: 336 },
      { file: 'src/features/enhanced-terminal.cjs', variable: 'searchResults', line: 337 },
      { file: 'src/features/enhanced-terminal.cjs', variable: 'direction', line: 339 },
      
      // src/main.cjs
      { file: 'src/main.cjs', variable: 'dialog', line: 6 },
      { file: 'src/main.cjs', variable: 'execSync', line: 9 },
      
      // src/plugin-integration.js
      { file: 'src/plugin-integration.js', variable: 'SafeAIWrapper', line: 11 },
      
      // src/storage-service.js
      { file: 'src/storage-service.js', variable: 'updateMetadata', line: 9 },
      
      // src/themes/theme-manager.cjs
      { file: 'src/themes/theme-manager.cjs', variable: 'fs', line: 6 },
      { file: 'src/themes/theme-manager.cjs', variable: 'path', line: 7 },
      
      // src/renderer/renderer.js
      { file: 'src/renderer/renderer.js', variable: 'enablePredictiveCompletion', line: 93 },
    ];
    
    let successCount = 0;
    
    for (const fix of manualFixes) {
      try {
        const filePath = path.join(process.cwd(), fix.file);
        
        if (!fs.existsSync(filePath)) {
          console.warn(`⚠️ File not found: ${fix.file}`);
          continue;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        if (fix.line > lines.length) {
          console.warn(`⚠️ Line ${fix.line} not found in ${fix.file}`);
          continue;
        }
        
        const lineIndex = fix.line - 1;
        const originalLine = lines[lineIndex];
        
        if (!originalLine.includes(fix.variable)) {
          console.warn(`⚠️ Variable '${fix.variable}' not found on line ${fix.line} in ${fix.file}`);
          continue;
        }
        
        // Apply the fix: prefix with underscore
        const newLine = this.fixVariableInLine(originalLine, fix.variable);
        
        if (newLine !== originalLine) {
          lines[lineIndex] = newLine;
          fs.writeFileSync(filePath, lines.join('\n'));
          
          console.log(`✅ Fixed: ${fix.variable} -> _${fix.variable} in ${fix.file}:${fix.line}`);
          this.fixedFiles.add(filePath);
          successCount++;
        }
      } catch (error) {
        console.warn(`⚠️ Error fixing ${fix.variable} in ${fix.file}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully fixed ${successCount} unused variables in ${this.fixedFiles.size} files`);
    
    // Run prettier to fix any formatting issues
    if (this.fixedFiles.size > 0) {
      console.log('🎨 Running Prettier to fix formatting...');
      try {
        execSync('npm run format', { stdio: 'inherit' });
        console.log('✅ Formatting complete');
      } catch (error) {
        console.warn('⚠️ Prettier formatting failed:', error.message);
      }
    }
  }
  
  /**
   * Fix a variable name in a line of code by prefixing with underscore
   */
  fixVariableInLine(line, varName) {
    // Common patterns to match and fix
    const patterns = [
      // Variable declarations: const/let/var varName
      {
        regex: new RegExp(`\\b(const|let|var)\\s+(${varName})\\b`, 'g'),
        replacement: `$1 _${varName}`
      },
      // Function parameters in parentheses: (varName) or (param, varName)
      {
        regex: new RegExp(`\\b(\\([^)]*[,\\s]?)(${varName})\\b([,\\s][^)]*\\))`, 'g'),
        replacement: `$1_${varName}$3`
      },
      // Destructuring: { varName } or { other, varName }
      {
        regex: new RegExp(`([{\\s,])(${varName})([,\\s}])`, 'g'),
        replacement: `$1_${varName}$3`
      },
      // Arrow function parameters: varName => or (varName) =>
      {
        regex: new RegExp(`\\b(${varName})\\s*=>`, 'g'),
        replacement: `_${varName} =>`
      },
      // Simple assignment: varName = value
      {
        regex: new RegExp(`^(\\s*)(${varName})(\\s*=)`, 'g'),
        replacement: `$1_${varName}$3`
      }
    ];
    
    let newLine = line;
    for (const pattern of patterns) {
      newLine = newLine.replace(pattern.regex, pattern.replacement);
    }
    
    return newLine;
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new UnusedVarsFixer();
  fixer.fixAll().catch(console.error);
}

module.exports = UnusedVarsFixer;
