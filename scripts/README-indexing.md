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

## One-time setup

1. **Google Cloud project** → enable the **Google Search Console API**
   (APIs & Services → Library → "Google Search Console API" → Enable).
2. **Create a service account** (IAM & Admin → Service Accounts → Create).
   Then *Keys → Add key → JSON* and download the key file.
3. **Grant it access to your GSC property**: Search Console → Settings → Users
   and permissions → Add user → paste the service account's email
   (`...@...iam.gserviceaccount.com`) → permission **Full** (or Owner).
4. Pick how `GSC_SITE` is expressed:
   - URL-prefix property → `https://kartoney.com/` (default)
   - Domain property → `sc-domain:kartoney.com`

## Run it locally

```bash
# put the key somewhere git-ignored (gsc-key*.json is ignored by .gitignore)
GSC_KEY_FILE=./gsc-key.json npm run index

# options
node scripts/gsc-inspect.mjs --limit 50   # cap a test run
node scripts/gsc-inspect.mjs --reset      # restart the cursor at 0
```

Env vars: `GSC_KEY_FILE` or `GSC_KEY_JSON`, `GSC_SITE`, `GSC_DAILY_LIMIT`
(default 1800), `GSC_QPM` (default 360).

State is saved to `.gsc-state.json` (the resume cursor + today's count) and a
human-readable summary to `scripts/gsc-report.json`.

### Daily cron (local machine / server)

```cron
17 4 * * *  cd /path/to/kartoney.com && GSC_KEY_FILE=./gsc-key.json /usr/bin/npm run index >> /tmp/gsc.log 2>&1
```

## Run it automatically (GitHub Actions — recommended)

`.github/workflows/gsc-inspect.yml` runs daily. To enable it:

1. Repo → Settings → Secrets and variables → Actions → **New repository secret**
   - Name: `GSC_SERVICE_ACCOUNT_JSON`
   - Value: paste the **entire** key JSON file contents.
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
