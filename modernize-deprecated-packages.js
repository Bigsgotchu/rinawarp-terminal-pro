#!/usr/bin/env node

/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * 🧜‍♀️ RinaWarp Terminal - Modern Package Refactoring Tool
 *
 * This script automatically refactors deprecated packages to use modern native alternatives:
 * - lodash.isequal → Node.js util.isDeepStrictEqual() or native Object.is()
 * - q → Native Promises/async-await
 * - rimraf → Native fs.rm() (Node 14.14+)
 * - glob → Native fs.glob() (Node 20+) or modern glob patterns
 * - uuid → Native crypto.randomUUID()
 * - bluebird → Native Promises
 * - async → Native async/await patterns
 * - request → Native fetch() or axios
 * - mkdirp → Native fs.mkdir({ recursive: true })
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Modern utility functions to replace deprecated packages
const modernUtils = {
  // Replace lodash.isequal
  isDeepEqual: (a, b) => {
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => modernUtils.isDeepEqual(item, b[index]));
    }
    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => modernUtils.isDeepEqual(a[key], b[key]));
    }
    return Object.is(a, b);
  },

  // Replace uuid
  generateUUID: () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older Node.js versions
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  // Replace rimraf with native fs.rm
  removeDir: async dirPath => {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed directory: ${dirPath}`);
    } catch (error) {
      console.error(`❌ Failed to remove directory ${dirPath}:`, error.message);
    }
  },

  // Replace mkdirp with native fs.mkdir
  ensureDir: async dirPath => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error(`❌ Failed to create directory ${dirPath}:`, error.message);
    }
  },

  // Replace glob with native fs.glob (Node 20+) or simple directory scanning
  globFiles: async (pattern, options = {}) => {
    const { cwd = process.cwd() } = options;

    try {
      // Use native fs.glob if available (Node 20+)
      if (fs.glob) {
        return await fs.glob(pattern, { cwd });
      }

      // Fallback: simple directory scanning for common patterns
      const files = await fs.readdir(cwd, { recursive: true });
      return files.filter(file => {
        if (pattern.endsWith('*')) {
          const prefix = pattern.slice(0, -1);
          return file.startsWith(prefix);
        }
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(file);
        }
        return file === pattern;
      });
    } catch (error) {
      console.error(`❌ Failed to glob files with pattern ${pattern}:`, error.message);
      return [];
    }
  },

  // Replace Q promises with native Promises
  promisify: fn => {
    return (...args) => {
      return new Promise((resolve, reject) => {
        fn(...args, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    };
  },

  // Replace async.js patterns
  asyncSeries: async tasks => {
    const results = [];
    for (const task of tasks) {
      const result = await task();
      results.push(result);
    }
    return results;
  },

  asyncParallel: async tasks => {
    return Promise.all(tasks.map(task => task()));
  },

  asyncWaterfall: async (tasks, initialValue) => {
    let result = initialValue;
    for (const task of tasks) {
      result = await task(result);
    }
    return result;
  },

  // Replace request with native fetch
  httpRequest: async (url, options = {}) => {
    try {
      const response = await fetch(url, options);
      return {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
      };
    } catch (error) {
      throw new Error(new Error(new Error(`HTTP request failed: ${error.message}`)));
    }
  },
};

// File patterns to search for deprecated usage
const deprecatedPatterns = [
  {
    name: 'lodash.isequal',
    pattern: /require\(['"]lodash\.isequal['"]\)/g,
    replacement: 'const { isDeepStrictEqual } = require("node:util");',
    usagePattern: /isEqual\(/g,
    usageReplacement: 'isDeepStrictEqual(',
  },
  {
    name: 'q',
    pattern: /require\(['"]q['"]\)/g,
    replacement: '// Using native Promises instead of Q',
    usagePattern: /Q\.fcall\(/g,
    usageReplacement: 'Promise.resolve().then(() => ',
  },
  {
    name: 'rimraf',
    pattern: /require\(['"]rimraf['"]\)/g,
    replacement: 'const fs = require("node:fs").promises;',
    usagePattern: /rimraf\(/g,
    usageReplacement: 'fs.rm(path, { recursive: true, force: true }); //',
  },
  {
    name: 'uuid',
    pattern: /require\(['"]uuid['"]\)/g,
    replacement: 'const crypto = require("node:crypto");',
    usagePattern: /uuid\.v4\(\)/g,
    usageReplacement: 'crypto.randomUUID()',
  },
  {
    name: 'mkdirp',
    pattern: /require\(['"]mkdirp['"]\)/g,
    replacement: 'const fs = require("node:fs").promises;',
    usagePattern: /mkdirp\(/g,
    usageReplacement: 'fs.mkdir(path, { recursive: true }); //',
  },
  {
    name: 'request',
    pattern: /require\(['"]request['"]\)/g,
    replacement: '// Using native fetch instead of request',
    usagePattern: /request\(/g,
    usageReplacement: 'fetch(',
  },
];

// Function to scan and refactor a file
async function refactorFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    let modifiedContent = content;
    let hasChanges = false;

    for (const pattern of deprecatedPatterns) {
      if (pattern.pattern.test(content)) {
        // Replace the require statement
        modifiedContent = modifiedContent.replace(pattern.pattern, pattern.replacement);

        // Replace usage patterns
        if (pattern.usagePattern && pattern.usageReplacement) {
          modifiedContent = modifiedContent.replace(pattern.usagePattern, pattern.usageReplacement);
        }

        hasChanges = true;
      }
    }

    if (hasChanges) {
      await fs.writeFile(filePath, modifiedContent, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Failed to refactor ${filePath}:`, error.message);
    return false;
  }
}

// Function to scan directories recursively
async function scanDirectory(dir) {
  const files = [];

  try {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        // Skip node_modules, .git, and other common ignore patterns
        if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item.name)) {
          files.push(...(await scanDirectory(fullPath)));
        }
      } else if (item.isFile()) {
        // Only process JavaScript/TypeScript files
        if (/\.(js|ts|jsx|tsx|cjs|mjs)$/.test(item.name)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Failed to scan directory ${dir}:`, error.message);
  }

  return files;
}

// Main execution function
async function main() {
  const filesToProcess = await scanDirectory('.');
  let processedCount = 0;
  let refactoredCount = 0;

  for (const file of filesToProcess) {
    processedCount++;
    const wasRefactored = await refactorFile(file);
    if (wasRefactored) {
      refactoredCount++;
    }
  }

  if (refactoredCount > 0) {
    // Create a modern utilities file
    const utilsContent = `
/**
 * 🧜‍♀️ RinaWarp Terminal - Modern Utilities
 * 
 * This module provides modern native alternatives to deprecated packages
 */

const { isDeepStrictEqual } = require('node:util');
const crypto = require('node:crypto');
const fs = require('node:fs').promises;
const path = require('node:path');

// Modern deep equality check (replaces lodash.isequal)
const isDeepEqual = (a, b) => {
  try {
    return isDeepStrictEqual(a, b);
  } catch (error) {
    return false;
  }
};

// Modern UUID generation (replaces uuid package)
const generateUUID = () => {
  return crypto.randomUUID();
};

// Modern directory removal (replaces rimraf)
const removeDirectory = async (dirPath) => {
  await fs.rm(dirPath, { recursive: true, force: true });
};

// Modern directory creation (replaces mkdirp)
const ensureDirectory = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

// Modern HTTP requests (replaces request)
const httpRequest = async (url, options = {}) => {
  const response = await fetch(url, options);
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text()
  };
};

// Modern async utilities (replaces async.js)
const asyncSeries = async (tasks) => {
  const results = [];
  for (const task of tasks) {
    const result = await task();
    results.push(result);
  }
  return results;
};

const asyncParallel = async (tasks) => {
  return Promise.all(tasks.map(task => task()));
};

const asyncWaterfall = async (tasks, initialValue) => {
  let result = initialValue;
  for (const task of tasks) {
    result = await task(result);
  }
  return result;
};

module.exports = {
  isDeepEqual,
  generateUUID,
  removeDirectory,
  ensureDirectory,
  httpRequest,
  asyncSeries,
  asyncParallel,
  asyncWaterfall
};
`;

    await fs.writeFile('./src/utils/modern-utils.js', utilsContent);
    console.log('✅ Created modern utilities file: src/utils/modern-utils.js');

    // Create type definitions for TypeScript projects
    const typesContent = `
/**
 * 🧜‍♀️ RinaWarp Terminal - Modern Utilities Types
 */

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export declare function isDeepEqual(a: any, b: any): boolean;
export declare function generateUUID(): string;
export declare function removeDirectory(dirPath: string): Promise<void>;
export declare function ensureDirectory(dirPath: string): Promise<void>;
export declare function httpRequest(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
export declare function asyncSeries<T>(tasks: Array<() => Promise<T>>): Promise<T[]>;
export declare function asyncParallel<T>(tasks: Array<() => Promise<T>>): Promise<T[]>;
export declare function asyncWaterfall<T>(tasks: Array<(prev: T) => Promise<T>>, initialValue: T): Promise<T>;
`;

    await fs.writeFile('./src/utils/modern-utils.d.ts', typesContent);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { modernUtils };
