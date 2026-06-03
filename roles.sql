
DO $$
BEGIN
  CREATE ROLE anon NOLOGIN;
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE ROLE authenticated NOLOGIN;
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE ROLE service_role NOLOGIN;
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
