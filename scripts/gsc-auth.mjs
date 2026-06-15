/**
 * One-time OAuth helper — mints a long-lived refresh token for the URL
 * Inspection runner using YOUR Google account (no service-account key needed,
 * so an org policy that blocks SA keys doesn't matter).
 *
 * PREREQUISITE — create an OAuth client (once):
 *   Google Cloud Console → APIs & Services → Credentials → Create credentials →
 *   OAuth client ID → Application type: "Desktop app". Download the JSON, or copy
 *   the Client ID + Client secret.
 *   (If asked, configure the OAuth consent screen: User type External, add your
 *    own email as a Test user. To stop refresh tokens expiring after 7 days,
 *    later set the app Publishing status to "In production" — the "unverified"
 *    warning is fine since you're the only user.)
 *
 * RUN:
 *   GSC_OAUTH_CLIENT_FILE=./client_secret.json node scripts/gsc-auth.mjs
 *   # or:
 *   GSC_OAUTH_CLIENT_ID=xxx GSC_OAUTH_CLIENT_SECRET=yyy node scripts/gsc-auth.mjs
 *
 * It opens a local page, you log in + consent, and it prints the refresh token
 * to save as the GSC_OAUTH_REFRESH_TOKEN secret.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const PORT = Number(process.env.GSC_OAUTH_PORT || 9899);
const REDIRECT = `http://localhost:${PORT}`;

function client() {
  if (process.env.GSC_OAUTH_CLIENT_FILE) {
    const j = JSON.parse(readFileSync(process.env.GSC_OAUTH_CLIENT_FILE, 'utf8'));
    const c = j.installed || j.web || j;
    return { id: c.client_id, secret: c.client_secret };
  }
  if (process.env.GSC_OAUTH_CLIENT_ID && process.env.GSC_OAUTH_CLIENT_SECRET) {
    return { id: process.env.GSC_OAUTH_CLIENT_ID, secret: process.env.GSC_OAUTH_CLIENT_SECRET };
  }
  throw new Error('Provide GSC_OAUTH_CLIENT_FILE=./client_secret.json OR GSC_OAUTH_CLIENT_ID + GSC_OAUTH_CLIENT_SECRET');
}

const { id, secret } = client();
const state = crypto.randomBytes(16).toString('hex');
const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: id,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline', // ← needed for a refresh token
    prompt: 'consent', // ← force a refresh token even on re-consent
    state,
  });

async function exchange(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
  });
  return res.json();
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, REDIRECT);
  if (!u.searchParams.get('code') && !u.searchParams.get('error')) {
    res.writeHead(404).end();
    return;
  }
  const err = u.searchParams.get('error');
  if (err) {
    res.end(`Auth error: ${err}. You can close this tab.`);
    console.error('❌ Auth error:', err);
    server.close();
    return;
  }
  if (u.searchParams.get('state') !== state) {
    res.end('State mismatch. Close this tab and re-run.');
    server.close();
    return;
  }
  const tok = await exchange(u.searchParams.get('code'));
  if (!tok.refresh_token) {
    res.end('No refresh token returned. Close this tab and re-run (revoke prior access at myaccount.google.com → Security → Third-party access, then retry).');
    console.error('❌ No refresh_token in response:', JSON.stringify(tok));
    server.close();
    return;
  }
  res.end('✅ Success! Refresh token captured. You can close this tab and return to the terminal.');
  writeFileSync('.gsc-oauth.json', JSON.stringify({ client_id: id, client_secret: secret, refresh_token: tok.refresh_token }, null, 2));
  console.log('\n✅ Refresh token obtained.\n');
  console.log('Saved to .gsc-oauth.json (git-ignored). For local runs:');
  console.log(`  export GSC_OAUTH_CLIENT_ID='${id}'`);
  console.log(`  export GSC_OAUTH_CLIENT_SECRET='${secret}'`);
  console.log(`  export GSC_OAUTH_REFRESH_TOKEN='${tok.refresh_token}'`);
  console.log('  npm run index\n');
  console.log('For the GitHub Action, add these three as repo secrets:');
  console.log('  GSC_OAUTH_CLIENT_ID, GSC_OAUTH_CLIENT_SECRET, GSC_OAUTH_REFRESH_TOKEN');
  server.close();
});

server.listen(PORT, () => {
  console.log(`Listening on ${REDIRECT}`);
  console.log('\nOpen this URL in your browser, sign in with the Google account that owns the Search Console property, and approve:\n');
  console.log(authUrl + '\n');
});
