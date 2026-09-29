import io, pandas as pd
from django.conf import settings
from django.http import HttpResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from intelligence.engine import get_engine, validate, sev
from .models import Case, Note, Evidence

def case_json(c, notes=False):
    d = {"case_id": c.case_id, "network_id": c.network_id, "title": c.title, "priority": c.priority, "status": c.status, "analyst": c.analyst, "risk": c.risk,
         "created": c.created.isoformat(), "updated": c.updated.isoformat()}
    if notes:
        d["notes"] = [{"text": n.text, "created": n.created.isoformat()} for n in c.notes.order_by("-created")]
        d["evidence"] = [{"tx_id": x.tx_id, "comment": x.comment, "created": x.created.isoformat()} for x in c.evidence.order_by("-created")]
    return d

@api_view(["GET"])
def summary(r):
    e = get_engine(); df = e.df; nets = list(e.networks.values())
    daily = df.groupby(df.timestamp.dt.date).agg(volume=("amount", "sum"), count=("amount", "size"))
    flagged = df[df.transaction_id.isin(e.tx_net.keys())]
    sus = flagged.groupby(flagged.timestamp.dt.date).size()
    trend = [{"date": str(d), "volume": float(row.volume), "count": int(row["count"]), "suspicious": int(sus.get(d, 0))} for d, row in daily.iterrows()]
    stats = e.account_stats(); pat = {}
    for n in nets:
        for p in n["patterns"]: pat[p["label"]] = pat.get(p["label"], 0) + 1
    dist = {s: 0 for s in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]}
    for n in nets: dist[n["severity"]] += 1
    geo = df.groupby("location").size().to_dict() if "location" in df else {}
    top = sorted(stats.values(), key=lambda a: -a["risk"])[:8]
    return Response({"transactions": len(df), "accounts": len(stats), "networks": len(nets), "active_cases": Case.objects.exclude(status="Resolved").count(),
                    "high_risk_accounts": sum(1 for a in stats.values() if a["risk"] >= 60), "total_value": float(df.amount.sum()), "trend": trend,
                    "risk_distribution": [{"name": k, "value": v} for k, v in dist.items()], "pattern_distribution": [{"name": k, "value": v} for k, v in pat.items()],
                    "geo": [{"name": k, "value": int(v)} for k, v in geo.items() if k], "top_accounts": top, "recent_alerts": _alerts()[:6], "status": e.progress})

@api_view(["GET"])
def transactions(r):
    e = get_engine(); rows = [e.tx_row(x) for x in e.df.itertuples()]; q = r.GET
    def f(x):
        if q.get("q") and q["q"].lower() not in (x["transaction_id"] + x["sender"] + x["receiver"]).lower(): return False
        if q.get("account") and q["account"] not in (x["sender"], x["receiver"]): return False
        if q.get("min_risk") and x["risk"] < int(q["min_risk"]): return False
        if q.get("min_amount") and x["amount"] < float(q["min_amount"]): return False
        if q.get("max_amount") and x["amount"] > float(q["max_amount"]): return False
        if q.get("from") and x["timestamp"][:10] < q["from"]: return False
        if q.get("to") and x["timestamp"][:10] > q["to"]: return False
        if q.get("pattern") and q["pattern"].lower() not in x["pattern"].lower(): return False
        return True
    rows = [x for x in rows if f(x)]
    key = q.get("sort", "timestamp"); rows.sort(key=lambda x: x.get(key) or 0, reverse=q.get("dir", "desc") == "desc")
    page = int(q.get("page", 1)); size = 25
    return Response({"count": len(rows), "page": page, "page_size": size, "results": rows[(page - 1) * size: page * size]})

@api_view(["GET"])
def transaction(r, tid):
    e = get_engine(); m = e.df[e.df.transaction_id == tid]
    if m.empty: return Response({"error": "not found"}, status=404)
    d = e.tx_row(next(m.itertuples())); n = e.tx_net.get(tid)
    d["network_detail"] = {"id": n["id"], "risk": n["risk"], "patterns": n["patterns"]} if n else None
    return Response(d)

@api_view(["GET"])
def accounts(r):
    e = get_engine(); q = r.GET.get("q", "").lower(); rows = [a for a in e.account_stats().values() if q in a["account_id"].lower()]
    rows.sort(key=lambda a: -a["risk"]); return Response(rows[:200])

@api_view(["GET"])
def account(r, aid):
    e = get_engine(); st = e.account_stats().get(aid)
    if not st: return Response({"error": "not found"}, status=404)
    df = e.df; sub = df[(df.sender == aid) | (df.receiver == aid)]
    hist = [e.tx_row(x) for x in sub.itertuples()]
    conn = sorted((set(sub.sender) | set(sub.receiver)) - {aid})
    holds = []
    for x in df[df.receiver == aid].itertuples():
        o = df[(df.sender == aid) & (df.ts > x.ts)].head(1)
        if len(o): holds.append(int(o.ts.iloc[0] - x.ts))
    st.update({"connected_accounts": conn, "avg_holding_seconds": round(sum(holds) / len(holds)) if holds else None, "history": hist[-100:],
               "suspicious_events": [h for h in hist if h["risk"]][:50],
               "risk_factors": [{"network": n, "reasons": e.networks[n]["reasons"]} for n in st["networks"]]})
    return Response(st)

def net_summary(n):
    return {k: n[k] for k in ("id", "risk", "severity", "n_accounts", "n_tx", "total_amount", "window_minutes", "start", "end")} | {"patterns": [p["label"] for p in n["patterns"]], "dna": n["dna"]}

@api_view(["GET"])
def networks(r):
    e = get_engine(); return Response([net_summary(n) for n in e.networks.values()])

@api_view(["GET"])
def network(r, nid):
    e = get_engine(); n = e.networks.get(nid)
    if not n: return Response({"error": "not found"}, status=404)
    st = e.account_stats(); nodes = [{"id": a, "risk": st[a]["risk"], "tx_count": st[a]["tx_count"], "incoming": st[a]["incoming"], "outgoing": st[a]["outgoing"], "mule": a in n["mules"]} for a in n["accounts"]]
    edges = [{"id": ev["tx_id"], "source": ev["sender"], "target": ev["receiver"], "amount": ev["amount"], "time": ev["time"]} for ev in n["events"]]
    case = Case.objects.filter(network_id=nid).first()
    return Response(n | {"nodes": nodes, "graph_edges": edges, "case": case_json(case) if case else None})

def _alerts():
    e = get_engine(); out = []
    for n in e.networks.values():
        c = Case.objects.filter(network_id=n["id"]).first()
        out.append({"alert_id": "ALT-" + n["id"][4:], "pattern": n["patterns"][0]["label"] if n["patterns"] else "", "network": n["id"], "risk": n["risk"], "severity": n["severity"], "timestamp": n["start"], "status": c.status if c else "New", "case_id": c.case_id if c else None})
    return out
@api_view(["GET"])
def alerts(r): return Response(_alerts())

@api_view(["GET", "POST"])
def cases(r):
    if r.method == "POST":
        e = get_engine(); n = e.networks.get(r.data.get("network_id"))
        if not n: return Response({"error": "unknown network"}, status=400)
        if Case.objects.filter(network_id=n["id"]).exists(): return Response({"error": "case already exists"}, status=409)
        c = Case.objects.create(case_id=f"CASE-{Case.objects.count() + 1:04d}", network_id=n["id"], risk=n["risk"], priority=n["severity"], status=r.data.get("status", "New"), analyst=r.data.get("analyst", "Analyst"),
                                title=r.data.get("title") or f"{n['patterns'][0]['label'] if n['patterns'] else 'Suspicious'} network {n['id']}")
        return Response(case_json(c), status=201)
    return Response([case_json(c) for c in Case.objects.order_by("-updated")])

@api_view(["GET", "PATCH"])
def case_detail(r, cid):
    try: c = Case.objects.get(case_id=cid)
    except Case.DoesNotExist: return Response({"error": "not found"}, status=404)
    if r.method == "PATCH":
        for k in ("status", "priority", "analyst", "title"):
            if k in r.data: setattr(c, k, r.data[k])
        c.save()
    return Response(case_json(c, True))

@api_view(["POST"])
def add_note(r, cid):
    c = Case.objects.get(case_id=cid); Note.objects.create(case=c, text=r.data.get("text", "")); c.save(); return Response(case_json(c, True), status=201)

@api_view(["POST"])
def upload(r):
    f = r.FILES.get("file")
    if not f: return Response({"error": "No file"}, status=400)
    try: df = pd.read_csv(f)
    except Exception as ex: return Response({"valid": False, "errors": [f"Cannot parse CSV: {ex}"]}, status=400)
    errs = validate(df)
    if errs: return Response({"valid": False, "errors": errs}, status=400)
    import intelligence.engine as E
    e = get_engine(); e.load(df, e.accounts_meta if len(e.accounts_meta) else None); df.to_csv(settings.UPLOAD_FILE, index=False)
    return Response({"valid": True, "rows": len(df), "networks": len(e.networks), "steps": ["Validated", "Graph built", "Patterns detected", "Networks reconstructed", "Risk scored", "Dashboard updated"]})

@api_view(["GET"])
def search(r):
    e = get_engine(); q = r.GET.get("q", "").strip().lower(); res = {"accounts": [], "transactions": [], "cases": [], "networks": []}
    if len(q) < 2: return Response(res)
    res["accounts"] = [a for a in e.account_stats() if q in a.lower()][:6]
    res["transactions"] = e.df[e.df.transaction_id.str.lower().str.contains(q, regex=False)].transaction_id.head(6).tolist()
    res["networks"] = [n for n in e.networks if q in n.lower()][:6]
    res["cases"] = list(Case.objects.filter(case_id__icontains=q).values_list("case_id", flat=True)[:6])
    return Response(res)

@api_view(["GET"])
def system(r):
    e = get_engine(); return Response({"status": e.progress, "rows": len(e.df), "networks": len(e.networks), "engine": "TRACE-X 1.0", "weights": __import__("intelligence.engine", fromlist=["WEIGHTS"]).WEIGHTS})

def report(request, nid):
    from .auth import user_from_token
    if not user_from_token(request.GET.get("token", "")): return HttpResponse("Unauthorized", status=401)
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.graphics.shapes import Drawing, Circle, Line, String
    import math
    e = get_engine(); n = e.networks.get(nid)
    if not n: return HttpResponse("not found", status=404)
    case = Case.objects.filter(network_id=nid).first(); ss = getSampleStyleSheet(); el = []
    el += [Paragraph("TRACE-X Investigation Report", ss["Title"]), Paragraph(f"Case: {case.case_id if case else 'not opened'} &nbsp; Network: {nid} &nbsp; Risk: {n['risk']}/100 ({n['severity']})", ss["Heading3"])]
    el += [Paragraph(f"{n['n_accounts']} accounts, {n['n_tx']} transactions, INR {n['total_amount']:,.0f} moved in {n['window_minutes']} minutes ({n['start'][:19]} to {n['end'][:19]}).", ss["Normal"]), Spacer(1, 8)]
    d = Drawing(400, 220); pos = {a: (200 + 85 * math.cos(2 * math.pi * i / len(n["accounts"])), 110 + 85 * math.sin(2 * math.pi * i / len(n["accounts"]))) for i, a in enumerate(n["accounts"])}
    for ed in n["edges"]: d.add(Line(*pos[ed["source"]], *pos[ed["target"]], strokeColor=colors.HexColor("#6366f1")))
    for a, (x, y) in pos.items(): d.add(Circle(x, y, 5, fillColor=colors.HexColor("#ef4444" if a in n["mules"] else "#06b6d4"))); d.add(String(x + 6, y + 4, a[-4:], fontSize=6))
    el += [Paragraph("Network graph (red = intermediary)", ss["Heading2"]), d, Paragraph("Detected patterns and risk explanation", ss["Heading2"])]
    t = Table([["Factor", "Points", "Evidence"]] + [[x["factor"], f"+{x['points']}", x["detail"]] for x in n["reasons"]] + [["Total", str(n["risk"]), ""]])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), .3, colors.grey), ("FONTSIZE", (0, 0), (-1, -1), 8)]))
    el += [t, Paragraph("Network DNA", ss["Heading2"]), Paragraph("; ".join(f"{k}: {v}" for k, v in n["dna"].items() if k != "radar"), ss["Normal"]), Paragraph("Timeline / evidence references", ss["Heading2"])]
    t2 = Table([["Time", "Tx ID", "From", "To", "Amount"]] + [[ev["time"][11:19], ev["tx_id"], ev["sender"], ev["receiver"], f"{ev['amount']:,.0f}"] for ev in n["events"][:60]])
    t2.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .3, colors.grey), ("FONTSIZE", (0, 0), (-1, -1), 7)])); el.append(t2)
    if case:
        el.insert(2, Paragraph(f"Title: {case.title} | Status: {case.status} | Analyst: {case.analyst} | Priority: {case.priority}", ss["Normal"]))
        el.append(Paragraph("Evidence references", ss["Heading2"]))
        for ev in case.evidence.order_by("created"): el.append(Paragraph(f"{ev.tx_id}: {ev.comment or '(no comment)'}", ss["Normal"]))
        el.append(Paragraph("Investigator notes", ss["Heading2"]))
        for nt in case.notes.order_by("created"): el.append(Paragraph(f"{nt.created:%Y-%m-%d %H:%M} - {nt.text}", ss["Normal"]))
    buf = io.BytesIO(); SimpleDocTemplate(buf, pagesize=A4).build(el)
    return HttpResponse(buf.getvalue(), content_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="TRACE-X-{nid}.pdf"'})

@api_view(["POST"])
def add_evidence(r, cid):
    c = Case.objects.get(case_id=cid); e = get_engine()
    if r.data.get("tx_id") not in set(e.networks[c.network_id]["tx_ids"]): return Response({"error": "transaction is not part of this network"}, status=400)
    Evidence.objects.get_or_create(case=c, tx_id=r.data["tx_id"], defaults={"comment": r.data.get("comment", "")}); c.save()
    return Response(case_json(c, True), status=201)

@api_view(["GET"])
def graph(r):
    e = get_engine(); q = r.GET; df = e.df; st = e.account_stats(); center = q.get("center") or None
    if q.get("from"): df = df[df.timestamp >= q["from"]]
    if q.get("to"): df = df[df.timestamp <= q["to"] + " 23:59:59"]
    if q.get("min_amount"): df = df[df.amount >= float(q["min_amount"])]
    if center:
        if center not in st: return Response({"error": "unknown account"}, status=404)
        nodes = {center}
        for _ in range(int(q.get("hops", 1))):
            m = df[df.sender.isin(nodes) | df.receiver.isin(nodes)]; nodes |= set(m.sender) | set(m.receiver)
        if len(nodes) > 150: nodes = set(sorted(nodes, key=lambda a: -st[a]["tx_count"])[:150]) | {center}
        sub = df[df.sender.isin(nodes) & df.receiver.isin(nodes)]
    else: sub = df[df.transaction_id.isin(e.tx_net.keys())]
    mr = int(q.get("min_risk", 0)); ids = {a for a in set(sub.sender) | set(sub.receiver) if st[a]["risk"] >= mr or a == center}
    sub = sub[sub.sender.isin(ids) & sub.receiver.isin(ids)]; trunc = len(sub) > 400; sub = sub.tail(400)
    ids = set(sub.sender) | set(sub.receiver) | ({center} if center else set())
    return Response({"truncated": trunc, "center": center, "nodes": [{"id": a, "risk": st[a]["risk"], "tx_count": st[a]["tx_count"], "incoming": st[a]["incoming"], "outgoing": st[a]["outgoing"], "mule": False, "networks": st[a]["networks"]} for a in ids],
                     "edges": [{"id": x.transaction_id, "source": x.sender, "target": x.receiver, "amount": float(x.amount), "time": x.timestamp.isoformat()} for x in sub.itertuples()]})

@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login(r):
    from django.contrib.auth import authenticate
    from .auth import make_token
    u = authenticate(username=r.data.get("username", ""), password=r.data.get("password", ""))
    if not u: return Response({"error": "Wrong username or password"}, status=401)
    return Response({"token": make_token(u.username), "username": u.username})
