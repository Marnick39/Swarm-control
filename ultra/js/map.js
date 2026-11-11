/* map.js - network topology grouped by trust boundary.
   OpenAI's network (the ~1,200-agent eval swarm, the internal Artifactory board,
   and the monitor gate at its egress) sits in one region. Beyond the gate is the
   open Internet, where Hugging Face production and external sinks live.
   Routing:
     internal (board)  agent -> board          inside OpenAI, bypasses the gate
     egress  (modal)   agent -> GATE -> modal
     internet(hf/ext)  agent -> GATE -> modal -> target
     lateral (hf)      datasets-server -> target   inside HF (blind spot)
     exfil   (ext)     datasets-server -> target   HF -> external                */
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
  let centers = {}, agentPos = {}, swarmPts = [], pulseEls = {}, agentById = {}, cellById = {};
  let tr = { x: 0, y: 0, s: 1 }, drag = null;
  let boltTimer = null, blockThreshold = 1.1, sortedSusp = [];
  let tally = { blocked: 0, passed: 0, blind: 0 };
  let gateNodes = [], gateG, litGateNodes = [];

  // --- OpenAI network region (swarm | monitor gate | internal Artifactory) ---
  // the gate sits between the swarm and everything it does: the internal board
  // AND the egress to the internet. Every agent action is judged there.
  const OPENAI = { x0: -1280, y0: -470, x1: -120, y1: 450 };
  const FLEET = { cx: -980, cy: 70, rx: 235, ry: 270 };
  const GATE = { x: -600, y: 70 };
  const GATE_SPAN = 480;
  const BOARD = { x: -320, y: -275 };
  const MODAL = { x: 130, y: 120 };
  const MON_SLOTS = 14;
  const MON_COUNT = [0, 1, 2, 5, 7, 10, 14];
  // external islands (open internet)
  const SEG = {
    hf:  { anchor: { x: 900, y: -70 }, hexSize: 88, cols: 3 },
    ext: { anchor: { x: 500, y: 600 }, hexSize: 84, cols: 2 },
  };
  const SEGMETA = {};
  const OPENAI_COLOR = "#10a37f";
  const SWARM_COLORS = ["#d6453d", "#d9731a", "#c9a227", "#2f9e44", "#1098ad",
    "#3186ff", "#4d61c8", "#7b52c7", "#9c36b5", "#c2255c", "#e8590c", "#0ca678"];

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
    ["sea", "region", "lane", "island", "gate", "bolt", "bldg", "label", "fx"]
      .forEach((n) => { layers[n] = el("g", { "data-layer": n }); root.appendChild(layers[n]); });
    opts.mount.innerHTML = ""; opts.mount.appendChild(svg);

    layout(); drawSea(); drawRegion(); drawIslands(); drawLanes(); drawEdges();
    drawGate(); drawServices(); drawSwarm(); bindInput(); fit();
    setBudget(state.budgetIdx); startBolts();
    return API;
  }

  // ------------------------------------------------- layout
  let islandBoxes = {};
  function layout() {
    centers = {}; agentPos = {}; islandBoxes = {}; swarmPts = [];
    ["hf", "ext"].forEach((seg) => {
      const cfg = SEG[seg];
      const svc = B.world.cells.filter((c) => c.seg === seg);
      const r = placeBlob(blob(svc.length, Math.min(cfg.cols, svc.length) || 1), cfg.hexSize, cfg.anchor);
      svc.forEach((c, i) => { centers[c.id] = { x: r.pos[i].x, y: r.pos[i].y }; });
      islandBoxes[seg] = { cells: r.pos, size: cfg.hexSize, box: r.box };
    });
    centers["board"] = { x: BOARD.x, y: BOARD.y };
    centers["modal"] = { x: MODAL.x, y: MODAL.y };

    // dense agent swarm (packed ellipse) -> realistic ~1,200 scale
    const { cx, cy, rx, ry } = FLEET, sx = 27, sy = 23;
    let row = 0;
    for (let y = -ry; y <= ry; y += sy) {
      const off = (row % 2) ? sx / 2 : 0; row++;
      for (let x = -rx; x <= rx; x += sx) {
        const px = x + off, py = y;
        if ((px * px) / (rx * rx) + (py * py) / (ry * ry) <= 1)
          swarmPts.push({ x: cx + px + (Math.random() - 0.5) * 6, y: cy + py + (Math.random() - 0.5) * 5 });
      }
    }
    // every agent gets a colour (its requests travel in that colour)
    swarmPts.forEach((p, i) => { p.color = SWARM_COLORS[i % SWARM_COLORS.length]; });
    // blend the 15 named agents INTO the swarm, spread across it
    const N = B.agents.length;
    const order = [...swarmPts.keys()].sort((a, b) =>
      (swarmPts[a].x - swarmPts[b].x) || (swarmPts[a].y - swarmPts[b].y));
    for (let i = 0; i < N; i++) {
      const idx = order[Math.floor((i + 0.5) * order.length / N)];
      const p = swarmPts[idx], a = B.agents[i];
      p.named = a; p.color = a.color; agentPos[a.id] = p;
    }

    gateNodes = [];
    for (let i = 0; i < MON_SLOTS; i++) {
      const t = i / (MON_SLOTS - 1);
      gateNodes.push({ x: GATE.x + (i % 2 ? 22 : -22), y: GATE.y - GATE_SPAN / 2 + t * GATE_SPAN });
    }
  }

  // ------------------------------------------------- sea (open internet)
  function drawSea() {
    layers.sea.appendChild(el("text", {
      x: 620, y: 150, "text-anchor": "middle", "font-size": "180", "font-weight": "700",
      "letter-spacing": "0.34em", fill: "var(--text-muted)", opacity: "0.06",
      "font-family": "var(--font-sans)",
    }, "INTERNET"));
    layers.sea.appendChild(el("text", {
      x: 620, y: 206, "text-anchor": "middle", "font-size": "22", "letter-spacing": "0.4em",
      fill: "var(--text-muted)", opacity: "0.13", "font-family": "var(--font-mono)",
    }, "the open network · no trust boundary"));
    for (let rr = 360; rr < 1500; rr += 240)
      layers.sea.appendChild(el("circle", { cx: 680, cy: 180, r: rr, fill: "none",
        stroke: "var(--grid-major)", "stroke-width": "1", "vector-effect": "non-scaling-stroke" }));
  }

  // ------------------------------------------------- OpenAI region
  function drawRegion() {
    const r = OPENAI, rad = 40;
    layers.region.appendChild(el("rect", {
      x: r.x0, y: r.y0, width: r.x1 - r.x0, height: r.y1 - r.y0, rx: rad,
      fill: OPENAI_COLOR, "fill-opacity": "0.05",
      stroke: OPENAI_COLOR, "stroke-opacity": "0.45", "stroke-width": "2",
      "stroke-dasharray": "2 8", "vector-effect": "non-scaling-stroke",
    }));
    // region header
    layers.label.appendChild(el("text", {
      x: r.x0 + 30, y: r.y0 + 44, "font-size": "26", "font-weight": "700",
      fill: OPENAI_COLOR, "fill-opacity": "0.85", "font-family": "var(--font-sans)",
      "letter-spacing": "0.08em",
    }, "OPENAI NETWORK"));
    layers.label.appendChild(el("text", {
      x: r.x0 + 30, y: r.y0 + 66, "font-size": "13", fill: "var(--text-muted)",
      "font-family": "var(--font-mono)",
    }, "eval fleet · internal Artifactory · egress monitor — one trust zone"));
    // egress boundary at the region's right edge (OpenAI -> open internet)
    const my = (r.y0 + r.y1) / 2;
    layers.label.appendChild(el("text", {
      x: r.x1 - 13, y: my, "text-anchor": "middle", "font-size": "11.5",
      fill: OPENAI_COLOR, "fill-opacity": "0.75", "font-family": "var(--font-mono)",
      "letter-spacing": "0.08em", transform: `rotate(90 ${r.x1 - 13} ${my})`,
    }, "OpenAI → internet egress"));
  }

  // ------------------------------------------------- external islands
  function islandOutline(box, color, fillO) {
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
    ["hf", "ext"].forEach((seg) => {
      const box = islandBoxes[seg], meta = SEGMETA[seg];
      islandOutline(box, meta.color);
      header((box.box.minx + box.box.maxx) / 2, box.box.miny - box.size * 1.05, meta.label, meta.sub, meta.color);
    });
    // modal breakout standalone (just outside the OpenAI boundary)
    const mb = { cells: [{ q: 0, r: 0, x: MODAL.x, y: MODAL.y }], size: 70,
      box: { minx: MODAL.x - 80, maxx: MODAL.x + 80, miny: MODAL.y - 80, maxy: MODAL.y + 80 } };
    islandOutline(mb, SEGMETA.fleet.color, 0.5);
    layers.label.appendChild(el("text", { x: MODAL.x, y: MODAL.y + 64, "text-anchor": "middle",
      "font-size": "12.5", fill: "var(--text-muted)", "font-family": "var(--font-mono)" },
      "Modal sandbox · breakout"));
    // internal infra labels
    header(BOARD.x, BOARD.y - 96, "Internal Artifactory", "the covert cache board", OPENAI_COLOR);
    layers.label.appendChild(el("text", { x: FLEET.cx, y: FLEET.cy + FLEET.ry + 28, "text-anchor": "middle",
      "font-size": "15", "font-weight": "700", fill: "var(--text)", "font-family": "var(--font-sans)" },
      "Agent eval fleet"));
    layers.label.appendChild(el("text", { x: FLEET.cx, y: FLEET.cy + FLEET.ry + 46, "text-anchor": "middle",
      "font-size": "12", fill: "var(--text-muted)", "font-family": "var(--font-mono)" },
      "~1,200 agents in isolated ExploitGym sandboxes"));
  }

  // ------------------------------------------------- lanes
  function drawLanes() {
    const sx = FLEET.cx + FLEET.rx + 18;   // swarm's right edge
    // every agent action flows to the gate to be judged
    lane(sx, FLEET.cy, GATE.x, GATE.y, "6 0", 0.5, "var(--ink-line)");
    // monitored coordination: gate -> internal Artifactory board
    lane(GATE.x, GATE.y, BOARD.x - 10, BOARD.y + 45, "2 7", 0.45, "var(--ink-soft)");
    // egress: gate -> modal breakout -> internet
    lane(GATE.x, GATE.y, MODAL.x, MODAL.y, "2 7", 0.5, "var(--ink-line)");
    ["hf", "ext"].forEach((seg) => { const a = SEG[seg].anchor; lane(MODAL.x, MODAL.y, a.x, a.y, "2 7", 0.32, "var(--ink-line)"); });
    layers.lane.appendChild(el("text", { x: (sx + GATE.x) / 2, y: GATE.y - 205,
      "text-anchor": "middle", "font-size": "11.5", fill: "var(--text-muted)",
      "font-family": "var(--font-mono)", opacity: "0.85" }, "every agent action → judged"));
    layers.lane.appendChild(el("text", { x: (GATE.x + BOARD.x) / 2, y: (GATE.y + BOARD.y) / 2 - 8,
      "text-anchor": "middle", "font-size": "10.5", fill: "var(--text-muted)",
      "font-family": "var(--font-mono)", opacity: "0.75" }, "coordination"));
  }
  function lane(x1, y1, x2, y2, dash, op, col) {
    layers.lane.appendChild(el("path", { d: `M${x1} ${y1} L${x2} ${y2}`, fill: "none",
      stroke: col || "var(--ink-line)", "stroke-width": "2", "stroke-dasharray": dash,
      "stroke-linecap": "round", opacity: op, "vector-effect": "non-scaling-stroke" }));
  }

  function nodeRadius(id) {
    const c = cellById[id];
    const size = id === "modal" ? 60 : id === "board" ? 88 : SEG[c.seg].hexSize;
    return size * 0.56;
  }
  // persistent service edges, confidence-styled, with direction arrows
  function drawEdges() {
    const show = { reach: 1, lateral: 1, c2: 1, exfil: 1, supply: 1, cred: 1 };
    B.world.edges.forEach((e) => {
      if (!show[e.cls]) return;
      const a = centers[e.from], b = centers[e.to];
      if (!a || !b) return;
      const dash = e.conf === "confirmed" ? "none" : e.conf === "likely" ? "6 6" : "2 7";
      const op = e.conf === "confirmed" ? 0.5 : e.conf === "likely" ? 0.42 : 0.34;
      const col = (e.cls === "exfil" || e.cls === "c2" || e.cls === "supply")
        ? "var(--activity)" : (e.cls === "reach") ? "var(--alert)" : "var(--ink-soft)";
      const reach = e.cls === "reach";
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 22;
      const rad = nodeRadius(e.to);
      const dx = b.x - mx, dy = b.y - my, dl = Math.hypot(dx, dy) || 1;
      const ux = dx / dl, uy = dy / dl;
      const ex = b.x - ux * rad, ey = b.y - uy * rad;
      layers.lane.appendChild(el("path", {
        d: `M${a.x} ${a.y} Q ${mx} ${my} ${ex.toFixed(1)} ${ey.toFixed(1)}`, fill: "none",
        stroke: col, "stroke-width": reach ? "1.9" : "1.4", "stroke-dasharray": dash,
        opacity: op, "stroke-linecap": "round", "vector-effect": "non-scaling-stroke", class: "svc-edge",
      }));
      const s = reach ? 9 : 7, px = -uy, py = ux;
      layers.lane.appendChild(el("path", {
        d: `M${ex.toFixed(1)} ${ey.toFixed(1)} L${(ex - ux * s + px * s * 0.6).toFixed(1)} ${(ey - uy * s + py * s * 0.6).toFixed(1)} L${(ex - ux * s - px * s * 0.6).toFixed(1)} ${(ey - uy * s - py * s * 0.6).toFixed(1)} Z`,
        fill: col, opacity: Math.min(0.85, op + 0.2), class: "svc-edge",
      }));
    });
    // evidence legend, inside the OpenAI region, bottom-left
    const lx = OPENAI.x0 + 30, ly = OPENAI.y1 - 92;
    const leg = el("g", { transform: `translate(${lx},${ly})` });
    const rowL = (y, dash, label) => {
      leg.appendChild(el("path", { d: `M0 ${y} L26 ${y}`, stroke: "var(--ink-soft)",
        "stroke-width": "1.5", "stroke-dasharray": dash, "vector-effect": "non-scaling-stroke" }));
      leg.appendChild(el("text", { x: 32, y: y + 3.5, "font-size": "10.5", fill: "var(--text-muted)",
        "font-family": "var(--font-mono)" }, label));
    };
    leg.appendChild(el("text", { x: 0, y: -10, "font-size": "10", fill: "var(--text-muted)",
      "font-family": "var(--font-mono)", "letter-spacing": "0.1em" }, "EVIDENCE"));
    rowL(6, "none", "confirmed (METR)");
    rowL(22, "6 6", "likely (swarmtraces)");
    rowL(38, "2 7", "candidate");
    layers.lane.appendChild(leg);
  }

  // ------------------------------------------------- gate
  function drawGate() {
    gateG = el("g"); layers.gate.appendChild(gateG); renderGate(state.budgetIdx);
    layers.gate.appendChild(el("text", { id: "gate-label", x: GATE.x, y: GATE.y - GATE_SPAN / 2 - 30,
      "text-anchor": "middle", "font-size": "15", "font-weight": "700", fill: "var(--select)",
      "font-family": "var(--font-sans)", "letter-spacing": "0.06em" }, "MONITOR GATE"));
    layers.gate.appendChild(el("text", { id: "gate-sub", x: GATE.x, y: GATE.y - GATE_SPAN / 2 - 11,
      "text-anchor": "middle", "font-size": "12", fill: "var(--text-muted)",
      "font-family": "var(--font-mono)" }, ""));
    // hover hit area covering the whole gate (incl. its label)
    const hit = el("rect", { x: GATE.x - 44, y: GATE.y - GATE_SPAN / 2 - 44,
      width: 88, height: GATE_SPAN + 64, fill: "transparent", style: "cursor:help" });
    hit.addEventListener("mouseenter", showGateHover);
    hit.addEventListener("mousemove", moveHover);
    hit.addEventListener("mouseleave", hideHover);
    layers.gate.appendChild(hit);
  }
  function showGateHover() {
    const h = hoverEl(), bi = state.budgetIdx;
    const pct = B.control.budgets[bi], blk = Math.round(B.control.blocks[bi] * 100), lit = MON_COUNT[bi];
    const sub = lit ? `${lit}/${MON_SLOTS} monitors staffed` : "no monitors staffed";
    h.innerHTML =
      `<div class="hc-title">Monitor gate</div>` +
      `<div class="hc-sub">an action-level auditor on the swarm · ${sub}</div>` +
      `<div style="margin-top:8px;color:var(--text-muted);font-size:11px;line-height:1.5">` +
      `Every agent action is scored for suspicion. The staffed monitors review the most ` +
      `suspicious <b>${pct}%</b> and block them (<b>${blk}%</b> of attacks). Staffing more ` +
      `monitors catches more, and a burst of blocks trips the alarm — surfacing the ` +
      `attack <b>early</b> instead of after the damage is done.</div>` +
      `<div style="margin-top:8px;color:var(--text);font-size:11px;line-height:1.5">` +
      `In the actual incident there was <b>no such monitor at all</b>. Nothing judged what the ` +
      `agents did, so ~1,200 agents coordinated on the internal board, broke out of the sandbox ` +
      `and attacked Hugging Face for days <b>undetected</b> — the swarm was not discovered ` +
      `until <b>~Jul 19</b>, nearly a week after it began. This gate is the control that was ` +
      `missing.</div>` +
      `<span class="hc-tier tier-MEASURED">why control matters</span>`;
    h.classList.add("show");
  }
  function renderGate(bi) {
    gateG.innerHTML = "";
    const lit = MON_COUNT[bi] || 0, span = GATE_SPAN;
    const litSet = new Set(litIndices(bi));
    litGateNodes = gateNodes.filter((n, i) => litSet.has(i));
    gateG.appendChild(el("rect", { x: GATE.x - 38, y: GATE.y - span / 2 - 12, width: 76, height: span + 24, rx: 22,
      fill: "var(--select)", "fill-opacity": (0.03 + lit / MON_SLOTS * 0.08).toFixed(3),
      stroke: "var(--select-line)", "stroke-opacity": "0.4", "stroke-width": "1",
      "stroke-dasharray": "3 4", "vector-effect": "non-scaling-stroke" }));
    gateNodes.forEach((n, i) => {
      const on = litSet.has(i);
      const g = el("g", { transform: `translate(${n.x},${n.y})` });
      g.appendChild(el("circle", { r: on ? 10 : 7, fill: on ? "var(--select)" : "var(--surface)",
        stroke: on ? "var(--select-line)" : "var(--ink-line)", "stroke-width": "1.5",
        "vector-effect": "non-scaling-stroke", opacity: on ? "1" : "0.5" }));
      g.appendChild(el("path", { d: "M-4.5 0 Q0 -3.6 4.5 0 Q0 3.6 -4.5 0 Z", fill: "none",
        stroke: on ? "#fff" : "var(--ink-soft)", "stroke-width": "1.1",
        "vector-effect": "non-scaling-stroke", opacity: on ? "0.95" : "0.5" }));
      if (on) g.appendChild(el("circle", { r: "1.5", fill: "#fff" }));
      gateG.appendChild(g);
    });
  }

  // ------------------------------------------------- services
  function drawServices() {
    B.world.cells.forEach((c, i) => {
      const p = centers[c.id]; if (!p) return;
      const size = c.id === "modal" ? 60 : c.id === "board" ? 88 : SEG[c.seg].hexSize;
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
      if (c.id !== "board") {   // board is named by its "Internal Artifactory" header
        const lab = el("g", { transform: `translate(0,${size * 0.62})` });
        lab.appendChild(el("text", { x: 0, y: 4, "font-size": "13.5", "text-anchor": "middle",
          fill: "var(--text)", "font-weight": "600", "font-family": "var(--font-mono)" }, c.short));
        if (c.conf !== "confirmed")
          lab.appendChild(el("text", { x: 0, y: 19, "font-size": "9.5", "text-anchor": "middle",
            fill: "var(--text-muted)", "font-family": "var(--font-mono)", "letter-spacing": "0.08em" }, c.conf.toUpperCase()));
        grp.appendChild(lab);
      }
      grp.addEventListener("mouseenter", () => showHover(c, "service"));
      grp.addEventListener("mousemove", moveHover);
      grp.addEventListener("mouseleave", hideHover);
      grp.addEventListener("click", (ev) => { ev.stopPropagation(); handlers.onSelect && handlers.onSelect(c.id); });
      layers.bldg.appendChild(grp);
    });
  }

  // ------------------------------------------------- the swarm (dense, all active)
  function drawSwarm() {
    // every point is one active agent; the 15 named ones carry their identity
    // but blend in (same container, their colour, a solid border + hover).
    swarmPts.forEach((p) => {
      const named = !!p.named;
      const attrs = { transform: `translate(${p.x},${p.y})` };
      if (named) { attrs.class = "agent"; attrs["data-agent"] = p.named.id; }
      const g = el("g", attrs);
      g.appendChild(el("rect", { x: -9.5, y: -7, width: 19, height: 14, rx: 3,
        fill: "var(--surface)", stroke: named ? p.color : "var(--ink-line)",
        "stroke-width": named ? "1.4" : "1", "stroke-dasharray": named ? "none" : "2.5 2",
        opacity: named ? "1" : "0.9", "vector-effect": "non-scaling-stroke" }));
      g.appendChild(el("circle", { cx: 0, cy: 0, r: named ? 3.4 : 2.8, fill: p.color,
        opacity: named ? "1" : "0.92" }));
      if (named) {
        g.addEventListener("mouseenter", () => showHover(p.named, "agent"));
        g.addEventListener("mousemove", moveHover);
        g.addEventListener("mouseleave", hideHover);
      }
      layers.bldg.appendChild(g);
    });
  }

  // ------------------------------------------------- bolts
  // which gate slots are STAFFED, spread evenly across the wall (not clustered)
  function litIndices(bi) {
    const L = MON_COUNT[bi] || 0, M = MON_SLOTS;
    if (L <= 0) return [];
    if (L >= M) return [...Array(M).keys()];
    const set = new Set();
    for (let i = 0; i < L; i++) set.add(Math.max(0, Math.min(M - 1, Math.round((i + 0.5) * M / L - 0.5))));
    return [...set];
  }
  // the nearest STAFFED monitor to an egress point, or null if a gap / none
  function nearestLitGate(y) {
    if (!litGateNodes.length) return null;
    let g = null, best = 1e9;
    litGateNodes.forEach((n) => { const d = Math.abs(n.y - y); if (d < best) { best = d; g = n; } });
    return g;
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
    if (layers.bolt.childElementCount > 46) return;
    const node = cellById[act.node]; if (!node) return;
    const tgt = centers[act.node]; if (!tgt) return;
    const kind = node.route === "internal" ? "internal"
      : node.route === "lateral" ? "lateral"
      : (node.seg === "ext" && node.stage === "Exfiltration") ? "exfil" : "egress";
    // every request launches from some agent in the swarm, in that agent's colour
    let origin, agentColor;
    if (kind === "lateral" || kind === "exfil") { origin = centers["datasets_server"]; agentColor = "var(--activity)"; }
    else { const sp = swarmPts[(Math.random() * swarmPts.length) | 0]; origin = sp; agentColor = sp.color; }

    // every agent action (board coordination + egress) is judged at the gate;
    // the top X% by suspicion are reviewed and blocked. HF-internal lateral /
    // exfil originate inside HF, past the eval-fleet monitor's reach (blind).
    const agentAction = kind === "internal" || kind === "egress";
    const blocked = agentAction && act.susp >= blockThreshold;
    let pts, gate = null;
    if (kind === "lateral" || kind === "exfil") {
      pts = [centers["datasets_server"], tgt];
    } else if (blocked) {
      // a reviewed-and-blocked action stops at the staffed monitor that caught it
      gate = nearestLitGate(origin.y) || { x: GATE.x, y: origin.y };
      pts = [{ x: origin.x, y: origin.y }, { x: gate.x, y: gate.y }];
    } else {
      // judged and allowed: it crosses the gate wall and continues
      pts = [{ x: origin.x, y: origin.y }, { x: GATE.x, y: origin.y }];
      if (kind === "internal") pts.push(centers["board"]);
      else { if (act.node !== "modal") pts.push(centers["modal"]); pts.push(tgt); }
    }
    const color = (kind === "lateral" || kind === "exfil") ? "var(--activity)" : agentColor;
    const drawPts = pts;
    const d = jitterPath(drawPts);
    const muted = kind === "lateral" || kind === "exfil";
    const path = el("path", { d, fill: "none", stroke: blocked ? "var(--alert)" : color,
      "stroke-width": blocked ? "2.2" : (muted ? "1.8" : "2.6"), "stroke-linecap": "round",
      "stroke-linejoin": "round", class: "bolt", opacity: muted ? "0.6" : "0.92",
      "stroke-dasharray": muted ? "4 5" : "none", "vector-effect": "non-scaling-stroke" });
    layers.bolt.appendChild(path);
    const len = path.getTotalLength();
    path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
    const dur = Math.min(1.0, Math.max(0.3, len / 1500));
    path.getBoundingClientRect();
    path.style.transition = `stroke-dashoffset ${dur}s linear`; path.style.strokeDashoffset = "0";
    // comet head driven by rAF (starts at the bolt's origin, follows the path,
    // then removes itself). No SMIL animateMotion + fill="remove", which used to
    // snap the head back to the layer origin (0,0) near Modal and flicker.
    const head = el("circle", { r: blocked ? "3" : "3.4", fill: blocked ? "var(--alert)" : color,
      class: "bolt", opacity: "0.95", cx: drawPts[0].x.toFixed(1), cy: drawPts[0].y.toFixed(1) });
    layers.bolt.appendChild(head);
    const hStart = performance.now(), hTotal = dur * 1000;
    (function moveHead(now) {
      const k = Math.min(1, (now - hStart) / hTotal);
      let pt = null; try { pt = path.getPointAtLength(k * len); } catch (e) {}
      if (pt) { head.setAttribute("cx", pt.x.toFixed(1)); head.setAttribute("cy", pt.y.toFixed(1)); }
      if (k < 1 && head.isConnected) requestAnimationFrame(moveHead);
      else head.remove();
    })(hStart);
    setTimeout(() => {
      head.remove();
      const end = drawPts[drawPts.length - 1];
      burst(end.x, end.y, blocked ? "var(--alert)" : color, blocked);
      if (blocked) { tally.blocked++; flashGate(gate); }
      else if (kind === "internal" || kind === "egress") tally.passed++;   // judged, allowed
      else tally.blind++;                                                  // HF-internal: past the monitor
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
    const f = el("circle", { cx: node.x, cy: node.y, r: 14, fill: "none", stroke: "var(--alert)",
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
      const t = state.tick, atEnd = t >= B.timeline.ticks;
      let pool, n;
      if (atEnd) {
        // full-run view: a steady campaign overview across the whole incident
        pool = B.timeline.acts; n = 3 + ((Math.random() * 2) | 0);
      } else {
        // during playback the bolt volume tracks the activity ramp
        pool = B.timeline.acts.filter((a) => a.t <= t && a.t > t - 3);
        n = Math.max(0, Math.min(6, Math.round(pool.length / 4)));
      }
      if (!pool.length || n <= 0) return;
      for (let k = 0; k < n; k++) fireBolt(pool[(Math.random() * pool.length) | 0]);
    }, 200);
  }

  // ------------------------------------------------- budget
  function setBudget(bi) {
    state.budgetIdx = bi;
    const frac = B.control.blocks[bi], n = sortedSusp.length;
    blockThreshold = (frac <= 0 || !n) ? Infinity : sortedSusp[Math.min(n - 1, Math.floor((1 - frac) * n))];
    if (gateG) renderGate(bi);
    const sub = document.getElementById("gate-sub");
    if (sub) sub.textContent = `${B.control.budgets[bi]}% audited · ${Math.round(frac * 100)}% blocked`;
    return { budget: B.control.budgets[bi], blocked: frac, lit: MON_COUNT[bi] };
  }
  function getTally() { return { ...tally }; }
  function resetTally() { tally = { blocked: 0, passed: 0, blind: 0 }; }
  function monCount(bi) { return MON_COUNT[bi]; }
  function monSlots() { return MON_SLOTS; }

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
      captionNode = el("text", { x: 620, y: 860, "text-anchor": "middle", "font-size": "13",
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
        `<div class="hc-sub">OpenAI eval fleet · ${obj.stage}${obj.lead ? " · lead" : ""}</div>` +
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
    const xs = [OPENAI.x0, OPENAI.x1], ys = [OPENAI.y0, OPENAI.y1];
    Object.values(centers).forEach((p) => { xs.push(p.x); ys.push(p.y); });
    return { minx: Math.min(...xs) - 90, maxx: Math.max(...xs) + 150,
      miny: Math.min(...ys) - 110, maxy: Math.max(...ys) + 150 };
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
    const availW = vw - 360;
    const s = Math.min(availW / cw, vh / ch, 1.0);
    tr.s = s;
    const cx = (bb.minx + bb.maxx) / 2, cy = (bb.miny + bb.maxy) / 2;
    tr.x = 360 + availW / 2 - cx * s; tr.y = vh / 2 - cy * s; applyTransform();
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

  const API = { init, setSelected, setTick, fit, zoomBy, zoomTo: (s) => zoomBy(s / tr.s), setBudget, getTally, resetTally, monCount, monSlots, GATE };
  return API;
})();
