import csv, os
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
V2=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
plt.rcParams.update({"font.size":10,"axes.labelsize":10.5,"axes.titlesize":11,
  "xtick.labelsize":9.5,"ytick.labelsize":9.5,"legend.fontsize":9,
  "axes.spines.top":False,"axes.spines.right":False,"axes.grid":True,
  "grid.alpha":0.25,"grid.linewidth":0.6,"figure.dpi":200,"savefig.bbox":"tight"})
MEAS="#1b5e6b"; BAND="#1b5e6b"; ACC="#c2621f"
B=[]; res=[]; lo=[]; hi=[]; mr=[]
for r in csv.DictReader(open(os.path.join(V2,"analysis/budget-sweep.csv"))):
    B.append(float(r["budget_pct"])); res.append(float(r["residue_pct"]))
    lo.append(float(r["ci_lo"])); hi.append(float(r["ci_hi"])); mr.append(100*float(r["mean_recall"]))
fig,ax=plt.subplots(figsize=(5.6,3.5))
ax.fill_between(B,lo,hi,color=BAND,alpha=0.15,linewidth=0)
ax.plot(B,res,"o-",color=MEAS,lw=2,ms=5,label="Missed by all 14 monitors")
ax.set_xscale("log")
ax.set_xticks(B); ax.get_xaxis().set_major_formatter(FuncFormatter(lambda v,p:"%g%%"%v))
ax.set_yticks([0,5,10,15,20]); ax.get_yaxis().set_major_formatter(FuncFormatter(lambda v,p:"%g%%"%v))
ax.set_xlabel("Audit budget (share of actions reviewed)")
ax.set_ylabel("Backdoors caught by no monitor")
ax.set_ylim(0,23)
ax.annotate("40x more auditing,\nstill 3.6% uncaught",xy=(20,3.6),xytext=(3.2,1.2),
            color=MEAS,fontsize=9,arrowprops=dict(arrowstyle="->",color=MEAS,lw=1))
ax.set_title("Widening the audit budget has sharply diminishing returns",fontsize=10.5)
ax.legend(loc="upper right",frameon=False)
fig.savefig(os.path.join(V2,"figures/f6-budget-sweep.png")); print("wrote figures/f6-budget-sweep.png")
