/**
 * Show the current status of the daily indexing run.
 *   npm run index:status
 *
 * Reads the cursor (.gsc-state.json) + coverage report (scripts/gsc-report.json)
 * that the GitHub Action commits each day — pulling the latest from origin so you
 * see today's numbers without manually syncing.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOTAL = 8738; // cartoon pages + listings + episodes (approx)

try { execSync('git fetch -q origin main', { cwd: ROOT, stdio: 'ignore' }); } catch {}

function read(gitPath, localPath) {
  try { return JSON.parse(execSync(`git show origin/main:${gitPath}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString()); } catch {}
  const f = join(ROOT, localPath);
  if (existsSync(f)) { try { return JSON.parse(readFileSync(f, 'utf8')); } catch {} }
  return null;
}

const state = read('.gsc-state.json', '.gsc-state.json');
const report = read('scripts/gsc-report.json', 'scripts/gsc-report.json');

if (!state) {
  console.log('No cursor yet — the daily Action has not run/committed. Check the repo Actions tab.');
  process.exit(0);
}

const pct = Math.min(100, Math.round((state.cursor / TOTAL) * 100));
const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '░');

console.log('\n📊  Kartoney indexing status');
console.log('────────────────────────────────────────');
console.log(`  last run        : ${state.date}`);
console.log(`  cursor          : ${state.cursor} / ~${TOTAL}`);
console.log(`  progress        : [${bar}] ${pct}%`);
console.log(`  inspected today : ${state.sentToday}`);
console.log(`  inspected total : ${state.total ?? state.sentToday}`);

if (report?.byCoverage) {
  console.log(`\n  last batch (${report.inspected} URLs) — index status:`);
  for (const [k, v] of Object.entries(report.byCoverage).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(v).padStart(5)}  ${k}`);
  }
  console.log(`  not indexed yet (this batch): ${report.notIndexedCount}`);
}
console.log('');
