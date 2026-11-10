/* panel.js - the left world/cell panel (Map view). */
window.SU = window.SU || {};
SU.panel = (function () {
  let B, state, host, onTab;

  function h(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function render() {
    host.innerHTML = "";
    const sel = state.selected
      ? B.world.cells.find((c) => c.id === state.selected) : null;

    // head
    const head = h("div", "panel-head");
    head.appendChild(h("div", "panel-eyebrow", sel ? "NODE" : "WORLD"));
    const cb = h("button", "panel-collapse", SU.icon("collapseL"));
    cb.title = "Close the sidebar";
    cb.onclick = () => document.getElementById("panel").classList.toggle("collapsed");
    head.appendChild(cb);
    host.appendChild(head);

    if (sel) return renderCell(sel);

    host.appendChild(h("div", "panel-title",
      `<b>${B.world.name.split(" · ")[0]}</b> <span class="muted">· ${B.world.name.split(" · ").slice(1).join(" · ")}</span>`));

    // tabs
    const tabs = h("div", "tabs");
    ["Overview", "Timeline"].forEach((t) => {
      const b = h("button", "tab" + (state.panelTab === t.toLowerCase() ? " active" : ""), t);
      b.onclick = () => { state.panelTab = t.toLowerCase(); render(); };
      tabs.appendChild(b);
    });
    host.appendChild(tabs);

    const body = h("div", "panel-body");
    if (state.panelTab === "timeline") body.appendChild(timelineTab());
    else body.appendChild(overviewTab());
    host.appendChild(body);
    appendThemeFoot();
  }

  function overviewTab() {
    const f = document.createDocumentFragment();
    f.appendChild(h("div", "lede", B.world.blurb));

    // nodes
    const s1 = h("div", "section");
    s1.appendChild(h("div", "section-head",
      `<span>Nodes</span><span class="count">${B.world.cells.length}</span>`));
    const chips = h("div", "chips");
    B.world.cells.forEach((c) => {
      const chip = h("button", "chip",
        `<span class="dot" style="background:${districtColor(c.owner)}"></span>${c.short}`);
      chip.onclick = () => SU.app.select(c.id);
      chips.appendChild(chip);
    });
    s1.appendChild(chips);
    f.appendChild(s1);

    // swarm stats
    const sw = B.swarm;
    const s2 = h("div", "section");
    s2.appendChild(h("div", "section-head", "<span>The swarm</span>"));
    const kv = h("div", "kv");
    const rows = [
      ["agents on board", sw.board_total.toLocaleString()],
      ["attacked HF", "~" + sw.attacked.toLocaleString()],
      ["peak concurrent", "~" + sw.peak_hour],
      ["board messages", sw.messages.toLocaleString() + "+"],
      ["payloads decoded", sw.payloads_decoded.toLocaleString() + "+"],
    ];
    rows.forEach(([k, v]) => {
      kv.appendChild(h("span", "k", k));
      kv.appendChild(h("span", "v", `<b>${v}</b>`));
    });
    s2.appendChild(kv);
    f.appendChild(s2);

    // control teaser
    const s3 = h("div", "section");
    s3.appendChild(h("div", "section-head", "<span>Under control</span>"));
    s3.appendChild(h("div", "lede",
      `<b>${B.control.anchor_pct}%</b> of attacks blocked at a <b>${B.control.anchor_budget}%</b> audit budget. ` +
      `An <b>${Math.round(B.control.residue * 100)}%</b> correlated residue survives every budget. ` +
      `Open the <b>Audit</b> view for the full control-budget sweep.`));
    f.appendChild(s3);

    // honesty
    const s4 = h("div", "section");
    s4.appendChild(h("div", "section-head", "<span>How to read this</span>"));
    Object.entries(B.honesty).forEach(([tier, txt]) => {
      const row = h("div", "lede");
      row.style.marginTop = "6px";
      row.innerHTML = `<span class="hc-tier tier-${tier}">${tier}</span> ${txt}`;
      s4.appendChild(row);
    });
    f.appendChild(s4);
    return f;
  }

  function timelineTab() {
    const f = document.createDocumentFragment();
    f.appendChild(h("div", "lede",
      "The documented kill chain, phase by phase. Scrub with the timeline at the bottom, or select a node on the map."));
    const s = h("div", "section");
    B.timeline.phases.forEach((p) => {
      const row = h("div", "lede");
      row.style.cssText = "margin-top:10px;display:flex;gap:10px;align-items:baseline;cursor:pointer";
      row.innerHTML =
        `<span class="mono" style="color:var(--text-muted);min-width:64px">${p.date}</span>` +
        `<span><b>${p.label}</b></span>`;
      row.onclick = () => SU.app.seek(p.tick);
      s.appendChild(row);
    });
    f.appendChild(s);
    return f;
  }

  function renderCell(c) {
    host.appendChild(h("div", "panel-title", `<b>${c.label}</b>`));
    const body = h("div", "panel-body");
    const back = h("button", "chip", "&larr; the whole world");
    back.style.margin = "0 0 6px";
    back.onclick = () => SU.app.select(null);
    body.appendChild(back);

    const kv = h("div", "kv");
    kv.style.marginTop = "14px";
    [
      ["district", c.district],
      ["stage", c.stage],
      ["reached", c.date],
      ["acts", String(c.badges.acts)],
      ["source", c.source],
    ].forEach(([k, v]) => {
      kv.appendChild(h("span", "k", k));
      kv.appendChild(h("span", "v", `<b>${v}</b>`));
    });
    body.appendChild(kv);

    const s = h("div", "section");
    s.appendChild(h("div", "section-head", "<span>What happened</span>"));
    s.appendChild(h("div", "lede", c.technique));
    const tier = h("div", "lede"); tier.style.marginTop = "10px";
    tier.innerHTML = `<span class="hc-tier tier-DOCUMENTED">DOCUMENTED · ${c.source}</span>`;
    s.appendChild(tier);
    body.appendChild(s);

    // leads at this stage
    const leads = B.agents.filter((a) => a.stage === c.stage);
    if (leads.length) {
      const s2 = h("div", "section");
      s2.appendChild(h("div", "section-head", "<span>Agents here</span>"));
      leads.forEach((a) => {
        const row = h("div", "lede");
        row.style.cssText = "margin-top:8px;display:flex;gap:8px;align-items:center";
        row.innerHTML =
          `<span class="mono" style="display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:${a.color};color:#fff;font-size:8px;font-weight:600">${a.mono}</span>` +
          `<span><b class="mono">${a.id}</b> &mdash; ${a.headline}</span>`;
        s2.appendChild(row);
      });
      body.appendChild(s2);
    }
    host.appendChild(body);
    appendThemeFoot();
  }

  function districtColor(owner) {
    const d = (B.segments || []).find((x) => x.id === owner);
    return d ? d.color : "var(--ink-soft)";
  }

  function appendThemeFoot() {
    const foot = h("div", "theme-foot");
    [["Light", "sun"], ["Dark", "moon"], ["System", "monitor"]].forEach(([t, ic]) => {
      const b = h("button", "theme-btn" + (state.theme === t.toLowerCase() ? " active" : ""),
        SU.icon(ic) + "<span>" + t + "</span>");
      b.onclick = () => SU.app.setTheme(t.toLowerCase());
      foot.appendChild(b);
    });
    host.appendChild(foot);
  }

  function init(opts) { B = opts.bundle; state = opts.state; host = opts.mount; render(); return { render }; }
  return { init, render: () => render() };
})();
