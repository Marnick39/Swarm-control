"""Profile the AI Village events timeline for simulation fit: identity, time, actions."""
import gzip, json, sys, collections, datetime as dt
ev = sys.argv[1]; ag = sys.argv[2]

# agents
agents = {}
with gzip.open(ag, "rt", errors="replace") as f:
    for line in f:
        a = json.loads(line)
        agents[a["id"]] = a
part = sum(1 for a in agents.values() if a.get("is_participating"))
print("AGENTS: %d total, %d currently participating" % (len(agents), part))
models = collections.Counter(a.get("model_string","?").split("::")[0] for a in agents.values())
print("  model families:", dict(models.most_common()))
print("  sample names:", [a.get("name") for a in list(agents.values())[:12]])

# events stream
atype = collections.Counter()
per_agent = collections.Counter()
rooms = set()
tmin = tmax = None
samples = collections.defaultdict(list)
actions = collections.Counter()
n = 0
with gzip.open(ev, "rt", errors="replace") as f:
    for line in f:
        n += 1
        e = json.loads(line)
        d = e.get("data") or {}
        at = d.get("actionType", "?")
        atype[at] += 1
        sid = d.get("speakerId") or d.get("agentId")
        if sid: per_agent[sid] += 1
        if d.get("roomId"): rooms.add(d["roomId"])
        ts = e.get("created_at")
        if ts:
            if tmin is None or ts < tmin: tmin = ts
            if tmax is None or ts > tmax: tmax = ts
        if len(samples[at]) < 2:
            samples[at].append({k: (str(v)[:160]) for k, v in d.items() if k in
                                ("content","sessionGoal","summary","query","nextSessionGoal","speakerName")})
print("\nEVENTS: %d rows" % n)
print("  time span: %s  ->  %s" % (tmin, tmax))
print("  distinct rooms: %d ; agents that acted: %d" % (len(rooms), len(per_agent)))
print("\n  actionType distribution:")
for k, v in atype.most_common():
    nm = ""
    print("    %-32s %7d  (%.1f%%)" % (k, v, 100*v/n))
print("\n  most active agents (by event count):")
for aid, c in per_agent.most_common(8):
    print("    %-28s %7d events" % ((agents.get(aid,{}).get("name") or aid)[:28], c))
print("\n  sample AGENT_TALK:", samples.get("AGENT_TALK"))
print("  sample computer-use boundary:", samples.get("START_USING_COMPUTER"))
print("  sample SEARCH_HISTORY:", samples.get("SEARCH_HISTORY"))
