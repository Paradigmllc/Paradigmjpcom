#!/bin/bash
docker exec paradigm-supabase-db psql -U postgres -d postgres -c "ALTER ROLE authenticator WITH PASSWORD 'b1a6696bce7d362eb3f8e793747e27127b06f9e48403cbf4';"
