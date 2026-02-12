"use strict";
/**
 * System Output Parser
 * Normalizes command outputs into structured data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemParser = exports.SystemParser = void 0;
class SystemParser {
    /**
     * Parse ps output into structured data
     */
    parsePS(stdout) {
        const lines = stdout.trim().split("\n");
        const result = [];
        // Skip header line
        for (const line of lines.slice(1)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 4)
                continue;
            const cpu = parseFloat(parts[2]) || 0;
            const mem = parseFloat(parts[3]) || 0;
            result.push({
                pid: parseInt(parts[0]) || 0,
                cpu,
                mem,
                command: parts.slice(-1)[0] || parts[0],
                user: parts[4] // might be undefined for some formats
            });
        }
        return result.sort((a, b) => b.cpu - a.cpu);
    }
    /**
     * Parse /proc/loadavg
     */
    parseLoadAvg(stdout) {
        const parts = stdout.trim().split(/\s+/);
        const runnableParts = parts[3]?.split("/") || [];
        return {
            load1: parseFloat(parts[0]) || 0,
            load5: parseFloat(parts[1]) || 0,
            load15: parseFloat(parts[2]) || 0,
            runnable: parseInt(runnableParts[0]) || 0,
            totalThreads: parseInt(runnableParts[1]) || 0,
            lastPid: parseInt(parts[4]) || 0
        };
    }
    /**
     * Parse free -h output
     */
    parseFree(stdout) {
        const lines = stdout.trim().split("\n");
        const memLine = lines[1] || lines[0];
        const parts = memLine.split(/\s+/).filter(Boolean);
        // free output: total used free shared buff/cache available
        const toBytes = (str) => {
            const multiplier = {
                "K": 1024, "M": 1024 ** 2, "G": 1024 ** 3, "T": 1024 ** 4
            };
            const last = str.slice(-1);
            const mult = multiplier[last] || 1;
            return parseFloat(str.slice(0, -1)) * mult;
        };
        return {
            total: toBytes(parts[1]),
            used: toBytes(parts[2]),
            free: toBytes(parts[3]),
            shared: toBytes(parts[4]) || 0,
            buffCache: toBytes(parts[5]) || 0,
            available: toBytes(parts[6]) || 0,
            swapTotal: lines[2] ? toBytes(lines[2].split(/\s+/).filter(Boolean)[1]) : undefined,
            swapFree: lines[2] ? toBytes(lines[2].split(/\s+/).filter(Boolean)[3]) : undefined
        };
    }
    /**
     * Parse df -h output
     */
    parseDisk(stdout) {
        const lines = stdout.trim().split("\n");
        const result = [];
        // Skip header
        for (const line of lines.slice(1)) {
            const parts = line.split(/\s+/).filter(Boolean);
            if (parts.length < 6)
                continue;
            const usePercent = parseInt(parts[4].replace("%", "")) || 0;
            result.push({
                filesystem: parts[0],
                size: parseSize(parts[1]),
                used: parseSize(parts[2]),
                available: parseSize(parts[3]),
                usePercent,
                mountPoint: parts[5]
            });
        }
        return result;
    }
    /**
     * Parse sensors output
     */
    parseSensors(stdout) {
        const result = {};
        const lines = stdout.trim().split("\n");
        // Look for Core temperature lines
        for (const line of lines) {
            const tempMatch = line.match(/Core\s*\d*:\s*([\d.]+)°C/i);
            if (tempMatch) {
                const temp = parseFloat(tempMatch[1]);
                if (!result.coreTemp || temp > result.coreTemp) {
                    result.coreTemp = temp;
                }
                if (!result.maxTemp || temp > result.maxTemp) {
                    result.maxTemp = temp;
                }
            }
            // Fan speed
            const fanMatch = line.match(/fan\d*:\s*(\d+)\s*RPM/i);
            if (fanMatch) {
                result.fanSpeed = parseInt(fanMatch[1]);
            }
        }
        return result;
    }
    /**
     * Build evidence bundle from collected outputs
     */
    buildEvidence(stepOutputs) {
        const metrics = {};
        const snapshots = [];
        const now = new Date().toISOString();
        // Parse ps
        if (stepOutputs.ps?.stdout) {
            const psData = this.parsePS(stepOutputs.ps.stdout);
            metrics["topCpuProcess"] = psData[0]?.command || "unknown";
            metrics["topCpuPercent"] = psData[0]?.cpu || 0;
            snapshots.push({
                ts: now,
                kind: "proc",
                data: { topProcesses: psData.slice(0, 10) }
            });
        }
        // Parse loadavg
        if (stepOutputs.loadavg?.stdout) {
            const load = this.parseLoadAvg(stepOutputs.loadavg.stdout);
            metrics["load1"] = load.load1;
            metrics["load5"] = load.load5;
            metrics["load15"] = load.load15;
            snapshots.push({
                ts: now,
                kind: "cpu",
                data: { load1: load.load1, load5: load.load5, load15: load.load15 }
            });
        }
        // Parse memory
        if (stepOutputs.free?.stdout) {
            const mem = this.parseFree(stepOutputs.free.stdout);
            metrics["memUsedPercent"] = ((mem.used / mem.total) * 100).toFixed(1);
            metrics["memAvailable"] = mem.available;
            snapshots.push({
                ts: now,
                kind: "mem",
                data: mem
            });
        }
        // Parse disk
        if (stepOutputs.df?.stdout) {
            const disks = this.parseDisk(stepOutputs.df.stdout);
            const rootDisk = disks.find(d => d.mountPoint === "/");
            if (rootDisk) {
                metrics["diskUsePercent"] = rootDisk.usePercent;
                metrics["diskAvailable"] = rootDisk.available;
            }
            snapshots.push({
                ts: now,
                kind: "disk",
                data: { partitions: disks }
            });
        }
        // Parse sensors
        if (stepOutputs.sensors?.stdout) {
            const temps = this.parseSensors(stepOutputs.sensors.stdout);
            if (temps.coreTemp) {
                metrics["cpuTemp"] = temps.coreTemp;
                metrics["tempSeverity"] = temps.coreTemp >= 90 ? "critical" : temps.coreTemp >= 80 ? "warn" : "normal";
            }
            snapshots.push({
                ts: now,
                kind: "thermal",
                data: temps
            });
        }
        return {
            collectedAt: now,
            raw: Object.fromEntries(Object.entries(stepOutputs).map(([k, v]) => [
                k,
                { ...v, stepId: k, durationMs: 0 }
            ])),
            metrics,
            snapshots
        };
    }
}
exports.SystemParser = SystemParser;
function parseSize(str) {
    const multiplier = {
        "K": 1024, "M": 1024 ** 2, "G": 1024 ** 3, "T": 1024 ** 4, "P": 1024 ** 5
    };
    const last = str.slice(-1);
    const mult = multiplier[last] || 1;
    return parseFloat(str.slice(0, -1)) * mult;
}
exports.systemParser = new SystemParser();
//# sourceMappingURL=index.js.map