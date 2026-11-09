# Pre-existing work vs sprint-weekend work

The sprint judges only the weekend's work. This file is the authoritative ledger of the line.
It is referenced from the report (Section 3.1) and the README.

## Pre-existing (produced BEFORE the sprint, NOT judged, declared as background)
- The 43 monitor arms and their raw suspicion scores over 500 APPS backdoors
  (the control-budgets project; `results/*-samples.csv` there).
- The per-arm audit thresholds / achieved-FPR calibration (`achieved-fpr.csv` there).
- The per-backdoor features incl. generator attribution (`case-features.csv` there).
- No file from that project was modified for this submission.

## New, this weekend (the submitted and judged work)
- The swarm-vs-panel reinterpretation and every analysis in `scripts/` and `analysis/`.
- The calibration VALIDATION (reproducing the source project's recall and FPR for 43/43 arms).
- C1 to C7: swarm scaling, panel scaling, variance decomposition, frontier, self-redaction,
  targeting, and the control-game catch-consequence reframing.
- The Swarm Traces data audit (no clock, no actors) and template-collapse.
- All five figures, the report, the dual-use withholding.
- [PLANNED] The calibrated swarm-containment simulator and its visualization (see CONCEPT below),
  which is the clearest example of new weekend work: it produces new synthetic data and a new
  result (containment across audit budgets) parameterised by, but distinct from, the pre-existing runs.
