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
  // One list, grouped by program and level, every activity visible.
  // Source of truth: placement/data/conversation-activities.json (1242 rows, page_id per row).
  // One tap = open that activity's own url. The chart writes NO progress and marks nothing done
  // (MRJ CONVERSATION rule 3). coming_soon rows are greyed and never linked.

  var inventory = null, inventoryState = 'loading';

  function loadInventory() {
    inventoryState = 'loading';
    return fetch('placement/data/conversation-activities.json?v=20261106-1', { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.activities && d.activities.length) {
          d.activities.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
          inventory = d;
          inventoryState = 'ready';
        } else inventoryState = 'error';
        return inventory;
      })
      .catch(function () { inventoryState = 'error'; return null; });
  }

  function levelGroups() {
    if (!inventory) return [];
    var order = [], byLevel = {};
    inventory.activities.forEach(function (a) {
      if (!byLevel[a.level]) { byLevel[a.level] = { key: 'conv:' + a.level, name: a.level, rows: [], live: 0, soon: 0 }; order.push(a.level); }
      var grp = byLevel[a.level];
      grp.rows.push(a);
      if (a.status === 'live') grp.live++; else grp.soon++;
    });
    return order.map(function (name) {
      var grp = byLevel[name];
      grp.open = name === levelName;
      return grp;
    });
  }

  function otherProgramRows() {
    var C = g.__studyCourses || {};
    var seen = {}, out = [];
    function add(name, url) {
      if (!name || !url || seen[name]) return;
      seen[name] = 1;
      out.push({ name: name, url: url });
    }
    (C.home || []).forEach(function (x) { if (x.url) add(x.name, x.url); });
    (C.links || []).forEach(function (x) { if (x.url) add(x.name, x.url); });
    (C.bottom || []).forEach(function (x) {
      if (x.url) add(x.name, x.url);
      else if (x.room === 'scores') add('My scores', location.pathname + '#scores');
    });
    return out;
  }

  function rowLabel(a) {
    var unit = a.unit_type === 'review' ? a.unit : a.unit;
    return unit + ' \u00b7 ' + (a.day || '') + ' \u00b7 ' + (a.activity || '');
  }

  function actRow(a) {
    var live = a.status === 'live' && !!a.url && a.teacher_can_start !== false;
    var label = rowLabel(a);
    if (!live) {
      return '<div class="tch-act soon" aria-disabled="true">' +
        '<span class="tch-mark" aria-hidden="true">\u00b7</span>' +
        '<span class="tch-step-txt">' + esc(label) + '</span>' +
        '<span class="tch-go soon">coming soon</span></div>';
    }
    return '<button type="button" class="tch-act" data-page="' + esc(a.page_id || a.id) + '"' +
      ' data-url="' + esc(a.url) + '">' +
      '<span class="tch-mark" aria-hidden="true">\u25b6</span>' +
      '<span class="tch-step-txt">' + esc(label) + '</span>' +
      '<span class="tch-go">Start</span></button>';
  }

  function groupHtml(grp) {
    var head = '<summary class="tch-prog-sum"><span class="tch-prog-name">Conversation \u00b7 ' + esc(grp.name) + '</span>' +
      '<span class="tch-prog-count">' + grp.live + ' live' + (grp.soon ? ' \u00b7 ' + grp.soon + ' soon' : '') + '</span></summary>';
    return '<details class="tch-prog"' + (grp.open ? ' open' : '') + ' data-key="' + esc(grp.key) + '">' + head +
      '<div class="tch-prog-body">' + grp.rows.map(actRow).join('') + '</div></details>';
  }

  function teacherPanel(who) {
    var C = g.__studyCourses;
    if (!coursesReady() && !inventory) {
      teacherPanelError('Courses or progress did not load. Reload the page and try again.');
      return;
    }
    var others = otherProgramRows();
    if (!inventory && inventoryState !== 'error') {
      showPanel();
      panel.innerHTML = '<div class="tch-inner"><h3>\ud83d\udd13 Teacher \u00b7 ' + esc(who) + '</h3><p>Loading the activity chart\u2026</p></div>';
      loadInventory().then(function () { teacherPanel(who); });
      return;
    }
    var groups = levelGroups();
    if (!groups.length) {
      teacherPanelError('The activity list did not load. Reload the page and try again.');
      return;
    }
    levelName = levelName || groups[0].name;
    var openGrp = groups.filter(function (x) { return x.name === levelName; })[0] || groups[0];
    openGrp.open = true;
    var liveTotal = 0, soonTotal = 0;
    groups.forEach(function (x) { liveTotal += x.live; soonTotal += x.soon; });
    panel.innerHTML = '<div class="tch-inner tpanel"><h3>\ud83d\udd13 Teacher \u00b7 ' + esc(who) + '</h3>' +
      '<p class="tch-help">Tap an activity. The student starts at that activity. ' +
      liveTotal + ' activities are live' + (soonTotal ? ', ' + soonTotal + ' coming soon' : '') + '.</p>' +
      '<div class="tch-chart">' + groups.map(groupHtml).join('') +
      '<details class="tch-prog" data-key="other"><summary class="tch-prog-sum"><span class="tch-prog-name">Other programs</span>' +
      '<span class="tch-prog-count">' + others.length + '</span></summary><div class="tch-prog-body">' +
      others.map(function (a) {
        return '<a class="tch-act" href="' + esc(a.url) + '"><span class="tch-mark">\u25b6</span>' +
          '<span class="tch-step-txt">' + esc(a.name) + '</span><span class="tch-go">Open</span></a>';
      }).join('') + '</div></details></div>' +
      '<div class="acts"><button class="btn3d gold" id="tch-lock">Lock</button></div>' +
      '<p class="terr" id="tch-terr"></p></div>';
    panel.querySelectorAll('.tch-prog').forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open && d.dataset.key && d.dataset.key.indexOf('conv:') === 0) levelName = d.dataset.key.slice(5);
      });
    });
    panel.querySelectorAll('.tch-act[data-url]').forEach(function (btn) {
      btn.onclick = function () {
        var url = btn.getAttribute('data-url');
        if (!url) return;
        var t = panel.querySelector('#tch-terr');
        if (t) t.textContent = 'Starting\u2026';
        location.href = url;
      };
    });
    panel.querySelector('#tch-lock').onclick = lockSession;
    var openEl = panel.querySelector('details.tch-prog[open]');
    if (openEl) openEl.scrollIntoView({ block: 'nearest' });
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
