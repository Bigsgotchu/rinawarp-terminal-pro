"use strict";
/**
 * @rinawarp/safety
 *
 * Risk classification and safety policy exports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCommand = exports.getRiskDescription = exports.requiresConfirmation = exports.classifyRisk = void 0;
var policy_1 = require("./policy");
Object.defineProperty(exports, "classifyRisk", { enumerable: true, get: function () { return policy_1.classifyRisk; } });
Object.defineProperty(exports, "requiresConfirmation", { enumerable: true, get: function () { return policy_1.requiresConfirmation; } });
Object.defineProperty(exports, "getRiskDescription", { enumerable: true, get: function () { return policy_1.getRiskDescription; } });
Object.defineProperty(exports, "analyzeCommand", { enumerable: true, get: function () { return policy_1.analyzeCommand; } });
