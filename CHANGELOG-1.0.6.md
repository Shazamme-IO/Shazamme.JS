# Shazamme.JS 1.0.6 — SDK performance + version consolidation

**Deployed to production 2026-07-29** (overwrote `sdk.shazamme.io/js/shazamme-1.0.{1,2,3}.min.js` with this build; CloudFront invalidation `I7T1UYGGJIF3MMDJ6FQRVM8HS7`, dist `E1NO6IQHVJQ8NV`).

> Review tip: the source was reformatted by the build tool, so plain `git diff` is noisy. Use **`git diff -w`** — the real change is ~106 lines, exactly the four items below.

## Why
Legacy Duda sites hardcode different SDK versions per widget, so a page loaded **3 separate SDK instances** (1.0.1 + 1.0.2 + 1.0.3), each running its own `ready()` / `site()` / `_pageConfig`. Measured on a live site (aequor): **3 SDK instances, 3× `site()` probes, 6× `shazamme.json` 404s**. Each old `site()` also did a ~2s prod-first probe with no error path (could hang), and `_pageConfig` blocked `ready()` on 404s.

## What changed (4 edits)
1. **Version → 1.0.6.**
2. **`site()` fast-path** — resolve the site object from a known origin instead of the ~2s prod-first "Get Site ID" probe: `window.__shazammeSite` bake (0ms) → `localStorage` cache (`shazamme:site:{sid}`) → `Get Region URL` (staging) → the original prod probe only as last resort. Adds an **8s no-hang guard** so `site()` can never lock up.
3. **`_pageConfig` un-gated from `ready()`** — it fired the per-site `shazamme.json` 404s inside the `ready()` `Promise.all`, adding ~360ms for nothing. Now fired in the background; `ready()` no longer waits on it.
4. **`_pageConfig` dedup + cache** — split into `_pageConfigRun` (worker) + `_pageConfig` (wrapper). The wrapper shares one in-flight promise per `sid_p` (the SDK calls it from ~9 places at once on a cold visit) and caches the result in `localStorage` (`shazamme:pageconfig:{sid}_{p}`, incl. empty), so the 404s fire at most once per browser.

## Consolidation mechanism (zero widget/site edits)
All three deployed files (`1.0.1/1.0.2/1.0.3.min.js`) now carry the **same** `const version = '1.0.6'`. The SDK self-init guard `if (!window['shazamme-'+version])` then lets only the **first** file initialize; the others no-op. So the 3 instances collapse to **1**, and the browser still requests all three URLs (cheap, cached) but only one runs. `window.shazamme` = highest `_v` loaded, so behaviour is the 1.0.6 superset.

## Compatibility
SDK API surface is **strictly additive**: 1.0.1 (52 methods) ⊂ 1.0.2 (55) ⊂ 1.0.3 (57) ⊂ 1.0.6 (59, adds `_configP`/`_pageConfigRun`). Nothing removed at any step; config constants (`defaultAccount`, `seekAdvertiser`, host/action/regional URLs) identical across all versions. Auth/OAuth/session path verified initializing clean on 1.0.6.

## Verification (prod, post-deploy)
| Site | SDK instances | pageConfig 404s | Widget | Errors |
|---|---|---|---|---|
| aequor (www.aequor.com) | 3 → **1** | 6 → **2** | 25 cards, prod-correct (`shazamme.io`, 187ms) | 0 |
| techpro | (req 1.0.1/2/3) → **1** | **2** | renders | 0 |
| devdemo (canary) | **1** | **2** | renders, auth clean | 0 |

## Rollback
`scratchpad/sdk-prod-backup/` holds the exact prior `1.0.{1,2,3}.min.js` (md5-matched to what was live). Re-upload + invalidate `/js/shazamme-1.0.*.min.js`. Pre-written script: `scratchpad/ROLLBACK.sh`.

## Known follow-ups
- The `site()` fast-path's step 3 hits `Get Region URL` on **staging**; for prod sites it still resolves correctly (falls through to the prod probe) but makes an extra hop — a durable build should resolve the origin per-site instead of hardcoding staging.
