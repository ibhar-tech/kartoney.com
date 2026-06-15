/**
 * Quota-aware Google Search Console URL-Inspection runner for kartoney.com.
 *
 * WHY THIS API (and not the "Indexing API"):
 *   Google's Indexing API officially only accepts JobPosting / BroadcastEvent
 *   pages — it ignores normal content pages like ours. The URL Inspection API
 *   (Search Console API) is the legitimate programmatic tool: 2,000 URLs/day,
 *   600/min per property. It reports each URL's real index status AND, in
 *   practice, nudges Google to (re)crawl the URL — the closest sanctioned thing
 *   to bulk "Request Indexing".
 *
 * WHAT IT DOES each run:
 *   - Builds the full URL list from the DB (cartoon pages first — they carry the
 *     series NAMES we want to rank for — then episodes, then listing pages).
 *   - Resumes from a saved cursor, inspects up to the remaining daily quota,
 *     throttled under the per-minute limit, then saves the cursor + a report of
 *     what is / isn't indexed so you know where to focus.
 *
 * AUTH (one-time setup — see scripts/README-indexing.md):
 *   - A Google Cloud service account with the Search Console API enabled.
 *   - That service account's email added as a user of the GSC property.
 *   - Provide the key via GSC_KEY_FILE=path  OR  GSC_KEY_JSON='<json>' (CI).
 *
 * USAGE:
 *   GSC_KEY_FILE=./gsc-key.json node scripts/gsc-inspect.mjs
 *   node scripts/gsc-inspect.mjs --limit 50         # cap this run (e.g. testing)
 *   node scripts/gsc-inspect.mjs --reset            # restart cursor at 0
 */
import crypto from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from '../src/data.mjs';
import { SITE, url, ERAS, TYPES } from '../src/config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB = join(ROOT, 'data', 'kartoney.db');
const STATE_FILE = process.env.GSC_STATE_FILE || join(ROOT, '.gsc-state.json');
const REPORT_FILE = process.env.GSC_REPORT_FILE || join(ROOT, 'scripts', 'gsc-report.json');

const SITE_URL = process.env.GSC_SITE || `${SITE.url}/`; // URL-prefix property; or "sc-domain:kartoney.com"
const DAILY_LIMIT = Number(process.env.GSC_DAILY_LIMIT || 1800); // < 2000/day API cap
const QPM = Number(process.env.GSC_QPM || 360); // < 600/min cap → spacing below
const SPACING_MS = Math.ceil(60000 / QPM);
const argLimit = numArg('--limit');
const RESET = process.argv.includes('--reset');

function numArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const todayStr = () => new Date().toISOString().slice(0, 10);

// ── Service-account auth: mint a signed JWT → exchange for an access token. ──
function authMode() {
  if (process.env.GSC_OAUTH_REFRESH_TOKEN && (process.env.GSC_OAUTH_CLIENT_ID || process.env.GSC_OAUTH_CLIENT_FILE)) return 'oauth';
  if (process.env.GSC_KEY_JSON || (process.env.GSC_KEY_FILE && existsSync(process.env.GSC_KEY_FILE))) return 'sa';
  return null;
}

function oauthClient() {
  if (process.env.GSC_OAUTH_CLIENT_FILE) {
    const j = JSON.parse(readFileSync(process.env.GSC_OAUTH_CLIENT_FILE, 'utf8'));
    const c = j.installed || j.web || j;
    return { id: c.client_id, secret: c.client_secret };
  }
  return { id: process.env.GSC_OAUTH_CLIENT_ID, secret: process.env.GSC_OAUTH_CLIENT_SECRET };
}

// Get an access token via OAuth user credentials (preferred — works when an org
// policy blocks service-account keys) or, failing that, a service-account key.
async function getAccessToken() {
  const mode = authMode();
  if (mode === 'oauth') {
    const { id, secret } = oauthClient();
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: process.env.GSC_OAUTH_REFRESH_TOKEN, grant_type: 'refresh_token' }),
    });
    const j = await res.json();
    if (!j.access_token) throw new Error('OAuth token refresh failed: ' + JSON.stringify(j));
    return j.access_token;
  }
  if (mode === 'sa') {
    const key = process.env.GSC_KEY_JSON ? JSON.parse(process.env.GSC_KEY_JSON) : JSON.parse(readFileSync(process.env.GSC_KEY_FILE, 'utf8'));
    const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const head = b64({ alg: 'RS256', typ: 'JWT' });
    const claim = b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
    const sig = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key.private_key).toString('base64url');
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }),
    });
    const j = await res.json();
    if (!j.access_token) throw new Error('Service-account token exchange failed: ' + JSON.stringify(j));
    return j.access_token;
  }
  throw new Error(
    'No credentials. Use OAuth: GSC_OAUTH_CLIENT_ID + GSC_OAUTH_CLIENT_SECRET + GSC_OAUTH_REFRESH_TOKEN (run `node scripts/gsc-auth.mjs` to mint the refresh token), or a service-account key (GSC_KEY_FILE/GSC_KEY_JSON). See scripts/README-indexing.md'
  );
}

// ── The crawl list: NAMES first (cartoon pages), then episodes, then listings. ──
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
  // Cartoon (name) pages first, then listings, then the long tail of episodes.
  return [...cartoonUrls, ...listingUrls, ...episodeUrls];
}

async function inspect(token, inspectionUrl) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl, siteUrl: SITE_URL, languageCode: 'ar' }),
  });
  if (res.status === 429) return { retry: true };
  if (res.status === 401 || res.status === 403) {
    const t = await res.text();
    throw new Error(`Auth/permission error (${res.status}). Is the service account added to the "${SITE_URL}" property? ${t}`);
  }
  const j = await res.json();
  const r = j.inspectionResult?.indexStatusResult || {};
  return { verdict: r.verdict || 'UNKNOWN', coverage: r.coverageState || 'unknown' };
}

function loadState() {
  if (!RESET && existsSync(STATE_FILE)) {
    try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { /* fall through */ }
  }
  return { date: todayStr(), sentToday: 0, cursor: 0, total: 0 };
}

async function main() {
  if (!authMode()) {
    throw new Error(
      'No credentials. Run `node scripts/gsc-auth.mjs` (OAuth) or set GSC_KEY_FILE. See scripts/README-indexing.md'
    );
  }
  const urls = await buildUrlList();
  const state = loadState();
  if (state.date !== todayStr()) { state.date = todayStr(); state.sentToday = 0; } // new day → reset daily counter

  let budget = Math.max(0, DAILY_LIMIT - state.sentToday);
  if (argLimit != null) budget = Math.min(budget, argLimit);
  budget = Math.min(budget, urls.length);
  if (budget <= 0) {
    console.log(`Daily quota already used (${state.sentToday}/${DAILY_LIMIT}). Try again tomorrow.`);
    return;
  }

  console.log(`Inspecting ${budget} URLs (cursor ${state.cursor}/${urls.length}, used today ${state.sentToday}/${DAILY_LIMIT}, site ${SITE_URL})`);
  const token = await getAccessToken();

  const tally = {};
  const notIndexed = [];
  let done = 0;
  for (let n = 0; n < budget; n++) {
    const i = (state.cursor + n) % urls.length;
    const u = urls[i];
    let res;
    try { res = await inspect(token, u); } catch (e) { console.error('✖', e.message); break; }
    if (res.retry) { console.log('Rate limited (429) — stopping for now.'); break; }
    tally[res.coverage] = (tally[res.coverage] || 0) + 1;
    if (res.verdict !== 'PASS') notIndexed.push({ url: u, coverage: res.coverage });
    done++;
    if (done % 100 === 0) console.log(`  …${done}/${budget}`);
    await sleep(SPACING_MS);
  }

  state.cursor = (state.cursor + done) % urls.length;
  state.sentToday += done;
  state.total = (state.total || 0) + done;
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  writeFileSync(
    REPORT_FILE,
    JSON.stringify({ date: state.date, inspected: done, byCoverage: tally, notIndexedSample: notIndexed.slice(0, 200), notIndexedCount: notIndexed.length }, null, 2)
  );

  console.log(`\n✅ Inspected ${done} URLs. Cursor now ${state.cursor}/${urls.length}. Used today ${state.sentToday}/${DAILY_LIMIT}.`);
  console.log('Coverage breakdown:');
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${v.toString().padStart(5)}  ${k}`);
  console.log(`Not-indexed this run: ${notIndexed.length} (sample saved to ${REPORT_FILE})`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
