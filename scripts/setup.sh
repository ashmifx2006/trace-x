#!/bin/sh
# One-shot setup: python3 deps, DB, then prints run instructions
cd "$(dirname "$0")/../backend" && pip install -r requirements.txt && python manage.py makemigrations api && python manage.py migrate && python manage.py seed_users && python manage.py test api
echo "Start API: cd backend && python manage.py runserver ; UI: cd frontend && npm install && npm run dev"
