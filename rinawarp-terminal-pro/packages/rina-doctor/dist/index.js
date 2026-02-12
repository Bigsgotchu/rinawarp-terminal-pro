"use strict";
/**
 * @rinawarp/doctor - System Doctor Diagnostic Engine
 *
 * Pipeline: Intake -> Triage -> Inspect -> Collect -> Interpret -> Diagnose -> Recommend -> Gate -> Execute -> Verify -> Report
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAGNOSIS_CANDIDATES = exports.SystemDoctorEngine = exports.systemParser = exports.isAllowed = exports.classifyRisk = exports.normalizeCommand = exports.COMMON_RULES = exports.ruleRegistry = void 0;
// Core types
__exportStar(require("./types/index.js"), exports);
// Rules engine
var engine_js_1 = require("./rules/engine.js");
Object.defineProperty(exports, "ruleRegistry", { enumerable: true, get: function () { return engine_js_1.ruleRegistry; } });
Object.defineProperty(exports, "COMMON_RULES", { enumerable: true, get: function () { return engine_js_1.COMMON_RULES; } });
// Command normalizer
var normalizer_js_1 = require("./collector/normalizer.js");
Object.defineProperty(exports, "normalizeCommand", { enumerable: true, get: function () { return normalizer_js_1.normalizeCommand; } });
Object.defineProperty(exports, "classifyRisk", { enumerable: true, get: function () { return normalizer_js_1.classifyRisk; } });
Object.defineProperty(exports, "isAllowed", { enumerable: true, get: function () { return normalizer_js_1.isAllowed; } });
// System parser
var index_js_1 = require("./parser/index.js");
Object.defineProperty(exports, "systemParser", { enumerable: true, get: function () { return index_js_1.systemParser; } });
// Main engine
var index_js_2 = require("./engine/index.js");
Object.defineProperty(exports, "SystemDoctorEngine", { enumerable: true, get: function () { return index_js_2.SystemDoctorEngine; } });
// Common diagnosis candidates
var index_js_3 = require("./engine/index.js");
Object.defineProperty(exports, "DIAGNOSIS_CANDIDATES", { enumerable: true, get: function () { return index_js_3.DIAGNOSIS_CANDIDATES; } });
//# sourceMappingURL=index.js.map