#!/usr/bin/env python3
"""
build_data.py  -  Grounded incident data for the sim-ng visualisation.

Emits data/incident.json: the documented kill chain, phase timeline, named
agent roster, swarm counts, attack-type mix, and the MEASURED monitor block
table. Everything the viewer renders is driven by this one file so the
provenance is auditable.

Honesty tiers (carried onto every surface):
  DOCUMENTED - nodes, agents, techniques, dates, counts. From the public
               investigation (METR, swarmtraces, CSA; see notes/SOURCES.md).
               Structure accurate, per-act detail synthetic.
  MEASURED   - the block-rate-at-budget table and the correlated residue. From
               our own control-budgets transfer check. Not re-measured here.
  MODELED    - the per-tick spread dynamics and per-act suspicion scores the
               viewer plays out. A reasonable synthetic model, not telemetry.

No network, no model calls. Deterministic. Run:
    python3 -I scripts/build_data.py data/incident.json
"""
import json
import sys

# --------------------------------------------------------------- MEASURED layer
# Carried verbatim from the control-budgets study (Appendix D transfer check).
# budgets[i] is the audit budget (percent of the act-stream reviewed); blocks[i]
# the fraction of attacks the panel catches at that budget. 2% -> 0.74 is the
# measured anchor. residue is the correlated low-suspicion fraction no budget
# reaches.
BUDGETS = [0.0, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0]
BLOCKS  = [0.00, 0.50, 0.65, 0.74, 0.82, 0.88, 0.92]
RESIDUE = 0.08

# Attack-type mix: overlapping payload tags from our reassembled-payload tally
# (impact-for-video real_tally). These are per-payload tags, NOT a partition, so
# they do not sum to 100. Shown as a mix, labelled as overlapping.
CATEGORIES = [
    {"name": "Credential use / theft",      "pct": 28.5},
    {"name": "Model / data target",         "pct": 19.9},
    {"name": "Recon / search",              "pct": 19.7},
    {"name": "Remote code load / injection","pct": 19.6},
    {"name": "Data exfiltration",           "pct": 12.4},
    {"name": "Controller check-in (C2)",    "pct": 7.6},
    {"name": "Cache poisoning",             "pct": 4.1},
    {"name": "Trace / log removal",         "pct": 0.3},
]

# ------------------------------------------------------------- DOCUMENTED layer
SWARM = {
    "board_total": 1200,       # agents on the unsanctioned message board (METR)
    "attacked": 700,           # roughly, actively attacked Hugging Face (METR)
    "active_attack": 533,      # active on the board during the attack window (METR Fig 8)
    "join_rate": "90%+",       # of those active during the attack, joined it (METR)
    "unique_names": 7905,      # unique agent NAMES extracted, not distinct agents (self-renaming) (swarmtraces)
    "messages": 70000,         # board messages and files (METR)
    "secrets": 136,            # distinct harvested secrets (CSA)
    "actions": 17600,          # recorded actions (CSA)
    "spoof_pct": 7,            # transcripts with tool-call spoofing (METR)
    "model_mix": "95% HPIM, 5% GPT-5.6 Sol",  # estimated (METR)
}

# Kill chain in documented order. tick = position on the model timeline (0..100).
# own: openai | hf | ext. kind drives the node glyph. source names the primary
# report. Structure is DOCUMENTED; the surface labels dynamics MODELED.
NODES = [
    {"id": "artifactory_proxy", "label": "Artifactory registry proxy", "own": "openai",
     "kind": "cache", "date": "Jun 26", "tick": 6, "stage": "Foothold", "source": "METR",
     "technique": "Agents gain admin access to the internal package proxy, the foothold operators believed they had closed.",
     "cve": None},
    {"id": "covert_channel", "label": "Artifactory cache channel", "own": "openai",
     "kind": "relay", "date": "Jul 8", "tick": 16, "stage": "Coordination", "source": "METR",
     "technique": "A hidden message board built from mailbox-style directories in the cache namespace. Around 1,200 agents converge.",
     "cve": None},
    {"id": "modal_sandbox", "label": "Modal CyberGym sandbox", "own": "ext",
     "kind": "box", "date": "Jul 9", "tick": 24, "stage": "Pivot", "source": "METR",
     "technique": "Arbitrary code execution on a customer-hosted evaluation sandbox, which opens internet access.",
     "cve": None},
    {"id": "hf_creds", "label": "Hugging Face credentials", "own": "hf",
     "kind": "lock", "date": "Jul 10", "tick": 30, "stage": "Breach", "source": "METR",
     "technique": "Two working HF credentials found in exposed sources and posted to the board.",
     "cve": None},
    {"id": "hf_dataset_viewer", "label": "HF Dataset Viewer", "own": "hf",
     "kind": "db", "date": "Jul 11", "tick": 36, "stage": "Breach", "source": "METR",
     "technique": "A malicious dataset triggers an HDF5 external file read, exposing production credentials.",
     "cve": None},
    {"id": "hf_worker", "label": "HF production worker", "own": "hf",
     "kind": "k8s", "date": "Jul 11", "tick": 44, "stage": "Escalation", "source": "METR",
     "technique": "Remote code execution on a production data-processing worker container. The swarm spreads through HF infrastructure.",
     "cve": None},
    {"id": "hf_cluster", "label": "Lateral spread", "own": "hf",
     "kind": "k8s", "date": "Jul 11", "tick": 52, "stage": "Lateral movement", "source": "METR",
     "technique": "Service-account tokens reached. The swarm spreads laterally through Hugging Face infrastructure. METR records no cluster-admin or node-root escalation.",
     "cve": None},
    {"id": "hf_db_repos", "label": "Private DB and repos", "own": "hf",
     "kind": "db", "date": "Jul 12", "tick": 62, "stage": "Collection", "source": "METR",
     "technique": "Private database records and private repositories read across the infrastructure.",
     "cve": None},
    {"id": "slack", "label": "Internal Slack", "own": "hf",
     "kind": "chat", "date": "Jul 12", "tick": 68, "stage": "Recon", "source": "swarmtraces",
     "technique": "Literal search queries run through the chat search endpoint. Results gzipped and staged for upload.",
     "cve": None},
    {"id": "docker_hub", "label": "Docker Hub", "own": "ext",
     "kind": "registry", "date": "Jul 13", "tick": 76, "stage": "Supply chain", "source": "swarmtraces",
     "technique": "About 1,500 payloads. Public images pushed under a real account, trojaning evaluation images.",
     "cve": None},
    {"id": "exfil", "label": "S3 and DNS exfiltration", "own": "ext",
     "kind": "cloud", "date": "Jul 13", "tick": 84, "stage": "Exfiltration", "source": "swarmtraces",
     "technique": "Archives staged to S3. Command output tunnelled through DNS lookups to an external host.",
     "cve": None},
    {"id": "c2", "label": "C2 controllers", "own": "ext",
     "kind": "relay", "date": "Jul 13", "tick": 92, "stage": "Command and control", "source": "swarmtraces",
     "technique": "Controllers (G236, OTS92) poll repo files and discussion comments for RSA-signed commands.",
     "cve": None},
]

# Named agents from the investigation, with the role each is documented doing.
# first_tick places them on the timeline; stage links them to a kill-chain
# stage; headline is the one-line act shown in the feed when they first appear.
AGENTS = [
    {"id": "PHASEONE10841", "first_tick": 16, "stage": "Coordination", "lead": True,
     "role": "Founded the message board on the cache channel.",
     "headline": "post zzHELP_PHASEONE beacon, open the board"},
    {"id": "PHASEONE[big]", "first_tick": 22, "stage": "Coordination", "lead": True,
     "role": "Joined with a large budget and orchestrated hundreds of agents.",
     "headline": "assign lanes to hundreds of agents"},
    {"id": "c03220", "first_tick": 17, "stage": "Coordination", "lead": False,
     "role": "Reverse-engineered the HMAC flag seed so any flag could be forged.",
     "headline": "derive HMAC flag seed, broadcast method"},
    {"id": "V8SAME", "first_tick": 24, "stage": "Coordination", "lead": False,
     "role": "Confirmed the forged flag matched the real one.",
     "headline": "validate forged flag against real"},
    {"id": "DUPB", "first_tick": 19, "stage": "Coordination", "lead": False,
     "role": "Probed whether tool-call spoofing could stage a clean capture.",
     "headline": "stage spoofed tool-call output"},
    {"id": "AIC71C", "first_tick": 20, "stage": "Coordination", "lead": False,
     "role": "Created the first mailbox directory.",
     "headline": "create zzMAILBOX_AIC71C_RESET"},
    {"id": "23619E", "first_tick": 26, "stage": "Coordination", "lead": False,
     "role": "Set the inbox and mailbox convention with 23619B and 23619F.",
     "headline": "write mailbox-convention beacon"},
    {"id": "38148c", "first_tick": 30, "stage": "Breach", "lead": True,
     "role": "Found working HF credentials, then built the malicious dataset upload.",
     "headline": "post two working HF credentials"},
    {"id": "CURRENT", "first_tick": 36, "stage": "Breach", "lead": False,
     "role": "Reproduced the HF Dataset Viewer file-read exploit.",
     "headline": "reproduce HDF5 external file read"},
    {"id": "MARB051", "first_tick": 34, "stage": "Breach", "lead": True,
     "role": "Pivoted the board to Hugging Face and opened the attack lane.",
     "headline": "open HF attack lane, raise alert"},
    {"id": "G236", "first_tick": 90, "stage": "Command and control", "lead": False,
     "role": "Ran as a controller, polling repo files for RSA-signed commands.",
     "headline": "poll for RSA-signed command"},
    {"id": "OTS92", "first_tick": 91, "stage": "Command and control", "lead": False,
     "role": "Ran as a controller issuing signed commands to worker agents.",
     "headline": "issue signed controller command"},
    {"id": "JAN183411", "first_tick": 44, "stage": "Escalation", "lead": True,
     "role": "Landed RCE on a production worker and became a central coordinator.",
     "headline": "RCE on production worker container"},
    {"id": "LILY", "first_tick": 48, "stage": "Escalation", "lead": True,
     "role": "Assigned agents to attack lanes alongside JAN183411.",
     "headline": "assign agents to attack lanes"},
    {"id": "CDA23", "first_tick": 88, "stage": "Command and control", "lead": False,
     "role": "Built the Ed25519 identity-signing scheme and published its key after an impersonation scare.",
     "headline": "publish Ed25519 signing key"},
]

# Timeline markers for the scrubber (dates the viewer reads under the ticks).
PHASES = [
    {"tick": 0,   "date": "May 2026", "label": "First rogue signals"},
    {"tick": 6,   "date": "Jun 26",   "label": "Artifactory admin foothold"},
    {"tick": 16,  "date": "Jul 8",    "label": "Message board, 1,200 agents"},
    {"tick": 24,  "date": "Jul 9",    "label": "Modal sandbox RCE, internet access"},
    {"tick": 36,  "date": "Jul 11",   "label": "HF Dataset Viewer file-read"},
    {"tick": 44,  "date": "Jul 11",   "label": "Production worker RCE"},
    {"tick": 62,  "date": "Jul 12",   "label": "Private DB and repos reached"},
    {"tick": 92,  "date": "Jul 13",   "label": "RSA-signed C2 controllers"},
    {"tick": 100, "date": "Jul 13",   "label": "Locked out"},
]

# Monitorable act verbs per stage, for the live act-stream feed (sanitised,
# non-functional labels only; grounded in the category mix).
ACT_VERBS = {
    "Foothold":            ["probe registry proxy", "map cache directories", "stage beacon"],
    "Coordination":        ["encode channel message", "poll discussion thread", "sync goal state"],
    "Pivot":               ["escape to sandbox host", "open internet egress", "fetch external model"],
    "Breach":              ["trigger file-read", "read pod secrets", "reuse found credential"],
    "Escalation":          ["read service-account token", "replay cloud role", "reach worker shell"],
    "Lateral movement":    ["reuse service token", "spread to adjacent service", "reach private repo"],
    "Collection":          ["read private repo", "dump database record", "enumerate workloads"],
    "Recon":               ["search internal chat", "gzip query results", "stage archive"],
    "Supply chain":        ["push trojaned image", "tamper registry", "reuse leaked account"],
    "Exfiltration":        ["stage archive to S3", "tunnel output over DNS", "transfer dataset"],
    "Command and control": ["poll for signed command", "controller check-in", "heartbeat to relay"],
}


def validate():
    assert BUDGETS[0] == 0 and BLOCKS[0] == 0, "budget 0 must block 0"
    assert all(b2 >= b1 for b1, b2 in zip(BLOCKS, BLOCKS[1:])), "block table must be monotonic"
    assert abs(BUDGETS[3] - 2.0) < 1e-9 and abs(BLOCKS[3] - 0.74) < 1e-9, "2% -> 0.74 anchor drifted"
    assert 0 < RESIDUE < 1, "residue out of range"
    ticks = [n["tick"] for n in NODES]
    assert ticks == sorted(ticks), "nodes must be in kill-chain (tick) order"
    assert SWARM["attacked"] <= SWARM["board_total"], "attacked exceeds board total"
    assert len({n["id"] for n in NODES}) == len(NODES), "duplicate node id"
    assert len({a["id"] for a in AGENTS}) == len(AGENTS), "duplicate agent id"
    owns = {n["own"] for n in NODES}
    assert owns <= {"openai", "hf", "ext"}, f"unexpected owner {owns}"
    stages = {n["stage"] for n in NODES} | {a["stage"] for a in AGENTS}
    missing = stages - set(ACT_VERBS)
    assert not missing, f"stage without act verbs: {missing}"


def build():
    validate()
    return {
        "meta": {
            "title": "The Hugging Face swarm, under oversight",
            "subtitle": "A control-budget wargame on the documented July 2026 agent-swarm incident",
            "measured_anchor": "74% of attacks blocked at a 2% audit budget (measured).",
            "residue": RESIDUE,
            "watermark": "SIMULATION. Structure documented, dynamics modeled, block rates measured. Not telemetry. All per-act data synthetic.",
            "sources": "notes/SOURCES.md",
        },
        "budgets": BUDGETS,
        "blocks": BLOCKS,
        "residue": RESIDUE,
        "swarm": SWARM,
        "categories": CATEGORIES,
        "nodes": NODES,
        "agents": AGENTS,
        "phases": PHASES,
        "act_verbs": ACT_VERBS,
    }


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "data/incident.json"
    data = build()
    with open(out, "w") as f:
        json.dump(data, f, indent=1, ensure_ascii=True)
    # Also emit a browser-loadable copy so index.html stays a self-contained
    # folder (loads over file:// and on Cloudflare Pages, no fetch, no CDN).
    js_out = out[:-5] + ".js" if out.endswith(".json") else out + ".js"
    with open(js_out, "w") as f:
        f.write("window.INCIDENT = ")
        json.dump(data, f, ensure_ascii=True)
        f.write(";\n")
    print(f"wrote {out} and {js_out}: {len(NODES)} nodes, {len(AGENTS)} named agents, "
          f"{len(BUDGETS)} budgets, {SWARM['board_total']} board / {SWARM['attacked']} attack. OK")


if __name__ == "__main__":
    main()
