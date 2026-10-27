let C, NEWS = [];
const A = document.getElementById('app'), M = document.getElementById('modal'), P = () => window.StudyProgress;
const im = n => `img/${n}.webp`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function tile(x, cls = '') {
  const inner = `<img src="${im(x.img)}" alt=""><b>${esc(x.name)}</b>`;
  if (x.room) return `<a class="tile ${cls}" href="#${x.room}">${inner}</a>`;
  if (x.url) return `<a class="tile ${cls}" href="${x.url}" target="_blank" rel="noopener">${inner}</a>`;
  return `<div class="tile soon ${cls}"><span class="badge">Coming soon</span>${inner}</div>`;
}
function home() {
  A.innerHTML = `<h2>Pick a course</h2><div class="grid">${C.home.map(x => tile(x)).join('')}</div>
  <h2>Study links</h2><div class="row" style="--n:5">${C.links.map(x => tile(x, 'small')).join('')}</div>
  <h2 id="bottom">More</h2><div class="row" style="--n:4">${C.bottom.map(x => tile(x, 'small')).join('')}</div>`;
}
const back = (h, t) => `<div class="topbar"><a class="btn3d gold" href="${h}">⬅ Back</a><h2>${t}</h2></div>`;
function reviewCourseData(name) {
  const R = C.reviewCourses && C.reviewCourses.courses; return R ? R.find(c => c.name === name) : null;
}
function findLevel(name) {
  const L = C.levels.find(l => l.name === name); if (L) return L;
  const rc = reviewCourseData(name); return rc ? { name: rc.name, color: rc.color, reviewCourse: rc } : null;
}
function conversationLevels() {
  const rc = (C.reviewCourses && C.reviewCourses.courses || []).map(c => ({ name: c.name, color: c.color, reviewCourse: c }));
  return C.levels.concat(rc);
}
window.__studyFindLevel = findLevel;
window.__studyConversationLevels = conversationLevels;
function levelTile(l) {
  const short = l.reviewCourse ? 'Review' : l.name.split(' ').pop();
  return `<a class="tile ${l.color}" href="#path/${encodeURIComponent(l.name)}" style="min-height:150px;justify-content:center">
      <span class="lvl">${esc(short)}</span><b>${esc(l.name)}</b></a>`;
}
function levels() {
  const reviews = (C.reviewCourses && C.reviewCourses.courses || []).map(c => ({ name: c.name, color: c.color, reviewCourse: c }));
  A.innerHTML = back('#home', 'Pick your level') + `<div class="grid" style="grid-template-columns:repeat(3,1fr);margin-top:20px">${
    C.levels.map(l => levelTile(l)).join('')}</div>` +
    (reviews.length ? `<h2 style="margin-top:28px;text-align:center">Band review</h2><div class="grid" style="grid-template-columns:repeat(3,1fr);margin-top:12px">${reviews.map(l => levelTile(l)).join('')}</div>` : '');
}
function examUrl(L, u) {
  const X = C.exams; if (!X) return null; const b = X.books[L.name], t = X.tests[u]; if (!b || !t) return null;
  return (L.name.startsWith('Basic') ? X.base.basic : X.base.int) + '#/' + b + '/' + t;
}
// Per-unit deep link when the app supports it ({book} = level book id, {n} = unit number); else the app's index.
// {nn} = 2-digit unit; unitUrlInt = Int-level variant; alias = id rename; missing = no content yet (Coming soon).
function dayUrl(L, u, d) {
  const b = C.exams && C.exams.books[L.name], n = u.replace('Unit ', ''), id = `${b}_u${n}`;
  if (!d.unitUrl || !b) return d.url;
  if ((d.missing || []).includes(id)) return null;
  const t = (!L.name.startsWith('Basic') && d.unitUrlInt) || d.unitUrl, a = d.alias && d.alias[id];
  return (a ? t.replace('{book}_u{n}', a) : t).replace('{book}', b).replace('{nn}', n.padStart(2, '0')).replace('{n}', n);
}
// Song step (new id "<level>|<unit>|Song"; existing step ids unchanged). Song id from the baked catalog map.
function songStep(L, u) {
  const S = C.songs, b = C.exams && C.exams.books[L.name], n = u.replace('Unit ', '');
  const sid = b && (S.ids[`${b}_u${n}`] || S.ids[`${b}_u${n.padStart(2, '0')}`]);
  return { id: `${L.name}|${u}|Song`, unit: u, day: 'Song', label: 'Song', sub: 'Sing along', img: S.img, url: sid ? S.url.replace('{id}', encodeURIComponent(sid)) + `&return=${encodeURIComponent(location.origin + location.pathname + '#path/' + encodeURIComponent(L.name))}&step=${encodeURIComponent(`${L.name}|${u}|Song`)}` : null, song: true, kind: 'day' };
}
function reviewSongUrl(courseName, songId, stepId) {
  const base = C.songs && C.songs.url ? C.songs.url.replace('{id}', encodeURIComponent(songId)) : `https://mrjkorea.github.io/day2-words/songs/play.html?song=${encodeURIComponent(songId)}`;
  return base + `&return=${encodeURIComponent(location.origin + location.pathname + '#path/' + encodeURIComponent(courseName))}&step=${encodeURIComponent(stepId)}`;
}
function reviewSteps(L) {
  const rc = L.reviewCourse, out = [], cn = L.name;
  rc.units.forEach(u => {
    out.push({ id: `${cn}|${u.id}|`, unit: u.id, label: u.id, sub: u.subtitle, kind: 'unit' });
    u.songs.forEach((sid, i) => {
      const n = i + 1, day = `Song ${n}`, id = `${cn}|${u.id}|${day}`;
      out.push({ id, unit: u.id, day, label: 'Song', sub: `Sing along (${n}/6)`, img: C.songs.img, url: reviewSongUrl(cn, sid, id), song: true, kind: 'day' });
    });
    out.push({ id: `${cn}|${u.id}|Review Quiz`, unit: u.id, day: 'Review Quiz', label: 'Review Quiz', sub: 'Word climb mix', img: 'rocket', url: u.quizLive ? u.quiz : null, kind: 'review' });
    out.push({ id: `${cn}|${u.id}|Review Unit Test`, unit: u.id, day: 'Review Unit Test', label: 'Review Unit Test', sub: 'Day 5 mix', img: 'tests', url: u.testLive ? u.test : null, kind: 'exam' });
    out.push({ id: `${cn}|${u.id}|AI Chat`, unit: u.id, day: 'AI Chat', label: 'AI Chat', sub: 'Day 6 Talk', img: 'ai', url: u.chat, kind: 'day' });
  });
  return out;
}
function steps(L) {
  if (L.reviewCourse) return reviewSteps(L);
  const out = [];
  C.units.filter(u => u !== 'Final' || L.final).forEach(u => {
    if (!u.startsWith('Unit')) {
      const rv = (C.reviews && C.reviews[L.name] && C.reviews[L.name][u]) || null;
      out.push({ id: `${L.name}|${u}|Review`, unit: u, label: 'Review', sub: `Get ready for ${u}`, img: 'rocket', url: rv, kind: 'review' });
      return out.push({ id: `${L.name}|${u}|`, unit: u, label: u, sub: 'Big test (Day 5)', img: u === 'Final' ? 'toeic' : 'scores', url: examUrl(L, u), kind: 'exam' });
    }
    out.push({ id: `${L.name}|${u}|`, unit: u, label: u.replace('Unit ', 'Unit '), kind: 'unit' });
    C.days.forEach(d => {
      out.push({ id: `${L.name}|${u}|${d.day}`, unit: u, day: d.day, label: d.day, sub: d.label, img: d.img, url: dayUrl(L, u, d), kind: 'day' });
      if (C.songs && d.day === C.songs.after) out.push(songStep(L, u));
    });
  });
  return out;
}
// Only steps that have an app count. "Coming soon" steps never block and never count.
const counts = s => s.kind !== 'unit' && !!s.url;
window.__studyCounts = counts;
window.__studySteps = steps;
function curIndex(L, S) {
  const last = P().last();
  if (last && last.level === L.name) {
    const i = S.findIndex(s => s.unit === last.unit && (s.day || '') === (last.day || '') && (s.kind === 'review') === (last.day === 'Review'));
    if (i >= 0 && counts(S[i])) return i;
  }
  const i = S.findIndex(s => counts(s) && !P().isDone(s.id)); return i < 0 ? S.length - 1 : i;
}
function stepNodeLabel(s) {
  if (s.kind === 'day') return s.label + ' · ' + s.sub;
  if (s.kind === 'review') return (s.day === 'Review Quiz' ? 'Review Quiz' : 'Review') + ' · ' + s.unit;
  if (s.kind === 'exam' && s.day === 'Review Unit Test') return 'Review Unit Test · ' + s.unit;
  return s.label;
}
function pathMap(name) {
  const L = findLevel(name); if (!L) return levels();
  const S = steps(L), ci = curIndex(L, S), per = 7, W = 1290, dx = (W - 160) / (per - 1), dy = 175;
  const pos = S.map((s, i) => { const r = Math.floor(i / per), c = i % per, cc = r % 2 ? per - 1 - c : c;
    return [80 + cc * dx + (r % 2 ? -1 : 1) * 14 * Math.sin(c), 90 + r * dy + 18 * Math.sin(c * 1.3)]; });
  const H = pos[pos.length - 1][1] + 110;
  let d = `M${pos[0][0]},${pos[0][1]}`;
  for (let i = 1; i < pos.length; i++) { const [x0, y0] = pos[i - 1], [x, y] = pos[i];
    d += y0 === y || Math.abs(y - y0) < 60 ? ` Q${(x0 + x) / 2},${(y0 + y) / 2 - 25} ${x},${y}` : ` C${x0 + (x0 > W / 2 ? 120 : -120)},${y0} ${x + (x > W / 2 ? 120 : -120)},${y} ${x},${y}`; }
  const nodes = S.map((s, i) => {
    const done = s.kind === 'unit' ? S.filter(t => t.unit === s.unit && t.kind === 'day' && counts(t)).every(t => P().isDone(t.id)) : P().isDone(s.id);
    const st = (done ? ' done' : '') + (!s.url && s.kind !== 'unit' ? ' soonstep' : '') + (i === ci ? ' cur' : i > ci ? ' later' : '');
    const disc = s.kind === 'unit' ? `<div class="disc">${s.label.replace('Unit ', 'U')}</div>` : `<div class="disc"><img src="${im(s.img)}" alt=""></div>`;
    return `<button class="node ${s.kind}${st}" style="left:${pos[i][0]}px;top:${pos[i][1]}px" data-i="${i}">${disc}<span>${esc(stepNodeLabel(s))}</span></button>`;
  }).join('');
  A.innerHTML = back('#levels', `${L.name} · Conversation`) +
    `<div class="map ${L.color}" style="height:${H}px;width:${W + 60}px"><svg width="${W + 60}" height="${H}"><path d="${d}" fill="none" stroke="#fff8" stroke-width="34" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fde68a" stroke-width="20" stroke-linecap="round" stroke-dasharray="2 26"/></svg>${nodes}</div>`;
  if (window.TeacherCorner) { TeacherCorner.setLevel(L.name); TeacherCorner.setVisible(true); }
  A.querySelectorAll('.node').forEach(b => b.onclick = () => stepCard(L, S[+b.dataset.i]));
  const cur = A.querySelector('.node.cur'); if (cur && !window.__shot) cur.scrollIntoView({ block: 'center' });
}
function stepCard(L, s) {
  const place = { course: 'conversation', level: L.name, unit: s.unit, day: s.kind === 'review' && s.day !== 'Review Quiz' ? 'Review' : (s.day || '') };
  const title = s.kind === 'day' ? `${s.unit} · ${s.day}` : s.kind === 'review' ? `${s.day === 'Review Quiz' ? 'Review Quiz' : 'Review'} · ${s.unit}` : s.kind === 'exam' && s.day === 'Review Unit Test' ? `Review Unit Test · ${s.unit}` : s.label;
  const tchSkip = !s.url && s.kind !== 'unit' && window.TeacherCorner && TeacherCorner.isUnlocked();
  const open = s.url ? `<a class="btn3d go" id="go" href="${s.url}"${s.song ? '' : ' target="_blank" rel="noopener"'}>▶ Open</a>` : (tchSkip ? `<button type="button" class="btn3d purple" id="tch-skip">✔ Mark passed (skip)</button>` : `<span class="btn3d no">⏳ Coming soon</span>`);
  M.innerHTML = `<div class="card"><img src="${im(s.img || 'conversation')}" alt=""><h3>${esc(title)}</h3><p>${esc(s.sub || (s.kind === 'unit' ? 'Start here' : 'Big test'))}${!s.url && s.kind !== 'unit' ? ' · Coming soon. You can skip this for now.' : ''}</p>
    <div class="acts">${open}<button class="btn3d gold" id="cl">✖</button></div></div>`;
  P().setLast(place);
  const close = () => { M.innerHTML = ''; pathMap(L.name); };
  M.querySelector('#cl').onclick = close; M.onclick = e => { if (e.target === M) close(); };
  const go = M.querySelector('#go'); if (go) go.onclick = () => { setTimeout(close, 50); };
  const skip = M.querySelector('#tch-skip');
  if (skip) skip.onclick = () => { P().markDone(s.id).then(() => close()); };
}
// Teacher unlock UI: placement/teacher-corner.js (server PIN via study_teacher_check).
function conversation() {
  const l = P().last();
  if (!l || !l.level) return levels();
  levels();
  M.innerHTML = `<div class="card"><img src="${im('conversation')}" alt=""><h3>Continue where you stopped?</h3><p>${esc([l.level, l.unit, l.day].filter(Boolean).join(', '))}</p>
   <div class="acts"><button class="btn3d go" id="y">👍 Yes</button><button class="btn3d no" id="n">✋ No</button></div></div>`;
  M.querySelector('#y').onclick = () => { M.innerHTML = ''; location.hash = 'path/' + encodeURIComponent(l.level); };
  M.querySelector('#n').onclick = () => { M.innerHTML = ''; location.hash = 'levels'; };
}
function news(sel) {
  const v = NEWS.find(x => x.id === sel) || NEWS[0];
  if (!v) { A.innerHTML = back('#home', 'News') + '<p>No videos yet.</p>'; return; }
  const src = `https://www.youtube-nocookie.com/embed/${v.id}?cc_load_policy=1&cc_lang_pref=en&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  A.innerHTML = back('#home', 'News') + `<div class="news"><div class="vlist">${NEWS.map(x => `<button class="vitem${x.id === v.id ? ' sel' : ''}" data-id="${x.id}">
     <img src="https://i.ytimg.com/vi/${x.id}/mqdefault.jpg" alt=""><div><b>${esc(x.title)}</b><small>${x.date}</small></div></button>`).join('')}</div>
    <div class="stage"><iframe id="yt" src="${src}" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
     <div class="subs"><button class="btn3d sub on" data-cc="en">💬 English subtitles</button><button class="btn3d sub" data-cc="ko">💬 한국어 자막 (Korean)</button><button class="btn3d sub" data-cc="off">🚫 Subtitles off</button></div>
     <h3>${esc(v.title)}</h3><div class="acts"><button class="btn3d go" data-q="${C.news.wordQuiz + v.date}"><img src="${im('words')}" style="width:34px;vertical-align:middle"> Word Quiz</button>
     <button class="btn3d purple" data-q="${C.news.compQuiz + v.date}"><img src="${im('tests')}" style="width:34px;vertical-align:middle"> Comprehension Quiz</button></div><div id="qz"></div></div></div>`;
  subtitles();
  A.querySelectorAll('.vitem').forEach(b => b.onclick = () => { location.hash = 'news/' + b.dataset.id; });
  A.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { A.querySelector('#qz').innerHTML = `<iframe class="quiz" src="${b.dataset.q}" title="Quiz"></iframe>`; A.querySelector('#qz').scrollIntoView({ behavior: 'smooth' }); });
}
let YTP = null, ccWant = 'en';
function ytApi() {
  if (window.YT && YT.Player) return Promise.resolve();
  return new Promise(res => { const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
    if (!document.getElementById('ytapi')) { const s = document.createElement('script'); s.id = 'ytapi'; s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s); } });
}
function applyCC() {
  const p = YTP; if (!p || !p.setOption) return;
  try {
    if (ccWant === 'off') { p.unloadModule('captions'); p.unloadModule('cc'); return; }
    p.loadModule('captions');
    const tl = (p.getOption('captions', 'tracklist') || []);
    const en = tl.find(t => t.languageCode === 'en' && t.kind !== 'asr') || tl.find(t => (t.languageCode || '').startsWith('en')) || tl[0];
    const ko = tl.find(t => t.languageCode === 'ko');
    if (ccWant === 'ko') p.setOption('captions', 'track', ko || Object.assign({}, en || { languageCode: 'en' }, { translationLanguage: { languageCode: 'ko', languageName: 'Korean' } }));
    else p.setOption('captions', 'track', en || { languageCode: 'en' });
  } catch (e) { console.warn('captions', e); }
}
function subtitles() {
  const bs = A.querySelectorAll('[data-cc]');
  bs.forEach(b => { b.classList.toggle('on', b.dataset.cc === ccWant); b.onclick = () => { ccWant = b.dataset.cc; bs.forEach(x => x.classList.toggle('on', x === b)); applyCC(); [400, 1200, 2500].forEach(t => setTimeout(applyCC, t)); }; });
  ytApi().then(() => { YTP = new YT.Player('yt', { events: { onReady: applyCC, onStateChange: e => { if (e.data === 1) applyCC(); }, onApiChange: applyCC } }); });
}
function route() {
  M.innerHTML = '';
  if (window.TeacherCorner) TeacherCorner.setVisible(false);
  const [r, a, b] = location.hash.slice(1).split('/').map(decodeURIComponent);
  if (r === 'home' || r === '') return home();
  if (r === 'conversation') return conversation();
  if (r === 'levels') return levels();
  if (r === 'path') return pathMap(a);
  if (r === 'placement') return window.Placement ? Placement.route(A, C, a) : home();
  if (r === 'news') return news(a);
  if (r === 'scores') return window.MyScores ? MyScores.show(A, C, steps) : home();
  home(); scrollTo(0, 0);
}
function signinButton() {
  const b = document.getElementById('signin'), a = window.MRJ_AUTH || window.MRJSignin, who = a && a.student && a.student();
  b.textContent = who ? `👤 ${who}` : '👤 Sign in';
  b.onclick = () => {
    if (a && a.preview) { if (who) a.signOut(); else { const n = prompt('Preview sign-in (stub, no password). Your ID:'); if (n) a.signInStub(n); } P().load().then(() => { signinButton(); if (window.TeacherCorner) TeacherCorner.onSignInChange(); route(); }); }
    else if (a && who) { if (confirm('Sign out?')) { a.signOut && a.signOut(); location.reload(); } }
    else location.reload();   // live: the shared mrj-signin gate shows on load
  };
  if (window.TeacherCorner) TeacherCorner.onSignInChange();
}
document.addEventListener('mrj-auth-ready', () => { if (C) P().load().then(() => { signinButton(); if (window.TeacherCorner) TeacherCorner.onSignInChange(); route(); }); });
Promise.all([fetch('courses.json').then(r => r.json()), fetch('news.json').then(r => r.json()).catch(() => [])])
  .then(([c, n]) => { C = c; NEWS = n; window.__studyCourses = C; return P().load(); }).then(() => { signinButton(); route(); onhashchange = route; });
