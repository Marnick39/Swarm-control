import csv, os, collections, itertools, random, statistics as st
from math import comb
V2=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows=[]; 
with open(os.path.join(V2,"analysis/matrix-caught.csv")) as f:
    rd=csv.reader(f); hdr=next(rd); arms=hdr[5:]
    for r in rd: rows.append([int(x) for x in r[5:]])
n=len(rows); M=len(arms); idx={a:j for j,a in enumerate(arms)}
fam={}; 
for r in csv.DictReader(open(os.path.join(V2,"analysis/arm-families.csv"))): fam[idx[r["run"]]]=r["family"]
fpr={}
for r in csv.DictReader(open(os.path.join(V2,"analysis/arms.csv"))): fpr[idx[r["run"]]]=float(r["achieved_fpr_pct"])
rec=[sum(rows[i][j] for i in range(n))/n for j in range(M)]

# ---- (1) matched-strictness pool: attacker-swarm ratio (should stay ~1.0) ----
blind=[j for j in range(M) if "nostrip" not in arms[j]]
g=collections.defaultdict(list)
for j in blind:
    if 1.5<=fpr[j]<=2.0: g[fam[j]].append(j)
matched=[max(v,key=lambda j:rec[j]) for v in g.values()]
print("matched-strictness pool: %d families (FPR 1.6-2.0%%)"%len(matched))
# attacker swarm: per-backdoor evasion q under k=1 (avg over matched arms), ratio measured/independence
def esp_prod(vals,N):
    e=[0.0]*(N+1); e[0]=1.0
    for v in vals:
        for jj in range(min(N,n),0,-1): e[jj]+=e[jj-1]*v
    return e[N]/comb(n,N)
# q_i = mean miss across matched arms (per-backdoor), treat swarm draws across backdoors
q=[st.mean(1-rows[i][j] for j in matched) for i in range(n)]
qbar=st.mean(q)
print("  attacker swarm (random problems), measured vs independence:")
for N in [2,5,8,20]:
    meas=1-esp_prod([1-x for x in q],N); ind=1-(1-qbar)**N
    print("    N=%-2d  measured %.4f  independence %.4f  ratio %.3f"%(N,meas,ind,meas/ind))

# ---- (2) two-way variance decomposition on the 500x43 catch matrix ----
grand=st.mean(rec)  # = overall catch rate
row_mean=[st.mean(rows[i]) for i in range(n)]       # backdoor (artefact) effect
col_mean=rec                                         # monitor effect
ss_tot=sum((rows[i][j]-grand)**2 for i in range(n) for j in range(M))
ss_row=M*sum((row_mean[i]-grand)**2 for i in range(n))   # backdoor main effect
ss_col=n*sum((col_mean[j]-grand)**2 for j in range(M))   # monitor main effect
ss_res=ss_tot-ss_row-ss_col
print("\ntwo-way decomposition of the 500x43 catch matrix:")
print("  backdoor (artefact) main effect: %.1f%%"%(100*ss_row/ss_tot))
print("  monitor main effect:             %.1f%%"%(100*ss_col/ss_tot))
print("  residual (interaction+noise):    %.1f%%"%(100*ss_res/ss_tot))
print("  -> artefact share is at least %.0f%% (two-way lower bound), vs the one-way 90.1%% upper bound"
      %(100*ss_row/ss_tot))
