import siteRouter from '../workers/router'

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: any): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/downloads/terminal-pro/')) {
      const artifactName = url.pathname.split('/').pop()
      if (artifactName?.endsWith('.AppImage')) {
        return Response.redirect(`${url.origin}/download/linux`, 301)
      }
      if (artifactName?.endsWith('.deb')) {
        return Response.redirect(`${url.origin}/download/linux/deb`, 301)
      }
      if (artifactName?.endsWith('.exe')) {
        return Response.redirect(`${url.origin}/download/windows`, 301)
      }
      return Response.redirect(`${url.origin}/download/`, 301)
    }

    if (url.pathname === '/downloads' || url.pathname === '/downloads/') {
      return Response.redirect(`${url.origin}/download`, 301)
    }

    if (url.pathname.startsWith('/downloads/')) {
      return Response.redirect(`${url.origin}/download/${url.pathname.slice('/downloads/'.length)}`, 301)
    }

    return (siteRouter as any).fetch(request, env, ctx)
  },
}
