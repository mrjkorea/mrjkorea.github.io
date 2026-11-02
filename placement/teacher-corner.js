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

  function stepRowHtml(s, i, upto) {
    var passed = i <= upto;
    var selected = i === upto;
    var cls = (passed ? 'ok' : '') + (selected ? ' sel' : '');
    var mark = selected ? '★' : (passed ? '✓' : '○');
    var badge = selected ? '<span class="tch-last-badge">Last finished</span>' : '';
    return '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0">' +
      '<span class="tch-mark" aria-hidden="true">' + mark + '</span>' +
      '<span class="tch-step-txt">' + esc(teacherStepLabel(s)) + '</span>' + badge + '</li>';
  }

  function teacherPanel(who) {
    var C = g.__studyCourses;
    var P = g.StudyProgress;
    var findLevel = g.__studyFindLevel;
    var allLevels = g.__studyConversationLevels;
    if (!coursesReady()) {
      teacherPanelError('Courses or progress did not load. Reload the page and try again.');
      return;
    }
    levelName = pickDefaultLevel();
    if (!levelName) {
      teacherPanelError('No Conversation levels found. Reload the page and try again.');
      return;
    }
    var L = findLevel(levelName) || C.levels[0];
    var stepsFn = g.__studySteps;
    var S = stepsFn(L).filter(g.__studyCounts);
    var upto = -1;
    S.forEach(function (s, i) { if (P.isDone(s.id)) upto = i; });
    var draw = function () {
      panel.innerHTML = '<div class="tch-inner tpanel"><h3>🔓 Teacher · ' + esc(who) + '</h3>' +
        '<label class="tch-field-lbl" for="tch-lv">Conversation level · 대화 레벨</label>' +
        '<select id="tch-lv" aria-label="Conversation level">' + allLevels().map(function (l) {
          return '<option' + (l.name === L.name ? ' selected' : '') + '>' + esc(l.name) + '</option>';
        }).join('') + '</select>' +
        '<p class="tch-pick-hdr"><strong>Tap the last step this student finished</strong>' +
        '<span class="tch-ko">학생이 마친 마지막 단계를 누르세요</span></p>' +
        '<ol class="tlist" aria-label="Steps">' + S.map(function (s, i) {
          return stepRowHtml(s, i, upto);
        }).join('') + '</ol>' +
        '<p class="tch-help">Press <b>Save</b> to update stars on the path. <b>None passed</b> clears progress for this level.</p>' +
        '<div class="acts"><button class="btn3d no" id="tch-none">None passed</button><button class="btn3d go" id="tch-save">Save</button><button class="btn3d gold" id="tch-lock">Lock</button></div>' +
        '<p class="terr" id="tch-terr"></p></div>';
      panel.querySelectorAll('.tlist li').forEach(function (li) {
        var pick = function () { upto = +li.dataset.i; draw(); };
        li.onclick = pick;
        li.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
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
          if (g.__studyRedrawPath) g.__studyRedrawPath();
          panel.querySelector('#tch-terr').textContent = ok
            ? 'Saved ✔ (still unlocked — press Lock when done)'
            : 'Saved on this device; will sync when online.';
        });
      };
      var sel = panel.querySelector('.tlist li.sel');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    };
    showPanel();
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
