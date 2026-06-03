#!/bin/bash
docker exec paradigm-supabase-db psql -U postgres -d postgres -c "ALTER ROLE authenticator WITH LOGIN;"
