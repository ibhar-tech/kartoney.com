/**
 * Batch playability checker for episode URLs in data/kartoney.db.
 *
 * Tests every distinct episodes.url (or a spread sample) with a tiny Range GET
 * and classifies it. Works for direct MP4s and HLS playlists; use --referer to
 * test hotlink-sensitivity of a candidate host before committing to it.
 *
 * Usage:
 *   node scripts/check-urls.mjs                      # all distinct URLs
 *   node scripts/check-urls.mjs --sample 50          # evenly-spread sample
 *   node scripts/check-urls.mjs --show one-piece     # one cartoon slug
 *   node scripts/check-urls.mjs --referer https://kartoney.com/
 *   node scripts/check-urls.mjs --json /tmp/out.json # machine-readable report
 */
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB = join(ROOT, 'data', 'kartoney.db');

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
};
const SAMPLE = parseInt(arg('sample', '0'), 10);
const SHOW = arg('show', null);
const REFERER = arg('referer', 'https://kartoney.com/');
const JSON_OUT = arg('json', null);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const CONCURRENCY = parseInt(arg("concurrency", "16"), 10);
const TIMEOUT_MS = 20000;

async function loadEpisodes() {
  const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
  const db = new SQL.Database(readFileSync(DB));
  const rows = (sql) => {
    const r = db.exec(sql);
    if (!r.length) return [];
    const { columns, values } = r[0];
    return values.map((v) => Object.fromEntries(v.map((x, i) => [columns[i], x])));
  };
  const eps = rows(`
    SELECT e.id, e.url, e.episode_number, c.slug AS cartoon
    FROM episodes e JOIN cartoons c ON c.id = e.cartoon_id
    ${SHOW ? `WHERE c.slug = '${SHOW.replace(/'/g, "''")}'` : ''}
    ORDER BY e.id`);
  db.close();
  return eps;
}

/** Fetch with timeout; returns {status, contentType, body?} or throws. */
async function probe(url, { readBody = false } = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...(REFERER ? { Referer: REFERER } : {}) },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const contentType = res.headers.get('content-type') || '';
  const out = { status: res.status, contentType: contentType.split(';')[0] };
  if (readBody && res.ok) out.body = await res.text();
  else res.body?.cancel();
  return out;
}

/** Classify one media URL. OK means a <video> tag could start playing it. */
async function check(url) {
  try {
    if (url.includes('drive.google.com')) {
      // Google Drive uc?id= links: playable in <video> only via the confirm flow;
      // a 200 HTML page means it's alive but not directly embeddable.
      const r = await probe(url);
      if (r.status === 200 && r.contentType.startsWith('text/html')) return { verdict: 'html-not-embeddable', detail: r.contentType };
      return { verdict: `http-${r.status}`, detail: r.contentType };
    }
    if (url.endsWith('.m3u8') || url.includes('.m3u8?')) {
      const r = await probe(url, { readBody: true });
      if (r.status !== 200) return { verdict: `http-${r.status}`, detail: r.contentType };
      if (!r.body.includes('#EXTM3U')) return { verdict: 'not-a-playlist', detail: r.contentType };
      const seg = r.body.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#'));
      if (!seg) return { verdict: 'empty-playlist', detail: '' };
      const segUrl = new URL(seg, url).href;
      const s = await probe(segUrl);
      const okSeg = (s.status === 200 || s.status === 206) && /^(video|application|binary)/.test(s.contentType);
      return okSeg ? { verdict: 'ok', detail: 'hls' } : { verdict: `segment-http-${s.status}`, detail: s.contentType };
    }
    // Direct file: Range GET a few bytes — the exact request a <video> makes.
    const r = await probe(url, { readBody: false });
    const okStatus = r.status === 200 || r.status === 206;
    const okType = /^(video|audio|application\/octet-stream|binary)/.test(r.contentType);
    if (okStatus && okType) return { verdict: 'ok', detail: r.contentType };
    if (okStatus) return { verdict: `wrong-type-${r.contentType || 'none'}`, detail: '' };
    return { verdict: `http-${r.status}`, detail: r.contentType };
  } catch (e) {
    return { verdict: `error-${e.name === 'TimeoutError' ? 'timeout' : (e.cause?.code || e.message || 'unknown')}`, detail: '' };
  }
}

async function run() {
  if (!existsSync(DB)) throw new Error(`DB not found at ${DB}`);
  const eps = await loadEpisodes();
  // One check per DISTINCT url (Captain Majid 1&2 share files; dedupe keeps it honest).
  const byUrl = new Map(eps.map((e) => [e.url, e]));
  let targets = [...byUrl.values()];
  if (SAMPLE > 0 && targets.length > SAMPLE) {
    const step = targets.length / SAMPLE;
    targets = Array.from({ length: SAMPLE }, (_, i) => targets[Math.floor(i * step)]);
  }
  console.log(`Checking ${targets.length} distinct episode URLs (referer: ${REFERER || 'none'}) …`);

  const results = [];
  let i = 0, done = 0;
  async function worker() {
    while (i < targets.length) {
      const ep = targets[i++];
      const { verdict, detail } = await check(ep.url);
      results.push({ ...ep, verdict, detail });
      if (++done % 100 === 0) console.log(`  …${done}/${targets.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const counts = {};
  for (const r of results) counts[r.verdict] = (counts[r.verdict] || 0) + 1;
  console.log('\nVerdicts:');
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([v, n]) => console.log(`  ${String(n).padStart(5)}  ${v}`));

  const badShows = {};
  for (const r of results) {
    if (r.verdict !== 'ok') badShows[r.cartoon] = (badShows[r.cartoon] || 0) + 1;
  }
  const badList = Object.entries(badShows).sort((a, b) => b[1] - a[1]);
  if (badList.length) {
    console.log('\nFailures by show (top 20):');
    badList.slice(0, 20).forEach(([slug, n]) => console.log(`  ${String(n).padStart(5)}  ${slug}`));
  }
  const okN = counts.ok || 0;
  console.log(`\n✅ ${okN}/${results.length} playable (${((okN / results.length) * 100).toFixed(1)}%)`);

  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify({ checkedAt: new Date().toISOString(), referer: REFERER, counts, results }, null, 2));
    console.log(`Report written to ${JSON_OUT}`);
  }
}

run().catch((e) => { console.error('❌', e); process.exit(1); });
