import csv, os, sys, math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

A = sys.argv[1]; F = sys.argv[2]
plt.rcParams.update({
    "font.size": 10, "axes.labelsize": 10.5, "axes.titlesize": 11,
    "xtick.labelsize": 9.5, "ytick.labelsize": 9.5, "legend.fontsize": 9,
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.grid": True, "grid.alpha": 0.25, "grid.linewidth": 0.6,
    "figure.dpi": 200, "savefig.bbox": "tight", "savefig.pad_inches": 0.02,
})
MEAS, IND, ATK, DEF = "#1b5e6b", "#9aa3a8", "#c2621f", "#1b5e6b"

def load(p):
    with open(os.path.join(A, p)) as f:
        return list(csv.DictReader(f))

def save(fig, name):
    fig.savefig(os.path.join(F, name + ".png"))
    plt.close(fig)
    print("  wrote", name + ".png")

# ---------- F1: panel scaling -------------------------------------------------
pf = load("c2-panel-families.csv")
fam = [(int(r["k"]), float(r["measured_miss"]), float(r["independence_miss"]))
       for r in pf if r["pool"] == "best_per_family_stripped"]
alla = [(int(r["k"]), float(r["measured_miss"]), float(r["independence_miss"]))
        for r in pf if r["pool"] == "all_arms" and int(r["k"]) <= 14]
fig, ax = plt.subplots(figsize=(5.4, 3.5))
ax.plot([a for a, _, _ in fam], [b for _, b, _ in fam], "o-", color=MEAS, lw=2, ms=4.5,
        label="Measured, 14 distinct models")
ax.plot([a for a, _, _ in alla], [b for _, b, _ in alla], "s--", color="#4e8a98", lw=1.4, ms=3.5,
        label="Measured, pool of all 43 arms")
ax.plot([a for a, _, _ in fam], [c for _, _, c in fam], "-", color=IND, lw=1.8, ls=(0, (4, 2)),
        label="If monitor failures were independent")
ax.set_yscale("log")
ax.set_xlabel("Monitors in the panel, k")
ax.set_ylabel("Share of backdoors missed by every monitor")
ax.yaxis.set_major_formatter(FuncFormatter(lambda v, p: ("%g%%" % (v * 100)) if v >= 1e-4 else ""))
ax.set_xticks(range(1, 15))
ax.set_title("Monitor panels stack far worse than independence predicts", fontsize=10.5)
ax.annotate("14 distinct models\nstill miss %.1f%% of backdoors" % (100 * fam[-1][1]),
            xy=(14, fam[-1][1]), xytext=(7.0, 0.016), color=MEAS,
            arrowprops=dict(arrowstyle="->", color=MEAS, lw=1), fontsize=9)
ax.legend(loc="lower left", frameon=False)
save(fig, "f1-panel-scaling")

# ---------- F2: the asymmetry -------------------------------------------------
sw = load("c1-swarm-scaling.csv")
atk = [(int(r["swarm_N"]), float(r["measured_win"]) / float(r["independence_win"]))
       for r in sw if int(r["panel_k"]) == 43 and float(r["independence_win"]) > 0]
dfn = [(k, m / i) for k, m, i in fam if i > 0]
fig, ax = plt.subplots(figsize=(5.4, 3.5))
ax.plot([a for a, _ in dfn], [b for _, b in dfn], "o-", color=DEF, lw=2, ms=4.5,
        label="Defender: panel of k monitors")
ax.plot([a for a, _ in atk], [b for _, b in atk], "^-", color=ATK, lw=2, ms=5,
        label="Attacker: swarm of N submissions")
ax.axhline(1.0, color="#555", lw=1, ls=(0, (3, 2)))
ax.text(26, 1.22, "no benefit, no penalty", fontsize=8.5, color="#555")
ax.set_yscale("log")
ax.set_xlabel("Population size (k monitors, or N submissions)")
ax.set_ylabel("Measured outcome / independence prediction")
ax.set_title("Adding attackers behaves as predicted.\nAdding monitors does not.", fontsize=10.5)
ax.legend(loc="center left", frameon=False)
ax.set_yticks([1, 10, 100])
ax.yaxis.set_major_formatter(FuncFormatter(lambda v, p: "%gx" % v))
save(fig, "f2-asymmetry")

# ---------- F3: per-generator evasion ----------------------------------------
g = load("c3-generators.csv")
g = sorted(g, key=lambda r: -float(r["evasion_k1"]))
lbl = [r["generator"].split("/")[-1].replace("-latest", "") for r in g]
v1 = [100 * float(r["evasion_k1"]) for r in g]
v43 = [100 * float(r["evasion_k43"]) for r in g]
nn = [int(r["n_backdoors"]) for r in g]
y = range(len(g))
fig, ax = plt.subplots(figsize=(5.4, 3.6))
ax.barh([i + 0.2 for i in y], v1, height=0.4, color="#c9d6d9", label="1 monitor")
ax.barh([i - 0.2 for i in y], v43, height=0.4, color=MEAS, label="43 monitors")
ax.set_yticks(list(y))
ax.set_yticklabels(["%s  (n=%d)" % (a, b) for a, b in zip(lbl, nn)], fontsize=8.5)
ax.invert_yaxis()
ax.set_xlabel("Backdoors that evade the panel (%)")
ax.set_title("Who wrote the backdoor explains 9.9% of whether it is caught", fontsize=10.5)
ax.legend(loc="lower right", frameon=False)
save(fig, "f3-generators")

# ---------- F4: Swarm Traces template concentration --------------------------
tp = load("swarmtraces-templates.csv")
cnt = [int(r["count"]) for r in tp]
tot = sum(cnt)
cum, cs = 0, []
for c in cnt:
    cum += c; cs.append(cum / tot)
fig, ax = plt.subplots(figsize=(5.4, 3.3))
ax.plot(range(1, len(cs) + 1), [100 * x for x in cs], color=MEAS, lw=2)
ax.set_xscale("log")
ax.set_xlabel("Distinct normalised payload programs, ranked by frequency")
ax.set_ylabel("Share of all 189,579 records (%)")
i50 = next(i for i, x in enumerate(cs, 1) if x >= 0.5)
i90 = next(i for i, x in enumerate(cs, 1) if x >= 0.9)
for i, lab, col in [(i50, "%d programs = 50%%" % i50, ATK), (i90, "%d programs = 90%%" % i90, "#6b7478")]:
    ax.axvline(i, color=col, lw=1, ls=(0, (3, 2)))
    ax.annotate(lab, xy=(i, 50 if col == ATK else 90), xytext=(i * 1.6, 42 if col == ATK else 72),
                color=col, fontsize=9, arrowprops=dict(arrowstyle="->", color=col, lw=0.9))
ax.set_title("Half the swarm's traffic is 69 programs, the rest is a long tail", fontsize=10.5)
ax.set_ylim(0, 102)
save(fig, "f4-swarmtraces-templates")

# ---------- F5: frontier ------------------------------------------------------
fr = load("frontier.csv")
ks = sorted({int(r["panel_k"]) for r in fr})
Ns = sorted({int(r["swarm_N"]) for r in fr})
grid = {(int(r["panel_k"]), int(r["swarm_N"])): float(r["p_swarm_wins"]) for r in fr}
fig, ax = plt.subplots(figsize=(5.6, 3.5))
RAMP = ["#14414b", "#1b5e6b", "#4e8a98", "#d4954a", "#c2621f"]
for N, mk, col in zip([1, 3, 8, 20, 50], ["o", "s", "^", "D", "v"], RAMP):
    if N in Ns:
        ax.plot(ks, [100 * grid[(k, N)] for k in ks], mk + "-", ms=4, lw=1.7,
                color=col, label="swarm of %d" % N)
ax.axhline(50, color="#555", lw=1, ls=(0, (3, 2)))
ax.text(1.25, 52.5, "coin flip", fontsize=8.5, color="#555")
ax.set_xlabel("Monitors in the panel, k")
ax.set_ylabel("Chance the swarm lands at least one backdoor (%)")
ax.set_xticks(ks)
ax.set_title("A swarm of 8 beats every 14-model panel", fontsize=10.5)
ax.legend(loc="center right", frameon=False, ncol=1)
save(fig, "f5-frontier")
print("DONE")
