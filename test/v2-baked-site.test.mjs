/*
 * v2 baked-site test for the SDK (shazamme.js 1.1.9+), Shazamme-backend#308.
 * A v2 site's head carries window.__shazammeSite = { siteID, apiUrl }. The SDK
 * built a cut-down site from it with no dudaSiteID and no isLive, so Register
 * Candidate (job alert by email) failed, client() went to staging, and Save Job
 * posted no site id (MW Migration, 26 Nov 2026). Asserts the full v2 row is
 * loaded and cached, every failure keeps the baked site plus the Duda id, v2
 * payloads carry dudaSiteID, and Vinyl sites are untouched.
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';

const VERSION = process.env.SDK_VERSION || '1.1.9';
const sdk = fs.readFileSync(new URL(`../dist/sdk/shazamme-${VERSION}.min.js`, import.meta.url), 'utf8');

const V2_ORIGIN = 'https://api.shazamme.com';
const V2 = `${V2_ORIGIN}/Job-Listing/src/php/regional/actions`;
const V2_ACTIONS = `${V2_ORIGIN}/Job-Listing/src/php/actions`;
const VINYL = 'https://shazamme.io/Job-Listing/src/php/regional/actions';
const VINYL_ACTIONS = 'https://shazamme.io/Job-Listing/src/php/actions';
const V2_ID = '13444da0-0f4c-4bde-89c3-5f8d3202623a';
const SID = 'd4aff204';
const CACHE_KEY = `shazamme:site:v2only:${SID}`;
const BAKED = { siteID: V2_ID, apiUrl: V2_ORIGIN };
const ROW = { siteID: V2_ID, dudaSiteID: SID, isLive: true, seekHirerID: 'hirer-1', businessName: 'MW Migration' };

const results = [];
const assert = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
const found = (item) => ({ status: true, response: { items: [item] } });

// routes: url -> { ok: body } | { fail: xhr }; unrouted calls answer { status: true }.
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
      calls.push({ url: opts.url, data: opts.data ? JSON.parse(opts.data) : null });
      const r = routes[opts.url] || { ok: { status: true } };
      return r.fail ? Promise.reject(r.fail) : Promise.resolve(r.ok);
    },
  });
  window.eval(sdk);
  window.shazamme._sid = SID;
  return { window, calls };
};

// --- Baked site: full v2 row loaded from the baked origin, cached ---
{
  const { window, calls } = load({ [V2]: { ok: found(ROW) } }, { baked: BAKED });
  const s = await window.shazamme.site();
  const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');

  assert(`version is ${VERSION}`, window.shazamme._v === VERSION);
  assert('baked site carries dudaSiteID', s.dudaSiteID === SID);
  assert('baked site carries isLive and seekHirerID', s.isLive === true && s.seekHirerID === 'hirer-1');
  assert('baked site keeps the baked origin', s.ApiUrl === V2_ORIGIN && s.ActionUrl === V2_ACTIONS);
  assert('row is asked of v2 with the Duda id', calls.length === 1 && calls[0].url === V2 && calls[0].data.dudaSiteID === SID);
  assert('full row cached', cached?.site?.siteID === V2_ID && cached.site.isLive === true);
}

// --- Fresh cache for the same baked site: no request ---
{
  const site = { ...ROW, ApiUrl: V2_ORIGIN };
  const { window, calls } = load({}, { baked: BAKED, storage: { [CACHE_KEY]: { site, t: Date.now() } } });
  const s = await window.shazamme.site();
  assert('cached baked site resolves with no request', s.isLive === true && calls.length === 0);
}

// --- Cache for another siteID or stale: ignored ---
{
  const site = { siteID: 'other', ApiUrl: V2_ORIGIN };
  const { window, calls } = load({ [V2]: { ok: found(ROW) } }, { baked: BAKED, storage: { [CACHE_KEY]: { site, t: Date.now() } } });
  const s = await window.shazamme.site();
  assert('cache for another siteID is ignored', s.siteID === V2_ID && calls.length === 1);
}
{
  const site = { ...ROW, ApiUrl: V2_ORIGIN };
  const { calls, window } = load({ [V2]: { ok: found(ROW) } }, { baked: BAKED, storage: { [CACHE_KEY]: { site, t: Date.now() - 2 * 3600000 } } });
  await window.shazamme.site();
  assert('stale baked cache is re-fetched', calls.length === 1);
}

// --- v2 fails, or answers for another site: baked site + Duda id, nothing cached ---
for (const [name, route] of [
  ['timeout', { fail: { status: 0, statusText: 'timeout' } }],
  ['empty answer', { ok: { status: true, response: { items: [] } } }],
  ['row for another site', { ok: found({ ...ROW, siteID: 'someone-else' }) }],
]) {
  const { window, calls } = load({ [V2]: route }, { baked: BAKED });
  const s = await window.shazamme.site();
  assert(`v2 ${name}: baked siteID + origin kept`, s.siteID === V2_ID && s.ApiUrl === V2_ORIGIN);
  assert(`v2 ${name}: dudaSiteID still set`, s.dudaSiteID === SID);
  assert(`v2 ${name}: never asks Vinyl`, !calls.some((c) => c.url === VINYL));
  assert(`v2 ${name}: nothing cached`, window.localStorage.getItem(CACHE_KEY) === null);
}

// --- While the row loads, synchronous readers see the baked origin ---
{
  const { window } = load({}, { baked: BAKED });
  window.$.ajax = () => new Promise(() => {});
  window.shazamme.site();
  assert('pending baked site is already on the v2 origin', window.shazamme._site?.ActionUrl === V2_ACTIONS);
}

// --- v2 site: submit adds dudaSiteID when the widget sent none ---
{
  const { window, calls } = load({ [V2]: { ok: found(ROW) } }, { baked: BAKED });
  await window.shazamme.submit({ action: 'Get Saved Jobs', candidateID: 'c1' }, false);
  const post = calls.find((c) => c.data?.action === 'Get Saved Jobs');
  assert('v2 Get Saved Jobs posts dudaSiteID to the v2 backend', post?.url === V2_ACTIONS && post.data.dudaSiteID === SID);

  await window.shazamme.submit({ action: 'Register Candidate', dudaSiteID: 'kept' });
  const reg = calls.find((c) => c.data?.action === 'Register Candidate');
  assert('a dudaSiteID the widget sent is not overwritten', reg?.data.dudaSiteID === 'kept');
}

// --- Vinyl site: payload and hosts untouched ---
{
  const { window, calls } = load({ [VINYL]: { ok: found({ siteID: 'vinyl-site', isLive: true }) } });
  await window.shazamme.submit({ action: 'Get Saved Jobs', candidateID: 'c1' }, false);
  const post = calls.find((c) => c.data?.action === 'Get Saved Jobs');
  assert('Vinyl site posts to shazamme.io', post?.url === VINYL_ACTIONS);
  assert('Vinyl payload gets no dudaSiteID added', post && !('dudaSiteID' in post.data));
  assert('Vinyl site never asks v2', !calls.some((c) => c.url.startsWith(V2_ORIGIN)));

  const client = await window.shazamme.client();
  await client.submit({ action: 'x' });
  assert('Vinyl live client() still uses shazamme.io', calls.at(-1).url === 'https://shazamme.io/Job-Listing/src/php/client/actions');
}

// --- v2 site: client() uses the v2 backend, not staging ---
{
  const { window, calls } = load({ [V2]: { ok: found(ROW) } }, { baked: BAKED });
  const client = await window.shazamme.client();
  await client.submit({ action: 'x' });
  assert('v2 client() posts to api.shazamme.com', calls.at(-1).url === `${V2_ORIGIN}/Job-Listing/src/php/client/actions`);
}

// --- Baked site on another v2 host (dev): still treated as v2 ---
{
  const DEV = 'https://api-dev-au.shazamme.com';
  const { window, calls } = load({}, { baked: { siteID: V2_ID, apiUrl: DEV } });
  await window.shazamme.submit({ action: 'Get Saved Jobs', candidateID: 'c1' }, false);
  const post = calls.find((c) => c.data?.action === 'Get Saved Jobs');
  assert('dev v2 host posts dudaSiteID to its own origin', post?.url === `${DEV}/Job-Listing/src/php/actions` && post.data.dudaSiteID === SID);
  const client = await window.shazamme.client();
  await client.submit({ action: 'x' });
  assert('dev v2 client() uses its own origin', calls.at(-1).url === `${DEV}/Job-Listing/src/php/client/actions`);
}

// --- No-hang fallback to shazamme.io is not treated as v2 ---
{
  const { window, calls } = load({ [VINYL]: { ok: found({ siteID: 'staging-known', isLive: false }) } });
  const staging = 'https://staging.shazamme.io/Job-Listing/src/php/regional/actions';
  window.$.ajax = (opts) => {
    calls.push({ url: opts.url, data: opts.data ? JSON.parse(opts.data) : null });
    if (opts.url === VINYL) return Promise.resolve(found({ siteID: 'staging-known', isLive: false }));
    if (opts.url === staging) return Promise.resolve(found({ siteID: 'staging-site' }));
    return Promise.resolve({ status: true });
  };
  await window.shazamme.submit({ action: 'Get Saved Jobs', candidateID: 'c1' }, false);
  const post = calls.find((c) => c.data?.action === 'Get Saved Jobs');
  assert('staging site payload gets no dudaSiteID added', post && !('dudaSiteID' in post.data));
}

// --- Cache written under another origin (e.g. by the no-baked v2Probe): ignored ---
{
  const site = { ...ROW, ApiUrl: 'https://api-dev-au.shazamme.com' };
  const { window, calls } = load({ [V2]: { ok: found(ROW) } }, { baked: BAKED, storage: { [CACHE_KEY]: { site, t: Date.now() } } });
  const s = await window.shazamme.site();
  assert('cache from another origin is ignored', s.ApiUrl === V2_ORIGIN && calls.length === 1);
}

// --- v2 row without dudaSiteID: the Duda id is kept ---
{
  const { dudaSiteID, ...noDuda } = ROW;
  const { window } = load({ [V2]: { ok: found(noDuda) } }, { baked: BAKED });
  const s = await window.shazamme.site();
  assert('row without dudaSiteID keeps the Duda id', s.dudaSiteID === SID && s.isLive === true);
}

// --- v2 request that never answers: site() still resolves to the baked site ---
{
  const { window } = load({}, { baked: BAKED });
  window.$.ajax = () => new Promise(() => {});
  const t0 = Date.now();
  const s = await window.shazamme.site();
  assert('hung v2 request resolves the baked site within ~3s', s.siteID === V2_ID && s.dudaSiteID === SID && Date.now() - t0 < 4000);
}

console.log(results.join('\n'));
if (results.some((r) => r.startsWith('FAIL'))) process.exit(1);
