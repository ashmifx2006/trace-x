"""Creates DB tables. Data itself is analysed live from sample_data/ by the intelligence engine."""
import os, sys, subprocess
os.chdir(os.path.join(os.path.dirname(__file__), "..", "backend"))
for c in (["makemigrations", "api"], ["migrate"]): subprocess.check_call([sys.executable, "manage.py", *c])
