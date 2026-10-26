/* Placement hub + six parts (study-site SPA). */
(function (g) {
  var PARTS = [
    { id: 'conversation', label: 'Conversation', img: 'conversation', data: 'placement/data/conversation.json', ko: '대화 (Day 5)' },
    { id: 'wordMaster', label: 'Word Master', img: 'words', data: 'placement/data/wordmaster.json', ko: '어휘' },
    { id: 'grammar', label: 'Grammar', img: 'grammar', data: 'placement/data/grammar.json', ko: '문법' },
    { id: 'phonics', label: 'Phonics', img: 'decodable', data: 'placement/data/phonics.json', ko: '파닉스/발음' },
    { id: 'reading', label: 'Reading', img: 'reading', data: 'placement/data/reading.json', ko: '읽기' },
    { id: 'typing', label: 'Typing', img: 'typing', ko: '타이핑' }
  ];

  var BLURBS = {
    conversation: { en: 'Uses Day 5 conversation-style questions.', ko: 'Day 5 유닛 테스트 유형입니다.' },
    wordMaster: { en: 'Vocabulary from Word Master levels.', ko: 'Word Master 어휘 수준입니다.' },
    grammar: { en: 'Grammar from MRJ Grammar Books.', ko: 'MRJ Grammar Books 문법입니다.' },
    phonics: { en: 'Letters and decoding from Decodable Books.', ko: 'Decodable Books 글자/파닉스입니다.' },
    reading: { en: 'Original MRJ passages (Level A–F).', ko: 'MRJ 원문 지문 (Level A–F)입니다.' },
    typing: { en: 'Practice on typing.com; we record when you open it.', ko: 'typing.com 연습 — 열었는지 기록합니다.' }
  };

  var PARENT = {
    conversation: { en: 'Conversation placement estimates Day 5 speaking/listening band.', ko: '대화 영역: Day 5 수준 추정입니다.' },
    wordMaster: { en: 'Vocabulary placement estimates word knowledge band.', ko: '어휘 영역: 단어 수준 추정입니다.' },
    grammar: { en: 'Grammar placement estimates structure band.', ko: '문법 영역: 문법 수준 추정입니다.' },
    phonics: { en: 'Phonics placement estimates letter/sound and decoding.', ko: '파닉스: 글자·소리·디코딩 수준입니다.' },
    reading: { en: 'Reading placement uses adaptive passages (not Lexile branded).', ko: '읽기: 적응형 지문 수준 (Lexile 상표 아님).' },
    typing: { en: 'Typing: linked practice; opening the site is recorded.', ko: '타이핑: 사이트 연결·이용 기록.' }
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function im(n) { return 'img/' + n + '.webp'; }
  function P() { return g.StudyProgress; }
  function auth() { return g.MRJ_AUTH || g.MRJSignin || null; }
  function student() { var a = auth(); return a && a.student ? a.student() : ''; }

  function requireSignIn() {
    if (!student()) { alert('Sign in first to save placement results.'); return false; }
    return true;
  }

  function typingUrl(C) {
    var link = (C.links || []).find(function (x) { return x.name === 'Typing'; });
    return (link && link.url) || 'https://www.typing.com/';
  }

  function partDone(pl, id) {
    var r = pl[id];
    if (!r) return false;
    if (id === 'typing') return !!r.openedAt;
    return !!r.at;
  }

  function hub(A, C) {
    var pl = P().getPlacement();
    A.innerHTML = back('#home', 'Placement') +
      '<p class="pl-intro">Take any part in any order. Results save when you are signed in.</p>' +
      '<div class="pl-actions"><button class="btn3d purple" id="pl-results">View results</button>' +
      '<button class="btn3d gold sc-print" id="pl-print">Print parent report</button></div>' +
      '<div class="grid pl-grid">' + PARTS.map(function (p) {
        var badge = partDone(pl, p.id) ? '<span class="pl-done">✔ Done</span>' : '';
        return '<a class="tile small pl-tile" href="#placement/' + p.id + '">' + badge +
          '<img src="' + im(p.img) + '" alt=""><b>' + esc(p.label) + '</b></a>';
      }).join('') + '</div>' +
      '<div id="pl-print-area" class="pl-print-area" hidden></div>';
    A.querySelector('#pl-results').onclick = function () { showSummary(A, C, false); };
    A.querySelector('#pl-print').onclick = function () { showSummary(A, C, true); };
  }

  function back(h, t) {
    return '<div class="topbar"><a class="btn3d gold" href="' + h + '">⬅ Back</a><h2>' + t + '</h2></div>';
  }

  function showSummary(A, C, forPrint) {
    var pl = P().getPlacement(), who = student();
    var rows = PARTS.map(function (p) {
      var r = pl[p.id];
      if (!r) return '<tr><td>' + esc(p.label) + '</td><td colspan="2">Not taken yet</td></tr>';
      if (p.id === 'typing') {
        return '<tr><td>' + esc(p.label) + '</td><td>' + (r.openedAt ? 'Opened' : '—') + '</td><td>' + (r.openedAt ? new Date(r.openedAt).toLocaleString() : '') + '</td></tr>';
      }
      return '<tr><td>' + esc(p.label) + '</td><td>' + esc(r.bandLabel || ('Band ' + r.band)) + '</td><td>' + r.correct + '/' + r.total + ' (' + r.pct + '%)</td></tr>';
    }).join('');
    var html = '<div class="pl-report' + (forPrint ? ' pl-report-print' : '') + '">' +
      '<h2>Placement summary / 배치 결과</h2>' +
      '<p class="pl-student"><b>Student:</b> ' + esc(who || '(not signed in)') + '</p>' +
      '<table class="pl-table"><thead><tr><th>Section</th><th>Level</th><th>Score</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="pl-parent">' + PARTS.map(function (p) {
        var r = pl[p.id];
        if (!r || p.id === 'typing') return '';
        var par = PARENT[p.id];
        return '<p><b>' + esc(p.label) + '</b><br>' + esc(par.en) + '<br><span class="ko">' + esc(par.ko) + '</span></p>';
      }).join('') + '</div>' +
      '<p class="pl-foot">Study World · MRJ Placement · ' + new Date().toLocaleDateString() + '</p></div>';
    if (forPrint) {
      var area = document.getElementById('pl-print-area') || document.createElement('div');
      area.id = 'pl-print-area';
      area.className = 'pl-print-area';
      area.innerHTML = html;
      area.hidden = false;
      document.body.appendChild(area);
      window.print();
      return;
    }
    A.innerHTML = back('#placement', 'Placement results') + html +
      '<div class="acts" style="margin-top:20px"><button class="btn3d gold sc-print" id="pl-print2">Print parent report</button></div>';
    A.querySelector('#pl-print2').onclick = function () { showSummary(A, C, true); };
  }

  function partRoute(A, C, partId) {
    var part = PARTS.find(function (p) { return p.id === partId; });
    if (!part) return hub(A, C);
    if (part.id === 'typing') return typingPart(A, C, part);
    if (!requireSignIn()) { location.hash = 'placement'; return; }
    fetch(part.data).then(function (r) { return r.json(); }).then(function (bank) {
      runQuiz(A, C, part, bank);
    }).catch(function () {
      A.innerHTML = back('#placement', part.label) + '<p>Could not load questions.</p>';
    });
  }

  function typingPart(A, C, part) {
    var url = typingUrl(C);
    A.innerHTML = back('#placement', part.label) +
      '<div class="card pl-card"><img src="' + im(part.img) + '" alt=""><h3>' + esc(part.label) + '</h3>' +
      '<p>' + esc(BLURBS.typing.en) + '</p><p class="ko">' + esc(BLURBS.typing.ko) + '</p>' +
      '<div class="acts"><a class="btn3d go" id="pl-type-open" href="' + esc(url) + '" target="_blank" rel="noopener">Open Typing practice</a></div>' +
      '<p id="pl-type-msg"></p></div>';
    A.querySelector('#pl-type-open').onclick = function () {
      if (!requireSignIn()) return;
      P().setPlacementPart('typing', { openedAt: Date.now() }).then(function () {
        A.querySelector('#pl-type-msg').textContent = 'Recorded ✔ You can keep practicing on typing.com.';
      });
    };
  }

  function runQuiz(A, C, part, bank) {
    var session = new g.PlacementAdaptive.AdaptiveSession(bank);
    var item = session.current();
    var render = function () {
      if (!item) {
        finishQuiz(A, C, part, session);
        return;
      }
      var n = session.history.length + 1;
      var passage = item.passage ? '<div class="pl-passage">' + esc(item.passage) + '</div>' : '';
      A.innerHTML = back('#placement', part.label) +
        '<div class="pl-quiz"><p class="pl-meta">Question ' + n + ' · adaptive</p>' + passage +
        '<h3 class="pl-q">' + esc(item.q) + '</h3>' +
        '<div class="pl-choices">' + item.choices.map(function (c, i) {
          return '<button type="button" class="btn3d pl-choice" data-i="' + i + '">' + esc(c) + '</button>';
        }).join('') + '</div></div>';
      A.querySelectorAll('.pl-choice').forEach(function (btn) {
        btn.onclick = function () {
          var idx = +btn.dataset.i;
          session.answer(idx, item);
          item = session.current();
          render();
        };
      });
    };
    render();
  }

  function finishQuiz(A, C, part, session) {
    var r = session.getResult();
    var par = PARENT[part.id];
    P().setPlacementPart(part.id, {
      band: r.band,
      bandLabel: r.bandLabel,
      correct: r.correct,
      total: r.total,
      pct: r.pct,
      at: Date.now()
    }).then(function () {
      A.innerHTML = back('#placement', part.label + ' — done') +
        '<div class="card pl-card"><h3>Your level</h3>' +
        '<p class="pl-level">' + esc(r.bandLabel) + '</p>' +
        '<p>' + r.correct + ' / ' + r.total + ' correct (' + r.pct + '%)</p>' +
        '<p class="pl-parent-blurb">' + esc(par.en) + '</p><p class="ko">' + esc(par.ko) + '</p>' +
        '<div class="acts"><a class="btn3d go" href="#placement">Back to Placement</a>' +
        '<button class="btn3d purple" id="pl-retake">Retake</button></div></div>';
      A.querySelector('#pl-retake').onclick = function () { location.hash = 'placement/' + part.id; };
    });
  }

  g.Placement = {
    route: function (A, C, sub) {
      if (!sub) return hub(A, C);
      return partRoute(A, C, sub);
    },
    parts: PARTS
  };
})(window);
