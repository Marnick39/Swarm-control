# Critique log (independent + adversarial agents)

## Round 1, independent reviewer (validity + communication)
Verdict: real multi-agent backbone genuinely answers the "relabelled single-agent data" critique;
the counterfactual-gap framing yields one honest new number; but four fixes were required.

1. AI Village access: the old report said gated/401. RESOLVED, the user obtained access; the 518k-event
   timeline is downloaded and in hand. Numbers differ from the README because the dataset grew.
2. Variance split was BACKWARDS in the concept. The paper's 9.9% is AUTHOR identity (shared across
   monitors too); 90.1% is everything else INCLUDING unmeasured monitor noise, and is an upper bound.
   Monitor noise is never measured. FIX: drop the latent model; resample rows of the empirical 500x43
   catch matrix directly (empirical copula / bootstrap), which preserves the true joint cross-monitor
   catch distribution exactly, with no parametric assumption.
3. "Calibrated" overclaims a domain transfer. Recall-at-2%-FPR on 50/50 code is not recall-at-audit-
   budget on a sub-0.1% base-rate heterogeneous timeline, and backdoor stealth != exfil stealth. Call
   it ASSUMED-TRANSFERRED, and make the on-platform real-monitor validation MANDATORY (it checks the
   marginal recall on AI-Village-style actions; it cannot fully check the correlation).
4. Coarse 11-point scores saturate by ~5% budget, so the 5 to 20% sweep is flat by construction and its
   "floor" is just the published 7.8% all-miss residue. Use the honest step function; label anything
   past the measured range as extrapolation. A bare sweep is an illustration, not a result.

Committed deliverable (the non-circular number): the INDEPENDENT-vs-CORRELATED containment DELTA under a
catch-consequence protocol (C7 halt/alert) on the REAL AI Village event ordering, i.e. the audit budget
required to hold containment above a target C under correlated vs independent monitor failure, where
protection depends on whether a catch precedes the first landed attack in real time. New because it uses
the real timeline + the catch-consequence dynamic + optional attacker selection, none of which are in
the static 500x43 matrix.

Video story: counterfactual contrast on the same backbone. An "if monitor failures were independent"
timeline that the widening audit sweeps clean, beside the "measured correlated" timeline where a fixed
cluster stays lit at every budget. The visible gap is the 315x shortfall shown over time. Metaphor: the
audit is a spotlight over the top-b most-suspicious actions; the residue is a persistent shadow cluster
that widening the spotlight never reaches, because every monitor's blind spots are in the same place.
Avoid "finer mesh"; the honest image is "all the sieves have holes in the same places."

## Round 2, adversarial red-team: PENDING (integrity, license, dual-use, visual honesty)

## Round 2, adversarial red-team (integrity, license, dual-use, visual honesty) - DELIVERED
The spine is necessary but not sufficient. Hard constraints it establishes:

1. PROVENANCE. The plan-B paper certifies AI Village "gated, not used, HTTP 401." We now have access
   (user-granted). Any v2 use of AIV must reconcile and update those statements, and cite AIV with the
   access basis and date. Not fatal, but must be done.
2. CIRCULARITY / KILL SHOT. A containment-vs-budget curve from the sim is an analytic consequence of the
   recall + correlation we feed in, and simulating it is LESS rigorous than the paper's exact
   computation. The one genuinely new number, recall vs audit budget 0.5 to 20 percent, should be
   computed EXACTLY from the existing 500x43 matrix (done: analysis/calibration-recall-by-budget.csv),
   with the measured step function and extrapolation labelled. No sim, no AIV, no Adaption needed for it.
3. DEFAMATION. Rendering NAMED real models attacking or breached assigns fabricated malicious conduct to
   real products; a watermark does not travel with a screenshot. MUST anonymize every agent that can
   appear attacking or breached. Never render real chat text or human identities.
4. LICENSE. AIV is research-use, no redistribution, no re-identification, no training. Rendering real
   events may be redistribution; if rights are unconfirmed, aggregate rather than render individual
   events. Do NOT send gated AIV data to Adaption.
5. REALISM FIGHTS HONESTY. The more realistic the synthetic attacks, the more mistakable for real
   telemetry. Synthetic attacks must be visually distinct at all times, non-operational, watermarked.
6. DUAL-USE CONTENT BAR. Generated actions: no working commands, fake hosts (example.invalid), redacted
   creds, sanitized one-liners, public taxonomy only, a ceiling of "no more useful than the public
   incident report," withhold any operational corpus, aggregates only.

Honest resolution the red-team endorses:
- Simulation is VIDEO-ONLY, explicitly conditional ("if our measurements transfer, this is the
  picture"), anonymized agents, persistent SIMULATION watermark, synthetic events visually distinct.
- The paper gets the EXACT budget sweep from the matrix (new slice, no sim).
- The ONE thing that can claim new evidence is the monitor-transfer check: run real monitors over
  INDEPENDENTLY-SOURCED agentic actions, fully sampled, pre-registered, to test whether the
  APPS-calibrated catch model transfers to agentic-action content.
