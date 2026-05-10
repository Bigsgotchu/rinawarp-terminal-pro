export type InputRoute =
  | { kind: "terminal"; reason: string }
  | { kind: "rina"; reason: string }
  | { kind: "ambiguous"; reason: string };

const SHELL_STARTERS = [
  "git",
  "npm",
  "pnpm",
  "yarn",
  "node",
  "python",
  "python3",
  "pip",
  "pip3",
  "cargo",
  "go",
  "docker",
  "kubectl",
  "ssh",
  "scp",
  "cd",
  "ls",
  "pwd",
  "cat",
  "mkdir",
  "rm",
  "mv",
  "cp",
  "touch",
  "chmod",
  "chown",
  "find",
  "grep",
  "rg",
  "curl",
  "wget",
  "ps",
  "kill",
  "lsof",
  "sudo",
  "make",
  "bash",
  "sh",
  "zsh",
] as const;

const NATURAL_LANGUAGE_STARTERS = [
  "why",
  "how",
  "what",
  "help",
  "explain",
  "debug",
  "can you",
  "show me",
  "tell me",
  "please explain",
] as const;

const DIRECT_RINA_GREETINGS = [
  "hi rina",
  "hey rina",
  "hello rina",
  "yo rina",
  "hi",
  "hey",
  "hello",
] as const;

const AMBIGUOUS_IMPERATIVE_STARTERS = [
  "run",
  "start",
  "stop",
  "build",
  "deploy",
  "open",
  "fix",
  "kill",
  "show",
  "find",
] as const;

function normalize(input: string): string {
  return String(input || "").trim().replace(/\s+/g, " ");
}

function startsWithAny(value: string, starters: readonly string[]): string | null {
  const lower = value.toLowerCase();
  return starters.find((starter) => lower === starter || lower.startsWith(`${starter} `)) || null;
}

function hasShellOperator(value: string): boolean {
  return /(?:&&|\|\||[|;<>])/.test(value);
}

function hasEnvAssignment(value: string): boolean {
  return /^(?:[A-Z_][A-Z0-9_]*=[^\s]+)(?:\s+[A-Z_][A-Z0-9_]*=[^\s]+)*\s+\S+/i.test(value);
}

function hasExecutablePath(value: string): boolean {
  return /^(?:\.{1,2}\/|~\/|\/)[^\s]+/.test(value);
}

function hasCliFlagSyntax(value: string): boolean {
  return /\s--?[a-z0-9][a-z0-9-]*(?:[=\s]|$)/i.test(value);
}

function hasPathLikeToken(value: string): boolean {
  return /(?:^|\s)(?:\.{1,2}\/|~\/|\/|[A-Za-z0-9_.-]+\/)[^\s]*/.test(value);
}

function isSentenceLike(value: string): boolean {
  return /\?$/.test(value) || /\b(?:why is|what does|how do i|help me|can you|tell me|explain this)\b/i.test(value);
}

export function classifyTerminalInput(input: string): InputRoute {
  const value = normalize(input);
  if (!value) return { kind: "ambiguous", reason: "empty input" };
  if (/^\/rina\b/i.test(value)) return { kind: "rina", reason: "explicit /rina shortcut" };
  if (/^kill\s+(?:port|process|whatever|what)\b/i.test(value)) {
    return { kind: "ambiguous", reason: "natural-language kill request" };
  }

  const shellStarter = startsWithAny(value, SHELL_STARTERS);
  if (shellStarter) return { kind: "terminal", reason: `known shell command: ${shellStarter}` };
  if (hasEnvAssignment(value)) return { kind: "terminal", reason: "environment assignment before command" };
  if (hasShellOperator(value)) return { kind: "terminal", reason: "contains shell operator" };
  if (hasExecutablePath(value)) return { kind: "terminal", reason: "starts with executable path" };
  if (hasCliFlagSyntax(value) && hasPathLikeToken(value)) {
    return { kind: "terminal", reason: "contains CLI flags and path syntax" };
  }

  const directGreeting = startsWithAny(value, DIRECT_RINA_GREETINGS);
  if (directGreeting) return { kind: "rina", reason: `direct greeting: ${directGreeting}` };

  const naturalStarter = startsWithAny(value, NATURAL_LANGUAGE_STARTERS);
  if (naturalStarter) return { kind: "rina", reason: `natural language starter: ${naturalStarter}` };
  if (isSentenceLike(value)) return { kind: "rina", reason: "sentence-like request" };
  if (/\b(?:build|failing|failed|failure|broken|error|debug|explain|why|what process|dev server|set up|setup)\b/i.test(value)) {
    return { kind: "rina", reason: "terminal-help language" };
  }

  const imperativeStarter = startsWithAny(value, AMBIGUOUS_IMPERATIVE_STARTERS);
  if (imperativeStarter) {
    return { kind: "ambiguous", reason: `short imperative request: ${imperativeStarter}` };
  }

  return { kind: "ambiguous", reason: "not clearly shell or natural language" };
}
