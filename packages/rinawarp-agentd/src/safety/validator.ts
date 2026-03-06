/**
 * Command Validator
 * 
 * Validates commands against safety policies.
 * 
 * Flow: parse → validate → explain → user approve → execute
 */

import type { RiskLevel, RiskAssessment } from "./risk.js";
import { createRiskAssessment, requiresConfirmation } from "./risk.js";
import type { SafetyPolicy } from "./policies.js";
import { getPolicy, type PolicyType } from "./policies.js";

export interface ValidationResult {
  /** Whether the command is allowed */
  ok: boolean;
  /** Risk level */
  risk: RiskLevel;
  /** Human-readable reason */
  reason?: string;
  /** Whether user confirmation is required */
  requiresConfirmation: boolean;
}

/**
 * Command validator
 * 
 * Validates commands before execution - prevents dangerous commands
 */
export class Validator {
  private policy: SafetyPolicy;

  constructor(policyType: PolicyType = "strict") {
    this.policy = getPolicy(policyType);
  }

  /**
   * Validate a single command
   * 
   * MUST be called before execution
   */
  validate(command: string): ValidationResult {
    // Check blocked patterns
    for (const blocked of this.policy.blockedPatterns) {
      if (command.includes(blocked.pattern)) {
        return {
          ok: false,
          risk: "high",
          reason: `BLOCKED: ${blocked.description}`,
          requiresConfirmation: true,
        };
      }
    }

    // Check warning patterns
    for (const warning of this.policy.warningPatterns) {
      if (command.includes(warning.pattern)) {
        return {
          ok: true,
          risk: "medium",
          reason: `WARNING: ${warning.description} - confirm before proceeding`,
          requiresConfirmation: true,
        };
      }
    }

    // Default: low risk
    return {
      ok: true,
      risk: "low",
      reason: undefined,
      requiresConfirmation: false,
    };
  }

  /**
   * Validate multiple commands
   */
  validateAll(commands: string[]): ValidationResult[] {
    return commands.map((cmd) => this.validate(cmd));
  }

  /**
   * Check if a command is safe to execute
   */
  isSafe(command: string): boolean {
    return this.validate(command).ok;
  }

  /**
   * Get risk assessment for a command
   */
  assessRisk(command: string): RiskAssessment {
    const result = this.validate(command);
    return createRiskAssessment(result.risk, result.reason || "Command validated");
  }

  /**
   * Check if any command requires confirmation
   */
  requiresUserConfirmation(commands: string[]): boolean {
    return commands.some((cmd) => this.validate(cmd).requiresConfirmation);
  }
}

/**
 * Quick validation function
 */
export function validateCommand(
  command: string,
  policyType: PolicyType = "strict"
): ValidationResult {
  const validator = new Validator(policyType);
  return validator.validate(command);
}

/**
 * Blocked patterns quick check
 */
export function isBlocked(command: string): boolean {
  return !new Validator("strict").validate(command).ok;
}

/**
 * Execute flow: parse → validate → explain → approve → execute
 * 
 * This is the safe execution pattern.
 */
export async function safeExecuteFlow(
  command: string,
  onValidate: (result: ValidationResult) => Promise<boolean>
): Promise<{ proceed: boolean; result?: ValidationResult }> {
  // Step 1: Validate
  const validation = validateCommand(command);
  
  // Step 2: Check if we should proceed
  if (!validation.ok) {
    return { proceed: false, result: validation };
  }
  
  // Step 3: Get user confirmation for medium/high risk
  if (validation.requiresConfirmation) {
    const approved = await onValidate(validation);
    if (!approved) {
      return { proceed: false };
    }
  }
  
  return { proceed: true, result: validation };
}
