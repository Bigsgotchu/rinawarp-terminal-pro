/**
 * Localhost daemon should be protected. Simplest: shared secret.
 */
export function requireAuth(req: import("node:http").IncomingMessage) {
  const required = process.env.RINAWARP_AGENTD_TOKEN;
  if (!required) return; // allow if not set (dev only)

  const got = req.headers["authorization"];
  if (!got || got !== `Bearer ${required}`) {
    const e = new Error("Unauthorized");
    (e as any).statusCode = 401;
    throw e;
  }
}
