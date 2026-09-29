/**
 * Re-source episode video URLs in data/kartoney.db from one or more mapping
 * files (the output of our source-hunting: word.tn / archive.org / embeds).
 *
 * Mapping file format (canonical shape):
 * {
 *   "mapping": {
 *     "<kartoney-slug>": {
 *       "confidence": "…",                      // informational only
 *       "seasons": { "1": { "1": "https://…mp4", "2": "…" } }
 *     }
 *   }
 * }
 * Season keys are kartoney season_number values; episode keys are episode_number.
 *
 * Usage:
 *   node scripts/resource-urls.mjs --map a.json --map b.json            # dry-run plan
 *   node scripts/resource-urls.mjs --map a.json --apply                 # backup + write
 *   node scripts/resource-urls.mjs --map a.json --apply --no-backup
 * Precedence: maps listed FIRST win per episode. Episodes with no entry in any
 * map keep their current URL. A --dry-run report shows exactly what changes.
 */
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB = join(ROOT, 'data', 'kartoney.db');

const args = process.argv.slice(2);
const maps = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--map') maps.push(args[++i]);
}
const APPLY = args.includes('--apply');
const BACKUP = !args.includes('--no-backup');
const REPORT = (() => { const i = args.indexOf('--report'); return i === -1 ? null : args[i + 1]; })();

if (!maps.length) {
  console.error('Usage: node scripts/resource-urls.mjs --map mapping.json [--map mapping2.json …] [--apply] [--no-backup] [--report out.json]');
  process.exit(1);
}
for (const m of maps) {
  if (!existsSync(m)) { console.error(`❌ map file not found: ${m}`); process.exit(1); }
}

const hostOf = (u) => { try { return new URL(u).host; } catch { return '(invalid)'; } };

async function run() {
  // Load maps in precedence order; keep per-map source tag for reporting.
  const loaded = maps.map((path) => {
    const j = JSON.parse(readFileSync(path, 'utf8'));
    if (!j.mapping) throw new Error(`${path}: missing top-level "mapping" object`);
    return { path, mapping: j.mapping };
  });

  const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
  const db = new SQL.Database(readFileSync(DB));
  const rows = (sql) => {
    const r = db.exec(sql);
    if (!r.length) return [];
    const { columns, values } = r[0];
    return values.map((v) => Object.fromEntries(v.map((x, i) => [columns[i], x])));
  };
  const eps = rows(`
    SELECT e.id, e.url, e.episode_number AS ep, s.season_number AS season, c.slug AS slug, c.name AS show
    FROM episodes e
    JOIN seasons s ON s.id = e.season_id
    JOIN cartoons c ON c.id = e.cartoon_id
    ORDER BY c.slug, s.season_number, e.episode_number`);

  const plan = [];
  const perShow = {};
  for (const e of eps) {
    let picked = null;
    for (const { path, mapping } of loaded) {
      const u = mapping[e.slug]?.seasons?.[String(e.season)]?.[String(e.ep)];
      if (u) { picked = { url: u, from: path }; break; }
    }
    const s = (perShow[e.slug] ||= { name: e.show, total: 0, replaced: 0 });
    s.total++;
    if (picked) {
      s.replaced++;
      if (picked.url !== e.url) plan.push({ id: e.id, slug: e.slug, show: e.show, season: e.season, ep: e.ep, from: e.url, to: picked.url, map: picked.from });
    }
  }

  const bySource = {};
  for (const p of plan) bySource[hostOf(p.to)] = (bySource[hostOf(p.to)] || 0) + 1;
  const alreadyOk = Object.values(perShow).reduce((a, s) => a + s.replaced, 0) - plan.length;

  console.log(`Episodes with a new-source URL : ${Object.values(perShow).reduce((a, s) => a + s.replaced, 0)} / ${eps.length}`);
  console.log(`URLs that actually change      : ${plan.length} (${alreadyOk} already point at the target)`);
  console.log('New URL hosts:');
  Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([h, n]) => console.log(`  ${String(n).padStart(6)}  ${h}`));
  console.log('\nPer-show coverage (only shows with any mapping):');
  Object.entries(perShow).filter(([, s]) => s.replaced > 0).sort((a, b) => b[1].replaced - a[1].replaced).forEach(([slug, s]) => {
    const pct = ((s.replaced / s.total) * 100).toFixed(0).padStart(3);
    console.log(`  ${slug.padEnd(24)} ${String(s.replaced).padStart(4)}/${String(s.total).padStart(4)} (${pct}%)  ${s.name}`);
  });
  const noMap = Object.entries(perShow).filter(([, s]) => s.replaced === 0);
  if (noMap.length) {
    console.log(`\nShows with NO new source (${noMap.length}):`);
    noMap.forEach(([slug, s]) => console.log(`  ${slug.padEnd(24)} ${s.total} eps  ${s.name}`));
  }

  if (REPORT) {
    writeFileSync(REPORT, JSON.stringify({ applied: APPLY, changed: plan.length, bySource, perShow, plan }, null, 2));
    console.log(`\nReport: ${REPORT}`);
  }

  if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply to update the DB.'); return; }

  if (BACKUP) {
    const bak = DB + '.bak-' + new Date().toISOString().slice(0, 10);
    copyFileSync(DB, bak);
    console.log(`\nBackup: ${bak}`);
  }
  const stmt = db.prepare('UPDATE episodes SET url = ? WHERE id = ?');
  db.run('BEGIN TRANSACTION');
  for (const p of plan) { stmt.run([p.to, p.id]); }
  db.run('COMMIT');
  stmt.free();
  writeFileSync(DB, Buffer.from(db.export()));
  db.close();
  console.log(`✅ Applied ${plan.length} URL updates to ${DB}. Run \`npm run build\` and re-verify with scripts/check-urls.mjs.`);
}

run().catch((e) => { console.error('❌', e); process.exit(1); });
