/* Teacher unlock (PIN via study_teacher_check — never hardcoded). Header button + path-map FAB share one session. */
(function (g) {
  var root, panel, headerBtn, levelName = null, unlocked = false, panelFromHeader = false;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function auth() { return g.MRJ_AUTH || g.MRJSignin || null; }

  function teacherCheck(pin) {
    var a = auth();
    if (a && a.preview) return Promise.resolve(a.teacherCheck ? a.teacherCheck(pin) : { ok: false, message: 'Preview has no teacher check.' });
    if (!a || !a.ENDPOINT) return Promise.resolve({ ok: false, message: 'Sign-in is not loaded.' });
    return fetch(a.ENDPOINT, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'study_teacher_check', pin: pin, id: a.student && a.student(), token: a.token && a.token() })
    }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, message: 'Network error.' }; })
      .then(function (r) {
        return r && r.error === 'bad_action'
          ? { ok: false, message: 'Teacher check is not on the server yet (deploy backend/teacher-unlock.patch).' }
          : (r || { ok: false });
      });
  }

  function hashPathLevel() {
    var parts = location.hash.slice(1).split('/').map(decodeURIComponent);
    return parts[0] === 'path' && parts[1] ? parts[1] : null;
  }

  function pickDefaultLevel() {
    var findLevel = g.__studyFindLevel;
    var allLevels = g.__studyConversationLevels;
    if (levelName && findLevel && findLevel(levelName)) return levelName;
    var fromHash = hashPathLevel();
    if (fromHash && findLevel && findLevel(fromHash)) return fromHash;
    var P = g.StudyProgress, last = P && P.last && P.last();
    if (last && last.level && findLevel && findLevel(last.level)) return last.level;
    var lv = allLevels && allLevels();
    if (lv && lv[0]) return lv[0].name;
    var C = g.__studyCourses;
    if (C && C.levels && C.levels[0]) return C.levels[0].name;
    return null;
  }

  function resolveLevelName() {
    var picked = pickDefaultLevel();
    if (picked) levelName = picked;
    return levelName;
  }

  function coursesReady() {
    var C = g.__studyCourses;
    return !!(C && C.levels && C.levels.length && g.StudyProgress && g.__studyFindLevel && g.__studyConversationLevels && g.__studySteps && g.__studyCounts);
  }

  function whenCoursesReady(who, onFail) {
    if (coursesReady()) {
      resolveLevelName();
      teacherPanel(who);
      return;
    }
    showPanel();
    panel.innerHTML = '<div class="tch-inner"><h3>🔓 Teacher</h3><p>Loading course list…</p></div>';
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (coursesReady()) {
        clearInterval(t);
        resolveLevelName();
        teacherPanel(who);
      } else if (tries > 150) {
        clearInterval(t);
        onFail();
      }
    }, 100);
  }

  function syncChrome() {
    if (!headerBtn) headerBtn = document.getElementById('teacher-header');
    var who = auth() && auth().student && auth().student();
    if (headerBtn) {
      headerBtn.hidden = !who;
      headerBtn.textContent = unlocked ? '🔓 Teacher' : '👩\u200d🏫 Teacher';
      headerBtn.classList.toggle('tch-on', !!unlocked);
    }
    if (root) {
      var fab = root.querySelector('#tch-fab');
      if (fab) fab.textContent = unlocked ? '🔓' : '🔒';
    }
  }

  function setPanelAnchor(fromHeader) {
    panelFromHeader = !!fromHeader;
    if (root) root.classList.toggle('tch-from-header', panelFromHeader);
  }

  function ensureDom() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'teacher-corner';
    root.innerHTML = '<button type="button" class="tch-fab" id="tch-fab" title="Teacher">🔒</button><div class="tch-panel" id="tch-panel" hidden></div>';
    document.body.appendChild(root);
    root.querySelector('#tch-fab').onclick = function () {
      if (!panel.hidden) { closePanel(); return; }
      openTeacherUI(false);
    };
    panel = root.querySelector('#tch-panel');
    bindHeader();
    syncChrome();
  }

  function bindHeader() {
    if (!headerBtn) headerBtn = document.getElementById('teacher-header');
    if (!headerBtn || headerBtn._tchBound) return;
    headerBtn._tchBound = true;
    headerBtn.onclick = function () { openTeacherUI(true); };
  }

  function closePanel() {
    if (!panel) return;
    panel.hidden = true;
    if (root) root.classList.remove('tch-open');
  }

  function showPanel() {
    if (root) root.classList.add('tch-open');
    panel.hidden = false;
  }

  function lockSession() {
    unlocked = false;
    closePanel();
    syncChrome();
  }

  function openProgressPanel(who) {
    whenCoursesReady(who, function () {
      teacherPanelError('Courses did not load. Reload the page and try again.');
    });
  }

  function openUnlock(fromHeader) {
    var a = auth(), who = a && a.student && a.student();
    if (!who) { alert('Sign the student in first.'); return; }
    ensureDom();
    setPanelAnchor(fromHeader);
    showPanel();
    panel.innerHTML = '<div class="tch-inner"><h3>🔒 Teacher</h3><p>Student: <b>' + esc(who) + '</b></p>' +
      '<input id="tch-pin" type="password" autocomplete="off" placeholder="PIN">' +
      '<p class="terr" id="tch-terr"></p>' +
      '<div class="acts"><button class="btn3d go" id="tch-ok">Unlock</button><button class="btn3d gold" id="tch-x">✖</button></div></div>';
    var pin = panel.querySelector('#tch-pin'), err = panel.querySelector('#tch-terr');
    panel.querySelector('#tch-x').onclick = closePanel;
    pin.focus();
    var go = function () {
      err.textContent = 'Checking…';
      teacherCheck(pin.value.trim()).then(function (r) {
        if (r && r.ok) {
          unlocked = true;
          syncChrome();
          openProgressPanel(who);
        } else err.textContent = (r && r.message) || 'Wrong PIN.';
      });
    };
    panel.querySelector('#tch-ok').onclick = go;
    pin.onkeydown = function (e) { if (e.key === 'Enter') go(); };
  }

  function openTeacherUI(fromHeader) {
    var a = auth(), who = a && a.student && a.student();
    if (!who) { alert('Sign the student in first.'); return; }
    ensureDom();
    setPanelAnchor(fromHeader);
    if (unlocked) {
      openProgressPanel(who);
      return;
    }
    openUnlock(fromHeader);
  }

  function teacherStepLabel(s) {
    if (s.kind === 'review' && s.day === 'Review Quiz') return 'Review Quiz · ' + s.unit;
    if (s.kind === 'exam' && s.day === 'Review Unit Test') return 'Review Unit Test · ' + s.unit;
    if (s.kind === 'review') return 'Review · ' + s.unit;
    return s.unit + ' · ' + (s.day || s.label) + (s.sub ? ' · ' + s.sub : '');
  }

  function teacherPanelError(msg) {
    showPanel();
    panel.innerHTML = '<div class="tch-inner"><h3>🔓 Teacher</h3><p class="terr">' + esc(msg) +
      '</p><div class="acts"><button class="btn3d gold" id="tch-lock">Lock</button></div></div>';
    panel.querySelector('#tch-lock').onclick = lockSession;
  }

  // ---------- flat program chart (Jay 2026-11-06) ----------
  // One list, grouped by program, every activity visible. One tap on an activity:
  // steps before it are marked passed, that activity is left open, the student starts there.

  function conversationGroups() {
    var C = g.__studyCourses;
    var findLevel = g.__studyFindLevel;
    var allLevels = g.__studyConversationLevels;
    var stepsFn = g.__studySteps;
    var countsFn = g.__studyCounts;
    var out = [];
    if (!allLevels || !findLevel || !stepsFn) return out;
    allLevels().forEach(function (l) {
      var L = findLevel(l.name);
      if (!L) return;
      var S = stepsFn(L).filter(countsFn);
      if (!S.length) return;
      out.push({
        key: 'conv:' + l.name,
        name: 'Conversation · ' + l.name,
        color: l.color || '',
        steps: S,
        level: l.name,
        open: l.name === levelName
      });
    });
    return out;
  }

  function otherProgramRows() {
    var C = g.__studyCourses || {};
    var seen = {}, out = [];
    function add(name, url) {
      if (!name || !url || seen[name]) return;
      seen[name] = 1;
      out.push({ name: name, url: url });
    }
    (C.home || []).forEach(function (x) {
      if (x.url) add(x.name, x.url);
      else if (x.room === 'placement') add('Placement', location.pathname + '#placement');
    });
    (C.links || []).forEach(function (x) { if (x.url) add(x.name, x.url); });
    (C.bottom || []).forEach(function (x) {
      if (x.url) add(x.name, x.url);
      else if (x.room === 'scores') add('My scores', location.pathname + '#scores');
    });
    return out;
  }

  function stepRow(s, i) {
    var P = g.StudyProgress;
    var done = P.isDone(s.id);
    var label = teacherStepLabel(s);
    var url = s.url;
    return '<button type="button" class="tch-act' + (done ? ' ok' : '') + '" data-i="' + i + '"' +
      (url ? '' : ' data-nourl="1"') + '>' +
      '<span class="tch-mark" aria-hidden="true">' + (done ? '\u2713' : '\u25cb') + '</span>' +
      '<span class="tch-step-txt">' + esc(label) + '</span>' +
      '<span class="tch-go">' + (url ? '\u25b6 Start' : 'no page yet') + '</span>' +
      '</button>';
  }

  function groupHtml(grp) {
    var head = '<summary class="tch-prog-sum"><span class="tch-prog-name">' + esc(grp.name) + '</span>' +
      '<span class="tch-prog-count">' + (grp.steps.length ? grp.steps.length + ' activities' : '') + '</span></summary>';
    var body = grp.steps.map(stepRow).join('');
    return '<details class="tch-prog"' + (grp.open ? ' open' : '') + ' data-key="' + esc(grp.key) + '">' + head +
      '<div class="tch-prog-body">' + body + '</div></details>';
  }

  function teacherPanel(who) {
    var C = g.__studyCourses;
    var P = g.StudyProgress;
    if (!coursesReady()) {
      teacherPanelError('Courses or progress did not load. Reload the page and try again.');
      return;
    }
    var groups = conversationGroups();
    var others = otherProgramRows();
    if (!groups.length) {
      teacherPanelError('No Conversation levels found. Reload the page and try again.');
      return;
    }
    levelName = levelName || groups[0].level;
    var draw = function () {
      panel.innerHTML = '<div class="tch-inner tpanel"><h3>\ud83d\udd13 Teacher \u00b7 ' + esc(who) + '</h3>' +
        '<p class="tch-help">Tap an activity. Everything before it is marked passed. The student starts there.</p>' +
        '<div class="tch-chart">' + groups.map(groupHtml).join('') +
        '<details class="tch-prog" data-key="other"><summary class="tch-prog-sum"><span class="tch-prog-name">Other programs</span>' +
        '<span class="tch-prog-count">' + others.length + '</span></summary><div class="tch-prog-body">' +
        others.map(function (a) {
          return '<a class="tch-act" href="' + esc(a.url) + '"><span class="tch-mark">\u25b6</span>' +
            '<span class="tch-step-txt">' + esc(a.name) + '</span><span class="tch-go">Open</span></a>';
        }).join('') +
        '</div></details></div>' +
        '<div class="acts"><button class="btn3d no" id="tch-none">None passed (this level)</button>' +
        '<button class="btn3d gold" id="tch-lock">Lock</button></div>' +
        '<p class="terr" id="tch-terr"></p></div>';
      panel.querySelectorAll('.tch-prog').forEach(function (d) {
        d.addEventListener('toggle', function () {
          if (d.open && d.dataset.key && d.dataset.key.indexOf('conv:') === 0) levelName = d.dataset.key.slice(5);
        });
      });
      panel.querySelectorAll('.tch-prog[data-key^="conv:"]').forEach(function (d) {
        var grp = groups.filter(function (x) { return x.key === d.dataset.key; })[0];
        if (!grp) return;
        d.querySelectorAll('.tch-act').forEach(function (btn) {
          btn.onclick = function () { startAt(grp, +btn.dataset.i); };
        });
      });
      panel.querySelector('#tch-none').onclick = function () {
        var clear = {};
        var g0 = groups.filter(function (x) { return x.level === levelName; })[0] || groups[0];
        g0.steps.forEach(function (s) { clear[s.id] = false; });
        panel.querySelector('#tch-terr').textContent = 'Saving\u2026';
        P.setPassed(clear).then(function (ok) {
          if (g.__studyRedrawPath) g.__studyRedrawPath();
          draw();
          panel.querySelector('#tch-terr').textContent = ok ? 'Cleared \u2714' : 'Cleared on this device; will sync when online.';
        });
      };
      panel.querySelector('#tch-lock').onclick = lockSession;
      var open = panel.querySelector('details.tch-prog[open]');
      if (open) open.scrollIntoView({ block: 'nearest' });
    };
    showPanel();
    draw();
  }

  function startAt(grp, idx) {
    var P = g.StudyProgress;
    var s = grp.steps[idx];
    if (!s) return;
    if (!s.url) {
      var t = panel.querySelector('#tch-terr');
      if (t) t.textContent = 'This activity has no page yet: ' + teacherStepLabel(s);
      return;
    }
    var map = {};
    grp.steps.forEach(function (x, i) { if (i < idx) map[x.id] = true; else if (i === idx) map[x.id] = false; });
    var err = panel.querySelector('#tch-terr');
    if (err) err.textContent = 'Saving\u2026';
    P.setPassed(map).then(function () {
      if (g.__studyRedrawPath) g.__studyRedrawPath();
      location.href = s.url;
    });
  }

  g.TeacherCorner = {
    setVisible: function (on) {
      ensureDom();
      root.classList.toggle('on', !!on);
      if (!on) closePanel();
    },
    setLevel: function (name) {
      ensureDom();
      levelName = name;
    },
    isUnlocked: function () { return unlocked; },
    onSignInChange: function () {
      ensureDom();
      bindHeader();
      if (!auth() || !auth().student || !auth().student()) lockSession();
      syncChrome();
    }
  };
})(window);
