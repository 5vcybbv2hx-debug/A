import { base44 } from '@/api/base44Client';

const cache = new Map();

// Private Dateien werden nur über kurzlebige, signierte URLs angezeigt.
export async function resolveFile(uri) {
  if (!uri) return null;
  if (/^https?:\/\//.test(uri)) return uri;
  const hit = cache.get(uri);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri: uri,
    expires_in: 3600,
  });
  cache.set(uri, { url: signed_url, expires: Date.now() + 55 * 60 * 1000 });
  return signed_url;
}