/*
 * auth() must resolve (not reject) when Verify User finds no user for this site.
 * Before 1.1.5, _userRoles(undefined) threw on `s.is`, the whole chain rejected,
 * ready()'s onAuthStateChanged handler (no catch) never published the isNew
 * social session, and a stored session could be left as the string 'undefined'.
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';

const sdk = fs.readFileSync(new URL('../dist/sdk/shazamme-1.1.5.min.js', import.meta.url), 'utf8');

const results = [];
const assert = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);

const HIT = [{ clientUserID: 'cu-1', firebaseID: 'fb-uid-2', email: 'x@example.com', firstName: 'X', lastName: 'Y', is: ['candidate'], clientID: 'c1' }];

const boot = (verifyUser, loginCandidate = () => Promise.resolve({ response: { items: [{ candidateID: 'cand-1' }] } })) => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://clientsite.example/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  global.window = window; global.document = window.document; global.localStorage = window.localStorage;
  window.eval(sdk);
  const sz = window.shazamme;
  sz.site = () => Promise.resolve({ siteID: 'site-1', dudaSiteID: 'abc' });
  sz.submit = (d) => {
    if (d.action === 'Verify User') return Promise.resolve(verifyUser);
    if (d.action === 'Login Candidate') return loginCandidate();
    return Promise.resolve({ response: { items: [] } });
  };
  return { window, sz };
};

// --- 1: Verify User miss (social sign-in, no candidate yet) ---
{
  const { window, sz } = boot({ response: { items: [] } });
  sz._session = { isOAuth: true, isNew: true, email: 'seek@example.com' }; // e.g. SEEK/LinkedIn in-memory session while the register widget polls
  let outcome;
  try { outcome = { value: await sz.auth('cate@example.com', 'fb-uid-1', true) }; } catch (e) { outcome = { error: e }; }
  assert('miss: auth() resolves instead of rejecting', !('error' in outcome));
  assert('miss: auth() resolves undefined (no session)', outcome.value === undefined);
  assert('miss: nothing stored as "undefined"', window.localStorage.getItem('_s') === null);
  assert('miss: an existing in-memory session is left alone', sz._session?.email === 'seek@example.com');
}

// --- 2: Verify User without an items array ---
{
  const { sz } = boot({ response: {} });
  let threw = false;
  try { await sz.auth('cate@example.com', 'fb-uid-1', true); } catch { threw = true; }
  assert('no items array: auth() does not reject', !threw);
}

// --- 3: user() with a poisoned stored session must not throw, and drops it ---
{
  const { window, sz } = boot({ response: { items: [] } });
  window.localStorage._s = window.btoa('undefined');
  let threw = false; let value;
  try { value = await sz.user(); } catch { threw = true; }
  assert('poisoned _s: user() does not throw', !threw);
  assert('poisoned _s: user() resolves undefined', value === undefined);
  assert('poisoned _s: the unreadable key is removed', window.localStorage.getItem('_s') === null);
  assert('poisoned _s: currentUser() delegates to user()', (await sz.currentUser()) === undefined);
}

// --- 4: a found user still resolves the session (regression guard) ---
{
  const { window, sz } = boot({ response: { items: HIT } });
  const s = await sz.auth('x@example.com', 'fb-uid-2', false, true);
  assert('hit: auth() resolves a session', !!s);
  assert('hit: session carries the candidate', s?.candidate?.candidateID === 'cand-1');
  assert('hit: stored session written', typeof window.localStorage.getItem('_s') === 'string');
  assert('hit: user() returns the in-memory session', (await sz.user())?.email === 'x@example.com');
}

// --- 5: a transient Login Candidate failure no longer fails the whole auth ---
{
  const { sz } = boot({ response: { items: HIT } }, () => Promise.reject(new Error('network')));
  let s; let threw = false;
  try { s = await sz.auth('x@example.com', 'fb-uid-2', false, true); } catch { threw = true; }
  assert('login-candidate failure: auth() still resolves', !threw && !!s);
  assert('login-candidate failure: session has no candidate', s?.candidate === undefined);
}

console.log(results.join('\n'));
const ok = results.every(r => r.startsWith('PASS'));
console.log(ok ? '\nPASS — 0 failing assertion(s)' : '\nHAS FAILURES');
process.exit(ok ? 0 : 1);
