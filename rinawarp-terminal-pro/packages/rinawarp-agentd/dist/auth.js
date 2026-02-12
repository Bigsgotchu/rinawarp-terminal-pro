/**
 * Localhost daemon should be protected. Simplest: shared secret.
 */
export function requireAuth(req) {
    const required = process.env.RINAWARP_AGENTD_TOKEN;
    if (!required)
        return; // allow if not set (dev only)
    const got = req.headers["authorization"];
    if (!got || got !== `Bearer ${required}`) {
        const e = new Error("Unauthorized");
        e.statusCode = 401;
        throw e;
    }
}
