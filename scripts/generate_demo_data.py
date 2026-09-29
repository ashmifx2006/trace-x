"""Generate synthetic transactions: mostly normal activity + injected laundering scenarios. Usage: python scripts/generate_demo_data.py"""
import random, csv, datetime as dt
from pathlib import Path
random.seed(42)
OUT = Path(__file__).resolve().parent.parent / "sample_data"
START = dt.datetime(2026, 8, 1)
CITIES = ["Chennai", "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Kolkata", "Pune", "Kochi"]
TYPES = ["UPI", "NEFT", "IMPS", "RTGS"]
acc = [f"ACC{i:04d}" for i in range(1, 501)]; extra = [f"ACC{i:04d}" for i in range(501, 581)]
customers, merchants = acc[:450], acc[450:]
rows = []; n = [0]
def tx(t, s, r, a, typ=None, city=None):
    n[0] += 1
    rows.append([f"TXN{n[0]:06d}", t.strftime("%Y-%m-%d %H:%M:%S"), s, r, round(a, 2), "INR", typ or random.choice(TYPES), city or random.choice(CITIES), random.choice(["mobile", "web", "branch", "atm"]), f"DEV{random.randint(1,900):04d}"])
def rnd_time(): return START + dt.timedelta(days=random.randint(0, 29), hours=random.choice([9,10,11,12,13,14,15,16,17,18,19,20]), minutes=random.randint(0, 59), seconds=random.randint(0, 59))
for _ in range(10000):
    s = random.choice(customers); r = random.choice(merchants) if random.random() < .7 else random.choice(customers)
    if s != r: tx(rnd_time(), s, r, random.lognormvariate(7.4, 1.1))
pool = iter(random.sample(extra, len(extra)))
def take(k): return [next(pool) for _ in range(k)]
def chain(t, path, amt, gap=(60, 240), keep=(.95, .99), typ="IMPS"):
    for a, b in zip(path, path[1:]):
        tx(t, a, b, amt, typ); t += dt.timedelta(seconds=random.randint(*gap)); amt *= random.uniform(*keep)
for _ in range(4):  # circular flow (repeated rounds)
    ring = take(random.randint(4, 6)); t = rnd_time(); amt = random.uniform(3e5, 9e5)
    for rd in range(random.randint(2, 4)): chain(t + dt.timedelta(hours=rd * 5), ring + [ring[0]], amt * .97 ** rd)
for _ in range(3):  # rapid pass-through
    p = take(6); t = rnd_time(); amt = random.uniform(5e5, 1.5e6)
    for rd in range(2): chain(t + dt.timedelta(hours=rd * 6), p, amt)
for _ in range(3):  # mule chain fed by several victims
    m = take(4); t = rnd_time(); victims = random.sample(customers, 3)
    for v in victims: tx(t, v, m[0], random.uniform(1.5e5, 3e5), "UPI"); t += dt.timedelta(minutes=random.randint(2, 8))
    chain(t, m, 6e5, (120, 420), (.93, .98))
for _ in range(3):  # smurfing: fan-in below threshold then aggregate out
    a = take(3); t = rnd_time(); tot = 0
    for s in random.sample(customers, 8):
        x = random.uniform(38000, 49000); tot += x; tx(t, s, a[0], x, "UPI"); t += dt.timedelta(minutes=random.randint(3, 12))
    tx(t + dt.timedelta(minutes=20), a[0], a[1], tot * .55, "IMPS"); tx(t + dt.timedelta(minutes=40), a[0], a[2], tot * .4, "IMPS")
for _ in range(3):  # high velocity sender
    s = take(1)[0]; t = rnd_time()
    for r in random.sample(customers, 12): tx(t, s, r, random.uniform(9000, 30000), "UPI"); t += dt.timedelta(seconds=random.randint(60, 150))
rows.sort(key=lambda r: r[1])
with open(OUT / "transactions.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["transaction_id","timestamp","sender","receiver","amount","currency","transaction_type","location","channel","device_id"]); w.writerows(rows)
with open(OUT / "accounts.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["account_id","account_type","created_date","city"])
    for a in acc + extra:
        w.writerow([a, "Merchant" if a in merchants else random.choice(["Savings","Savings","Current","Wallet"]), (START - dt.timedelta(days=random.randint(30, 2000))).date(), random.choice(CITIES)])
print(f"{len(rows)} transactions, {len(acc)+len(extra)} accounts")
