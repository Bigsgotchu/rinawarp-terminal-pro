/**
 * @rinawarp/core
 *
 * Mode lens: presentation preferences only.
 * This module affects only how RinaWarp communicates (tone, verbosity, humor, teaching depth).
 * It must NEVER affect permissions, confirmation, or tool access.
 */
export type UserState = "calm" | "frustrated" | "exploratory" | "rushed";
export type ContextMaturity = "diagnosing" | "fixing" | "building";
export type Risk = "low" | "medium" | "high";
export interface PresentationPrefs {
    tone: "calm" | "confident" | "professional";
    verbosity: "low" | "medium" | "high";
    humor: "none" | "light";
    teachingDepth: "minimal" | "normal" | "deep";
}
/**
 * Infer presentation preferences from context.
 *
 * IMPORTANT: This function only affects presentation. The ExecutionEngine
 * never receives PresentationPrefs and makes all permission decisions
 * independently based on ToolRegistry, LicensePolicy, and ConfirmationPolicy.
 */
export declare function inferPresentationPrefs(args: {
    risk: Risk;
    userState: UserState;
    maturity: ContextMaturity;
}): PresentationPrefs;
/**
 * Format a message according to presentation preferences.
 */
export declare function formatMessage(content: string, prefs: PresentationPrefs, options?: {
    prefix?: string;
    suffix?: string;
}): string;
/**
 * Detect user state from message patterns.
 */
export declare function detectUserState(message: string): UserState;
/**
 * Map risk level to user state for presentation purposes.
 */
export declare function riskToUserState(risk: Risk): UserState;
