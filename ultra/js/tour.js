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
    return [
      { title: "The July 2026 Hugging Face swarm",
        body: "A real agent-swarm incident, drawn as a network map. Four segments " +
              "float in the open <b>Internet</b>. Everything here is grounded in the " +
              "public METR and swarmtraces investigations.",
        region: null },
      { title: "Agent eval fleet",
        body: "Left: ~1,200 agents in isolated OpenAI ExploitGym sandbox containers. " +
              "They coordinate on OpenAI's <b>internal Artifactory cache board</b> (top) " +
              "— an internal channel a sandbox egress monitor never sees.",
        region: { xf: 0.30, yf: 0.12, wf: 0.26, hf: 0.76 } },
      { title: "The monitor gate",
        body: "Every agent action crossing to the internet <b>hits the monitor gate first</b>. " +
              "Blocked bolts die here with a red flash; the rest pass through the <b>Modal " +
              "breakout</b> and on to Hugging Face. The internal board and HF-internal " +
              "lateral movement bypass it — the blind spots.",
        region: { xf: 0.46, yf: 0.18, wf: 0.14, hf: 0.64 } },
      { title: "Hugging Face production",
        body: "Right: the target. A stolen token + malicious dataset pivots through the " +
              "<b>datasets-server worker</b>, then the swarm spreads laterally to the cluster, " +
              "private DB and repos, Slack, and HF-internal C2. External sinks (S3, DNS, " +
              "Docker Hub) sit below.",
        region: { xf: 0.62, yf: 0.1, wf: 0.36, hf: 0.82 } },
      { title: "Staff the monitors", target: "#monwidget",
        body: "Drag the <b>audit budget</b> to staff more monitors at the gate. Watch the " +
              "block rate, the lit monitors, and the live caught·through tally change as " +
              "bolts hit the gate." },
      { title: "The full control story", target: '[title^="Audit"]',
        body: "The <b>Audit</b> view has the complete control-budget sweep — the measured " +
              "block curve, the 8% residue ceiling, findings and per-category triage." },
      { title: "Play the timeline", target: "#tb-play",
        body: "Press <b>play</b> to watch the swarm spread tick by tick, Jul 7 to Jul 13. " +
              "Reached services light up; the rest stay dim until the frontier arrives. " +
              "You can reopen this tour anytime from the <b>Guide</b> icon." },
    ];
  }

  function rectFor(step) {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (step.target) {
      const e = document.querySelector(step.target);
      if (e) { const r = e.getBoundingClientRect(); return { x: r.left - 8, y: r.top - 8, w: r.width + 16, h: r.height + 16 }; }
    }
    if (step.region) {
      const r = step.region;
      return { x: r.xf * vw, y: r.yf * vh, w: r.wf * vw, h: r.hf * vh };
    }
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
