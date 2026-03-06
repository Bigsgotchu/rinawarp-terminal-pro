/**
 * Command Normalizer - Safety Guardrails
 * Ensures all commands are bounded and safe
 */

import type { NormalizedCommand, Risk } from "../types/index.ts";

const NORMALIZATION_RULES: Array<{
  pattern: RegExp;
  normalize: (match: RegExpExecArray) => NormalizedCommand;
}> = [
  // journalctl - limit lines
  {
    pattern: /^journalctl(?!\s+-n)/,
    normalize: () => ({
      original: "journalctl",
      normalized: "journalctl -n 200 --no-pager",
      risk: "read",
      timeoutMs: 10000,
      maxBytes: 50000
    })
  },
  // top - batch mode, limited output
  {
    pattern: /^top(?!\s+-b)/,
    normalize: () => ({
      original: "top",
      normalized: "top -b -n 1 | head -n 60",
      risk: "read",
      timeoutMs: 5000,
      maxBytes: 8000
    })
  },
  // dmesg - limit lines
  {
    pattern: /^dmesg(?!\s+--ctime)/,
    normalize: () => ({
      original: "dmesg",
      normalized: "dmesg --ctime | tail -n 200",
      risk: "read",
      timeoutMs: 5000,
      maxBytes: 30000
    })
  },
  // ps - always sort and limit
  {
    pattern: /^ps\s+-eo(?!\s+pid,ppid,pcpu,pmem,comm)/,
    normalize: (m) => ({
      original: m[0],
      normalized: `${m[0]} --sort=-pcpu | head -n 30`,
      risk: "read",
      timeoutMs: 10000,
      maxBytes: 10000
    })
  },
  // df - human readable
  {
    pattern: /^df(?!\s+-h)/,
    normalize: () => ({
      original: "df",
      normalized: "df -h",
      risk: "read",
      timeoutMs: 5000,
      maxBytes: 5000
    })
  },
  // du - summarized, limited depth
  {
    pattern: /^du\s+-sh(?!\s+\/\w+)/,
    normalize: (m) => {
      const target = m[1] || "/var";
      return {
        original: `du -sh ${target}`,
        normalized: `du -sh ${target} 2>/dev/null | sort -h | tail -n 15`,
        risk: "read",
        timeoutMs: 15000,
        maxBytes: 8000
      };
    }
  },
  // Default for unknown commands - still apply limits
  {
    pattern: /./,
    normalize: (m) => ({
      original: m[0],
      normalized: m[0],
      risk: "read",
      timeoutMs: 15000,
      maxBytes: 100000,
      warnings: ["Command not in normalizer - using default limits"]
    })
  }
];

export function normalizeCommand(command: string): NormalizedCommand {
  for (const rule of NORMALIZATION_RULES) {
    const match = rule.pattern.exec(command);
    if (match) {
      return rule.normalize(match);
    }
  }
  // Fallback
  return {
    original: command,
    normalized: command,
    risk: "read",
    timeoutMs: 15000,
    maxBytes: 100000
  };
}

export function isAllowed(command: string, allowlist: RegExp[]): boolean {
  const normalized = normalizeCommand(command);
  return allowlist.some(regex => regex.test(normalized.normalized));
}

export function classifyRisk(command: string): Risk {
  const highImpactPatterns = [
    /sudo/i,
    /\brm\b/,
    /rm\s+-rf\b/i,
    /shutdown\b/i,
    /reboot\b/i,
    /poweroff\b/i,
    /mkfs\b/i,
    /dd\s+if=/i,
    /:\(\)\s*\{/i,
    /kill\s+-9\b/i,
    /killall\b/i,
    /iptables\b/i,
    /ufw\b/i,
    /systemctl\s+(stop|disable)\b/i,
    /docker\s+system\s+prune\b/i,
    /apt\s+(remove|purge)\b/i
  ];

  if (highImpactPatterns.some(p => p.test(command))) {
    return "high-impact";
  }

  const safeWritePatterns = [
    /apt\s+(install|update|upgrade)\b/i,
    /systemctl\s+(restart|start)\b/i,
    /mkdir\b/i,
    /touch\b/i,
    /chmod\b/i,
    /chown\b/i,
    /docker\s+(image|container)\s+prune\b/i
  ];

  if (safeWritePatterns.some(p => p.test(command))) {
    return "safe-write";
  }

  return "read";
}

export function estimateOutputSize(command: string): number {
  const estimates: Record<string, number> = {
    "ps -eo pid,pcpu,pmem,comm": 5000,
    "uptime": 200,
    "free -h": 500,
    "df -h": 2000,
    "cat /proc/loadavg": 100,
    "sensors": 2000,
    "journalctl -n 200": 50000,
    "top -b -n 1": 8000,
    "docker system df": 3000
  };

  for (const [pattern, size] of Object.entries(estimates)) {
    if (command.includes(pattern)) {
      return size;
    }
  }

  return 10000; // default
}
