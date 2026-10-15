/*
 * Per-site page-config allowlist test for the SDK (shazamme.js 1.1.6+).
 * Every Duda site used to request js/site/<sid>/shazamme.json and
 * js/site/<sid>/<page>/shazamme.json, which 404 on all but a handful of sites.
 * Asserts the SDK only requests them for sites listed in the global config's
 * `sites` map, still merges a listed site's config, and fetches the global
 * config once.
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';

const sdk = fs.readFileSync(new URL('../dist/sdk/shazamme-1.1.6.min.js', import.meta.url), 'utf8');
const BASE = 'https://sdk.shazamme.io/js/site';

const results = [];
const assert = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);

const load = (globalJson, files, getImpl) => {
  const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
    url: 'https://client.example/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const { window } = dom;
  global.window = window; global.document = window.document;

  const gets = [];
  const fetched = [];
  window.$ = Object.assign(() => ({ on() {}, ready() {} }), {
    get: (url) => { gets.push(url); return getImpl ? getImpl() : Promise.resolve(globalJson); },
  });
  window.fetch = (url) => {
    fetched.push(url);
    const body = files[url];
    return Promise.resolve({ ok: !!body, status: body ? 200 : 404, json: () => Promise.resolve(body) });
  };

  window.eval(sdk);
  return { window, gets, fetched };
};

// --- Unlisted site: no per-site or per-page request at all ---
{
  const { window, gets, fetched } = load({ sites: { '7480c32f': [] }, config: {} }, {});
  const c = await window.shazamme._pageConfig('aaaa1111', 'home');

  assert('version is 1.1.6', window.shazamme._v === '1.1.6');
  assert('unlisted site makes no per-site request', fetched.length === 0);
  assert('unlisted site resolves empty config', c && Object.keys(c).length === 0);
  assert('global config fetched once', gets.length === 1 && gets[0] === `${BASE}/shazamme.json`);
}

// --- Global config without a `sites` map: behaves as unlisted, no throw ---
{
  const { window, fetched } = load({ config: {} }, {});
  const c = await window.shazamme._pageConfig('aaaa1111', 'home');

  assert('missing sites map makes no request', fetched.length === 0);
  assert('missing sites map resolves empty config', c && Object.keys(c).length === 0);
}

// --- Listed site: site-level file fetched and merged, page file skipped ---
{
  const siteJson = { config: { 'job-apply': { fieldList: [{ fieldName: 'salutation' }] } } };
  const { window, gets, fetched } = load(
    { sites: { '7480c32f': [] }, config: {} },
    { [`${BASE}/7480c32f/shazamme.json`]: siteJson },
  );
  const c = await window.shazamme._pageConfig('7480c32f', 'home');
  await window.shazamme._pageConfig('7480c32f', 'jobs');

  assert('listed site fetches its site file', fetched.includes(`${BASE}/7480c32f/shazamme.json`));
  assert('listed site skips unlisted page file', !fetched.some((u) => u.endsWith('/home/shazamme.json')));
  assert('listed site config is merged', c?.['job-apply']?.[0]?.fieldList?.[0]?.fieldName === 'salutation');
  assert('global config still fetched once across pages', gets.length === 1);
}

// --- Listed page: page-level file fetched too ---
{
  const { window, fetched } = load({ sites: { '7480c32f': ['careers'] }, config: {} }, {});
  await window.shazamme._pageConfig('7480c32f', 'careers');

  assert('listed page fetches its page file', fetched.includes(`${BASE}/7480c32f/careers/shazamme.json`));
}

// --- Global config unreachable: no per-site requests, no throw ---
{
  const { window, fetched } = load(null, {}, () => Promise.reject(new Error('offline')));
  let threw = false;
  try { await window.shazamme._pageConfig('7480c32f', 'home'); } catch (e) { threw = true; }

  assert('global config failure does not throw', !threw);
  assert('global config failure makes no per-site request', fetched.length === 0);
  assert('global config failure is not cached', window.localStorage.getItem('shazamme:pageconfig:7480c32f_home') === null);
}

// --- Listed site whose file fails to load: not cached, so the next visit retries ---
{
  const { window } = load({ sites: { '7480c32f': [] }, config: {} }, {});
  await window.shazamme._pageConfig('7480c32f', 'home');

  assert('failed site file is not cached', window.localStorage.getItem('shazamme:pageconfig:7480c32f_home') === null);
}

// --- Successful lookups are cached ---
{
  const { window } = load(
    { sites: { '7480c32f': [] }, config: {} },
    { [`${BASE}/7480c32f/shazamme.json`]: { config: { 'job-apply': { a: 1 } } } },
  );
  await window.shazamme._pageConfig('7480c32f', 'home');
  await window.shazamme._pageConfig('aaaa1111', 'home');

  assert('listed site config is cached', JSON.parse(window.localStorage.getItem('shazamme:pageconfig:7480c32f_home'))?.['job-apply']?.[0]?.a === 1);
  assert('unlisted site empty result is cached', window.localStorage.getItem('shazamme:pageconfig:aaaa1111_home') === '{}');
}

console.log(results.join('\n'));
const ok = results.every((r) => r.startsWith('PASS'));
console.log(ok ? '\nPASS — 0 failing assertion(s)' : '\nHAS FAILURES');
process.exit(ok ? 0 : 1);
