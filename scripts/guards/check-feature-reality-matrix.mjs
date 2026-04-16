#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const matrixPath = path.join(root, 'docs', 'feature-reality-matrix.md');

if (!fs.existsSync(matrixPath)) {
  console.error(`[feature-reality-matrix] Missing file: ${matrixPath}`);
  process.exit(1);
}

const content = fs.readFileSync(matrixPath, 'utf8');
const lines = content.split(/\r?\n/);

let inMatrix = false;
let headerParsed = false;
let headers = [];
const failures = [];
let realCount = 0;

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

for (const line of lines) {
  if (line.trim() === '## Matrix') {
    inMatrix = true;
    continue;
  }

  if (inMatrix && line.startsWith('## ')) {
    break;
  }

  if (!inMatrix || !line.trim().startsWith('|')) {
    continue;
  }

  const cells = splitRow(line);
  if (!headerParsed) {
    headers = cells;
    headerParsed = true;
    continue;
  }

  if (cells.every((cell) => /^-+$/.test(cell))) {
    continue;
  }

  if (cells.length !== headers.length) {
    failures.push(`Malformed matrix row: "${line.trim()}"`);
    continue;
  }

  const row = Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  const feature = row.Feature || '(unknown feature)';
  const status = (row.Status || '').toLowerCase();
  const tests = (row.Tests || '').toLowerCase();
  const packaged = (row['Packaged / release check'] || '').toLowerCase();
  const proof = (row['Proof / receipt'] || '').toLowerCase();
  const result = (row['Real result'] || '').toLowerCase();

  if (status === 'real') {
    realCount += 1;

    if (tests !== 'yes') {
      failures.push(
        `"${feature}" is marked real but "Tests" is "${row.Tests}". Real features must have Tests=yes.`,
      );
    }

    if (packaged !== 'yes') {
      failures.push(
        `"${feature}" is marked real but "Packaged / release check" is "${row['Packaged / release check']}". Real features must have Packaged / release check=yes.`,
      );
    }

    if (result !== 'yes') {
      failures.push(
        `"${feature}" is marked real but "Real result" is "${row['Real result']}". Real features must have Real result=yes.`,
      );
    }

    if (!['yes', 'n/a'].includes(proof)) {
      failures.push(
        `"${feature}" is marked real but "Proof / receipt" is "${row['Proof / receipt']}". Real features must have Proof / receipt=yes or n/a.`,
      );
    }
  }
}

if (!headerParsed) {
  console.error('[feature-reality-matrix] Could not find matrix table under "## Matrix".');
  process.exit(1);
}

if (realCount === 0) {
  failures.push('No features are marked real in docs/feature-reality-matrix.md.');
}

if (failures.length > 0) {
  console.error('[feature-reality-matrix] FAIL');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[feature-reality-matrix] PASS (${realCount} real feature rows validated)`);
