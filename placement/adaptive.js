/* Shared adaptive staircase for placement parts.
 * Start at mid band (3). Correct → +1 band, wrong → −1 (clamped 1..maxBand).
 * After 2 wrong in a row at the same band, stay (no extra drop).
 * Stop at maxItems (default 15) or when the last 4 answers keep the same estimated band.
 */
(function (g) {
  function AdaptiveSession(bank, opts) {
    opts = opts || {};
    this.bands = bank.bands || [];
    this.items = bank.items || [];
    this.maxBand = opts.maxBand || 6;
    this.mid = opts.startBand || Math.ceil(this.maxBand / 2);
    this.maxItems = opts.maxItems || 15;
    this.band = this.mid;
    this.used = {};
    this.history = [];
    this.wrongStreak = 0;
    this.done = false;
    this.result = null;
  }

  AdaptiveSession.prototype._pool = function () {
    var self = this;
    return this.items.filter(function (it) {
      return it.band === self.band && !self.used[it.q + '|' + it.band];
    });
  };

  AdaptiveSession.prototype._pick = function () {
    var pool = this._pool();
    if (!pool.length) {
      pool = this.items.filter(function (it) { return !this.used[it.q + '|' + it.band]; }.bind(this));
    }
    if (!pool.length) return null;
    var it = pool[Math.floor(Math.random() * pool.length)];
    this.used[it.q + '|' + it.band] = 1;
    return it;
  };

  AdaptiveSession.prototype.current = function () {
    if (this.done) return null;
    if (this.history.length >= this.maxItems) {
      this._finish();
      return null;
    }
    return this._pick();
  };

  AdaptiveSession.prototype._stable = function () {
    if (this.history.length < 4) return false;
    var last = this.history.slice(-4).map(function (h) { return h.bandAfter; });
    return last.every(function (b) { return b === last[0]; });
  };

  AdaptiveSession.prototype.answer = function (choiceIndex, item) {
    if (this.done || !item) return;
    var correct = choiceIndex === item.answer;
    var before = this.band;
    if (correct) {
      this.band = Math.min(this.maxBand, this.band + 1);
      this.wrongStreak = 0;
    } else {
      this.wrongStreak++;
      if (this.wrongStreak < 2) this.band = Math.max(1, this.band - 1);
    }
    this.history.push({ correct: correct, bandBefore: before, bandAfter: this.band });
    if (this.history.length >= this.maxItems || this._stable()) this._finish();
  };

  AdaptiveSession.prototype._finish = function () {
    this.done = true;
    var bands = this.history.map(function (h) { return h.bandAfter; });
    var est = bands.length ? bands[bands.length - 1] : this.mid;
    var correctN = this.history.filter(function (h) { return h.correct; }).length;
    this.result = {
      band: est,
      bandLabel: this.bands[est - 1] || ('Band ' + est),
      correct: correctN,
      total: this.history.length,
      pct: this.history.length ? Math.round(100 * correctN / this.history.length) : 0
    };
  };

  AdaptiveSession.prototype.getResult = function () {
    if (!this.done) this._finish();
    return this.result;
  };

  g.PlacementAdaptive = { AdaptiveSession: AdaptiveSession };
})(window);
