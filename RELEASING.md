# Publishing a new app build

The site distributes one Android app — **Ostora Online O²** — as a direct APK in
`public/`. One file covers phone, tablet and Android TV; there is no desktop build and no
second TV package.

## Steps

1. Drop the new APK in `public/` as `ostora_online_v<version>.apk` and delete the old one.
2. Update the version everywhere it is stated, not just in the link:
   - `src/templates.mjs` — the five download links, the install-steps filename, and the
     `SoftwareApplication` JSON-LD (`softwareVersion`, `downloadUrl`, `fileSize`).
   - `public/live_streaming_apps.html` — the two download links, the `.version` line, the
     button label, and the JSON-LD block.
   - `public/live_streaming_apps.js` — `btn-download-now` in both languages.
   - `public/llms.txt` — the app section.
3. **Bump `?v=` on every download link.** See below.
4. `npm run build && npx wrangler deploy`, then commit and push.

## Deploying

The site runs on Cloudflare Workers static assets, served by the `kartoney.com/*` route in
`wrangler.toml`. **Pushing to `main` does not deploy** — nothing is wired to the repo yet, so
production only changes when someone runs `npx wrangler deploy`. Vercel still builds on push
but no longer serves any traffic; deleting that project is safe whenever you want.

To roll back to Vercel, comment out the `[[routes]]` block and redeploy. The apex DNS record
still points at Vercel behind the proxy, so traffic falls through within seconds.

## Why the links carry `?v=<version>`

Historically Cloudflare's zone-level Browser Cache TTL rewrote `max-age=300` to
`max-age=14400` on the APK, so a replaced file was handed out stale for four hours. **That no
longer applies** — zone cache settings do not touch Worker responses, and the APK now serves
the `max-age=300, must-revalidate` from `public/_headers` verbatim.

The `?v=` is still worth keeping as cheap insurance, since Cloudflare keys its cache on the
full URL including the query, but it is no longer load-bearing.

One trap survives: **requesting a not-yet-deployed URL caches the 404.** Wait for
`wrangler deploy` to finish before touching a new path, or clear it via
Cloudflare → Caching → Purge.

## Checks worth running after a deploy

```bash
# the download resolves, with the right type and the full file, from several PoPs
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -D - "https://kartoney.com/ostora_online_v<version>.apk?v=<version>" \
    | grep -iE '^HTTP/|^content-length:|^content-type:|^cf-cache-status:' | tr -d '\r' | tr '\n' ' '
  echo; sleep 3
done

# no stale references to the previous build anywhere
grep -rn "v<old-version>" dist/ | head
```

The `Content-Type: application/vnd.android.package-archive` matters: served as
`application/octet-stream`, some Android browsers refuse to hand the file to the package
installer.

## One more trap

`wrangler deploy` will not attach `kartoney.com` as a `custom_domain` while the Vercel A
records exist, and a deploy that hits that error **leaves the Worker with no assets attached**
— every path 404s until you redeploy. That is why the domain is wired up as a `[[routes]]`
entry instead, which needs no DNS change at all.
