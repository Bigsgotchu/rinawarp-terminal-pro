// Shared helpers for /login/ and /signup/ static pages.

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = String(s ?? "");
  return d.innerHTML;
}

/**
 * Extract token from URL path
 * Supports /login/<token>/, /login/<token>, /qzje/<token>/, /qzje/<token>
 */
export function getTokenFromPath() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const parts = path.split("/");

  // Check for login/<token> or qzje/<token>
  if ((parts[0] === "login" || parts[0] === "qzje") && parts[1]) {
    return parts[1];
  }

  return "";
}

/**
 * Normalize URL: /login/<token> -> /login/?token=<token>
 * Or /qzje/<token> -> /login/?token=<token>
 */
export function normalizeTokenToQuery() {
  const token = getTokenFromPath();
  if (!token) return;

  const url = new URL(window.location.href);

  // Redirect qzje to login
  if (url.pathname.startsWith("/qzje")) {
    url.pathname = "/login/";
    url.searchParams.set("token", token);
    window.location.replace(url.toString());
    return;
  }

  // Normalize login/<token> to login/?token=<token>
  if (!url.searchParams.get("token")) {
    url.pathname = "/login/";
    url.searchParams.set("token", token);
    window.location.replace(url.toString());
  }
}

/**
 * Sanitize redirect target to prevent open redirect vulnerabilities
 */
export function safeNext(rawNext) {
  if (!rawNext) return "/account/";
  // Reject absolute URLs and protocol-relative URLs
  if (rawNext.startsWith("http://") || rawNext.startsWith("https://") || rawNext.startsWith("//")) {
    return "/account/";
  }
  // Must start with "/"
  if (!rawNext.startsWith("/")) return "/account/";
  // Allowlist supported routes
  const allowedPrefixes = ["/account", "/download", "/success", "/login"];
  if (!allowedPrefixes.some((p) => rawNext.startsWith(p))) return "/account/";
  return rawNext;
}

/**
 * Get token from query param
 */
export function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("token") || "").replace(/\/+$/, "");
}
