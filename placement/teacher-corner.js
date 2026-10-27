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

  function resolveLevelName() {
    if (levelName) return levelName;
    var P = g.StudyProgress, last = P && P.last && P.last();
    if (last && last.level) return last.level;
    var C = g.__studyCourses;
    if (C && C.levels && C.levels[0]) return C.levels[0].name;
    return null;
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
          levelName = resolveLevelName();
          if (!levelName) {
            err.textContent = '';
            panel.innerHTML = '<div class="tch-inner"><h3>🔓 Teacher</h3><p>Unlocked. Open <b>Conversation</b> and pick a level to mark progress.</p>' +
              '<div class="acts"><button class="btn3d gold" id="tch-lock">Lock</button></div></div>';
            panel.querySelector('#tch-lock').onclick = lockSession;
            return;
          }
          teacherPanel(who);
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
      levelName = resolveLevelName();
      if (!levelName) {
        showPanel();
        panel.innerHTML = '<div class="tch-inner"><h3>🔓 Teacher</h3><p>Open <b>Conversation</b> and pick a level to mark progress.</p>' +
          '<div class="acts"><button class="btn3d gold" id="tch-lock">Lock</button></div></div>';
        panel.querySelector('#tch-lock').onclick = lockSession;
        return;
      }
      showPanel();
      teacherPanel(who);
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

  function teacherPanel(who) {
    var C = g.__studyCourses;
    var P = g.StudyProgress;
    var findLevel = g.__studyFindLevel;
    var allLevels = g.__studyConversationLevels;
    if (!C || !P || !levelName || !findLevel || !allLevels) return;
    var L = findLevel(levelName) || C.levels[0];
    var stepsFn = g.__studySteps;
    var S = stepsFn(L).filter(g.__studyCounts);
    var upto = -1;
    S.forEach(function (s, i) { if (P.isDone(s.id)) upto = i; });
    var draw = function () {
      panel.innerHTML = '<div class="tch-inner tpanel"><h3>🔓 Teacher · ' + esc(who) + '</h3>' +
        '<select id="tch-lv">' + allLevels().map(function (l) {
          return '<option' + (l.name === L.name ? ' selected' : '') + '>' + esc(l.name) + '</option>';
        }).join('') + '</select>' +
        '<p>Tap the last step this student <b>passed</b>. Everything above = passed, below = not passed.</p>' +
        '<ol class="tlist">' + S.map(function (s, i) {
          return '<li class="' + (i <= upto ? 'ok' : '') + '" data-i="' + i + '">' + (i <= upto ? '✅' : '⬜') + ' ' + esc(teacherStepLabel(s)) + '</li>';
        }).join('') + '</ol>' +
        '<div class="acts"><button class="btn3d no" id="tch-none">None passed</button><button class="btn3d go" id="tch-save">Save</button><button class="btn3d gold" id="tch-lock">Lock</button></div>' +
        '<p class="terr" id="tch-terr"></p></div>';
      panel.querySelectorAll('.tlist li').forEach(function (li) {
        li.onclick = function () { upto = +li.dataset.i; draw(); };
      });
      panel.querySelector('#tch-lv').onchange = function (e) {
        levelName = e.target.value;
        L = findLevel(levelName) || C.levels[0];
        S = stepsFn(L).filter(g.__studyCounts);
        upto = -1;
        S.forEach(function (s, i) { if (P.isDone(s.id)) upto = i; });
        draw();
      };
      panel.querySelector('#tch-none').onclick = function () { upto = -1; draw(); };
      panel.querySelector('#tch-lock').onclick = lockSession;
      panel.querySelector('#tch-save').onclick = function () {
        var m = {};
        S.forEach(function (s, i) { m[s.id] = i <= upto; });
        panel.querySelector('#tch-terr').textContent = 'Saving…';
        P.setPassed(m).then(function (ok) {
          panel.querySelector('#tch-terr').textContent = ok
            ? 'Saved ✔ (still unlocked — press Lock when done)'
            : 'Saved on this device; will sync when online.';
        });
      };
    };
    draw();
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
