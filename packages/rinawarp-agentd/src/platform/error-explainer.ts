/**
 * Error Explainer
 * 
 * Problem #2: Debugging Failed Commands
 * Problem #4: Error Log Explainer
 * 
 * "git push failed" → "Remote has commits you don't have. Fix: git pull --rebase"
 * "TypeError: Cannot read properties of undefined" → "variable is undefined. Fix: const user = data?.user"
 */

import { generateFixPlan } from "./llm.js";
import type { LLMConfig } from "./llm.js";

export interface ErrorContext {
  command: string;
  errorOutput: string;
  exitCode?: number;
  workingDirectory?: string;
  recentCommands?: string[];
}

export interface ErrorExplanation {
  analysis: string;
  likelyCause: string;
  suggestedFix: string;
  commands: string[];
  risk: "low" | "medium" | "high";
  confidence: number;
  documentation?: string[];
}

/**
 * Common error patterns and their explanations
 */
const COMMON_ERRORS: Record<string, {
  cause: string;
  fix: string;
  docs: string[];
}> = {
  "failed to push": {
    cause: "Remote has commits you don't have locally",
    fix: "git pull --rebase origin <branch>",
    docs: ["https://git-scm.com/book/en/v2/Git-Branching-Rebasing"],
  },
  "permission denied": {
    cause: "Insufficient permissions to access file or directory",
    fix: "Check file permissions or use sudo (if appropriate)",
    docs: ["https://www.chmod manual.com"],
  },
  "no such file or directory": {
    cause: "File or directory doesn't exist",
    fix: "Check path spelling or create the file/directory",
    docs: [],
  },
  "command not found": {
    cause: "Command executable not in PATH",
    fix: "Install the command or add to PATH",
    docs: [],
  },
  "cannot read properties of undefined": {
    cause: "Accessing property of undefined/null value",
    fix: "Use optional chaining: value?.property",
    docs: ["https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining"],
  },
  "cannot read property": {
    cause: "Accessing property of undefined/null value",
    fix: "Add null check or use optional chaining",
    docs: [],
  },
  "module not found": {
    cause: "Required module not installed or path incorrect",
    fix: "npm install <module> or check import path",
    docs: [],
  },
  "dependency conflict": {
    cause: "Package version mismatch",
    fix: "npm install --legacy-peer-deps or update versions",
    docs: [],
  },
  "connection refused": {
    cause: "Service not running or firewall blocking",
    fix: "Start the service or check port",
    docs: [],
  },
  "timeout": {
    cause: "Operation took too long",
    fix: "Increase timeout or check network/service",
    docs: [],
  },
};

/**
 * Check if error matches common pattern
 */
function matchCommonError(errorOutput: string): { cause: string; fix: string; docs: string[] } | null {
  const lowerError = errorOutput.toLowerCase();
  
  for (const [pattern, info] of Object.entries(COMMON_ERRORS)) {
    if (lowerError.includes(pattern)) {
      return info;
    }
  }
  
  return null;
}

/**
 * Explain a failed command and suggest fixes
 */
export async function explainError(
  config: LLMConfig,
  errorContext: ErrorContext
): Promise<ErrorExplanation> {
  const { command, errorOutput, exitCode, workingDirectory, recentCommands } = errorContext;
  
  // First try common error patterns
  const commonMatch = matchCommonError(errorOutput);
  
  // Build context for LLM
  const context = buildErrorContext(command, errorOutput, exitCode, workingDirectory, recentCommands);
  
  const prompt = `You are a debugging assistant. Analyze the command error and provide a fix.

${context}

Respond with ONLY valid JSON:
{
  "analysis": "What happened",
  "likelyCause": "Root cause of the error",
  "suggestedFix": "How to fix it",
  "commands": ["command1", "command2"],
  "risk": "low|medium|high",
  "confidence": 0.0-1.0,
  "documentation": ["relevant docs URLs"]
}`;

  try {
    const result = await generateFixPlan(config, {
      userPrompt: `Command failed: ${command}\nError: ${errorOutput}`,
      systemContext: {
        os: "unknown",
        kernel: "",
        hostname: "",
        uptime: "",
        cpu: "",
        memory: "",
        disk: "",
        processes: "",
        services: "",
      },
    }, {
      systemPrompt: prompt,
      maxRetries: 1,
    });
    
    // If we have a common error match, prioritize that
    if (commonMatch) {
      return {
        analysis: result.analysis,
        likelyCause: commonMatch.cause,
        suggestedFix: commonMatch.fix,
        commands: result.commands.length > 0 ? result.commands : [commonMatch.fix],
        risk: result.risk,
        confidence: Math.max(result.confidence, 0.8),
        documentation: commonMatch.docs,
      };
    }
    
    return {
      analysis: result.analysis,
      likelyCause: result.reasoning || "Unknown cause",
      suggestedFix: result.analysis,
      commands: result.commands,
      risk: result.risk,
      confidence: result.confidence,
      documentation: result.commands.length > 0 ? [
        "https://google.com/search?q=" + encodeURIComponent(command + " " + errorOutput.slice(0, 50))
      ] : [],
    };
  } catch (error) {
    // Fall back to common error match or generic response
    if (commonMatch) {
      return {
        analysis: "Command failed",
        likelyCause: commonMatch.cause,
        suggestedFix: commonMatch.fix,
        commands: [commonMatch.fix],
        risk: "medium",
        confidence: 0.9,
        documentation: commonMatch.docs,
      };
    }
    
    return {
      analysis: "Command failed",
      likelyCause: "Unknown error",
      suggestedFix: "Check the error message and try again",
      commands: [],
      risk: "low",
      confidence: 0,
      documentation: [],
    };
  }
}

function buildErrorContext(
  command: string,
  errorOutput: string,
  exitCode?: number,
  workingDirectory?: string,
  recentCommands?: string[]
): string {
  let ctx = `Command: ${command}`;
  
  if (exitCode !== undefined) {
    ctx += `\nExit code: ${exitCode}`;
  }
  
  if (workingDirectory) {
    ctx += `\nWorking directory: ${workingDirectory}`;
  }
  
  ctx += `\nError output:\n${errorOutput.slice(0, 1000)}`;
  
  if (recentCommands && recentCommands.length > 0) {
    ctx += `\nRecent commands:\n${recentCommands.slice(-3).join("\n")}`;
  }
  
  return ctx;
}

/**
 * Parse stack trace for additional context
 */
export function parseStackTrace(stackTrace: string): {
  file?: string;
  line?: number;
  errorType?: string;
  message?: string;
} {
  const result: Record<string, string> = {};
  
  // Try to extract error type
  const errorMatch = stackTrace.match(/^(\w+Error):/m);
  if (errorMatch) {
    result.errorType = errorMatch[1];
  }
  
  // Try to extract file and line
  const fileMatch = stackTrace.match(/at\s+.+\s+\((.+):(\d+):\d+\)/);
  if (fileMatch) {
    result.file = fileMatch[1];
    result.line = fileMatch[2];
  }
  
  // Try to extract message
  const messageMatch = stackTrace.match(/^[^:]+:\s*(.+)$/m);
  if (messageMatch) {
    result.message = messageMatch[1];
  }
  
  return result;
}
