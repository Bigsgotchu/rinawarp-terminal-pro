/**
 * Hot Computer Skill
 * 
 * Diagnose and remediate overheating issues.
 * 
 * This skill demonstrates the "Agent mindset" - it:
 * 1. Inspects system metrics (CPU, processes, thermal sensors)
 * 2. Proposes safe remediation steps
 * 3. Confirms before any destructive actions
 */

import type { AgentPlan, ToolCall } from "../types.ts";
import { getPlatform } from "@rinawarp/tools/terminal";

/**
 * Create a plan to diagnose and fix an overheating computer.
 * 
 * @returns An agent plan for diagnosing thermal issues
 */
export function planHotComputer(): AgentPlan {
  const platform = getPlatform();
  const steps: ToolCall[] = [
    // Step 1: System info
    {
      tool: "terminal",
      command: "uname -a",
      description: "Get system information",
      risk: "low",
    },
    // Step 2: Uptime and load
    {
      tool: "terminal",
      command: "uptime",
      description: "Check system load and uptime",
      risk: "low",
    },
    // Step 3: Top CPU consumers
    {
      tool: "terminal",
      command: "ps aux | sort -nrk 3 | head -20",
      description: "Find top CPU consuming processes",
      risk: "low",
    },
    // Step 4: Platform-specific thermal info
    ...getThermalSteps(platform),
    // Step 5: Memory usage
    {
      tool: "terminal",
      command: "free -h 2>/dev/null || vm_stat 2>/dev/null || echo \"Memory info unavailable\"",
      description: "Check memory usage",
      risk: "low",
    },
    // Step 6: Disk usage (full disk can cause overheating)
    {
      tool: "terminal",
      command: "df -h | head -10",
      description: "Check disk space",
      risk: "low",
    },
  ];
  
  return {
    intent: "diagnose overheating",
    summary: "Check CPU usage, top processes, and thermal sensors; propose safe remediation.",
    steps,
    metadata: {
      estimatedTimeSeconds: 30,
      requiresConfirmation: false,
      tags: ["diagnostics", "system", "thermal"],
    },
  };
}

/**
 * Get platform-specific thermal diagnostic steps.
 */
function getThermalSteps(platform: "linux" | "darwin" | "win32"): ToolCall[] {
  switch (platform) {
    case "darwin":
      return [
        {
          tool: "terminal",
          command: "top -l 1 | head -30",
          description: "Get macOS process list with CPU usage",
          risk: "low",
        },
        {
          tool: "terminal",
          command: "sudo powermetrics --samplers=cpu_power -n 1 2>/dev/null | grep -E '(CPU die temperature|CPU power)' || echo \"Thermal info via powermetrics unavailable (may require sudo)\"",
          description: "Get CPU thermal metrics on macOS",
          risk: "medium",
        },
        {
          tool: "terminal",
          command: "pmset -g thermlog 2>/dev/null | tail -20 || echo \"Thermal log unavailable\"",
          description: "Check macOS thermal log",
          risk: "low",
        },
      ];
      
    case "linux":
      return [
        {
          tool: "terminal",
          command: "top -bn1 | head -20",
          description: "Get Linux process list",
          risk: "low",
        },
        {
          tool: "terminal",
          command: "cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -5 || echo \"Thermal sensors unavailable\"",
          description: "Read thermal sensor temperatures",
          risk: "low",
        },
        {
          tool: "terminal",
          command: "sensors 2>/dev/null | grep -E '(Core|temp|Package)' | head -10 || echo \"sensors command unavailable\"",
          description: "Get sensor readings via lm-sensors",
          risk: "low",
        },
      ];
      
    case "win32":
      return [
        {
          tool: "terminal",
          command: "wmic cpu get loadpercentage,name 2>&1",
          description: "Get CPU load on Windows",
          risk: "low",
        },
        {
          tool: "terminal",
          command: "wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature GET CurrentTemperature 2>&1 || echo \"Thermal sensors unavailable\"",
          description: "Get thermal zone temperatures on Windows",
          risk: "low",
        },
      ];
      
    default:
      return [
        {
          tool: "terminal",
          command: "echo \"Platform-specific thermal diagnostics not available\"",
          description: "Fallback for unknown platform",
          risk: "low",
        },
      ];
  }
}

/**
 * Parse diagnostic output and suggest fixes.
 * This would be used by the agent to generate recommendations.
 */
export interface DiagnosticResult {
  highCpuProcesses: string[];
  thermalWarning: boolean;
  diskFull: boolean;
  recommendations: string[];
}

/**
 * Simple parser for diagnostic results.
 * In a real implementation, this would use LLM or structured parsing.
 */
export function parseDiagnostics(
  results: Array<{ command: string; output: string }>
): DiagnosticResult {
  const result: DiagnosticResult = {
    highCpuProcesses: [],
    thermalWarning: false,
    diskFull: false,
    recommendations: [],
  };
  
  for (const { output } of results) {
    // Look for high CPU processes (simplified heuristic)
    if (output.includes("%")) {
      const lines = output.split("\n");
      for (const line of lines) {
        const cpuMatch = line.match(/(\d+\.\d+)%\s*(cpu|CPU)/i);
        if (cpuMatch && parseFloat(cpuMatch[1]) > 50) {
          // Extract process name
          const parts = line.split(/\s+/);
          const procName = parts[parts.length - 1] || "unknown";
          if (!result.highCpuProcesses.includes(procName)) {
            result.highCpuProcesses.push(procName);
          }
        }
      }
    }
    
    // Look for thermal warnings
    if (output.match(/temp|temperature|thermal/i)) {
      const tempMatch = output.match(/(\d+)\s*°?C/i) || output.match(/(\d{3,4})\s*m?K/i);
      if (tempMatch) {
        const temp = parseInt(tempMatch[1], 10);
        // Convert if needed (mK to C = divide by 1000)
        const tempC = temp > 1000 ? temp / 1000 : temp;
        if (tempC > 80) {
          result.thermalWarning = true;
        }
      }
    }
    
    // Look for disk full warning
    if (output.match(/\d+\s*%\s*.*?(100%|9[5-9]%)/)) {
      result.diskFull = true;
    }
  }
  
  // Generate recommendations
  if (result.highCpuProcesses.length > 0) {
    result.recommendations.push(
      `High CPU usage detected from: ${result.highCpuProcesses.join(", ")}. Consider closing or restarting these processes.`
    );
  }
  
  if (result.thermalWarning) {
    result.recommendations.push(
      "High temperatures detected. Consider: closing resource-heavy apps, ensuring proper ventilation, or resetting SMC (macOS)."
    );
  }
  
  if (result.diskFull) {
    result.recommendations.push(
      "Disk is nearly full. Consider clearing cache files, removing unused applications, or clearing temporary files."
    );
  }
  
  if (result.recommendations.length === 0) {
    result.recommendations.push(
      "No obvious issues detected. If the computer is still running hot, consider: checking for dust buildup, ensuring vents are clear, or checking for malware."
    );
  }
  
  return result;
}
