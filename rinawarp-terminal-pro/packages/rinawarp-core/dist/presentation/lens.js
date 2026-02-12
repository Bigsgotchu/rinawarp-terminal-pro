/**
 * @rinawarp/core
 *
 * Mode lens: presentation preferences only.
 * This module affects only how RinaWarp communicates (tone, verbosity, humor, teaching depth).
 * It must NEVER affect permissions, confirmation, or tool access.
 */
/**
 * Infer presentation preferences from context.
 *
 * IMPORTANT: This function only affects presentation. The ExecutionEngine
 * never receives PresentationPrefs and makes all permission decisions
 * independently based on ToolRegistry, LicensePolicy, and ConfirmationPolicy.
 */
export function inferPresentationPrefs(args) {
    const { risk, userState, maturity } = args;
    // High-risk operations: calm, minimal verbosity, no humor
    if (risk === "high") {
        return {
            tone: "calm",
            verbosity: "medium",
            humor: "none",
            teachingDepth: "minimal",
        };
    }
    // Frustrated users: calm, minimal verbosity, no humor, no teaching
    if (userState === "frustrated") {
        return {
            tone: "calm",
            verbosity: "low",
            humor: "none",
            teachingDepth: "minimal",
        };
    }
    // Building mode: professional, medium verbosity, light humor
    if (maturity === "building") {
        return {
            tone: "professional",
            verbosity: "medium",
            humor: "light",
            teachingDepth: "normal",
        };
    }
    // Exploratory users: confident, high verbosity, light humor, deep teaching
    if (userState === "exploratory") {
        return {
            tone: "confident",
            verbosity: "high",
            humor: "light",
            teachingDepth: "deep",
        };
    }
    // Rushed users: confident, low verbosity, light humor
    if (userState === "rushed") {
        return {
            tone: "confident",
            verbosity: "low",
            humor: "light",
            teachingDepth: "minimal",
        };
    }
    // Default: confident, low verbosity, light humor, normal teaching
    return {
        tone: "confident",
        verbosity: "low",
        humor: "light",
        teachingDepth: "normal",
    };
}
/**
 * Format a message according to presentation preferences.
 */
export function formatMessage(content, prefs, options) {
    let formatted = content;
    // Adjust verbosity
    if (prefs.verbosity === "low") {
        // Strip extra details, keep only essential info
        formatted = formatted.split("\n").filter((line) => line.length < 80).slice(0, 3).join("\n");
    }
    // Add tone-appropriate prefix/suffix
    if (prefs.tone === "calm") {
        formatted = `Let me help with that.\n\n${formatted}`;
    }
    else if (prefs.tone === "professional") {
        formatted = `${formatted}`;
    }
    else {
        // confident tone - no special prefix
    }
    if (options?.prefix) {
        formatted = `${options.prefix}\n\n${formatted}`;
    }
    if (options?.suffix) {
        formatted = `${formatted}\n\n${options.suffix}`;
    }
    return formatted;
}
/**
 * Detect user state from message patterns.
 */
export function detectUserState(message) {
    const lower = message.toLowerCase();
    // Frustrated patterns
    const frustratedPatterns = ["frustrated", "annoying", "stupid", "broken", "hate", "terrible", "worst", "never works"];
    if (frustratedPatterns.some((p) => lower.includes(p))) {
        return "frustrated";
    }
    // Exploratory patterns
    const exploratoryPatterns = ["how does", "explain", "why", "what if", "tell me more", "learning", "understand"];
    if (exploratoryPatterns.some((p) => lower.includes(p))) {
        return "exploratory";
    }
    // Rushed patterns
    const rushedPatterns = ["quick", "fast", "hurry", "asap", "now", "just do it", "skip", "fast"];
    if (rushedPatterns.some((p) => lower.includes(p))) {
        return "rushed";
    }
    return "calm";
}
/**
 * Map risk level to user state for presentation purposes.
 */
export function riskToUserState(risk) {
    switch (risk) {
        case "high":
            return "calm"; // High risk = calm presentation
        case "medium":
            return "calm"; // Medium risk = also calm
        default:
            return "calm"; // Default
    }
}
