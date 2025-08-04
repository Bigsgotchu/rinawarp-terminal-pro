#!/usr/bin/env node

import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
// import path from 'path';

async function monitorCSPViolations() {
  const logFile = './logs/csp-violations.log';
  const violationSummary = new Map();

  // Ensure log file exists
  try {
    await fs.access(logFile);
  } catch {
    await fs.mkdir('./logs', { recursive: true });
    await fs.writeFile(logFile, '', 'utf8');
  }

  // Function to parse and display violation
  function displayViolation(line) {
    try {
      const entry = JSON.parse(line);
      const report = entry.report;

      if (!report) return;

      const key = `${report['violated-directive']}|${report['blocked-uri']}`;
      const count = (violationSummary.get(key) || 0) + 1;
      violationSummary.set(key, count);

      console.log(
        `\n🚨 CSP Violation #${count} [${new Date(entry.timestamp).toLocaleTimeString()}]`
      );
      console.log(`❌ Blocked: ${report['blocked-uri'] || 'inline'}`);

      if (report['line-number']) {
        console.log(
          `📍 Location: Line ${report['line-number']}, Column ${report['column-number']}`
        );
      }

      if (report['source-file']) {
      }

      // Provide helpful suggestions

      if (report['violated-directive'].includes('script-src')) {
        if (report['blocked-uri'] === 'inline') {
        } else if (report['blocked-uri'].includes('eval')) {
        } else {
        }
      } else if (report['violated-directive'].includes('style-src')) {
        if (report['blocked-uri'] === 'inline') {
        } else {
        }
      }
    } catch (error) {
      // Invalid JSON, skip
    }
  }

  // Read existing violations
  console.log('📊 Reading existing violations...\n');

  try {
    const rl = createInterface({
      input: createReadStream(logFile),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (line.trim()) {
        displayViolation(line);
      }
    }
  } catch (error) {}

  // Watch for new violations

  let lastSize = (await fs.stat(logFile)).size;

  setInterval(async () => {
    try {
      const stats = await fs.stat(logFile);
      if (stats.size > lastSize) {
        const buffer = Buffer.alloc(stats.size - lastSize);
        const fd = await fs.open(logFile, 'r');
        await fd.read(buffer, 0, buffer.length, lastSize);
        await fd.close();

        const newContent = buffer.toString('utf8');
        const lines = newContent.split('\n').filter(line => line.trim());

        lines.forEach(displayViolation);

        lastSize = stats.size;
      }
    } catch (error) {
      // File might not exist yet
    }
  }, 1000);

  // Display summary on exit
  process.on('SIGINT', () => {
    if (violationSummary.size === 0) {
      console.log('✅ No CSP violations detected!');
    } else {
      violationSummary.forEach((count, key) => {
        const [_directive, _uri] = key.split('|');
        console.log(`📊 ${key}: ${count} violations`);
      });
    }

    process.exit(0);
  });
}

// Run the monitor
monitorCSPViolations().catch(console.error);
