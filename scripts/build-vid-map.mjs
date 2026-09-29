/**
 * Converts /tmp/apk-sweep/mapping.json (arabic-toons.com episode PAGE urls)
 * into /vid/<base64url>.mp4 entries for kartoney's Worker resolver, dropping
 * shows excluded for wrong-generation risk (beyblade family) and keeping only
 * episodes that are still dead in the DB.
 *
 * Entry encoding: base64url JSON { p: <episode page>, f?: <foupix file path override> }
 *   - normal entries: { p: page }  → Worker fetches page, extracts videoSrc, 302
 *   - orphaned files (naruto): { p: bootstrapPage, f: file } → mint on the
 *     bootstrap page, substitute the file path (tokens are not path-bound)
 */
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire('/media/ibhar/data_20241/my projects _ 2027/streaming/kartoney.com/');
const ROOT = '/media/ibhar/data_20241/my projects _ 2027/streaming/kartoney.com';
const MINT_BOOTSTRAP = 'https://www.arabic-toons.com/ab6al-aldigetal-s1-1414874446-21216.html';
const EXCLUDE = ['beyblade', 'beyblade-zero-g']; // wrong-generation risk, medium/low confidence

const j = JSON.parse(readFileSync('/tmp/apk-sweep/mapping.json', 'utf8'));
for (const s of EXCLUDE) delete j.mapping[s];

const b64 = (s) => Buffer.from(s).toString('base64url');
const vidUrl = (page, file) => '/vid/' + b64(JSON.stringify(file ? { p: page, f: file } : { p: page })) + '.mp4';

const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
const db = new SQL.Database(readFileSync(ROOT + '/data/kartoney.db'));
const r = db.exec(`SELECT c.slug, s.season_number, e.episode_number, e.url
  FROM episodes e JOIN seasons s ON s.id=e.season_id JOIN cartoons c ON c.id=e.cartoon_id`);
const { columns, values } = r[0];
const rows = values.map((v) => Object.fromEntries(v.map((x, i) => [columns[i], x])));
db.close();
const dead = new Set(rows
  .filter((x) => /servallvid|drive\.google/.test(x.url))
  .map((x) => x.slug + '|' + x.season_number + '|' + x.episode_number));

const out = { mapping: {} };
let kept = 0, skippedLive = 0;
for (const [slug, m] of Object.entries(j.mapping)) {
  for (const [s, eps] of Object.entries(m.seasons || {})) {
    for (const [e, u] of Object.entries(eps)) {
      if (!dead.has(slug + '|' + s + '|' + e)) { skippedLive++; continue; }
      const show = (out.mapping[slug] ||= { confidence: 'arabic-toons-foupix-resolver', seasons: {} });
      (show.seasons[s] ||= {})[e] = /foupix\.com/.test(u) ? vidUrl(MINT_BOOTSTRAP, u) : vidUrl(u);
      kept++;
    }
  }
}
writeFileSync('/tmp/apk-sweep/mapping-vid-filtered.json', JSON.stringify(out, null, 1));
console.log(`kept ${kept} (still-dead only), skipped ${skippedLive} already-live, shows: ${Object.keys(out.mapping).join(', ')}`);
