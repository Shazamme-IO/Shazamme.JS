/**
 * Repro + regression harness for the screening-question re-render collapse bug.
 *
 * Bug (live on paxus.com.au/contact-form-test-2-0, plugin v1.0.2):
 *   A Radio parent question reveals a conditional child <select>. Selecting a value
 *   in that child fires the `change` handler, which does a full `container.empty()`
 *   rebuild via `_showQuestions()`. After the rebuild the parent radio loses its
 *   checked state and the child collapses back to its initial (blank) state — it
 *   looks like the widget "reloaded".
 *
 * This harness loads the REAL plugin.js into jsdom, wires the same closures the
 * browser uses (`_showQuestions` / `_recordAnswers` / `_restoreAnswers` / `_questionEl`),
 * drives the exact interaction, and asserts the state the user expects to survive.
 *
 * Run: `npm test`  (node test/screening-question.rerender.test.mjs)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import jqueryFactory from 'jquery';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Defaults to the hand-edited source; set PLUGIN_FILE to test a built/minified artifact.
const PLUGIN = process.env.PLUGIN_FILE
  ? join(process.cwd(), process.env.PLUGIN_FILE)
  : join(__dirname, '..', 'plugin', 'screening-question', 'plugin.js');

// --- tiny UUID-ish ids, some starting with a digit (faithful to real data) ---
const RADIO = 'a1111111-1111-1111-1111-111111111111';
const OPT_YES = '2b222222-2222-2222-2222-222222222222';
const OPT_NO = '3c333333-3333-3333-3333-333333333333';
const CHILD = 'd4444444-4444-4444-4444-444444444444';
const REG_A = '5e555555-5555-5555-5555-555555555555';
const REG_B = '6f666666-6666-6666-6666-666666666666';

function fixture(childType) {
  // page 0 == sortOrder < 100
  return [
    [
      {
        screeningQuestionID: RADIO,
        questionType: 'Radio',
        question: 'Are you eligible to work?',
        sortOrder: 10,
        isMandatory: false,
        options: [
          { screeningQuestionOptionsID: OPT_YES, option: 'Yes', sortOrder: 1 },
          { screeningQuestionOptionsID: OPT_NO, option: 'No', sortOrder: 2 },
        ],
      },
      {
        screeningQuestionID: CHILD,
        questionType: childType, // 'List' or 'Multiselect List'
        question: 'Which region?',
        parentQuestionID: RADIO,
        sortOrder: 11,
        isMandatory: false,
        options: [
          { screeningQuestionOptionsID: REG_A, option: 'Region A', parentOptionID: OPT_YES, sortOrder: 1 },
          { screeningQuestionOptionsID: REG_B, option: 'Region B', parentOptionID: OPT_YES, sortOrder: 2 },
        ],
      },
    ],
  ];
}

function makeEnv() {
  // Swallow jsdom's "Uncaught" noise — exceptions thrown inside DOM event
  // listeners are reported here (jsdom does not propagate them to dispatchEvent).
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  const dom = new JSDOM('<!doctype html><html><body><div id="mount"></div></body></html>', {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  const $ = jqueryFactory(window);
  window.$ = window.jQuery = $;

  // Emulate real-browser layout so jQuery ':visible' works (jsdom has no layout).
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

  const pending = () => new Promise(() => {}); // never resolves
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

  const src = readFileSync(PLUGIN, 'utf8');
  window.eval(src);

  return { window, $ };
}

function elByQid(container, $, qid) {
  return container.find(`[data-qid="${qid}"]`);
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

function runScenario(childType) {
  console.log(`\nScenario: Radio parent → ${childType} child`);
  const { window, $ } = makeEnv();
  const sq = window.shazamme.plugin.screeningQuestions;

  const container = $('<div data-rel="screening-fields"></div>');
  container.appendTo(window.document.getElementById('mount'));

  // Defining the closures on the (window) `this`; the returned promise never
  // resolves (shazamme.fetch is pending), so no background render interferes.
  sq({ log: () => {}, config: () => Promise.resolve({}) }, {
    container,
    config: {},
  });

  // Seed state the way _fetchQuestions would, then render page 0.
  window._pages = fixture(childType);
  window._answers = [];
  window._screeningTemplateID = 'tpl';
  window._maxPage = 0;
  window.pageNumber = 0;

  // Count re-renders to catch runaway re-entrancy (the multi-list trigger('change') loop).
  // NOTE: exceptions thrown here (inside a DOM event listener) are swallowed by jsdom,
  // so we record `runaway` on a flag the test reads after dispatch instead of relying
  // on the throw surfacing.
  let renderCount = 0;
  let runaway = false;
  const realShow = window._showQuestions;
  window._showQuestions = function (...args) {
    renderCount++;
    if (renderCount > 50) {
      runaway = true;
      throw new Error('runaway re-render (re-entrant _showQuestions)');
    }
    return realShow.apply(this, args);
  };

  window._showQuestions(0, false);

  // Step 1: baseline — radios present, child hidden.
  check('renders 2 parent radios', container.find('input[data-qtype=radio]').length === 2,
    `found ${container.find('input[data-qtype=radio]').length}`);
  check('child not revealed before answering parent',
    elByQid(container, $, CHILD).length === 0);

  // Step 2: user picks "Yes" (native click => proper radio group + change event).
  renderCount = 0;
  const yes = container.find(`input[data-qtype=radio][value="${OPT_YES}"]`).get(0);
  yes.click();

  check('child revealed after selecting Yes', elByQid(container, $, CHILD).length === 1,
    `child count ${elByQid(container, $, CHILD).length}`);
  check('parent radio still checked after reveal',
    container.find(`input[data-qtype=radio][value="${OPT_YES}"]`).is(':checked'));

  // Step 3: THE BUG — user selects a value in the child dropdown.
  renderCount = 0;
  runaway = false;
  const sel = elByQid(container, $, CHILD).get(0);
  sel.value = REG_A;
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));

  // Selecting a value in a leaf field must not trigger a full re-render at all
  // (a leaf can reveal nothing), and must never re-enter _showQuestions.
  check('no runaway re-render on child select', !runaway,
    `_showQuestions re-entered (${renderCount}+ times)`);
  check('child select does not force a full rebuild', renderCount === 0,
    `_showQuestions ran ${renderCount} time(s)`);

  // What the user expects to survive the interaction:
  check('parent radio STILL checked after child select',
    container.find(`input[data-qtype=radio][value="${OPT_YES}"]`).is(':checked'),
    'parent radio lost its checked state (collapse)');
  check('child dropdown STILL present after child select',
    elByQid(container, $, CHILD).length === 1,
    `child count ${elByQid(container, $, CHILD).length} (collapsed)`);
  check('child dropdown STILL holds chosen value',
    elByQid(container, $, CHILD).val() === REG_A,
    `child val ${JSON.stringify(elByQid(container, $, CHILD).val())}`);
  check('recorded answer for child survives',
    !!window._answers[CHILD] && JSON.stringify(window._answers[CHILD].answerUUID) === JSON.stringify([REG_A]),
    `answers[CHILD]=${JSON.stringify(window._answers[CHILD])}`);
  check('recorded answer for parent survives',
    !!window._answers[RADIO] && JSON.stringify(window._answers[RADIO].answerUUID) === JSON.stringify([OPT_YES]),
    `answers[RADIO]=${JSON.stringify(window._answers[RADIO])}`);
}

console.log('screening-question re-render / restore harness');
for (const childType of ['List', 'Multiselect List']) {
  try {
    runScenario(childType);
  } catch (err) {
    failures++;
    console.log(`  ✗ threw: ${err.message}`);
  }
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing assertion(s)`);
process.exit(failures === 0 ? 0 : 1);
