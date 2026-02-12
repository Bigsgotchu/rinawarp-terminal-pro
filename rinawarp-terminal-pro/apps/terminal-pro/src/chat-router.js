/**
 * Chat Router - Single entry point for all chat interactions
 * Replaces button-driven workflows with chat-first interaction
 */
import { doctorInspect, doctorCollect, doctorInterpret, doctorExecuteFix, doctorVerify } from "./doctor-bridge.js";
let state = { mode: "idle" };
export const chatRouter = {
    /**
     * Main chat handler - routes messages to appropriate handlers
     */
    async handle(text, emit) {
        const msg = text.trim();
        // Cancel anytime
        if (["cancel", "stop", "abort"].includes(msg.toLowerCase())) {
            const execState = state;
            // Emit cancel event for transcript
            emit?.({
                type: "cancel",
                streamId: execState.streamId,
                stepId: execState.stepId,
                command: execState.command,
                timestamp: new Date().toISOString()
            });
            state = { mode: "idle" };
            return [{ role: "rina", text: "Cancelled — the process may continue running but output is suppressed." }];
        }
        // Awaiting confirmation for fix
        if (state.mode === "awaiting-fix") {
            return await handleFixConfirmation(msg);
        }
        // New intent → System Doctor
        if (looksLikeSystemIssue(msg)) {
            return await handleSystemDoctor(msg);
        }
        // Default: normal chat response
        return [{ role: "rina", text: "I'm here. Tell me what you want to do." }];
    },
    /**
     * Get current state (for debugging/UI)
     */
    getState() {
        return state;
    },
    /**
     * Reset state (for testing/clearing)
     */
    reset() {
        state = { mode: "idle" };
    }
};
/**
 * Handle fix confirmation flow
 */
async function handleFixConfirmation(msg) {
    const awaitingState = state;
    // High-impact actions require typed YES
    if (awaitingState.risk === "high-impact" && msg !== "YES") {
        return [{ role: "rina", text: "For this action, I need you to type **YES** exactly to proceed." }];
    }
    // Non-high-impact actions accept multiple confirmation phrases
    if (awaitingState.risk !== "high-impact" && !["run it", "yes", "proceed"].includes(msg.toLowerCase())) {
        return [{ role: "rina", text: "If you want me to apply the fix, reply **run it**." }];
    }
    // Execute the fix
    const after = await doctorExecuteFix(awaitingState.selected, true, msg);
    const verified = await doctorVerify({
        intent: awaitingState.context.intent,
        before: awaitingState.context.before,
        after,
        diagnosis: awaitingState.context.diagnosis
    });
    state = { mode: "idle" };
    return [
        { role: "rina", text: formatOutcome(verified.outcome) }
    ];
}
/**
 * Handle System Doctor flow: inspect → collect → interpret → propose fix
 */
async function handleSystemDoctor(intent) {
    // Step 1: Inspect - build the inspection plan
    const inspect = await doctorInspect(intent);
    // Step 2: Collect - execute inspection steps
    const evidence = await doctorCollect(inspect.inspectPlan.steps);
    // Step 3: Interpret - analyze evidence and generate diagnosis
    const interpreted = await doctorInterpret({ intent, evidence });
    // Select the safest fix option (first one by default)
    const safest = interpreted.fixOptions?.[0];
    // Store state for confirmation
    state = {
        mode: "awaiting-fix",
        fixOptions: interpreted.fixOptions || [],
        selected: safest,
        risk: safest?.risk,
        context: {
            intent,
            before: evidence,
            diagnosis: interpreted.diagnosis
        }
    };
    // Return diagnosis and proposed fix
    return [
        {
            role: "rina",
            text: `
Here's what I found:

${formatFindings(interpreted.findings || [])}

Most likely cause:
${formatDiagnosis(interpreted.diagnosis)}

Safest fix:
${safest?.label || "No fix available"}

Reply **run it** to apply this fix.
${safest?.risk === "high-impact" ? "\nFor this action, type **YES**." : ""}
      `
        }
    ];
}
/**
 * Detect if message describes a system issue
 */
function looksLikeSystemIssue(t) {
    const s = t.toLowerCase();
    const keywords = ["hot", "slow", "disk", "cpu", "memory", "wifi", "network", "docker", "build", "failing", "error", "problem", "issue"];
    return keywords.some(k => s.includes(k));
}
/**
 * Format findings for display
 */
function formatFindings(f) {
    if (!f || f.length === 0)
        return "No specific findings.";
    return f.map(x => `- ${x.title || x.label || "Unknown"}`).join("\n");
}
/**
 * Format diagnosis for display
 */
function formatDiagnosis(d) {
    if (!d || !d.primary)
        return "Unable to determine cause.";
    const label = d.primary.label || d.primary.causeId || "Unknown";
    const confidence = d.primary.probability ? Math.round(d.primary.probability * 100) : "N/A";
    return `${label} (${confidence}% confidence)`;
}
/**
 * Format outcome for display
 */
function formatOutcome(o) {
    if (!o)
        return "Action completed.";
    return `
Done.

Status: ${o.status || "completed"}
${o.rootCause ? `Root cause: ${o.rootCause}` : ""}
${o.results?.map((r) => `- ${r}`).join("\n") || ""}
  `;
}
