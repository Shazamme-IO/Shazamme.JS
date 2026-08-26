/*
 * Single-instance guard test for the SDK (shazamme.js 1.1.4+, Shazamme.JS#4).
 * Reproduces the platform bug: multiple sitewide widgets each getScript their
 * own pinned shazamme-*.min.js, so the bundle executes twice on one page.
 * Asserts the version-agnostic top guard makes the second execution a no-op:
 * no second instance, no re-run of side effects (input guards), no throw.
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';

const sdk = fs.readFileSync(new URL('../dist/sdk/shazamme-1.1.4.min.js', import.meta.url), 'utf8');

const makeDom = () => {
  const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  return dom.window;
};

const results = [];
const assert = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);

// --- Scenario 1: real double-load (two widgets execute the same bundle) ---
{
  const window = makeDom();
  global.window = window; global.document = window.document;

  window.eval(sdk);
  const instanceA = window.shazamme;
  assert('1st load registers window.shazamme', !!instanceA);
  assert('1st load version is 1.1.4', instanceA && instanceA._v === '1.1.4');
  assert('1st load sets __shazammeSDKLoaded', window.__shazammeSDKLoaded === '1.1.4');
  assert('1st load sets input guards', window.__shazInputGuards === true);

  let threw = false;
  try { window.eval(sdk); } catch (e) { threw = true; }
  assert('2nd load does not throw', !threw);
  assert('2nd load keeps the SAME instance (no re-init)', window.shazamme === instanceA);
  assert('2nd load leaves version at 1.1.4', window.shazamme._v === '1.1.4');
}

// --- Scenario 2: the guard specifically short-circuits BEFORE side effects ---
// Wipe the older per-version guards but keep the new top sentinel. If the top
// guard works, the second eval bails before line ~1891, so __shazInputGuards
// is NOT re-set to true. (Without the top guard, it would be re-set.)
{
  const window = makeDom();
  global.window = window; global.document = window.document;

  window.eval(sdk);
  assert('setup: input guards installed once', window.__shazInputGuards === true);

  delete window.__shazInputGuards;          // pretend side effects never ran
  delete window['shazamme-1.1.4'];          // wipe the legacy instance guard key
  // __shazammeSDKLoaded is intentionally LEFT set.

  let threw = false;
  try { window.eval(sdk); } catch (e) { threw = true; }
  assert('guarded 2nd load does not throw', !threw);
  assert('top guard bails BEFORE re-installing input guards',
    window.__shazInputGuards === undefined);
}

console.log(results.join('\n'));
const ok = results.every(r => r.startsWith('PASS'));
console.log(ok ? '\nPASS — 0 failing assertion(s)' : '\nHAS FAILURES');
process.exit(ok ? 0 : 1);
