/**
 * RinaWarp Download Worker
 * Serves binaries from R2 with proper content-type headers
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const objectKey = url.pathname.slice(1); // Remove leading slash

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
