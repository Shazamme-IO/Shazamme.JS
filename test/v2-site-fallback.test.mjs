/*
 * v2-only site fallback test for the SDK (shazamme.js 1.1.8+).
 * A site created in the Shazamme Backend (v2) is unknown to Vinyl, so "Get Site
 * ID" came back "Duda SiteID not found", the SDK fell through to staging and
 * every widget rendered empty (MW Migration, 25 Nov 2026). Asserts Vinyl is
 * still asked first, v2 is asked only when Vinyl does not know the site, the v2
 * answer is cached for an hour, and every failure path still ends on staging.
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';

const VERSION = process.env.SDK_VERSION || '1.1.8';
const sdk = fs.readFileSync(new URL(`../dist/sdk/shazamme-${VERSION}.min.js`, import.meta.url), 'utf8');

const VINYL = 'https://shazamme.io/Job-Listing/src/php/regional/actions';
const STAGING = 'https://staging.shazamme.io/Job-Listing/src/php/regional/actions';
const V2 = 'https://api.shazamme.com/Job-Listing/src/php/regional/actions';
const V2_ID = '13444da0-0f4c-4bde-89c3-5f8d3202623a';
const CACHE_KEY = 'shazamme:site:v2only:d4aff204';

const results = [];
const assert = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);

const notFound = { status: false, response: 'Duda SiteID not found', request: 'Get Site ID' };
const found = (item) => ({ status: true, response: { items: [item] } });

// routes: url -> { ok: body } | { fail: xhr }
const load = (routes, { storage = {}, baked } = {}) => {
  const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
    url: 'https://client.example/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const { window } = dom;
  global.window = window; global.document = window.document;
  Object.entries(storage).forEach(([k, v]) => window.localStorage.setItem(k, JSON.stringify(v)));
  if (baked) window.__shazammeSite = baked;

  const calls = [];
  window.$ = Object.assign(() => ({ on() {}, ready() {} }), {
    get: () => Promise.resolve({ config: {} }),
    ajax: (opts) => {
      calls.push(opts.url);
      const r = routes[opts.url];
      return {
        then: (ok, fail) => {
          if (!r) return;
          if (r.fail) fail?.(r.fail); else ok(r.ok);
        },
      };
    },
  });
  window.eval(sdk);
  window.shazamme._sid = 'd4aff204';
  return { window, calls };
};

// --- Vinyl knows the site: unchanged, v2 never asked ---
{
  const { window, calls } = load({ [VINYL]: { ok: found({ siteID: 'vinyl-site', isLive: true }) } });
  const s = await window.shazamme.site();

  assert(`version is ${VERSION}`, window.shazamme._v === VERSION);
  assert('Vinyl site resolves from Vinyl', s.siteID === 'vinyl-site');
  assert('Vinyl site never asks v2', !calls.includes(V2));
}

// --- Vinyl knows it but it is not live: staging as before, v2 never asked ---
{
  const { window, calls } = load({
    [VINYL]: { ok: found({ siteID: 'vinyl-site', isLive: false }) },
    [STAGING]: { ok: found({ siteID: 'staging-site' }) },
  });
  const s = await window.shazamme.site();

  assert('not-live Vinyl site still goes to staging', s.siteID === 'staging-site');
  assert('not-live Vinyl site never asks v2', !calls.includes(V2));
}

// --- Vinyl does not know it, v2 does: v2 origin, staging never asked, cached ---
{
  const { window, calls } = load({
    [VINYL]: { ok: notFound },
    [V2]: { ok: found({ siteID: V2_ID, businessName: 'MW Migration', isLive: true }) },
  });
  const s = await window.shazamme.site();
  const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');

  assert('v2-only site resolves to its v2 siteID', s.siteID === V2_ID);
  assert('v2-only site uses the v2 API origin', s.ApiUrl === 'https://api.shazamme.com' && s.ActionUrl === 'https://api.shazamme.com/Job-Listing/src/php/actions');
  assert('v2-only site keeps v2 row fields', s.businessName === 'MW Migration');
  assert('Vinyl asked before v2', calls.indexOf(VINYL) === 0 && calls.indexOf(V2) === 1);
  assert('v2-only site never falls to staging', !calls.includes(STAGING));
  assert('v2 answer cached', cached?.site?.siteID === V2_ID && typeof cached.t === 'number');
}

// --- Fresh cache: no network at all ---
{
  const site = { siteID: V2_ID, ApiUrl: 'https://api.shazamme.com' };
  const { window, calls } = load({}, { storage: { [CACHE_KEY]: { site, t: Date.now() } } });
  const s = await window.shazamme.site();

  assert('cached v2 site resolves without a request', s.siteID === V2_ID && calls.length === 0);
}

// --- Stale cache (over an hour): ignored, re-resolved ---
{
  const site = { siteID: 'old', ApiUrl: 'https://api.shazamme.com' };
  const { window, calls } = load({
    [VINYL]: { ok: notFound },
    [V2]: { ok: found({ siteID: V2_ID, isLive: true }) },
  }, { storage: { [CACHE_KEY]: { site, t: Date.now() - 2 * 3600000 } } });
  const s = await window.shazamme.site();

  assert('stale cache is ignored', s.siteID === V2_ID && calls.includes(VINYL));
}

// --- Neither knows it: staging fallback exactly as before ---
{
  const { window, calls } = load({
    [VINYL]: { ok: notFound },
    [V2]: { fail: { status: 404, responseJSON: { status: false } } },
    [STAGING]: { ok: found({ siteID: 'staging-site' }) },
  });
  const s = await window.shazamme.site();

  assert('unknown site still falls back to staging', s.siteID === 'staging-site' && s.ApiUrl === 'https://staging.shazamme.io');
  assert('nothing cached for an unknown site', window.localStorage.getItem(CACHE_KEY) === null);
  assert('v2 asked once before staging', calls.indexOf(V2) >= 0 && calls.indexOf(V2) < calls.indexOf(STAGING));
}

// --- v2 errors or answers without a siteID: staging fallback ---
{
  const { window } = load({
    [VINYL]: { ok: notFound },
    [V2]: { fail: { status: 0, statusText: 'timeout' } },
    [STAGING]: { ok: found({ siteID: 'staging-site' }) },
  });
  const s = await window.shazamme.site();
  assert('v2 timeout falls back to staging', s.siteID === 'staging-site');
}
{
  const { window } = load({
    [VINYL]: { ok: notFound },
    [V2]: { ok: { status: true, response: { items: [] } } },
    [STAGING]: { ok: found({ siteID: 'staging-site' }) },
  });
  const s = await window.shazamme.site();
  assert('v2 empty answer falls back to staging', s.siteID === 'staging-site');
}

// --- Baked config still wins with no network ---
{
  const { window, calls } = load({}, { baked: { siteID: V2_ID, apiUrl: 'https://api.shazamme.com' } });
  const s = await window.shazamme.site();
  assert('baked __shazammeSite still resolves with no request', s.siteID === V2_ID && calls.length === 0);
}

console.log(results.join('\n'));
if (results.some((r) => r.startsWith('FAIL'))) process.exit(1);
