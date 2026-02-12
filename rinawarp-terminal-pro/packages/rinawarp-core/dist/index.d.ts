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
export * from "./enforcement/index.js";
export * from "./presentation/lens.js";
export * from "./tools/index.js";
