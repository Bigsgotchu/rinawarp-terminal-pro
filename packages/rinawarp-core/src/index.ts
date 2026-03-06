/**
 * @rinawarp/core
 *
 * Enforcement spine and presentation lens for RinaWarp v1.
 *
 * Exports:
 * - Enforcement: ToolRegistry, LicensePolicy, ConfirmationPolicy, ExecutionEngine
 * - Presentation: inferPresentationPrefs, detectUserState
 * - Tools: createStandardRegistry, createReadOnlyRegistry, createDoctorRegistry
 */

// Enforcement spine
export * from "./enforcement/index.js";

// Presentation lens
export * from "./presentation/lens.js";

// Tools registry
export * from "./tools/index.js";
