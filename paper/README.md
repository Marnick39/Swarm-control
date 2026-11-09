# Oversight does not stack

Submission to the Apart Research / AI Alignment Foundation **Swarm Alignment Sprint**, November 2026.
Anchor track: **4, Multi-Agent Oversight and Control**.

**Claim.** Attacker swarms and monitor panels are both populations, but only one of them scales the way
the arithmetic predicts. An attacker swarm realises 1.000 to 1.017 times the independence prediction.
A defender panel of 14 distinct models realises 315 times worse than its own, still missing 8.6%
of backdoors where independence predicts 0.027%. The mechanism is that evasion is a property of the
task and the edit, not of the author: generator identity explains only 9.9% of the variance.

## What is pre-existing and what is new

Per the sprint rules, this is declared explicitly here and in Section 3.1 of the report.

**Pre-existing (NOT written this weekend, NOT submitted for judging).** The monitor runs themselves.
They come from an ongoing AI-control budgets research project and were produced before the sprint. That
project supplied: the 500-problem APPS backdoor dataset with honest and attack solutions, the 43 scored
monitor arms (`results/*-samples.csv` in that repo), the per-arm audit thresholds
(`results/analysis/achieved-fpr.csv`), and the per-backdoor features including generator attribution
(`results/analysis/case-features.csv`). No file from that project was modified for this submission.

**New this weekend (the submitted work).** Everything in this folder:

| Path | What it is |
|---|---|
| `scripts/build_matrix.py` | Builds the calibrated 500 x 43 catch matrix and validates it by reproducing the source project's own recall and achieved-FPR for all 43 arms |
| `scripts/swarm_scaling.py` | C1 swarm scaling, C2 panel scaling, C3 variance decomposition, all exact |
| `scripts/family_panels.py` | Removes the duplicate-model confound by rebuilding panels from one arm per model family |
| `scripts/frontier.py` | The deployment frontier: swarm size N against panel size k, plus panel-to-panel spread |
| `scripts/probe_swarmtraces.py`, `scripts/probe2.py`, `scripts/swarmtraces_structure.py`, `scripts/swarmtraces_templates.py` | The Swarm Traces data audit and template-collapse analysis |
| `scripts/figures.py`, `scripts/fig_budget.py` | The figures (f1 to f7) |
| `scripts/control_game.py` | Section 4.9: the catch-consequence reframing |
| `scripts/calibration.py`, `scripts/budget_sweep.py` | Section 4.8: recall and containment vs audit budget |
| `scripts/paper_refinements.py` | Two-way variance decomposition and the matched-strictness swarm check |
| `scripts/impact_tally.py` | Pattern-classified impact of the Swarm Traces payloads (the video's tally) |
| `scripts/aiv_profile.py` | AI Village structure profiling (for the transfer check) |
| `scripts/transfer_check.py`, `scripts/transfer_score2.py` | Appendix D: the domain-transfer check |
| `analysis/*.csv` | Every number quoted in the report. Two sample-level files are withheld, see `analysis/WITHHELD.md` |
| `report.typ`, `report.pdf` | The report (8-page body; 13-page PDF with references and appendices) |
| `video/index.html`, `sim/index.html` | The companion looping visualisation and the standalone interactive simulation |

### New in this iteration, beyond the first submission
- **Budget sweep (Section 4.8, Fig 6):** containment vs audit budget, exact from the matrix.
- **Control game (Section 4.9):** what changes when catching an attack halts the population.
- **Two-way variance:** the artefact share as a bounded range (32 to 90 percent), not a bald number.
- **Domain-transfer check (Appendix D, Fig 7):** real monitors on real agent actions; catch rates do
  not transfer, which validates the assumed-transfer caveat.
- **Companion video:** a watermarked, anonymized animation whose uncaught residue is grounded in the
  real incident's impact categories. It is an illustration conditional on transfer, not a measurement.

## Reproducing

The main results call no model and nothing is paid for. The only inference is the Appendix D transfer
check, which ran on the sprint's provided inference platform on a credit grant. Out-of-pocket cost: EUR 0.

```bash
# 1. the catch matrix, validated against the source project
python3 -I scripts/build_matrix.py /path/to/control-budgets-repo analysis

# 2. the analyses
python3 -I scripts/swarm_scaling.py analysis
python3 -I scripts/family_panels.py analysis
python3 -I scripts/frontier.py analysis

# 3. the Swarm Traces audit (downloads 15.2 MB)
curl -o data/swarmtraces/redacted.jsonl.gz https://swarmtraces.org/data/final/redacted.jsonl.gz
python3 -I scripts/swarmtraces_structure.py data/swarmtraces/redacted.jsonl.gz
python3 -I scripts/swarmtraces_templates.py data/swarmtraces/redacted.jsonl.gz analysis/swarmtraces-templates.csv

# 4. figures and PDF
uv run --with matplotlib python -I scripts/figures.py analysis figures
uv run --with typst python -c "import typst; typst.compile('report.typ', output='report.pdf', root='.')"
```

`build_matrix.py` exits non-zero if the calibration stops matching the source project, so a silent
protocol change cannot pass unnoticed.

## Data

- **Swarm Traces**, public redacted release, audited in Section 4.5 and Appendix B. Downloaded from
  `swarmtraces.org`. No redaction was reversed and no actor was re-identified.
- **AI Village**, gated with manual review. Access was granted partway through. A sample of its real
  benign agent actions is used only in the Appendix D transfer check, under its research-use terms and
  with citation. No chat text, no human identities, and no agent identities are rendered anywhere. The
  benign sample was scored only through the sprint's provided inference platform, for suspicion scoring
  and not for training or redistribution; only aggregate scores are reported.

## Dual use

Appendix A of the report states the dual-use position in full. In short: no new attack technique, no
backdoors released, no per-sample stealth ranking published, and the finding is the one a defender
needs in order to stop over-crediting a monitor panel.
