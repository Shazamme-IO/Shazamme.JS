/*
 * Fleet-wide input-guard tests for the SDK (shazamme.js 1.1.3+).
 * Runs the actual deployed minified build against a jsdom DOM and asserts
 * the phone/mobile numeric filter and the email-format .invalid flag.
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';

const sdk = fs.readFileSync(new URL('../dist/sdk/shazamme-1.1.4.min.js', import.meta.url), 'utf8');

const dom = new JSDOM(`<!doctype html><html><body>
  <input id="phoneNumber" type="text" value="">
  <input id="mobile" type="telephone" value="">
  <input id="emailAddress" type="text" value="">
  <input name="candidate_phone" type="text" value="">
  <input id="firstName" type="text" value="">
</body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true });

const { window } = dom;
global.window = window; global.document = window.document;

window.eval(sdk);

const results = [];
const assert = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);

assert('window.shazamme registered', !!window.shazamme);
assert('version is 1.1.4', window.shazamme && window.shazamme._v === '1.1.4');
assert('input guard flag set', window.__shazInputGuards === true);

const type = (el, val) => { el.value = val; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
const blur = (el) => el.dispatchEvent(new window.Event('focusout', { bubbles: true }));
const $ = (id) => window.document.getElementById(id);
const byName = (n) => window.document.querySelector(`[name="${n}"]`);

type($('phoneNumber'), 'Test Test Test');
assert('phone strips letters (spaces kept, trims to empty)', $('phoneNumber').value.trim() === '');

type($('phoneNumber'), 'abcdef');
assert('phone with no spaces -> fully empty', $('phoneNumber').value === '');

type($('phoneNumber'), '+61 (438) 277-544 abc');
assert('phone keeps digits+formatting, drops letters', $('phoneNumber').value === '+61 (438) 277-544 ');

type($('mobile'), '04a3b8c277544');
assert('mobile (type=telephone) strips letters', $('mobile').value === '0438277544');

type(byName('candidate_phone'), 'abc123-456');
assert('name-based phone field strips letters', byName('candidate_phone').value === '123-456');

type($('firstName'), 'Test Test Test');
assert('firstName is NOT touched', $('firstName').value === 'Test Test Test');

$('emailAddress').value = 'notanemail'; blur($('emailAddress'));
assert('bad email flagged invalid', $('emailAddress').classList.contains('invalid'));

$('emailAddress').value = 'melzoeaimee@gmail.com'; blur($('emailAddress'));
assert('good email clears invalid', !$('emailAddress').classList.contains('invalid'));

$('emailAddress').value = '   '; blur($('emailAddress'));
assert('empty email not flagged', !$('emailAddress').classList.contains('invalid'));

console.log(results.join('\n'));
const ok = results.every(r => r.startsWith('PASS'));
console.log(ok ? '\nPASS — 0 failing assertion(s)' : '\nHAS FAILURES');
process.exit(ok ? 0 : 1);
