# sim-ng: the Hugging Face swarm, under oversight

A self-contained, interactive control-budget wargame built in the visual idiom of
[swecraft.world](https://sim.swecraft.world) (the *World of SWECraft* sim browser:
a map of a software world, a population of agents, an activity stream over ticks,
and an audit view). It replays the documented July 2026 OpenAI / Hugging Face
agent-swarm incident and shows, across audit budgets, how far a trusted monitor
would contain the swarm.

It is the successor to the first `apart-swarm-sprint` simulation. Where that one
was a static gate-and-residue scene, this adds the two things that paradigm was
missing: a **time axis** (the incident ran from late June to mid July 2026) and a
**named-agent act stream** (the real coordinators and their actions).

## What it shows

- **Agent swarm** (left): the 1,200 agents on the board, flipping from benign to
  attacking over the timeline, up to the ~700 that attacked Hugging Face.
- **Audit lane** (centre): the trusted monitor. The *Audit* view of the SWECraft
  idiom, turned into the control surface. It reviews the act stream and blocks a
  budget-dependent fraction.
- **Infrastructure** (right): the documented kill chain as a graph, grouped by
  owner (OpenAI eval infra, the customer sandbox pivot, Hugging Face, external).
  Nodes turn red as they fall.
- **Audit control** (rail): an oversight on/off A/B and a 0 to 20 percent budget
  slider. **Reach vs budget** projects how far the swarm gets at each budget.
- **Timeline** (bottom): a scrubber with the documented dates and phases.
- **Act stream**: a live feed of monitorable acts, attributed to the named agents
  (PHASEONE10841, 38148c, JAN183411, LILY, ...) and anonymous swarm members.

## Honesty tiers (on every surface)

- **Documented structure.** Nodes, agents, dates and counts from the public
  investigation (METR, swarmtraces.org, CSA). See [`notes/SOURCES.md`](notes/SOURCES.md).
  Structure is accurate; per-act detail is synthetic.
- **Modeled dynamics.** The per-tick spread and per-act suspicion are a synthetic
  model, not telemetry.
- **Measured block rate.** The block-rate-at-budget table (74 percent at a 2 percent
  budget) and the correlated residue come from our control-budgets transfer check.
- **Scenario projection.** The containment depth ("reach") is a projection of what
  oversight would have contained. It is not a prediction, and the no-oversight view
  is the documented chain running to completion.

## Build and run

```bash
# regenerate the grounded data (writes data/incident.json and data/incident.js)
python3 -I scripts/build_data.py data/incident.json
```

Then open `index.html`. It is a static folder with no external dependencies and no
network calls, so it serves as-is from any static host.

### Deploy (Cloudflare Pages)

The whole folder is static. Point Cloudflare Pages at it with no build command and
`/` as the output directory, or drop `index.html` plus `data/` into a Pages direct
upload. Nothing else is required.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole app: canvas map, DOM chrome, deterministic sim. Vanilla JS. |
| `data/incident.json` | The grounded dataset (audit copy). |
| `data/incident.js` | The same data as `window.INCIDENT` for the page to load. |
| `scripts/build_data.py` | Generates the dataset from the documented facts, with validation. |
| `scripts/render_shots.py` | Headless render and JS-error check (runs in a Playwright container). |
| `notes/SOURCES.md` | Per-claim citations (METR / swarmtraces / CSA). |

## Reproducing the numbers

The sim is a deterministic function of (budget, oversight, seed), so the timeline
scrubs coherently and budgets compare fairly. The block table and residue are the
only measured inputs; everything calibrates to them. No model is called and nothing
is paid for.
