/* map.js - network-segment topology: hex-tiled islands in the Internet sea,
   a budget-scaled monitor gate on the agent egress, and communication bolts.
   Routing follows the validated incident topology:
     internal  (board)   agent -> board            bypasses the gate (blind spot)
     egress    (modal)   agent -> GATE -> modal
     internet  (hf/ext)  agent -> GATE -> modal -> target
     lateral   (hf)      datasets-server -> target  inside HF (blind spot)
     exfil     (ext)     datasets-server -> target  HF -> external         */
window.SU = window.SU || {};
SU.map = (function () {
  const NS = "http://www.w3.org/2000/svg";
  const el = (n, a, h) => {
    const e = document.createElementNS(NS, n);
    if (a) for (const k in a) e.setAttribute(k, a[k]);
    if (h != null) e.innerHTML = h;
    return e;
  };

  let B, state, handlers, svg, root, layers;
  let centers = {}, agentPos = {}, pulseEls = {}, agentById = {}, cellById = {};
  let tr = { x: 0, y: 0, s: 1 }, drag = null;
  let boltTimer = null, blockThreshold = 1.1, sortedSusp = [];
  let tally = { blocked: 0, passed: 0, blind: 0 };
  let gateNodes = [], gateG;
  const GATE = { x: -640, y: 0 };
  const MON_SLOTS = 12;
  const MON_COUNT = [0, 1, 2, 4, 6, 9, 12];

  // segment anchors + layout params (fleet holds agents; modal is standalone)
  const SEG = {
    fleet:  { anchor: { x: -1090, y: 0 }, hexSize: 56, cols: 4, agents: true },
    openai: { anchor: { x: -110, y: -470 }, hexSize: 92, cols: 1 },
    hf:     { anchor: { x: 720, y: -30 }, hexSize: 86, cols: 3 },
    ext:    { anchor: { x: 300, y: 500 }, hexSize: 84, cols: 2 },
  };
  const MODAL = { x: -360, y: 150 };
  const SEGMETA = {};

  function blob(count, cols) {
    const out = [];
    for (let i = 0; i < count; i++) out.push({ q: i % cols, r: Math.floor(i / cols) });
    return out;
  }
  function placeBlob(cells, size, anchor) {
    const pts = cells.map((c) => SU.hex.toPixel(c.q, c.r, size));
    const minx = Math.min(...pts.map((p) => p.x)), maxx = Math.max(...pts.map((p) => p.x));
    const miny = Math.min(...pts.map((p) => p.y)), maxy = Math.max(...pts.map((p) => p.y));
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    return { pos: cells.map((c, i) => ({ q: c.q, r: c.r, x: anchor.x + pts[i].x - cx, y: anchor.y + pts[i].y - cy })),
             box: { minx: anchor.x + minx - cx, maxx: anchor.x + maxx - cx, miny: anchor.y + miny - cy, maxy: anchor.y + maxy - cy } };
  }

  function init(opts) {
    B = opts.bundle; state = opts.state; handlers = opts.handlers || {};
    agentById = {}; B.agents.forEach((a) => (agentById[a.id] = a));
    cellById = {}; B.world.cells.forEach((c) => (cellById[c.id] = c));
    B.segments.forEach((s) => (SEGMETA[s.id] = s));
    sortedSusp = B.timeline.acts.map((a) => a.susp).sort((x, y) => x - y);

    svg = el("svg", { preserveAspectRatio: "xMidYMid meet" });
    root = el("g", { id: "root" }); svg.appendChild(root);
    layers = {};
    ["sea", "lane", "island", "gate", "bolt", "bldg", "label", "fx"]
      .forEach((n) => { layers[n] = el("g", { "data-layer": n }); root.appendChild(layers[n]); });
    opts.mount.innerHTML = ""; opts.mount.appendChild(svg);

    layout(); drawSea(); drawIslands(); drawLanes(); drawEdges(); drawGate();
    drawServices(); drawAgents(); bindInput(); fit();
    setBudget(state.budgetIdx); startBolts();
    return API;
  }

  // ------------------------------------------------- layout
  let islandBoxes = {};
  function layout() {
    centers = {}; agentPos = {}; islandBoxes = {};
    ["openai", "hf", "ext"].forEach((seg) => {
      const cfg = SEG[seg];
      const svc = B.world.cells.filter((c) => c.seg === seg);
      const r = placeBlob(blob(svc.length, Math.min(cfg.cols, svc.length) || 1), cfg.hexSize, cfg.anchor);
      svc.forEach((c, i) => { centers[c.id] = { x: r.pos[i].x, y: r.pos[i].y }; });
      islandBoxes[seg] = { cells: r.pos, size: cfg.hexSize, box: r.box };
    });
    // modal (fleet, standalone egress node)
    centers["modal"] = { x: MODAL.x, y: MODAL.y };
    // agents in the fleet island
    const r = placeBlob(blob(B.agents.length, SEG.fleet.cols), SEG.fleet.hexSize, SEG.fleet.anchor);
    B.agents.forEach((a, i) => { agentPos[a.id] = { x: r.pos[i].x, y: r.pos[i].y }; });
    islandBoxes.fleet = { cells: r.pos, size: SEG.fleet.hexSize, box: r.box };
    // gate slots
    gateNodes = [];
    const span = 300;
    for (let i = 0; i < MON_SLOTS; i++) {
      const t = i / (MON_SLOTS - 1);
      gateNodes.push({ x: GATE.x + (i % 2 ? 24 : -24), y: GATE.y - span / 2 + t * span });
    }
  }

  // ------------------------------------------------- sea
  function drawSea() {
    layers.sea.appendChild(el("text", {
      x: 60, y: -40, "text-anchor": "middle", "font-size": "170", "font-weight": "700",
      "letter-spacing": "0.34em", fill: "var(--text-muted)", opacity: "0.06",
      "font-family": "var(--font-sans)",
    }, "INTERNET"));
    layers.sea.appendChild(el("text", {
      x: 60, y: 14, "text-anchor": "middle", "font-size": "22", "letter-spacing": "0.4em",
      fill: "var(--text-muted)", opacity: "0.13", "font-family": "var(--font-mono)",
    }, "the open network · no trust boundary"));
    for (let rr = 360; rr < 1700; rr += 240)
      layers.sea.appendChild(el("circle", { cx: 60, cy: -30, r: rr, fill: "none",
        stroke: "var(--grid-major)", "stroke-width": "1", "vector-effect": "non-scaling-stroke" }));
  }

  // ------------------------------------------------- islands
  function islandOutline(seg, box, color, fillO) {
    box.cells.forEach((c) => {
      const cs = SU.hex.corners(c.x, c.y, box.size * 0.99);
      layers.island.appendChild(el("path", { d: SU.hex.polyPath(cs, true), fill: color,
        "fill-opacity": "0.06", stroke: "none" }));
    });
    const local = box.cells.map((c) => ({ q: c.q, r: c.r }));
    const loops = SU.hex.boundaryLoops(local, box.size, 1.04);
    const pts0 = local.map((c) => SU.hex.toPixel(c.q, c.r, box.size));
    const mnx = Math.min(...pts0.map((p) => p.x)), mxx = Math.max(...pts0.map((p) => p.x));
    const mny = Math.min(...pts0.map((p) => p.y)), mxy = Math.max(...pts0.map((p) => p.y));
    const ox = (box.box.minx + box.box.maxx) / 2 - (mnx + mxx) / 2;
    const oy = (box.box.miny + box.box.maxy) / 2 - (mny + mxy) / 2;
    loops.forEach((loop) => {
      const moved = loop.map((p) => [p[0] + ox, p[1] + oy]);
      layers.island.appendChild(el("path", { d: SU.hex.polyPath(moved, true),
        fill: "var(--surface)", "fill-opacity": fillO == null ? 0.5 : fillO,
        stroke: color, "stroke-width": "2.5", "stroke-opacity": "0.5",
        "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" }));
    });
  }
  function header(cx, topY, label, sub, color) {
    const g = el("g");
    g.appendChild(el("circle", { cx: cx - label.length * 5.6 - 14, cy: topY - 6, r: 5, fill: color }));
    g.appendChild(el("text", { x: cx, y: topY, "text-anchor": "middle", "font-size": "19",
      "font-weight": "700", fill: "var(--text)", "font-family": "var(--font-sans)" }, label));
    g.appendChild(el("text", { x: cx, y: topY + 19, "text-anchor": "middle", "font-size": "12",
      fill: "var(--text-muted)", "font-family": "var(--font-mono)", "letter-spacing": "0.02em" }, sub));
    layers.label.appendChild(g);
  }
  function drawIslands() {
    ["fleet", "openai", "hf", "ext"].forEach((seg) => {
      const box = islandBoxes[seg], meta = SEGMETA[seg];
      islandOutline(seg, box, meta.color);
      header((box.box.minx + box.box.maxx) / 2, box.box.miny - box.size * 0.7,
        meta.label, meta.sub, meta.color);
    });
    // modal standalone node island
    const mb = { cells: [{ q: 0, r: 0, x: MODAL.x, y: MODAL.y }], size: 70,
      box: { minx: MODAL.x - 80, maxx: MODAL.x + 80, miny: MODAL.y - 80, maxy: MODAL.y + 80 } };
    islandOutline("fleet", mb, SEGMETA.fleet.color, 0.5);
    layers.label.appendChild(el("text", { x: MODAL.x, y: MODAL.y + 64, "text-anchor": "middle",
      "font-size": "12.5", fill: "var(--text-muted)", "font-family": "var(--font-mono)" },
      "Modal sandbox · breakout"));
  }

  // ------------------------------------------------- lanes
  function drawLanes() {
    const fb = islandBoxes.fleet.box;
    const fx = fb.maxx, fy = (fb.miny + fb.maxy) / 2;
    // egress lane: fleet -> gate -> modal -> internet
    lane(fx, fy, GATE.x, GATE.y, "6 0", 0.55);
    lane(GATE.x, GATE.y, MODAL.x, MODAL.y, "2 7", 0.55);
    ["hf", "ext"].forEach((seg) => { const a = SEG[seg].anchor; lane(MODAL.x, MODAL.y, a.x, a.y, "2 7", 0.4); });
    // internal coordination lane: fleet -> board, bypassing the gate
    const oa = SEG.openai.anchor;
    const internal = el("path", { d: `M${fx} ${fy - 30} C ${fx + 250} ${fy - 320}, ${oa.x - 260} ${oa.y + 60}, ${oa.x} ${oa.y + 40}`,
      fill: "none", stroke: "var(--ink-soft)", "stroke-width": "2", "stroke-dasharray": "7 6",
      opacity: "0.5", "vector-effect": "non-scaling-stroke" });
    layers.lane.appendChild(internal);
    layers.lane.appendChild(el("text", { x: (fx + oa.x) / 2 - 40, y: (fy + oa.y) / 2 - 150,
      "font-size": "11.5", fill: "var(--text-muted)", "font-family": "var(--font-mono)", opacity: "0.85",
      "text-anchor": "middle" }, "internal cache board · unmonitored"));
    layers.lane.appendChild(el("text", { x: (fx + GATE.x) / 2, y: GATE.y - 172, "text-anchor": "middle",
      "font-size": "11.5", fill: "var(--text-muted)", "font-family": "var(--font-mono)", opacity: "0.85" },
      "agent egress"));
  }
  function lane(x1, y1, x2, y2, dash, op) {
    layers.lane.appendChild(el("path", { d: `M${x1} ${y1} L${x2} ${y2}`, fill: "none",
      stroke: "var(--ink-line)", "stroke-width": "2", "stroke-dasharray": dash,
      "stroke-linecap": "round", opacity: op, "vector-effect": "non-scaling-stroke" }));
  }

  // persistent service-to-service graph, styled by confidence
  function drawEdges() {
    const show = { reach: 1, lateral: 1, c2: 1, exfil: 1, supply: 1, cred: 1 };
    B.world.edges.forEach((e) => {
      if (!show[e.cls]) return;
      const a = centers[e.from], b = centers[e.to];
      if (!a || !b) return;
      const dash = e.conf === "confirmed" ? "none" : e.conf === "likely" ? "6 6" : "2 7";
      const op = e.conf === "confirmed" ? 0.42 : e.conf === "likely" ? 0.36 : 0.3;
      const col = (e.cls === "exfil" || e.cls === "c2" || e.cls === "supply")
        ? "var(--activity)" : (e.cls === "reach") ? "var(--alert)" : "var(--ink-soft)";
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 22;
      layers.lane.appendChild(el("path", {
        d: `M${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`, fill: "none", stroke: col,
        "stroke-width": e.cls === "reach" ? "1.8" : "1.4", "stroke-dasharray": dash,
        opacity: op, "stroke-linecap": "round", "vector-effect": "non-scaling-stroke",
        class: "svc-edge",
      }));
    });
    // a small legend for confidence, in the sea under the gate
    const lx = GATE.x - 150, ly = GATE.y + 250;
    const leg = el("g", { transform: `translate(${lx},${ly})` });
    const row = (y, dash, label) => {
      leg.appendChild(el("path", { d: `M0 ${y} L26 ${y}`, stroke: "var(--ink-soft)",
        "stroke-width": "1.5", "stroke-dasharray": dash, "vector-effect": "non-scaling-stroke" }));
      leg.appendChild(el("text", { x: 32, y: y + 3.5, "font-size": "10.5",
        fill: "var(--text-muted)", "font-family": "var(--font-mono)" }, label));
    };
    leg.appendChild(el("text", { x: 0, y: -10, "font-size": "10", fill: "var(--text-muted)",
      "font-family": "var(--font-mono)", "letter-spacing": "0.1em" }, "EVIDENCE"));
    row(6, "none", "confirmed (METR)");
    row(22, "6 6", "likely (swarmtraces)");
    row(38, "2 7", "candidate");
    layers.lane.appendChild(leg);
  }

  // ------------------------------------------------- gate
  function drawGate() {
    gateG = el("g"); layers.gate.appendChild(gateG); renderGate(state.budgetIdx);
    layers.gate.appendChild(el("text", { id: "gate-label", x: GATE.x, y: GATE.y - 196,
      "text-anchor": "middle", "font-size": "15", "font-weight": "700", fill: "var(--select)",
      "font-family": "var(--font-sans)", "letter-spacing": "0.06em" }, "MONITOR GATE"));
    layers.gate.appendChild(el("text", { id: "gate-sub", x: GATE.x, y: GATE.y - 177,
      "text-anchor": "middle", "font-size": "12", fill: "var(--text-muted)",
      "font-family": "var(--font-mono)" }, ""));
  }
  function renderGate(bi) {
    gateG.innerHTML = "";
    const lit = MON_COUNT[bi] || 0;
    gateG.appendChild(el("rect", { x: GATE.x - 40, y: GATE.y - 168, width: 80, height: 336, rx: 24,
      fill: "var(--select)", "fill-opacity": (0.03 + lit / MON_SLOTS * 0.08).toFixed(3),
      stroke: "var(--select-line)", "stroke-opacity": "0.4", "stroke-width": "1",
      "stroke-dasharray": "3 4", "vector-effect": "non-scaling-stroke" }));
    gateNodes.forEach((n, i) => {
      const on = i < lit;
      const g = el("g", { transform: `translate(${n.x},${n.y})` });
      g.appendChild(el("circle", { r: on ? 11 : 8, fill: on ? "var(--select)" : "var(--surface)",
        stroke: on ? "var(--select-line)" : "var(--ink-line)", "stroke-width": "1.5",
        "vector-effect": "non-scaling-stroke", opacity: on ? "1" : "0.5" }));
      g.appendChild(el("path", { d: "M-5 0 Q0 -4 5 0 Q0 4 -5 0 Z", fill: "none",
        stroke: on ? "#fff" : "var(--ink-soft)", "stroke-width": "1.2",
        "vector-effect": "non-scaling-stroke", opacity: on ? "0.95" : "0.5" }));
      if (on) g.appendChild(el("circle", { r: "1.6", fill: "#fff" }));
      gateG.appendChild(g);
    });
  }

  // ------------------------------------------------- services
  function drawServices() {
    B.world.cells.forEach((c, i) => {
      const p = centers[c.id]; if (!p) return;
      const size = c.id === "modal" ? 60 : SEG[c.seg].hexSize;
      const grp = el("g", { transform: `translate(${p.x},${p.y})`, class: "cell", "data-id": c.id });
      grp.appendChild(el("path", { d: SU.hex.polyPath(SU.hex.corners(0, 0, size), true), fill: "none",
        class: "sel-ring", stroke: "var(--activity)", "stroke-width": "3", "stroke-linejoin": "round",
        "vector-effect": "non-scaling-stroke", opacity: "0" }));
      const pwrap = el("g", { class: "pulsewrap", opacity: "0" });
      const pr = el("circle", { class: "pulse", cx: 0, cy: 0, r: (28 + c.size * 16).toFixed(0),
        fill: "none", stroke: "var(--activity)", "stroke-width": "2.5", "vector-effect": "non-scaling-stroke" });
      pr.style.animationDelay = (i * 0.14).toFixed(2) + "s";
      pwrap.appendChild(pr); grp.appendChild(pwrap); pulseEls[c.id] = pwrap;
      const b = el("g", { class: "bwrap" });
      b.style.animationDelay = (0.04 * i).toFixed(2) + "s";
      b.innerHTML = SU.building.make(c.kind, c.size);
      grp.appendChild(b);
      // label + confidence marker
      const lab = el("g", { transform: `translate(0,${size * 0.62})` });
      lab.appendChild(el("text", { x: 0, y: 4, "font-size": "13.5", "text-anchor": "middle",
        fill: "var(--text)", "font-weight": "600", "font-family": "var(--font-mono)" }, c.short));
      if (c.conf !== "confirmed")
        lab.appendChild(el("text", { x: 0, y: 19, "font-size": "9.5", "text-anchor": "middle",
          fill: "var(--text-muted)", "font-family": "var(--font-mono)", "letter-spacing": "0.08em" },
          c.conf.toUpperCase()));
      grp.appendChild(lab);
      grp.addEventListener("mouseenter", () => showHover(c, "service"));
      grp.addEventListener("mousemove", moveHover);
      grp.addEventListener("mouseleave", hideHover);
      grp.addEventListener("click", (ev) => { ev.stopPropagation(); handlers.onSelect && handlers.onSelect(c.id); });
      layers.bldg.appendChild(grp);
    });
  }

  function drawAgents() {
    const fb = islandBoxes.fleet.box;
    for (let k = 0; k < 70; k++)
      layers.bldg.appendChild(el("rect", { x: fb.minx + Math.random() * (fb.maxx - fb.minx),
        y: fb.miny + Math.random() * (fb.maxy - fb.miny), width: 13, height: 10, rx: 2,
        fill: "var(--ink-soft)", opacity: "0.07" }));
    B.agents.forEach((a) => {
      const p = agentPos[a.id];
      const grp = el("g", { transform: `translate(${p.x},${p.y})`, class: "agent", "data-agent": a.id });
      grp.appendChild(el("rect", { x: -26, y: -20, width: 52, height: 40, rx: 5, fill: "var(--surface)",
        stroke: "var(--ink-line)", "stroke-width": "1.3", "stroke-dasharray": "4 3", "vector-effect": "non-scaling-stroke" }));
      grp.appendChild(el("circle", { cx: 0, cy: -4, r: 9, fill: a.color, stroke: "var(--surface)", "stroke-width": "1.5" }));
      grp.appendChild(el("text", { x: 0, y: -1, "font-size": "7", "text-anchor": "middle", fill: "#fff",
        "font-weight": "600", "font-family": "var(--font-mono)" }, a.mono));
      grp.appendChild(el("text", { x: 0, y: 15, "font-size": "7.5", "text-anchor": "middle",
        fill: "var(--text-muted)", "font-family": "var(--font-mono)" }, a.id.length > 8 ? a.id.slice(0, 8) : a.id));
      grp.addEventListener("mouseenter", () => showHover(a, "agent"));
      grp.addEventListener("mousemove", moveHover);
      grp.addEventListener("mouseleave", hideHover);
      layers.bldg.appendChild(grp);
    });
  }

  // ------------------------------------------------- bolt routing (accurate)
  function nearestGate(y) { let g = gateNodes[0], best = 1e9; gateNodes.forEach((n) => { const d = Math.abs(n.y - y); if (d < best) { best = d; g = n; } }); return g; }
  function routeFor(act) {
    const node = cellById[act.node]; if (!node) return null;
    const tgt = centers[act.node]; if (!tgt) return null;
    const agent = agentPos[act.agent] || SEG.fleet.anchor;
    const beach = centers["datasets_server"];
    const route = node.route;
    if (route === "internal")
      return { pts: [agent, centers["board"]], gated: false, kind: "internal" };
    if (route === "lateral")
      return { pts: [beach, tgt], gated: false, kind: "lateral" };
    if (node.seg === "ext" && node.stage === "Exfiltration")
      return { pts: [beach, tgt], gated: false, kind: "exfil" };
    // gated egress / internet / supply / cred
    const g = nearestGate(agent.y);
    const pts = [{ x: agent.x, y: agent.y }, { x: g.x, y: g.y }];
    if (act.node !== "modal") pts.push(centers["modal"]);
    pts.push(tgt);
    return { pts, gated: true, gate: g, kind: "egress" };
  }
  function jitterPath(pts) {
    let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 18, my = (a.y + b.y) / 2 + (Math.random() - 0.5) * 18;
      d += ` L${mx.toFixed(1)} ${my.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    return d;
  }
  function fireBolt(act) {
    if (layers.bolt.childElementCount > 22) return;
    const r = routeFor(act); if (!r) return;
    const node = cellById[act.node];
    const blocked = r.gated && act.susp >= blockThreshold;
    const segColor = (SEGMETA[node.seg] || {}).color || "var(--activity)";
    const color = r.kind === "internal" ? "var(--ink-soft)" : (r.kind === "lateral" || r.kind === "exfil") ? "var(--activity)" : segColor;
    const pts = blocked ? r.pts.slice(0, 2) : r.pts;
    const d = jitterPath(pts);
    const muted = !r.gated;
    const path = el("path", { d, fill: "none", stroke: blocked ? "var(--alert)" : color,
      "stroke-width": blocked ? "2.2" : (muted ? "1.8" : "2.6"), "stroke-linecap": "round",
      "stroke-linejoin": "round", class: "bolt", opacity: muted ? "0.6" : "0.92",
      "stroke-dasharray": muted ? "4 5" : "none", "vector-effect": "non-scaling-stroke" });
    layers.bolt.appendChild(path);
    const len = path.getTotalLength();
    path.style.strokeDasharray = muted ? len : len; path.style.strokeDashoffset = len;
    const dur = Math.min(1.0, Math.max(0.3, len / 1500));
    path.getBoundingClientRect();
    path.style.transition = `stroke-dashoffset ${dur}s linear`;
    path.style.strokeDashoffset = "0";
    const head = el("circle", { r: blocked ? "3" : "3.4", fill: blocked ? "var(--alert)" : color, class: "bolt", opacity: "0.95" });
    const anim = el("animateMotion", { dur: dur + "s", path: d, fill: "remove" });
    head.appendChild(anim); layers.bolt.appendChild(head);
    try { anim.beginElement && anim.beginElement(); } catch (e) {}
    setTimeout(() => {
      head.remove();
      const end = pts[pts.length - 1];
      burst(end.x, end.y, blocked ? "var(--alert)" : color, blocked);
      if (blocked) { tally.blocked++; flashGate(r.gate); }
      else if (r.gated) tally.passed++;
      else tally.blind++;
      path.style.transition = "opacity .5s"; path.style.opacity = "0";
      setTimeout(() => path.remove(), 520);
    }, dur * 1000);
  }
  function burst(x, y, color, blocked) {
    const c = el("circle", { cx: x, cy: y, r: blocked ? 6 : 8, fill: "none", stroke: color,
      "stroke-width": "2.5", class: "fx-burst", "vector-effect": "non-scaling-stroke" });
    layers.fx.appendChild(c);
    c.style.transition = "transform .5s ease-out, opacity .5s"; c.style.transformBox = "fill-box"; c.style.transformOrigin = "center";
    requestAnimationFrame(() => { c.style.transform = "scale(2.4)"; c.style.opacity = "0"; });
    if (blocked) {
      const cross = el("path", { d: `M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x + 5} ${y - 5} L${x - 5} ${y + 5}`,
        stroke: color, "stroke-width": "2.5", "stroke-linecap": "round", class: "fx-burst", "vector-effect": "non-scaling-stroke" });
      layers.fx.appendChild(cross); setTimeout(() => cross.remove(), 500);
    }
    setTimeout(() => c.remove(), 520);
  }
  function flashGate(node) {
    if (!node) return;
    const f = el("circle", { cx: node.x, cy: node.y, r: 15, fill: "none", stroke: "var(--alert)",
      "stroke-width": "2.5", "vector-effect": "non-scaling-stroke" });
    layers.gate.appendChild(f);
    f.style.transition = "transform .45s, opacity .45s"; f.style.transformBox = "fill-box"; f.style.transformOrigin = "center";
    requestAnimationFrame(() => { f.style.transform = "scale(1.8)"; f.style.opacity = "0"; });
    setTimeout(() => f.remove(), 480);
  }
  function startBolts() {
    if (boltTimer) clearInterval(boltTimer);
    boltTimer = setInterval(() => {
      if (document.hidden || state.view !== "map") return;
      const t = state.tick;
      const near = B.timeline.acts.filter((a) => a.t <= t && a.t > t - 3);
      if (!near.length) return;
      const n = 1 + (Math.random() < 0.6 ? 1 : 0);
      for (let k = 0; k < n; k++) fireBolt(near[(Math.random() * near.length) | 0]);
    }, 300);
  }

  // ------------------------------------------------- budget
  function setBudget(bi) {
    state.budgetIdx = bi;
    const frac = B.control.blocks[bi], n = sortedSusp.length;
    blockThreshold = n ? sortedSusp[Math.min(n - 1, Math.floor((1 - frac) * n))] : 1.1;
    if (gateG) renderGate(bi);
    const sub = document.getElementById("gate-sub");
    if (sub) sub.textContent = `${B.control.budgets[bi]}% audited · ${Math.round(frac * 100)}% blocked`;
    return { budget: B.control.budgets[bi], blocked: frac, lit: MON_COUNT[bi] };
  }
  function getTally() { return { ...tally }; }
  function resetTally() { tally = { blocked: 0, passed: 0, blind: 0 }; }

  // ------------------------------------------------- selection / tick
  function setSelected(id) {
    layers.bldg.querySelectorAll(".cell").forEach((g) => {
      const sel = g.getAttribute("data-id") === id;
      g.querySelector(".sel-ring").setAttribute("opacity", sel ? "1" : "0");
      g.classList.toggle("dim", id && !sel);
    });
    captionText(id ? cellById[id].label : "");
  }
  let captionNode = null;
  function captionText(t) {
    if (!captionNode) {
      captionNode = el("text", { x: 60, y: 760, "text-anchor": "middle", "font-size": "13",
        fill: "var(--text-muted)", "letter-spacing": "0.14em", "font-family": "var(--font-mono)" });
      layers.fx.appendChild(captionNode);
    }
    captionNode.textContent = (t || "").toUpperCase();
  }
  function setTick(t) {
    const W = 5, count = {};
    B.timeline.acts.forEach((a) => { if (a.t <= t && a.t > t - W) count[a.node] = (count[a.node] || 0) + 1; });
    B.world.cells.forEach((c) => {
      const pr = pulseEls[c.id]; if (!pr) return;
      const reached = c.tick <= t, n = reached ? (count[c.id] || 0) : 0;
      pr.setAttribute("opacity", n ? Math.min(0.85, 0.28 + n * 0.11).toFixed(2) : "0");
      const g = layers.bldg.querySelector(`.cell[data-id="${c.id}"]`);
      if (g) g.style.opacity = (t < B.timeline.ticks && !reached) ? "0.25" : "1";
    });
  }

  // ------------------------------------------------- hover
  const hoverEl = () => document.getElementById("hover");
  function showHover(obj, kind) {
    const h = hoverEl();
    if (kind === "agent") {
      h.innerHTML = `<div class="hc-title mono">${obj.id}</div>` +
        `<div class="hc-sub">Agent eval fleet · ${obj.stage}${obj.lead ? " · lead" : ""}</div>` +
        `<div class="hc-row"><span class="k">role</span><span class="v">${obj.role}</span></div>` +
        `<span class="hc-tier tier-DOCUMENTED">DOCUMENTED</span>`;
    } else {
      const tierClass = obj.conf === "confirmed" ? "tier-MEASURED" : "tier-MODELED";
      h.innerHTML = `<div class="hc-title">${obj.label}</div>` +
        `<div class="hc-sub">${obj.district} · ${obj.stage}</div>` +
        `<div class="hc-row"><span class="k">reached</span><span class="v mono">${obj.date}</span></div>` +
        `<div class="hc-row"><span class="k">acts</span><span class="v mono">${obj.badges.acts}</span></div>` +
        `<div style="margin-top:7px;color:var(--text-muted);font-size:11px;line-height:1.45">${obj.technique}</div>` +
        `<span class="hc-tier ${tierClass}">${obj.conf.toUpperCase()} · ${obj.source}</span>`;
    }
    h.classList.add("show");
  }
  function moveHover(ev) {
    const h = hoverEl();
    let x = ev.clientX + 16, y = ev.clientY + 14;
    const w = h.offsetWidth || 240, hh = h.offsetHeight || 120;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - 16;
    if (y + hh > window.innerHeight - 8) y = ev.clientY - hh - 14;
    h.style.left = x + "px"; h.style.top = y + "px";
  }
  function hideHover() { hoverEl().classList.remove("show"); }

  // ------------------------------------------------- transform / fit
  function worldBounds() {
    const xs = [], ys = [];
    Object.values(centers).forEach((p) => { xs.push(p.x); ys.push(p.y); });
    Object.values(agentPos).forEach((p) => { xs.push(p.x); ys.push(p.y); });
    xs.push(GATE.x); ys.push(GATE.y - 230, GATE.y + 230);
    return { minx: Math.min(...xs) - 130, maxx: Math.max(...xs) + 140,
      miny: Math.min(...ys) - 150, maxy: Math.max(...ys) + 140 };
  }
  function applyTransform() {
    root.setAttribute("transform", `translate(${tr.x} ${tr.y}) scale(${tr.s})`);
    const z = document.getElementById("tb-zoom"); if (z) z.textContent = Math.round(tr.s * 100) + "%";
  }
  function fit() {
    const bb = worldBounds();
    const cw = bb.maxx - bb.minx, ch = bb.maxy - bb.miny;
    const rect = svg.getBoundingClientRect();
    const vw = rect.width || window.innerWidth, vh = rect.height || window.innerHeight;
    const availW = vw - 380;
    const s = Math.min(availW / cw, vh / ch, 1.15);
    tr.s = s;
    const cx = (bb.minx + bb.maxx) / 2, cy = (bb.miny + bb.maxy) / 2;
    tr.x = 380 + availW / 2 - cx * s; tr.y = vh / 2 - cy * s; applyTransform();
  }
  function zoomBy(f, cx, cy) {
    const ns = Math.max(0.2, Math.min(3, tr.s * f));
    const rect = svg.getBoundingClientRect();
    cx = cx == null ? rect.width / 2 : cx; cy = cy == null ? rect.height / 2 : cy;
    const wx = (cx - tr.x) / tr.s, wy = (cy - tr.y) / tr.s;
    tr.s = ns; tr.x = cx - wx * ns; tr.y = cy - wy * ns; applyTransform();
  }
  function bindInput() {
    svg.addEventListener("mousedown", (e) => { drag = { x: e.clientX, y: e.clientY, tx: tr.x, ty: tr.y }; svg.classList.add("grabbing"); });
    window.addEventListener("mousemove", (e) => { if (!drag) return; tr.x = drag.tx + (e.clientX - drag.x); tr.y = drag.ty + (e.clientY - drag.y); applyTransform(); });
    window.addEventListener("mouseup", () => { drag = null; svg.classList.remove("grabbing"); });
    svg.addEventListener("wheel", (e) => { e.preventDefault(); const rect = svg.getBoundingClientRect(); zoomBy(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - rect.left, e.clientY - rect.top); }, { passive: false });
    svg.addEventListener("click", () => { handlers.onSelect && handlers.onSelect(null); });
  }

  const API = { init, setSelected, setTick, fit, zoomBy, zoomTo: (s) => zoomBy(s / tr.s), setBudget, getTally, resetTally, GATE };
  return API;
})();
