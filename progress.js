/* Study progress: one record per signed-in student, saved on the shared sign-in backend.
 * Server: existing mrj-signin actions load_pack / save_pack with program "study-site"
 *   (Sheet "AppProgress", keyed by student + program, token-checked). Works on today's deployment.
 * Optional server patch (backend/Code.gs.study-site.patch) merges two devices' saves instead of last-write-wins.
 * localStorage is only an offline cache + outbox; server wins on load (merged by updatedAt / union of done).
 * Record: {v:1, updatedAt, last:{course,level,unit,day}, done:{stepId: ts}, undone:{stepId: ts}}  stepId = "level|unit|day"
 *   A step counts as done when done[id] > (undone[id]||0). "undone" is only written by the teacher unlock (teacher.js).
 */
(function (g) {
  var PROGRAM = "study-site", CACHE = "study.progress.";
  function auth() { return g.MRJ_AUTH || g.MRJSignin || null; }
  function user() { var a = auth(); return a && a.student ? a.student() : ""; }
  function empty() { return { v: 1, updatedAt: 0, last: null, done: {}, undone: {} }; }
  function mx(x, y) { var r = {}, k; for (k in (x || {})) r[k] = x[k]; for (k in (y || {})) r[k] = Math.max(y[k], r[k] || 0); return r; }
  function parse(s) { try { var o = JSON.parse(s); return o && o.v ? o : null; } catch (e) { return null; } }
  function merge(a, b) {               // same rule as the server patch
    if (!a) return b || empty(); if (!b) return a;
    var n = a.updatedAt >= b.updatedAt ? a : b, o = n === a ? b : a;
    return { v: 1, updatedAt: n.updatedAt, last: n.last || o.last, done: mx(o.done, n.done), undone: mx(o.undone, n.undone) };
  }
  var rec = empty(), dirty = false, saving = null;
  function cacheKey() { return CACHE + (user() || "guest"); }
  function writeCache() { try { localStorage.setItem(cacheKey(), JSON.stringify({ rec: rec, dirty: dirty })); } catch (e) {} }
  function readCache() { var c = null; try { c = JSON.parse(localStorage.getItem(cacheKey()) || "null"); } catch (e) {} return c || { rec: null, dirty: false }; }

  function load() {
    var c = readCache(); rec = c.rec || empty(); dirty = !!c.dirty;
    var a = auth();
    if (!a || !user()) return Promise.resolve(rec);
    return a.loadPack(PROGRAM).then(function (r) {
      if (r && r.ok) { rec = merge(parse(r.progress_json), rec); writeCache(); if (dirty) push(); }
      return rec;
    }, function () { return rec; });
  }
  function push() {
    var a = auth(); dirty = true; writeCache();
    if (!a || !user()) return Promise.resolve(false);
    if (saving) return saving;
    var sent = rec.updatedAt;
    saving = a.savePack(PROGRAM, JSON.stringify(rec)).then(function (r) {
      saving = null; if (r && r.ok && rec.updatedAt === sent) { dirty = false; writeCache(); }
      return !!(r && r.ok);
    }, function () { saving = null; return false; });       // stays dirty; retried on next load/save/online
    return saving;
  }
  function touch() { rec.updatedAt = Date.now(); return push(); }
  g.addEventListener && g.addEventListener("online", function () { if (dirty) push(); });

  g.StudyProgress = {
    load: load,
    get: function () { return rec; },
    last: function () { return rec.last; },
    isDone: function (id) { return (rec.done[id] || 0) > ((rec.undone || {})[id] || 0); },
    setLast: function (p) { rec.last = p; return touch(); },
    markDone: function (id) { rec.done[id] = Date.now(); return touch(); },
    // Teacher unlock only: set passed / not passed for many steps in one save.
    setPassed: function (map) { var t = Date.now(), k; rec.undone = rec.undone || {};
      for (k in map) { if (map[k]) rec.done[k] = t; else if (rec.done[k]) rec.undone[k] = t; } return touch(); },
    _merge: merge
  };
})(window);
