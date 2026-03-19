/**
 * RinaWarp Download Worker
 * Serves binaries from R2 with proper content-type headers
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Handle specific download endpoints
    if (pathname === '/download/mac' || pathname === '/download/mac/') {
      // Redirect to latest mac release or show available options
      return Response.redirect('https://rinawarp-downloads.rinawarptech.workers.dev/releases/latest.json', 302);
    }
    
    if (pathname === '/download/linux' || pathname === '/download/linux/') {
      return Response.redirect('https://rinawarp-downloads.rinawarptech.workers.dev/releases/1.0.4/RinaWarp-Terminal-Pro-1.0.4.AppImage', 302);
    }
    
    if (pathname === '/download/checksums' || pathname === '/download/checksums/') {
      return Response.redirect('https://rinawarp-downloads.rinawarptech.workers.dev/releases/1.0.4/SHASUMS256.txt', 302);
    }
    
    if (pathname === '/releases/latest.json' || pathname === '/releases/latest.json/') {
      return Response.redirect('https://rinawarp-downloads.rinawarptech.workers.dev/releases/latest.json', 302);
    }
    
    const objectKey = pathname.slice(1); // Remove leading slash

    // Map file extensions to content types
    const contentTypes = {
      '.AppImage': 'application/vnd.appimage',
      '.appimage': 'application/vnd.appimage',
      '.deb': 'application/vnd.debian.binary-package',
      '.exe': 'application/x-msdownload',
      '.dmg': 'application/x-apple-diskimage',
      '.zip': 'application/zip'
    };

    const ext = objectKey.substring(objectKey.lastIndexOf('.'));
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Determine filename from the object key
    const filename = objectKey.split('/').pop();

    try {
      const object = await env.RINAWARP_CDN.get(objectKey);

      if (!object) {
        return new Response('Not Found', { status: 404 });
      }

      return new Response(object.body, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'public, max-age=86400',
          'Content-Length': object.httpMetadata.contentLength || object.size
        }
      });
    } catch (e) {
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  }
};
