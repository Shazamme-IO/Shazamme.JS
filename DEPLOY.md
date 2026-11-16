# SDK Deploy Process (shazamme.js)

The SDK is a static file on **AWS S3 + CloudFront** (`sdk.shazamme.io`), bucket
`shazamme.io-us-east-1-public-file`, CloudFront dist `E1NO6IQHVJQ8NV`,
AWS profile `sdk-deployer`. **There is no CI** — deploys are manual `aws s3 cp`.
The live SDK is the three shared files `js/shazamme-1.0.{1,2,3}.min.js`
(kept byte-identical; the widgets pin those version URLs).

## Golden rule
**Never write straight to the shared prod files.** Stage first, canary, then promote.

## Promotion path (dev → staging → canary → prod)
1. **Build.** Edit `shazamme.js` (bump `const version`, SKIP 1.0.10 — version
   compare is a string compare). Minify → `dist/sdk/shazamme-<version>.min.js`.
   `node --check` it and commit the exact bytes so prod is traceable in git.
2. **Test.** `npm test` (must be green, incl. `test/input-guards.test.mjs`).
3. **Staging path.** Upload to `js/plugin/sdk-test/shazamme-<version>-test.min.js`
   (new path = zero risk to live). Verify it loads and registers.
4. **Canary.** Point ONE site at the `-test` build (devdemo header rewrite hook `T`),
   verify in-browser (version, guard, no regressions). Rollback = revert `T`.
5. **Promote.** Only after canary is green: `aws s3 cp` the SAME bytes over
   `js/shazamme-1.0.{1,2,3}.min.js` (`--content-type application/javascript
   --cache-control "public, max-age=300"`) + CloudFront invalidate the 3 paths.
6. **Verify live.** Plain (no-query) edge URLs must show the new `version=` and
   the change; `git commit` + `gh release`.

## Rollback
Re-upload the previous `dist/sdk/shazamme-<prev>.min.js` over the 3 shared files
+ invalidate. Keep the prior build committed so rollback bytes are known.

## Per-site page config (1.1.6+)
`shazamme.json` here is the global config at `js/site/shazamme.json`. Its `sites`
map lists the ONLY sites that have their own config, so every other site skips
the per-site request (it used to 404 on every site, every page):

    "sites": { "<dudaSiteId>": ["<page>", ...] }

- Site file `site/<id>/shazamme.json` here → `js/site/<id>/shazamme.json` in S3.
- List a page name only if `js/site/<id>/<page>/shazamme.json` also exists.
- Upload the site file BEFORE adding the site to `sites` (old SDKs ignore `sites`).
- Config is cached in each visitor's `localStorage` (`shazamme:pageconfig:*`),
  so returning visitors keep the previous config until their storage is cleared.

## Source tracking
`master` must equal what is live in prod. Land SDK work via PR → master; do not
leave shipped builds only on feature branches.

## SDK 1.1.7 — v2 site resolution + Firebase auto-init (new file `shazamme-1.0.4.min.js`)
Build: `npm run build:sdk` → `dist/sdk/shazamme-1.1.7.min.js`. Unlike 1.1.2–1.1.6 this is
NOT copied over `shazamme-1.0.{1,2,3}.min.js`; it ships as a NEW file so no live widget changes
until a widget is pointed at it.

    B=s3://shazamme.io-us-east-1-public-file
    # 1. stage (zero risk to live)
    aws s3 cp dist/sdk/shazamme-1.1.7.min.js $B/js/plugin/sdk-test/shazamme-1.1.7-test.min.js \
      --profile sdk-deployer --content-type application/javascript --cache-control "public, max-age=300"
    # 2. after canary is green: publish as the new versioned file
    aws s3 cp dist/sdk/shazamme-1.1.7.min.js $B/js/shazamme-1.0.4.min.js \
      --profile sdk-deployer --content-type application/javascript --cache-control "public, max-age=300"
    aws cloudfront create-invalidation --distribution-id E1NO6IQHVJQ8NV --paths "/js/shazamme-1.0.4.min.js" --profile sdk-deployer
    # verify
    curl -s https://sdk.shazamme.io/js/shazamme-1.0.4.min.js | grep -o 'const version="[^"]*"'

Site resolution order: `window.__shazammeSite` → fresh `shazamme:site:v3:<dudaId>` cache →
v2 (`api.shazamme.com`, 2.5s timeout) → Vinyl (unchanged). Firebase: skipped if the page already
initialised an app or `window.__shazammeNoFirebase === true`; else config =
`window.__shazammeFirebase` > `site.firebaseConfig` > `site.dudaFirebaseScript` > shared `shazamme-2c292`.
