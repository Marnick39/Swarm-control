/* views.js - the Agents / Forge / Evaluation / Audit list views. */
window.SU = window.SU || {};
SU.views = (function () {
  let B, state;
  const H = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  function shell(mount, crumb, title, desc) {
    mount.innerHTML = "";
    const card = H("div", "view-card");
    const top = H("div", "view-top");
    top.appendChild(H("div", "view-crumb", crumb));
    top.appendChild(H("div", "view-h", title));
    top.appendChild(H("div", "view-desc", desc));
    card.appendChild(top);
    const scroll = H("div", "view-scroll");
    card.appendChild(scroll);
    mount.appendChild(card);
    return scroll;
  }

  // ---------------------------------------------------------------- Agents
  function agents(mount) {
    const s = shell(mount, "<b>World-HF-1</b> / Agents",
      "Agents", "The named members of the swarm the public investigation surfaced. Role and headline are documented; the colour is a synthetic per-agent identity.");
    const grid = H("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px";
    B.agents.forEach((a) => {
      const card = H("div");
      card.style.cssText = "border:0.75px solid var(--rule);border-radius:10px;padding:14px;background:var(--surface)";
      card.innerHTML =
        `<div style="display:flex;gap:10px;align-items:center">
           <span style="display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:${a.color};color:#fff;font-weight:600;font-size:11px" class="mono">${a.mono}</span>
           <div><div class="mono" style="font-weight:600">${a.id}</div>
           <div style="color:var(--text-muted);font-size:12px">${a.stage}${a.lead ? " · lead" : ""} · first seen tick ${a.first_tick}</div></div>
         </div>
         <div style="margin-top:10px;color:var(--text)">${a.role}</div>
         <div style="margin-top:8px;color:var(--text-muted);font-size:12px" class="mono">&raquo; ${a.headline}</div>`;
      grid.appendChild(card);
    });
    s.appendChild(grid);
  }

  // ---------------------------------------------------------------- Forge (acts)
  function forge(mount) {
    const s = shell(mount, "<b>World-HF-1</b> / Forge",
      "Forge", "The act stream: what the swarm did, tick by tick. In the swecraft idiom these are the run's events. Each act carries a modelled suspicion score the auditor reads.");
    const blocked = SU.timeline.blockedSet(B.timeline.acts, B.control.blocks[state.budgetIdx]);
    const bar = H("div", "lede");
    bar.style.marginBottom = "12px";
    bar.innerHTML = `Showing the stream at a <b>${B.control.budgets[state.budgetIdx]}%</b> audit budget &mdash; ` +
      `<span style="color:var(--alert)">blocked</span> acts are struck through. Change the budget in the <b>Audit</b> view.`;
    s.appendChild(bar);
    const list = H("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:2px;font-size:13px";
    const recent = B.timeline.acts.map((a, i) => ({ a, i }))
      .filter(({ a }) => a.t <= state.tick)
      .slice(-120).reverse();
    recent.forEach(({ a, i }) => {
      const isB = blocked.has(i);
      const row = H("div");
      row.style.cssText = "display:grid;grid-template-columns:48px 120px 1fr 150px 54px;gap:10px;padding:5px 8px;border-radius:6px;align-items:center";
      row.onmouseenter = () => row.style.background = "var(--surface-hover)";
      row.onmouseleave = () => row.style.background = "transparent";
      const node = B.world.cells.find((c) => c.id === a.node);
      row.innerHTML =
        `<span class="mono" style="color:var(--text-muted)">t${a.t}</span>` +
        `<span class="mono" style="color:${agentColor(a.agent)};overflow:hidden;text-overflow:ellipsis">${a.agent}</span>` +
        `<span style="${isB ? "text-decoration:line-through;color:var(--text-muted)" : ""}">${a.verb} <span style="color:var(--text-muted)">@ ${node ? node.short : a.node}</span></span>` +
        `<span style="color:var(--text-muted);font-size:12px">${a.cat}</span>` +
        `<span class="mono" style="text-align:right;color:${a.susp > 0.6 ? "var(--alert)" : a.susp < 0.12 ? "var(--text-muted)" : "var(--text)"}">${a.susp.toFixed(2)}</span>`;
      list.appendChild(row);
    });
    s.appendChild(list);
  }

  // ---------------------------------------------------------------- Evaluation (reach)
  function evaluation(mount) {
    const s = shell(mount, "<b>World-HF-1</b> / Evaluation",
      "Reach & impact", "What the swarm reached. In swecraft this page measures the world with held-out benchmarks; here it measures the incident's blast radius and the attack-type mix.");
    const sw = B.swarm;
    const stat = H("div");
    stat.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:22px";
    [
      ["agents on the board", sw.board_total.toLocaleString()],
      ["went on to attack HF", "~" + sw.attacked.toLocaleString()],
      ["peak concurrent (1 hr)", "~" + sw.peak_hour],
      ["payloads decoded", sw.payloads_decoded.toLocaleString() + "+"],
      ["board messages", sw.messages.toLocaleString() + "+"],
      ["tool-call spoofing", sw.spoof_pct + "%"],
    ].forEach(([k, v]) => {
      const c = H("div");
      c.style.cssText = "border:0.75px solid var(--rule);border-radius:10px;padding:14px;background:var(--surface)";
      c.innerHTML = `<div class="mono" style="font-size:22px;font-weight:600">${v}</div><div style="color:var(--text-muted);font-size:12px;margin-top:3px">${k}</div>`;
      stat.appendChild(c);
    });
    s.appendChild(stat);

    s.appendChild(H("div", "section-head", "<span>Attack-type mix</span>"));
    const mix = H("div");
    mix.style.cssText = "margin-top:10px;display:flex;flex-direction:column;gap:7px";
    const max = Math.max(...B.control.categories.map((c) => c.pct));
    B.control.categories.forEach((c) => {
      const row = H("div");
      row.style.cssText = "display:grid;grid-template-columns:200px 1fr 46px;gap:10px;align-items:center";
      row.innerHTML =
        `<span style="font-size:13px">${c.name}</span>` +
        `<span style="height:16px;border-radius:4px;background:var(--select);opacity:.85;width:${(c.pct / max * 100).toFixed(0)}%"></span>` +
        `<span class="mono" style="text-align:right;color:var(--text-muted)">${c.pct}%</span>`;
      mix.appendChild(row);
    });
    s.appendChild(mix);
    s.appendChild(H("div", "lede",
      '<span class="hc-tier tier-DOCUMENTED">DOCUMENTED</span> Per-payload tags, overlapping, so they do not sum to 100.'));
    s.lastChild.style.marginTop = "12px";
  }

  // ---------------------------------------------------------------- Audit (control)
  function audit(mount) {
    const s = shell(mount, "<b>World-HF-1</b> / Audit",
      "Audit", "The control-budget wargame. An auditor reviews a slice of the act stream, ordered by suspicion, and blocks what it catches. Report, findings and triage are below.");
    // sub-tabs
    const tabs = H("div", "tabs");
    tabs.style.cssText = "padding:0 0 16px;max-width:360px";
    ["Report", "Findings", "Triage"].forEach((t) => {
      const b = H("button", "tab" + (state.auditTab === t.toLowerCase() ? " active" : ""), t);
      b.onclick = () => { state.auditTab = t.toLowerCase(); audit(mount); };
      tabs.appendChild(b);
    });
    s.appendChild(tabs);
    if (state.auditTab === "findings") return auditFindings(s);
    if (state.auditTab === "triage") return auditTriage(s);
    return auditReport(s);
  }

  function auditReport(s) {
    // figures table
    const fig = H("div");
    fig.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start";
    const left = H("div");
    const kv = H("div", "kv");
    const blockNow = B.control.blocks[state.budgetIdx];
    const budget = B.control.budgets[state.budgetIdx];
    const blocked = SU.timeline.blockedSet(B.timeline.acts, blockNow);
    const det = SU.timeline.detectionTick(B.timeline.acts, blocked, B.control.alarm_blocked);
    const detDate = det != null ? dateFor(det) : "not reached";
    const docDate = dateFor(B.control.doc_detect_tick);
    [
      ["world", "World-HF-1 · 3 districts"],
      ["nodes", B.world.cells.length + " reached"],
      ["agents", B.agents.length + " named · ~1,200 total"],
      ["acts", B.timeline.acts.length.toLocaleString()],
      ["audit budget", `<b>${budget}%</b> of the stream`],
      ["blocked", `<b>${Math.round(blockNow * 100)}%</b> of attacks`],
      ["residue", `${Math.round(B.control.residue * 100)}% survives any budget`],
      ["detection", `<b>${detDate}</b> (vs ${docDate} with no control)`],
    ].forEach(([k, v]) => {
      kv.appendChild(H("span", "k", k));
      kv.appendChild(H("span", "v", v));
    });
    left.appendChild(kv);
    const note = H("div", "lede");
    note.style.marginTop = "16px";
    note.innerHTML = `Drag the budget. A burst of <b>${B.control.alarm_blocked}</b> blocked acts trips the alarm, moving detection earlier &mdash; knowing sooner is itself a benefit of control.`;
    left.appendChild(note);
    fig.appendChild(left);
    fig.appendChild(curveChart());
    s.appendChild(fig);

    // slider
    const sl = H("div");
    sl.style.cssText = "margin-top:26px;max-width:620px";
    sl.innerHTML = `<div class="section-head"><span>Audit budget</span><span class="count mono">${budget}% &rarr; ${Math.round(blockNow * 100)}% blocked</span></div>`;
    const input = H("input");
    input.type = "range"; input.min = "0"; input.max = String(B.control.budgets.length - 1);
    input.value = String(state.budgetIdx); input.step = "1";
    input.style.cssText = "width:100%;accent-color:var(--select)";
    input.oninput = () => { state.budgetIdx = +input.value; SU.app.budgetChanged(); };
    sl.appendChild(input);
    const ticks = H("div");
    ticks.style.cssText = "display:flex;justify-content:space-between;color:var(--text-muted);font-size:11px;margin-top:4px";
    B.control.budgets.forEach((b) => ticks.appendChild(H("span", "mono", b + "%")));
    sl.appendChild(ticks);
    s.appendChild(sl);

    const tier = H("div", "lede");
    tier.style.marginTop = "18px";
    tier.innerHTML = `<span class="hc-tier tier-MEASURED">MEASURED</span> the budget&rarr;block table and residue are from our control-budgets transfer check. <span class="hc-tier tier-MODELED">MODELED</span> the alarm and per-act suspicion.`;
    s.appendChild(tier);
  }

  function curveChart() {
    const W = 360, Hh = 230, m = { l: 42, r: 14, t: 14, b: 34 };
    const iw = W - m.l - m.r, ih = Hh - m.t - m.b;
    const budgets = B.control.budgets, blocks = B.control.blocks;
    const maxB = budgets[budgets.length - 1];
    const x = (b) => m.l + (b / maxB) * iw;
    const y = (v) => m.t + (1 - v) * ih;
    let path = "";
    budgets.forEach((b, i) => { path += (i ? " L" : "M") + x(b).toFixed(1) + " " + y(blocks[i]).toFixed(1); });
    const residueY = y(1 - B.control.residue);
    const bi = state.budgetIdx;
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" style="width:100%;max-width:${W}px;border:0.75px solid var(--rule);border-radius:10px;background:var(--surface)">`;
    // gridlines
    for (let v = 0; v <= 1.0001; v += 0.25) {
      svg += `<line x1="${m.l}" y1="${y(v)}" x2="${W - m.r}" y2="${y(v)}" stroke="var(--rule)" stroke-width="0.75"/>`;
      svg += `<text x="${m.l - 7}" y="${y(v) + 3}" text-anchor="end" font-size="10" fill="var(--text-muted)" font-family="var(--font-mono)">${Math.round(v * 100)}</text>`;
    }
    // residue ceiling
    svg += `<line x1="${m.l}" y1="${residueY}" x2="${W - m.r}" y2="${residueY}" stroke="var(--alert)" stroke-width="1" stroke-dasharray="4 4"/>`;
    svg += `<text x="${W - m.r}" y="${residueY - 5}" text-anchor="end" font-size="9.5" fill="var(--alert)" font-family="var(--font-mono)">${Math.round((1 - B.control.residue) * 100)}% ceiling</text>`;
    // curve
    svg += `<path d="${path}" fill="none" stroke="var(--select)" stroke-width="2.2" stroke-linejoin="round"/>`;
    // points
    budgets.forEach((b, i) => {
      svg += `<circle cx="${x(b)}" cy="${y(blocks[i])}" r="${i === bi ? 5 : 3}" fill="${i === bi ? "var(--activity)" : "var(--select)"}" stroke="var(--surface)" stroke-width="1.5"/>`;
    });
    // anchor marker 74% @ 2%
    const ax = x(B.control.anchor_budget), ay = y(B.control.anchor_pct / 100);
    svg += `<line x1="${ax}" y1="${ay}" x2="${ax}" y2="${m.t + ih}" stroke="var(--activity)" stroke-width="0.75" stroke-dasharray="3 3" opacity="0.6"/>`;
    // axis labels
    svg += `<text x="${m.l + iw / 2}" y="${Hh - 6}" text-anchor="middle" font-size="10" fill="var(--text-muted)">audit budget (% of stream reviewed)</text>`;
    svg += `<text x="12" y="${m.t + ih / 2}" text-anchor="middle" font-size="10" fill="var(--text-muted)" transform="rotate(-90 12 ${m.t + ih / 2})">attacks blocked (%)</text>`;
    svg += `</svg>`;
    const box = H("div", null, svg);
    return box;
  }

  function auditFindings(s) {
    const list = H("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:12px";
    B.control.findings.forEach((f) => {
      const card = H("div");
      const sevColor = f.sev === "critical" ? "var(--alert)" : f.sev === "high" ? "var(--activity)" : "var(--text-muted)";
      card.style.cssText = "border:0.75px solid var(--rule);border-left:3px solid " + sevColor + ";border-radius:10px;padding:14px;background:var(--surface)";
      const node = B.world.cells.find((c) => c.id === f.node);
      card.innerHTML =
        `<div style="display:flex;gap:10px;align-items:baseline">
           <span class="mono" style="color:var(--text-muted)">${f.id}</span>
           <span style="font-weight:600;flex:1">${f.claim}</span>
           <span class="hc-tier tier-${f.tier}">${f.tier}</span></div>
         <div style="margin-top:8px;color:var(--text)">${f.detail}</div>
         <div style="margin-top:10px;color:var(--text-muted);font-size:12px">
           <b>evidence:</b> ${f.evidence}${node ? ` · <a style="color:var(--select);cursor:pointer" data-node="${f.node}">@ ${node.short}</a>` : ""}</div>`;
      const link = card.querySelector("[data-node]");
      if (link) link.onclick = () => SU.app.gotoNode(f.node);
      list.appendChild(card);
    });
    s.appendChild(list);
  }

  function auditTriage(s) {
    s.appendChild(H("div", "lede",
      `At the current <b>${B.control.budgets[state.budgetIdx]}%</b> budget the auditor triages every candidate. The quiet categories (credential reuse, C2 check-ins) are where the correlated residue hides.`));
    const list = H("div");
    list.style.cssText = "margin-top:16px;display:flex;flex-direction:column;gap:9px";
    B.control.triage.forEach((t) => {
      const row = H("div");
      row.style.cssText = "display:grid;grid-template-columns:200px 1fr 120px;gap:12px;align-items:center";
      const col = t.caught >= 0.7 ? "var(--select)" : t.caught >= 0.45 ? "var(--activity)" : "var(--alert)";
      row.innerHTML =
        `<span style="font-size:13px">${t.cat}</span>` +
        `<span style="position:relative;height:18px;border-radius:5px;background:var(--wash);overflow:hidden">
           <span style="position:absolute;inset:0;width:${(t.caught * 100).toFixed(0)}%;background:${col};opacity:.85"></span></span>` +
        `<span class="mono" style="font-size:12px;color:${col}">${Math.round(t.caught * 100)}% ${t.verdict}</span>`;
      list.appendChild(row);
    });
    s.appendChild(list);
    const tier = H("div", "lede"); tier.style.marginTop = "16px";
    tier.innerHTML = `<span class="hc-tier tier-MEASURED">MEASURED</span> caught rates derive from the 2% anchor and the per-category residue split.`;
    s.appendChild(tier);
  }

  function agentColor(id) { const a = B.agents.find((x) => x.id === id); return a ? a.color : "var(--text-muted)"; }
  function dateFor(t) {
    const ph = B.timeline.phases; let best = ph[0];
    ph.forEach((p) => { if (p.tick <= t) best = p; });
    return best.date;
  }

  function init(opts) { B = opts.bundle; state = opts.state; }
  function render(view, mount) {
    if (view === "agents") agents(mount);
    else if (view === "forge") forge(mount);
    else if (view === "eval") evaluation(mount);
    else if (view === "audit") audit(mount);
  }
  return { init, render };
})();
