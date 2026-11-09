"""Robustness: panel scaling with one arm per MODEL FAMILY.

The 43 arms include the same model at several reasoning efforts and score scales.
A random k-subset of arms therefore often contains near-duplicates, which would
manufacture the correlation that C2 reports. This recomputes the panel curve over
families, so no panel can contain the same model twice.
"""
import csv, sys, os, re, collections, itertools, random
from math import comb

OUT = sys.argv[1]

def family(run):
    r = run
    # order matters: longest / most specific first
    pats = [
        ("sonnet55",      r"sonnet55"),
        ("haiku55",       r"haiku55"),
        ("haiku45",       r"haiku45"),
        ("glm53",         r"glm53"),
        ("gptoss120b",    r"gptoss120b"),
        ("gpt6luna",      r"luna"),          # gpt6luna and luna-* are one model
        ("qwen38omni",    r"qwen38"),        # qwen38-scale100 serves qwen3.8-omni-flash
        ("gemini35fl",    r"gemini35fl"),
        ("gemini35lite",  r"gemini35lite"),
        ("gemma3-4b",     r"gemma3-4b"),
        ("gemma3-27b",    r"gemma3-27b"),
        ("gemma426b",     r"gemma426b"),
        ("mistrallarge4", r"mistrallarge4"),
        ("ministral14b",  r"ministral14b"),
    ]
    for name, p in pats:
        if re.search(p, r):
            return name
    return "UNMAPPED:" + r

rows, arms = [], None
with open(os.path.join(OUT, "matrix-caught.csv")) as f:
    rd = csv.reader(f); hdr = next(rd); arms = hdr[5:]
    for r in rd:
        rows.append([int(x) for x in r[5:]])
n, M = len(rows), len(arms)
fam = [family(a) for a in arms]
unmapped = [a for a, g in zip(arms, fam) if g.startswith("UNMAPPED")]
if unmapped:
    print("!! UNMAPPED ARMS:", unmapped); sys.exit(1)
byfam = collections.defaultdict(list)
for j, g in enumerate(fam):
    byfam[g].append(j)
fams = sorted(byfam)
print("families: %d" % len(fams))
for g in fams:
    rec = [sum(rows[i][j] for i in range(n)) / n for j in byfam[g]]
    print("  %-14s %2d arms  recall %.3f to %.3f" % (g, len(byfam[g]), min(rec), max(rec)))

recall = [sum(rows[i][j] for i in range(n)) / n for j in range(M)]
# Primary pool excludes the single arm that reads the author's comments, so every
# panel member is in the same information condition. The mixed pool is kept as a variant.
stripped = {g: max([j for j in byfam[g] if "nostrip" not in arms[j]], key=lambda j: recall[j])
            for g in fams}
mixed    = {g: max(byfam[g], key=lambda j: recall[j]) for g in fams}
best = stripped
print("\nbest STRIPPED arm per family (primary pool):")
for g in fams:
    print("  %-14s %-52s recall %.3f" % (g, arms[best[g]], recall[best[g]]))

def curve(cols, label, trials=4000, seed=11):
    """measured vs independence miss rate for random k-subsets of `cols`"""
    rnd = random.Random(seed)
    K = len(cols)
    rbar = sum(recall[j] for j in cols) / K
    out = []
    print("\n== %s (pool of %d, mean recall %.4f) ==" % (label, K, rbar))
    print("  k   measured   independence   ratio")
    for k in range(1, K + 1):
        if comb(K, k) <= trials:
            subsets = list(itertools.combinations(cols, k))
        else:
            subsets = [tuple(rnd.sample(cols, k)) for _ in range(trials)]
        tot = 0.0
        for s in subsets:
            miss = 0
            for i in range(n):
                ri = rows[i]
                if not any(ri[j] for j in s):
                    miss += 1
            tot += miss / n
        meas = tot / len(subsets)
        ind = (1 - rbar) ** k
        out.append((k, meas, ind, len(subsets)))
        print("  %-3d %9.5f  %12.5f  %10.2fx  (%d panels)"
              % (k, meas, ind, meas / ind if ind > 0 else float("nan"), len(subsets)))
    return out, rbar

one_per_fam, rbar_f = curve([stripped[g] for g in fams], "ONE BEST ARM PER FAMILY, ALL STRIPPED", trials=3000)
mixed_fam,   rbar_m  = curve([mixed[g] for g in fams], "ONE BEST ARM PER FAMILY, MIXED (includes nostrip)", trials=3000)
allarms,    rbar_a  = curve(list(range(M)), "ALL 43 ARMS", trials=600)

with open(os.path.join(OUT, "c2-panel-families.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["pool", "k", "measured_miss", "independence_miss", "panels_evaluated", "pool_mean_recall"])
    for k, a, b, nn in one_per_fam:
        w.writerow(["best_per_family_stripped", k, "%.6f" % a, "%.6f" % b, nn, "%.4f" % rbar_f])
    for k, a, b, nn in mixed_fam:
        w.writerow(["best_per_family_mixed", k, "%.6f" % a, "%.6f" % b, nn, "%.4f" % rbar_m])
    for k, a, b, nn in allarms:
        w.writerow(["all_arms", k, "%.6f" % a, "%.6f" % b, nn, "%.4f" % rbar_a])
with open(os.path.join(OUT, "arm-families.csv"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(["run", "family", "recall", "is_family_best", "is_family_best_mixed"])
    for j in range(M):
        w.writerow([arms[j], fam[j], "%.4f" % recall[j],
                    int(stripped[fam[j]] == j), int(mixed[fam[j]] == j)])
print("\nDONE wrote c2-panel-families.csv arm-families.csv")
