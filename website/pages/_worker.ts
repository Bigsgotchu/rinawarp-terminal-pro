import siteRouter from '../workers/router'

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: any): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/downloads' || url.pathname === '/downloads/') {
      return Response.redirect(`${url.origin}/download`, 301)
    }

    if (url.pathname.startsWith('/downloads/')) {
      return Response.redirect(`${url.origin}/download/${url.pathname.slice('/downloads/'.length)}`, 301)
    }

    return (siteRouter as any).fetch(request, env, ctx)
  },
}
