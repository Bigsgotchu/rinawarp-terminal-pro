import type { IncomingMessage } from "node:http";
import type { LicenseTier } from "@rinawarp/core/enforcement/types.js";
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
export declare function resolveRequestLicense(req: IncomingMessage): LicenseTier;
