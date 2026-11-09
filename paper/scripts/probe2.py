import gzip, json, sys, collections, re
path = sys.argv[1]
kinds = collections.Counter(); tags = collections.Counter(); tagtok = collections.Counter()
parents = collections.Counter(); has_parent = 0; textlen = []
agentish = collections.Counter(); redactions = collections.Counter()
roots = set(); children = collections.defaultdict(list); ids = set()
with gzip.open(path, "rt", errors="replace") as f:
    for line in f:
        line=line.strip()
        if not line: continue
        try: r=json.loads(line)
        except Exception: continue
        ids.add(r["id"])
        kinds[r.get("kind")] += 1
        t = r.get("tags") or ""
        tags[t] += 1
        for tok in re.split(r"[,\s;|]+", t):
            if tok: tagtok[tok] += 1
        p = r.get("parent_id")
        if p: has_parent += 1; children[p].append(r["id"])
        else: roots.add(r["id"])
        tx = r.get("text") or ""
        textlen.append(len(tx))
        for m in re.findall(r"\[REDACTED:[a-z_]+", tx): redactions[m+"]"] += 1
        for m in re.findall(r"\[[A-Z][A-Z0-9 _-]{2,30}\]", tx): redactions[m] += 1
        for m in re.findall(r'"agent_id"\s*:\s*"([^"]{0,60})"', tx): agentish[m] += 1
print("KIND:"); [print("  %-24s %7d"%(k,v)) for k,v in kinds.most_common(20)]
print("\nTAG TOKENS (top 40):"); [print("  %-32s %7d"%(k,v)) for k,v in tagtok.most_common(40)]
print("\nempty tags:", tags.get("",0), "of", sum(tags.values()))
print("\nrecords with parent_id: %d  roots: %d  distinct parents: %d"%(has_parent,len(roots),len(children)))
sz=sorted((len(v) for v in children.values()),reverse=True)
print("children-per-parent: max %s top10 %s  mean %.2f"%(sz[0] if sz else 0, sz[:10], sum(sz)/len(sz) if sz else 0))
missing=[p for p in children if p not in ids]
print("parent ids not present as records:", len(missing), missing[:5])
import statistics as st
print("\ntext length: min %d med %d mean %.0f max %d"%(min(textlen),st.median(textlen),sum(textlen)/len(textlen),max(textlen)))
print("\nTOP REDACTION PLACEHOLDERS (top 30):"); [print("  %-42s %7d"%(k,v)) for k,v in redactions.most_common(30)]
print("\nDISTINCT agent_id VALUES IN TEXT: %d  top:"%len(agentish)); [print("  %-50s %6d"%(k,v)) for k,v in agentish.most_common(10)]
