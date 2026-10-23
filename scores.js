/* MY SCORES: parent-friendly dashboard. Real data only, from the shared mrj-signin backend:
 *  - action "progress" (no program = every app) -> rows {program,item,score,date}, own token only
 *  - load_pack "study-site" (via StudyProgress) -> path steps done
 * Nothing is invented: no data -> friendly empty state. */
(function (g) {
  var NAMES = { 'study-site': 'Study World', 'day2-words': 'Day 2 Words', 'day3-workbook': 'Day 3 Activities', 'pronounce': 'Day 4 Speak',
    'day5-practice': 'Day 5 Tests', 'day6-talk': 'Day 6 Interview', 'word-master': 'Word Master', 'practice-tests': 'Practice Tests',
    'speakpass': 'TOEIC Speaking', 'decodable': 'Decodable Books', 'skill-builder-g1': 'Skill Builder' };
  var COLORS = ['#7c3aed', '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6', '#84cc16', '#f97316'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function appName(p) { return NAMES[p] || String(p || 'Other').replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function auth() { return g.MRJ_AUTH || g.MRJSignin || null; }
  // "8/10" -> raw+pct ; "80%" -> pct only ; anything else -> no score
  function parseScore(s) {
    s = String(s == null ? '' : s).trim(); var m;
    if ((m = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)) && +m[2] > 0) return { v: +m[1], max: +m[2], pct: Math.round(100 * m[1] / m[2]) };
    if ((m = s.match(/^(-?\d+(?:\.\d+)?)\s*%$/))) return { pct: Math.round(+m[1]) };
    return null;
  }
  function fmt(sc) { return !sc ? '—' : sc.max != null ? sc.v + ' / ' + sc.max + ' (' + sc.pct + '%)' : sc.pct + '%'; }
  function dayKey(d) { var s = String(d || ''); if (/^\d{4}-\d{2}-\d{2}/.test(s) && s.length <= 10) return s.slice(0, 10);
    var t = Date.parse(s); if (isNaN(t)) return s.slice(0, 10) || '';
    return new Date(t + 9 * 3600e3).toISOString().slice(0, 10); }               // KST day
  function kstToday() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
  function addDays(k, n) { var t = Date.parse(k + 'T00:00:00Z') + n * 864e5; return new Date(t).toISOString().slice(0, 10); }

  function fetchAll() {          // student's own rows across every app (same call shape the shared client uses)
    var a = auth(); if (!a || !a.student || !a.student() || !a.token) return Promise.resolve({ ok: false, error: 'signed_out', progress: [] });
    var all = [], off = 0, pages = 0;
    function page() {
      return fetch(a.ENDPOINT, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'progress', id: a.student(), token: a.token(), offset: off, limit: 500 }) })
        .then(function (r) { return r.text(); }).then(function (t) { return JSON.parse(t); })
        .then(function (d) {
          if (!d || !d.ok) return { ok: false, error: (d && d.error) || 'progress_load_failed', progress: all };
          var c = Array.isArray(d.progress) ? d.progress : []; all = all.concat(c); pages++;
          if (d.hasMore === true && c.length && pages < 40) { off += c.length; return page(); }
          return { ok: true, progress: all };
        });
    }
    return page().catch(function () { return { ok: false, error: 'network', progress: all }; });
  }

  function show(A, C, stepsOf) {
    var a = auth(), who = a && a.student && a.student();
    var head = '<div class="topbar"><a class="btn3d gold" href="#home">⬅ Back</a><h2>My scores</h2>' +
      (who ? '<span class="sc-who">👤 ' + esc(who) + '</span><button class="btn3d purple sc-print" onclick="window.print()">🖨 Print / save as PDF</button>' : '') + '</div>';
    if (!who) { A.innerHTML = head + '<div class="sc-empty"><img src="img/scores.webp" alt=""><h3>Sign in to see your scores</h3><p>Your scores are saved with your student ID.</p></div>'; return; }
    A.innerHTML = head + '<div class="sc-empty"><h3>Loading your scores…</h3></div>';
    Promise.all([fetchAll(), g.StudyProgress ? g.StudyProgress.load() : Promise.resolve(null)]).then(function (res) {
      if (location.hash.slice(1).split('/')[0] !== 'scores') return;
      render(A, C, stepsOf, head, res[0], (res[1] && res[1].done) || {});
    });
  }

  function render(A, C, stepsOf, head, pr, done) {
    var rows = (pr.progress || []).map(function (r) { return { app: String(r.program || ''), item: String(r.item || ''), raw: r.score, sc: parseScore(r.score), day: dayKey(r.date) }; });
    // path completion from study-site pack (only steps with an app count)
    var levels = C.levels.map(function (L) {
      var S = stepsOf(L).filter(function (s) { return s.kind !== 'unit' && s.url; });
      var d = S.filter(function (s) { return done[s.id]; }).length; return { L: L, total: S.length, done: d };
    });
    var started = levels.filter(function (x) { return x.done > 0; });
    var doneTs = Object.keys(done).map(function (k) { return dayKey(new Date(done[k]).toISOString()); });
    if (!rows.length && !started.length) {
      A.innerHTML = head + '<div class="sc-empty"><img src="img/rocket.webp" alt=""><h3>No scores yet — let\'s start!</h3><p>Finish an activity on your path and your scores will show up here.</p><a class="btn3d go" href="#conversation">▶ Start studying</a>' +
        (pr.ok ? '' : '<p class="sc-note">We could not load scores right now. Please try again later.</p>') + '</div>';
      return;
    }
    var scored = rows.filter(function (r) { return r.sc; });
    var ringSet = started.length ? started : [];
    var tDone = ringSet.reduce(function (n, x) { return n + x.done; }, 0), tAll = ringSet.reduce(function (n, x) { return n + x.total; }, 0);
    // days active
    var days = {}; rows.forEach(function (r) { if (r.day) days[r.day] = 1; }); doneTs.forEach(function (k) { days[k] = 1; });
    var today = kstToday(), dow = (new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7, mon = addDays(today, -dow), week = [];
    for (var i = 0; i < 7; i++) week.push(addDays(mon, i));
    var streak = 0, k = days[today] ? today : addDays(today, -1); while (days[k]) { streak++; k = addDays(k, -1); }
    // per app
    var apps = {}; rows.forEach(function (r) { var o = apps[r.app] = apps[r.app] || { n: 0, pcts: [] }; o.n++; if (r.sc) o.pcts.push(r.sc.pct); });
    var appKeys = Object.keys(apps).sort(function (x, y) { return apps[y].n - apps[x].n; });
    var avgKeys = appKeys.filter(function (x) { return apps[x].pcts.length; });
    var avg = function (x) { var p = apps[x].pcts; return Math.round(p.reduce(function (a, b) { return a + b; }, 0) / p.length); };
    var trend = scored.filter(function (r) { return r.day; }).slice().sort(function (x, y) { return x.day < y.day ? -1 : x.day > y.day ? 1 : 0; }).slice(-30);
    var best = scored.slice().sort(function (x, y) { return y.sc.pct - x.sc.pct || (y.sc.max || 0) - (x.sc.max || 0); }).slice(0, 5);
    var recent = rows.slice().sort(function (x, y) { return x.day < y.day ? 1 : x.day > y.day ? -1 : 0; }).slice(0, 10);
    var overallAvg = scored.length ? Math.round(scored.reduce(function (n, r) { return n + r.sc.pct; }, 0) / scored.length) : null;
    var tbl = function (list) { return '<table class="sc-t"><tr><th>Date</th><th>App</th><th>Activity</th><th>Score</th></tr>' + list.map(function (r) {
      return '<tr><td>' + esc(r.day || '—') + '</td><td>' + esc(appName(r.app)) + '</td><td>' + esc(r.item || '—') + '</td><td><b>' + esc(r.sc ? fmt(r.sc) : (r.raw || '—')) + '</b></td></tr>'; }).join('') + '</table>'; };

    A.innerHTML = head + '<div class="sc">' +
      '<div class="sc-cards">' +
        card('📚', rows.length, 'activities done') + card('⭐', overallAvg == null ? '—' : overallAvg + '%', 'average score') +
        card('📅', week.filter(function (d) { return days[d]; }).length + ' / 7', 'days active this week') + card('🔥', streak, streak === 1 ? 'day in a row' : 'days in a row') +
      '</div>' +
      '<div class="sc-grid">' +
        '<section class="sc-box"><h3>Path completion</h3>' + (tAll ? '<div class="sc-ring"><canvas id="cRing"></canvas><div class="sc-mid"><b>' + Math.round(100 * tDone / tAll) + '%</b><span>' + tDone + ' / ' + tAll + ' steps</span></div></div>' : '<p class="sc-note">No path steps finished yet.</p>') +
          '<div class="sc-bars">' + started.map(function (x) { var p = Math.round(100 * x.done / x.total);
            return '<div class="sc-bar ' + x.L.color + '"><span>' + esc(x.L.name) + '</span><i><em style="width:' + p + '%"></em></i><b>' + x.done + ' / ' + x.total + ' (' + p + '%)</b></div>'; }).join('') + '</div></section>' +
        '<section class="sc-box"><h3>This week</h3><div class="sc-week">' + week.map(function (d, i) { return '<div class="' + (days[d] ? 'on' : '') + (d === today ? ' today' : '') + '"><b>' + 'MTWTFSS'[i] + '</b><span>' + (days[d] ? '✔' : '') + '</span></div>'; }).join('') + '</div>' +
          (appKeys.length ? '<h3>What I practiced</h3><div class="sc-donut"><canvas id="cDonut"></canvas></div>' : '') + '</section>' +
        (trend.length ? '<section class="sc-box wide"><h3>Score trend (%)</h3><div class="sc-cv"><canvas id="cTrend"></canvas></div></section>' : '') +
        (avgKeys.length ? '<section class="sc-box wide"><h3>Average score by app</h3><div class="sc-cv"><canvas id="cAvg"></canvas></div></section>' : '') +
        (best.length ? '<section class="sc-box"><h3>🏆 Best scores</h3>' + tbl(best) + '</section>' : '') +
        (recent.length ? '<section class="sc-box"><h3>Recent activity</h3>' + tbl(recent) + '</section>' : '') +
      '</div>' + (pr.ok ? '' : '<p class="sc-note">Some scores could not be loaded right now.</p>') + '</div>';

    if (!g.Chart) return;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.font.weight = 'bold'; Chart.defaults.color = '#1e293b';
    var anim = g.__shot ? false : undefined;
    if (tAll) new Chart(document.getElementById('cRing'), { type: 'doughnut', data: { labels: ['Done', 'To do'], datasets: [{ data: [tDone, tAll - tDone], backgroundColor: ['#22c55e', '#e2e8f0'], borderWidth: 0 }] },
      options: { cutout: '72%', animation: anim, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.label + ': ' + c.raw + ' / ' + tAll; } } } } } });
    if (appKeys.length) new Chart(document.getElementById('cDonut'), { type: 'doughnut', data: { labels: appKeys.map(appName), datasets: [{ data: appKeys.map(function (x) { return apps[x].n; }), backgroundColor: COLORS, borderWidth: 2 }] },
      options: { animation: anim, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: function (c) { return c.label + ': ' + c.raw + ' (' + Math.round(100 * c.raw / rows.length) + '%)'; } } } } } });
    if (trend.length) new Chart(document.getElementById('cTrend'), { type: 'line', data: { labels: trend.map(function (r) { return r.day.slice(5); }), datasets: [{ label: 'Score %', data: trend.map(function (r) { return r.sc.pct; }), borderColor: '#7c3aed', backgroundColor: '#7c3aed33', fill: true, tension: .3, pointRadius: 5, pointBackgroundColor: '#fbbf24' }] },
      options: { animation: anim, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, ticks: { callback: function (v) { return v + '%'; } } } }, plugins: { legend: { display: false },
        tooltip: { callbacks: { label: function (c) { var r = trend[c.dataIndex]; return appName(r.app) + ' · ' + (r.item || '') + ': ' + fmt(r.sc); } } } } } });
    if (avgKeys.length) new Chart(document.getElementById('cAvg'), { type: 'bar', data: { labels: avgKeys.map(appName), datasets: [{ label: 'Average %', data: avgKeys.map(avg), backgroundColor: avgKeys.map(function (x, i) { return COLORS[i % COLORS.length]; }), borderRadius: 10 }] },
      options: { animation: anim, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, ticks: { callback: function (v) { return v + '%'; } } } }, plugins: { legend: { display: false },
        tooltip: { callbacks: { label: function (c) { var x = avgKeys[c.dataIndex]; return 'Average ' + c.raw + '% over ' + apps[x].pcts.length + ' scored'; } } } } } });
  }
  function card(ic, v, t) { return '<div class="sc-card"><span>' + ic + '</span><b>' + esc(v) + '</b><em>' + esc(t) + '</em></div>'; }
  g.MyScores = { show: show, _parse: parseScore, _fmt: fmt };
})(window);
