/**
 * Inserts new cartoons (with seasons + episodes + genre links) into
 * data/kartoney.db from the dataset produced by the catalog-builder track
 * (/tmp/new-cartoons/new-cartoons.json — see its header for the schema).
 *
 * Usage:
 *   node scripts/add-cartoons.mjs --file new-cartoons.json          # dry-run
 *   node scripts/add-cartoons.mjs --file new-cartoons.json --apply
 * Refuses to overwrite existing slugs; skips (and reports) seasons whose
 * episode maps are empty. Episode titles follow the house style «الحلقة N».
 */
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const iFile = args.indexOf('--file');
const FILE = iFile === -1 ? '/tmp/new-cartoons/new-cartoons.json' : args[iFile + 1];
const APPLY = args.includes('--apply');
const BACKUP = !args.includes('--no-backup');
const DB = process.env.KARTONEY_DB || join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'kartoney.db');

if (!existsSync(FILE)) { console.error(`❌ dataset not found: ${FILE}`); process.exit(1); }
const { cartoons } = JSON.parse(readFileSync(FILE, 'utf8'));

const require = (await import('node:module')).createRequire(import.meta.url);
const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
const db = new SQL.Database(readFileSync(DB));

const rows = (sql) => {
  const r = db.exec(sql);
  if (!r.length) return [];
  const { columns, values } = r[0];
  return values.map((v) => Object.fromEntries(v.map((x, i) => [columns[i], x])));
};

// Existing slugs + genre ids, for collision checks and links.
const existingSlugs = new Set(rows('SELECT slug FROM cartoons').map((r) => r.slug));
const genreId = new Map(rows('SELECT id, name_en FROM genres').map((g) => [g.name_en, g.id]));
const housekeeping = rows("SELECT status, type, era, sort_order FROM cartoons LIMIT 1")[0] || {};
const STATUS = housekeeping.status || 'ongoing';

const plan = [];
const skipped = [];
for (const c of cartoons) {
  if (!c.slug || !c.name) { skipped.push([c.slug || '(no slug)', 'missing slug/name']); continue; }
  if (existingSlugs.has(c.slug)) { skipped.push([c.slug, 'slug already exists']); continue; }
  const seasons = (c.seasons || []).filter((s) => s.episodes && Object.keys(s.episodes).length);
  if (!seasons.length) { skipped.push([c.slug, 'no episodes']); continue; }
  const gids = (c.genres || []).map((g) => genreId.get(g)).filter(Boolean);
  plan.push({ c, seasons, gids });
}

let epTotal = 0;
for (const p of plan) p.seasons.forEach((s) => { epTotal += Object.keys(s.episodes).length; });
console.log(`Plan: ${plan.length} new cartoons, ${epTotal} episodes.`);
skipped.forEach(([slug, why]) => console.log(`  skip: ${slug} — ${why}`));
plan.forEach((p) => console.log(`  + ${p.c.slug.padEnd(26)} ${p.seasons.reduce((a, s) => a + Object.keys(s.episodes).length, 0)} eps (${p.seasons.length} seasons) · ${p.c.name}`));

if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); db.close(); process.exit(0); }

if (BACKUP) {
  const bak = DB + '.bak-' + new Date().toISOString().slice(0, 10) + '-add';
  copyFileSync(DB, bak);
  console.log(`\nBackup: ${bak}`);
}

db.run('BEGIN TRANSACTION');
const insCartoon = db.prepare(`INSERT INTO cartoons (name, slug, logo, description, type, era, status, total_episodes, total_seasons, is_featured, is_popular, sort_order, source_file, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`);
const insSeason = db.prepare('INSERT INTO seasons (cartoon_id, season_number, name, logo, episode_count) VALUES (?,?,?,?,?)');
const insEp = db.prepare('INSERT INTO episodes (season_id, cartoon_id, episode_number, title, url, logo, duration) VALUES (?,?,?,?,?,?,?)');
const insCg = db.prepare('INSERT INTO cartoon_genres (cartoon_id, genre_id) VALUES (?,?)');

for (const { c, seasons, gids } of plan) {
  insCartoon.run([c.name, c.slug, c.logo || '', c.description || '', c.type || 'anime', c.era || '2000s', STATUS,
    seasons.reduce((a, s) => a + Object.keys(s.episodes).length, 0), seasons.length,
    c.is_featured ? 1 : 0, c.is_popular ? 1 : 0, c.sort_order ?? 999, c.source_file || '']);
  const cid = rows('SELECT last_insert_rowid() AS id')[0].id;
  for (const gid of gids) insCg.run([cid, gid]);
  for (const s of seasons) {
    const nums = Object.keys(s.episodes).map(Number).sort((a, b) => a - b);
    insSeason.run([cid, s.number, s.name || `الموسم ${s.number}`, c.logo || '', nums.length]);
    const sid = rows('SELECT last_insert_rowid() AS id')[0].id;
    for (const n of nums) {
      const url = s.episodes[String(n)] || s.episodes[n];
      insEp.run([sid, cid, n, `الحلقة ${n}`, url, c.logo || '', null]);
    }
  }
}
db.run('COMMIT');
insCartoon.free(); insSeason.free(); insEp.free(); insCg.free();
writeFileSync(DB, Buffer.from(db.export()));
db.close();
console.log(`✅ Inserted ${plan.length} cartoons / ${epTotal} episodes into ${DB}.`);
console.log('Next: npm run images (localize new posters), npm run build, then verify with scripts/check-urls.mjs --sample 200.');
