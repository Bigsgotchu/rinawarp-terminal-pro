/**
 * Command Validator
 * 
 * Validates commands against safety policies.
 */

import type { RiskLevel, RiskAssessment } from "./risk.js";
import { createRiskAssessment, requiresConfirmation } from "./risk.js";
import type { SafetyPolicy } from "./policies.js";
import { getPolicy, type PolicyType } from "./policies.js";

export interface ValidationResult {
  allowed: boolean;
  risk: RiskLevel;
  reason?: string;
  requiresConfirmation: boolean;
}

/**
 * Command validator
 */
export class Validator {
  private policy: SafetyPolicy;

  constructor(policyType: PolicyType = "strict") {
    this.policy = getPolicy(policyType);
  }

  /**
   * Validate a single command
   */
  validate(command: string): ValidationResult {
    // Check blocked patterns
    for (const blocked of this.policy.blockedPatterns) {
      if (command.includes(blocked.pattern)) {
        return {
          allowed: false,
          risk: "high",
          reason: `Blocked: ${blocked.description}`,
          requiresConfirmation: true,
        };
      }
    }

    // Check warning patterns
    for (const warning of this.policy.warningPatterns) {
      if (command.includes(warning.pattern)) {
        return {
          allowed: true,
          risk: "medium",
          reason: `Warning: ${warning.description}`,
          requiresConfirmation: true,
        };
      }
    }

    // Default: low risk
    return {
      allowed: true,
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
    return this.validate(command).allowed;
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
  return !new Validator("strict").validate(command).allowed;
}
