"""Swarm Traces: chain-forest topology and payload-template collapse.

The public release has no timestamps and no actor labels, so the two structures
that survive redaction are (a) the parent_id forest and (b) the payload text.
This measures how much behavioural diversity the swarm actually has: payloads
are normalised by replacing every redaction placeholder, number, quoted string
and identifier-like token, then hashed. Distinct hashes are distinct programs.
"""
import gzip, json, sys, re, collections, hashlib

path = sys.argv[1]
recs = []
with gzip.open(path, "rt", errors="replace") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            recs.append(json.loads(line))
        except Exception:
            pass
print("records: %d" % len(recs))

# ---- chain forest -----------------------------------------------------------
kids = collections.defaultdict(list)
parent = {}
kind = {}
for r in recs:
    kind[r["id"]] = r["kind"]
    p = r.get("parent_id")
    if p:
        kids[p].append(r["id"]); parent[r["id"]] = p
roots = [r["id"] for r in recs if not r.get("parent_id")]
print("roots: %d  internal parents: %d" % (len(roots), len(kids)))

def walk(root):
    """iterative DFS returning (size, depth)"""
    size, maxd = 0, 0
    stack = [(root, 1)]
    while stack:
        nid, d = stack.pop()
        size += 1; maxd = max(maxd, d)
        for ch in kids.get(nid, ()):
            stack.append((ch, d + 1))
    return size, maxd

sizes, depths = [], []
for rt in roots:
    s, d = walk(rt)
    sizes.append(s); depths.append(d)
import statistics as st
print("\nCHAIN FOREST")
print("  trees: %d" % len(sizes))
print("  singleton trees (size 1): %d (%.1f%%)" % (sum(1 for s in sizes if s == 1),
                                                   100 * sum(1 for s in sizes if s == 1) / len(sizes)))
print("  tree size: median %d mean %.2f max %d" % (st.median(sizes), st.mean(sizes), max(sizes)))
print("  tree depth: median %d mean %.2f max %d" % (st.median(depths), st.mean(depths), max(depths)))
dd = collections.Counter(depths)
print("  depth distribution: %s" % dict(sorted(dd.items())[:12]))
big = sorted(zip(sizes, depths, roots), reverse=True)[:5]
print("  largest trees (size, depth, root): %s" % [(a, b, c) for a, b, c in big])

# ---- template collapse ------------------------------------------------------
PLACE = re.compile(r"\[(?:REDACTED[^\]]*|[A-Z][A-Z0-9 _-]{2,40})\]")
NUM   = re.compile(r"\d+")
STR   = re.compile(r"""(['"])(?:(?!\1).){1,400}\1""")
WS    = re.compile(r"\s+")
HEXID = re.compile(r"\b[0-9a-fA-F]{8,}\b")

def norm(t):
    t = PLACE.sub("@", t)
    t = HEXID.sub("#", t)
    t = STR.sub("'S'", t)
    t = NUM.sub("0", t)
    t = WS.sub(" ", t)
    return t.strip()

by_kind = collections.defaultdict(collections.Counter)
for r in recs:
    h = hashlib.sha1(norm(r["text"]).encode("utf8", "replace")).hexdigest()[:16]
    by_kind[r["kind"]][h] += 1

print("\nTEMPLATE COLLAPSE (distinct normalised programs per record kind)")
print("  %-16s %10s %10s %10s %8s" % ("kind", "records", "templates", "top1_share", "ratio"))
summary = []
for k, cnt in sorted(by_kind.items(), key=lambda kv: -sum(kv[1].values())):
    tot = sum(cnt.values()); nt = len(cnt); top1 = cnt.most_common(1)[0][1]
    summary.append((k, tot, nt, top1 / tot, tot / nt))
    print("  %-16s %10d %10d %9.1f%% %7.1fx" % (k, tot, nt, 100 * top1 / tot, tot / nt))

allc = collections.Counter()
for cnt in by_kind.values():
    allc.update(cnt)
tot = sum(allc.values())
print("\n  ALL KINDS: %d records collapse to %d templates (%.1fx reuse)" % (tot, len(allc), tot / len(allc)))
cum, need = 0, None
for i, (h, v) in enumerate(allc.most_common(), 1):
    cum += v
    if need is None and cum >= 0.5 * tot:
        need = i
print("  %d templates (%.3f%% of templates) cover 50%% of all records" % (need, 100 * need / len(allc)))
cum = 0
for i, (h, v) in enumerate(allc.most_common(), 1):
    cum += v
    if cum >= 0.9 * tot:
        print("  %d templates (%.2f%% of templates) cover 90%% of all records" % (i, 100 * i / len(allc)))
        break
print("\n  payload templates by frequency (top 12 counts): %s" % [v for _, v in by_kind["payload"].most_common(12)])

import csv, os
out = sys.argv[2] if len(sys.argv) > 2 else "analysis"
with open(os.path.join(out, "swarmtraces-structure.csv"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(["kind", "records", "templates", "top1_share", "reuse_ratio"])
    w.writerows([(k, a, b, "%.4f" % c2, "%.2f" % d) for k, a, b, c2, d in summary])
with open(os.path.join(out, "swarmtraces-forest.csv"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(["metric", "value"])
    for kk, vv in [("records", len(recs)), ("trees", len(sizes)),
                   ("singletons", sum(1 for s in sizes if s == 1)),
                   ("median_size", st.median(sizes)), ("mean_size", round(st.mean(sizes), 3)),
                   ("max_size", max(sizes)), ("median_depth", st.median(depths)),
                   ("mean_depth", round(st.mean(depths), 3)), ("max_depth", max(depths)),
                   ("records_with_parent", sum(1 for r in recs if r.get("parent_id"))),
                   ("records_with_timestamp", sum(1 for r in recs if r.get("time_utc"))),
                   ("records_with_tags", sum(1 for r in recs if (r.get("tags") or "").strip()))]:
        w.writerow([kk, vv])
print("DONE wrote swarmtraces-structure.csv swarmtraces-forest.csv")
