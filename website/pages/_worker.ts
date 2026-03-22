import siteRouter from '../workers/router'

const DOWNLOADS_ORIGIN = 'https://pub-58c0b2f3cc8d43fa8cf6e1d4d2dcf94b.r2.dev'
const UPDATES_ORIGIN = 'https://pub-4df343f1b4524762a4f8ad3c744653c9.r2.dev'

function toDownloadsUrl(requestUrl: string): string {
  const url = new URL(requestUrl)
  return `${DOWNLOADS_ORIGIN}${url.pathname}${url.search}`
}

function toUpdatesUrl(requestUrl: string): string {
  const url = new URL(requestUrl)
  return `${UPDATES_ORIGIN}${url.pathname.replace(/^\/releases/, '')}${url.search}`
}

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: any): Promise<Response> {
    const url = new URL(request.url)

    // Pages production is currently stale on release/download routes.
    // Proxy them through the live downloads worker until Pages bindings are unified.
    if (url.pathname.startsWith('/download/')) {
      return fetch(toDownloadsUrl(request.url), {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      })
    }

    if (url.pathname.startsWith('/releases/')) {
      return fetch(toUpdatesUrl(request.url), {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      })
    }

    return (siteRouter as any).fetch(request, env, ctx)
  },
}
