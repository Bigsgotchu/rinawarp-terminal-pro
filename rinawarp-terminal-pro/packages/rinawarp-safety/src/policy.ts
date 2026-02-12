/**
 * RinaWarp Safety Policy
 * 
 * Risk classification for agent tool calls.
 * This is your moat - the safety layer that prevents dangerous operations.
 */

// Commands that are always high risk (destructive or system-level)
const HIGH_RISK_PATTERNS = [
  /rm\s+-rf/,                    // Recursive delete
  /shutdown/,                    // System shutdown
  /reboot/,                      // System reboot
  /mkfs/,                        // Filesystem creation
  /dd\s+if=/,                    // Disk dump
  /format/,                      // Disk format
  /diskutil\s+erase/,            // macOS disk erase
  /reg\s+delete/,                // Windows registry delete
  /bcdedit/,                     // Windows boot config
  /chown\s+-R/,                  // Recursive ownership change
  /chmod\s+-R/,                  // Recursive permission change
  /docker\s+system\s+prune/,     // Docker system prune
  /docker\s+rm\s+-f/,            // Force remove containers
  /pkill\s+-9/,                  // Force kill processes
  /killall\s+-9/,                // Force kill all processes
];

// Commands that are medium risk (require elevated privileges or can cause issues)
const MEDIUM_RISK_PATTERNS = [
  /sudo/,                        // Elevated privileges
  /kill\s+-9/,                   // Force kill
  /service\s+(restart|stop)/,    // Service manipulation
  /systemctl\s+(restart|stop|disable)/,  // Systemd manipulation
  /apt\s+(remove|purge|autoremove)/,    // Package removal
  /yum\s+(remove|erase)/,        // Package removal
  /npm\s+(uninstall|remove)/,    // Package removal
  /pip\s+(uninstall|remove)/,    // Package removal
];

export type RiskLevel = "low" | "medium" | "high";

/**
 * Classify the risk level of a command string.
 * 
 * @param command - The command string to classify
 * @returns The risk level: "low", "medium", or "high"
 */
export function classifyRisk(command: string): RiskLevel {
  const normalized = command.trim();
  
  // Check for high risk patterns
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(normalized)) {
      return "high";
    }
  }
  
  // Check for medium risk patterns
  for (const pattern of MEDIUM_RISK_PATTERNS) {
    if (pattern.test(normalized)) {
      return "medium";
    }
  }
  
  return "low";
}

/**
 * Determine if a risk level requires user confirmation.
 * 
 * @param risk - The risk level to check
 * @returns True if the operation requires confirmation
 */
export function requiresConfirmation(risk: RiskLevel): boolean {
  return risk !== "low";
}

/**
 * Get a human-readable description of why a command is flagged.
 * 
 * @param command - The command string to analyze
 * @returns A description of the risk, or null if low risk
 */
export function getRiskDescription(command: string): string | null {
  const normalized = command.trim();
  
  if (/rm\s+-rf/.test(normalized)) {
    return "This command recursively deletes files and cannot be undone.";
  }
  if (/shutdown|reboot/.test(normalized)) {
    return "This command will shut down or restart the system.";
  }
  if (/mkfs|format|diskutil\s+erase/.test(normalized)) {
    return "This command will format/erase a disk, destroying all data.";
  }
  if (/dd\s+if=/.test(normalized)) {
    return "This command can write data directly to disk, which is dangerous.";
  }
  if (/chown\s+-R|chmod\s+-R/.test(normalized)) {
    return "This command recursively changes ownership/permissions, which can break system security.";
  }
  if (/sudo/.test(normalized)) {
    return "This command requires elevated privileges.";
  }
  if (/kill\s+-9/.test(normalized)) {
    return "This forcefully terminates processes, which may cause data loss.";
  }
  
  return null;
}

/**
 * Check if a command is safe to execute automatically.
 * 
 * @param command - The command to check
 * @returns Object with isSafe flag and risk details
 */
export function analyzeCommand(command: string): {
  isSafe: boolean;
  risk: RiskLevel;
  requiresConfirm: boolean;
  description: string | null;
} {
  const risk = classifyRisk(command);
  const requiresConfirm = requiresConfirmation(risk);
  const description = getRiskDescription(command);
  
  return {
    isSafe: !requiresConfirm,
    risk,
    requiresConfirm,
    description
  };
}
