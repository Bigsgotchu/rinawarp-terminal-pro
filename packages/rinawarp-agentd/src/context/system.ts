/**
 * System Context
 * 
 * Collects system information.
 */

import { execSync } from "child_process";

export interface SystemInfo {
  os: string;
  arch: string;
  hostname: string;
  shell: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: string;
  uptime: string;
}

/**
 * Collect system info
 */
export function collectSystemInfo(): SystemInfo {
  return {
    os: process.platform,
    arch: process.arch,
    hostname: getHostname(),
    shell: getShell(),
    cpuModel: getCpuModel(),
    cpuCores: getCpuCores(),
    totalMemory: getTotalMemory(),
    uptime: getUptime(),
  };
}

function getHostname(): string {
  try {
    return process.env.HOSTNAME || require("os").hostname();
  } catch {
    return "unknown";
  }
}

function getShell(): string {
  return process.env.SHELL?.split("/").pop() || "bash";
}

function getCpuModel(): string {
  try {
    const cpus = require("os").cpus();
    return cpus[0]?.model || "unknown";
  } catch {
    return "unknown";
  }
}

function getCpuCores(): number {
  try {
    return require("os").cpus().length;
  } catch {
    return 1;
  }
}

function getTotalMemory(): string {
  try {
    const bytes = require("os").totalmem();
    return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`;
  } catch {
    return "unknown";
  }
}

function getUptime(): string {
  try {
    const seconds = require("os").uptime();
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  } catch {
    return "unknown";
  }
}

/**
 * Convert to prompt string
 */
export function toPromptString(info: SystemInfo): string {
  return `OS: ${info.os} (${info.arch})
Hostname: ${info.hostname}
Shell: ${info.shell}
CPU: ${info.cpuModel} (${info.cpuCores} cores)
Memory: ${info.totalMemory}
Uptime: ${info.uptime}`;
}
