/* hex.js - pointy-top axial hex math + district boundary extraction. */
window.SU = window.SU || {};
SU.hex = (function () {
  const SQRT3 = Math.sqrt(3);
  // pointy-top axial neighbours
  const NEIGHBORS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

  function toPixel(q, r, size) {
    return { x: size * SQRT3 * (q + r / 2), y: size * 1.5 * r };
  }
  function corners(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      pts.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
    }
    return pts;
  }
  function polyPath(pts, close) {
    let d = "M" + pts.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" L");
    if (close) d += " Z";
    return d;
  }
  const qkey = (p) => Math.round(p[0] * 100) + "," + Math.round(p[1] * 100);

  // Union-boundary loops for a group of cells (each {q,r}). Returns arrays of
  // ordered points (polygon loops) tracing the outer edge of the merged shape.
  function boundaryLoops(cells, size, inflate) {
    inflate = inflate || 1.0;
    const edgeCount = new Map();   // edgeKey -> {a,b,n}
    for (const c of cells) {
      const { x, y } = toPixel(c.q, c.r, size);
      const cs = corners(x, y, size * inflate);
      for (let i = 0; i < 6; i++) {
        const a = cs[i], b = cs[(i + 1) % 6];
        const k = [qkey(a), qkey(b)].sort().join("|");
        const e = edgeCount.get(k);
        if (e) e.n++;
        else edgeCount.set(k, { a, b, n: 1 });
      }
    }
    // boundary edges appear once
    const bedges = [];
    for (const e of edgeCount.values()) if (e.n === 1) bedges.push([e.a, e.b]);
    // chain into loops
    const adj = new Map();
    const push = (k, e) => { (adj.get(k) || adj.set(k, []).get(k)).push(e); };
    for (const [a, b] of bedges) { push(qkey(a), [a, b]); push(qkey(b), [b, a]); }
    const used = new Set();
    const eid = (a, b) => [qkey(a), qkey(b)].sort().join("|");
    const loops = [];
    for (const [a0, b0] of bedges) {
      if (used.has(eid(a0, b0))) continue;
      const loop = [a0];
      let cur = a0, nxt = b0;
      let guard = 0;
      while (guard++ < 10000) {
        used.add(eid(cur, nxt));
        loop.push(nxt);
        if (qkey(nxt) === qkey(a0)) break;
        const outs = adj.get(qkey(nxt)) || [];
        let step = null;
        for (const [p, qd] of outs) {
          if (qkey(qd) === qkey(cur)) continue;        // don't go back
          if (used.has(eid(p, qd))) continue;
          step = qd; break;
        }
        if (!step) break;
        cur = nxt; nxt = step;
      }
      if (loop.length > 2) loops.push(loop);
    }
    return loops;
  }

  return { SQRT3, NEIGHBORS, toPixel, corners, polyPath, boundaryLoops };
})();
