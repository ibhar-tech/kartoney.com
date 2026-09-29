/**
 * Kartoney Worker — static assets first, this handler only serves /hls/*.
 *
 * /hls/<32-hex-asset-id>/index.m3u8   → master playlist (variants that exist)
 * /hls/<asset>/v<N>.m3u8              → media playlist for variant N (0..3 =
 *                                        1080/720/480/360), segments same-origin
 * /hls/<asset>/<file>.ts              → segment proxy from cdn.spacetoongo.com
 *
 * The Spacetoon GO CDN (public OBS bucket "spacetoon-go-media-me") serves
 * segments anonymously but WITHOUT CORS headers, so hls.js cannot fetch them
 * cross-origin — every byte flows through this same-origin proxy instead.
 * Playlists are generated on demand from the bucket listing (cached 1h at the
 * edge); segments are cached 24h.
 */

const CDN = 'https://cdn.spacetoongo.com';
const VARIANTS = [
  { name: 'v0', bandwidth: 4000000, resolution: '1920x1080' },
  { name: 'v1', bandwidth: 2000000, resolution: '1280x720' },
  { name: 'v2', bandwidth: 1000000, resolution: '854x480' },
  { name: 'v3', bandwidth: 500000, resolution: '640x360' },
];

/* ── /vid/<base64url({p, f?})>.mp4 — arabic-toons.com resolver ────────────
 * arabic-toons episode pages are anonymous and mint a foupix CDN token that
 * is ~6h-valid, NOT IP-bound and NOT path-bound (one token plays any file).
 * The DB stores an opaque /vid/… URL; on request the Worker fetches the page
 * (or a bootstrap page when only the file path survives), extracts videoSrc,
 * substitutes the path when needed, caches the minted URL ~3.5h at the edge,
 * and 302s the <video> element to the MP4. Pages must be fetched with a
 * browser UA and gently (transient 403s above ~4 req/s). */
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

async function fetchEpisodePage(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        cf: { cacheTtl: 1800, cacheEverything: true },
      });
      if (res.status === 403 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      if (!res.ok) return null;
      return await res.text();
    } catch { await new Promise((r) => setTimeout(r, 800)); }
  }
  return null;
}

async function resolveVid(pathId, ctx) {
  let target;
  try {
    const b64 = pathId.replace(/-/g, '+').replace(/_/g, '/');
    target = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
  } catch { return new Response('bad vid id', { status: 400 }); }
  if (!target.p) return new Response('bad vid payload', { status: 400 });

  const cacheKey = new Request('https://vid.kartoney.internal/' + pathId);
  const cache = caches.default;
  const hit = await cache.match(cacheKey).catch(() => null);
  if (hit) return Response.redirect(await hit.text(), 302);

  const html = await fetchEpisodePage(target.p);
  if (!html) return new Response('source page unreachable', { status: 502 });
  const m = html.match(/videoSrc\s*=\s*"(https:\\?\/\\?\/stream[^"]+foupix[^"]+)"/);
  if (!m) return new Response('no videoSrc on page', { status: 502 });
  let video = m[1].replace(/\\\//g, '/');

  if (target.f) {
    // Orphaned file (source page deleted): tokens are path-agnostic, so graft
    // the minted query string onto the surviving file URL.
    const q = video.slice(video.indexOf('?'));
    video = target.f + q;
  }

  if (ctx) {
    ctx.waitUntil(cache.put(cacheKey, new Response(video, {
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=12600' }, // 3.5h < 6h token life
    })));
  }
  return Response.redirect(video, 302);
}

/** All object keys under <asset>/ (paginated). Returns [] when the prefix is absent. */
async function listAsset(asset) {
  const keys = [];
  let token = '';
  do {
    const u = new URL(CDN + '/');
    u.searchParams.set('list-type', '2');
    u.searchParams.set('prefix', asset + '/');
    u.searchParams.set('max-keys', '1000');
    if (token) u.searchParams.set('continuation-token', token);
    const res = await fetch(u, { headers: { 'User-Agent': 'kartoney-hls/1.0' } });
    if (!res.ok) return [];
    const xml = await res.text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(m[1]);
    const tok = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    token = tok ? tok[1] : '';
  } while (token);
  return keys;
}

const cachedList = (() => {
  const mem = new Map();
  return async (asset, ctx) => {
    const hit = mem.get(asset);
    if (hit) return hit;
    const cache = caches.default;
    const cres = await cache.match(CDN + '/listing/' + asset).catch(() => null);
    if (cres) { const k = await cres.json(); mem.set(asset, k); return k; }
    const keys = await listAsset(asset);
    const payload = JSON.stringify(keys);
    if (keys.length && ctx) {
      ctx.waitUntil(cache.put(CDN + '/listing/' + asset, new Response(payload, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      })));
    }
    mem.set(asset, keys);
    return keys;
  };
})();

function masterPlaylist(asset, present) {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  for (const v of VARIANTS) {
    if (present.has(v.name)) {
      lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.resolution}`);
      lines.push(v.name + '.m3u8');
    }
  }
  return lines.length > 2 ? lines.join('\n') + '\n' : null;
}

function mediaPlaylist(asset, variant, keys, durationHint) {
  const segs = keys
    .map((k) => k.match(/_([0-3])_(\d+)\.ts$/))
    .filter((m) => m && m[1] === String(variant))
    .sort((a, b) => Number(a[2]) - Number(b[2]));
  if (!segs.length) return null;
  const dur = durationHint ? (durationHint / segs.length).toFixed(3) : '5.000';
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-TARGETDURATION:10', '#EXT-X-PLAYLIST-TYPE:VOD'];
  for (const m of segs) {
    lines.push('#EXTINF:' + dur + ',');
    lines.push(m.input.split('/').pop()); // relative → /hls/<asset>/<seg>.ts (same-origin proxy)
  }
  lines.push('#EXT-X-ENDLIST');
  return lines.join('\n') + '\n';
}

/* ── /live-stream/<base64url({h}|{m}).m3u8 — live channel resolver ────────
 * Live playlists rotate; the foupix player pages always contain the CURRENT
 * m3u8. {h: playerPage} → fetch page (browser UA, edge-cached 10 min), extract
 * the stream, 302 to it (the streams themselves are CORS-open). {m: url} →
 * straight 302 for fixed playlists. No media bytes transit this Worker. */
async function resolveLiveStream(pathId, ctx) {
  let target;
  try {
    const b64 = pathId.replace(/-/g, '+').replace(/_/g, '/');
    target = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
  } catch { return new Response('bad live id', { status: 400 }); }

  const cacheKey = new Request('https://live.kartoney.internal/' + pathId);
  const cache = caches.default;
  const hit = await cache.match(cacheKey).catch(() => null);
  if (hit) return Response.redirect(await hit.text(), 302);

  let stream = target.m || null;
  if (!stream && target.h) {
    const html = await fetchEpisodePage(target.h);
    if (html) stream = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/)?.[0] || null;
  }
  if (!stream) return new Response('live stream unavailable', { status: 502 });

  if (ctx) {
    ctx.waitUntil(cache.put(cacheKey, new Response(stream, {
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=600' },
    })));
  }
  return Response.redirect(stream, 302);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const vid = url.pathname.match(/^\/vid\/([A-Za-z0-9_-]+)\.mp4$/);
    if (vid) return resolveVid(vid[1], ctx);

    const live = url.pathname.match(/^\/live-stream\/([A-Za-z0-9_-]+)\.m3u8$/);
    if (live) return resolveLiveStream(live[1], ctx);

    const m = url.pathname.match(/^\/hls\/([0-9a-f]{32})(?:\/(.*))?$/);
    if (!m) return env.ASSETS.fetch(request);

    const asset = m[1];
    const file = m[2] || 'index.m3u8';
    const base = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=600' };

    if (file.endsWith('.m3u8')) {
      const keys = await cachedList(asset, ctx);
      if (!keys.length) return new Response('asset not found', { status: 404 });
      if (file === 'index.m3u8') {
        const present = new Set(
          VARIANTS.map((v) => v.name).filter((name, i) => keys.some((k) => k.includes(`_${i}_`)))
        );
        const body = masterPlaylist(asset, present);
        return body
          ? new Response(body, { headers: { ...base, 'Content-Type': 'application/vnd.apple.mpegurl' } })
          : new Response('no variants', { status: 404 });
      }
      const vm = file.match(/^v([0-3])\.m3u8$/);
      if (!vm) return new Response('bad playlist', { status: 404 });
      const body = mediaPlaylist(asset, Number(vm[1]), keys, Number(url.searchParams.get('d') || 0));
      return body
        ? new Response(body, { headers: { ...base, 'Content-Type': 'application/vnd.apple.mpegurl' } })
        : new Response('no such variant', { status: 404 });
    }

    if (file.endsWith('.ts')) {
      const upstream = await fetch(`${CDN}/${asset}/${file}`, {
        headers: { 'User-Agent': 'kartoney-hls/1.0', ...(request.headers.get('range') ? { Range: request.headers.get('range') } : {}) },
        cf: { cacheEverything: true, cacheTtl: 86400, cacheTtlByStatus: { '200-299': 86400, '404': 60 } },
      });
      const headers = new Headers(upstream.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('Accept-Ranges', 'bytes');
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    return new Response('bad request', { status: 400 });
  },
};
