/**
 * Maps remote poster URLs → self-hosted /images/posters/ paths.
 *
 * Why: the original posters live on a third-party host (servallvid.com) which
 * ad-blockers like AdGuard / uBlock block at the network level. Because the
 * cards ARE those posters, a blocked host makes the whole page look blank.
 * Serving the images from our own origin makes the site fully visible
 * regardless of any blocker, and is faster (same-origin, immutable CDN cache).
 *
 * `posterName()` is the single source of truth shared by the downloader
 * (scripts/fetch-images.mjs) and the build (src/data.mjs), so a URL always maps
 * to the same local filename.
 */
import crypto from 'node:crypto';

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

/** Deterministic local filename for a remote image URL (null if not an http URL). */
export function posterName(srcUrl) {
  if (!srcUrl || !/^https?:\/\//i.test(srcUrl)) return null;
  let host, base;
  try {
    const u = new URL(srcUrl);
    host = u.host;
    base = (u.pathname.split('/').pop() || '').split('?')[0];
  } catch {
    return null;
  }
  // servallvid filenames are already unique + clean → keep them (nice for SEO).
  if (host.includes('servallvid.com') && IMG_EXT.test(base)) {
    return base.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
  // Other hosts (drive.google.com, wordpress, …): hash the URL + best-guess ext.
  const ext = (base.match(IMG_EXT) || ['.jpg'])[0].toLowerCase();
  const h = crypto.createHash('sha1').update(srcUrl).digest('hex').slice(0, 12);
  return `x${h}${ext}`;
}

export const POSTER_URL_PREFIX = '/images/posters/';
