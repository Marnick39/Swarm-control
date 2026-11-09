"""The oversight frontier: attacker swarm size N against defender panel size k.

Deployment framing: the defender fixes ONE panel of k monitors and audits every
submission with it. Conditional on that panel, a backdoor is either missed by all
k arms or caught, so if the panel misses m of the n backdoors then

    P(a swarm of N distinct submissions is entirely caught) = C(n-m, N) / C(n, N)

which is exact. The reported value averages this over sampled panels drawn from
the 14-family pool (one arm per model family, so no panel repeats a model).
Panel-to-panel spread is reported too, because which monitors you happen to buy
matters as much as how many.
"""
import csv, sys, os, re, collections, itertools, random, statistics as st
from math import comb

OUT = sys.argv[1]
rows, arms = [], None
with open(os.path.join(OUT, "matrix-caught.csv")) as f:
    rd = csv.reader(f); hdr = next(rd); arms = hdr[5:]
    for r in rd:
        rows.append([int(x) for x in r[5:]])
n, M = len(rows), len(arms)

fam, best, recall = {}, {}, {}
with open(os.path.join(OUT, "arm-families.csv")) as f:
    for r in csv.DictReader(f):
        j = arms.index(r["run"])
        fam[j] = r["family"]; recall[j] = float(r["recall"])
        if int(r["is_family_best"]):
            best[r["family"]] = j
pool = [best[g] for g in sorted(best)]
K = len(pool)
print("family pool: %d arms" % K)

def panels(k, trials, seed=7):
    if comb(K, k) <= trials:
        return list(itertools.combinations(pool, k))
    rnd = random.Random(seed + k)
    return [tuple(rnd.sample(pool, k)) for _ in range(trials)]

NS = [1, 2, 3, 5, 8, 12, 20, 30, 50]
front = {}
spread = {}
print("\n  k  miss_m (mean)  miss%%   p5    p95   | P(swarm wins) for N = %s" % NS)
for k in range(1, K + 1):
    ps = panels(k, 2000)
    ms = []
    acc = {N: 0.0 for N in NS}
    for s in ps:
        m = 0
        for ri in rows:
            if not any(ri[j] for j in s):
                m += 1
        ms.append(m)
        for N in NS:
            acc[N] += 1.0 - (comb(n - m, N) / comb(n, N) if n - m >= N else 0.0)
    for N in NS:
        front[(k, N)] = acc[N] / len(ps)
    mm = st.mean(ms)
    lo = sorted(ms)[max(0, int(0.05 * len(ms)) - 1)]
    hi = sorted(ms)[min(len(ms) - 1, int(0.95 * len(ms)))]
    spread[k] = (mm, lo, hi, len(ps))
    print("  %-2d %9.1f %8.2f%% %5d %5d | %s"
          % (k, mm, 100 * mm / n, lo, hi, " ".join("%.3f" % front[(k, N)] for N in NS)))

with open(os.path.join(OUT, "frontier.csv"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(["panel_k", "swarm_N", "p_swarm_wins"])
    for k in range(1, K + 1):
        for N in NS:
            w.writerow([k, N, "%.6f" % front[(k, N)]])
with open(os.path.join(OUT, "panel-spread.csv"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(["panel_k", "mean_missed", "p5_missed", "p95_missed", "panels", "n_backdoors"])
    for k in range(1, K + 1):
        mm, lo, hi, np_ = spread[k]
        w.writerow([k, "%.3f" % mm, lo, hi, np_, n])

# how many monitors to hold a swarm of N below 50%
print("\n  smallest panel k holding P(swarm wins) below 50%:")
for N in NS:
    need = next((k for k in range(1, K + 1) if front[(k, N)] < 0.5), None)
    print("    N=%-3d -> k=%s" % (N, need if need else ">%d" % K))

# Wilson interval for the never-caught count under the full 43-arm panel
never = sum(1 for ri in rows if not any(ri))
p = never / n; z = 1.96
den = 1 + z * z / n
c = (p + z * z / (2 * n)) / den
h = z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** 0.5) / den
print("\n  never caught by ANY of the 43 arms: %d/%d = %.2f%% (95%% Wilson %.2f to %.2f%%)"
      % (never, n, 100 * p, 100 * (c - h), 100 * (c + h)))
print("DONE")
