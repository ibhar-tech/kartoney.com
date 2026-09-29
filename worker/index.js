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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
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
