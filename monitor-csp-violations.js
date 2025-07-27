#!/usr/bin/env node

import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import path from 'path';

async function monitorCSPViolations() {
  console.log('🔍 CSP Violation Monitor Started');
  console.log('================================\n');
  console.log('Watching for CSP violations in real-time...');
  console.log('Press Ctrl+C to stop\n');

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
      console.log(`📄 Page: ${report['document-uri']}`);
      console.log(`❌ Blocked: ${report['blocked-uri'] || 'inline'}`);
      console.log(`📏 Directive: ${report['violated-directive']}`);

      if (report['line-number']) {
        console.log(
          `📍 Location: Line ${report['line-number']}, Column ${report['column-number']}`
        );
      }

      if (report['source-file']) {
        console.log(`📁 Source: ${report['source-file']}`);
      }

      // Provide helpful suggestions
      console.log('\n💡 Suggestion:');

      if (report['violated-directive'].includes('script-src')) {
        if (report['blocked-uri'] === 'inline') {
          console.log('   - Inline script detected. Move to external file or use nonce.');
        } else if (report['blocked-uri'].includes('eval')) {
          console.log('   - eval() usage detected. Refactor to avoid eval().');
        } else {
          console.log(`   - Add '${report['blocked-uri']}' to script-src if trusted.`);
        }
      } else if (report['violated-directive'].includes('style-src')) {
        if (report['blocked-uri'] === 'inline') {
          console.log('   - Inline style detected. Move to external CSS file.');
        } else {
          console.log(`   - Add '${report['blocked-uri']}' to style-src if trusted.`);
        }
      }

      console.log('-'.repeat(60));
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
  } catch (error) {
    console.log('No existing violations found.\n');
  }

  // Watch for new violations
  console.log('\n👀 Watching for new violations...\n');

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
    console.log('\n\n📊 Violation Summary:');
    console.log('===================');

    if (violationSummary.size === 0) {
      console.log('✅ No CSP violations detected!');
    } else {
      violationSummary.forEach((count, key) => {
        const [directive, uri] = key.split('|');
        console.log(`- ${directive}: ${uri} (${count} times)`);
      });
    }

    console.log('\n👋 Monitor stopped');
    process.exit(0);
  });
}

// Run the monitor
monitorCSPViolations().catch(console.error);
