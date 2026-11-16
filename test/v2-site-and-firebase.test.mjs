/*
 * v2 site resolution + Firebase auto-init test for the SDK (shazamme.js 1.1.7+).
 * Drives dist/sdk/shazamme-1.1.7.min.js in jsdom with stubbed $.ajax / script loading.
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';

const sdk = fs.readFileSync(new URL('../dist/sdk/shazamme-1.1.7.min.js', import.meta.url), 'utf8');

const V2 = 'https://api.shazamme.com/Job-Listing/src/php/regional/actions';
const VINYL = 'https://shazamme.io/Job-Listing/src/php/regional/actions';
const V2_ITEM = { siteID: 'f3bf9155-653d-4ed2-bb49-11a2ec28f3fd', isLive: true, dudaSiteID: 'e9d0a6c4' };
const VINYL_ITEM = { siteID: 'fa9667a7-869e-43b4-9343-6b54f82bfd8a', isLive: true, dudaSiteID: '7480c32f' };

const results = [];
const assert = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);

const fail = (status, body) => Promise.reject({ status, responseJSON: body, responseText: JSON.stringify(body) });
const ok = (items) => Promise.resolve({ status: true, response: { items } });

// routes: { [url]: () => promise }
const load = ({ routes = {}, storage = {}, pre = () => {}, html = '' } = {}) => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, {
    url: 'https://client.example/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const { window } = dom;
  global.window = window; global.document = window.document;

  Object.entries(storage).forEach(([k, v]) => window.localStorage.setItem(k, v));

  const calls = [];
  const scripts = [];
  window.$ = Object.assign(() => ({ on() {}, ready() {} }), {
    get: () => Promise.resolve({ config: {}, sites: {} }),
    ajax: (o) => {
      calls.push(o.url);
      const r = routes[o.url];
      return r ? r() : fail(404, { status: false });
    },
  });

  const realAppend = window.document.head.appendChild.bind(window.document.head);
  window.document.head.appendChild = (el) => {
    if (el.tagName !== 'SCRIPT') return realAppend(el);
    scripts.push(el.src);
    if (el.src.endsWith('firebase-app.js')) {
      const apps = [];
      window.firebase = {
        apps,
        initializeApp: (cfg) => { apps.push({ options: cfg }); },
        auth: Object.assign(() => ({ onAuthStateChanged() {} }), {}),
      };
    }
    setTimeout(() => el.onload && el.onload(), 0);
    return el;
  };

  pre(window);
  window.eval(sdk);
  return { window, calls, scripts };
};

const resolveSite = async (ctx, sid) => {
  ctx.window.shazamme._sid = sid;
  return ctx.window.shazamme.site();
};

// --- 1. v2-only site: resolved from v2, Vinyl never called, cached under v3 ---
{
  const ctx = load({ routes: { [V2]: () => ok([V2_ITEM]) } });
  const s = await resolveSite(ctx, 'e9d0a6c4');
  assert('v2 site resolves to the v2 siteID', s.siteID === V2_ITEM.siteID);
  assert('v2 site uses api.shazamme.com', s.ApiUrl === 'https://api.shazamme.com'
    && s.RegionalUrl === V2 && s.ActionUrl === 'https://api.shazamme.com/Job-Listing/src/php/actions');
  assert('v2 site never calls Vinyl', !ctx.calls.includes(VINYL));
  const c = JSON.parse(ctx.window.localStorage.getItem('shazamme:site:v3:e9d0a6c4'));
  assert('v2 answer cached under versioned key', c?.src === 'v2' && c.site.siteID === V2_ITEM.siteID && c.t > 0);
}

// --- 2. fresh v2 cache: zero network ---
{
  const entry = JSON.stringify({ src: 'v2', t: Date.now(), site: { ...V2_ITEM, ApiUrl: 'https://api.shazamme.com' } });
  const ctx = load({ storage: { 'shazamme:site:v3:e9d0a6c4': entry } });
  const s = await resolveSite(ctx, 'e9d0a6c4');
  assert('fresh v2 cache makes no request', ctx.calls.length === 0 && s.siteID === V2_ITEM.siteID);
}

// --- 3. expired v2 cache is ignored ---
{
  const entry = JSON.stringify({ src: 'v2', t: Date.now() - 2 * 3600000, site: { siteID: 'stale' } });
  const ctx = load({ routes: { [V2]: () => ok([V2_ITEM]) }, storage: { 'shazamme:site:v3:e9d0a6c4': entry } });
  const s = await resolveSite(ctx, 'e9d0a6c4');
  assert('expired cache re-asks v2', s.siteID === V2_ITEM.siteID && ctx.calls.includes(V2));
}

// --- 4. Vinyl-only site: v2 404, falls to Vinyl exactly as before, marker cached ---
{
  const ctx = load({ routes: { [V2]: () => fail(404, { status: false, response: 'Site not found' }), [VINYL]: () => ok([VINYL_ITEM]) } });
  const s = await resolveSite(ctx, '7480c32f');
  assert('Vinyl-only site resolves via Vinyl', s.siteID === VINYL_ITEM.siteID);
  assert('v2 asked first, then Vinyl', ctx.calls[0] === V2 && ctx.calls[1] === VINYL);
  assert('Vinyl site keeps the legacy documentUri', s.documentUri === 'https://shazamme.io/candidate-document/' && !s.ApiUrl);
  const c = JSON.parse(ctx.window.localStorage.getItem('shazamme:site:v3:7480c32f'));
  assert('Vinyl decision cached as a marker only', c?.src === 'vinyl' && !c.site);
}

// --- 5. Vinyl marker skips the v2 call ---
{
  const entry = JSON.stringify({ src: 'vinyl', t: Date.now() });
  const ctx = load({ routes: { [VINYL]: () => ok([VINYL_ITEM]) }, storage: { 'shazamme:site:v3:7480c32f': entry } });
  await resolveSite(ctx, '7480c32f');
  assert('Vinyl marker skips v2', !ctx.calls.includes(V2) && ctx.calls.includes(VINYL));
}

// --- 6. v2 outage (5xx) falls back to Vinyl and is NOT cached ---
{
  const ctx = load({ routes: { [V2]: () => fail(503, 'down'), [VINYL]: () => ok([VINYL_ITEM]) } });
  const s = await resolveSite(ctx, '7480c32f');
  assert('v2 5xx falls back to Vinyl', s.siteID === VINYL_ITEM.siteID);
  assert('v2 5xx is not cached', ctx.window.localStorage.getItem('shazamme:site:v3:7480c32f') === null);
}

// --- 7. old poisoned v2-key cache never applies ---
{
  const ctx = load({ routes: { [V2]: () => ok([V2_ITEM]) }, storage: { 'shazamme:site:v2:e9d0a6c4': JSON.stringify({ siteID: 'old-vinyl' }) } });
  const s = await resolveSite(ctx, 'e9d0a6c4');
  assert('legacy v2-key cache ignored', s.siteID === V2_ITEM.siteID);
}

// --- 8. window.__shazammeSite stays the highest-priority override ---
{
  const ctx = load({ pre: (w) => { w.__shazammeSite = { siteID: 'baked', apiUrl: 'https://x.example' }; } });
  const s = await resolveSite(ctx, 'e9d0a6c4');
  assert('__shazammeSite overrides everything, no network', s.siteID === 'baked' && ctx.calls.length === 0);
}

const siteWith = (extra) => ({ [V2]: () => ok([{ ...V2_ITEM, ...extra }]) });

// --- 9. Firebase: page already initialised -> untouched ---
{
  const ctx = load({ routes: siteWith({}), pre: (w) => { w.firebase = { apps: [{ options: { projectId: 'quinn-allan' } }], auth: () => ({}) }; } });
  ctx.window.shazamme._sid = 'e9d0a6c4';
  const ok1 = await ctx.window.shazamme._ensureFirebase();
  assert('existing Firebase app is never touched', ok1 === true && ctx.scripts.length === 0 && ctx.window.firebase.apps.length === 1);
}

// --- 10. Firebase: no app -> loads 8.6.1 app+auth, inits shared default ---
{
  const ctx = load({ routes: siteWith({}) });
  ctx.window.shazamme._sid = 'e9d0a6c4';
  const ok1 = await ctx.window.shazamme._ensureFirebase();
  assert('loads firebase-app then firebase-auth 8.6.1', ctx.scripts.join() ===
    'https://www.gstatic.com/firebasejs/8.6.1/firebase-app.js,https://www.gstatic.com/firebasejs/8.6.1/firebase-auth.js');
  const o = ctx.window.firebase.apps[0].options;
  assert('inits shazamme-2c292 by default', ok1 === true && o.projectId === 'shazamme-2c292' && o.appId === '1:978113186027:web:e6d188802029a4fa8fd6ae');
}

// --- 11. Firebase: window override beats site + default ---
{
  const ctx = load({ routes: siteWith({ dudaFirebaseScript: 'firebase.initializeApp({apiKey:"k",projectId:"site-proj"})' }),
    pre: (w) => { w.__shazammeFirebase = { apiKey: 'ov', projectId: 'override-proj' }; } });
  ctx.window.shazamme._sid = 'e9d0a6c4';
  await ctx.window.shazamme._ensureFirebase();
  assert('window.__shazammeFirebase wins', ctx.window.firebase.apps[0].options.projectId === 'override-proj');
}

// --- 12. Firebase: site dudaFirebaseScript parsed (no eval) ---
{
  const script = `const firebaseConfig = {\n apiKey: "AIzaX",\n authDomain: "p.firebaseapp.com",\n projectId: "site-proj",\n appId: "1:2:web:3"\n};`;
  const ctx = load({ routes: siteWith({ dudaFirebaseScript: script }) });
  ctx.window.shazamme._sid = 'e9d0a6c4';
  await ctx.window.shazamme._ensureFirebase();
  const o = ctx.window.firebase.apps[0].options;
  assert('site dudaFirebaseScript config used', o.projectId === 'site-proj' && o.apiKey === 'AIzaX' && o.appId === '1:2:web:3');
}

// --- 13. Firebase: site.firebaseConfig object used ---
{
  const ctx = load({ routes: siteWith({ firebaseConfig: { apiKey: 'a', projectId: 'cfg-proj' } }) });
  ctx.window.shazamme._sid = 'e9d0a6c4';
  await ctx.window.shazamme._ensureFirebase();
  assert('site.firebaseConfig used', ctx.window.firebase.apps[0].options.projectId === 'cfg-proj');
}

// --- 14. Firebase: opt-out flag and unparseable script -> default ---
{
  const off = load({ pre: (w) => { w.__shazammeNoFirebase = true; } });
  off.window.shazamme._sid = 'e9d0a6c4';
  const r = await off.window.shazamme._ensureFirebase();
  assert('__shazammeNoFirebase disables auto-init', r === false && off.scripts.length === 0);

  const bad = load({ routes: siteWith({ dudaFirebaseScript: '<script>nothing useful</script>' }) });
  bad.window.shazamme._sid = 'e9d0a6c4';
  await bad.window.shazamme._ensureFirebase();
  assert('unparseable script falls back to default', bad.window.firebase.apps[0].options.projectId === 'shazamme-2c292');
}

// --- 15. Firebase: body-end init that runs before DOMContentLoaded wins, no duplicate ---
{
  const ctx = load({ routes: siteWith({}), pre: (w) => {
    Object.defineProperty(w.document, 'readyState', { value: 'loading', configurable: true });
  } });
  ctx.window.shazamme._sid = 'e9d0a6c4';
  const p = ctx.window.shazamme._ensureFirebase();
  // page body-end script runs before DOMContentLoaded
  ctx.window.firebase = { apps: [{ options: { projectId: 'page-proj' } }], auth: () => ({}) };
  Object.defineProperty(ctx.window.document, 'readyState', { value: 'interactive', configurable: true });
  ctx.window.document.dispatchEvent(new ctx.window.Event('DOMContentLoaded'));
  await p;
  assert('page init before DOMContentLoaded is respected', ctx.window.firebase.apps.length === 1 && ctx.window.firebase.apps[0].options.projectId === 'page-proj' && ctx.scripts.length === 0);
}

console.log(results.join('\n'));
if (results.some(r => r.startsWith('FAIL'))) process.exit(1);
