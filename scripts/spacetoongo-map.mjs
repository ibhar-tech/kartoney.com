/**
 * Builds an episode mapping from kartoney's still-dead episodes to the
 * Spacetoon GO CDN (via the same-origin /hls/ Worker proxy).
 *
 * Flow per target show: GraphQL getEpisode(seriesId) → episodes by weight →
 * getEpisodeById → media.video.huaweiStream.locale.ar.src ("/asset/<id>") →
 * verify the AR asset exists in the bucket (a JP-locale fallback must NEVER
 * be used) → mapping entry "/hls/<asset>/index.m3u8".
 *
 * Usage: node scripts/spacetoongo-map.mjs [--verify N]   (N = per-show segment spot-checks)
 * Output: /tmp/spacetoongo-mapping.json (canonical shape for resource-urls.mjs)
 */
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB = join(ROOT, 'data', 'kartoney.db');
const GQL = 'https://graph-v5.spacetoongo.com/graphql';
const CDN = 'https://cdn.spacetoongo.com';
const UA = 'okhttp/4.12.0'; // app-like UA; Cloudflare 1010-bans python UAs
const CACHE_FILE = '/tmp/spacetoongo/episode-media-cache.json';
const VERIFY_N = (() => { const i = process.argv.indexOf('--verify'); return i === -1 ? 3 : parseInt(process.argv[i + 1], 10); })();

// kartoney slug + season → Spacetoon series id (from /tmp/spacetoongo/all-series.json,
// matched by Arabic title on 2026-09-29). One Spacetoon series per kartoney
// SEASON — restricting to that season keeps numbering aligned and prevents a
// cross-season mismatch (e.g. Spacetoon's Digimon Adventure ≠ kartoney S4).
const TARGETS = [
  { slug: 'digimon', season: 1, seriesId: 'eabe7086-bc8a-4f49-ad0f-bedd7b84a1ae' },          // أبطال الديجيتال
  { slug: 'hunter-x-hunter', season: 1, seriesId: '84353dde-18ac-4e40-8438-4e802e7df7cc' },  // الصياد (same dub numbering as archive.org's Assayad S1 2..31)
  { slug: 'the-mirage', season: 1, seriesId: '473e92cc-1d14-4e7a-8dc5-d2a8c674e4c8' },       // السراب (Fushigi Yûgi, 54 eps)
  { slug: 'beyblade', season: 1, seriesId: 'e0d4d77e-c16a-45cc-9139-a57523f79e5f' },         // بي بليد (1)
  { slug: 'beyblade', season: 2, seriesId: '4f7b8da3-76a9-4ac5-a632-16a240758912' },         // بي بليد (2)
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gql(query, variables) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`gql ${res.status}`);
  const j = await res.json();
  if (j.errors) throw new Error('gql errors: ' + JSON.stringify(j.errors).slice(0, 200));
  return j.data;
}

async function episodesOf(seriesId) {
  const items = [];
  for (let page = 1; page <= 40; page++) {
    const d = await gql(
      `query ($f: EpisodeFilterInput, $p: PaginationInput) { getEpisode(filter: $f, pagination: $p) { items { id title weight duration isPremium } page } }`,
      { f: { seriesId }, p: { page } }
    );
    const batch = d.getEpisode.items || [];
    items.push(...batch);
    if (batch.length < 100) break;
    await sleep(150);
  }
  return items.filter((e) => Number.isFinite(e.weight)).sort((a, b) => a.weight - b.weight);
}

/** AR asset id for an episode, with a disk cache (the API is slow; one call per episode). */
const mediaCache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
async function arAsset(epId) {
  if (mediaCache[epId] !== undefined) return mediaCache[epId];
  let asset = null;
  try {
    const d = await gql(`query { getEpisodeById(episodeId: "${epId}") { id media } }`, {});
    const stream = d?.getEpisodeById?.media?.video?.stream;
    // AR locale only — the JP asset must never be served on an Arabic-dub site.
    // (Top-level stream.src mirrors the AR asset when no locale split exists.)
    const src = stream?.locale?.ar?.src || null;
    asset = src ? src.replace(/^.*\/asset\//, '').split(/[/?]/)[0] : null;
    if (asset && !/^[0-9a-f]{32}$/.test(asset)) asset = null;
  } catch { /* leave null */ }
  mediaCache[epId] = asset;
  return asset;
}

async function assetInBucket(asset) {
  try {
    const u = new URL(CDN + '/');
    u.searchParams.set('list-type', '2');
    u.searchParams.set('prefix', asset + '/');
    u.searchParams.set('max-keys', '1');
    const res = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return false;
    return (await res.text()).includes('<Key>');
  } catch { return false; }
}

async function run() {
  const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
  const db = new SQL.Database(readFileSync(DB));
  const rows = (sql) => {
    const r = db.exec(sql);
    if (!r.length) return [];
    const { columns, values } = r[0];
    return values.map((v) => Object.fromEntries(v.map((x, i) => [columns[i], x])));
  };
  const eps = rows(`
    SELECT e.id, e.url, e.title, e.episode_number AS ep, s.season_number AS season, c.slug AS slug
    FROM episodes e JOIN seasons s ON s.id = e.season_id JOIN cartoons c ON c.id = e.cartoon_id
    ORDER BY c.slug, s.season_number, e.episode_number`);
  db.close();

  const mapping = {};
  const report = {};
  for (const { slug, season, seriesId } of TARGETS) {
    const key = `${slug} S${season}`;
    const dead = eps.filter((e) => e.slug === slug && e.season === season && /servallvid|drive\.google/.test(e.url));
    if (!dead.length) { report[key] = { dead: 0, mapped: 0, note: 'nothing dead' }; continue; }

    process.stdout.write(`\n${key}: ${dead.length} dead rows — fetching Spacetoon episodes… `);
    const spEps = await episodesOf(seriesId);
    console.log(`${spEps.length} episodes, weights ${spEps[0]?.weight}..${spEps.at(-1)?.weight}`);

    // Align Spacetoon weight N → kartoney row whose episode title/number is N
    // (kartoney numbers restart per season; try season-major match first, then
    // flattened global position as a fallback — report which one fit better).
    const show = (mapping[slug] ||= { confidence: 'spacetoongo-ar', seasons: {} });
    let mapped = 0, noAr = 0, notInBucket = 0, noTarget = 0;
    const byNumber = new Map(); // Spacetoon weight → kartoney dead row (this season)
    for (const r of dead) {
      const t = (r.title || '').match(/(\d+)/);
      const n = t ? Number(t[1]) : r.ep;
      if (!byNumber.has(n)) byNumber.set(n, r);
    }
    let verified = 0, verifiedOk = 0;
    for (const spe of spEps) {
      const target = byNumber.get(spe.weight);
      if (!target) { noTarget++; continue; }
      const asset = await arAsset(spe.id);
      if (!asset) { noAr++; continue; }
      if (!(await assetInBucket(asset))) { notInBucket++; continue; }
      (show.seasons[String(target.season)] ||= {})[String(target.ep)] = `/hls/${asset}/index.m3u8`;
      mapped++;
      if (verified < VERIFY_N) {
        verified++;
        const u = `${CDN}/?list-type=2&prefix=${asset}/&max-keys=5`;
        try {
          const x = await fetch(u, { headers: { 'User-Agent': UA } });
          const key = (await x.text()).match(/<Key>([^<]+\.ts)</)?.[1];
          if (key) {
            const seg = await fetch(`${CDN}/${key}`, { headers: { Range: 'bytes=0-0', 'User-Agent': UA, Referer: 'https://kartoney.com/' } });
            if (seg.status === 206 || seg.status === 200) verifiedOk++;
          }
        } catch { /* count stays */ }
      }
      writeFileSync(CACHE_FILE, JSON.stringify(mediaCache)); // checkpoint
      await sleep(120);
    }
    if (!mapped) delete mapping[slug];
    report[key] = {
      spacetoon_eps: spEps.length, kartoney_dead: dead.length, mapped,
      skipped: { no_matching_number: noTarget, no_ar_asset: noAr, ar_asset_missing_from_bucket: notInBucket },
      segment_spotcheck: `${verifiedOk}/${verified}`,
    };
    console.log(`  → mapped ${mapped} (no-target ${noTarget}, no-AR ${noAr}, missing ${notInBucket}), spotcheck ${verifiedOk}/${verified}`);
    writeFileSync(CACHE_FILE, JSON.stringify(mediaCache));
  }

  writeFileSync('/tmp/spacetoongo-mapping.json', JSON.stringify({
    built_at: new Date().toISOString(), source: 'spacetoongo via /hls proxy', mapping, report,
  }, null, 2));
  console.log('\n✅ /tmp/spacetoongo-mapping.json');
  console.log(JSON.stringify(report, null, 2));
}

run().catch((e) => { console.error('❌', e); process.exit(1); });
