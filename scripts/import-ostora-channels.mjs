/**
 * Imports kids/cartoon TV channels from the Ostora app export
 * (/home/ibhar/Desktop/all.json — 624 tv_channel entries) into
 * src/channels-imported.mjs, after live-verifying every stream:
 *   HTTP 200 + HLS content-type + Access-Control-Allow-Origin (direct hls.js
 *   playback requires CORS; no-CORS streams have no embed fallback → skip).
 * Channels already covered by the hand-curated CHANNELS in config.mjs are
 * de-duplicated by name/slug and stream host+path.
 *
 * Usage: node scripts/import-ostora-channels.mjs [--probe N]   (N = max to probe)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IN = '/home/ibhar/Desktop/all.json';
const OUT = join(ROOT, 'src', 'channels-imported.mjs');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const MAX = (() => { const i = process.argv.indexOf('--probe'); return i === -1 ? Infinity : parseInt(process.argv[i + 1], 10); })();

const ARAB_COUNTRIES = new Set(['DZ','SA','AE','EG','IQ','JO','KW','QA','MA','TN','LY','SY','YE','OM','BH','SD','PS','LB','MR','SO','DJ','KM']);
// Global entries must look like CARTOON content (the site is a cartoon site,
// not general-purpose kids TV): match cartoon/animation brands in the title.
const CARTOON_RE = /cartoon|animation|anime|nick|sponge|disney|boomerang|tmnt|ninja turtle|teen titans|looney|tom and jerry|scooby|garfield|mr bean|pocoyo|peppa|ben 10|gumball|adventure time|regular show|steven universe|phineas|gravity falls|duck|bugs|kids cartoons|popeye|heidi|smurf/i;
// Titles to always reject (religious/wrong-audience/misgrouped).
const REJECT_RE = /gospel|bible|quran|christ|3abn|god stand|hindu|kannada|telugu|tamil|urdu|bhojpuri|malayalam|marathi|punjabi|gujarati|kuriakos|esports|spacetoon turkey/i;

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'ch';

const existing = ['spacetoon', 'cartoon-network', 'mbc-3', 'majid', 'taha', 'atfal-mawaheb', 'sat7-kids'];
const existingHosts = [
  'streamxx.foupix.com', 'live-uae-next.spacetoongo.com', 'cdn4.skygo.mn',
  'stream.starmenajo.com', '5aafcc5de91f1.streamlock.net', 'svs.itworkscdn.net',
];

const j = JSON.parse(readFileSync(IN, 'utf8'));
const seen = new Map(); // slug → entry (dedup within the file)
let candidates = [];
for (const e of j) {
  if (e.kind !== 'tv_channel' || !e.streams?.length) continue;
  const stream = e.streams.find((s) => s.url?.startsWith('https://')) || e.streams[0];
  if (!stream?.url || !stream.url.startsWith('https://')) continue; // http → mixed content, skip
  const title = (e.title_ar || e.title || '').trim();
  if (REJECT_RE.test(title + ' ' + e.title)) continue;
  const isArab = !!(e.title_ar || (e.country_codes || []).some((c) => ARAB_COUNTRIES.has(c)));
  const isCartoon = CARTOON_RE.test(e.title || '') || (e.source_categories || []).some((c) => /animation/i.test(c));
  if (!isArab && !isCartoon) continue;
  let slug = slugify(e.title);
  if (existing.includes(slug) || seen.has(slug)) continue;
  let host = '';
  try { host = new URL(stream.url).host; } catch { continue; }
  const pathKey = host + new URL(stream.url).pathname;
  if (existingHosts.some((h) => host === h) || [...seen.values()].some((v) => v.pathKey === pathKey)) continue;
  seen.set(slug, {
    slug, title: e.title, titleAr: e.title_ar, group: isArab ? 'arabic' : 'global',
    url: stream.url, logo: e.logo_url || '', pathKey, height: stream.quality_height,
  });
  candidates.push(seen.get(slug));
}
candidates = candidates.slice(0, MAX);
console.log(`candidates to verify: ${candidates.length} (arabic ${candidates.filter((c) => c.group === 'arabic').length}, global-cartoon ${candidates.filter((c) => c.group === 'global').length})`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function verify(c) {
  const check = (res) => {
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const acao = res.headers.get('access-control-allow-origin');
    const corsOk = !!acao && (acao === '*' || acao.includes('kartoney.com'));
    return { status: res.status, m3u8: /mpegurl|m3u8/.test(ct), corsOk };
  };
  try {
    const res = await fetch(c.url, {
      method: 'HEAD',
      headers: { 'User-Agent': UA, Referer: 'https://kartoney.com/' },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });
    if (res.status !== 405) { res.body?.cancel(); return check(res); }
    // Many CDNs reject HEAD — retry as a 1-byte range GET (the exact request
    // hls.js would make for the playlist).
    const res2 = await fetch(c.url, {
      headers: { 'User-Agent': UA, Referer: 'https://kartoney.com/', Range: 'bytes=0-0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });
    const out = check(res2);
    res2.body?.cancel();
    if (out.status === 206) out.status = 200;
    return out;
  } catch (e) { return { status: 0, m3u8: false, corsOk: false, err: e.name }; }
}

const results = [];
let i = 0;
async function worker() {
  while (i < candidates.length) {
    const c = candidates[i++];
    const v = await verify(c);
    results.push({ ...c, ...v });
    await sleep(150);
  }
}
await Promise.all(Array.from({ length: 10 }, worker));

const ok = results.filter((r) => r.status === 200 && r.m3u8 && r.corsOk);
const failed = results.length - ok.length;
console.log(`verified OK: ${ok.length} · failed/skipped: ${failed}`);
const byReason = {};
results.filter((r) => !(r.status === 200 && r.m3u8 && r.corsOk)).forEach((r) => {
  const why = r.status === 0 ? 'network' : r.status !== 200 ? `http-${r.status}` : !r.m3u8 ? 'not-hls' : 'no-cors';
  byReason[why] = (byReason[why] || 0) + 1;
});
console.log('failure reasons:', JSON.stringify(byReason));

const emojiFor = (t) => {
  const m = { sponge: '🧽', nick: '🧽', disney: '🏰', tmnt: '🐢', ninja: '🐢', scooby: '🐕', peppa: '🐷', pocoyo: '👶', 'ben 10': '⌚', garfield: '🐱', 'mr bean': '🤖', smurf: '🔵', heidi: '🌄', popeye: '🥬', duck: '🦆', anime: '🎌' };
  for (const [k, e] of Object.entries(m)) if (t.toLowerCase().includes(k)) return e;
  return '📺';
};

const lines = ok.map((r) => `  { slug: ${JSON.stringify(r.slug)}, name: ${JSON.stringify(r.titleAr || r.title)}, latin: ${JSON.stringify(!r.titleAr ? r.title : '')}, emoji: ${JSON.stringify(emojiFor(r.title))}, group: ${JSON.stringify(r.group)}, logo: ${JSON.stringify(r.logo)}, desc: 'بث مباشر — ${r.group === 'arabic' ? 'قناة أطفال عربية' : 'قناة كرتون'}', mode: 'direct', m3u8: ${JSON.stringify(r.url)} },`);

writeFileSync(OUT, `/* AUTO-GENERATED by scripts/import-ostora-channels.mjs from the Ostora app
 * export (all.json). Every stream verified live: HTTP 200 + HLS + CORS-open.
 * Regenerate with: node scripts/import-ostora-channels.mjs
 * Hand-curated channels (embeds + foupix-resolved) live in config.mjs. */
export const IMPORTED_CHANNELS = [
${lines.join('\n')}
];
`);

const arabicOk = ok.filter((r) => r.group === 'arabic');
console.log(`\narabic channels added: ${arabicOk.length}`);
arabicOk.forEach((r) => console.log('  +', r.titleAr || r.title, '—', r.slug));
console.log(`global cartoon channels added: ${ok.length - arabicOk.length}`);
console.log(`→ ${OUT}`);
