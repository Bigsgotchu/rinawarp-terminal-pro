const fs = require('fs');

const content = fs.readFileSync('./server.js', 'utf8');
const lines = content.split('\n');

const parensStack = [];
const bracesStack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];

    if (char === '(') {
      parensStack.push({ line: lineNum, col: j + 1 });
    } else if (char === ')') {
      if (parensStack.length === 0) {
        console.log(`Extra closing parenthesis at line ${lineNum}, column ${j + 1}`);
      } else {
        parensStack.pop();
      }
    } else if (char === '{') {
      bracesStack.push({ line: lineNum, col: j + 1 });
    } else if (char === '}') {
      if (bracesStack.length === 0) {
        console.log(`Extra closing brace at line ${lineNum}, column ${j + 1}`);
      } else {
        bracesStack.pop();
      }
    }
  }
}

console.log(`Final unclosed parentheses count: ${parensStack.length}`);
console.log(`Final unclosed braces count: ${bracesStack.length}`);

if (parensStack.length > 0) {
  console.log('Unclosed parentheses at:');
  parensStack.slice(-10).forEach(p => {
    console.log(
      `  Line ${p.line}, column ${p.col}: ${lines[p.line - 1].substring(Math.max(0, p.col - 10), p.col + 10)}`
    );
  });
}

if (bracesStack.length > 0) {
  console.log('Unclosed braces at:');
  bracesStack.slice(-10).forEach(b => {
    console.log(
      `  Line ${b.line}, column ${b.col}: ${lines[b.line - 1].substring(Math.max(0, b.col - 10), b.col + 10)}`
    );
  });
}
