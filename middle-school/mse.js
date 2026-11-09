(function () {
  'use strict';
  var DATA = [], PRACTICE = {}, band = '1';
  var KEY = 'mse_progress_v1';
  var done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { done = {}; }

  var SP = null;
  function sp() { return (window.StudyProgress || null); }
  function sid(t, p) { return 'mse|' + t.band + '|' + String(t.note || '').replace(/\.pdf$/i, '') + '|' + p; }
  function isDone(t, p) {
    var s = sp();
    if (s && s.isDone) { try { return !!s.isDone(sid(t, p)); } catch (e) {} }
    return !!(done[key(t)] || {})[p];
  }

  var listEl = document.getElementById('list');
  var emptyEl = document.getElementById('empty');
  var ptext = document.getElementById('ptext');
  var barEl = document.getElementById('bar');
  var modal = document.getElementById('modal');
  var mtitle = document.getElementById('mtitle');
  var mbody = document.getElementById('mbody');
  var qEl = document.getElementById('q');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  function key(t) { return 'mse' + t.band + '_' + t.note.replace(/[^a-z0-9]/gi, ''); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} }
  function closeModal() { modal.hidden = true; mbody.innerHTML = ''; }

  var BOOK_NAME = { green: 'Green Zap', blue: 'Blue Zap', red: 'Red Zap', chunilmun: '천일문 Grammar' };
  function bookLabel(b, title) {
    var m = /^([a-z]+)(\d+)$/.exec(b || '');
    if (m) return (BOOK_NAME[m[1]] || m[1]) + ' ' + m[2];
    if (b && b.indexOf('chunilmun') === 0) return '천일문 Grammar ' + (b.replace(/\D/g, '') || '');
    return title || b;
  }

  function topicState(t) {
    var k = key(t), st = done[k] || {};
    var hasPractice = (PRACTICE[t.topic] || []).length > 0;
    var total = 2 + (hasPractice ? 1 : 0);
    var st2 = { note: isDone(t, 'note'), video: isDone(t, 'video'), practice: isDone(t, 'practice') };
    var n = (st2.note ? 1 : 0) + (st2.video ? 1 : 0) + (st2.practice ? 1 : 0);
    return { k: k, st: st2, hasPractice: hasPractice, total: total, n: n, all: n >= total && total > 0 };
  }

  function chip(cls, on, label, attrs) {
    return '<button class="chip ' + (on ? 'ok' : cls) + '"' + (attrs || '') + '>' + (on ? '✓ ' : '') + label + '</button>';
  }

  function render() {
    var q = (qEl.value || '').toLowerCase().trim();
    var rows = DATA.filter(function (t) { return t.band === band && (!q || t.topic.toLowerCase().indexOf(q) >= 0); });
    listEl.innerHTML = '';
    emptyEl.hidden = rows.length > 0;

    rows.forEach(function (t, i) {
      var s = topicState(t);
      var el = document.createElement('div');
      el.className = 'topic' + (s.all ? ' done' : '') + (s.n > 0 && !s.all ? ' partial' : '');
      el.innerHTML =
        '<div class="num">' + (s.all ? '✓' : (s.n > 0 ? s.n + '/' + s.total : (i + 1))) + '</div>' +
        '<div class="tt">' + esc(t.topic) + '</div>' +
        '<div class="chips">' +
          '<button class="chip ' + (s.st.note ? 'ok' : 'gold') + '" data-note="' + esc(t.note) + '" data-k="' + s.k + '" data-title="' + esc(t.topic) + '">' + (s.st.note ? '✓ ' : '') + '노트 Notes</button>' +
          (t.video
            ? '<button class="chip ' + (s.st.video ? 'ok' : 'purple') + '" data-video="' + esc(t.video) + '" data-k="' + s.k + '" data-p="video" data-topic="' + esc(t.topic) + '" data-title="' + esc(t.topic) + '">' + (s.st.video ? '✓ ' : '') + '영상 Video</button>'
            : '<span class="chip soon" title="영상이 아직 없습니다">영상 준비 중</span>') +
          '<span class="chip soon" title="문항을 새로 만드는 중입니다">퀵 테스트 준비 중</span>' +
          (s.hasPractice
            ? '<button class="chip ' + (s.st.practice ? 'ok' : 'pink') + '" data-practice="' + esc(t.topic) + '">' + (s.st.practice ? '✓ ' : '') + '연습 More practice · ' + (PRACTICE[t.topic] || []).length + '</button>'
            : '<span class="chip soon" title="' + esc(t.zapNote || '') + '">연습 없음</span>') +
        '</div>';
      listEl.appendChild(el);
    });

    listEl.querySelectorAll('[data-video]').forEach(function (btn) {
      btn.addEventListener('click', function () { mark(btn.dataset.topic, 'video'); openVideo(btn.dataset.video, btn.dataset.title); });
    });
    listEl.querySelectorAll('[data-practice]').forEach(function (btn) {
      btn.addEventListener('click', function () { mark(btn.dataset.practice, 'practice'); openPractice(btn.dataset.practice); });
    });
    listEl.querySelectorAll('[data-note]').forEach(function (b) {
      b.addEventListener('click', function () { openNote(b.dataset.note, b.dataset.k, b.dataset.title); });
    });
    updateBar();
  }

  function keyByTopic(topic) {
    var t = DATA.filter(function (x) { return x.topic === topic; })[0];
    return t ? key(t) : '';
  }

  function mark(topicName, p) {
    var t = DATA.filter(function (x) { return x.topic === topicName; })[0];
    if (!t) return;
    var k = key(t);
    if (!done[k]) done[k] = {};
    done[k][p] = true; save();
    var s = sp();
    if (s && s.markDone) { try { s.markDone(sid(t, p)); } catch (e) {} }
    render();
  }

  function updateBar() {
    var rows = DATA.filter(function (t) { return t.band === band; });
    var got = 0, total = 0;
    rows.forEach(function (t) { var s = topicState(t); got += s.n; total += s.total; });
    ptext.textContent = got + ' / ' + total + ' done';
    barEl.style.width = total ? Math.round(got / total * 100) + '%' : '0%';
  }

  var NOTE_SECONDS = 60;

  function openNote(file, k, title) {
    var left = NOTE_SECONDS;
    mtitle.textContent = title + ' · Note';
    mbody.innerHTML =
      '<div class="note-wrap">' +
        '<div class="note-bar"><span id="nc">읽는 중 … ' + left + '초</span><span class="note-hint">60초 이상 봐야 완료로 바뀝니다.</span></div>' +
        '<iframe class="pdf" src="notes/' + encodeURIComponent(file) + '#view=FitH" title="' + esc(title) + ' note"></iframe>' +
      '</div>';
    modal.hidden = false;
    var label = document.getElementById('nc');
    var tick = setInterval(function () {
      left -= 1;
      if (!label) { clearInterval(tick); return; }
      if (left > 0) { label.textContent = '읽는 중 … ' + left + '초'; return; }
      clearInterval(tick);
      label.textContent = '✓ 완료';
      mark(title, 'note');
    }, 1000);
    var stop = function () { clearInterval(tick); };
    modal.addEventListener('click', stop, { once: true });
    document.getElementById('close').addEventListener('click', stop, { once: true });
  }

  function openVideo(src, title) {
    mtitle.textContent = title;
    var body;
    if (/^https?:/i.test(src)) {
      body = '<video class="vid" controls playsinline preload="metadata" poster="">' +
             '<source src="' + esc(src) + '" type="video/mp4"></video>' +
             '<p class="pnote">문제가 있으면 <a href="' + esc(src) + '" target="_blank" rel="noopener">새 창에서 열기</a></p>';
    } else {
      body = '<div class="player"><iframe src="https://www.youtube-nocookie.com/embed/' + src +
             '?cc_load_policy=1&cc_lang_pref=en&rel=0&modestbranding=1&playsinline=1" title="' + esc(title) +
             '" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>';
    }
    mbody.innerHTML = body;
    modal.hidden = false;
  }

  function openPractice(topic) {
    var list = PRACTICE[topic] || [];
    mtitle.textContent = topic + ' · More practice';
    var groups = {};
    list.forEach(function (e) { (groups[e.book] = groups[e.book] || []).push(e); });
    var html = '<p class="pnote">아래 연습은 Zap 책과 천일문 책에서 이 문법을 다루는 문제만 모은 것입니다. 눌러서 바로 풀 수 있습니다.</p>';
    Object.keys(groups).sort().forEach(function (b) {
      html += '<h4 class="pbook">' + esc(bookLabel(b, groups[b][0].book_title)) + '</h4><div class="plist">';
      groups[b].forEach(function (e, i) {
        html += '<button class="pitem" data-file="' + esc(e.file) + '" data-title="' + esc(e.title || e.grammar) + '">' +
          '<b>' + esc(e.grammar || e.title || '') + '</b>' +
          '<span>p.' + esc(e.page || '?') + ' · ' + esc(e.title || '') + '</span></button>';
      });
      html += '</div>';
    });
    mbody.innerHTML = html;
    mbody.querySelectorAll('.pitem').forEach(function (btn) {
      btn.addEventListener('click', function () { openExercise(btn.dataset.file, btn.dataset.title); });
    });
    modal.hidden = false;
  }

  function norm(s) { return String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim(); }

  function openExercise(file, title) {
    mtitle.textContent = title || 'Practice';
    mbody.innerHTML = '<p class="pnote">불러오는 중…</p>';
    fetch(file, { cache: 'force-cache' }).then(function (r) { return r.json(); }).then(function (d) {
      var html = '';
      if (d.title) html += '<h4 class="pbook">' + esc(d.title) + (d.pages ? ' · p.' + esc(d.pages) : '') + '</h4>';
      if (d.introKo) html += '<p class="pnote">' + esc(d.introKo) + '</p>';
      var lastSec = '';
      (d.items || []).forEach(function (it, idx) {
        if (it.sectionTitle && it.sectionTitle !== lastSec) {
          lastSec = it.sectionTitle;
          html += '<div class="sec">' + esc(it.sectionTitle) + (it.sectionInstructionKo ? ' — ' + esc(it.sectionInstructionKo) : '') + '</div>';
        }
        var prompt = esc(it.promptEn || it.promptKo || '');
        if (it.example) {
          html += '<div class="qi ex"><span class="lbl">' + esc(it.label || '') + '</span><div>' + prompt +
                  ' <em>' + esc((it.accept || [it.exampleAnswer])[0] || '') + '</em></div></div>';
          return;
        }
        if (it.type === 'mc' && (it.choices || []).length) {
          html += '<div class="qi" data-i="' + idx + '"><span class="lbl">' + esc(it.label || '') + '</span><div>' + prompt +
            '<div class="opts">' + it.choices.map(function (c, j) {
              return '<button class="opt" data-c="' + j + '">' + esc(c) + '</button>';
            }).join('') + '</div></div></div>';
        } else {
          html += '<div class="qi" data-i="' + idx + '"><span class="lbl">' + esc(it.label || '') + '</span><div>' + prompt +
            '<div class="opts"><input class="tin" type="text" placeholder="답을 쓰세요"><button class="chk">확인</button></div></div></div>';
        }
      });
      mbody.innerHTML = html;
      attach(d.items || []);
    }).catch(function () { mbody.innerHTML = '<p class="pnote">연습을 불러오지 못했습니다.</p>'; });
    modal.hidden = false;
  }

  function attach(items) {
    mbody.querySelectorAll('.qi').forEach(function (box) {
      var it = items[+box.dataset.i];
      if (!it) return;
      var accept = (it.accept || []).map(norm);
      function good(v) { return accept.indexOf(norm(v)) >= 0; }
      box.querySelectorAll('.opt').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (box.classList.contains('answered')) return;
          var val = it.choices[+btn.dataset.c];
          box.classList.add('answered');
          if (good(val)) { btn.classList.add('ok'); box.classList.add('right'); }
          else {
            btn.classList.add('bad'); box.classList.add('wrong');
            box.querySelectorAll('.opt').forEach(function (b2) {
              if (good(it.choices[+b2.dataset.c])) b2.classList.add('ok');
            });
          }
        });
      });
      var chk = box.querySelector('.chk');
      if (chk) chk.addEventListener('click', function () {
        if (box.classList.contains('answered')) return;
        var inp = box.querySelector('.tin');
        box.classList.add('answered');
        if (good(inp.value)) { inp.classList.add('ok'); box.classList.add('right'); }
        else { inp.classList.add('bad'); box.classList.add('wrong');
          var ans = document.createElement('div'); ans.className = 'ans'; ans.textContent = '답: ' + (it.accept || []).join(' / '); box.appendChild(ans); }
      });
    });
  }

  document.getElementById('close').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  document.querySelectorAll('.band').forEach(function (b) {
    b.addEventListener('click', function () {
      band = b.dataset.band;
      document.querySelectorAll('.band').forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
    });
  });
  qEl.addEventListener('input', render);

  Promise.all([
    fetch('topics.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch('practice-index.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return {}; })
  ]).then(function (res) {
    DATA = Array.isArray(res[0]) ? res[0] : [];
    PRACTICE = res[1] || {};
    SP = sp();
    if (SP && SP.load) { SP.load().then(render, render); } else { render(); }
  });
})();
