export type RedactionLevel = "low" | "medium" | "high";

export type RedactionHit = {
  start: number;
  end: number;
  kind: string;
  level: RedactionLevel;
  preview: string;
};

export type RedactionResult = {
  redactedText: string;
  hits: RedactionHit[];
};

export type RedactionOptions = {
  replacement?: string;
  minEntropyBitsPerChar?: number;
  minTokenLen?: number;
  maxTokenLen?: number;
  allowlistRegexes?: RegExp[];
  enabledKinds?: Set<string>;
};

const DEFAULT_REPLACEMENT = "[REDACTED]";

const PATTERNS: Array<{
  kind: string;
  level: RedactionLevel;
  regex: RegExp;
  preview: (m: string) => string;
}> = [
  {
    kind: "pem_private_key",
    level: "high",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    preview: () => "-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----",
  },
  {
    kind: "aws_access_key_id",
    level: "high",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    preview: (m) => `${m.slice(0, 4)}****${m.slice(-4)}`,
  },
  {
    kind: "aws_secret_access_key",
    level: "high",
    regex: /\b(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*([A-Za-z0-9/+]{40})\b/g,
    preview: (m) => maskValue(m),
  },
  {
    kind: "github_token",
    level: "high",
    regex: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/g,
    preview: (m) => `${m.slice(0, 4)}_****${m.slice(-4)}`,
  },
  {
    kind: "jwt",
    level: "medium",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    preview: () => "jwt_****",
  },
  {
    kind: "generic_api_key_kv",
    level: "medium",
    regex: /\b(api[_-]?key|token|secret|password|passwd)\s*[:=]\s*([^\s'"]{8,})/gi,
    preview: (m) => maskValue(m),
  },
];

function maskValue(text: string): string {
  const parts = text.split(/[:=]/);
  if (parts.length < 2) return "****";
  const key = parts[0].trim();
  const value = parts.slice(1).join(":").trim();
  if (value.length <= 8) return `${key}=****`;
  return `${key}=****${value.slice(-4)}`;
}

function isLikelyHash(token: string): boolean {
  return /^[a-f0-9]{40}$/i.test(token) || /^[a-f0-9]{64}$/i.test(token);
}

export function shannonEntropyBitsPerChar(token: string): number {
  const freq = new Map<string, number>();
  for (const ch of token) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const len = token.length;
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function makePreview(token: string): string {
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}****${token.slice(-4)}`;
}

function normalizeOptions(options?: RedactionOptions): Required<RedactionOptions> {
  return {
    replacement: options?.replacement ?? DEFAULT_REPLACEMENT,
    minEntropyBitsPerChar: options?.minEntropyBitsPerChar ?? 3.5,
    minTokenLen: options?.minTokenLen ?? 24,
    maxTokenLen: options?.maxTokenLen ?? 256,
    allowlistRegexes: options?.allowlistRegexes ?? [],
    enabledKinds: options?.enabledKinds ?? new Set<string>(),
  };
}

function collectRegexHits(text: string, opts: Required<RedactionOptions>): RedactionHit[] {
  const hits: RedactionHit[] = [];
  for (const p of PATTERNS) {
    if (opts.enabledKinds.size > 0 && !opts.enabledKinds.has(p.kind)) continue;
    p.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = p.regex.exec(text)) !== null) {
      const full = match[0];
      if (opts.allowlistRegexes.some((r) => r.test(full))) continue;
      const start = match.index;
      const end = start + full.length;
      hits.push({ start, end, kind: p.kind, level: p.level, preview: p.preview(full) });
    }
  }
  return hits;
}

function collectEntropyHits(text: string, opts: Required<RedactionOptions>): RedactionHit[] {
  const hits: RedactionHit[] = [];
  const tokenRe = /[A-Za-z0-9+/_=-]{16,}/g;
  tokenRe.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(text)) !== null) {
    const token = match[0];
    if (token.length < opts.minTokenLen || token.length > opts.maxTokenLen) continue;
    if (isLikelyHash(token)) continue;
    if (opts.allowlistRegexes.some((r) => r.test(token))) continue;
    const entropy = shannonEntropyBitsPerChar(token);
    if (entropy < opts.minEntropyBitsPerChar) continue;
    const start = match.index;
    const end = start + token.length;
    hits.push({
      start,
      end,
      kind: "high_entropy_token",
      level: "medium",
      preview: makePreview(token),
    });
  }
  return hits;
}

function prioritizeLevel(a: RedactionLevel, b: RedactionLevel): RedactionLevel {
  const rank: Record<RedactionLevel, number> = { low: 1, medium: 2, high: 3 };
  return rank[b] > rank[a] ? b : a;
}

function mergeOverlaps(hits: RedactionHit[]): RedactionHit[] {
  const sorted = [...hits].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: RedactionHit[] = [];
  for (const hit of sorted) {
    const last = merged[merged.length - 1];
    if (!last || hit.start > last.end) {
      merged.push({ ...hit });
      continue;
    }
    last.end = Math.max(last.end, hit.end);
    last.level = prioritizeLevel(last.level, hit.level);
    last.kind = last.kind === hit.kind ? last.kind : `${last.kind}+${hit.kind}`;
    if (!last.preview) last.preview = hit.preview;
  }
  return merged;
}

export function redactText(text: string, options?: RedactionOptions): RedactionResult {
  const opts = normalizeOptions(options);
  const hits = mergeOverlaps([...collectRegexHits(text, opts), ...collectEntropyHits(text, opts)]);
  if (hits.length === 0) return { redactedText: text, hits: [] };
  let out = "";
  let cursor = 0;
  for (const hit of hits) {
    out += text.slice(cursor, hit.start);
    out += opts.replacement;
    cursor = hit.end;
  }
  out += text.slice(cursor);
  return { redactedText: out, hits };
}
