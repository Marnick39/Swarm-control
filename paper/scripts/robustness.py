"""Two checks on the headline panel result.

A. Matched strictness. The 43 arms hit achieved false positive rates from 0.0% to
   2.0% against the same 2% nominal target, because the score scale is coarse. If the
   panel penalty were an artefact of mixing lenient and strict arms it should vanish
   once strictness is matched. We rebuild the panel from arms whose achieved FPR sits
   in [1.5, 2.0]%, one per family.

B. A fairer independence baseline. The paper predicts (1 - rbar)^k from the pool mean
   recall. The exact per-panel baseline is prod_j (1 - r_j) over that panel's own arms.
   By AM-GM the product is at most (1 - rbar)^k, so the paper's baseline OVERSTATES the
   predicted miss rate and therefore UNDERSTATES the penalty. We quantify by how much.
"""
import csv, os, sys, itertools, random, collections
from math import comb

OUT = sys.argv[1]
rows, arms = [], None
with open(os.path.join(OUT, "matrix-caught.csv")) as f:
    rd = csv.reader(f); hdr = next(rd); arms = hdr[5:]
    for r in rd:
        rows.append([int(x) for x in r[5:]])
n = len(rows)
idx = {a: j for j, a in enumerate(arms)}
recall = {j: sum(r[j] for r in rows) / n for j in range(len(arms))}

fam, fpr = {}, {}
for r in csv.DictReader(open(os.path.join(OUT, "arm-families.csv"))):
    fam[idx[r["run"]]] = r["family"]
for r in csv.DictReader(open(os.path.join(OUT, "arms.csv"))):
    fpr[idx[r["run"]]] = float(r["achieved_fpr_pct"])

def pool_best_per_family(cands):
    g = collections.defaultdict(list)
    for j in cands:
        g[fam[j]].append(j)
    return [max(v, key=lambda j: recall[j]) for _, v in sorted(g.items())]

blind = [j for j in range(len(arms)) if "nostrip" not in arms[j]]
POOLS = {
    "primary (all comment-blind, 1 per family)": pool_best_per_family(blind),
    "matched strictness (achieved FPR 1.6 to 2.0)": pool_best_per_family(
        [j for j in blind if 1.5 <= fpr[j] <= 2.0]),
}

results = []
for label, pool in POOLS.items():
    K = len(pool)
    rbar = sum(recall[j] for j in pool) / K
    fl, fh = min(fpr[j] for j in pool), max(fpr[j] for j in pool)
    print("\n== %s ==" % label)
    print("   %d arms, families: %s" % (K, ", ".join(sorted({fam[j] for j in pool}))))
    print("   pool mean recall %.4f, achieved FPR %.1f to %.1f%%" % (rbar, fl, fh))
    print("   %-3s %10s %14s %10s %14s %10s" %
          ("k", "measured", "ind(mean)", "ratio", "ind(per-panel)", "ratio"))
    for k in range(1, K + 1):
        if k not in (1, 2, 3, 4, 5, 7, 10, K):
            continue
        subs = (list(itertools.combinations(pool, k)) if comb(K, k) <= 2500
                else [tuple(random.Random(100 + k).sample(pool, k)) for _ in range(2500)])
        meas = indp = 0.0
        for s in subs:
            meas += sum(1 for r in rows if not any(r[j] for j in s)) / n
            p = 1.0
            for j in s:
                p *= (1 - recall[j])
            indp += p
        meas /= len(subs); indp /= len(subs)
        indm = (1 - rbar) ** k
        print("   %-3d %10.5f %14.5f %9.1fx %14.5f %9.1fx"
              % (k, meas, indm, meas / indm, indp, meas / indp if indp > 0 else float("nan")))
        results.append((label, k, meas, indm, indp))

with open(os.path.join(OUT, "robustness.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["pool", "k", "measured_miss", "independence_mean", "independence_per_panel"])
    for lab, k, m, a, b in results:
        w.writerow([lab, k, "%.6f" % m, "%.6f" % a, "%.6f" % b])
print("\nDONE")
