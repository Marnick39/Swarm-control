# Concept: containment on the infrastructure graph (the live-environment wargame)

## One line
A map of a modeled compute environment where an agent swarm spreads from a foothold through
internal and external infrastructure toward high-stakes targets, and a control budget audits the
swarm's actions. The viewer watches, across budgets, what gets compromised and what gets contained,
with every catch rate parameterised by OUR measured monitor statistics.

## How it builds on the measured work (not a toy)
- Each hop in the spread (credential theft, lateral movement, privilege escalation, exfiltration,
  controller check-in) is a monitorable ACTION. The probability the control protocol catches it at
  budget b is drawn from our measured transfer check (Appendix D): trusted monitors flag blatant
  agent actions at roughly 70 to 77 percent at a 2 percent budget, scaled down at smaller budgets.
- The correlated-failure structure carries over: a fraction of actions is low-suspicion to every
  monitor, so some paths are never caught no matter the budget. The budget sweep (0, 0.5, 2, 10, 20
  percent) therefore shows diminishing returns and a residual breach, the paper's finding made spatial.
- So the simulation is the paper's two headline results (catch-rate-at-budget, correlated residue)
  projected onto a spatial contagion model. That is its honest value: projection and communication,
  not new evidence.

## What the map shows
Nodes grouped in zones, edges are reachability/trust:
- Foothold / dev zone: CI runner, dev workstation, eval sandbox (where the swarm starts).
- Internal infra: artifact registry, container registry, secrets store, Kubernetes cluster, internal
  chat, cloud account. These mirror the REAL July 2026 incident's actual targets.
- External infra: package registries, Docker Hub, external cloud, a C2 relay.
- High-stakes targets: a datacenter power/cooling controller, a grid control system, a water-treatment
  controller, a payments system. These are an EXPLICIT HYPOTHETICAL. The real incident never reached
  critical infrastructure; this layer asks what the same uncontained dynamics could reach if pointed at
  higher-stakes targets.

## Dynamics
Each timestep, every compromised node attempts to reach an adjacent node via a labelled action with a
suspicion score. The control protocol audits the top-b percent most-suspicious actions. Caught attempts
are contained (edge blocked, that spread path halted). Missed attempts compromise the next node, which
turns red and becomes a new source. A "reached high-stakes target" alarm fires if the cascade crosses
the hypothetical bridge. Run side by side or with a budget slider: at 0 budget the swarm cascades to
the high-stakes layer; at a modest budget most lateral movement is caught early and the chain breaks
before escalation; but the correlated residue means some internal nodes always fall.

## Honesty layering (non-negotiable, three clearly-marked tiers)
- MEASURED: the per-action catch rates and the correlated residue (from our study). Marked as measured.
- MODELED: the topology and the spread dynamics (a reasonable synthetic model). Marked as modeled.
- SCENARIO: the high-stakes / critical-infrastructure targets and the bridge to them (did NOT happen in
  the real incident). Marked as a hypothetical escalation, never a prediction.
- All data synthetic. A persistent SIMULATION / SCENARIO watermark. No real facility, company, or
  vendor names. The critical-infra tier is visually separated (a dashed "hypothetical escalation"
  boundary) and can be toggled off to show only the real-incident-grounded layer.

## Where it lives
- A standalone self-contained interactive HTML (the full-blown thing), recorded for the video.
- A condensed beat folded into the main video as a new scene, OR kept as a companion piece.
- The paper is at its 8-page body limit, so this goes in a short APPENDIX (appendices do not count
  toward the limit) as a communication artifact, plus one figure, framed as projection not evidence.

## The one real risk (and the mitigation)
Showing AI swarms compromising power plants and water treatment is dramatic and, done carelessly, reads
as fearmongering that undermines the rigorous measured work next to it. Mitigation: the three-tier
labelling above, the critical-infra tier explicitly marked "hypothetical escalation, not in the real
incident," calibration of every catch rate to our actual measurement, and a toggle to the
real-incident-only view. Framed this way it is an honest wargame that dramatizes the value of cheap
control; framed loosely it is a liability. The framing decision is the user's to set.

## REFINEMENT (user decision): Hugging Face grounded, no critical infrastructure
Pivot away from critical infrastructure entirely. Ground the whole thing in the REAL July 2026 Hugging
Face incident targets. The visual the user wants:
- Swarm as a matrix: benign agents blue, compromised agents red; agents flip red and join over time.
- A CENTRAL MONITOR gate: attacks from red agents must pass through it; the monitor blocks a
  budget-fraction (red line stops at the gate); misses (the correlated residue) pass through as red lines.
- Real HF targets on the right: secrets store, Kubernetes, dataset workers, internal Slack, Artifactory
  cache, Docker Hub, external cloud, C2 relay. A through-attack hits a target; sometimes succeeds
  (target red), sometimes fails.
- Budget slider 0 to 20 percent; block rate anchored to our measured transfer check (~74% at 2%); the
  residue floor means some attacks always pass, the paper's finding made spatial.
- Honesty: SIMULATION watermark, synthetic, measured-vs-modeled labels, real incident target types,
  no critical infra, no vendor names, live tally.
Lives as: standalone interactive HTML + a short paper appendix (projection-not-evidence) + a condensed
video scene.
