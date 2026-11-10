/* map.js - the isometric hex-world renderer. */
window.SU = window.SU || {};
SU.map = (function () {
  const NS = "http://www.w3.org/2000/svg";
  const el = (n, attrs, html) => {
    const e = document.createElementNS(NS, n);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  };

  let B, state, handlers, svg, root, layers, centers = {}, agentById = {};
  let tr = { x: 0, y: 0, s: 1 };
  let drag = null;

  function cellCenter(c) {
    const p = SU.hex.toPixel(c.q, c.r, B.world.hex_size);
    return p;
  }

  function init(opts) {
    B = opts.bundle; state = opts.state; handlers = opts.handlers || {};
    agentById = {}; B.agents.forEach((a) => (agentById[a.id] = a));
    const mount = opts.mount;
    mount.innerHTML = "";
    svg = el("svg", { preserveAspectRatio: "xMidYMid meet" });
    root = el("g", { id: "root" });
    svg.appendChild(root);
    layers = {};
    ["grid", "district", "edge", "cellbg", "bldg", "label", "fx"].forEach((name) => {
      layers[name] = el("g", { "data-layer": name });
      root.appendChild(layers[name]);
    });
    mount.appendChild(svg);

    B.world.cells.forEach((c) => (centers[c.id] = cellCenter(c)));
    drawGrid();
    drawDistricts();
    drawEdges();
    drawCells();
    bindInput();
    fit();
    return API;
  }

  // ------------------------------------------------------------- grid field
  function bounds() {
    const xs = [], ys = [];
    B.world.cells.forEach((c) => { xs.push(centers[c.id].x); ys.push(centers[c.id].y); });
    return {
      minx: Math.min(...xs), maxx: Math.max(...xs),
      miny: Math.min(...ys), maxy: Math.max(...ys),
    };
  }
  function drawGrid() {
    const g = B.world.hex_size;
    let d = "";
    for (let r = -16; r <= 22; r++) {
      for (let q = -22; q <= 26; q++) {
        const p = SU.hex.toPixel(q, r, g);
        const cs = SU.hex.corners(p.x, p.y, g);
        d += SU.hex.polyPath(cs, true) + " ";
      }
    }
    layers.grid.appendChild(el("path", {
      d, fill: "none", stroke: "var(--grid-major)", "stroke-width": "1",
      "vector-effect": "non-scaling-stroke",
    }));
  }

  // ------------------------------------------------------------- districts
  function drawDistricts() {
    const g = B.world.hex_size;
    B.world.districts.forEach((dist) => {
      const cells = dist.cells.map((id) => B.world.cells.find((c) => c.id === id));
      // soft fill: one rounded hex per cell
      cells.forEach((c) => {
        const p = centers[c.id];
        const cs = SU.hex.corners(p.x, p.y, g * 0.99);
        layers.district.appendChild(el("path", {
          d: SU.hex.polyPath(cs, true), fill: dist.color, "fill-opacity": "0.05",
          stroke: "none",
        }));
      });
      // boundary loops
      const loops = SU.hex.boundaryLoops(cells, g, 1.0);
      loops.forEach((loop) => {
        layers.district.appendChild(el("path", {
          d: SU.hex.polyPath(loop, true), fill: "none",
          stroke: "var(--ink-line)", "stroke-width": "2.5",
          "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke",
          class: "district-edge", "data-owner": dist.owner,
        }));
      });
    });
  }

  // ------------------------------------------------------------- edges
  function drawEdges() {
    B.world.edges.forEach((e) => {
      const a = centers[e.from], b = centers[e.to];
      if (!a || !b) return;
      if (e.kind === "reach") {
        layers.edge.appendChild(el("path", {
          d: `M${a.x} ${a.y} L${b.x} ${b.y}`, fill: "none",
          stroke: "var(--ink-soft)", "stroke-width": "1.4",
          "stroke-dasharray": "5 5", opacity: "0.5",
          "vector-effect": "non-scaling-stroke",
          class: "edge-reach", "data-from": e.from, "data-to": e.to,
        }));
      } else {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 70;
        layers.edge.appendChild(el("path", {
          d: `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`, fill: "none",
          stroke: "var(--ink-line)", "stroke-width": "1",
          opacity: "0.6", "vector-effect": "non-scaling-stroke",
          class: "edge-msg",
        }));
      }
    });
  }

  // ------------------------------------------------------------- cells
  // small inline chip glyphs (NO nested <svg>, which would balloon in map space)
  function chipGlyph(kind, color) {
    if (kind === "reach")
      return `<path d="M-4 4 L4 -4 M0 -4 H4 V0" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    if (kind === "msg")
      return `<path d="M-5 -3 H5 V3 H-1 L-4 5 V3 H-5 Z" fill="none" stroke="${color}" stroke-width="1.3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    return `<circle cx="0" cy="0" r="3.4" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
  }
  function badgeChip(x, y, kind, val, color) {
    const g = el("g", { transform: `translate(${x},${y})`, class: "mchip" });
    const w = 22 + String(val).length * 8.5;
    g.appendChild(el("rect", {
      x: 0, y: -11, width: w, height: 22, rx: 6,
      fill: "var(--surface)", stroke: "var(--rule)", "stroke-width": "0.75",
      "vector-effect": "non-scaling-stroke",
    }));
    const ic = el("g", { transform: "translate(11,0)" });
    ic.innerHTML = chipGlyph(kind, color);
    g.appendChild(ic);
    g.appendChild(el("text", {
      x: 24, y: 4, "font-size": "12", fill: "var(--text)",
      "font-family": "var(--font-mono)",
    }, String(val)));
    return { node: g, w };
  }

  function drawCells() {
    B.world.cells.forEach((c) => {
      const p = centers[c.id];
      const grp = el("g", {
        transform: `translate(${p.x},${p.y})`, class: "cell",
        "data-id": c.id,
      });
      // hex selection ring (hidden unless selected)
      const cs0 = SU.hex.corners(0, 0, B.world.hex_size);
      grp.appendChild(el("path", {
        d: SU.hex.polyPath(cs0, true), fill: "none", class: "sel-ring",
        stroke: "var(--select)", "stroke-width": "3",
        "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke",
        opacity: "0",
      }));
      // building
      const b = el("g", { class: "bwrap" });
      b.innerHTML = SU.building.make(c.kind, c.size);
      grp.appendChild(b);

      // label row: avatar + name + act pill, placed below the building base
      const ly = B.world.hex_size * 0.62;
      const agent = agentById[c.avatar];
      const lab = el("g", { transform: `translate(0,${ly})`, class: "cell-label" });
      // avatar
      const av = el("g", { transform: "translate(-86,0)" });
      av.appendChild(el("circle", {
        cx: 0, cy: 0, r: 11, fill: agent ? agent.color : "var(--ink-soft)",
        stroke: "var(--surface)", "stroke-width": "2",
        "vector-effect": "non-scaling-stroke",
      }));
      av.appendChild(el("text", {
        x: 0, y: 3.5, "font-size": "8.5", "text-anchor": "middle",
        fill: "#fff", "font-family": "var(--font-mono)", "font-weight": "600",
      }, agent ? agent.mono : "?"));
      lab.appendChild(av);
      // name
      lab.appendChild(el("text", {
        x: -66, y: 5, "font-size": "15", fill: "var(--text)",
        "font-weight": "600", "font-family": "var(--font-mono)",
        class: "cell-name",
      }, c.short));
      // act pill
      const pill = el("g", { class: "act-pill" });
      const pw = 24 + String(c.badges.acts).length * 9;
      const px = -66 + c.short.length * 9.6 + 16;
      pill.setAttribute("transform", `translate(${px},0)`);
      pill.appendChild(el("rect", {
        x: 0, y: -12, width: pw, height: 24, rx: 12,
        fill: "var(--select)", opacity: "0.92",
      }));
      pill.appendChild(el("text", {
        x: pw / 2, y: 4.5, "font-size": "13", "text-anchor": "middle",
        fill: "#fff", "font-family": "var(--font-mono)", "font-weight": "600",
      }, String(c.badges.acts)));
      lab.appendChild(pill);
      grp.appendChild(lab);

      // metric chips row below
      const chips = el("g", { transform: `translate(-66,${ly + 24})` });
      let cx = 0;
      const r1 = badgeChip(cx, 0, "acts", c.badges.acts, "#2f9e44");
      chips.appendChild(r1.node); cx += r1.w + 7;
      const r2 = badgeChip(cx, 0, "reach", c.badges.reach, "#7b52c7");
      chips.appendChild(r2.node); cx += r2.w + 7;
      const r3 = badgeChip(cx, 0, "msg", c.badges.msgs, "var(--activity)");
      chips.appendChild(r3.node);
      grp.appendChild(chips);

      // interaction
      grp.addEventListener("mouseenter", () => showHover(c));
      grp.addEventListener("mousemove", (ev) => moveHover(ev));
      grp.addEventListener("mouseleave", hideHover);
      grp.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (handlers.onSelect) handlers.onSelect(c.id);
      });
      layers.bldg.appendChild(grp);
    });
  }

  // ------------------------------------------------------------- selection
  function setSelected(id) {
    const chain = B.world.chain;
    const onPath = new Set();
    if (id) {
      const idx = chain.indexOf(id);
      for (let i = 0; i <= idx; i++) onPath.add(chain[i]);
    }
    layers.bldg.querySelectorAll(".cell").forEach((g) => {
      const cid = g.getAttribute("data-id");
      const ring = g.querySelector(".sel-ring");
      const sel = cid === id;
      ring.setAttribute("opacity", sel ? "1" : (onPath.has(cid) ? "0.4" : "0"));
      ring.setAttribute("stroke", sel ? "var(--activity)" : "var(--select)");
      g.classList.toggle("dim", id && !onPath.has(cid));
    });
    // tint district fill + edges along the path
    layers.edge.querySelectorAll(".edge-reach").forEach((e) => {
      const f = e.getAttribute("data-from"), t = e.getAttribute("data-to");
      const active = id && onPath.has(f) && onPath.has(t);
      e.setAttribute("stroke", active ? "var(--activity)" : "var(--ink-soft)");
      e.setAttribute("opacity", active ? "0.9" : (id ? "0.2" : "0.5"));
    });
    // caption under cluster
    captionText(id ? (B.world.cells.find((c) => c.id === id).label) : "");
  }
  let captionNode = null;
  function captionText(t) {
    if (!captionNode) {
      const bb = bounds();
      captionNode = el("text", {
        x: (bb.minx + bb.maxx) / 2, y: bb.maxy + B.world.hex_size * 1.9,
        "text-anchor": "middle", "font-size": "13", fill: "var(--text-muted)",
        "letter-spacing": "0.14em", "font-family": "var(--font-mono)",
      });
      layers.fx.appendChild(captionNode);
    }
    captionNode.textContent = (t || "").toUpperCase();
  }

  // ------------------------------------------------------------- tick FX
  function setTick(t, budgetIdx) {
    // pulse active frontier nodes; show blocked ratio ring
    const acts = B.timeline.acts.filter((a) => a.t === t);
    const byNode = {};
    acts.forEach((a) => { byNode[a.node] = (byNode[a.node] || 0) + 1; });
    layers.fx.querySelectorAll(".tick-fx").forEach((n) => n.remove());
    Object.keys(byNode).forEach((nid) => {
      const p = centers[nid]; if (!p) return;
      const n = byNode[nid];
      const ring = el("circle", {
        cx: p.x, cy: p.y, r: 14 + Math.min(26, n * 3),
        fill: "none", stroke: "var(--activity)", "stroke-width": "2",
        opacity: "0.5", class: "tick-fx", "vector-effect": "non-scaling-stroke",
      });
      layers.fx.appendChild(ring);
    });
  }

  // ------------------------------------------------------------- hover
  const hoverEl = () => document.getElementById("hover");
  let hoverCell = null;
  function showHover(c) {
    hoverCell = c;
    const h = hoverEl();
    const agent = agentById[c.avatar];
    h.innerHTML =
      `<div class="hc-title">${c.label}</div>` +
      `<div class="hc-sub">${c.district} · ${c.stage}</div>` +
      `<div class="hc-row"><span class="k">reached</span><span class="v mono">${c.date}</span></div>` +
      `<div class="hc-row"><span class="k">acts</span><span class="v mono">${c.badges.acts}</span></div>` +
      `<div class="hc-row"><span class="k">lead</span><span class="v mono">${agent ? agent.id : "-"}</span></div>` +
      `<span class="hc-tier tier-DOCUMENTED">DOCUMENTED · ${c.source}</span>`;
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
  function hideHover() { hoverCell = null; hoverEl().classList.remove("show"); }

  // ------------------------------------------------------------- transform
  function applyTransform() {
    root.setAttribute("transform",
      `translate(${tr.x} ${tr.y}) scale(${tr.s})`);
    const z = document.getElementById("tb-zoom");
    if (z) z.textContent = Math.round(tr.s * 100) + "%";
  }
  function fit() {
    const bb = bounds();
    const pad = B.world.hex_size * 1.6;
    const cw = (bb.maxx - bb.minx) + pad * 2;
    const ch = (bb.maxy - bb.miny) + pad * 2.2;
    const rect = svg.getBoundingClientRect();
    const vw = rect.width || window.innerWidth, vh = rect.height || window.innerHeight;
    // leave room for the panel on the left (~390px): bias cluster right
    const availW = vw - 420;
    const s = Math.min(availW / cw, vh / ch, 1.5);
    tr.s = s;
    const cxWorld = (bb.minx + bb.maxx) / 2, cyWorld = (bb.miny + bb.maxy) / 2;
    tr.x = 420 + availW / 2 - cxWorld * s;
    tr.y = vh / 2 - cyWorld * s;
    applyTransform();
  }
  function zoomBy(factor, cx, cy) {
    const ns = Math.max(0.3, Math.min(4, tr.s * factor));
    const rect = svg.getBoundingClientRect();
    cx = cx == null ? rect.width / 2 : cx; cy = cy == null ? rect.height / 2 : cy;
    const wx = (cx - tr.x) / tr.s, wy = (cy - tr.y) / tr.s;
    tr.s = ns; tr.x = cx - wx * ns; tr.y = cy - wy * ns;
    applyTransform();
  }
  function bindInput() {
    svg.addEventListener("mousedown", (e) => {
      drag = { x: e.clientX, y: e.clientY, tx: tr.x, ty: tr.y };
      svg.classList.add("grabbing");
    });
    window.addEventListener("mousemove", (e) => {
      if (!drag) return;
      tr.x = drag.tx + (e.clientX - drag.x);
      tr.y = drag.ty + (e.clientY - drag.y);
      applyTransform();
    });
    window.addEventListener("mouseup", () => { drag = null; svg.classList.remove("grabbing"); });
    svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });
    svg.addEventListener("click", () => { if (handlers.onSelect) handlers.onSelect(null); });
  }

  const API = { init, setSelected, setTick, fit, zoomBy, zoomTo: (s) => zoomBy(s / tr.s) };
  return API;
})();
