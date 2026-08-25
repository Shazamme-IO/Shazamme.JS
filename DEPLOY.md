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

## Source tracking
`master` must equal what is live in prod. Land SDK work via PR → master; do not
leave shipped builds only on feature branches.
