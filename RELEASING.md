# Deploying

The site is web-only (the Android app was retired in Sept 2026 — its install
page and APK are gone; old URLs redirect to `/lives/` via `public/_redirects`).

The site runs on Cloudflare Workers static assets, served by the `kartoney.com/*` route in
`wrangler.toml`. **Pushing to `main` does not deploy** — nothing is wired to the repo yet, so
production only changes when someone runs `npx wrangler deploy`. Vercel still builds on push
but no longer serves any traffic; deleting that project is safe whenever you want.

To roll back to Vercel, comment out the `[[routes]]` block and redeploy. The apex DNS record
still points at Vercel behind the proxy, so traffic falls through within seconds.

## Steps

1. `npm run build && npx wrangler deploy`, then commit and push.

## Traps

- **Requesting a not-yet-deployed URL caches the 404.** Wait for `wrangler deploy`
  to finish before touching a new path, or clear it via
  Cloudflare → Caching → Purge.
- `wrangler deploy` will not attach `kartoney.com` as a `custom_domain` while the
  Vercel A records exist, and a deploy that hits that error **leaves the Worker
  with no assets attached** — every path 404s until you redeploy. That is why the
  domain is wired up as a `[[routes]]` entry instead, which needs no DNS change
  at all.

## Checks worth running after a deploy

```bash
# homepage + a watch page render, redirects work
curl -s -o /dev/null -w "%{http_code}\n" https://kartoney.com/
curl -s -o /dev/null -w "%{http_code} → %{redirect_url}\n" https://kartoney.com/live_streaming_apps/
curl -s https://kartoney.com/watch/detective-conan/1-1/ | grep -o '<source src="[^"]*"'

# no stale references to the retired app anywhere
grep -rn "ostora\|\.apk\|live_streaming_apps" dist/ | head
```
