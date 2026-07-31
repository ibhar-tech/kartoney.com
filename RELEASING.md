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
3. **Bump `?v=` on every download link.** See below — this is not optional.
4. `npm run build`, then commit and push. Vercel deploys on push to `main`.

## Why the links carry `?v=<version>`

kartoney.com is served through Cloudflare, which **overrides `Cache-Control` on this zone**.
`vercel.json` asks for `max-age=300` on `/(.*).apk` and the edge serves `max-age=14400`
regardless — the `X-Robots-Tag` from the same rule *is* applied, so the rule matches and only
the TTL is ignored. Nothing in this repo can change that.

Two things follow:

- **A replaced APK is handed out stale for four hours** unless the URL changes. A new version
  number in the filename is not enough on its own if a link is ever reused; the `?v=` is the
  guarantee, since Cloudflare keys its cache on the full URL including the query.
- **Requesting a not-yet-deployed URL caches the 404.** Verifying a new file against
  kartoney.com while the build is still running stores Vercel's 404 page at that URL for four
  hours, and a Vercel redeploy does not clear it — Vercel cannot purge Cloudflare. This
  happened on the v1.1 launch: the download worked from Frankfurt and 404'd from Paris for
  the same URL. Wait for the deploy to finish before touching the new path, or clear it with
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

`vercel.json` is validated against a schema, and **unknown keys fail the deployment** — there
is no way to leave a comment in it. Notes about it belong in this file.
