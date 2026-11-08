(function () {
  'use strict';
  var DATA = [], band = '1';
  var KEY = 'mse_progress_v1';
  var done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { done = {}; }

  var listEl = document.getElementById('list');
  var emptyEl = document.getElementById('empty');
  var ptext = document.getElementById('ptext');
  var barEl = document.getElementById('bar');
  var modal = document.getElementById('modal');
  var mtitle = document.getElementById('mtitle');
  var mbody = document.getElementById('mbody');
  var qEl = document.getElementById('q');

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  function key(t) { return 'mse' + t.band + '_' + t.note.replace(/[^a-z0-9]/gi, ''); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} }

  function render() {
    var q = (qEl.value || '').toLowerCase().trim();
    var rows = DATA.filter(function (t) { return t.band === band && (!q || t.topic.toLowerCase().indexOf(q) >= 0); });
    listEl.innerHTML = '';
    emptyEl.hidden = rows.length > 0;

    rows.forEach(function (t, i) {
      var k = key(t), st = done[k] || {};
      var allDone = st.note && st.video;
      var el = document.createElement('div');
      el.className = 'topic' + (allDone ? ' done' : '');
      el.innerHTML =
        '<div class="num">' + (allDone ? '✓' : (i + 1)) + '</div>' +
        '<div class="tt">' + esc(t.topic) + '</div>' +
        '<div class="chips">' +
          '<a class="chip gold" href="notes/' + encodeURIComponent(t.note) + '" target="_blank" rel="noopener" data-k="' + k + '" data-p="note">' + (st.note ? '✓ ' : '') + '노트 Notes</a>' +
          (t.video
            ? '<button class="chip purple" data-video="' + esc(t.video) + '" data-k="' + k + '" data-p="video" data-title="' + esc(t.topic) + '">' + (st.video ? '✓ ' : '') + '영상 Video</button>'
            : '<span class="chip soon">영상 준비 중 · Video soon</span>') +
          '<span class="chip soon">퀵 테스트 준비 중</span>' +
          '<a class="chip pink" href="https://mrjkorea.github.io/MRJ-Zap-Grammar-Books/" target="_blank" rel="noopener">Zap</a>' +
        '</div>';
      listEl.appendChild(el);
    });

    // wiring
    listEl.querySelectorAll('[data-video]').forEach(function (btn) {
      btn.addEventListener('click', function () { openVideo(btn.dataset.video, btn.dataset.title); mark(btn.dataset.k, 'video'); });
    });
    listEl.querySelectorAll('a[data-p="note"]').forEach(function (a) {
      a.addEventListener('click', function () { mark(a.dataset.k, 'note'); });
    });
    updateBar();
  }

  function mark(k, p) {
    if (!done[k]) done[k] = {};
    if (!done[k][p]) { done[k][p] = true; save(); }
    var st = done[k];
    var row = listEl.querySelector('[data-k="' + k + '"]');
    if (row) { var chip = row; if (p === 'note') chip.textContent = '✓ 노트 Notes'; else chip.textContent = '✓ 영상 Video'; }
    var card = row; while (card && !card.classList.contains('topic')) card = card.parentElement;
    if (card && done[k].note && done[k].video) { card.classList.add('done'); var n = card.querySelector('.num'); if (n) n.textContent = '✓'; }
    updateBar();
  }

  function updateBar() {
    var rows = DATA.filter(function (t) { return t.band === band; });
    var n = rows.filter(function (t) { var s = done[key(t)] || {}; return s.note && s.video; }).length;
    ptext.textContent = n + ' / ' + rows.length + ' done';
    barEl.style.width = rows.length ? Math.round(n / rows.length * 100) + '%' : '0%';
  }

  function openVideo(id, title) {
    mtitle.textContent = title;
    mbody.innerHTML = '<div class="player"><iframe src="https://www.youtube-nocookie.com/embed/' + id +
      '?cc_load_policy=1&cc_lang_pref=en&rel=0&modestbranding=1&playsinline=1" title="' + esc(title) +
      '" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>';
    modal.hidden = false;
  }

  document.getElementById('close').addEventListener('click', function () { modal.hidden = true; mbody.innerHTML = ''; });
  modal.addEventListener('click', function (e) { if (e.target === modal) { modal.hidden = true; mbody.innerHTML = ''; } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { modal.hidden = true; mbody.innerHTML = ''; } });

  document.querySelectorAll('.band').forEach(function (b) {
    b.addEventListener('click', function () {
      band = b.dataset.band;
      document.querySelectorAll('.band').forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
    });
  });
  qEl.addEventListener('input', render);

  fetch('topics.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (j) { DATA = Array.isArray(j) ? j : []; render(); })
    .catch(function () { DATA = []; render(); });
})();
