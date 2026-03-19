/**
 * RinaWarp Download Worker
 * Stable download routes are manifest-driven; direct /releases/* paths are served from R2.
 */

function withCommonHeaders(headers = new Headers()) {
  headers.set("Vary", "Accept-Encoding");
  return headers;
}

function textResponse(status, message) {
  const headers = withCommonHeaders();
  headers.set("Content-Type", "text/plain; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=60, must-revalidate");
  return new Response(message, { status, headers });
}

function redirectTo(location, status = 302) {
  const headers = withCommonHeaders();
  headers.set("Location", location);
  headers.set("Cache-Control", "public, max-age=60, must-revalidate");
  return new Response(null, { status, headers });
}

async function getManifest(env) {
  const object = await env.RINAWARP_CDN.get("releases/latest.json");
  if (!object) return null;
  return JSON.parse(await object.text());
}

function pickArtifactPath(manifest, kind) {
  const version = manifest?.version;
  const explicitLinuxPath = manifest?.files?.linux?.path ?? null;
  const explicitWindowsPath = manifest?.files?.windows?.path ?? null;
  const explicitMacPath =
    manifest?.files?.mac?.path ??
    manifest?.files?.macVariants?.dmg?.path ??
    manifest?.files?.macVariants?.zip?.path ??
    null;
  const explicitChecksumsPath = manifest?.files?.checksums?.path ?? null;
  const linuxPath = explicitLinuxPath ?? manifest?.platforms?.["linux-x86_64"]?.url ?? null;

  if (kind === "linux") return linuxPath;
  if (kind === "windows") return explicitWindowsPath;
  if (kind === "mac") return explicitMacPath;
  if (kind === "checksums" && explicitChecksumsPath) {
    return explicitChecksumsPath;
  }
  if (kind === "checksums" && version) {
    return `releases/${version}/SHASUMS256.txt`;
  }

  return null;
}

function toAbsoluteArtifactUrl(origin, artifactPath) {
  if (!artifactPath) return null;
  if (/^https?:\/\//i.test(artifactPath)) return artifactPath;
  return `${origin}/${artifactPath.replace(/^\/+/, "")}`;
}

function contentTypeFor(key) {
  const ext = key.slice(key.lastIndexOf("."));
  const contentTypes = {
    ".AppImage": "application/vnd.appimage",
    ".appimage": "application/vnd.appimage",
    ".deb": "application/vnd.debian.binary-package",
    ".exe": "application/x-msdownload",
    ".dmg": "application/x-apple-diskimage",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".zip": "application/zip",
  };
  return contentTypes[ext] || "application/octet-stream";
}

async function serveR2Object(env, objectKey) {
  const object = await env.RINAWARP_CDN.get(objectKey);
  if (!object) return null;

  const headers = withCommonHeaders();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Content-Type", contentTypeFor(objectKey));

  if (objectKey === "releases/latest.json" || objectKey.endsWith("/latest.json")) {
    headers.set("Cache-Control", "public, max-age=60, must-revalidate");
  } else if (objectKey.startsWith("releases/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    headers.set("Cache-Control", "public, max-age=86400");
  }

  return new Response(object.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    if (pathname.startsWith("/download/")) {
      const kind = pathname.slice("/download/".length);
      const manifest = await getManifest(env);

      if (!manifest) {
        return textResponse(404, "latest.json not found");
      }

      const artifactPath = pickArtifactPath(manifest, kind);
      if (!artifactPath) {
        return textResponse(404, "Artifact not available");
      }

      if (kind === "checksums") {
        const checksumObject = await env.RINAWARP_CDN.get(artifactPath);
        if (!checksumObject) {
          return textResponse(404, "Artifact not available");
        }
      }

      return redirectTo(toAbsoluteArtifactUrl(url.origin, artifactPath));
    }

    const objectKey = pathname.slice(1);
    const response = await serveR2Object(env, objectKey);
    if (response) return response;

    return textResponse(404, "Not found");
  },
};
