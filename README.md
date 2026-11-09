# Oversight does not stack

Companion artifacts for the Apart Research / AI Alignment Foundation **Swarm
Alignment Sprint** submission *"Oversight does not stack"* (track 4, Multi-Agent
Oversight and Control), plus a new interactive simulation built afterward.

**Live:**
- **Interactive simulation** (the headline piece): https://marnick39.github.io/Swarm-control/
- **Companion video** (looping visualization): https://marnick39.github.io/Swarm-control/video/
- **Paper** (PDF): https://marnick39.github.io/Swarm-control/paper/report.pdf

## What is here

| Path | What it is |
|---|---|
| `index.html` | **The interactive simulation.** A control-budget wargame on the documented July 2026 Hugging Face agent-swarm incident, in the visual idiom of swecraft.world: agent-population field, an audit lane as the control surface, the documented kill chain, a dated timeline, a named-agent act stream, an oversight A/B, a 0 to 20 percent budget slider, a reach-vs-budget projection, and a time-to-detection projection. Supersedes the original static gate-and-residue scene (not included here). |
| `video/index.html` | The companion looping visualization: how correlated monitor failure lets a correlated residue through. Watermarked, anonymized, synthetic. |
| `paper/report.pdf`, `paper/report.typ` | The report (8-page body; 13-page PDF with references and appendices). |
| `paper/figures/` | Figures f1 to f7. |
| `paper/analysis/` | Every number quoted in the report. Two sample-level files are withheld, see `paper/analysis/WITHHELD.md`. |
| `paper/scripts/` | The analysis pipeline (catch matrix, swarm/panel scaling, variance decomposition, budget sweep, control game, transfer check). |
| `paper/notes/` | Concept, critique log, pre-existing-vs-new declaration, transfer-check pre-registration. |
| `data/`, `scripts/`, `notes/SOURCES.md` | The interactive simulation's grounded data, generator, and per-claim citations. |

## The claim

Attacker swarms and monitor panels are both populations, but only one of them
scales the way the arithmetic predicts. An attacker swarm realises 1.000 to 1.017
times the independence prediction. A defender panel of 14 distinct models realises
315 times worse than its own, still missing 8.6 percent of backdoors where
independence predicts 0.027 percent. The mechanism is that evasion is a property of
the task and the edit, not of the author: generator identity explains only 9.9
percent of the variance.

## Honesty tiers (on every surface of the simulation)

- **Documented structure.** Nodes, agents, dates and counts from the public
  investigation (METR, swarmtraces.org, CSA). See `notes/SOURCES.md`. Structure is
  accurate; per-act detail is synthetic.
- **Modeled dynamics.** The per-tick spread and per-act suspicion are a synthetic
  model, not telemetry.
- **Measured block rate.** The block-rate-at-budget table (74 percent at a 2 percent
  budget) and the correlated residue come from our control-budgets transfer check.
- **Scenario projection.** Containment depth and the detection date are projections of
  what oversight would have contained, not predictions. The no-oversight view is the
  documented chain running to completion.

## Data handling

The raw transfer-check rows are withheld: the benign actions come from the gated AI
Village dataset (no redistribution under its terms) and the malicious actions are raw
Swarm Traces payloads. Only the aggregates needed to check the paper ship here. See
`paper/analysis/WITHHELD.md` and `paper/notes/PREREG-transfer-check.md`.

## Build and deploy

The simulation is a self-contained static folder (vanilla JS, no runtime
dependencies). `scripts/build_data.py` regenerates `data/`. Deployment is plain
GitHub Pages from `main`; see `PUBLISHING.md`. Every push to `main` redeploys.
