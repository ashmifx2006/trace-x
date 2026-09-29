from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = "trace-x-demo-key-change-me"
DEBUG = True
ALLOWED_HOSTS = ["*"]
INSTALLED_APPS = ["django.contrib.contenttypes", "django.contrib.auth", "django.contrib.staticfiles", "rest_framework", "api"]
MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
import os
if os.environ.get("TRACEX_DB") == "postgres":  # e.g. TRACEX_DB=postgres POSTGRES_DB=tracex POSTGRES_USER=... POSTGRES_PASSWORD=... POSTGRES_HOST=localhost (pip install psycopg2-binary)
    DATABASES = {"default": {"ENGINE": "django.db.backends.postgresql", "NAME": os.environ.get("POSTGRES_DB", "tracex"), "USER": os.environ.get("POSTGRES_USER", "tracex"),
                             "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""), "HOST": os.environ.get("POSTGRES_HOST", "localhost"), "PORT": os.environ.get("POSTGRES_PORT", "5432")}}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["api.auth.TokenAuth"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}
USE_TZ = False
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
DATA_FILE = BASE_DIR.parent / "sample_data" / "transactions.csv"
ACCOUNTS_FILE = BASE_DIR.parent / "sample_data" / "accounts.csv"
UPLOAD_FILE = BASE_DIR / "data" / "uploaded.csv"
