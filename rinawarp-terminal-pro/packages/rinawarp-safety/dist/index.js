"use strict";
/**
 * @rinawarp/safety
 *
 * Risk classification and safety policy exports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shannonEntropyBitsPerChar = exports.redactText = exports.analyzeCommand = exports.getRiskDescription = exports.requiresConfirmation = exports.classifyRisk = void 0;
var policy_1 = require("./policy");
Object.defineProperty(exports, "classifyRisk", { enumerable: true, get: function () { return policy_1.classifyRisk; } });
Object.defineProperty(exports, "requiresConfirmation", { enumerable: true, get: function () { return policy_1.requiresConfirmation; } });
Object.defineProperty(exports, "getRiskDescription", { enumerable: true, get: function () { return policy_1.getRiskDescription; } });
Object.defineProperty(exports, "analyzeCommand", { enumerable: true, get: function () { return policy_1.analyzeCommand; } });
var redaction_1 = require("./redaction");
Object.defineProperty(exports, "redactText", { enumerable: true, get: function () { return redaction_1.redactText; } });
Object.defineProperty(exports, "shannonEntropyBitsPerChar", { enumerable: true, get: function () { return redaction_1.shannonEntropyBitsPerChar; } });
