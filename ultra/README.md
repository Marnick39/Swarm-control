# SIM-ULTRA — the July 2026 swarm, under control

A full-fidelity rebuild of the [sim.swecraft.world](https://sim.swecraft.world)
"sim browser" idiom, adapted to the documented July 2026 Hugging Face
agent-swarm incident, with **control** layered on as the Audit view.

It is a successor to the lighter `sim-ng` recreation: same grounded incident
data, but now the actual swecraft browser experience — an isometric hex-world
map, a left world panel with Overview and Timeline, a navigation rail with
Map / Agents / Forge / Evaluation / Audit, a bottom timeline scrubber with an
activity histogram, light and dark themes, and hover cards.

## The control angle

The swecraft browser already carries an **Audit** view: "the trace analyzer's
audit of a run, its findings with each claim linked to its evidence, and its
triage of every candidate the detectors raised." That is exactly where AI
control belongs. Here the Audit view is a control-budget wargame:

- An auditor reviews a slice of the act stream, ordered by suspicion, and blocks
  what it catches.
- A **budget → block** curve (measured): 74% of attacks blocked at a 2% audit
  budget, saturating at a 92% ceiling because an 8% correlated residue survives
  every budget.
- **Detection advance**: a burst of blocked acts trips an alarm, moving
  detection from Jul 13 (no control) to Jul 8. Knowing sooner is itself a
  benefit of control.
- **Findings** and **Triage** tabs, with the quiet categories (credential reuse,
  C2 check-ins) called out as where the residue hides.

Drag the budget in the Audit view; the Forge act stream re-strikes the blocked
acts live.

## Honesty tiers

Every surface carries one:

- **DOCUMENTED** — nodes, agents, dates, counts and the kill chain, from the
  public investigation (METR, swarmtraces, CSA). See `notes/SOURCES.md`.
- **MEASURED** — the budget → block table and the correlated residue, from our
  control-budgets transfer check.
- **MODELED** — per-tick acts, suspicion scores and the alarm; a synthetic
  model, not telemetry. All per-act data is synthetic.

## What is here

| Path | What it is |
| --- | --- |
| `index.html` | The app shell |
| `css/app.css` | Design tokens lifted from sim.swecraft.world (Tailwind v4), light + dark |
| `js/` | `icons` `hex` `buildings` `map` `panel` `views` `timeline` `app` (vanilla JS, SVG map) |
| `data/bundle.json` / `bundle.js` | The generated world + agents + timeline + control bundle |
| `scripts/build_bundle.py` | Reshapes `../sim-ng/data/incident.json` into the bundle |
| `notes/SOURCES.md` | Per-claim citations for the documented layer |

## Build

```bash
python3 -I scripts/build_bundle.py      # regenerate data/bundle.* from the incident
```

No build step for the app itself: it is static files. Serve the folder over
HTTP (GitHub Pages, or `python3 -m http.server`) and open `index.html`.

## Provenance and scope

The real swecraft frontend (`software-worlds/sim-browser`) is closed source and
the site is a Next.js app, so this is a faithful static rebuild of its look and
structure, not a copy of its code. It reuses the bundle idiom documented in the
open `software-worlds/swecraft-launcher` exporter. Nothing from gated or
withheld incident datasets is used; the documented layer is public-report only.
