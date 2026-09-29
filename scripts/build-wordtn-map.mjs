/**
 * Converts /tmp/wordtn-catalog.json (the enumeration of the open word.tn MP4
 * repo) into a canonical mapping file for scripts/resource-urls.mjs.
 *
 * Alignment model (positional, per show):
 *   - kartoney episode rows are flattened in (season, episode_number) order.
 *   - word.tn parts are concatenated in part order into one sequence 1..W.
 *   - If W equals the kartoney row count, the repo is assumed to include the
 *     intro/EP00 file → rows map 1:1 positionally.
 *   - If W equals the row count minus intro rows (title mentions المقدمة/شارة
 *     or the dead filename encodes EP00), intros are skipped and real episodes
 *     map positionally.
 *   - Otherwise map the first W eligible rows and mark confidence "partial".
 *
 * Usage: node scripts/build-wordtn-map.mjs            # writes /tmp/wordtn-mapping.json
 */
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB = join(ROOT, 'data', 'kartoney.db');
const IN = process.argv[2] || '/tmp/wordtn-catalog.json';
const OUT = process.argv[3] || '/tmp/wordtn-mapping.json';
const BASE = 'https://site.word.tn/videos';

// Shows whose word.tn copy is a DIFFERENT version than kartoney's Arabic dub,
// or a dubious title match — excluded from auto-mapping (human can add later).
const EXCLUDE = new Set([
  'hunter-x-hunter',   // word.tn holds the 2011 subtitled run; kartoney = Arabic dub
  'earth-eagles',      // matched to "sangokushi" (Three Kingdoms) — not the same show
  'captain-tsubasa',   // archive.org's Majid items match kartoney's seasons 1:1; word.tn's
  'captain-tsubasa-2', // 2nd part is a different-language dub — leave both to archive.org
]);

const isIntro = (row) =>
  /مقدمة|شارة/.test(row.title || '') || /EP00[_\]]/i.test(row.url);

async function run() {
  const catalog = JSON.parse(readFileSync(IN, 'utf8'));
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
    ORDER BY c.slug, s.season_number, e.episode_number, e.id`);
  db.close();

  const byShow = new Map();
  for (const e of eps) {
    if (!byShow.has(e.slug)) byShow.set(e.slug, []);
    byShow.get(e.slug).push(e);
  }

  const mapping = {};
  const report = [];
  for (const entry of catalog.shows) {
    if (!entry.wordtn_slug || EXCLUDE.has(entry.kartoney_slug)) continue;
    const rows_ = byShow.get(entry.kartoney_slug);
    if (!rows_) continue;

    // Build each part's file sequence once: part → [url × episodes].
    const parts = entry.wordtn_slugs.map((part) => {
      const urls = [];
      for (let n = 1; n <= part.episodes; n++) {
        const file = `${part.slug}-${part.zero_padded ? String(n).padStart(2, '0') : n}.mp4`;
        urls.push(`${BASE}/${part.slug}/${file}`);
      }
      return urls;
    });

    // Group kartoney rows by season (seasons ordered by number).
    const seasons = [...new Set(rows_.map((r) => r.season))].sort((a, b) => a - b);
    const rowsBySeason = new Map(seasons.map((s) => [s, rows_.filter((r) => r.season === s)]));

    const intros = rows_.filter(isIntro);
    const real = rows_.filter((r) => !intros.includes(r));

    const show = { confidence: '', seasons: {} };
    let mapped = 0, strategy;

    if (seasons.length === parts.length && seasons.length > 1) {
      // SEASON ↔ PART alignment: kartoney season N maps to repo part N. This
      // self-corrects small per-part count drift (a missing episode in one
      // part doesn't shift every later season).
      strategy = 'season-to-part';
      seasons.forEach((s, i) => {
        const eligible = rowsBySeason.get(s).filter((r) => !intros.includes(r));
        const urls = parts[i];
        eligible.slice(0, urls.length).forEach((r, k) => {
          (show.seasons[String(s)] ||= {})[String(r.ep)] = urls[k];
          mapped++;
        });
      });
    } else {
      // SINGLE part or mismatched shape → global positional flatten.
      const seq = parts.flat();
      strategy = seq.length >= real.length ? 'positional-full' : 'positional-partial';
      real.slice(0, seq.length).forEach((r, k) => {
        (show.seasons[String(r.season)] ||= {})[String(r.ep)] = seq[k];
        mapped++;
      });
    }
    show.confidence = strategy;
    mapping[entry.kartoney_slug] = show;
    report.push({
      slug: entry.kartoney_slug, repo_files: parts.flat().length, kartoney_rows: rows_.length,
      intros: intros.length, strategy, mapped,
    });
  }

  writeFileSync(OUT, JSON.stringify({
    built_at: new Date().toISOString(), source: 'site.word.tn', mapping, report,
  }, null, 2));

  const total = report.reduce((a, r) => a + r.mapped, 0);
  console.log(`word.tn mapping: ${report.length} shows, ${total} episode URLs → ${OUT}`);
  const odd = report.filter((r) => r.strategy.startsWith('partial'));
  console.log(`alignment: ${report.length - odd.length} exact, ${odd.length} partial:`);
  odd.forEach((r) => console.log(`  ${r.slug.padEnd(24)} repo ${r.repo_files} vs real rows ${r.kartoney_rows - r.intros} (mapped ${r.mapped})`));
  const introKept = report.filter((r) => r.strategy === 'positional-with-intro').length;
  console.log(`intro handling: ${introKept} shows keep an intro slot, ${report.filter(r=>r.strategy==='positional-skip-intro').length} skip intro rows`);
}

run().catch((e) => { console.error('❌', e); process.exit(1); });
