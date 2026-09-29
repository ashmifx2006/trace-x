# First-run checklist
1. `pip install -r backend/requirements.txt` (Python 3.10+). If `migrate` complains about the api app, run `python manage.py makemigrations api` first.
2. `python manage.py seed_users`, then `python manage.py runserver` and open http://localhost:8000/api/networks/ (expect 401 without login; that means auth works).
3. `cd frontend && npm install && npm run dev`. The Vite proxy sends /api to port 8000.
4. Sign in with analyst / trace-x-demo. Command Center should show about 10,176 transactions and 16 networks.
5. Open the top network, press Start replay: the graph should animate and flag PATTERN DETECTED on circular hops.

Symptoms:
- Login says "Cannot reach the API": backend not running on 8000.
- Blank charts: check the browser console; send the first red error.
- PDF 401: sign out and back in (token expired after 24h).
- Wrong or empty data: run `python scripts/generate_demo_data.py`, delete `backend/data/uploaded.csv`, restart the server.
- Engine check without Django: `python backend/tests/test_engine.py`.
