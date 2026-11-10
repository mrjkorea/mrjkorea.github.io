/* Offline check for placement scoring.
 * A finished part must build exactly one row for the shared score book, and the typing link must
 * build one completion row. Runs the real placement.js in a small fake page; no network.
 *
 *   node placement/test/scoring.mjs               build and check the rows, print them
 *   node placement/test/scoring.mjs --post <id>   also send them once, as student <id>
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ENDPOINT =
  'https://script.google.com/macros/s/AKfycbx677Fg8Q0GpH13Fcrw9aRqsKt7Eo5i29dZRh5goDbTM3KpyYfs6HMJiIMYRx3sjvVG4A/exec';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const stores = {};        // one localStorage per student, so a retake keeps its try number
function store(student) {
  const k = student || 'guest';
  return (stores[k] = stores[k] || new Map());
}

function makeWindow(student) {
  const posts = [];
  const notes = [];
  const mem = store(student);
  const W = {
    console,
    Promise,
    JSON,
    Date,
    Math,
    setTimeout,
    addEventListener() {},
    alert() {},
    localStorage: { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) },
    location: { hash: '#placement/grammar' },
    document: { getElementById: () => null },
    MRJ_AUTH: {
      student: () => student,
      token: () => 'offline-token',
      noteScore(n) { notes.push(n); },
    },
    StudyProgress: {
      _pl: {},
      getPlacement() { return this._pl; },
      setPlacementPart(k, v) { this._pl[k] = v; return Promise.resolve(v); },
    },
    fetch(url, opts) {
      if (opts && opts.method === 'POST') {
        posts.push(JSON.parse(opts.body));
        return Promise.resolve({ json: () => Promise.resolve({ ok: true, rows_written: 1 }) });
      }
      const file = path.join(root, String(url).replace(/^\.?\//, ''));
      return Promise.resolve({ json: () => Promise.resolve(JSON.parse(readFileSync(file, 'utf8'))) });
    },
  };
  W.window = W;
  const ctx = vm.createContext(W);
  for (const rel of ['placement/mrj-scores.js', 'placement/adaptive.js', 'placement/placement.js']) {
    vm.runInContext(readFileSync(path.join(root, rel), 'utf8'), ctx, { filename: rel });
  }
  return { W, posts, notes, ctx };
}

/* Minimal page node: stores html, hands back the choice buttons found in it.
 * The same button object comes back until the page is redrawn, so a handler placed on it survives. */
function page() {
  const els = {};
  let html = '';
  let buttons = null;
  return {
    get innerHTML() { return html; },
    set innerHTML(v) { if (v !== html) { html = v; buttons = null; } },
    querySelector(sel) {
      return (els[sel] = els[sel] || { onclick: null, textContent: '' });
    },
    querySelectorAll(sel) {
      if (sel !== '.pl-choice') return [];
      if (!buttons) buttons = [...html.matchAll(/data-i="(\d+)"/g)].map((m) => ({ dataset: { i: m[1] }, onclick: null }));
      return buttons;
    },
  };
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

async function takePart(student, partId, opts = {}) {
  const run = makeWindow(student);
  if (opts.preview) run.W.MRJ_AUTH.preview = true;
  const A = page();
  run.W.Placement.route(A, opts.courses || {}, partId);
  for (let i = 0; i < 300; i++) {
    await tick();
    if (/Your level/.test(A.innerHTML)) break;
    const buttons = A.querySelectorAll('.pl-choice');
    if (buttons.length) {
      buttons[0].onclick && buttons[0].onclick();
      continue;
    }
    if (A.innerHTML) await tick(5);       // bank is loading, or the result is drawing
  }
  if (opts.expectFinish !== false && !/Your level/.test(A.innerHTML)) throw new Error(partId + ': the quiz never finished');
  await tick(10);
  const band = (A.innerHTML.match(/pl-level">([^<]+)</) || [])[1] || '';
  return { posts: run.posts, notes: run.notes, band };
}

async function openTyping(student, opts = {}) {
  const run = makeWindow(student);
  if (opts.preview) run.W.MRJ_AUTH.preview = true;
  const A = page();
  run.W.Placement.route(A, { links: [{ name: 'Typing', url: 'https://www.typing.com/' }] }, 'typing');
  const btn = A.querySelector('#pl-type-open');
  btn.onclick && btn.onclick();
  await tick(10);
  return { posts: run.posts, notes: run.notes };
}

let fails = 0;
const check = (name, ok, extra) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''));
  if (!ok) fails++;
};

const student = 'zz_test_conv';

/* 1. A finished part builds one row for the book and one note for the index. */
const part = await takePart(student, 'reading');
const body = part.posts[0];
const ev = body && body.events && body.events[0];
console.log('built row: ' + JSON.stringify(ev));
check('one post for a finished part', part.posts.length === 1, 'posts=' + part.posts.length);
check('post carries one event', !!(body && body.events && body.events.length === 1));
check('student_email is the bare id_key', !!body && body.student_email === student, body && body.student_email);
check('curriculum_program placement', !!ev && ev.curriculum_program === 'placement', ev && ev.curriculum_program);
check('item_id is part plus band', !!ev && /^reading\|band-[1-6]$/.test(ev.item_id), ev && ev.item_id);
check('score_pct is a real percentage', !!ev && typeof ev.score_pct === 'number' && ev.score_pct >= 0 && ev.score_pct <= 100, ev && String(ev.score_pct));
check('score_value / score_max sent', !!ev && Number(ev.score_max) >= 10 && Number(ev.score_value) <= Number(ev.score_max), ev && ev.score_value + '/' + ev.score_max);
const meta = JSON.parse((ev && ev.metadata_json) || '{}');
check('metadata carries the decided level', !!meta.placementLevel && meta.placementLevel === part.band, meta.placementLevel + ' vs page ' + part.band);
check('metadata names the part', meta.part === 'reading', meta.part);
check('completed is true', !!ev && ev.completed === true);
check('noteScore so My Scores sees it', part.notes.length === 1, 'notes=' + part.notes.length);

/* 2. The typing link builds a completion row with no score. */
const typing = await openTyping(student);
const tev = typing.posts[0] && typing.posts[0].events[0];
check('typing posts one row', typing.posts.length === 1, 'posts=' + typing.posts.length);
check('typing item id', !!tev && tev.item_id === 'typing|opened', tev && tev.item_id);
check('typing row has no score', !!tev && tev.score_pct === '' && tev.score_max === '', tev && String(tev.score_pct));

/* 2b. A retake is try 2, not try 0. */
const retake1 = await takePart(student, 'grammar');
const retake2 = await takePart(student, 'grammar');
const a1 = retake1.posts[0] && retake1.posts[0].events[0].attempt_index;
const a2 = retake2.posts[0] && retake2.posts[0].events[0].attempt_index;
check('first try is attempt 1', a1 === 1, String(a1));
check('retake is attempt 2', a2 === 2, String(a2));
check('course and unit fill the sheet columns',
  !!retake1.posts[0] && retake1.posts[0].events[0].course_name === 'MRJ Placement' && retake1.posts[0].events[0].unit_id === 'placement|grammar',
  retake1.posts[0] && retake1.posts[0].events[0].unit_id);

/* 3. Signed out: nothing is posted. */
const out = await takePart('', 'grammar', { expectFinish: false });
check('signed out posts nothing', out.posts.length === 0, 'posts=' + out.posts.length);

/* 4. Local preview: nothing is posted. */
const prev = await takePart(student, 'phonics', { preview: true });
check('preview posts nothing', prev.posts.length === 0, 'posts=' + prev.posts.length);

/* 5. Every other part builds the same shape. */
for (const id of ['conversation', 'wordMaster', 'grammar', 'phonics']) {
  const r = await takePart(student, id);
  const e = r.posts[0] && r.posts[0].events[0];
  check(id + ' builds a row', !!e && e.item_id.startsWith(id + '|band-') && e.curriculum_program === 'placement', e && e.item_id);
}

const i = process.argv.indexOf('--post');
if (i > 0) {
  const id = process.argv[i + 1];
  for (const b of [part.posts[0], typing.posts[0]]) {
    b.student_email = id;
    b.student_name = id;
    b.session_id = 'placement-' + id + '-' + b.session_id.slice(-10);
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(b),
      redirect: 'follow',
    });
    console.log('posted ' + b.events[0].item_id + ' -> HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
  }
}

console.log(fails ? 'SCORING_FAIL ' + fails : 'SCORING_OK');
process.exit(fails ? 1 : 0);
