/*
 * OAuth first-time user test for the SDK (shazamme.js 1.1.7+).
 * A Google/Facebook user who has never registered gets no row back from
 * "Verify User". `_userRoles` used to read `.is` on that undefined result,
 * so `auth()` rejected with no handler, `site-auth` was never published and
 * the login/register widgets sat on a spinner. Asserts the empty result is
 * handled and the roles lookup still runs for a known user.
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';

const VERSION = process.env.SDK_VERSION || '1.1.7';
const sdk = fs.readFileSync(new URL(`../dist/sdk/shazamme-${VERSION}.min.js`, import.meta.url), 'utf8');

const results = [];
const assert = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);

const load = () => {
  const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
    url: 'https://client.example/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const { window } = dom;
  global.window = window; global.document = window.document;
  window.$ = Object.assign(() => ({ on() {}, ready() {} }), { get: () => Promise.resolve({ config: {} }) });
  window.eval(sdk);
  return window;
};

// --- _userRoles with no verified user resolves instead of throwing ---
{
  const window = load();
  let rejected = null;
  const r = await window.shazamme._userRoles(undefined).catch((e) => { rejected = e; return null; });

  assert(`version is ${VERSION}`, window.shazamme._v === VERSION);
  assert('_userRoles(undefined) does not reject', rejected === null);
  assert('_userRoles(undefined) resolves to an array', Array.isArray(r));
}

// --- auth() for an unknown OAuth user resolves to undefined (first-time flow) ---
{
  const window = load();
  const submitted = [];
  window.shazamme.site = () => Promise.resolve({ siteID: 'site-1' });
  window.shazamme.submit = (d) => { submitted.push(d.action); return Promise.resolve({ status: false, response: { items: [] } }); };

  let rejected = null;
  const s = await window.shazamme.auth('new.user@example.com', 'uid-new', true).catch((e) => { rejected = e; return 'REJECTED'; });

  assert('auth() for unknown user does not reject', rejected === null);
  assert('auth() for unknown user resolves to no session', s === undefined);
  assert('auth() asked the backend to verify the user', submitted[0] === 'Verify User');
  assert('no role lookups ran for an unknown user', !submitted.includes('Login Candidate') && !submitted.includes('Get Clients'));
}

// --- a Verify User reply without an items array is a failed lookup: reject, keep the stored session ---
{
  const window = load();
  const stored = { email: 'known@example.com', firebaseUserID: 'uid-known', isOAuth: false };
  window.localStorage.setItem('_s', window.btoa(unescape(encodeURIComponent(JSON.stringify(stored)))));
  window.shazamme._session = { ...stored };
  window.shazamme.site = () => Promise.resolve({ siteID: 'site-1' });
  window.shazamme.submit = () => Promise.resolve({ status: false, response: {} });

  let rejected = null;
  await window.shazamme.auth('known@example.com', 'uid-known', false).catch((e) => { rejected = e; });

  assert('auth() with no items array rejects', rejected !== null);
  assert('auth() with no items array keeps the in-memory session', window.shazamme._session && window.shazamme._session.email === 'known@example.com');
  assert('auth() with no items array keeps the stored session', window.localStorage.getItem('_s') !== null);
}

// --- a stored session that parses but has no email is cleared ---
{
  const window = load();
  window.localStorage.setItem('_s', window.btoa('{}'));
  let authCalled = false;
  window.shazamme.auth = () => { authCalled = true; return Promise.resolve(); };

  const u = await window.shazamme.user();

  assert('user() with an email-less stored session resolves to no session', u === undefined && !authCalled);
  assert('user() clears the email-less stored session', window.localStorage.getItem('_s') === null);
}

// --- auth() keeps a first-time OAuth session for the same email across a re-check ---
{
  const window = load();
  window.shazamme.site = () => Promise.resolve({ siteID: 'site-1' });
  window.shazamme.submit = () => Promise.resolve({ status: false, response: { items: [] } });
  window.shazamme._session = { isOAuth: true, isNew: true, email: 'new.user@example.com', firebaseUserID: 'uid-new', firstName: 'New', lastName: 'User' };

  const s = await window.shazamme.auth('New.User@Example.com', 'uid-new', true);

  assert('re-check returns the pending first-time session (email compared case-insensitively)', s && s.isNew === true && s.firstName === 'New');
  assert('re-check keeps the pending session in memory', window.shazamme._session && window.shazamme._session.isNew === true);

  window.shazamme._session = { isOAuth: false, isNew: false, email: 'other@example.com', firebaseUserID: 'uid-other' };
  const t = await window.shazamme.auth('new.user@example.com', 'uid-new', true);

  assert('a different stored session is dropped when the lookup is empty', t === undefined && window.shazamme._session === undefined);

  window.shazamme._session = { isOAuth: true, isNew: true, email: 'new.user@example.com', firebaseUserID: 'uid-new', firstName: 'New' };
  const v = await window.shazamme.auth('new.user@example.com', 'uid-password', false);

  assert('a password login for the same email does not inherit the pending OAuth session', v === undefined && window.shazamme._session === undefined);

  window.shazamme._session = { isOAuth: true, isNew: true, email: 'seek.user@example.com', firstName: 'Seek', provider: 'seekProvider' };
  const w = await window.shazamme.auth('seek.user@example.com', 'uid-seek', true);

  assert('a Seek/LinkedIn pending session (no firebaseUserID) survives a re-check', w && w.firstName === 'Seek' && window.shazamme._session.isNew === true);
}

// --- user(true) returns a pending first-time OAuth session (nothing stored to refresh from) ---
{
  const window = load();
  window.shazamme._session = { isOAuth: true, isNew: true, email: 'new.user@example.com', firebaseUserID: 'uid-new', firstName: 'New', lastName: 'User' };
  let authCalled = false;
  window.shazamme.auth = () => { authCalled = true; return Promise.resolve(); };

  const u = await window.shazamme.user(true);

  assert('user(true) returns the pending first-time session', u && u.isNew === true && u.firstName === 'New');
  assert('user(true) does not call auth() without a stored session', !authCalled);
}

// --- user() with the corrupt "undefined" session that 1.1.6 stored resolves and clears it ---
{
  const window = load();
  window.localStorage.setItem('_s', window.btoa('undefined'));
  let authCalled = false;
  window.shazamme.auth = () => { authCalled = true; return Promise.resolve(); };

  let rejected = null;
  const u = await window.shazamme.user().catch((e) => { rejected = e; return 'REJECTED'; });

  assert('user() with corrupt session does not reject', rejected === null);
  assert('user() with corrupt session resolves to no session', u === undefined);
  assert('user() with corrupt session does not call auth()', !authCalled);
  assert('user() clears the corrupt session', window.localStorage.getItem('_s') === null);
}

// --- user() with a stored session still re-verifies it ---
{
  const window = load();
  const stored = { email: 'known@example.com', firebaseUserID: 'uid-known', isOAuth: true };
  window.localStorage.setItem('_s', window.btoa(unescape(encodeURIComponent(JSON.stringify(stored)))));
  const calls = [];
  window.shazamme.auth = (...a) => { calls.push(a); return Promise.resolve({ ...stored }); };

  const u = await window.shazamme.user();

  assert('user() with stored session calls auth(email, uid, isOAuth)', calls.length === 1 && calls[0][0] === 'known@example.com' && calls[0][1] === 'uid-known' && calls[0][2] === true);
  assert('user() with stored session returns it', u && u.email === 'known@example.com');
}

// --- _userRoles for a known candidate still runs the candidate lookup ---
{
  const window = load();
  const submitted = [];
  window.shazamme.submit = (d) => { submitted.push(d.action); return Promise.resolve({ response: { items: [{ candidateID: 'c1' }] } }); };

  const r = await window.shazamme._userRoles({ is: ['candidate'], siteID: 'site-1', email: 'a@b.c', firebaseUserID: 'uid' });

  assert('known candidate runs Login Candidate', submitted.includes('Login Candidate'));
  assert('known candidate returns the candidate', r.some((x) => x && x.candidate && x.candidate.candidateID === 'c1'));
}

console.log(results.join('\n'));
const ok = results.every((r) => r.startsWith('PASS'));
console.log(ok ? '\nPASS — 0 failing assertion(s)' : '\nHAS FAILURES');
process.exit(ok ? 0 : 1);
