#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Get all JS files
function getAllJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);

    // Skip node_modules and common build directories
    if (file === 'node_modules' || file === 'dist' || file === 'build' || file === '.git') {
      continue;
    }

    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getAllJSFiles(filePath, fileList);
      } else if (file.endsWith('.js') || file.endsWith('.cjs') || file.endsWith('.mjs')) {
        fileList.push(filePath);
      }
    } catch (e) {
      console.warn(`Skipping ${filePath}: ${e.message}`);
    }
  }

  return fileList;
}

// Parse ESLint output to find unused variables
function getUnusedVariables(file) {
  try {
    const output = execSync(`npx eslint ${file} --format json`, { encoding: 'utf-8' });
    const results = JSON.parse(output);

    if (!results[0] || !results[0].messages) return [];

    return results[0].messages
      .filter(msg => msg.ruleId === 'no-unused-vars')
      .map(msg => ({
        line: msg.line,
        column: msg.column,
        variable: msg.message.match(/'([^']+)'/)?.[1] || null,
        message: msg.message,
      }))
      .filter(item => item.variable);
  } catch (e) {
    // ESLint exits with code 1 when there are linting errors, which is expected
    if (e.status === 1 && e.stdout) {
      try {
        const results = JSON.parse(e.stdout);
        if (!results[0] || !results[0].messages) return [];

        return results[0].messages
          .filter(msg => msg.ruleId === 'no-unused-vars')
          .map(msg => ({
            line: msg.line,
            column: msg.column,
            variable: msg.message.match(/'([^']+)'/)?.[1] || null,
            message: msg.message,
          }))
          .filter(item => item.variable);
      } catch (_parseError) {
        return [];
      }
    }
    return [];
  }
}

// Fix unused variables by prefixing with underscore
function fixUnusedVariablesInFile(file) {
  const unusedVars = getUnusedVariables(file);
  if (unusedVars.length === 0) return false;

  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  // Process from bottom to top to avoid line number shifts
  unusedVars.sort((a, b) => b.line - a.line);

  let modified = false;

  for (const varInfo of unusedVars) {
    const lineIndex = varInfo.line - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      const variable = varInfo.variable;

      // Skip if already prefixed with underscore
      if (variable.startsWith('_')) continue;

      // Create regex patterns for different scenarios
      const patterns = [
        // const/let/var declarations
        new RegExp(`(const|let|var)\\s+${variable}\\b`, 'g'),
        // Function parameters
        new RegExp(`\\(([^)]*\\b)${variable}\\b`, 'g'),
        // Destructuring
        new RegExp(`\\{([^}]*\\b)${variable}\\b`, 'g'),
        new RegExp(`\\[([^\\]]*\\b)${variable}\\b`, 'g'),
        // Catch clauses
        new RegExp(`catch\\s*\\(\\s*${variable}\\b`, 'g'),
      ];

      let newLine = line;
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          newLine = line.replace(pattern, (match, ..._args) => {
            return match.replace(new RegExp(`\\b${variable}\\b`), `_${variable}`);
          });
          break;
        }
      }

      if (newLine !== line) {
        lines[lineIndex] = newLine;
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(file, lines.join('\n'));
    console.log(`✅ Fixed ${unusedVars.length} unused variables in ${file}`);
    return true;
  }

  return false;
}

// Main execution
const files = getAllJSFiles('.');

const _totalFixed = 0;
let _filesFixed = 0;

for (const file of files) {
  if (fixUnusedVariablesInFile(file)) {
    _filesFixed++;
  }
}
