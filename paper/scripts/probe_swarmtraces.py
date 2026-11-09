import gzip, json, sys, collections
path = sys.argv[1]
n = 0
keys = collections.Counter()
types = collections.defaultdict(collections.Counter)
samples = []
with gzip.open(path, "rt", errors="replace") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception as e:
            if n < 3:
                print("PARSE FAIL:", repr(line[:120]))
            continue
        n += 1
        if isinstance(r, dict):
            keys.update(r.keys())
            for k, v in r.items():
                types[k][type(v).__name__] += 1
            if len(samples) < 2:
                samples.append(r)
print("TOTAL RECORDS:", n)
print()
print("FIELDS (count, types):")
for k, c in keys.most_common():
    print("  %-28s %7d  %s" % (k, c, dict(types[k])))
print()
for i, s in enumerate(samples):
    print("=== SAMPLE RECORD %d (values truncated to 300 chars) ===" % i)
    for k, v in s.items():
        sv = json.dumps(v) if not isinstance(v, str) else v
        print("  %s: %s" % (k, sv[:300].replace("\n", "\\n")))
    print()
