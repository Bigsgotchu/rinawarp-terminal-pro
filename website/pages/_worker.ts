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

async function proxyReleaseFeed(request: Request): Promise<Response> {
  const upstream = await fetch(toUpdatesUrl(request.url), {
    method: request.method,
    headers: request.headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'follow',
  })

  const headers = new Headers(upstream.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Content-Type-Options', 'nosniff')

  if (!headers.get('Cache-Control')) {
    headers.set('Cache-Control', 'public, max-age=60, must-revalidate')
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: any): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/downloads' || url.pathname === '/downloads/') {
      return Response.redirect(`${url.origin}/download`, 301)
    }

    if (url.pathname.startsWith('/downloads/')) {
      return Response.redirect(`${url.origin}/download/${url.pathname.slice('/downloads/'.length)}`, 301)
    }

    // Pages production is currently stale on artifact download routes.
    // Keep the actual /download page on the site router, but proxy artifact paths.
    if (url.pathname.startsWith('/download/') && url.pathname !== '/download/') {
      return fetch(toDownloadsUrl(request.url), {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      })
    }

    if (url.pathname.startsWith('/releases/')) {
      return proxyReleaseFeed(request)
    }

    return (siteRouter as any).fetch(request, env, ctx)
  },
}
