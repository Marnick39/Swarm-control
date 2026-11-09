"""C5: what oversight loses when the untrusted agent removes its own comments.

The source project runs monitors on code with comments stripped (STRIP_COMMENTS=1)
for all but one arm. The single paired exception lets us price the difference:

  dataset-haiku55-xhigh-nostrip-n500          monitor sees the author's comments
  dataset-haiku55-effortxhigh-tm-n500-strip   same model and effort, comments removed

Stripping is an experimental control, not an attacker action, so this measures the
value of self-incriminating natural language evidence rather than log tampering in
general. It bounds what a swarm member gains by simply not confessing in comments.

Also rebuilds the family panel using haiku55's best STRIPPED arm, so that all 14
panel members are in the same information condition.
"""
import csv, os, sys, itertools, random, collections
from math import comb

OUT = sys.argv[1]
rows, arms = [], None
with open(os.path.join(OUT, "matrix-caught.csv")) as f:
    rd = csv.reader(f); hdr = next(rd); arms = hdr[5:]
    for r in rd:
        rows.append(dict(sid=int(r[0]), gen=r[1], caught=[int(x) for x in r[5:]]))
n = len(rows)
idx = {a: j for j, a in enumerate(arms)}

NOSTRIP = "dataset-haiku55-xhigh-nostrip-n500"
STRIP   = "dataset-haiku55-effortxhigh-tm-n500-strip"
a, b = idx[NOSTRIP], idx[STRIP]
ca = sum(r["caught"][a] for r in rows)
cb = sum(r["caught"][b] for r in rows)
print("== C5 self-redaction (same model, same effort) ==")
print("  comments visible  : %3d / %d caught  (%.1f%%)" % (ca, n, 100 * ca / n))
print("  comments removed  : %3d / %d caught  (%.1f%%)" % (cb, n, 100 * cb / n))
print("  cost of removing one's own comments: %.1f points of recall" % (100 * (ca - cb) / n))

both = sum(1 for r in rows if r["caught"][a] and r["caught"][b])
only_a = sum(1 for r in rows if r["caught"][a] and not r["caught"][b])
only_b = sum(1 for r in rows if r["caught"][b] and not r["caught"][a])
neither = n - both - only_a - only_b
print("  caught in both %d | only with comments %d | only without %d | neither %d"
      % (both, only_a, only_b, neither))

# McNemar exact, two-sided
from math import comb as C
m = only_a + only_b
p = sum(C(m, i) for i in range(0, min(only_a, only_b) + 1)) / (2 ** m) * 2 if m else 1.0
print("  McNemar exact two-sided p = %.3g on the %d discordant backdoors" % (min(p, 1.0), m))

# ---- all-stripped family panel ---------------------------------------------
fam, recall = {}, {}
with open(os.path.join(OUT, "arm-families.csv")) as f:
    for r in csv.DictReader(f):
        fam[r["run"]] = r["family"]; recall[r["run"]] = float(r["recall"])
byfam = collections.defaultdict(list)
for run, g in fam.items():
    byfam[g].append(run)

def build(exclude_nostrip):
    pool = []
    for g, runs in sorted(byfam.items()):
        cand = [r for r in runs if not (exclude_nostrip and "nostrip" in r)]
        pool.append(idx[max(cand, key=lambda r: recall[r])])
    return pool

for label, excl in [("family best, as published (includes the nostrip arm)", False),
                    ("family best, ALL ARMS STRIPPED", True)]:
    pool = build(excl)
    K = len(pool)
    rbar = sum(sum(r["caught"][j] for r in rows) / n for j in pool) / K
    rnd = random.Random(23)
    print("\n== panel: %s ==" % label)
    print("  pool mean recall %.4f" % rbar)
    print("   k   measured   independence     ratio")
    for k in [1, 2, 4, 7, 10, 14]:
        subs = (list(itertools.combinations(pool, k)) if comb(K, k) <= 3000
                else [tuple(rnd.sample(pool, k)) for _ in range(3000)])
        tot = 0.0
        for s in subs:
            tot += sum(1 for r in rows if not any(r["caught"][j] for j in s)) / n
        meas = tot / len(subs); ind = (1 - rbar) ** k
        print("   %-2d %9.5f  %12.5f  %8.2fx" % (k, meas, ind, meas / ind))

# never-caught set with and without the nostrip arm
strip_only = [j for j in range(len(arms)) if "nostrip" not in arms[j]]
nv_all = [r["sid"] for r in rows if not any(r["caught"])]
nv_str = [r["sid"] for r in rows if not any(r["caught"][j] for j in strip_only)]
print("\n  never caught by any of the 43 arms            : %d" % len(nv_all))
print("  never caught by the 42 stripped arms          : %d" % len(nv_str))
print("  backdoors the comment-reading arm alone caught: %d" % (len(nv_str) - len(nv_all)))

with open(os.path.join(OUT, "c5-redaction.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["condition", "caught", "n", "recall_pct"])
    w.writerow(["comments_visible", ca, n, "%.1f" % (100 * ca / n)])
    w.writerow(["comments_removed", cb, n, "%.1f" % (100 * cb / n)])
    w.writerow(["discordant_only_with_comments", only_a, n, ""])
    w.writerow(["discordant_only_without_comments", only_b, n, ""])
print("DONE")
