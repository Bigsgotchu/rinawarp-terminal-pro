import { redactText } from "@rinawarp/safety/redaction";
import fs from "node:fs";
import path from "node:path";

export type AgentProfile = {
  id: string;
  name: string;
  fs: {
    allowedReadRoots: string[];
    allowedWriteRoots: string[];
    denyWriteGlobs: string[];
    requireApprovalFor: {
      write: boolean;
      sensitiveWrites: boolean;
    };
  };
  cmd: {
    allowInteractive: boolean;
    requireApprovalForWriteRisk: boolean;
  };
  net: {
    allow: boolean;
    allowDomains: string[];
  };
};

export type CommandRisk = "read" | "safe-write" | "high-impact";

export type GateResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      message: string;
      requires?: "click" | "typed_yes" | { typed_phrase: string };
    };

export function canonicalize(p: string): string {
  const resolved = path.resolve(p);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

export function withinRoot(p: string, root: string): boolean {
  const rr = canonicalize(root);
  const pp = canonicalize(p);
  if (pp === rr) return true;
  const rel = path.relative(rr, pp);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function looksSensitivePath(filePath: string): boolean {
  const p = filePath.toLowerCase();
  return (
    p.endsWith(".env") ||
    p.includes(".ssh") ||
    p.includes("id_rsa") ||
    p.includes("id_ed25519") ||
    p.includes("known_hosts") ||
    p.includes("credentials") ||
    p.includes("secret") ||
    p.endsWith(".pem") ||
    p.endsWith(".p12") ||
    p.endsWith(".key")
  );
}

function matchesDenyGlob(p: string, deny: string[]): boolean {
  const s = p.toLowerCase();
  return deny.some((g) => {
    const gg = g.toLowerCase().trim();
    if (!gg) return false;
    if (gg.startsWith("*.")) return s.endsWith(gg.slice(1));
    if (gg.startsWith("*")) return s.includes(gg.slice(1));
    return s.endsWith(gg) || s.includes(gg);
  });
}

export function defaultProfileForProject(projectRoot: string): AgentProfile {
  const root = canonicalize(projectRoot);
  return {
    id: "default-safe",
    name: "Default (Safe)",
    fs: {
      allowedReadRoots: [root],
      allowedWriteRoots: [root],
      denyWriteGlobs: ["*.env", "*.pem", "*.key", "*.p12", "*id_rsa*", "*id_ed25519*", "*credentials*"],
      requireApprovalFor: { write: true, sensitiveWrites: true },
    },
    cmd: {
      allowInteractive: false,
      requireApprovalForWriteRisk: true,
    },
    net: {
      allow: false,
      allowDomains: [],
    },
  };
}

export function gateCommandRun(args: {
  profile: AgentProfile;
  command: string;
  risk: CommandRisk;
  confirmed: boolean;
  confirmationText: string;
}): GateResult {
  const { profile, command, risk, confirmed } = args;
  const interactiveLikely =
    /\b(top|htop|vim|nvim|nano|less|more|ssh|sftp|ftp|python|node|irb|rails\s+c|mysql|psql)\b/i.test(command);
  if (interactiveLikely && !profile.cmd.allowInteractive) {
    return { ok: false, reason: "interactive_disabled", message: "Agent profile blocks interactive commands." };
  }
  if (risk !== "read" && profile.cmd.requireApprovalForWriteRisk && !confirmed) {
    return {
      ok: false,
      reason: "approval_required",
      message: "Approval required for write-risk command.",
      requires: "click",
    };
  }
  return { ok: true };
}

export function sanitizeRulesText(raw: string): string {
  return redactText(String(raw ?? "")).redactedText;
}

export function summarizeProfile(profile: AgentProfile): string {
  const writeMode = profile.fs.requireApprovalFor.write ? "approval-required" : "allowed";
  const interactive = profile.cmd.allowInteractive ? "enabled" : "disabled";
  const network = profile.net.allow ? "enabled" : "disabled";
  return `Profile=${profile.name}; interactive=${interactive}; write=${writeMode}; network=${network}.`;
}
