BEGIN;

CREATE SEQUENCE IF NOT EXISTS paradigm._pages_v_blocks_pricing_id_seq;
CREATE SEQUENCE IF NOT EXISTS paradigm._pages_v_blocks_pricing_locales_id_seq;
CREATE SEQUENCE IF NOT EXISTS paradigm._pages_v_blocks_pricing_tiers_id_seq;
CREATE SEQUENCE IF NOT EXISTS paradigm._pages_v_blocks_pricing_tiers_locales_id_seq;

CREATE TABLE IF NOT EXISTS paradigm._pages_v_blocks_pricing (
  _order integer NOT NULL,
  _parent_id integer NOT NULL,
  _path text NOT NULL,
  id integer DEFAULT nextval('paradigm._pages_v_blocks_pricing_id_seq'::regclass) NOT NULL,
  _uuid character varying,
  block_name character varying,
  CONSTRAINT _pages_v_blocks_pricing_id_unique UNIQUE (id)
);

CREATE TABLE IF NOT EXISTS paradigm._pages_v_blocks_pricing_locales (
  title character varying,
  subtitle character varying,
  id integer DEFAULT nextval('paradigm._pages_v_blocks_pricing_locales_id_seq'::regclass) NOT NULL,
  _parent_id integer NOT NULL,
  _locale paradigm._locales NOT NULL,
  CONSTRAINT _pages_v_blocks_pricing_locales_id_unique UNIQUE (id),
  CONSTRAINT _pages_v_blocks_pricing_locales_locale_parent_unique UNIQUE (_locale, _parent_id)
);

CREATE TABLE IF NOT EXISTS paradigm._pages_v_blocks_pricing_tiers (
  _order integer NOT NULL,
  _parent_id integer NOT NULL,
  id integer DEFAULT nextval('paradigm._pages_v_blocks_pricing_tiers_id_seq'::regclass) NOT NULL,
  cta_href character varying,
  highlighted boolean DEFAULT false,
  _uuid character varying,
  CONSTRAINT _pages_v_blocks_pricing_tiers_id_unique UNIQUE (id)
);

CREATE TABLE IF NOT EXISTS paradigm._pages_v_blocks_pricing_tiers_locales (
  name character varying NOT NULL,
  price character varying,
  period character varying,
  description character varying,
  features character varying,
  cta_label character varying,
  id integer DEFAULT nextval('paradigm._pages_v_blocks_pricing_tiers_locales_id_seq'::regclass) NOT NULL,
  _parent_id integer NOT NULL,
  _locale paradigm._locales NOT NULL,
  CONSTRAINT _pages_v_blocks_pricing_tiers_locales_id_unique UNIQUE (id),
  CONSTRAINT _pages_v_blocks_pricing_tiers_locales_locale_parent_unique UNIQUE (_locale, _parent_id)
);

ALTER SEQUENCE paradigm._pages_v_blocks_pricing_id_seq
  OWNED BY paradigm._pages_v_blocks_pricing.id;
ALTER SEQUENCE paradigm._pages_v_blocks_pricing_locales_id_seq
  OWNED BY paradigm._pages_v_blocks_pricing_locales.id;
ALTER SEQUENCE paradigm._pages_v_blocks_pricing_tiers_id_seq
  OWNED BY paradigm._pages_v_blocks_pricing_tiers.id;
ALTER SEQUENCE paradigm._pages_v_blocks_pricing_tiers_locales_id_seq
  OWNED BY paradigm._pages_v_blocks_pricing_tiers_locales.id;

CREATE INDEX IF NOT EXISTS _pages_v_blocks_pricing_order_idx
  ON paradigm._pages_v_blocks_pricing (_order);
CREATE INDEX IF NOT EXISTS _pages_v_blocks_pricing_parent_id_idx
  ON paradigm._pages_v_blocks_pricing (_parent_id);
CREATE INDEX IF NOT EXISTS _pages_v_blocks_pricing_path_idx
  ON paradigm._pages_v_blocks_pricing (_path);
CREATE INDEX IF NOT EXISTS _pages_v_blocks_pricing_tiers_order_idx
  ON paradigm._pages_v_blocks_pricing_tiers (_order);
CREATE INDEX IF NOT EXISTS _pages_v_blocks_pricing_tiers_parent_id_idx
  ON paradigm._pages_v_blocks_pricing_tiers (_parent_id);

ALTER TABLE paradigm._pages_v_blocks_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE paradigm._pages_v_blocks_pricing_locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE paradigm._pages_v_blocks_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE paradigm._pages_v_blocks_pricing_tiers_locales ENABLE ROW LEVEL SECURITY;

COMMIT;
