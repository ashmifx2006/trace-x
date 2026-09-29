# TRACE-X: Follow the Money. Reveal the Network.
Byteathon BYT01: coordinated money-laundering network detection using transactional and temporal patterns. Synthetic data only.

## Run (two terminals)
```
# backend (Python 3.10+)
cd backend && pip install -r requirements.txt
python manage.py makemigrations api && python manage.py migrate && python manage.py seed_users
python manage.py runserver          # http://localhost:8000
# frontend (Node 18+)
cd frontend && npm install && npm run dev   # http://localhost:5173
```
Regenerate data: `python scripts/generate_demo_data.py` (10k+ transactions, 580 accounts, 16 injected scenarios, rest normal).

## Login
Demo users (created by `seed_users`): `analyst / trace-x-demo`, `admin / trace-x-admin`. Token auth (signed, 24h expiry) protects every API route. Change these passwords for anything beyond a demo.

## PostgreSQL (optional)
`pip install psycopg2-binary` then set `TRACEX_DB=postgres POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD POSTGRES_HOST` before migrating. Default is SQLite.

## Tests
`python backend/tests/test_engine.py` (engine, no Django needed) and `python manage.py test api` (API smoke + case/evidence/PDF flow). Or run `scripts/setup.sh`.

## Screens
Login, Command Center, Transaction Explorer, Graph Explorer (search, filters, expand), Suspicious Networks (DNA compare), Network workspace (replay, timeline, DNA, accounts, transactions, patterns, risk, evidence pins, notes, report), Account Intelligence, Alerts (acknowledge), Cases, Data Upload, System.

## How it works
1. **Temporal flow links**: tx A->B and B->C are linked when C is forwarded within 30 min and retains 60-100% of the amount.
2. **Network reconstruction**: linked transactions plus smurfing and velocity flags are grouped into connected components; components sharing 2+ accounts merge (repeated behavior).
3. **Pattern detection**: circular flow (graph cycles), rapid pass-through, mule chain, smurfing (fan-in/out aggregation), high velocity, repeated behavior, amount anomaly.
4. **Explainable risk** (0-100): weights in `intelligence/engine.py`, including a multi-pattern correlation factor. Every point is listed with evidence.
5. **Network DNA**: behavioral fingerprint and radar, comparable across networks.
6. **Money-trail replay**, **case workflow with notes**, **PDF dossier**, **CSV upload** re-running the whole pipeline.

## API
`/api/dashboard/summary/ /transactions/ /transactions/{id}/ /accounts/ /accounts/{id}/ /networks/ /networks/{id}/ /networks/{id}/report/ /alerts/ /cases/ /cases/{id}/ /cases/{id}/notes/ /upload/ /search/ /system/`
