#!/bin/bash
# Unlock all Payload CMS users
set -e

CONTAINER=$(docker ps --filter "name=paradigm-hp" --format "{{.Names}}" | head -1)
if [ -z "$CONTAINER" ]; then
  echo "❌ No paradigm-hp container found"
  exit 1
fi
echo "Container: $CONTAINER"

# Get DATABASE_URI from container env
DB_URI=$(docker exec "$CONTAINER" printenv DATABASE_URI 2>/dev/null || echo "")
if [ -z "$DB_URI" ]; then
  # Try fallback resolution
  PG_PASS=$(docker exec "$CONTAINER" printenv SUPABASE_POSTGRES_PASSWORD 2>/dev/null || echo "")
  if [ -n "$PG_PASS" ]; then
    DB_URI="postgresql://refferq:${PG_PASS}@refferq-db:5432/refferq"
    echo "Using fallback URI via SUPABASE_POSTGRES_PASSWORD"
  else
    echo "❌ Cannot resolve DATABASE_URI"
    exit 1
  fi
fi

echo "Unlocking users..."
docker exec "$CONTAINER" psql "$DB_URI" -c "
UPDATE paradigm.users SET login_attempts = 0, lock_until = NULL 
WHERE login_attempts > 0 OR lock_until IS NOT NULL;
SELECT email, login_attempts, lock_until, role FROM paradigm.users ORDER BY created_at;
"
echo "✅ Done"
