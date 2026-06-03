#!/bin/bash
docker exec paradigm-supabase-db psql -U postgres -d postgres -c "SELECT count(*) FROM sales_products;"
