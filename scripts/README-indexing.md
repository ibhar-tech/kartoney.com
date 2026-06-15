# Indexing automation (Google Search Console URL Inspection API)

This automates "nudging" Google to crawl your pages and tracks what's actually
indexed — within Google's real limits.

## Why not the "Indexing API"?

Google's **Indexing API** officially only accepts `JobPosting` and
`BroadcastEvent` (livestream) pages. It ignores normal content pages like cartoon
and episode pages, so it's the wrong tool here.

The **URL Inspection API** (part of the Search Console API) is the legitimate
option: **2,000 URLs/day, 600/min** per property. It reports each URL's index
status and, in practice, prompts Google to (re)crawl it — the closest sanctioned
thing to bulk "Request Indexing". `scripts/gsc-inspect.mjs` uses it.

> There is **no** official API behind the "Request Indexing" button in the GSC
> UI. The manual button is limited to ~10–12 URLs/day. For your top 10 series,
> keep using the button by hand; this script covers everything else at scale.

## Two ways to authenticate

- **OAuth user credentials (recommended)** — uses *your* Google account, which
  already owns the Search Console property. No service-account key, so an org
  policy that blocks SA keys (`iam.disableServiceAccountKeyCreation`) doesn't
  matter. ← use this if you hit the "key creation is disabled" error.
- **Service-account key (fallback)** — only works if your org allows SA keys.

Either way: **enable the API** first — Cloud Console → APIs & Services → Library
→ "Google Search Console API" → **Enable**. And know your `GSC_SITE`:
URL-prefix property → `https://kartoney.com/` (default); Domain property →
`sc-domain:kartoney.com`.

### Option A — OAuth (recommended)

1. Cloud Console → APIs & Services → **Credentials → Create credentials → OAuth
   client ID** → Application type **Desktop app** → download the JSON
   (`client_secret.json`).
   - If prompted, set up the **OAuth consent screen**: User type *External*, add
     your own email as a **Test user**. To stop the refresh token expiring after
     7 days, later set Publishing status to **In production** (the "unverified
     app" warning is fine — you're the only user).
2. Mint the refresh token (one time):
   ```bash
   GSC_OAUTH_CLIENT_FILE=./client_secret.json npm run index:auth
   ```
   Open the printed URL, sign in with the account that owns the property, approve.
   It saves `.gsc-oauth.json` (git-ignored) and prints three values.
3. Run it:
   ```bash
   export GSC_OAUTH_CLIENT_ID='…'
   export GSC_OAUTH_CLIENT_SECRET='…'
   export GSC_OAUTH_REFRESH_TOKEN='…'
   npm run index
   ```

### Option B — Service account (only if SA keys are allowed)

1. IAM & Admin → Service Accounts → Create → **Keys → Add key → JSON**, download.
2. Search Console → Settings → Users and permissions → **Add user** → the service
   account email (`…@….iam.gserviceaccount.com`) → permission **Full**.
3. Run: `GSC_KEY_FILE=./gsc-key.json npm run index`

### Common options

```bash
node scripts/gsc-inspect.mjs --limit 50   # cap a test run
node scripts/gsc-inspect.mjs --reset      # restart the cursor at 0
```

Env vars: (OAuth) `GSC_OAUTH_CLIENT_ID`/`GSC_OAUTH_CLIENT_SECRET`/`GSC_OAUTH_REFRESH_TOKEN`
or `GSC_OAUTH_CLIENT_FILE`; (SA) `GSC_KEY_FILE` or `GSC_KEY_JSON`; plus `GSC_SITE`,
`GSC_DAILY_LIMIT` (default 1800), `GSC_QPM` (default 360).

State is saved to `.gsc-state.json` (the resume cursor + today's count) and a
human-readable summary to `scripts/gsc-report.json`.

### Daily cron (local machine / server)

```cron
17 4 * * *  cd /path/to/kartoney.com && GSC_KEY_FILE=./gsc-key.json /usr/bin/npm run index >> /tmp/gsc.log 2>&1
```

## Run it automatically (GitHub Actions — recommended)

`.github/workflows/gsc-inspect.yml` runs daily. To enable it:

1. Repo → Settings → Secrets and variables → Actions → **New repository secret**.
   - **OAuth (recommended):** add three secrets — `GSC_OAUTH_CLIENT_ID`,
     `GSC_OAUTH_CLIENT_SECRET`, `GSC_OAUTH_REFRESH_TOKEN` (from `npm run index:auth`).
   - **Service account (fallback):** add one secret `GSC_SERVICE_ACCOUNT_JSON`
     with the entire key JSON.
2. (Optional) add a repo **variable** `GSC_SITE` if you use a domain property.
3. Done. It runs ~04:17 UTC daily and commits the resume cursor back with
   `[skip netlify]` (so it never triggers a site rebuild). Trigger a manual run
   anytime from the Actions tab ("Run workflow").

## Reading the report

`scripts/gsc-report.json` after each run:

```json
{
  "date": "2026-06-16",
  "inspected": 1800,
  "byCoverage": {
    "Submitted and indexed": 1200,
    "Crawled - currently not indexed": 300,
    "Discovered - currently not indexed": 250,
    "URL is unknown to Google": 50
  },
  "notIndexedCount": 600,
  "notIndexedSample": [{ "url": "…", "coverage": "…" }]
}
```

- **Submitted and indexed** → done. 🎉
- **Crawled / Discovered – currently not indexed** → Google saw it but hasn't
  indexed it yet; usually time + content quality + internal links fix this.
- **URL is unknown to Google** → not discovered yet; the inspection itself helps.
