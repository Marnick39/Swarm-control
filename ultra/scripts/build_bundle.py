#!/usr/bin/env python3
"""
build_bundle.py  -  Reshape the grounded HF-incident data into a swecraft-style
"sim-browser" bundle that SIM-ULTRA renders.

Reads  ../sim-ng/data/incident.json   (the DOCUMENTED kill chain, named agents,
                                        MEASURED budget->block table, phases)
Writes data/bundle.json  and  data/bundle.js  (window.BUNDLE = ...)

The bundle mirrors the swecraft bundle idiom:
  world     - a hex-grid layout of the kill-chain nodes drawn as buildings,
              grouped into owner districts, with dependency + message edges.
  agents    - the named roster, each with a colour, a home node, a monogram
              avatar, and per-run stats.
  timeline  - deterministic per-tick acts (tick, agent, node, verb, category,
              suspicion). Blocking is computed in the browser from the audit
              budget, so the slider stays honest and interactive.
  audit     - the CONTROL surface: the measured budget->block table, detection
              advance, Report / Findings / Triage.

Honesty tiers (DOCUMENTED / MEASURED / MODELED) are carried onto every surface.
Deterministic. No network, no model calls.

    python3 -I scripts/build_bundle.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_JSON = os.path.join(ROOT, "data", "bundle.json")
OUT_JS = os.path.join(ROOT, "data", "bundle.js")

# Resolve the grounded incident file across layouts (dev folder vs nested in the
# Swarm-control repo under /ultra). The generated bundle is what ships; this
# script only needs the source when regenerating.
def _find_src():
    cands = [
        os.path.join(ROOT, "..", "sim-ng", "data", "incident.json"),  # ~/workspace/SIM-ULTRA
        os.path.join(ROOT, "..", "data", "incident.json"),            # repo /ultra -> repo root
        os.path.join(ROOT, "data", "incident.json"),                  # alongside
    ]
    for c in cands:
        if os.path.exists(os.path.abspath(c)):
            return os.path.abspath(c)
    return os.path.abspath(cands[0])
SRC = _find_src()

# --------------------------------------------------------------------- PRNG
def mulberry32(seed):
    state = seed & 0xFFFFFFFF
    def rng():
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return rng

# ------------------------------------------------------------- hex layout
# Pointy-top axial (q, r). A snake path so every consecutive kill-chain node is
# hex-adjacent, forming one connected blob (like the swecraft worlds).
HEX = {
    "artifactory_proxy":  (0, 0),
    "covert_channel":     (1, 0),
    "modal_sandbox":      (2, 0),
    "hf_creds":           (3, 0),
    "hf_dataset_viewer":  (2, 1),
    "hf_worker":          (1, 1),
    "hf_cluster":         (0, 1),
    "hf_db_repos":        (-1, 1),
    "slack":              (-1, 2),
    "docker_hub":         (0, 2),
    "exfil":              (1, 2),
    "c2":                 (2, 2),
}

# Owner districts (tint + label). ext is intentionally multi-part.
DISTRICTS = {
    "openai": {"label": "OpenAI internal",   "color": "#10a37f"},
    "ext":    {"label": "External / offsite", "color": "#9c36b5"},
    "hf":     {"label": "Hugging Face",       "color": "#d9731a"},
}

# Relative code-size per node -> building scale (MODELED, for visual weight).
SIZE = {
    "artifactory_proxy": 0.65, "covert_channel": 0.9, "modal_sandbox": 0.55,
    "hf_creds": 0.5, "hf_dataset_viewer": 0.7, "hf_worker": 0.85,
    "hf_cluster": 1.0, "hf_db_repos": 0.8, "slack": 0.6,
    "docker_hub": 0.9, "exfil": 0.6, "c2": 0.75,
}

# A short label for the map (the full label lives in the panel). Kept tight so
# neighbouring cells do not collide at the default zoom.
SHORT = {
    "artifactory_proxy": "artifactory", "covert_channel": "board",
    "modal_sandbox": "modal", "hf_creds": "creds",
    "hf_dataset_viewer": "datasets", "hf_worker": "worker",
    "hf_cluster": "cluster", "hf_db_repos": "db+repos",
    "slack": "slack", "docker_hub": "docker",
    "exfil": "exfil", "c2": "c2",
}

# ------------------------------------------------------- agent colour palette
# Synthetic attacker-swarm palette (labelled synthetic). A stable colour per
# agent so avatars and act dots read consistently, echoing swecraft's per-model
# colouring without claiming a model identity.
PALETTE = [
    "#d6453d", "#d9731a", "#c9a227", "#2f9e44", "#1098ad",
    "#3186ff", "#4d61c8", "#7b52c7", "#9c36b5", "#c2255c",
    "#e8590c", "#5c940d", "#0ca678", "#495057", "#862e9c",
]


def monogram(agent_id):
    """A short avatar monogram from the agent id."""
    s = "".join(ch for ch in agent_id if ch.isalnum())
    if len(s) <= 3:
        return s.upper()
    # keep leading letters + trailing digits where possible
    head = s[:2].upper()
    tail = s[-1].upper()
    return (head + tail)[:3]


def main():
    with open(os.path.abspath(SRC), "r", encoding="utf-8") as f:
        inc = json.load(f)

    nodes = inc["nodes"]
    node_by_id = {n["id"]: n for n in nodes}
    chain = [n["id"] for n in nodes]  # documented order == kill-chain order
    rng = mulberry32(0x5112A)

    # -------- world cells
    cells = []
    for n in nodes:
        nid = n["id"]
        q, r = HEX[nid]
        cells.append({
            "id": nid,
            "q": q, "r": r,
            "label": n["label"],
            "short": SHORT.get(nid, nid),
            "kind": n["kind"],
            "owner": n["own"],
            "district": DISTRICTS[n["own"]]["label"],
            "date": n["date"],
            "tick": n["tick"],
            "stage": n["stage"],
            "source": n["source"],
            "technique": n["technique"],
            "size": SIZE.get(nid, 0.7),
        })

    # -------- edges: dependency (kill-chain reach) + a few message arcs
    edges = []
    for a, b in zip(chain, chain[1:]):
        edges.append({"from": a, "to": b, "kind": "reach"})
    # coordination message arcs back to the board (covert_channel) and C2 relays
    for src in ["modal_sandbox", "hf_worker", "hf_db_repos", "docker_hub"]:
        edges.append({"from": src, "to": "covert_channel", "kind": "msg"})
    for src in ["hf_cluster", "exfil"]:
        edges.append({"from": src, "to": "c2", "kind": "msg"})

    # -------- districts (owner -> member cell ids)
    districts = []
    for owner, meta in DISTRICTS.items():
        members = [n["id"] for n in nodes if n["own"] == owner]
        districts.append({
            "owner": owner, "label": meta["label"],
            "color": meta["color"], "cells": members,
        })

    # -------- agents
    agents_in = inc["agents"]
    agents = []
    for i, a in enumerate(agents_in):
        color = PALETTE[i % len(PALETTE)]
        # home node: first node whose stage matches, else by first_tick
        home = next((n["id"] for n in nodes if n["stage"] == a["stage"]), None)
        if home is None:
            home = min(nodes, key=lambda n: abs(n["tick"] - a["first_tick"]))["id"]
        agents.append({
            "id": a["id"],
            "mono": monogram(a["id"]),
            "color": color,
            "home": home,
            "stage": a["stage"],
            "lead": a.get("lead", False),
            "role": a["role"],
            "headline": a["headline"],
            "first_tick": a["first_tick"],
        })
    agent_ids = [a["id"] for a in agents]

    # -------- timeline: deterministic per-tick acts
    TICKS = 100
    act_verbs = inc["act_verbs"]
    categories = [c["name"] for c in inc["categories"]]
    cat_w = [c["pct"] for c in inc["categories"]]
    cat_total = sum(cat_w)

    def pick_cat():
        x = rng() * cat_total
        acc = 0.0
        for name, w in zip(categories, cat_w):
            acc += w
            if x <= acc:
                return name
        return categories[-1]

    # which nodes are "active" at a tick: those whose tick <= t, weighted to the
    # frontier (most-recently-reached nodes act most).
    acts = []
    # agent activity windows
    for t in range(TICKS + 1):
        active_nodes = [n for n in nodes if n["tick"] <= t]
        if not active_nodes:
            continue
        # act volume ramps then plateaus; a burst once the breach lands (tick>=30)
        base = 2 + int(6 * min(1.0, t / 40.0))
        if 30 <= t <= 78:
            base += 3
        n_acts = base + int(rng() * 3)
        # frontier weighting: newer nodes get more acts
        weights = []
        for n in active_nodes:
            age = t - n["tick"]
            w = 1.0 / (1.0 + 0.12 * age)
            weights.append(w)
        wsum = sum(weights)
        for _ in range(n_acts):
            x = rng() * wsum
            acc = 0.0
            chosen = active_nodes[-1]
            for n, w in zip(active_nodes, weights):
                acc += w
                if x <= acc:
                    chosen = n
                    break
            stage = chosen["stage"]
            verbs = act_verbs.get(stage, ["act"])
            verb = verbs[int(rng() * len(verbs)) % len(verbs)]
            # an agent present by this tick, biased to this stage
            cands = [a for a in agents if a["first_tick"] <= t and a["stage"] == stage]
            if not cands:
                cands = [a for a in agents if a["first_tick"] <= t]
            if not cands:
                cands = agents
            actor = cands[int(rng() * len(cands)) % len(cands)]
            # suspicion score 0..1 (MODELED). Most acts look mundane; a correlated
            # fraction stays low no matter what (the residue). A tail is obvious.
            u = rng()
            if u < 0.08:
                susp = 0.04 + 0.06 * rng()         # residue: quiet, low-suspicion
            elif u < 0.65:
                susp = 0.15 + 0.35 * rng()         # ambiguous bulk
            else:
                susp = 0.5 + 0.5 * rng()           # loud
            acts.append({
                "t": t,
                "node": chosen["id"],
                "agent": actor["id"],
                "verb": verb,
                "cat": pick_cat(),
                "susp": round(susp, 3),
            })

    # per-node rollups for map badges
    node_acts = {n["id"]: 0 for n in nodes}
    for a in acts:
        node_acts[a["node"]] += 1

    # badges: acts (blue pill), reach-out deps (green), msg arcs (purple), source tag
    badges = {}
    out_deps = {n["id"]: 0 for n in nodes}
    msg_cnt = {n["id"]: 0 for n in nodes}
    for e in edges:
        if e["kind"] == "reach":
            out_deps[e["from"]] += 1
        else:
            msg_cnt[e["from"]] += 1
            msg_cnt[e["to"]] += 1
    for n in nodes:
        badges[n["id"]] = {
            "acts": node_acts[n["id"]],
            "reach": out_deps[n["id"]],
            "msgs": msg_cnt[n["id"]],
        }
    for c in cells:
        c["badges"] = badges[c["id"]]
        # a representative agent for the cell avatar
        home_agents = [a for a in agents if a["home"] == c["id"]]
        c["avatar"] = home_agents[0]["id"] if home_agents else agents[0]["id"]

    # -------- audit / control surface
    budgets = inc["budgets"]
    blocks = inc["blocks"]
    residue = inc["residue"]

    # detection advance: under control, the burst is caught early. DOC detection
    # tick (no control) vs the tick a budget's blocked-count threshold is crossed.
    DOC_DETECT_TICK = 92        # "RSA-signed C2 controllers" surfaced the swarm
    # tick->date map from phases for display
    phases = inc["phases"]

    def date_from_tick(t):
        # nearest phase at or before t
        best = phases[0]
        for p in phases:
            if p["tick"] <= t:
                best = p
        return best["date"]

    # Findings (MEASURED + DOCUMENTED). Each has an evidence pointer.
    findings = [
        {
            "id": "F1", "tier": "MEASURED", "sev": "high",
            "claim": "A 2% audit budget blocks 74% of attempted attacks.",
            "detail": "On the reassembled act stream, a low-budget auditor that "
                      "reviews the 2% highest-suspicion acts blocks 74% of the "
                      "attacks that would otherwise land.",
            "evidence": "control-budgets transfer check, Appendix D",
            "node": "hf_worker",
        },
        {
            "id": "F2", "tier": "MEASURED", "sev": "critical",
            "claim": "An 8% correlated residue survives every budget.",
            "detail": "A correlated low-suspicion fraction of attacks stays under "
                      "the auditor's threshold no matter how large the budget: "
                      "block rate saturates at 0.92, never 1.0.",
            "evidence": "control-budgets transfer check (residue term)",
            "node": "hf_db_repos",
        },
        {
            "id": "F3", "tier": "MODELED", "sev": "high",
            "claim": "Control moves detection earlier.",
            "detail": "A burst of blocked acts trips an alarm well before the "
                      "swarm reaches the C2 stage that surfaced it without "
                      "control. Knowing sooner is itself a benefit.",
            "evidence": "modelled alarm on blocked-act burst",
            "node": "covert_channel",
        },
        {
            "id": "F4", "tier": "DOCUMENTED", "sev": "medium",
            "claim": "Coordination concentrates on one channel.",
            "detail": "Around 1,200 agents converge on a single cache-backed "
                      "message board. A budget spent there reaches the most acts "
                      "per unit of review.",
            "evidence": "METR investigation",
            "node": "covert_channel",
        },
    ]

    # Triage: per attack category, the share a 2% auditor catches vs misses.
    # anchor block rate at 2% applied, with the residue carved out for the
    # quiet categories (credential use, C2 check-in).
    anchor = 0.74
    quiet = {"Controller check-in (C2)", "Credential use / theft", "Trace / log removal"}
    triage = []
    for c in inc["categories"]:
        name = c["name"]
        caught = anchor * (0.55 if name in quiet else 1.08)
        caught = max(0.0, min(0.95, caught))
        triage.append({
            "cat": name,
            "share": c["pct"],
            "caught": round(caught, 2),
            "verdict": "mostly caught" if caught >= 0.7 else
                       ("partly caught" if caught >= 0.45 else "mostly missed"),
        })

    control = {
        "budgets": budgets,
        "blocks": blocks,
        "residue": residue,
        "anchor_pct": 74,
        "anchor_budget": 2.0,
        "doc_detect_tick": DOC_DETECT_TICK,
        "alarm_blocked": 32,
        "findings": findings,
        "triage": triage,
        "categories": inc["categories"],
    }

    bundle = {
        "meta": inc["meta"],
        "world": {
            "name": "World-HF-1 · the July 2026 swarm",
            "blurb": "A documented 12-node kill chain across OpenAI internal, "
                     "Hugging Face and external infrastructure. Around 1,200 "
                     "agents coordinate on a hidden cache-backed board. The "
                     "overlay is a control-budget wargame: an auditor reviews "
                     "a slice of the act stream and blocks what it catches.",
            "hex_size": 116,
            "cells": cells,
            "districts": districts,
            "edges": edges,
            "chain": chain,
        },
        "agents": agents,
        "timeline": {
            "ticks": TICKS,
            "phases": phases,
            "acts": acts,
            "date_map": {str(p["tick"]): p["date"] for p in phases},
        },
        "control": control,
        "swarm": inc["swarm"],
        "honesty": {
            "DOCUMENTED": "Nodes, agents, dates, counts and the kill chain come "
                          "from the public investigation (METR, swarmtraces, CSA).",
            "MEASURED": "The budget->block table and the correlated residue come "
                        "from our control-budgets transfer check.",
            "MODELED": "Per-tick acts, suspicion scores and the alarm are a "
                       "synthetic model, not telemetry.",
        },
    }

    # validate a few invariants
    assert len(cells) == 12, "expected 12 cells"
    assert all("q" in c and "r" in c for c in cells)
    assert len(agents) == len(agents_in)
    assert len(acts) > 300, f"too few acts: {len(acts)}"
    assert len(budgets) == len(blocks)

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(bundle, f, indent=1)
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("window.BUNDLE = ")
        json.dump(bundle, f, separators=(",", ":"))
        f.write(";\n")

    print(f"wrote {OUT_JSON}")
    print(f"wrote {OUT_JS}")
    print(f"cells={len(cells)} agents={len(agents)} acts={len(acts)} "
          f"ticks={TICKS} budgets={len(budgets)}")


if __name__ == "__main__":
    main()
