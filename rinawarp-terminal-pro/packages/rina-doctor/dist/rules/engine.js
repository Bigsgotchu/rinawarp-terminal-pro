"use strict";
/**
 * Rules Engine - Deterministic Finding Generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ruleRegistry = exports.RuleRegistry = exports.COMMON_RULES = void 0;
exports.evaluateExpression = evaluateExpression;
exports.generateFindings = generateFindings;
exports.scoreDiagnoses = scoreDiagnoses;
exports.createRule = createRule;
// ============================================================================
// Expression Evaluator
// ============================================================================
function evaluateExpression(expr, metrics) {
    switch (expr.op) {
        case "gt":
            return (metrics[expr.lhs] || 0) > expr.rhs;
        case "gte":
            return (metrics[expr.lhs] || 0) >= expr.rhs;
        case "lt":
            return (metrics[expr.lhs] || 0) < expr.rhs;
        case "lte":
            return (metrics[expr.lhs] || 0) <= expr.rhs;
        case "eq":
            return metrics[expr.lhs] === expr.rhs;
        case "neq":
            return metrics[expr.lhs] !== expr.rhs;
        case "and":
            return expr.expressions.every(e => evaluateExpression(e, metrics));
        case "or":
            return expr.expressions.some(e => evaluateExpression(e, metrics));
        case "exists":
            return metrics[expr.path] !== undefined;
        case "matches":
            const value = metrics[expr.path];
            if (typeof value !== "string")
                return false;
            return new RegExp(expr.pattern).test(value);
        default:
            return false;
    }
}
// ============================================================================
// Finding Generator
// ============================================================================
function generateFindings(rules, evidence, stepOutputs) {
    const findings = [];
    for (const rule of rules) {
        try {
            if (evaluateExpression(rule.when, evidence.metrics)) {
                const finding = {
                    id: `finding_${rule.id}_${Date.now()}`,
                    severity: rule.emit.severity,
                    title: rule.emit.title,
                    explanation: rule.emit.explanation,
                    evidenceRefs: [],
                    confidence: rule.emit.confidence ?? 0.85
                };
                // Build evidence references from rule emit data
                // Check if emit has stepId or metricKey
                const emitAny = rule.emit;
                if (emitAny.stepId && stepOutputs[emitAny.stepId]) {
                    finding.evidenceRefs.push({
                        stepId: emitAny.stepId,
                        excerpt: stepOutputs[emitAny.stepId].stdout.slice(0, 200)
                    });
                }
                if (emitAny.metricKey && evidence.metrics[emitAny.metricKey] !== undefined) {
                    finding.evidenceRefs.push({
                        metricKey: emitAny.metricKey,
                        excerpt: String(evidence.metrics[emitAny.metricKey])
                    });
                }
                findings.push(finding);
            }
        }
        catch (e) {
            console.warn(`Rule ${rule.id} evaluation failed:`, e);
        }
    }
    const severityOrder = { critical: 0, warn: 1, info: 2 };
    return findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
function scoreDiagnoses(findings, candidates) {
    for (const candidate of candidates) {
        let supportScore = 0;
        const supporting = [];
        const disconfirming = [];
        for (const finding of findings) {
            const titleLower = finding.title.toLowerCase();
            if (candidate.supporting.some(s => s === finding.id || s.includes(titleLower) || titleLower.includes(s.toLowerCase()))) {
                supportScore += finding.severity === "critical" ? 1.5 : finding.severity === "warn" ? 1.0 : 0.5;
                supporting.push(finding.id);
            }
            if (candidate.disconfirming?.some(d => d === finding.id)) {
                supportScore -= 1.0;
                disconfirming.push(finding.id);
            }
        }
        if (supporting.length === 0) {
            supportScore *= 0.7;
        }
        candidate.score = Math.min(1.0, Math.max(0, supportScore));
        candidate.supporting = supporting;
        candidate.disconfirming = disconfirming;
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length === 0) {
        return {
            primary: {
                causeId: "unknown",
                label: "Unable to determine cause",
                score: 0,
                supporting: [],
                disconfirming: []
            },
            differential: []
        };
    }
    return {
        primary: candidates[0],
        differential: candidates.slice(1, 5)
    };
}
function createRule(id, when, severity, title, explanation, options) {
    const emit = {
        severity,
        title,
        explanation,
        confidence: options?.confidence ?? 0.85
    };
    if (options?.stepId)
        emit.stepId = options.stepId;
    if (options?.metricKey)
        emit.metricKey = options.metricKey;
    return { id, when, emit };
}
// Pre-defined rules
exports.COMMON_RULES = [
    createRule("cpu_sustained_overload", { op: "gte", lhs: "load1", rhs: 2 }, "warn", "High CPU Load", "System load exceeds number of CPU cores, indicating CPU pressure.", { confidence: 0.9, metricKey: "load1" }),
    createRule("cpu_critical_overload", { op: "gte", lhs: "load1", rhs: 4 }, "critical", "Critical CPU Load", "System is severely overloaded. Processes may be starved.", { confidence: 0.95, metricKey: "load1" }),
    createRule("mem_high_usage", { op: "gte", lhs: "memUsedPercent", rhs: 85 }, "warn", "High Memory Usage", "Memory usage is above 85%. System may be thrashing.", { confidence: 0.85, metricKey: "memUsedPercent" }),
    createRule("mem_critical", { op: "gte", lhs: "memUsedPercent", rhs: 95 }, "critical", "Critical Memory", "Memory is nearly exhausted. Risk of OOM kills.", { confidence: 0.95, metricKey: "memUsedPercent" }),
    createRule("disk_near_full", { op: "gte", lhs: "diskUsePercent", rhs: 85 }, "warn", "Disk Nearly Full", "Disk usage above 85%. May cause write failures.", { confidence: 0.9, metricKey: "diskUsePercent" }),
    createRule("disk_critical", { op: "gte", lhs: "diskUsePercent", rhs: 95 }, "critical", "Disk Critical", "Disk is critically full. Immediate cleanup needed.", { confidence: 0.95, metricKey: "diskUsePercent" }),
    createRule("thermal_high", { op: "gte", lhs: "cpuTemp", rhs: 80 }, "warn", "High Temperature", "CPU temperature above 80°C. Risk of throttling.", { confidence: 0.85, metricKey: "cpuTemp" }),
    createRule("thermal_critical", { op: "gte", lhs: "cpuTemp", rhs: 90 }, "critical", "Critical Temperature", "CPU temperature above 90°C. Risk of thermal damage.", { confidence: 0.95, metricKey: "cpuTemp" }),
    createRule("runaway_process", { op: "gt", lhs: "topCpuPercent", rhs: 100 }, "warn", "Runaway Process Detected", "A single process using >100% CPU (multi-core).", { confidence: 0.9, metricKey: "topCpuPercent" })
];
// ============================================================================
// Rule Registry
// ============================================================================
class RuleRegistry {
    rules = new Map();
    addRule(rule) {
        this.rules.set(rule.id, rule);
    }
    getRule(id) {
        return this.rules.get(id);
    }
    getAllRules() {
        return Array.from(this.rules.values());
    }
    loadRules(rules) {
        for (const rule of rules) {
            this.addRule(rule);
        }
    }
}
exports.RuleRegistry = RuleRegistry;
exports.ruleRegistry = new RuleRegistry();
exports.ruleRegistry.loadRules(exports.COMMON_RULES);
//# sourceMappingURL=engine.js.map