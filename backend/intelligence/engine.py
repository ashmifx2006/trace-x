"""TRACE-X intelligence engine: flow-link graph -> network reconstruction -> pattern detection -> explainable risk -> Network DNA."""
import bisect, itertools, threading
from collections import defaultdict
import networkx as nx, numpy as np, pandas as pd

WINDOW = 1800  # max seconds an intermediary may hold funds before forwarding
RETENTION = (0.6, 1.0)  # forwarded/received amount ratio for a "flow link"
WEIGHTS = {"circular": 22, "rapid": 14, "mule": 9, "velocity": 14, "smurfing": 14, "repeated": 9, "amount": 8, "complexity": 10}  # sums to 100, configurable
LABELS = {"circular": "Circular flow", "rapid": "Rapid pass-through", "mule": "Mule chain", "velocity": "High velocity",
          "repeated": "Repeated network behavior", "smurfing": "Smurfing / fragmentation", "amount": "Amount anomaly", "complexity": "Multi-pattern correlation"}
REQUIRED = ["transaction_id", "timestamp", "sender", "receiver", "amount", "currency", "transaction_type"]

def sev(s): return "CRITICAL" if s >= 80 else "HIGH" if s >= 60 else "MEDIUM" if s >= 40 else "LOW"

class UF:
    def __init__(s): s.p = {}
    def find(s, x):
        while s.p.setdefault(x, x) != x: s.p[x] = s.p[s.p[x]]; x = s.p[x]
        return x
    def union(s, a, b): s.p[s.find(a)] = s.find(b)

def validate(df):
    errs = [f"Missing column: {c}" for c in REQUIRED if c not in df.columns]
    if errs: return errs
    if pd.to_datetime(df["timestamp"], errors="coerce").isna().any(): errs.append("Some timestamps are unparseable")
    if pd.to_numeric(df["amount"], errors="coerce").isna().any(): errs.append("Some amounts are non-numeric")
    if df["transaction_id"].duplicated().any(): errs.append("Duplicate transaction_id values")
    return errs

class Engine:
    def __init__(self): self.progress = "idle"; self.load(pd.DataFrame(columns=REQUIRED))
    def load(self, df, accounts=None):
        df = df.copy(); df["timestamp"] = pd.to_datetime(df["timestamp"]); df["amount"] = pd.to_numeric(df["amount"])
        for c in ("location", "channel", "device_id"):
            if c not in df: df[c] = ""
        self.df = df.sort_values("timestamp").reset_index(drop=True); self.df["ts"] = ((self.df.timestamp - pd.Timestamp("1970-01-01")) // pd.Timedelta(seconds=1)).astype("int64")
        self.accounts_meta = accounts if accounts is not None else pd.DataFrame(columns=["account_id", "account_type", "created_date", "city"])
        self.detect()

    def detect(self):
        self._stats = None
        df = self.df; self.progress = "building graph"
        S, R, T, A = df.sender.values, df.receiver.values, df.ts.values, df.amount.values
        uf = UF(); links = []; inc = defaultdict(list); out = defaultdict(list)
        for i in range(len(df)): inc[R[i]].append(i); out[S[i]].append(i)
        self.progress = "temporal flow linking"
        for acc, ins in inc.items():
            outs = out.get(acc, [])
            if not outs: continue
            ots = [T[j] for j in outs]
            for i in ins:
                k = bisect.bisect_right(ots, T[i])
                while k < len(outs) and ots[k] - T[i] <= WINDOW:
                    j = outs[k]; ratio = A[j] / A[i]
                    if RETENTION[0] <= ratio <= RETENTION[1]: links.append((i, j)); uf.union(i, j)
                    k += 1
        flags = []  # (kind, [tx idx])
        self.progress = "smurfing + velocity"
        for acc, ins in inc.items():  # fan-in aggregation then forwarding
            ins = sorted(ins, key=lambda i: T[i]); outs = out.get(acc, [])
            for a in range(len(ins)):
                win = [i for i in ins[a:] if T[i] - T[ins[a]] <= 7200]
                if len({S[i] for i in win}) >= 6 and outs:
                    end = T[win[-1]]; fw = [j for j in outs if end <= T[j] <= end + 10800]; tot = sum(A[i] for i in win)
                    if sum(A[j] for j in fw) >= 0.7 * tot: flags.append(("smurfing", win + fw)); break
        for acc, outs in out.items():  # fan-out splitting
            for i in inc.get(acc, []):
                fw = [j for j in outs if 0 < T[j] - T[i] <= 10800]
                if len({R[j] for j in fw}) >= 6 and sum(A[j] for j in fw) >= 0.7 * A[i]: flags.append(("smurfing", [i] + fw)); break
        for acc, outs in out.items():  # outgoing velocity
            for a in range(len(outs)):
                b = bisect.bisect_right([T[j] for j in outs], T[outs[a]] + WINDOW)
                if b - a >= 8: flags.append(("velocity", outs[a:b])); break
        for _, idx in flags:
            for x in idx[1:]: uf.union(idx[0], x)
        involved = {i for l in links for i in l} | {i for _, idx in flags for i in idx}
        comps = defaultdict(list)
        for i in involved: comps[uf.find(i)].append(i)
        comps = [sorted(c) for c in comps.values() if len(c) >= 3]
        # repeated behaviour: merge components that share >= 2 accounts
        merged = True
        while merged:
            merged = False
            accs = [set(S[c]) | set(R[c]) for c in comps]
            for a, b in itertools.combinations(range(len(comps)), 2):
                if len(accs[a] & accs[b]) >= 2:
                    comps[a] = sorted(set(comps[a]) | set(comps[b])); comps.pop(b); merged = True; break
        self.progress = "scoring"
        p90 = float(np.percentile(A, 90)) if len(A) else 1
        lg = nx.DiGraph(); lg.add_edges_from(links)
        nets = []
        for c in comps:
            n = self.analyse(c, lg, flags, p90)
            if n["risk"] >= 15: nets.append(n)
        nets.sort(key=lambda n: -n["risk"])
        self.networks = {}
        for k, n in enumerate(nets, 1): n["id"] = f"NET-{k:03d}"; self.networks[n["id"]] = n
        # per-transaction and per-account tags
        self.tx_net = {}; self.acc_risk = defaultdict(int)
        for n in nets:
            for t in n["tx_ids"]: self.tx_net[t] = n
            for a in n["accounts"]: self.acc_risk[a] = max(self.acc_risk[a], n["risk"])
        self.progress = "ready"

    def analyse(self, idx, lg, flags, p90):
        df = self.df; sub = df.loc[idx]; cs = set(idx)
        G = nx.DiGraph(); pair = defaultdict(int)
        for r in sub.itertuples(): G.add_edge(r.sender, r.receiver); pair[(r.sender, r.receiver)] += 1
        cycles = [c for c in itertools.islice(nx.simple_cycles(G), 60) if 3 <= len(c) <= 8]
        L = lg.subgraph(cs); path = nx.dag_longest_path(L) if len(L) else []
        depth = len(path)  # transactions in longest hop chain
        holds, mules = [], set()
        for i, j in L.edges(): holds.append(int(df.ts[j] - df.ts[i])); mules.add(df.receiver[i])
        med_hold = float(np.median(holds)) if holds else None
        kinds = {k for k, f in flags if cs & set(f)}
        span = float(sub.ts.max() - sub.ts.min()); rep = max(pair.values())
        str_ = {"circular": 1.0 if cycles else 0, "rapid": min(1, depth / 4) * (1 if med_hold is not None and med_hold < 900 else .7) if depth >= 3 else 0,
                "mule": min(1, len(mules) / 4), "velocity": 1.0 if "velocity" in kinds else 0, "smurfing": 1.0 if "smurfing" in kinds else 0,
                "repeated": min(1, (rep - 1) / 3) if rep >= 2 else 0, "amount": min(1, float(sub.amount.median()) / p90)}
        str_["complexity"] = min(1, (sum(1 for k2, v2 in str_.items() if v2 > 0 and k2 != "amount") - 1) / 3)
        pts = {k: round(WEIGHTS[k] * v) for k, v in str_.items()}; risk = min(100, sum(pts.values()))
        det = {"circular": f"{len(cycles)} cycle(s), longest {max((len(c) for c in cycles), default=0)} accounts",
               "rapid": f"{depth}-transaction chain, median hold {int(med_hold or 0)}s", "mule": f"{len(mules)} intermediary account(s) forwarding within {WINDOW//60} min",
               "velocity": "8+ outgoing transfers inside 30 minutes", "smurfing": "6+ counterparties fragmenting/aggregating funds inside 2 hours",
               "repeated": f"same account pair transacted {rep}x", "complexity": "several independent patterns overlap on the same accounts", "amount": f"median amount {sub.amount.median():,.0f} vs dataset p90 {p90:,.0f}"}
        patterns = [{"key": k, "label": LABELS[k], "detail": det[k], "points": pts[k]} for k in WEIGHTS if str_[k] > 0]
        reasons = [{"factor": LABELS[k], "points": pts[k], "max": WEIGHTS[k], "detail": det[k]} for k in WEIGHTS if pts[k] > 0]
        first, last = (path[0], path[-1]) if path else (None, None)
        leak = round(100 * (1 - df.amount[last] / df.amount[first]), 1) if path and last != first else 0
        vel = len(sub) / max(span / 60, 1)
        structure = "Circular" if cycles else "Layered chain" if depth >= 3 else "Fan-in / fan-out" if "smurfing" in kinds else "Burst" if "velocity" in kinds else "Cluster"
        fragm = "High" if "smurfing" in kinds else "Medium" if len(sub) > 8 else "Low"
        dna = {"flow_structure": structure, "velocity": "Very high" if vel > 1 else "High" if vel > .3 else "Moderate", "velocity_tx_per_min": round(vel, 2),
               "fragmentation": fragm, "intermediaries": len(mules), "depth": depth, "repeated_activity": rep, "return_flow": bool(cycles), "leakage_pct": leak, "risk": risk,
               "radar": {"Velocity": min(100, vel * 60), "Fragmentation": 90 if "smurfing" in kinds else min(60, len(sub) * 3), "Intermediaries": min(100, len(mules) * 20),
                         "Depth": min(100, depth * 20), "Repetition": min(100, (rep - 1) * 33), "Circularity": 100 if cycles else 0, "Amount": str_["amount"] * 100}}
        cyc_tx = set()
        for cy in cycles:
            edges = set(zip(cy, cy[1:] + cy[:1]))
            cyc_tx |= {i for i in idx if (df.sender[i], df.receiver[i]) in edges}
        events = [{"tx_id": df.transaction_id[i], "time": df.timestamp[i].isoformat(), "sender": df.sender[i], "receiver": df.receiver[i], "amount": float(df.amount[i]),
                   "pattern_detected": "Circular flow" if i in cyc_tx else None} for i in idx]
        accs = sorted(set(sub.sender) | set(sub.receiver))
        return {"risk": risk, "severity": sev(risk), "patterns": patterns, "reasons": reasons, "dna": dna, "accounts": accs, "tx_ids": [e["tx_id"] for e in events], "events": events,
                "n_accounts": len(accs), "n_tx": len(idx), "total_amount": float(sub.amount.sum()), "window_minutes": round(span / 60, 1),
                "start": events[0]["time"], "end": events[-1]["time"], "mules": sorted(mules), "edges": [{"source": k[0], "target": k[1], "count": v} for k, v in pair.items()]}

    # ---------- queries ----------
    def tx_row(self, r):
        n = self.tx_net.get(r.transaction_id)
        return {"transaction_id": r.transaction_id, "timestamp": r.timestamp.isoformat(), "sender": r.sender, "receiver": r.receiver, "amount": float(r.amount), "currency": r.currency,
                "transaction_type": r.transaction_type, "status": "Flagged" if n else "Completed", "risk": n["risk"] if n else 0, "network": n["id"] if n else None,
                "pattern": ", ".join(p["label"] for p in n["patterns"][:3]) if n else "", "location": r.location, "channel": r.channel, "device_id": r.device_id}
    def account_stats(self):
        if getattr(self, '_stats', None) is not None: return self._stats
        df = self.df; g_in = df.groupby("receiver").amount.agg(["sum", "count"]); g_out = df.groupby("sender").amount.agg(["sum", "count"])
        meta = self.accounts_meta.set_index("account_id").to_dict("index") if len(self.accounts_meta) else {}
        res = {}
        for a in set(df.sender) | set(df.receiver):
            m = meta.get(a, {})
            res[a] = {"account_id": a, "risk": int(self.acc_risk.get(a, 0)), "type": m.get("account_type", "Unknown"), "created": str(m.get("created_date", "")), "city": m.get("city", ""),
                      "incoming": float(g_in["sum"].get(a, 0)), "outgoing": float(g_out["sum"].get(a, 0)), "tx_count": int(g_in["count"].get(a, 0) + g_out["count"].get(a, 0)),
                      "networks": [n["id"] for n in self.networks.values() if a in n["accounts"]]}
        self._stats = res
        return res

_engine = None; _lock = threading.Lock()
def get_engine():
    global _engine
    with _lock:
        if _engine is None:
            from django.conf import settings
            _engine = Engine(); f = settings.UPLOAD_FILE if settings.UPLOAD_FILE.exists() else settings.DATA_FILE
            if f.exists():
                acc = pd.read_csv(settings.ACCOUNTS_FILE) if settings.ACCOUNTS_FILE.exists() else None
                _engine.load(pd.read_csv(f), acc)
        return _engine
