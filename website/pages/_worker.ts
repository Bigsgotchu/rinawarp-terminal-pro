import siteRouter from "../workers/router";

const DOWNLOADS_ORIGIN = "https://rinawarp-downloads.rinawarptech.workers.dev";

function toDownloadsUrl(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${DOWNLOADS_ORIGIN}${url.pathname}${url.search}`;
}

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Pages production is currently stale on release/download routes.
    // Proxy them through the live downloads worker until Pages bindings are unified.
    if (url.pathname.startsWith("/download/") || url.pathname.startsWith("/releases/")) {
      return fetch(toDownloadsUrl(request.url), {
        method: request.method,
        headers: request.headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        redirect: "manual",
      });
    }

    return siteRouter.fetch(request, env, ctx);
  },
};
