/**
 * One-time / refresh downloader: pulls every distinct poster URL referenced in
 * data/kartoney.db into public/images/posters/ so the site can serve them
 * first-party (ad-blocker-proof + fast). Committed images are reused on later
 * runs; run `npm run images` again only to fetch newly-added posters.
 *
 * Usage:  node scripts/fetch-images.mjs          (skip already-downloaded)
 *         node scripts/fetch-images.mjs --force   (re-download everything)
 */
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { posterName } from '../src/imageMap.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB = join(ROOT, 'data', 'kartoney.db');
const OUT = join(ROOT, 'public', 'images', 'posters');
const FORCE = process.argv.includes('--force');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const CONCURRENCY = 8;

async function distinctUrls() {
  const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
  const db = new SQL.Database(readFileSync(DB));
  const set = new Set();
  for (const tbl of ['cartoons', 'episodes']) {
    const res = db.exec(`SELECT DISTINCT logo FROM ${tbl} WHERE logo LIKE 'http%'`);
    if (res[0]) res[0].values.forEach(([u]) => set.add(u));
  }
  db.close();
  return [...set];
}

async function download(url) {
  const name = posterName(url);
  if (!name) return { url, status: 'skip-badurl' };
  const dest = join(OUT, name);
  if (!FORCE && existsSync(dest)) return { url, name, status: 'cached' };
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://kartoney.com/' }, redirect: 'follow' });
    if (!res.ok) return { url, name, status: `http-${res.status}` };
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return { url, name, status: `not-image(${type.split(';')[0]})` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return { url, name, status: 'too-small' };
    writeFileSync(dest, buf);
    return { url, name, status: 'ok', bytes: buf.length };
  } catch (e) {
    return { url, name, status: `error:${e.code || e.message}` };
  }
}

async function run() {
  if (!existsSync(DB)) throw new Error(`DB not found at ${DB}`);
  mkdirSync(OUT, { recursive: true });
  const urls = await distinctUrls();
  console.log(`Found ${urls.length} distinct image URLs. Downloading into public/images/posters/ …`);

  const results = [];
  let i = 0;
  async function worker() {
    while (i < urls.length) {
      const idx = i++;
      results.push(await download(urls[idx]));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const by = (s) => results.filter((r) => r.status === s).length;
  const ok = by('ok'), cached = by('cached');
  const failed = results.filter((r) => r.status !== 'ok' && r.status !== 'cached');
  console.log(`\n✅ downloaded ${ok} · cached ${cached} · failed ${failed.length}`);
  if (failed.length) {
    console.log('   failures (these will fall back to their remote URL at build time):');
    failed.forEach((r) => console.log(`   - ${r.status}  ${r.url}`));
  }
}

run().catch((e) => { console.error('❌', e); process.exit(1); });
