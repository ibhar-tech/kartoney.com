/**
 * Show the current status of the Bing URL-submission automation.
 *   npm run bing:status
 *
 * Reads the cursor (.bing-state.json) + last report (scripts/bing-report.json)
 * the GitHub Action commits each day — pulling the latest from origin so you see
 * today's numbers without syncing — and (if a key is available) the live Bing
 * submission quota. Picks up BING_API_KEY from the env or the local .bing-key file.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOTAL = 8738; // cartoon pages + listings + episodes (approx)
const SITE_URL = (process.env.BING_SITE || 'https://kartoney.com').replace(/\/$/, '');

try { execSync('git fetch -q origin main', { cwd: ROOT, stdio: 'ignore' }); } catch {}

function read(gitPath, localPath) {
  try { return JSON.parse(execSync(`git show origin/main:${gitPath}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString()); } catch {}
  const f = join(ROOT, localPath);
  if (existsSync(f)) { try { return JSON.parse(readFileSync(f, 'utf8')); } catch {} }
  return null;
}

function apiKey() {
  if (process.env.BING_API_KEY) return process.env.BING_API_KEY;
  const f = join(ROOT, '.bing-key');
  if (existsSync(f)) return readFileSync(f, 'utf8').trim();
  return null;
}

async function liveQuota() {
  const key = apiKey();
  if (!key) return null;
  try {
    const res = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionQuota?siteUrl=${encodeURIComponent(SITE_URL)}&apikey=${key}`);
    const j = await res.json();
    return j?.d ? { daily: j.d.DailyQuota, monthly: j.d.MonthlyQuota } : null;
  } catch { return null; }
}

const state = read('.bing-state.json', '.bing-state.json');

if (!state) {
  console.log('No cursor yet — the daily Action has not run/committed. Check the repo Actions tab.');
  process.exit(0);
}

const pct = Math.min(100, Math.round((state.cursor / TOTAL) * 100));
const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '░');
const q = await liveQuota();

console.log('\n📊  Kartoney — Bing submission status');
console.log('────────────────────────────────────────');
console.log(`  last run          : ${state.date}`);
console.log('\n  SubmitUrlBatch (daily quota channel):');
console.log(`    cursor          : ${state.cursor} / ~${TOTAL}`);
console.log(`    progress        : [${bar}] ${pct}%`);
console.log(`    submitted today : ${state.sentToday}`);
console.log(`    submitted total : ${state.total ?? state.sentToday}`);
if (q) console.log(`    quota remaining : ${q.daily}/day · ${q.monthly}/month`);
else console.log('    quota remaining : (set BING_API_KEY or keep .bing-key to show)');

if (state.indexnow) {
  console.log('\n  IndexNow (bulk channel):');
  console.log(`    last blast      : ${state.indexnow.lastRun}`);
  console.log(`    accepted        : ${state.indexnow.submitted} / ${state.indexnow.total}`);
}

console.log('\n  Truth source for *actual* indexing → Bing Webmaster Tools:');
console.log('    bing.com/webmasters → kartoney.com → Site Explorer / URL Inspection / IndexNow\n');
