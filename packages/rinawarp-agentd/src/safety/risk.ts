/**
 * Risk Assessment Types
 * 
 * Defines risk levels and assessment structures.
 */

export type RiskLevel = "low" | "medium" | "high";

export interface RiskAssessment {
  level: RiskLevel;
  reasoning: string;
  factors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  impact: RiskLevel;
  description: string;
}

export function createRiskAssessment(
  level: RiskLevel,
  reasoning: string,
  factors: RiskFactor[] = []
): RiskAssessment {
  return { level, reasoning, factors };
}

export function isHighRisk(assessment: RiskAssessment): boolean {
  return assessment.level === "high";
}

export function requiresConfirmation(level: RiskLevel): boolean {
  return level === "medium" || level === "high";
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case "low": return "green";
    case "medium": return "yellow";
    case "high": return "red";
  }
}

export function getRiskEmoji(level: RiskLevel): string {
  switch (level) {
    case "low": return "✓";
    case "medium": return "⚠";
    case "high": return "✗";
  }
}
