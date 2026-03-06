export type ShellKind = "bash" | "zsh" | "fish" | "pwsh" | "unknown";

export type CommandBoundary = {
  shell: ShellKind;
  prompt: string;
  command: string;
  output: string;
  startLine: number;
  endLine: number;
};

const RE_ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
const RE_OSC = /\x1b\][^\x07]*(?:\x07|\x1b\\)/g;
const RE_BASH_ZSH = /^(?:\[[^\]]+\]\s*)?(?:\([^)]*\)\s*)?(?:[^@\s]+@[^:\s]+:[^\n]*?[#$])\s+(.*)$/;
const RE_BARE_POSIX = /^(?:\[[^\]]+\]\s*)?(?:\([^)]*\)\s*)?(?:[$#❯➜➤»])\s+(.*)$/;
const RE_FISH = /^(?:\[[^\]]+\]\s*)?(?:[~\/][^\n]*?)\s*[>❯]\s+(.*)$/;
const RE_PWSH = /^(?:\[[^\]]+\]\s*)?PS\s+[^>]+>\s*(.*)$/i;
const RE_CONTINUATION = /^\s*(?:>|>>|\.\.\.|->|…|::)\s*(.*)$/;

function stripAnsi(line: string): string {
  return String(line || "")
    .replace(RE_OSC, "")
    .replace(RE_ANSI, "");
}

function detectShell(line: string): ShellKind {
  const clean = stripAnsi(line);
  if (RE_PWSH.test(clean)) return "pwsh";
  if (RE_BASH_ZSH.test(clean)) return "bash";
  if (RE_FISH.test(clean)) return "fish";
  if (RE_BARE_POSIX.test(clean)) return "zsh";
  return "unknown";
}

function parsePrompt(line: string, hint?: ShellKind): { shell: ShellKind; command: string } | null {
  const clean = stripAnsi(line);
  const compact = clean.trimStart();
  
  // Simple $/# prompt detection
  if (/^(?:\$|#)\s+\S+/.test(compact)) {
    return { shell: hint === "bash" ? "bash" : "zsh", command: compact.replace(/^(?:\$|#)\s+/, "").trim() };
  }
  
  // Matcher lookup table: [test condition, shell type, regex]
  const matchers: Array<{ test: () => boolean; shell: ShellKind; regex: RegExp }> = [
    { test: () => hint === "pwsh" || hint === "unknown" || hint === undefined, shell: "pwsh", regex: RE_PWSH },
    { test: () => hint === "bash" || hint === "zsh" || hint === "unknown" || hint === undefined, shell: hint === "zsh" ? "zsh" : "bash", regex: RE_BASH_ZSH },
    { test: () => hint === "fish" || hint === "unknown" || hint === undefined, shell: "fish", regex: RE_FISH },
    { test: () => hint === "bash" || hint === "zsh" || hint === "unknown" || hint === undefined, shell: hint === "bash" ? "bash" : "zsh", regex: RE_BARE_POSIX },
  ];
  
  for (const m of matchers) {
    if (m.test() && m.regex.test(clean)) {
      return { shell: m.shell, command: clean.replace(m.regex, "$1").trim() };
    }
  }
  return null;
}

function parseContinuation(line: string): string | null {
  const clean = stripAnsi(line);
  if (!RE_CONTINUATION.test(clean)) return null;
  const next = clean.replace(RE_CONTINUATION, "$1");
  return next.trimEnd();
}

/**
 * Create a new command boundary from a detected prompt
 */
function createBoundary(line: string, detected: { shell: ShellKind; command: string }, i: number, shell: ShellKind): CommandBoundary {
  const resolvedShell = detected.shell === "unknown" ? detectShell(line) : shell;
  return {
    shell: resolvedShell === "unknown" ? detectShell(line) : resolvedShell,
    prompt: stripAnsi(line),
    command: detected.command,
    output: "",
    startLine: i,
    endLine: i,
  };
}

/**
 * Process a line within an existing boundary (continuation or output)
 */
function processBoundaryLine(current: CommandBoundary, line: string, i: number): void {
  const continuation = current.output === "" ? parseContinuation(line) : null;
  if (continuation != null) {
    current.command = `${current.command}\n${continuation}`.trim();
  } else {
    current.output += (current.output ? "\n" : "") + line;
  }
  current.endLine = i;
}

export function detectCommandBoundaries(transcript: string, shellHint?: ShellKind): CommandBoundary[] {
  const lines = String(transcript || "").replace(/\r\n/g, "\n").split("\n");
  const out: CommandBoundary[] = [];
  let current: CommandBoundary | null = null;
  let shell: ShellKind = shellHint && shellHint !== "unknown" ? shellHint : "unknown";

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const detected = parsePrompt(line, shell);
    
    if (detected) {
      if (current) {
        current.endLine = i - 1;
        out.push(current);
      }
      shell = detected.shell === "unknown" ? detectShell(line) : detected.shell;
      current = createBoundary(line, detected, i, shell);
      continue;
    }

    if (current) {
      processBoundaryLine(current, line, i);
    }
  }

  if (current) out.push(current);
  return out.filter((b) => !!b.command);
}

export function extractParameterKeys(command: string): string[] {
  const keys = new Set<string>();
  const re = /\{\{\s*([A-Z0-9_]+)\s*\}\}/gi;
  for (const m of String(command || "").matchAll(re)) {
    if (m[1]) keys.add(m[1].toUpperCase());
  }
  return Array.from(keys);
}

export function applyParameters(command: string, params: Record<string, string>): string {
  return String(command || "").replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/gi, (_all, key: string) => {
    const v = params[String(key || "").toUpperCase()];
    return v == null ? "" : String(v);
  });
}
