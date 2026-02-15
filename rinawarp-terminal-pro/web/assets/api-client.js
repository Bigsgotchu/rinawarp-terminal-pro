/**
 * @rinawarp/api-client - ESM version for static sites
 */
export function createApiClient({ baseUrl, credentials = "omit" } = {}) {
  const base = String(baseUrl).replace(/\/+$/, "");

  function getSessionToken() {
    try {
      return localStorage.getItem("rw_session") || "";
    } catch {
      return "";
    }
  }

  async function json(url, method, body) {
    const token = getSessionToken();
    const headers = {};
    if (body) headers["content-type"] = "application/json";
    if (token) headers["authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(`${method} ${url} failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }
  return {
    authStart: (req) => json(`${base}/api/auth/start`, "POST", req),
    authVerify: (token) => json(`${base}/api/auth/verify?token=${encodeURIComponent(token)}`, "GET"),
    me: () => json(`${base}/api/me`, "GET"),
    downloadToken: (req) => json(`${base}/api/download-token`, "POST", req),
    portal: () => json(`${base}/api/portal`, "POST", {}),
    logout: () => json(`${base}/api/auth/logout`, "POST")
  };
}
