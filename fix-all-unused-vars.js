/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// #!/usr/bin/env node

const fs = require('node:fs');
const _path = require('node:path');
const { execSync } = require('child_process');

// Get all lint warnings
const lintOutput = execSync('npm run lint 2>&1 | grep "warning" | grep "no-unused-vars" || true', {
  encoding: 'utf8',
});

// Parse warnings into structured data
const warnings = [];
const lines = lintOutput.split('\n').filter(line => line.trim());

for (const line of lines) {
  // Parse format: path/to/file.js:line:col  warning  'varName' is ...  no-unused-vars
  const match = line.match(/^(.+?):(\d+):(\d+)\s+warning\s+'([^']+)'.+no-unused-vars$/);
  if (match) {
    const [, filePath, lineNum, colNum, varName] = match;

    // Determine the type of warning
    let warningType = 'variable';
    if (line.includes('is defined but never used')) {
      if (line.includes('Allowed unused args')) {
        warningType = 'parameter';
      } else if (line.includes('Allowed unused caught errors')) {
        warningType = 'catchError';
      }
    } else if (line.includes('is assigned a value but never used')) {
      warningType = 'assignment';
    }

    warnings.push({
      file: filePath.trim(),
      line: parseInt(lineNum),
      column: parseInt(colNum),
      variable: varName,
      type: warningType,
      fullLine: line,
    });
  }
}


// Group warnings by file
const warningsByFile = {};
for (const warning of warnings) {
  if (!warningsByFile[warning.file]) {
    warningsByFile[warning.file] = [];
  }
  warningsByFile[warning.file].push(warning);
}

// Process each file
let totalFixed = 0;
for (const [filePath, fileWarnings] of Object.entries(warningsByFile)) {

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Sort warnings by line number in reverse order to avoid line number shifts
    fileWarnings.sort((a, b) => b.line - a.line);

    for (const warning of fileWarnings) {
      const lineIndex = warning.line - 1;
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const line = lines[lineIndex];

        // Handle different types of warnings
        if (warning.type === 'parameter' || warning.type === 'catchError') {
          // For parameters and caught errors, prefix with underscore
          const regex = new RegExp(`\\b${warning.variable}\\b`, 'g');
          lines[lineIndex] = line.replace(regex, (match, offset) => {
            // Only replace if it's not already prefixed with underscore
            const charBefore = line[offset - 1];
            if (charBefore !== '_') {
              return '_' + match;
            }
            return match;
          });
        } else if (warning.type === 'assignment') {
          // For assignments, check if it's an import or variable declaration
          if (line.includes('import') || line.includes('require')) {
            // For imports, comment out or remove the line if it's completely unused
            if (
              line.match(
                new RegExp(
                  `^\\s*(import|const|let|var)\\s+[{]?\\s*${warning.variable}\\s*[}]?\\s*(from|=\\s*require)`
                )
              )
            ) {
              lines[lineIndex] = '// ' + line + ' // Unused import';
            } else {
              // It's part of a destructuring, prefix with underscore
              const regex = new RegExp(`\\b${warning.variable}\\b`, 'g');
              lines[lineIndex] = line.replace(regex, '_' + warning.variable);
            }
          } else {
            // For regular assignments, prefix with underscore
            const regex = new RegExp(`\\b${warning.variable}\\b`, 'g');
            lines[lineIndex] = line.replace(regex, '_' + warning.variable);
          }
        } else {
          // Default: prefix with underscore
          const regex = new RegExp(`\\b${warning.variable}\\b`, 'g');
          lines[lineIndex] = line.replace(regex, '_' + warning.variable);
        }

        totalFixed++;
      }
    }

    // Write the updated content back
    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    console.error(`  ✗ Error processing ${filePath}: ${error.message}`);
  }
}


// Run lint again to verify
try {
  const newWarningCount = execSync('npm run lint 2>&1 | grep "warning" | wc -l', {
    encoding: 'utf8',
  }).trim();
} catch (error) {
}
