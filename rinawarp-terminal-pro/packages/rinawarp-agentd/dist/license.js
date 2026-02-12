import { createHmac, timingSafeEqual } from "node:crypto";
const VALID_LICENSE_TIERS = ["starter", "creator", "pro", "pioneer", "founder", "enterprise"];
const VALID_LICENSE_SET = new Set(VALID_LICENSE_TIERS);
function toSingleHeaderValue(value) {
    if (!value)
        return undefined;
    if (Array.isArray(value))
        return value[0];
    return value;
}
function normalizeTier(value) {
    if (!value)
        return undefined;
    const normalized = value.trim().toLowerCase();
    if (!normalized)
        return undefined;
    if (VALID_LICENSE_SET.has(normalized)) {
        return normalized;
    }
    return undefined;
}
function makeBadRequest(message) {
    const err = new Error(message);
    err.statusCode = 400;
    return err;
}
function makeUnauthorized(message) {
    const err = new Error(message);
    err.statusCode = 401;
    return err;
}
function makeServerError(message) {
    const err = new Error(message);
    err.statusCode = 500;
    return err;
}
function envFlag(name) {
    const raw = process.env[name];
    if (!raw)
        return false;
    const value = raw.trim().toLowerCase();
    return value === "1" || value === "true" || value === "yes";
}
function isProductionMode() {
    return process.env.NODE_ENV === "production";
}
function b64urlDecodeToBuffer(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    return Buffer.from(normalized + padding, "base64");
}
function parseTierFromLicenseToken(token, secret) {
    const parts = token.split(".");
    if (parts.length !== 2) {
        throw makeUnauthorized("invalid license token format");
    }
    const payloadPart = parts[0];
    const sigPart = parts[1];
    const payloadBytes = b64urlDecodeToBuffer(payloadPart);
    const providedSig = b64urlDecodeToBuffer(sigPart);
    const expectedSig = createHmac("sha256", secret).update(payloadBytes).digest();
    if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
        throw makeUnauthorized("invalid license token signature");
    }
    let payload;
    try {
        payload = JSON.parse(payloadBytes.toString("utf8"));
    }
    catch {
        throw makeUnauthorized("invalid license token payload");
    }
    if (!payload || typeof payload !== "object") {
        throw makeUnauthorized("invalid license token payload");
    }
    const record = payload;
    if (record.typ !== "license") {
        throw makeUnauthorized("invalid license token type");
    }
    const exp = typeof record.exp === "number" ? record.exp : null;
    if (!exp || !Number.isFinite(exp) || exp <= Date.now()) {
        throw makeUnauthorized("expired license token");
    }
    const tier = normalizeTier(typeof record.tier === "string" ? record.tier : undefined);
    if (!tier) {
        throw makeUnauthorized("invalid license token tier");
    }
    return tier;
}
/**
 * Resolve effective license for this request.
 *
 * Priority:
 * Production mode:
 * 1) Require signed entitlement token in `x-rinawarp-license-token`
 *    (verified via `RINAWARP_AGENTD_ENTITLEMENT_SECRET`)
 *
 * Non-production mode:
 * 1) Signed entitlement token in `x-rinawarp-license-token` (if configured)
 * 2) `RINAWARP_AGENTD_LICENSE` env var (if provided, must be valid)
 * 3) optional dev/testing tier header (`x-rinawarp-license`) only when:
 *    - NOT production mode
 *    - `RINAWARP_AGENTD_ALLOW_LICENSE_HEADER=true|1|yes`
 * 4) fallback: `starter` (safe default)
 */
export function resolveRequestLicense(req) {
    const entitlementSecret = process.env.RINAWARP_AGENTD_ENTITLEMENT_SECRET;
    const entitlementToken = toSingleHeaderValue(req.headers["x-rinawarp-license-token"]);
    if (isProductionMode()) {
        if (!entitlementSecret) {
            throw makeServerError("missing RINAWARP_AGENTD_ENTITLEMENT_SECRET in production");
        }
        if (!entitlementToken) {
            throw makeUnauthorized("missing x-rinawarp-license-token");
        }
        return parseTierFromLicenseToken(entitlementToken, entitlementSecret);
    }
    if (entitlementToken) {
        if (!entitlementSecret) {
            throw makeServerError("x-rinawarp-license-token provided but RINAWARP_AGENTD_ENTITLEMENT_SECRET is not configured");
        }
        return parseTierFromLicenseToken(entitlementToken, entitlementSecret);
    }
    const envValue = process.env.RINAWARP_AGENTD_LICENSE;
    if (envValue !== undefined) {
        const fromEnv = normalizeTier(envValue);
        if (!fromEnv) {
            throw makeBadRequest("invalid RINAWARP_AGENTD_LICENSE value");
        }
        return fromEnv;
    }
    const headerAllowed = !isProductionMode() && envFlag("RINAWARP_AGENTD_ALLOW_LICENSE_HEADER");
    const headerValue = toSingleHeaderValue(req.headers["x-rinawarp-license"]);
    if (headerAllowed && headerValue !== undefined) {
        const fromHeader = normalizeTier(headerValue);
        if (!fromHeader) {
            throw makeBadRequest("invalid x-rinawarp-license header");
        }
        return fromHeader;
    }
    return "starter";
}
