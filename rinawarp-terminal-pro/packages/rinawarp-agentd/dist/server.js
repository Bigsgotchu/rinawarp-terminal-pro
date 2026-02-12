/**
 * This is the core: plan endpoint, execute endpoint, cancel, stream.
 */
import http from "node:http";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ExecutionEngine } from "@rinawarp/core/enforcement/index.js";
import { createStandardRegistry } from "@rinawarp/core/tools/registry.js";
import { executeViaEngine } from "@rinawarp/core/adapters/unify-execution.js";
import { normalizeProjectRoot } from "./projectRoot.js";
import { requireAuth } from "./auth.js";
import { handlePreflight, setCors } from "./cors.js";
import { sseInit, sseSend } from "./streaming.js";
import { resolveRequestLicense } from "./license.js";
const engine = new ExecutionEngine(createStandardRegistry());
function expectedSafety(risk) {
    if (risk === "high-impact") {
        return { risk_level: "high", requires_confirmation: true };
    }
    if (risk === "safe-write") {
        return { risk_level: "medium", requires_confirmation: false };
    }
    return { risk_level: "low", requires_confirmation: false };
}
function validatePlanStep(step, index) {
    const errors = [];
    const prefix = `plan[${index}]`;
    const allowedRisks = ["inspect", "safe-write", "high-impact"];
    if (!allowedRisks.includes(step.risk)) {
        errors.push(`${prefix}.risk must be one of: inspect, safe-write, high-impact`);
        return errors;
    }
    const expected = expectedSafety(step.risk);
    if (!step.stepId?.trim()) {
        errors.push(`${prefix}.stepId is required`);
    }
    if (!step.description?.trim()) {
        errors.push(`${prefix}.description is required`);
    }
    if (step.tool !== "terminal.write") {
        errors.push(`${prefix}.tool must be terminal.write`);
    }
    if (!step.input?.command?.trim()) {
        errors.push(`${prefix}.input.command is required`);
    }
    if (step.risk_level !== expected.risk_level) {
        errors.push(`${prefix}.risk_level must be ${expected.risk_level} for risk=${step.risk}`);
    }
    if (step.requires_confirmation !== expected.requires_confirmation) {
        errors.push(`${prefix}.requires_confirmation must be ${String(expected.requires_confirmation)} for risk=${step.risk}`);
    }
    if (!step.verification_plan || !Array.isArray(step.verification_plan.steps)) {
        errors.push(`${prefix}.verification_plan.steps must be an array`);
    }
    if (step.requires_confirmation && !step.confirmationScope?.trim()) {
        errors.push(`${prefix}.confirmationScope is required when requires_confirmation=true`);
    }
    return errors;
}
function validatePlanForExecution(plan) {
    if (!Array.isArray(plan) || plan.length === 0) {
        return ["plan must contain at least one step"];
    }
    const errors = [];
    for (let i = 0; i < plan.length; i++) {
        errors.push(...validatePlanStep(plan[i], i));
    }
    return errors;
}
// --- minimal "plan" generator (replace with LLM planner later)
function makePlan(intentText, projectRoot) {
    const planId = randomUUID();
    const steps = [
        {
            stepId: "inspect:git",
            description: "Inspect git working tree state",
            tool: "terminal.write",
            input: { command: "git status", cwd: projectRoot, timeoutMs: 60_000, stepId: "inspect:git" },
            risk: "inspect",
            risk_level: "low",
            requires_confirmation: false,
            verification_plan: { steps: [] }
        },
        {
            stepId: "build",
            description: "Run project build command",
            tool: "terminal.write",
            input: { command: "npm -v && npm run build", cwd: projectRoot, timeoutMs: 60_000, stepId: "build" },
            risk: "safe-write",
            risk_level: "medium",
            requires_confirmation: false,
            verification_plan: { steps: [] }
        }
    ];
    return {
        planId,
        intentText,
        projectRoot,
        reasoning: `I'll inspect repo state then run the build and report failures.`,
        steps
    };
}
// --- runtime state
const runningStreams = new Map();
const runningPlans = new Map();
const completedReports = new Map();
const metrics = {
    runs_total: 0,
    runs_completed: 0,
    runs_failed: 0,
    runs_cancelled: 0,
    interventions_total: 0,
    confirmation_denied_total: 0,
    failure_classes: {},
    duration_ms_total: 0,
    unblock_runs: 0,
    unblock_duration_ms_total: 0
};
async function readJson(req) {
    const chunks = [];
    for await (const c of req)
        chunks.push(Buffer.from(c));
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw)
        return null;
    return JSON.parse(raw);
}
function sendJson(res, status, body) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
}
async function persistRunReport(projectRoot, planRunId, report) {
    const reportDir = path.join(projectRoot, ".rinawarp", "reports");
    await mkdir(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, `${planRunId}.json`);
    await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
    return reportPath;
}
async function appendMetricEvent(projectRoot, event) {
    const metricDir = path.join(projectRoot, ".rinawarp", "metrics");
    await mkdir(metricDir, { recursive: true });
    const file = path.join(metricDir, "events.ndjson");
    const line = `${JSON.stringify({ ts: Date.now(), ...event })}\n`;
    await writeFile(file, line, { encoding: "utf8", flag: "a" });
}
function incFailureClass(name) {
    if (!name)
        return;
    metrics.failure_classes[name] = (metrics.failure_classes[name] ?? 0) + 1;
}
export function createServer(opts) {
    const { port } = opts;
    const server = http.createServer(async (req, res) => {
        try {
            setCors(req, res);
            if (req.method === "OPTIONS")
                return handlePreflight(req, res);
            // simple routing
            const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
            // auth
            requireAuth(req);
            // --- SSE stream for a plan run
            if (req.method === "GET" && url.pathname === "/v1/stream") {
                const planRunId = url.searchParams.get("planRunId");
                if (!planRunId)
                    return sendJson(res, 400, { ok: false, error: "planRunId required" });
                sseInit(res);
                // we don't store client list; we just keep this connection open
                // and send events during execution using closure (below).
                // For simplicity, we attach the res to plan state:
                runningPlans.get(planRunId).sseRes = res;
                req.on("close", () => {
                    // client disconnected; keep executing but stop emitting
                    const st = runningPlans.get(planRunId);
                    if (st)
                        st.sseRes = undefined;
                });
                return;
            }
            // --- PLAN
            if (req.method === "POST" && url.pathname === "/v1/plan") {
                const body = (await readJson(req));
                if (!body?.intentText?.trim()) {
                    return sendJson(res, 400, { ok: false, error: "intentText is required" });
                }
                if (!body?.projectRoot?.trim()) {
                    return sendJson(res, 400, { ok: false, error: "projectRoot is required" });
                }
                const projectRoot = normalizeProjectRoot(body.projectRoot);
                const plan = makePlan(body.intentText, projectRoot);
                const validationErrors = validatePlanForExecution(plan.steps);
                if (validationErrors.length > 0) {
                    return sendJson(res, 500, { ok: false, error: `planner produced invalid safety contract: ${validationErrors.join("; ")}` });
                }
                return sendJson(res, 200, { ok: true, plan });
            }
            // --- EXECUTE PLAN (sequential)
            if (req.method === "POST" && url.pathname === "/v1/execute-plan") {
                const body = (await readJson(req));
                if (!Array.isArray(body?.plan) || body.plan.length === 0) {
                    return sendJson(res, 400, { ok: false, error: "plan is required and must contain at least one step" });
                }
                if (!body?.projectRoot?.trim()) {
                    return sendJson(res, 400, { ok: false, error: "projectRoot is required" });
                }
                const validationErrors = validatePlanForExecution(body.plan);
                if (validationErrors.length > 0) {
                    return sendJson(res, 400, { ok: false, error: `invalid plan safety contract: ${validationErrors.join("; ")}` });
                }
                const projectRoot = normalizeProjectRoot(body.projectRoot);
                const license = resolveRequestLicense(req);
                const planRunId = randomUUID();
                runningPlans.set(planRunId, { cancelled: false });
                const runStartedAt = Date.now();
                metrics.runs_total += 1;
                // respond immediately (client can open /v1/stream?planRunId=...)
                sendJson(res, 200, { ok: true, planRunId });
                // execute async but in-process (still "now", not background promises to user)
                const planState = runningPlans.get(planRunId);
                const sse = (event, data) => {
                    const sseRes = planState.sseRes;
                    if (!sseRes)
                        return;
                    sseSend(sseRes, event, data);
                };
                sse("plan_run_start", { planRunId, license });
                const stepReports = [];
                let runSuccessful = true;
                let devFixerSignal = false;
                for (const step of body.plan) {
                    if (planState.cancelled)
                        break;
                    if (/build|fix|deps|unblock/i.test(step.stepId ?? "") ||
                        /build|fix|dependency|unblock/i.test(step.description ?? "")) {
                        devFixerSignal = true;
                    }
                    if (step.requires_confirmation) {
                        metrics.interventions_total += 1;
                    }
                    // confirmation gate if needed
                    if (step.requires_confirmation) {
                        if (!body.confirmed || body.confirmationText !== "YES") {
                            metrics.confirmation_denied_total += 1;
                            runSuccessful = false;
                            await appendMetricEvent(projectRoot, {
                                type: "confirmation_denied",
                                planRunId,
                                stepId: step.stepId,
                                tool: step.tool
                            });
                            sse("plan_halt", { planRunId, reason: "confirmation_required" });
                            break;
                        }
                    }
                    const streamId = randomUUID();
                    planState.currentStreamId = streamId;
                    runningStreams.set(streamId, { cancelled: false });
                    sse("plan_step_start", { planRunId, streamId, step });
                    const report = await executeViaEngine({
                        engine,
                        plan: [
                            {
                                tool: step.tool,
                                risk_level: step.risk_level,
                                requires_confirmation: step.requires_confirmation,
                                verification_plan: step.verification_plan,
                                input: {
                                    ...step.input,
                                    cwd: step.input.cwd ?? projectRoot,
                                    stepId: step.stepId
                                },
                                description: step.description,
                                stepId: step.stepId,
                                ...(step.confirmationScope ? { confirmationScope: step.confirmationScope } : {})
                            }
                        ],
                        projectRoot,
                        license,
                        confirmationToken: step.requires_confirmation
                            ? { kind: "explicit", approved: true, scope: step.confirmationScope }
                            : undefined,
                        emit: (evt) => {
                            const st = runningStreams.get(streamId);
                            if (!st || st.cancelled || planState.cancelled)
                                return;
                            if (evt.type === "chunk") {
                                sse("chunk", { planRunId, streamId, stream: evt.stream, data: evt.data });
                            }
                            if (evt.type === "timeout") {
                                sse("timeout", { planRunId, streamId });
                            }
                            if (evt.type === "cancel") {
                                sse("cancel", { planRunId, streamId, reason: evt.reason ?? "soft" });
                            }
                        }
                    });
                    const last = report.steps.at(-1)?.result;
                    const ok = report.ok && (last?.success ?? false);
                    const lastError = last && !last.success ? last.error : undefined;
                    stepReports.push({ stepId: step.stepId, report });
                    if (!ok) {
                        runSuccessful = false;
                        incFailureClass(report.haltedBecause);
                        await appendMetricEvent(projectRoot, {
                            type: "step_failure",
                            planRunId,
                            stepId: step.stepId,
                            haltedBecause: report.haltedBecause ?? "unknown"
                        });
                    }
                    sse("plan_step_end", {
                        planRunId,
                        streamId,
                        ok,
                        report
                    });
                    runningStreams.delete(streamId);
                    // stop-on-fail
                    if (!ok) {
                        sse("plan_halt", { planRunId, reason: report.haltedBecause ?? lastError ?? "Execution failed" });
                        break;
                    }
                }
                const cancelled = runningPlans.get(planRunId)?.cancelled ?? false;
                const runEndedAt = Date.now();
                const runDurationMs = runEndedAt - runStartedAt;
                metrics.duration_ms_total += runDurationMs;
                if (cancelled)
                    metrics.runs_cancelled += 1;
                else if (runSuccessful)
                    metrics.runs_completed += 1;
                else
                    metrics.runs_failed += 1;
                if (!cancelled && runSuccessful && devFixerSignal) {
                    metrics.unblock_runs += 1;
                    metrics.unblock_duration_ms_total += runDurationMs;
                }
                const finalReport = {
                    planRunId,
                    projectRoot,
                    license,
                    cancelled,
                    startedAt: runStartedAt,
                    finishedAt: runEndedAt,
                    durationMs: runEndedAt - runStartedAt,
                    steps: stepReports
                };
                completedReports.set(planRunId, finalReport);
                await appendMetricEvent(projectRoot, {
                    type: "run_end",
                    planRunId,
                    cancelled,
                    ok: runSuccessful && !cancelled,
                    durationMs: runEndedAt - runStartedAt,
                    license
                });
                try {
                    const reportPath = await persistRunReport(projectRoot, planRunId, finalReport);
                    sse("plan_report", { planRunId, reportPath });
                }
                catch (err) {
                    sse("plan_report_error", { planRunId, error: err?.message ?? "failed to persist report" });
                }
                sse("plan_run_end", { planRunId, cancelled });
                // close SSE if open
                const sseRes = runningPlans.get(planRunId)?.sseRes;
                if (sseRes)
                    sseRes.end();
                runningPlans.delete(planRunId);
                return;
            }
            // --- GET MACHINE REPORT
            if (req.method === "GET" && url.pathname === "/v1/report") {
                const planRunId = url.searchParams.get("planRunId");
                if (!planRunId)
                    return sendJson(res, 400, { ok: false, error: "planRunId required" });
                const report = completedReports.get(planRunId);
                if (!report)
                    return sendJson(res, 404, { ok: false, error: "report not found" });
                return sendJson(res, 200, { ok: true, report });
            }
            // --- METRICS SUMMARY
            if (req.method === "GET" && url.pathname === "/v1/metrics") {
                const completedOrFailed = metrics.runs_completed + metrics.runs_failed;
                const completionRate = completedOrFailed === 0 ? 0 : metrics.runs_completed / completedOrFailed;
                const avgDurationMs = metrics.runs_total === 0 ? 0 : Math.round(metrics.duration_ms_total / metrics.runs_total);
                const mttrUnblockMs = metrics.unblock_runs === 0 ? 0 : Math.round(metrics.unblock_duration_ms_total / metrics.unblock_runs);
                return sendJson(res, 200, {
                    ok: true,
                    metrics: {
                        ...metrics,
                        completion_rate: completionRate,
                        avg_duration_ms: avgDurationMs,
                        mttr_unblock_ms: mttrUnblockMs
                    }
                });
            }
            // --- CANCEL (plan or stream)
            if (req.method === "POST" && url.pathname === "/v1/cancel") {
                const body = (await readJson(req));
                if (body.planRunId) {
                    const st = runningPlans.get(body.planRunId);
                    if (st)
                        st.cancelled = true;
                }
                if (body.streamId) {
                    const st = runningStreams.get(body.streamId);
                    if (st)
                        st.cancelled = true;
                }
                return sendJson(res, 200, { ok: true });
            }
            return sendJson(res, 404, { ok: false, error: "Not found" });
        }
        catch (e) {
            const code = e?.statusCode ?? 500;
            return sendJson(res, code, { ok: false, error: e?.message ?? "Server error" });
        }
    });
    return {
        listen() {
            return new Promise((resolve) => {
                server.listen(port, "127.0.0.1", () => {
                    const addr = server.address();
                    const boundPort = typeof addr === "object" && addr ? addr.port : port;
                    // eslint-disable-next-line no-console
                    console.log(`[agentd] listening on http://127.0.0.1:${boundPort}`);
                    resolve(boundPort);
                });
            });
        },
        close() {
            return new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        }
    };
}
