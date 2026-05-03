#!/bin/bash
set -e

echo "→ Waiting for Postgres..."
until python -c "import psycopg; psycopg.connect(dbname='${POSTGRES_DB}', user='${POSTGRES_USER}', password='${POSTGRES_PASSWORD}', host='${POSTGRES_HOST}', port='${POSTGRES_PORT}')" 2>/dev/null; do
  sleep 1
done
echo "✓ Postgres is up"

echo "→ Running migrations..."
python manage.py migrate --noinput

echo "→ Seeding skills..."
python manage.py seed_skills || true

if [ "$DJANGO_AUTO_CREATE_SUPERUSER" = "true" ]; then
  echo "→ Creating superuser if not exists..."
  python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@kodfolio.com').exists():
    User.objects.create_superuser(email='admin@kodfolio.com', password='admin', role='admin')
    print('Superuser created: admin@kodfolio.com / admin')
"
fi

echo "→ Starting server..."
exec "$@"
