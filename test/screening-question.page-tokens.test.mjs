/**
 * Page-token auto-fields for the screening-question plugin (v1.0.10).
 *
 * A Text / Text Block question whose defaultAnswer holds a `{{page.*}}` token is
 * rendered as a HIDDEN input pre-filled with the resolved value, so the answer
 * reaches the ATS (via the question's dynamic map) without the visitor seeing or
 * typing anything. Hidden (hide=true) questions never reach the browser -- the
 * questions feed filters them out and PHP fills their static default -- so a
 * page-dependent value can only ride on a visible question.
 *
 * Run: `node test/screening-question.page-tokens.test.mjs`
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import jqueryFactory from 'jquery';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN = process.env.PLUGIN_FILE
  ? join(process.cwd(), process.env.PLUGIN_FILE)
  : join(__dirname, '..', 'plugin', 'screening-question', 'plugin.js');

const PAGE_URL = 'https://www.example.com/employers/contractors?utm_source=linkedin&utm_campaign=cm#form';
const PAGE_TITLE = 'Hire Contractors | Example';

const Q_URL = 'a1111111-1111-1111-1111-111111111111';
const Q_HREF = 'b2222222-2222-2222-2222-222222222222';
const Q_TITLE = 'c3333333-3333-3333-3333-333333333333';
const Q_PLAIN = 'd4444444-4444-4444-4444-444444444444';
const Q_UNKNOWN = 'e5555555-5555-5555-5555-555555555555';
const Q_CAPPED = 'f6666666-6666-6666-6666-666666666666';
const Q_BLOCK = '17777777-7777-7777-7777-777777777777';

function fixture() {
  return [[
    { screeningQuestionID: Q_URL, questionType: 'Text', question: 'Page URL', sortOrder: 1, isMandatory: false, defaultAnswer: '{{page.url}}' },
    { screeningQuestionID: Q_HREF, questionType: 'Text', question: 'Full URL', sortOrder: 2, isMandatory: false, defaultAnswer: '{{ page.href }}' },
    { screeningQuestionID: Q_TITLE, questionType: 'Text', question: 'Page Title', sortOrder: 3, isMandatory: false, defaultAnswer: 'Title: {{page.title}}' },
    { screeningQuestionID: Q_PLAIN, questionType: 'Text', question: 'Job Title', sortOrder: 4, isMandatory: true, defaultAnswer: null },
    { screeningQuestionID: Q_UNKNOWN, questionType: 'Text', question: 'Odd default', sortOrder: 5, isMandatory: false, defaultAnswer: '{{something.else}}' },
    { screeningQuestionID: Q_CAPPED, questionType: 'Text', question: 'Capped URL', sortOrder: 6, isMandatory: false, defaultAnswer: '{{page.url}}', length: 20 },
    { screeningQuestionID: Q_BLOCK, questionType: 'Text Block', question: 'Source block', sortOrder: 7, isMandatory: false, defaultAnswer: '{{page.path}} on {{page.host}}' },
  ]];
}

function makeEnv() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  const dom = new JSDOM('<!doctype html><html><head><title></title></head><body><div id="mount"></div></body></html>', {
    url: PAGE_URL,
    referrer: 'https://www.google.com/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  window.document.title = PAGE_TITLE;
  const $ = jqueryFactory(window);
  window.$ = window.jQuery = $;

  const isShown = (el) => {
    let n = el;
    while (n && n.nodeType === 1) {
      const st = window.getComputedStyle(n);
      if (st && st.display === 'none') return false;
      if (n.hasAttribute && n.hasAttribute('hidden')) return false;
      n = n.parentNode;
    }
    return el.isConnected;
  };
  Object.defineProperties(window.HTMLElement.prototype, {
    offsetParent: { configurable: true, get() { return this.isConnected ? this.parentNode : null; } },
    offsetWidth: { configurable: true, get() { return isShown(this) ? 10 : 0; } },
    offsetHeight: { configurable: true, get() { return isShown(this) ? 10 : 0; } },
  });

  const pending = () => new Promise(() => {});
  const thenable = { then() { return thenable; } };
  window.alert = () => {};
  window.shazamme = {
    style: () => thenable,
    script: () => Promise.resolve(),
    gapi: () => ({ maps: () => ({ then() {} }) }),
    fetch: () => pending(),
    submit: () => Promise.resolve({}),
    site: () => Promise.resolve({ siteID: 'site' }),
    bag: () => undefined,
    pub: () => {},
    sub: () => 0,
    unsub: () => {},
    log: () => {},
    ex: () => {},
    unique: (v, i, a) => a.indexOf(v) === i,
  };

  window.eval(readFileSync(PLUGIN, 'utf8'));
  return { window, $ };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('screening-question page-token auto-fields');
try {
  const { window, $ } = makeEnv();
  const sq = window.shazamme.plugin.screeningQuestions;
  const container = $('<div data-rel="screening-fields"></div>');
  container.appendTo(window.document.getElementById('mount'));

  sq({ log: () => {}, config: () => Promise.resolve({}) }, { container, config: {} });

  window._pages = fixture();
  window._answers = [];
  window._screeningTemplateID = 'tpl';
  window._maxPage = 0;
  window.pageNumber = 0;

  window._showQuestions(0, false);

  const byQid = (qid) => container.find(`[data-qid="${qid}"]`);

  // {{page.url}} -> origin + path, no query, no hash (Bullhorn custom text caps at 100 chars).
  check('page.url question renders exactly one input', byQid(Q_URL).length === 1, `found ${byQid(Q_URL).length}`);
  check('page.url input is type=hidden', byQid(Q_URL).attr('type') === 'hidden', byQid(Q_URL).attr('type'));
  check('page.url input is not visible to the visitor', !byQid(Q_URL).is(':visible'));
  check('page.url has no label rendered', byQid(Q_URL).closest('[data-rel=auto-field]').find('label').length === 0);
  check('auto-field wrapper is display:none and not an .input-field-container (critical CSS forces display:block)',
    byQid(Q_URL).parent().is('[data-rel=auto-field]')
      && byQid(Q_URL).parent().css('display') === 'none'
      && !byQid(Q_URL).parent().hasClass('input-field-container'));
  check('page.url resolves to origin + path', byQid(Q_URL).val() === 'https://www.example.com/employers/contractors', byQid(Q_URL).val());

  // {{ page.href }} -> full URL incl. query + hash; whitespace inside braces tolerated.
  check('page.href resolves to the full URL', byQid(Q_HREF).val() === PAGE_URL, byQid(Q_HREF).val());

  // Tokens embedded in surrounding text.
  check('page.title resolves inside surrounding text', byQid(Q_TITLE).val() === `Title: ${PAGE_TITLE}`, byQid(Q_TITLE).val());

  // Plain questions are untouched.
  check('plain Text question still renders a visible text input', byQid(Q_PLAIN).attr('type') === 'text' && byQid(Q_PLAIN).is(':visible'));
  check('plain Text question keeps its label', byQid(Q_PLAIN).closest('.input-field-container').find('label').text().trim() === 'Job Title');

  // Unknown token families are NOT auto-fields: render as a normal visible question, untouched.
  check('unknown token renders a normal visible input', byQid(Q_UNKNOWN).attr('type') === 'text' && byQid(Q_UNKNOWN).is(':visible'));
  check('unknown token value is not pre-filled', (byQid(Q_UNKNOWN).val() || '') === '');

  // Question length caps the resolved value.
  check('question length caps the resolved value', byQid(Q_CAPPED).val() === 'https://www.example.', byQid(Q_CAPPED).val());

  // Text Block with tokens -> hidden too.
  check('Text Block with tokens renders hidden', byQid(Q_BLOCK).attr('type') === 'hidden');
  check('Text Block resolves path + host', byQid(Q_BLOCK).val() === '/employers/contractors on www.example.com', byQid(Q_BLOCK).val());

  // The recorded answer carries the resolved value as answerText.
  window._recordAnswers();
  check('recorded answer holds resolved page.url', window._answers[Q_URL]?.answerText === 'https://www.example.com/employers/contractors', JSON.stringify(window._answers[Q_URL]));
  check('recorded answer is a Text answer on the template', window._answers[Q_URL]?.screeningTemplateID === 'tpl');
  check('unknown-token question records no answer', window._answers[Q_UNKNOWN] === undefined);

  // Mandatory validation ignores auto-fields and still flags the empty mandatory question.
  // No site-config bag in this harness, so validate() falls back to window.alert.
  check('validate() flags the empty mandatory plain question only', (() => {
    // validate() alerts its field list, then _showQuestions alerts a generic line: keep both.
    const alerts = [];
    window.alert = (m) => { alerts.push(String(m)); };
    window._showQuestions(1, false);
    const msg = alerts.join('\n');
    return alerts.length > 0 && msg.includes('Job Title') && !msg.includes('Page URL');
  })());

  // Re-render keeps the auto-field (restore deletes non-visible answers; record re-reads the DOM).
  window._showQuestions(0, false);
  window._recordAnswers();
  check('auto-field survives a re-render', window._answers[Q_URL]?.answerText === 'https://www.example.com/employers/contractors');
} catch (err) {
  failures++;
  console.log(`  ✗ threw: ${err.stack || err.message}`);
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing assertion(s)`);
process.exit(failures === 0 ? 0 : 1);
