BEGIN;

-- The initial Payload import created the posts tables but omitted the unique
-- arbiters required by Drizzle's ON CONFLICT writes. Existing rows were
-- checked before this migration: ids, slugs, and locale/parent pairs are
-- distinct, so these constraints are safe to add idempotently.
CREATE UNIQUE INDEX IF NOT EXISTS payload_posts_id_uidx
  ON paradigm.posts (id);

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_idx
  ON paradigm.posts (slug)
  WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payload_posts_locales_id_uidx
  ON paradigm.posts_locales (id);

CREATE UNIQUE INDEX IF NOT EXISTS posts_locales_locale_parent_uidx
  ON paradigm.posts_locales (_locale, _parent_id);

CREATE UNIQUE INDEX IF NOT EXISTS payload_posts_tags_id_uidx
  ON paradigm.posts_tags (id);

CREATE UNIQUE INDEX IF NOT EXISTS payload_posts_available_locales_id_uidx
  ON paradigm.posts_available_locales (id);

COMMIT;
