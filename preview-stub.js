/* Local preview: stub sign-in + save_pack in localStorage (no secrets). */
(function (g) {
  var KEY = 'mrj.preview.student';
  function student() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function token() { return student() ? 'preview-token' : ''; }
  var packs = {};
  try { packs = JSON.parse(localStorage.getItem('mrj.preview.packs') || '{}'); } catch (e) { packs = {}; }
  function savePacks() { try { localStorage.setItem('mrj.preview.packs', JSON.stringify(packs)); } catch (e) {} }
  g.MRJSignin = {
    preview: true,
    ENDPOINT: '',
    student: student,
    token: token,
    signInStub: function (id) { try { localStorage.setItem(KEY, String(id).trim()); } catch (e) {} },
    signOut: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
    loadPack: function (prog) {
      return Promise.resolve({ ok: true, progress_json: packs[prog] || '' });
    },
    savePack: function (prog, json) {
      packs[prog] = json;
      savePacks();
      return Promise.resolve({ ok: true });
    },
    teacherCheck: function (pin) {
      return Promise.resolve(pin === '1234' ? { ok: true } : { ok: false, message: 'Wrong PIN (preview: 1234).' });
    }
  };
  g.MRJ_AUTH = g.MRJSignin;
  g.dispatchEvent(new Event('mrj-auth-ready'));
})(window);
