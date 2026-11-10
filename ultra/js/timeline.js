/* timeline.js - playback, histogram, and the budget->block model. */
window.SU = window.SU || {};
SU.timeline = (function () {
  // blocked acts = the top `frac` by suspicion (correlated low-suspicion
  // residue is what survives). Returns a Set of act array-indices.
  function blockedSet(acts, frac) {
    const idx = acts.map((a, i) => i).sort((i, j) => acts[j].susp - acts[i].susp);
    const n = Math.round(acts.length * frac);
    const s = new Set();
    for (let k = 0; k < n; k++) s.add(idx[k]);
    return s;
  }
  function perTick(acts, ticks) {
    const tot = new Array(ticks + 1).fill(0);
    acts.forEach((a) => { if (a.t >= 0 && a.t <= ticks) tot[a.t]++; });
    return tot;
  }
  // first tick at which cumulative blocked acts exceed `alarm` => detection
  function detectionTick(acts, blocked, alarm) {
    const byTick = {};
    acts.forEach((a, i) => {
      if (blocked.has(i)) byTick[a.t] = (byTick[a.t] || 0) + 1;
    });
    let cum = 0;
    const ks = Object.keys(byTick).map(Number).sort((a, b) => a - b);
    for (const t of ks) { cum += byTick[t]; if (cum >= alarm) return t; }
    return null;
  }
  return { blockedSet, perTick, detectionTick };
})();
