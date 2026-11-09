"""Dump the normalised-template frequency distribution for the coverage curve."""
import gzip, json, sys, re, collections, hashlib, csv
path, out = sys.argv[1], sys.argv[2]
PLACE = re.compile(r"\[(?:REDACTED[^\]]*|[A-Z][A-Z0-9 _-]{2,40})\]")
NUM = re.compile(r"\d+"); WS = re.compile(r"\s+")
STR = re.compile(r"""(['"])(?:(?!\1).){1,400}\1""")
HEXID = re.compile(r"\b[0-9a-fA-F]{8,}\b")
def norm(t):
    t = PLACE.sub("@", t); t = HEXID.sub("#", t); t = STR.sub("'S'", t)
    t = NUM.sub("0", t); return WS.sub(" ", t).strip()
cnt = collections.Counter(); bykind = collections.defaultdict(collections.Counter)
with gzip.open(path, "rt", errors="replace") as f:
    for line in f:
        line = line.strip()
        if not line: continue
        try: r = json.loads(line)
        except Exception: continue
        h = hashlib.sha1(norm(r["text"]).encode("utf8","replace")).hexdigest()[:16]
        cnt[h] += 1; bykind[r["kind"]][h] += 1
with open(out, "w", newline="") as f:
    w = csv.writer(f); w.writerow(["rank","count"])
    for i,(h,v) in enumerate(cnt.most_common(),1): w.writerow([i,v])
print("templates %d  records %d" % (len(cnt), sum(cnt.values())))
for k,c in bykind.items(): print("  %-16s %6d templates %7d records" % (k, len(c), sum(c.values())))
print("DONE")
