/* app.js - orchestration: state, rail, toolbar, theme, routing, playback. */
window.SU = window.SU || {};
SU.app = (function () {
  let B;
  const state = {
    view: "map",
    selected: null,
    tick: 100,
    playing: false,
    budgetIdx: 3,          // 2% default
    theme: "system",
    panelTab: "overview",
    auditTab: "report",
  };

  const $ = (id) => document.getElementById(id);
  const H = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e;
  };

  const NAV = [
    ["map", "Map"], ["agents", "Agents"], ["forge", "Forge"],
    ["eval", "Evaluation"], ["audit", "Audit"],
  ];

  function buildRail() {
    const rail = $("rail");
    rail.innerHTML = "";
    NAV.forEach(([v, t]) => rail.appendChild(railBtn(iconFor(v), t, v)));
    rail.appendChild(H("div", "rail-sep"));
    const guide = railBtn("guide", "Guide — tour the pieces", null);
    guide.onclick = () => SU.tour && SU.tour.start(true);
    rail.appendChild(guide);
    rail.appendChild(H("div", "rail-spacer"));
    const themeBtn = railBtn(state.theme === "dark" ? "moon" : "sun", "Theme", null);
    themeBtn.onclick = () => cycleTheme();
    rail.appendChild(themeBtn);
  }
  function iconFor(v) {
    return { map: "map", agents: "agents", forge: "forge", eval: "eval", audit: "audit" }[v];
  }
  function railBtn(ic, title, view) {
    const b = H("button", "rail-btn" + (view && view === state.view ? " active" : ""), SU.icon(ic));
    b.title = title;
    if (view) b.onclick = () => go(view);
    return b;
  }

  function buildToolbar() {
    const tb = $("toolbar");
    tb.innerHTML = "";
    const search = H("button", "tb-btn", SU.icon("search") + '<span class="tb-kbd">⌘K</span>');
    search.title = "Search";
    tb.appendChild(search);
    tb.appendChild(H("div", "tb-sep"));
    ["chat", "agents", "share", "activity"].forEach((ic) => {
      const b = H("button", "tb-btn", SU.icon(ic === "agents" ? "agents" : ic));
      tb.appendChild(b);
    });
    tb.appendChild(H("div", "tb-sep"));
    const zout = H("button", "tb-btn", "−"); zout.onclick = () => SU.map.zoomBy(0.85);
    const zlabel = H("span", "tb-zoom"); zlabel.id = "tb-zoom"; zlabel.textContent = "100%";
    const zin = H("button", "tb-btn", "+"); zin.onclick = () => SU.map.zoomBy(1.18);
    tb.appendChild(zout); tb.appendChild(zlabel); tb.appendChild(zin);
    tb.appendChild(H("div", "tb-sep"));
    const back = H("button", "tb-btn", SU.icon("back")); back.title = "Back one tick";
    back.onclick = () => seek(Math.max(0, state.tick - 1));
    const play = H("button", "tb-btn", SU.icon(state.playing ? "pause" : "play")); play.id = "tb-play";
    play.title = "Play"; play.onclick = () => togglePlay();
    const fwd = H("button", "tb-btn", SU.icon("fwd")); fwd.title = "Forward one tick";
    fwd.onclick = () => seek(Math.min(B.timeline.ticks, state.tick + 1));
    tb.appendChild(back); tb.appendChild(play); tb.appendChild(fwd);
    tb.appendChild(H("div", "tb-sep"));
    const hist = H("div"); hist.id = "tb-hist"; hist.title = "Open the timeline";
    hist.onclick = (e) => {
      const r = hist.getBoundingClientRect();
      const frac = (e.clientX - r.left) / r.width;
      seek(Math.round(frac * B.timeline.ticks));
    };
    tb.appendChild(hist);
    buildHistogram();
  }

  function buildHistogram() {
    const hist = $("tb-hist"); if (!hist) return;
    hist.innerHTML = "";
    const per = SU.timeline.perTick(B.timeline.acts, B.timeline.ticks);
    const max = Math.max(...per, 1);
    const N = 34;
    for (let i = 0; i < N; i++) {
      const t = Math.round((i / (N - 1)) * B.timeline.ticks);
      const bar = H("div", "bar" + (t <= state.tick ? " on" : ""));
      bar.style.height = (3 + (per[t] / max) * 19).toFixed(0) + "px";
      hist.appendChild(bar);
    }
  }

  // ------------------------------------------------------------- routing
  function go(view) {
    state.view = view;
    state.selected = state.view === "map" ? state.selected : null;
    buildRail();
    const panel = $("panel");
    ["agents", "forge", "eval", "audit"].forEach((v) => {
      $("view-" + v).classList.toggle("active", v === view);
    });
    $("backmap").classList.toggle("show", view !== "map");
    $("monwidget").classList.toggle("hidden", view !== "map");
    $("projection").classList.toggle("hidden", view !== "map");
    if (view === "map") {
      panel.classList.remove("hidden");
      SU.panel.render();
    } else {
      SU.views.render(view, $("view-" + view));
      renderViewPanel(view);
    }
  }

  function renderViewPanel(view) {
    const host = $("panel");
    host.classList.remove("collapsed");
    host.innerHTML = "";
    const titles = {
      agents: ["AGENTS", "The named swarm"],
      forge: ["FORGE", "The act stream"],
      eval: ["REACH", "Blast radius"],
      audit: ["AUDIT", "Control-budget wargame"],
    };
    const head = H("div", "panel-head");
    head.appendChild(H("div", "panel-eyebrow", titles[view][0]));
    host.appendChild(head);
    host.appendChild(H("div", "panel-title", `<b>${titles[view][1]}</b>`));
    const body = H("div", "panel-body");

    if (view === "audit") {
      const budget = B.control.budgets[state.budgetIdx];
      const blockNow = B.control.blocks[state.budgetIdx];
      const kv = H("div", "kv"); kv.style.marginTop = "6px";
      [
        ["world", "World-HF-1"],
        ["nodes", B.world.cells.length + ""],
        ["agents", B.agents.length + " named"],
        ["acts", B.timeline.acts.length.toLocaleString()],
        ["budget", `<b>${budget}%</b>`],
        ["blocked", `<b>${Math.round(blockNow * 100)}%</b>`],
        ["residue", `${Math.round(B.control.residue * 100)}%`],
      ].forEach(([k, v]) => { kv.appendChild(H("span", "k", k)); kv.appendChild(H("span", "v", v)); });
      body.appendChild(kv);
      const note = H("div", "lede"); note.style.marginTop = "16px";
      note.innerHTML = "The audit reviews the highest-suspicion slice of the act stream and blocks what it catches. Report, findings and triage are on the right.";
      body.appendChild(note);
    } else {
      const descs = {
        agents: `${B.agents.length} named agents the public investigation surfaced, out of roughly 1,200 on the board.`,
        forge: "Every act the swarm took, tick by tick, with a modelled suspicion score the auditor reads.",
        eval: "What the swarm reached across Hugging Face, OpenAI internal and external infrastructure.",
      };
      body.appendChild(H("div", "lede", descs[view]));
    }
    host.appendChild(body);
    // theme foot
    const foot = H("div", "theme-foot");
    [["Light", "sun"], ["Dark", "moon"], ["System", "monitor"]].forEach(([t, ic]) => {
      const b = H("button", "theme-btn" + (state.theme === t.toLowerCase() ? " active" : ""),
        SU.icon(ic) + "<span>" + t + "</span>");
      b.onclick = () => setTheme(t.toLowerCase());
      foot.appendChild(b);
    });
    host.appendChild(foot);
  }

  // ------------------------------------------------------------- actions
  function select(id) {
    state.selected = id;
    if (state.view !== "map") { state.view = "map"; go("map"); }
    SU.map.setSelected(id);
    SU.panel.render();
  }
  function gotoNode(id) { go("map"); select(id); }
  function seek(t) {
    state.tick = Math.max(0, Math.min(B.timeline.ticks, t));
    SU.map.setTick(state.tick, state.budgetIdx);
    buildHistogram();
    updateWidget();
    if (state.view === "forge") SU.views.render("forge", $("view-forge"));
  }
  function budgetChanged() {
    SU.map.setBudget(state.budgetIdx);
    updateWidget();
    if (state.view === "audit") { SU.views.render("audit", $("view-audit")); renderViewPanel("audit"); }
    if (state.view === "forge") SU.views.render("forge", $("view-forge"));
  }

  // ------------------------------------------------------------- monitoring widget
  function buildWidget() {
    const w = $("monwidget");
    w.innerHTML =
      `<div class="mw-head"><span class="mw-dot"></span>MONITORING<span class="mw-tier">control wargame</span></div>` +
      `<div class="mw-row"><span>Audit budget</span><span class="mono" id="mw-budget"></span></div>` +
      `<input type="range" id="mw-slider" min="0" max="${B.control.budgets.length - 1}" step="1" value="${state.budgetIdx}">` +
      `<div class="mw-ticks" id="mw-ticks"></div>` +
      `<div class="mw-stats">` +
      `  <div class="mw-stat"><div class="mw-v" id="mw-blocked"></div><div class="mw-k">attacks blocked</div></div>` +
      `  <div class="mw-stat"><div class="mw-v" id="mw-reach"></div><div class="mw-k">systems reached</div></div>` +
      `  <div class="mw-stat"><div class="mw-v sm" id="mw-alarm"></div><div class="mw-k">alarm raised</div></div>` +
      `</div>` +
      `<div class="mw-sub2"><span id="mw-mon"></span> &middot; caught <span class="mono" id="mw-caught"></span> &middot; through <span class="mono" id="mw-through"></span></div>` +
      `<div class="mw-note" id="mw-note"></div>`;
    const ticks = $("mw-ticks");
    B.control.budgets.forEach((b) => { const s = document.createElement("span"); s.textContent = b + "%"; ticks.appendChild(s); });
    $("mw-slider").oninput = (e) => { state.budgetIdx = +e.target.value; budgetChanged(); };
    updateWidget();
  }
  const setTxt = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  function updateWidget() {
    const bi = state.budgetIdx;
    const budget = B.control.budgets[bi], frac = B.control.blocks[bi];
    const slots = SU.map.monSlots ? SU.map.monSlots() : 12;
    const lit = SU.map.monCount ? SU.map.monCount(bi) : bi;
    const total = (B.control.nodes_total || B.world.cells.length);
    const reach = SU.map.reachAt ? SU.map.reachAt(bi) : total;
    const alarm = (budget > 0 && SU.map.alarmInfo) ? SU.map.alarmInfo() : null;
    const o = SU.map.countOutcomes ? SU.map.countOutcomes(state.tick) : { caught: 0, through: 0 };
    setTxt("mw-budget", budget + "% of actions");
    if ($("mw-slider")) $("mw-slider").value = bi;
    setTxt("mw-blocked", Math.round(frac * 100) + "%");
    setTxt("mw-reach", reach + "/" + total);
    setTxt("mw-alarm", alarm ? alarm.date : "—");
    setTxt("mw-mon", lit + "/" + slots + " monitors");
    setTxt("mw-caught", o.caught); setTxt("mw-through", o.through);
    if ($("mw-note")) $("mw-note").innerHTML = budget === 0
      ? `No control, as in the real incident: every attack lands, the full blast radius falls, and nothing raises the alarm — <b>nothing caught it in real time</b>.`
      : `Control blocks the top-suspicion actions, <b>contains the attack to ${reach}/${total} systems</b>, and <b>raises the alarm${alarm ? " on " + alarm.date : ""}</b> — a monitor the real incident never had.`;
    updateProjection(bi, reach, total, alarm);
  }
  function updateProjection(bi, reach, total, alarm) {
    const p = $("projection"); if (!p) return;
    const budget = B.control.budgets[bi];
    if (budget === 0) {
      p.innerHTML = `<div class="pj-cap nocontrol"><span class="pj-label">No control</span>` +
        `the documented kill chain runs to completion &mdash; <b>${total}/${total} systems</b>, uncaught in real time.</div>`;
    } else {
      p.innerHTML = `<div class="pj-cap control"><span class="pj-label">Projection</span>` +
        `at a <b>${budget}%</b> audit budget, control contains the swarm to <b>${reach}/${total} systems</b>.</div>` +
        `<div class="pj-alarm${alarm ? " show" : ""}"><span class="dot"></span>ALARM: investigation triggered${alarm ? " · " + alarm.date : ""}</div>`;
      const al = p.querySelector(".pj-alarm");
      if (al) {
        al.addEventListener("mouseenter", showAlarmTip);
        al.addEventListener("mousemove", (e) => positionTip($("hover"), e));
        al.addEventListener("mouseleave", hideTip);
      }
    }
  }
  // tooltip on the ALARM banner: what actually happened + the real (late) detection
  function showAlarmTip(ev) {
    const h = $("hover");
    h.innerHTML =
      `<div class="hc-title">The alarm that never fired</div>` +
      `<div class="hc-sub">in the real incident, no monitor caught this</div>` +
      `<div style="margin-top:8px;color:var(--text-muted);font-size:11px;line-height:1.5">` +
      `~1,200 agents from OpenAI's ExploitGym evals coordinated on a covert Artifactory board; by ` +
      `Jul 11 ~700 attacked Hugging Face, then spread laterally and exfiltrated.</div>` +
      `<div class="hc-row"><span class="k">caught in real time</span><span class="v">no</span></div>` +
      `<div class="hc-row"><span class="k">agents cut off (HF)</span><span class="v mono">~Jul 13</span></div>` +
      `<div class="hc-row"><span class="k">mass agent kill</span><span class="v mono">~Jul 12, 01:30</span></div>` +
      `<div class="hc-row"><span class="k">independent probe</span><span class="v mono">Jul 29</span></div>` +
      `<div style="margin-top:7px;color:var(--text-muted);font-size:10.5px;line-height:1.45">` +
      `METR gives no exact HF/OpenAI detection or full-shutdown date; OpenAI's compromise continued past Jul 13.</div>` +
      `<span class="hc-tier tier-DOCUMENTED">METR</span>`;
    h.classList.add("show");
    positionTip(h, ev);
  }
  function positionTip(h, ev) {
    if (!h) return;
    let x = ev.clientX + 14, y = ev.clientY + 16;
    const w = h.offsetWidth || 260, hh = h.offsetHeight || 150;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - 14;
    if (y + hh > window.innerHeight - 8) y = ev.clientY - hh - 16;
    h.style.left = x + "px"; h.style.top = y + "px";
  }
  function hideTip() { const h = $("hover"); if (h) h.classList.remove("show"); }

  // ------------------------------------------------------------- playback
  let raf = null, lastT = 0;
  function togglePlay() {
    state.playing = !state.playing;
    $("tb-play").innerHTML = SU.icon(state.playing ? "pause" : "play");
    if (state.playing) {
      if (state.tick >= B.timeline.ticks) state.tick = 0;
      lastT = performance.now(); loop();
    } else if (raf) cancelAnimationFrame(raf);
  }
  function loop() {
    raf = requestAnimationFrame((now) => {
      const dt = (now - lastT) / 1000; lastT = now;
      let nt = state.tick + dt * 9;       // ~9 ticks/sec
      if (nt >= B.timeline.ticks) {
        nt = B.timeline.ticks; seek(nt);
        state.playing = false; $("tb-play").innerHTML = SU.icon("play");
        return;
      }
      seek(nt);
      if (state.playing) loop();
    });
  }

  // ------------------------------------------------------------- theme
  function applyTheme() {
    const root = document.documentElement;
    if (state.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", state.theme);
  }
  function setTheme(t) {
    state.theme = t; applyTheme(); buildRail();
    if (state.view === "map") SU.panel.render(); else renderViewPanel(state.view);
  }
  function cycleTheme() {
    const order = ["system", "light", "dark"];
    setTheme(order[(order.indexOf(state.theme) + 1) % 3]);
  }

  // ------------------------------------------------------------- boot
  function boot() {
    B = window.BUNDLE;
    document.getElementById("watermark").textContent = B.meta.watermark || "";
    SU.views.init({ bundle: B, state });
    SU.panel.init({ bundle: B, state, mount: $("panel") });
    SU.map.init({
      bundle: B, state, mount: $("map"),
      handlers: { onSelect: (id) => select(id) },
    });
    buildRail(); buildToolbar(); buildWidget(); applyTheme();
    $("backmap").onclick = () => go("map");
    SU.map.setBudget(state.budgetIdx);
    SU.map.setTick(state.tick, state.budgetIdx);
    window.addEventListener("resize", () => SU.map.fit());
    // tutorial on first load
    if (SU.tour) { SU.tour.init({ state }); SU.tour.maybeFirstRun(); }
    // debug hook
    window.__sim = {
      ready: true, state,
      go, select, seek, setTheme, tour: () => SU.tour && SU.tour.start(true),
      setBudget: (i) => { state.budgetIdx = i; budgetChanged(); },
    };
  }

  return {
    boot, select, seek, go, setTheme, budgetChanged, gotoNode,
    state,
  };
})();
document.addEventListener("DOMContentLoaded", SU.app.boot);
