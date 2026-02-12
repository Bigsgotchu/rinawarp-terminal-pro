/**
 * System Output Parser
 * Normalizes command outputs into structured data
 */
import type { EvidenceBundle } from "../types/index.ts";
export interface ParsedPS {
    pid: number;
    ppid?: number;
    cpu: number;
    mem: number;
    command: string;
    user?: string;
    elapsed?: string;
}
export interface ParsedLoadAvg {
    load1: number;
    load5: number;
    load15: number;
    runnable: number;
    totalThreads: number;
    lastPid: number;
}
export interface ParsedMemory {
    total: number;
    used: number;
    free: number;
    shared: number;
    buffCache: number;
    available: number;
    swapTotal?: number;
    swapFree?: number;
}
export interface ParsedDisk {
    filesystem: string;
    size: number;
    used: number;
    available: number;
    usePercent: number;
    mountPoint: string;
}
export interface ParsedSensors {
    coreTemp?: number;
    maxTemp?: number;
    fanSpeed?: number;
}
export declare class SystemParser {
    /**
     * Parse ps output into structured data
     */
    parsePS(stdout: string): ParsedPS[];
    /**
     * Parse /proc/loadavg
     */
    parseLoadAvg(stdout: string): ParsedLoadAvg;
    /**
     * Parse free -h output
     */
    parseFree(stdout: string): ParsedMemory;
    /**
     * Parse df -h output
     */
    parseDisk(stdout: string): ParsedDisk[];
    /**
     * Parse sensors output
     */
    parseSensors(stdout: string): ParsedSensors;
    /**
     * Build evidence bundle from collected outputs
     */
    buildEvidence(stepOutputs: Record<string, {
        stdout: string;
        stderr: string;
        exitCode: number | null;
    }>): EvidenceBundle;
}
export declare const systemParser: SystemParser;
//# sourceMappingURL=index.d.ts.map