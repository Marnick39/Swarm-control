/* buildings.js - isometric line-art buildings by node kind.
   Each returns an SVG <g> whose base-centre is at local (0,0), rising upward.
   Colours come from CSS vars so themes just work:
     --face (top), --face-side (sides), --ink (stroke). */
window.SU = window.SU || {};
SU.building = (function () {
  // 2:1 isometric unit projection (block units -> local screen px)
  const XW = 23, YH = 11.5, ZH = 19;
  const prj = (a, b, h) => [(a - b) * XW, (a + b) * YH - h * ZH];
  const P = (pt) => pt[0].toFixed(1) + " " + pt[1].toFixed(1);
  const face = (pts, cls, fill) =>
    `<path class="${cls}" d="M${pts.map(P).join(" L")} Z" ` +
    `fill="${fill}" stroke="var(--ink)" stroke-width="1.6" ` +
    `stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  const line = (p1, p2) =>
    `<path d="M${P(p1)} L${P(p2)}" stroke="var(--ink)" stroke-width="1.1" ` +
    `stroke-linecap="round" opacity="0.55" vector-effect="non-scaling-stroke"/>`;

  // a box with footprint half f, sitting from base z0 to z0+H, with `floors`
  // horizontal lines on the side faces.
  function box(f, H, z0, floors) {
    z0 = z0 || 0;
    const p00b = prj(-f, -f, z0), p10b = prj(f, -f, z0),
          p11b = prj(f, f, z0), p01b = prj(-f, f, z0);
    const p00t = prj(-f, -f, z0 + H), p10t = prj(f, -f, z0 + H),
          p11t = prj(f, f, z0 + H), p01t = prj(-f, f, z0 + H);
    let s = "";
    s += face([p10b, p11b, p11t, p10t], "bf-right", "var(--face-side)");
    s += face([p01b, p11b, p11t, p01t], "bf-left", "var(--face-side)");
    s += face([p00t, p10t, p11t, p01t], "bf-top", "var(--face)");
    // floor lines on both side faces
    if (floors) {
      for (let i = 1; i <= floors; i++) {
        const z = z0 + (H * i) / (floors + 1);
        s += line(prj(f, -f, z), prj(f, f, z));     // right face
        s += line(prj(f, f, z), prj(-f, f, z));      // left face
      }
    }
    return s;
  }

  // isometric cylinder (database): elliptical top/bottom + body + bands
  function cylinder(f, H, bands) {
    const rx = f * (XW + 0 * YH), ry = f * YH;  // ellipse radii in local px
    const topY = -H * ZH, botY = 0;
    const el = (cy) =>
      `<ellipse cx="0" cy="${cy.toFixed(1)}" rx="${(f * XW).toFixed(1)}" ry="${(f * YH).toFixed(1)}"`;
    let s = "";
    // body
    s += `<path d="M${(-f * XW).toFixed(1)} ${botY} L${(-f * XW).toFixed(1)} ${topY.toFixed(1)}` +
         ` A${(f * XW).toFixed(1)} ${(f * YH).toFixed(1)} 0 0 0 ${(f * XW).toFixed(1)} ${topY.toFixed(1)}` +
         ` L${(f * XW).toFixed(1)} ${botY}` +
         ` A${(f * XW).toFixed(1)} ${(f * YH).toFixed(1)} 0 0 1 ${(-f * XW).toFixed(1)} ${botY} Z"` +
         ` fill="var(--face-side)" stroke="var(--ink)" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
    // bands
    for (let i = 1; i <= (bands || 2); i++) {
      const cy = topY + (H * ZH * i) / ((bands || 2) + 1);
      s += `${el(cy)} fill="none" stroke="var(--ink)" stroke-width="1" opacity="0.5" vector-effect="non-scaling-stroke"/>`;
    }
    // top ellipse (lid)
    s += `${el(topY)} fill="var(--face)" stroke="var(--ink)" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
    return s;
  }

  const SCALE = 1.0;
  const gen = {
    cache: (s) => box(0.82 * s, 1.5 * s, 0, 3),          // registry/cache stack
    box: (s) => box(0.8 * s, 1.25 * s, 0, 1),            // sandbox cube
    lock: (s) => box(0.72 * s, 1.0 * s, 0, 0) +          // creds vault + keyhole
      (() => {
        const p = prj(0.72 * s, 0, 0.5 * s);
        return `<circle cx="${(p[0]).toFixed(1)}" cy="${(p[1]).toFixed(1)}" r="4.5" fill="none" stroke="var(--ink)" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`;
      })(),
    db: (s) => cylinder(0.6 * s, 1.35 * s, 2),           // database
    relay: (s) => box(0.34 * s, 1.9 * s, 0, 0) +          // beacon tower
      (() => {
        const t = prj(0, 0, 1.9 * s);
        return `<circle cx="${t[0].toFixed(1)}" cy="${t[1].toFixed(1)}" r="4" fill="var(--activity)" stroke="var(--ink)" stroke-width="1.3" vector-effect="non-scaling-stroke"/>` +
          `<circle cx="${t[0].toFixed(1)}" cy="${t[1].toFixed(1)}" r="8.5" fill="none" stroke="var(--activity)" stroke-width="1" opacity="0.5" vector-effect="non-scaling-stroke"/>`;
      })(),
    k8s: (s) => {                                          // 2x2 container cluster
      let out = "";
      const g = 0.42 * s, h = 0.9 * s;
      const offs = [[-g, -g], [g, -g], [-g, g], [g, g]];
      // draw back-to-front for correct overlap (sort by a+b)
      offs.sort((A, B) => (A[0] + A[1]) - (B[0] + B[1]));
      for (const [oa, ob] of offs) {
        out += `<g transform="translate(${((oa - ob) * XW).toFixed(1)},${((oa + ob) * YH).toFixed(1)})">${box(0.34 * s, h, 0, 1)}</g>`;
      }
      return out;
    },
    chat: (s) => box(0.72 * s, 1.0 * s, 0, 0) +           // message hub + bubble
      (() => {
        const t = prj(0, 0, 1.0 * s);
        return `<g transform="translate(${t[0].toFixed(1)},${(t[1] - 9).toFixed(1)})">` +
          `<rect x="-9" y="-7" width="18" height="12" rx="3" fill="var(--face)" stroke="var(--ink)" stroke-width="1.3" vector-effect="non-scaling-stroke"/>` +
          `<path d="M-3 5 L0 9 L3 5 Z" fill="var(--face)" stroke="var(--ink)" stroke-width="1.3" vector-effect="non-scaling-stroke"/>` +
          `<path d="M-5 -2h10M-5 1h6" stroke="var(--ink)" stroke-width="1" opacity="0.6" vector-effect="non-scaling-stroke"/></g>`;
      })(),
    registry: (s) => box(0.9 * s, 0.45 * s, 0, 0) +       // stacked wide containers
      box(0.78 * s, 0.42 * s, 0.5 * s, 0) + box(0.6 * s, 0.4 * s, 0.98 * s, 0),
    cloud: (s) => {                                        // offsite cloud on a post
      let out = box(0.18 * s, 0.8 * s, 0, 0);
      const t = prj(0, 0, 1.5 * s);
      out += `<g transform="translate(${t[0].toFixed(1)},${t[1].toFixed(1)})">` +
        `<path d="M-20 6 a9 9 0 0 1 3-17 a12 12 0 0 1 22 2 a8 8 0 0 1 -1 15 Z" ` +
        `fill="var(--face)" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></g>`;
      return out;
    },
  };

  // shadow diamond under a building footprint half f
  function shadow(f) {
    const p = (a, b) => prj(a, b, 0);
    const pts = [p(f * 1.15, 0), p(0, f * 1.15), p(-f * 1.15, 0), p(0, -f * 1.15)];
    return `<path d="M${pts.map(P).join(" L")} Z" fill="#000" opacity="0.07"/>`;
  }

  function make(kind, size) {
    const s = (0.78 + 0.5 * (size || 0.7)) * SCALE;
    const body = (gen[kind] || gen.box)(s);
    const fh = 0.8 * s;
    return `<g class="bldg" data-kind="${kind}">${shadow(fh)}${body}</g>`;
  }

  return { make, prj };
})();
