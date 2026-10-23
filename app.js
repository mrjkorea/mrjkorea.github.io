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
function levels() {
  A.innerHTML = back('#home', 'Pick your level') + `<div class="grid" style="grid-template-columns:repeat(3,1fr);margin-top:20px">${
    C.levels.map(l => `<a class="tile ${l.color}" href="#path/${encodeURIComponent(l.name)}" style="min-height:150px;justify-content:center">
      <span class="lvl">${l.name.split(' ').pop()}</span><b>${l.name}</b></a>`).join('')}</div>`;
}
function steps(L) {
  const out = [];
  C.units.filter(u => u !== 'Final' || L.final).forEach(u => {
    if (!u.startsWith('Unit')) return out.push({ id: `${L.name}|${u}|`, unit: u, label: u, img: u === 'Final' ? 'toeic' : 'scores', kind: 'exam' });
    out.push({ id: `${L.name}|${u}|`, unit: u, label: u.replace('Unit ', 'Unit '), kind: 'unit' });
    C.days.forEach(d => out.push({ id: `${L.name}|${u}|${d.day}`, unit: u, day: d.day, label: d.day, sub: d.label, img: d.img, url: d.url, kind: 'day' }));
  });
  return out;
}
function curIndex(L, S) {
  const last = P().last();
  if (last && last.level === L.name) { const i = S.findIndex(s => s.unit === last.unit && (s.day || '') === (last.day || '')); if (i >= 0) return i; }
  const i = S.findIndex(s => s.kind !== 'unit' && !P().isDone(s.id)); return i < 0 ? S.length - 1 : i;
}
function pathMap(name) {
  const L = C.levels.find(l => l.name === name); if (!L) return levels();
  const S = steps(L), ci = curIndex(L, S), per = 7, W = 1290, dx = (W - 160) / (per - 1), dy = 175;
  const pos = S.map((s, i) => { const r = Math.floor(i / per), c = i % per, cc = r % 2 ? per - 1 - c : c;
    return [80 + cc * dx + (r % 2 ? -1 : 1) * 14 * Math.sin(c), 90 + r * dy + 18 * Math.sin(c * 1.3)]; });
  const H = pos[pos.length - 1][1] + 110;
  let d = `M${pos[0][0]},${pos[0][1]}`;
  for (let i = 1; i < pos.length; i++) { const [x0, y0] = pos[i - 1], [x, y] = pos[i];
    d += y0 === y || Math.abs(y - y0) < 60 ? ` Q${(x0 + x) / 2},${(y0 + y) / 2 - 25} ${x},${y}` : ` C${x0 + (x0 > W / 2 ? 120 : -120)},${y0} ${x + (x > W / 2 ? 120 : -120)},${y} ${x},${y}`; }
  const nodes = S.map((s, i) => {
    const done = s.kind === 'unit' ? S.filter(t => t.unit === s.unit && t.kind === 'day').every(t => P().isDone(t.id)) : P().isDone(s.id);
    const st = (done ? ' done' : '') + (i === ci ? ' cur' : i > ci ? ' later' : '');
    const disc = s.kind === 'unit' ? `<div class="disc">${s.label.replace('Unit ', 'U')}</div>` : `<div class="disc"><img src="${im(s.img)}" alt=""></div>`;
    return `<button class="node ${s.kind}${st}" style="left:${pos[i][0]}px;top:${pos[i][1]}px" data-i="${i}">${disc}<span>${esc(s.kind === 'day' ? s.label + ' · ' + s.sub : s.label)}</span></button>`;
  }).join('');
  A.innerHTML = back('#levels', `${L.name} · Conversation`) +
    `<div class="map ${L.color}" style="height:${H}px;width:${W + 60}px"><svg width="${W + 60}" height="${H}"><path d="${d}" fill="none" stroke="#fff8" stroke-width="34" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fde68a" stroke-width="20" stroke-linecap="round" stroke-dasharray="2 26"/></svg>${nodes}</div>`;
  A.querySelectorAll('.node').forEach(b => b.onclick = () => stepCard(L, S[+b.dataset.i]));
  const cur = A.querySelector('.node.cur'); if (cur && !window.__shot) cur.scrollIntoView({ block: 'center' });
}
function stepCard(L, s) {
  const place = { course: 'conversation', level: L.name, unit: s.unit, day: s.day || '' };
  const title = s.kind === 'day' ? `${s.unit} · ${s.day}` : s.label;
  const open = s.url ? `<a class="btn3d go" id="go" href="${s.url}" target="_blank" rel="noopener">▶ Open</a>` : `<span class="btn3d no">⏳ Coming soon</span>`;
  M.innerHTML = `<div class="card"><img src="${im(s.img || 'conversation')}" alt=""><h3>${esc(title)}</h3><p>${esc(s.sub || (s.kind === 'unit' ? 'Start here' : 'Big test'))}</p>
    <div class="acts">${open}${s.kind !== 'unit' ? `<button class="btn3d purple" id="md">✔ Mark done</button>` : ''}<button class="btn3d gold" id="cl">✖</button></div></div>`;
  P().setLast(place);
  const close = () => { M.innerHTML = ''; pathMap(L.name); };
  M.querySelector('#cl').onclick = close; M.onclick = e => { if (e.target === M) close(); };
  const go = M.querySelector('#go'); if (go) go.onclick = () => { P().markDone(s.id); setTimeout(close, 50); };
  const md = M.querySelector('#md'); if (md) md.onclick = () => { P().markDone(s.id); close(); };
}
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
  const [r, a] = location.hash.slice(1).split('/').map(decodeURIComponent);
  if (r === 'conversation') return conversation();
  if (r === 'levels') return levels();
  if (r === 'path') return pathMap(a);
  if (r === 'news') return news(a);
  home(); scrollTo(0, 0);
}
function signinButton() {
  const b = document.getElementById('signin'), a = window.MRJ_AUTH || window.MRJSignin, who = a && a.student && a.student();
  b.textContent = who ? `👤 ${who}` : '👤 Sign in';
  b.onclick = () => {
    if (a && a.preview) { if (who) a.signOut(); else { const n = prompt('Preview sign-in (stub, no password). Your ID:'); if (n) a.signInStub(n); } P().load().then(() => { signinButton(); route(); }); }
    else if (a && who) { if (confirm('Sign out?')) { a.signOut && a.signOut(); location.reload(); } }
    else location.reload();   // live: the shared mrj-signin gate shows on load
  };
}
document.addEventListener('mrj-auth-ready', () => { if (C) P().load().then(() => { signinButton(); route(); }); });
Promise.all([fetch('courses.json').then(r => r.json()), fetch('news.json').then(r => r.json()).catch(() => [])])
  .then(([c, n]) => { C = c; NEWS = n; return P().load(); }).then(() => { signinButton(); route(); onhashchange = route; });
