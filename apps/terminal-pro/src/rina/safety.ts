/**
 * Rina OS Control Layer - Safety
 * 
 * Execution mode controls that prevent Rina from executing dangerous commands silently.
 * This is a critical safety layer that must be loaded before any execution.
 * 
 * Additive architecture - does not modify existing core functionality.
 */

/**
 * Execution mode type (duplicated to avoid circular imports)
 */
export type ExecutionMode = "explain" | "assist" | "auto";

/**
 * Dangerous command patterns that should ALWAYS be blocked
 * regardless of execution mode.
 */
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//i,           // Recursive delete from root
  /rm\s+-rf\s+\*/i,           // Recursive delete all
  /dd\s+if=.*of=\/dev\/sd/i,  // Direct disk write
  /mkfs\./i,                   // Filesystem format
  /shutdown/i,                 // System shutdown
  /reboot/i,                   // System reboot
  /halt/i,                     // System halt
  /init\s+0/i,                 // System init level 0
  /init\s+6/i,                 // System init level 6 (reboot)
  /poweroff/i,                 // Power off
  /:\(\)\{.*:\|:\&\}/i,        // Fork bomb
  /chmod\s+-R\s+777\s+\//i,    // Recursive chmod 777 on root
  /chown\s+-R/i,               // Recursive chown (potentially dangerous)
  />\s*\/dev\/sd/i,            // Direct device write
  /wget.*\|.*sh/i,             // Remote script execution
  /curl.*\|.*sh/i,              // Remote script execution
  /chmod\s+777/i,              // World-writable (debatable but risky)
  /sudo\s+rm/i,                // sudo remove
  /sudo\s+dd/i,                // sudo disk write
  /kill\s+-9\s*-1/i,           // Kill all processes
  /killall\s+-9/i,             // Kill all (by name)
  /:\!\|/i,                    // Shell bomb variant
];

/**
 * Commands that require explicit confirmation in assist mode
 */
const CONFIRMATION_REQUIRED = [
  /rm\s+-r/i,                 // Recursive remove
  /rm\s+-f/i,                 // Force remove
  /mv\s+.*\s+.*\s+-f/i,       // Force move overwrite
  /cp\s+.*\s+-f/i,            // Force copy overwrite
  /sed\s+-i/i,                 // In-place sed
  /find\s+.*\s+-delete/i,     // Find delete
  /tar\s+.*\s+-x.*\s+-C\s+\//i, // Extract to root
  /npm\s+install\s+-g/i,       // Global npm install
  /pip\s+install\s+--user/i,   // User pip install
  /docker\s+rm\s+-f/i,         // Force remove docker
  /docker\s+run\s+--rm/i,      // Run and remove container
];

/**
 * Check if a command matches any blocked pattern
 */
export function isCommandBlocked(command: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(command));
}

/**
 * Check if a command requires confirmation
 */
export function requiresConfirmation(command: string): boolean {
  return CONFIRMATION_REQUIRED.some(pattern => pattern.test(command));
}

/**
 * Safety check result
 */
export interface SafetyCheckResult {
  blocked: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}

/**
 * Perform safety check on a command
 */
export function safetyCheck(command: string, mode: ExecutionMode): SafetyCheckResult {
  // In explain mode, never block but note concerns
  if (mode === "explain") {
    return {
      blocked: false,
      requiresConfirmation: false,
      reason: "Explain mode: showing what would happen"
    };
  }

  // Check for blocked commands
  if (isCommandBlocked(command)) {
    return {
      blocked: true,
      requiresConfirmation: false,
      reason: "Command blocked: matches dangerous pattern"
    };
  }

  // Check for confirmation required
  if (mode === "assist" && requiresConfirmation(command)) {
    return {
      blocked: false,
      requiresConfirmation: true,
      reason: "Assist mode: confirmation required before execution"
    };
  }

  // In auto mode, allow execution without confirmation
  return {
    blocked: false,
    requiresConfirmation: false
  };
}

/**
 * Execution policy
 */
export interface ExecutionPolicy {
  mode: ExecutionMode;
  allowedTools: string[];
  blockedCommands: RegExp[];
}

const DEFAULT_POLICY: ExecutionPolicy = {
  mode: "assist",
  allowedTools: ["terminal", "filesystem", "search", "git", "system"],
  blockedCommands: BLOCKED_PATTERNS
};

let currentPolicy: ExecutionPolicy = { ...DEFAULT_POLICY };

export function getExecutionPolicy(): ExecutionPolicy {
  return { ...currentPolicy };
}

export function setExecutionPolicy(policy: Partial<ExecutionPolicy>): void {
  currentPolicy = { ...currentPolicy, ...policy };
}

export function resetExecutionPolicy(): void {
  currentPolicy = { ...DEFAULT_POLICY };
}
