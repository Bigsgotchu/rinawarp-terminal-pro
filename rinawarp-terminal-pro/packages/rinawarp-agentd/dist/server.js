/**
 * This is the core: plan endpoint, execute endpoint, cancel, stream.
 */
import http from "node:http";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
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
                for (const step of body.plan) {
                    if (planState.cancelled)
                        break;
                    // confirmation gate if needed
                    if (step.requires_confirmation) {
                        if (!body.confirmed || body.confirmationText !== "YES") {
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
                sse("plan_run_end", { planRunId, cancelled });
                // close SSE if open
                const sseRes = runningPlans.get(planRunId)?.sseRes;
                if (sseRes)
                    sseRes.end();
                runningPlans.delete(planRunId);
                return;
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
