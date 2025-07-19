#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Dynamically fix unused variables based on ESLint output
 */
class DynamicUnusedVarsFixer {
  constructor() {
    this.fixedFiles = new Set();
    this.totalFixes = 0;
  }

  /**
   * Get current ESLint warnings for unused variables
   */
  getUnusedVarWarnings() {
    try {
      // Run ESLint and capture output
      const result = execSync('npm run lint', { encoding: 'utf8', stdio: 'pipe' });
      return this.parseEslintOutput(result);
    } catch (error) {
      // ESLint returns non-zero exit code when there are warnings/errors
      return this.parseEslintOutput(error.stdout || '');
    }
  }

  /**
   * Parse ESLint output to extract unused variable warnings
   */
  parseEslintOutput(output) {
    const warnings = [];
    const lines = output.split('\n');
    let currentFile = null;

    for (const line of lines) {
      // Match file path lines
      const fileMatch = line.match(/^\/[^:]+\.js$/);
      if (fileMatch) {
        currentFile = fileMatch[0];
        continue;
      }

      // Match warning lines for unused variables
      const warningMatch = line.match(
        /^\s+(\d+):(\d+)\s+warning\s+'([^']+)' is (?:assigned a value but never used|defined but never used)\./
      );
      if (warningMatch && currentFile) {
        const [, lineNum, colNum, varName] = warningMatch;
        warnings.push({
          file: path.relative(process.cwd(), currentFile),
          line: parseInt(lineNum),
          column: parseInt(colNum),
          variable: varName,
        });
      }
    }

    return warnings;
  }

  /**
   * Fix all unused variables
   */
  async fixAll() {
    console.log('🔍 Finding unused variables from ESLint output...');

    const warnings = this.getUnusedVarWarnings();
    console.log(`Found ${warnings.length} unused variable warnings`);

    if (warnings.length === 0) {
      console.log('✅ No unused variables found!');
      return;
    }

    let successCount = 0;

    // Group warnings by file for efficient processing
    const fileWarnings = {};
    for (const warning of warnings) {
      if (!fileWarnings[warning.file]) {
        fileWarnings[warning.file] = [];
      }
      fileWarnings[warning.file].push(warning);
    }

    // Process each file
    for (const [filePath, warningsForFile] of Object.entries(fileWarnings)) {
      try {
        const fullPath = path.join(process.cwd(), filePath);

        if (!fs.existsSync(fullPath)) {
          console.warn(`⚠️ File not found: ${filePath}`);
          continue;
        }

        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        let modified = false;

        // Sort warnings by line number (descending) to avoid line number shifts
        warningsForFile.sort((a, b) => b.line - a.line);

        for (const warning of warningsForFile) {
          const lineIndex = warning.line - 1;

          if (lineIndex >= lines.length) {
            console.warn(`⚠️ Line ${warning.line} not found in ${filePath}`);
            continue;
          }

          const originalLine = lines[lineIndex];
          const newLine = this.fixVariableInLine(originalLine, warning.variable);

          if (newLine !== originalLine) {
            lines[lineIndex] = newLine;
            modified = true;
            successCount++;
            console.log(
              `✅ Fixed: ${warning.variable} -> _${warning.variable} in ${filePath}:${warning.line}`
            );
          }
        }

        if (modified) {
          fs.writeFileSync(fullPath, lines.join('\n'));
          this.fixedFiles.add(fullPath);
        }
      } catch (error) {
        console.warn(`⚠️ Error processing ${filePath}:`, error.message);
      }
    }

    console.log(
      `\n✅ Successfully fixed ${successCount} unused variables in ${this.fixedFiles.size} files`
    );

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
    // Handle different patterns where unused variables appear

    // Pattern 1: Variable declarations (const, let, var)
    let newLine = line.replace(
      new RegExp(`\\b(const|let|var)\\s+(${this.escapeRegExp(varName)})\\b`, 'g'),
      `$1 _${varName}`
    );

    // Pattern 2: Function parameters - handle various parameter patterns
    // Single parameter: function(varName)
    newLine = newLine.replace(
      new RegExp(`\\(\\s*(${this.escapeRegExp(varName)})\\s*\\)`, 'g'),
      `(_${varName})`
    );

    // First parameter: function(varName, other)
    newLine = newLine.replace(
      new RegExp(`\\(\\s*(${this.escapeRegExp(varName)})\\s*,`, 'g'),
      `(_${varName},`
    );

    // Middle parameter: function(other, varName, another)
    newLine = newLine.replace(
      new RegExp(`(,\\s*)(${this.escapeRegExp(varName)})(\\s*,)`, 'g'),
      `$1_${varName}$3`
    );

    // Last parameter: function(other, varName)
    newLine = newLine.replace(
      new RegExp(`(,\\s*)(${this.escapeRegExp(varName)})(\\s*)\\)`, 'g'),
      `$1_${varName}$3)`
    );

    // Pattern 3: Destructuring assignments
    // In object destructuring: { varName } or { other, varName }
    newLine = newLine.replace(
      new RegExp(`([{\\s,])(${this.escapeRegExp(varName)})([,\\s}])`, 'g'),
      `$1_${varName}$3`
    );

    // Pattern 4: Arrow function parameters
    newLine = newLine.replace(
      new RegExp(`\\b(${this.escapeRegExp(varName)})\\s*=>`, 'g'),
      `_${varName} =>`
    );

    // Pattern 5: Catch block parameters
    newLine = newLine.replace(
      new RegExp(`catch\\s*\\(\\s*(${this.escapeRegExp(varName)})\\s*\\)`, 'g'),
      `catch (_${varName})`
    );

    return newLine;
  }

  /**
   * Escape special regex characters in variable names
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new DynamicUnusedVarsFixer();
  fixer.fixAll().catch(console.error);
}

module.exports = DynamicUnusedVarsFixer;
