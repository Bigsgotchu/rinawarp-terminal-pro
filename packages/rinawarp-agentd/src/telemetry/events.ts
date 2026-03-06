/**
 * Telemetry Events
 * 
 * Defines anonymized telemetry events.
 */

export type TelemetryEventName =
  | "command_executed"
  | "command_success"
  | "command_failed"
  | "command_blocked"
  | "dry_run_used"
  | "ai_request"
  | "ai_error"
  | "validation_warning"
  | "session_start"
  | "session_end"
  | "feature_used";

export interface TelemetryEvent {
  event: TelemetryEventName;
  timestamp: number;
  metadata: Record<string, unknown>;
}

/**
 * Create a telemetry event
 */
export function createEvent(
  name: TelemetryEventName,
  metadata: Record<string, unknown> = {}
): TelemetryEvent {
  return {
    event: name,
    timestamp: Date.now(),
    metadata: sanitizeMetadata(metadata),
  };
}

/**
 * Sanitize metadata - remove any sensitive data
 */
function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    // Skip sensitive keys
    if (isSensitiveKey(key)) {
      sanitized[key] = "[redacted]";
      continue;
    }
    
    // Skip sensitive values
    if (typeof value === "string" && isSensitiveValue(value)) {
      sanitized[key] = "[redacted]";
      continue;
    }
    
    sanitized[key] = value;
  }
  
  return sanitized;
}

function isSensitiveKey(key: string): boolean {
  const sensitive = [
    "password", "secret", "token", "key", "api_key", "apikey",
    "credential", "auth", "private", "file_content", "env", "PATH"
  ];
  return sensitive.some(s => key.toLowerCase().includes(s));
}

function isSensitiveValue(value: string): boolean {
  // Check for API key patterns
  if (value.startsWith("sk-") || value.startsWith("sk_")) return true;
  if (value.startsWith("Bearer ")) return true;
  if (value.includes("ghp_") || value.startsWith("github_pat_")) return true;
  // Check for file paths that might contain secrets
  if (value.includes(".env") || value.includes("credentials")) return true;
  return false;
}

// Event creators

export function commandExecuted(command: string, success: boolean, durationMs: number) {
  return createEvent(success ? "command_success" : "command_failed", {
    command_type: categorizeCommand(command),
    duration_ms: durationMs,
  });
}

export function commandBlocked(reason: string) {
  return createEvent("command_blocked", { reason });
}

export function dryRunUsed(command: string) {
  return createEvent("dry_run_used", {
    command_type: categorizeCommand(command),
  });
}

export function aiRequest(model: string, intent: string) {
  return createEvent("ai_request", { model, intent });
}

export function aiError(errorType: string) {
  return createEvent("ai_error", { error_type: errorType });
}

export function validationWarning(risk: string) {
  return createEvent("validation_warning", { risk_level: risk });
}

export function sessionStart() {
  return createEvent("session_start", {
    version: process.env.npm_package_version || "1.0.0",
  });
}

export function sessionEnd(durationMs: number) {
  return createEvent("session_end", { duration_ms: durationMs });
}

export function featureUsed(feature: string) {
  return createEvent("feature_used", { feature_name: feature });
}

/**
 * Categorize command type (for analytics, not actual command)
 */
function categorizeCommand(command: string): string {
  const cmd = command.split(" ")[0].toLowerCase();
  
  if (cmd === "git") return "git";
  if (cmd === "npm" || cmd === "yarn" || cmd === "pnpm") return "package_manager";
  if (cmd === "docker") return "docker";
  if (cmd === "kubectl") return "kubernetes";
  if (cmd === "ls" || cmd === "cd" || cmd === "pwd") return "filesystem";
  if (cmd === "cat" || cmd === "grep" || cmd === "find") return "search";
  if (cmd === "curl" || cmd === "wget") return "network";
  
  return "other";
}
