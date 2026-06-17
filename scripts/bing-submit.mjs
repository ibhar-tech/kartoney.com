/**
 * Bing URL submission for kartoney.com — two complementary channels.
 *
 * WHY TWO CHANNELS:
 *   Bing's classic "SubmitUrlBatch" API actually queues URLs for crawling (unlike
 *   Google's URL Inspection, which only *reads* status) — but new sites get a tiny
 *   quota (GetUrlSubmissionQuota → ~100/day, ~1,400/month here). At 100/day it
 *   would take months to cover all ~8,738 URLs. So we also use IndexNow, Bing's
 *   modern bulk channel: up to 10,000 URLs per request, no small daily cap,
 *   verified by a public key file at https://kartoney.com/<key>.txt. IndexNow
 *   also fans out to Yandex, Naver, Seznam and other participating engines.
 *
 * CHANNELS:
 *   1) IndexNow (bulk)        — `--indexnow`  : submit ALL URLs (chunked) instantly.
 *   2) SubmitUrlBatch (daily) — default       : spend the remaining daily quota on
 *      the next slice of URLs, cursor-resumed across days.
 *
 * URL ORDER: cartoon (series-name) pages first, then listing pages, then the long
 * tail of episodes — same priority as the GSC runner.
 *
 * AUTH / CONFIG (env):
 *   BING_API_KEY       secret Webmaster API key — SubmitUrlBatch + quota only.
 *   BING_INDEXNOW_KEY  public IndexNow key — must match public/<key>.txt.
 *   BING_SITE          site URL (default https://kartoney.com).
 *
 * USAGE:
 *   BING_API_KEY=$(cat .bing-key) node scripts/bing-submit.mjs            # daily top-up
 *   BING_INDEXNOW_KEY=... node scripts/bing-submit.mjs --indexnow         # blast all URLs
 *   node scripts/bing-submit.mjs --indexnow --limit 2000                  # cap the blast
 *   BING_API_KEY=$(cat .bing-key) node scripts/bing-submit.mjs --quota    # show quota, exit
 *   node scripts/bing-submit.mjs --reset                                  # restart cursor
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from '../src/data.mjs';
import { SITE, url, ERAS, TYPES } from '../src/config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB = join(ROOT, 'data', 'kartoney.db');
const STATE_FILE = process.env.BING_STATE_FILE || join(ROOT, '.bing-state.json');
const REPORT_FILE = process.env.BING_REPORT_FILE || join(ROOT, 'scripts', 'bing-report.json');

const SITE_URL = (process.env.BING_SITE || SITE.url).replace(/\/$/, ''); // no trailing slash
const HOST = new URL(SITE_URL).host; // kartoney.com
const API_KEY = process.env.BING_API_KEY || '';
const INDEXNOW_KEY = process.env.BING_INDEXNOW_KEY || '';

const DO_INDEXNOW = process.argv.includes('--indexnow');
const DO_QUOTA = process.argv.includes('--quota');
const RESET = process.argv.includes('--reset');
const argLimit = numArg('--limit');

const INDEXNOW_CHUNK = 1000;           // IndexNow allows up to 10k/request; keep it modest
const SUBMIT_BATCH_MAX = 100;          // SubmitUrlBatch URLs per HTTP call (<= quota slice)

function numArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const todayStr = () => new Date().toISOString().slice(0, 10);

// ── The crawl list: NAMES first (cartoon pages), then listings, then episodes. ──
async function buildUrlList() {
  const data = await loadData(DB);
  const cartoonUrls = data.cartoons.map((c) => url.abs(url.cartoon(c.slug)));
  const episodeUrls = [];
  for (const c of data.cartoons) for (const ep of c.allEpisodes) episodeUrls.push(url.abs(url.watch(c.slug, ep.slug)));
  const listingUrls = [
    url.abs('/'),
    url.abs(url.library()),
    url.abs(url.genresIndex()),
    ...data.genres.map((g) => url.abs(url.genre(g.en))),
    ...TYPES.filter((t) => data.byType(t.key).length).map((t) => url.abs(url.category(t.key))),
    ...ERAS.filter((e) => data.byEra(e.key).length).map((e) => url.abs(url.era(e.key))),
  ];
  return [...cartoonUrls, ...listingUrls, ...episodeUrls];
}

function loadState() {
  if (!RESET && existsSync(STATE_FILE)) {
    try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { /* fall through */ }
  }
  return { date: todayStr(), sentToday: 0, cursor: 0, total: 0, indexnow: null };
}

// ── Bing Webmaster API: classic apikey=… JSON endpoints ──
const WM = 'https://ssl.bing.com/webmaster/api.svc/json';

async function getQuota() {
  if (!API_KEY) throw new Error('BING_API_KEY is not set (needed for the SubmitUrlBatch channel).');
  const res = await fetch(`${WM}/GetUrlSubmissionQuota?siteUrl=${encodeURIComponent(SITE_URL)}&apikey=${API_KEY}`);
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.d) throw new Error(`GetUrlSubmissionQuota failed (${res.status}): ${JSON.stringify(j)}`);
  return { daily: j.d.DailyQuota ?? 0, monthly: j.d.MonthlyQuota ?? 0 };
}

// Submit one batch (<= SUBMIT_BATCH_MAX) to Bing's crawl queue.
async function submitUrlBatch(urlList) {
  const res = await fetch(`${WM}/SubmitUrlBatch?apikey=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ siteUrl: SITE_URL, urlList }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`SubmitUrlBatch failed (${res.status}): ${txt}`);
  return txt; // {"d":null} on success
}

// ── IndexNow: POST batches of URLs, verified by the public key file. ──
async function indexNowSubmit(urlList) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  });
  const txt = await res.text().catch(() => '');
  return { status: res.status, body: txt };
}

async function runIndexNow(urls, state) {
  if (!INDEXNOW_KEY) throw new Error('BING_INDEXNOW_KEY is not set (needed for the IndexNow channel).');
  // Pre-flight: the key file must be live, or IndexNow returns 403.
  const keyUrl = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
  const probe = await fetch(keyUrl).catch(() => null);
  const probeTxt = probe ? (await probe.text().catch(() => '')).trim() : '';
  if (!probe || !probe.ok || probeTxt !== INDEXNOW_KEY) {
    throw new Error(
      `IndexNow key file not live/valid at ${keyUrl} (got status ${probe?.status ?? 'no-response'}). ` +
      `Commit public/${INDEXNOW_KEY}.txt and deploy first, then re-run.`
    );
  }

  const limit = argLimit != null ? Math.min(argLimit, urls.length) : urls.length;
  const list = urls.slice(0, limit);
  console.log(`IndexNow: submitting ${list.length} URLs to Bing/Yandex (host ${HOST}, chunks of ${INDEXNOW_CHUNK})…`);

  let ok = 0;
  const results = [];
  for (let i = 0; i < list.length; i += INDEXNOW_CHUNK) {
    const chunk = list.slice(i, i + INDEXNOW_CHUNK);
    const { status, body } = await indexNowSubmit(chunk);
    const good = status === 200 || status === 202;
    if (good) ok += chunk.length;
    results.push({ from: i, count: chunk.length, status });
    console.log(`  ${good ? '✓' : '✗'} ${i + chunk.length}/${list.length}  (HTTP ${status}${good ? '' : ' ' + body.slice(0, 120)})`);
    if (status === 429) { console.log('  rate-limited — pausing 10s'); await sleep(10000); }
    else await sleep(800);
  }

  state.indexnow = { lastRun: new Date().toISOString(), submitted: ok, total: list.length };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`\n✅ IndexNow: ${ok}/${list.length} URLs accepted. (200/202 = received.)`);
}

async function runSubmitBatch(urls, state) {
  const quota = await getQuota();
  console.log(`Bing quota — daily ${quota.daily}, monthly ${quota.monthly} remaining.`);
  let budget = Math.min(quota.daily, quota.monthly, urls.length);
  if (argLimit != null) budget = Math.min(budget, argLimit);
  if (budget <= 0) {
    console.log('No submission quota left right now — try again later (resets daily/monthly).');
    return;
  }

  console.log(`SubmitUrlBatch: submitting ${budget} URLs (cursor ${state.cursor}/${urls.length})…`);
  let sent = 0;
  while (sent < budget) {
    const chunk = [];
    for (let k = 0; k < SUBMIT_BATCH_MAX && sent + chunk.length < budget; k++) {
      chunk.push(urls[(state.cursor + sent + chunk.length) % urls.length]);
    }
    await submitUrlBatch(chunk);
    sent += chunk.length;
    console.log(`  ✓ ${sent}/${budget}`);
    if (sent < budget) await sleep(1000);
  }

  state.cursor = (state.cursor + sent) % urls.length;
  if (state.date !== todayStr()) { state.date = todayStr(); state.sentToday = 0; }
  state.sentToday += sent;
  state.total = (state.total || 0) + sent;
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  writeFileSync(REPORT_FILE, JSON.stringify({ date: todayStr(), channel: 'SubmitUrlBatch', submitted: sent, cursor: state.cursor, quotaAfter: await getQuota().catch(() => null) }, null, 2));
  console.log(`\n✅ Submitted ${sent} URLs to Bing. Cursor now ${state.cursor}/${urls.length}. Used today ${state.sentToday}.`);
}

async function main() {
  if (DO_QUOTA) {
    const q = await getQuota();
    console.log(`Bing URL submission quota for ${SITE_URL}:\n  daily remaining:   ${q.daily}\n  monthly remaining: ${q.monthly}`);
    return;
  }
  const urls = await buildUrlList();
  const state = loadState();
  if (state.date !== todayStr()) { state.date = todayStr(); state.sentToday = 0; }

  if (DO_INDEXNOW) await runIndexNow(urls, state);
  else await runSubmitBatch(urls, state);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
