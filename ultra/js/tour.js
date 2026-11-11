/* tour.js - first-load tutorial + Guide-triggered walkthrough.
   Spotlights pieces of the UI with a stepped card. First run is gated by a
   localStorage flag (wrapped in try/catch; the tour still works without it). */
window.SU = window.SU || {};
SU.tour = (function () {
  let state, host, idx = 0, steps = [];
  const KEY = "su_ultra_tour_seen_v1";

  function seen() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function markSeen() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }

  function buildSteps() {
    const HF = ["datasets_server", "hf_cluster", "hf_slack", "hf_db", "hf_repos", "hf_infrahq", "c2"]
      .map((id) => `.cell[data-id="${id}"]`);
    return [
      { title: "The July 2026 Hugging Face swarm",
        body: "A real agent-swarm incident, drawn as a live network map. Everything here is " +
              "grounded in the public METR and swarmtraces investigations." },
      { title: "One OpenAI trust zone", target: '[data-layer="region"]',
        body: "The <b>OpenAI network</b> holds it all: ~1,200 agents in the eval fleet, the " +
              "internal <b>Artifactory board</b> they coordinate on, and the <b>monitor gate</b> " +
              "between the swarm and everything it does. Hugging Face and the external sinks lie " +
              "out in the open Internet beyond." },
      { title: "The monitor gate", target: '[data-layer="gate"]',
        body: "Every agent action is <b>judged here</b>. The staffed monitors review the most " +
              "suspicious actions and block them; allowed ones cross the wall. A disabled monitor " +
              "never receives traffic." },
      { title: "Hugging Face, under attack", union: HF,
        body: "Over the internet the swarm pivots through HF's <b>datasets-server</b>, then spreads " +
              "to the cluster, private DB and repos, Slack and HF-internal C2. The external sinks " +
              "(S3, DNS, Docker Hub) sit below." },
      { title: "What control buys you", target: "#projection",
        body: "The headline: how far control <b>contains the blast radius</b>, and the <b>alarm</b> " +
              "it raises. <b>Hover the alarm</b> for what actually happened — in reality nothing " +
              "caught the attack in real time." },
      { title: "Tune the monitoring", target: "#monwidget",
        body: "Drag the <b>audit budget</b>: attacks-blocked rises, <b>systems-reached falls</b>, and " +
              "the <b>alarm moves earlier</b>. The whole case for control, in one slider." },
      { title: "The full sweep", target: '[title^="Audit"]',
        body: "The <b>Audit</b> view has the measured budget→block curve, the 8% residue ceiling, " +
              "and per-finding evidence and triage." },
      { title: "Play the timeline", target: "#tb-play",
        body: "Press <b>play</b> to watch the activity ramp — quiet coordination, a sharp jump on " +
              "<b>Jul 11</b> when the file-read lands, a peak, then the mass exit. Reopen this tour " +
              "anytime from the <b>Guide</b> icon." },
    ];
  }

  function rectFor(step) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const boxOf = (sel) => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect() : null; };
    if (step.union) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, any = false;
      step.union.forEach((sel) => {
        const r = boxOf(sel);
        if (r && r.width) { any = true; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
      });
      if (any) return { x: x0 - 8, y: y0 - 8, w: (x1 - x0) + 16, h: (y1 - y0) + 16 };
    }
    if (step.target) {
      const r = boxOf(step.target);
      if (r) return { x: r.left - 8, y: r.top - 8, w: r.width + 16, h: r.height + 16 };
    }
    if (step.region) { const r = step.region; return { x: r.xf * vw, y: r.yf * vh, w: r.wf * vw, h: r.hf * vh }; }
    return null;
  }

  function render() {
    const step = steps[idx];
    const rect = rectFor(step);
    const vw = window.innerWidth, vh = window.innerHeight;
    host.innerHTML = "";
    host.classList.add("show");

    const hole = document.createElement("div");
    hole.className = "tour-hole";
    if (rect) {
      hole.style.left = rect.x + "px"; hole.style.top = rect.y + "px";
      hole.style.width = rect.w + "px"; hole.style.height = rect.h + "px";
    } else {
      hole.style.left = "50%"; hole.style.top = "50%"; hole.style.width = "0"; hole.style.height = "0";
    }
    host.appendChild(hole);

    const card = document.createElement("div");
    card.className = "tour-card";
    card.innerHTML =
      `<div class="tour-step">${idx + 1} / ${steps.length}</div>` +
      `<div class="tour-title">${step.title}</div>` +
      `<div class="tour-body">${step.body}</div>` +
      `<div class="tour-nav">` +
      `  <button class="tour-skip">Skip</button>` +
      `  <div class="tour-dots">${steps.map((_, i) => `<span class="${i === idx ? "on" : ""}"></span>`).join("")}</div>` +
      `  <div class="tour-btns">` +
      (idx > 0 ? `<button class="tour-back">Back</button>` : "") +
      `    <button class="tour-next">${idx === steps.length - 1 ? "Done" : "Next"}</button>` +
      `  </div></div>`;
    host.appendChild(card);

    // place card: prefer below the hole, else above, else center
    let cx, cy;
    const cw = 340, ch = card.offsetHeight || 190;
    if (rect) {
      cx = Math.min(vw - cw - 16, Math.max(16, rect.x + rect.w / 2 - cw / 2));
      if (rect.y + rect.h + ch + 20 < vh) cy = rect.y + rect.h + 16;
      else if (rect.y - ch - 16 > 0) cy = rect.y - ch - 16;
      else cy = Math.max(16, vh / 2 - ch / 2);
      // if target is far right (widget), place card to its left
      if (rect.x > vw * 0.6) cx = Math.max(16, rect.x - cw - 16), cy = Math.min(vh - ch - 16, Math.max(16, rect.y));
    } else { cx = vw / 2 - cw / 2; cy = vh / 2 - ch / 2; }
    card.style.left = cx + "px"; card.style.top = cy + "px";

    card.querySelector(".tour-next").onclick = () => { idx === steps.length - 1 ? finish() : go(idx + 1); };
    const back = card.querySelector(".tour-back"); if (back) back.onclick = () => go(idx - 1);
    card.querySelector(".tour-skip").onclick = finish;
  }

  function go(i) { idx = Math.max(0, Math.min(steps.length - 1, i)); render(); }
  function finish() { host.classList.remove("show"); host.innerHTML = ""; markSeen(); window.removeEventListener("keydown", onKey); }
  function onKey(e) {
    if (!host.classList.contains("show")) return;
    if (e.key === "Escape") finish();
    else if (e.key === "ArrowRight") go(idx + 1);
    else if (e.key === "ArrowLeft") go(idx - 1);
  }

  function start(force) {
    steps = buildSteps(); idx = 0; render();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
  }
  function onResize() { if (host.classList.contains("show")) render(); }
  function maybeFirstRun() { if (!seen()) setTimeout(() => start(false), 650); }
  function init(opts) { state = opts.state; host = document.getElementById("tour"); }

  return { init, start, maybeFirstRun };
})();
