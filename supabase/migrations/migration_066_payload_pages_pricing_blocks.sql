BEGIN;

-- A legacy parity import duplicated one empty draft and its locale rows. Keep
-- one copy only; published home-ja/home-en documents are not touched.
DELETE FROM paradigm.pages
WHERE ctid IN (
  SELECT ctid
  FROM (
    SELECT ctid, row_number() OVER (PARTITION BY id ORDER BY ctid) AS duplicate_number
    FROM paradigm.pages
    WHERE slug IS NULL
  ) duplicates
  WHERE duplicate_number > 1
);

DELETE FROM paradigm.pages_available_locales
WHERE ctid IN (
  SELECT ctid
  FROM (
    SELECT ctid, row_number() OVER (
      PARTITION BY parent_id, id, "order", value ORDER BY ctid
    ) AS duplicate_number
    FROM paradigm.pages_available_locales
  ) duplicates
  WHERE duplicate_number > 1
);

CREATE SEQUENCE IF NOT EXISTS paradigm.pages_blocks_pricing_locales_id_seq;
CREATE SEQUENCE IF NOT EXISTS paradigm.pages_blocks_pricing_tiers_locales_id_seq;

CREATE TABLE IF NOT EXISTS paradigm.pages_blocks_pricing (
  _order integer NOT NULL,
  _parent_id integer NOT NULL,
  _path text NOT NULL,
  id character varying NOT NULL,
  block_name character varying
);

CREATE TABLE IF NOT EXISTS paradigm.pages_blocks_pricing_locales (
  title character varying,
  subtitle character varying,
  id integer DEFAULT nextval('paradigm.pages_blocks_pricing_locales_id_seq'::regclass) NOT NULL,
  _locale paradigm._locales NOT NULL,
  _parent_id character varying NOT NULL
);

CREATE TABLE IF NOT EXISTS paradigm.pages_blocks_pricing_tiers (
  _order integer NOT NULL,
  _parent_id character varying NOT NULL,
  id character varying NOT NULL,
  cta_href character varying,
  highlighted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS paradigm.pages_blocks_pricing_tiers_locales (
  name character varying NOT NULL,
  price character varying,
  period character varying,
  description character varying,
  features character varying,
  cta_label character varying,
  id integer DEFAULT nextval('paradigm.pages_blocks_pricing_tiers_locales_id_seq'::regclass) NOT NULL,
  _locale paradigm._locales NOT NULL,
  _parent_id character varying NOT NULL
);

ALTER SEQUENCE paradigm.pages_blocks_pricing_locales_id_seq
  OWNED BY paradigm.pages_blocks_pricing_locales.id;
ALTER SEQUENCE paradigm.pages_blocks_pricing_tiers_locales_id_seq
  OWNED BY paradigm.pages_blocks_pricing_tiers_locales.id;

CREATE INDEX IF NOT EXISTS pages_blocks_pricing_order_idx
  ON paradigm.pages_blocks_pricing (_order);
CREATE INDEX IF NOT EXISTS pages_blocks_pricing_parent_id_idx
  ON paradigm.pages_blocks_pricing (_parent_id);
CREATE INDEX IF NOT EXISTS pages_blocks_pricing_path_idx
  ON paradigm.pages_blocks_pricing (_path);
CREATE INDEX IF NOT EXISTS pages_blocks_pricing_tiers_order_idx
  ON paradigm.pages_blocks_pricing_tiers (_order);
CREATE INDEX IF NOT EXISTS pages_blocks_pricing_tiers_parent_id_idx
  ON paradigm.pages_blocks_pricing_tiers (_parent_id);

-- Payload's Drizzle adapter uses ON CONFLICT(id) for document and block
-- writes. The imported schema had the columns but not their unique arbiters.
DO $$
DECLARE
  table_row record;
  index_name text;
BEGIN
  FOR table_row IN
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'paradigm'
      AND column_name = 'id'
      AND (table_name = 'pages' OR table_name LIKE 'pages\_%' ESCAPE '\')
      AND table_name NOT LIKE '\_pages\_v%' ESCAPE '\'
  LOOP
    index_name := left('payload_' || table_row.table_name || '_id_uidx_', 48)
      || substr(md5(table_row.table_name), 1, 8);
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS %I ON paradigm.%I (id)',
      index_name,
      table_row.table_name
    );
  END LOOP;

  FOR table_row IN
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'paradigm'
      AND column_name = '_locale'
      AND (table_name = 'pages_locales' OR table_name LIKE 'pages\_blocks\_%\_locales' ESCAPE '\')
  LOOP
    index_name := left('payload_' || table_row.table_name || '_locale_parent_uidx_', 48)
      || substr(md5(table_row.table_name || '_locale_parent'), 1, 8);
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS %I ON paradigm.%I (_locale, _parent_id)',
      index_name,
      table_row.table_name
    );
  END LOOP;
END $$;

ALTER TABLE paradigm.pages_blocks_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE paradigm.pages_blocks_pricing_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE paradigm.pages_blocks_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE paradigm.pages_blocks_pricing_tiers_locales ENABLE ROW LEVEL SECURITY;

COMMIT;
