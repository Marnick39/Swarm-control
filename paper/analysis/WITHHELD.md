
## Also withheld: raw transfer-check actions
`transfer-results.csv` and `transfer-results-frozen.csv` hold the per-action monitor scores together
with the raw action text. The benign actions are sampled from the gated AI Village dataset (no
redistribution under its terms) and the malicious actions are raw Swarm Traces payloads. We ship only
the aggregates needed to check Appendix D: `transfer-summary.csv`. The raw rows are reproducible from
the pre-registered procedure in `notes/PREREG-transfer-check.md` by anyone with the same access.
