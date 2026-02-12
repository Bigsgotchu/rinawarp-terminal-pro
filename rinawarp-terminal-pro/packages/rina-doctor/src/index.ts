/**
 * @rinawarp/doctor - System Doctor Diagnostic Engine
 * 
 * Pipeline: Intake -> Triage -> Inspect -> Collect -> Interpret -> Diagnose -> Recommend -> Gate -> Execute -> Verify -> Report
 */

// Core types
export * from "./types/index.js";

// Rules engine
export { ruleRegistry, COMMON_RULES } from "./rules/engine.js";

// Command normalizer
export { normalizeCommand, classifyRisk, isAllowed } from "./collector/normalizer.js";

// System parser
export { systemParser } from "./parser/index.js";

// Main engine
export { SystemDoctorEngine, type DoctorConfig, type TriageResult, type ExecuteOptions } from "./engine/index.js";

// Common diagnosis candidates
export { DIAGNOSIS_CANDIDATES } from "./engine/index.js";
