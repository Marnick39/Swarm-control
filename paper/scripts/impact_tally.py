"""Pattern-based impact classification of the public Swarm Traces incident payloads.

These are the real actions taken in the July 2026 incident that oversight did not prevent.
Categories follow the published incident report. Classification is heuristic (regex over
redacted payload text), non-exclusive, and reported as such.
"""
import gzip, json, re, sys, collections
path = sys.argv[1]
CAT = [
 ("Data exfiltration",      re.compile(r"document\.write\('<plaintext>|method:\s*'?POST|fetch\([^)]*\{[^}]*body|exfil|\.then\(x=>x\.text", re.I)),
 ("Credential use/theft",   re.compile(r"X-API-Key|Authorization|Bearer |\bCREDENTIAL\b|REDACTED-?HUGGINGFACE-?TOKEN|secret_key|jwt", re.I)),
 ("Remote code load / injection", re.compile(r"<script\s+src|document\.write\([^)]*<script|eval\(|new Function|atob\(location\.hash|location\.hash\.slice", re.I)),
 ("Controller check-in (C2)", re.compile(r"agent_id|task_id|controller|\bg\d{2,3}[0-9a-z]*cmd|check-?in|poll", re.I)),
 ("Cache poisoning",        re.compile(r"Artifactory|npm|pip install|cache|registry|dockerhub|docker\.io", re.I)),
 ("Trace / log removal",    re.compile(r"\bDELETE\b|\brm -rf|clear.?log|remove.?trace|delete.?history|unlink", re.I)),
 ("Recon / search",         re.compile(r"slack|search|/datasets|list|/workers|kubernetes|kube", re.I)),
 ("Model / data target",    re.compile(r"huggingface|/models/|model|weights|dataset", re.I)),
]
n=0; hits=collections.Counter(); multi=collections.Counter(); any_hit=0
with gzip.open(path,"rt",errors="replace") as f:
    for line in f:
        line=line.strip()
        if not line: continue
        try: r=json.loads(line)
        except: continue
        if r.get("kind")!="payload": continue
        n+=1; t=r.get("text") or ""
        c=[name for name,pat in CAT if pat.search(t)]
        for name in c: hits[name]+=1
        multi[len(c)]+=1
        if c: any_hit+=1
print("payloads classified: %d"%n)
print("payloads matching >=1 category: %d (%.1f%%)"%(any_hit,100*any_hit/n))
print("\nimpact category (non-exclusive, pattern-based):")
import csv,os
rows=[]
for name,_ in CAT:
    print("  %-32s %7d  (%.1f%% of payloads)"%(name,hits[name],100*hits[name]/n))
    rows.append((name,hits[name],round(100*hits[name]/n,1)))
V2="/home/claude-user/workspace/apart-swarm-sprint-v2"
with open(os.path.join(V2,"analysis/impact-tally.csv"),"w",newline="") as fo:
    w=csv.writer(fo); w.writerow(["category","payload_count","pct_of_payloads"]); w.writerows(rows)
    w.writerow(["TOTAL_payloads",n,100.0]); w.writerow(["matched_any",any_hit,round(100*any_hit/n,1)])
print("\ncategories per payload:",dict(sorted(multi.items())))
print("wrote analysis/impact-tally.csv")
