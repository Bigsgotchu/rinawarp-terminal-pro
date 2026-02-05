/**
 * @rinawarp/api-client - ESM version for static sites
 */
export function createApiClient({ baseUrl }) {
  const base = String(baseUrl).replace(/\/+$/, "");
  async function json(url, method, body) {
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error(`${method} ${url} failed (${res.status})`);
    return await res.json();
  }
  return {
    authStart: (req) => json(`${base}/api/auth/start`, "POST", req),
    authVerify: (token) => json(`${base}/api/auth/verify?token=${encodeURIComponent(token)}`, "GET"),
    me: () => json(`${base}/api/me`, "GET"),
    downloadToken: (req) => json(`${base}/api/download-token`, "POST", req),
    portal: () => json(`${base}/api/portal`, "POST", {})
  };
}
